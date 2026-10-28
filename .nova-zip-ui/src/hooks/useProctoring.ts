import { useCallback, useEffect, useRef, useState } from 'react';
import { apiUrl } from '../api/novaApi';

const CHUNK_MS = 5000; // upload roughly every 5s, so a crash loses seconds, not the whole session

function pickMimeType(): string | undefined {
  const candidates = ['video/webm;codecs=vp8', 'video/webm;codecs=vp9', 'video/webm'];
  for (const type of candidates) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported?.(type)) return type;
  }
  return undefined; // let the browser choose
}

/**
 * Camera + screen recording for a proctored test, plus lightweight
 * monitoring events (tab switches, fullscreen exits, a screen-share the
 * learner stopped mid-test). Recording never starts silently -- the
 * browser's own getUserMedia/getDisplayMedia prompts are the real consent
 * gate, and requestConsent() is only ever called from an explicit button
 * click in the UI, never automatically. Ported from the real backend's
 * original (now-orphaned) implementation at
 * src/app/_components/useProctoring.js -- same real API contract
 * (/api/proctoring/start|stop|event|chunk), unchanged.
 */
export function useProctoring() {
  const [consent, setConsent] = useState<'pending' | 'granted' | 'denied'>('pending');
  const camStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const camRecorderRef = useRef<MediaRecorder | null>(null);
  const screenRecorderRef = useRef<MediaRecorder | null>(null);
  const testIdRef = useRef<string | null>(null);

  const logEvent = useCallback((eventType: string, metadata?: Record<string, unknown>) => {
    if (!testIdRef.current) return;
    fetch(apiUrl('/api/proctoring/event'), {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ testId: testIdRef.current, eventType, metadata }),
    }).catch(() => {});
  }, []);

  const uploadChunk = useCallback((stream: 'camera' | 'screen', blob: Blob) => {
    if (!testIdRef.current || blob.size === 0) return;
    blob
      .arrayBuffer()
      .then((buf) =>
        fetch(apiUrl(`/api/proctoring/chunk?testId=${testIdRef.current}&stream=${stream}`), {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/octet-stream' },
          body: buf,
        })
      )
      .catch(() => {});
  }, []);

  /**
   * Asks for camera + (where available) screen access. Must be called from
   * a user gesture. getDisplayMedia has no mobile WebView equivalent -- on
   * Android this just isn't offered by the platform, not declined by the
   * learner, so its absence doesn't block camera-only proctoring the way
   * an explicit decline (desktop) does.
   */
  const requestConsent = useCallback(async () => {
    try {
      const cam = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      camStreamRef.current = cam;

      if (navigator.mediaDevices.getDisplayMedia) {
        try {
          screenStreamRef.current = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
        } catch {
          // Declined on a platform where it was actually offered -- camera-only proctoring still proceeds.
        }
      }

      setConsent('granted');
      return true;
    } catch {
      setConsent('denied');
      return false;
    }
  }, []);

  /** Starts actually recording once a real testId exists to attach the session to. */
  const startRecording = useCallback(
    (testId: string) => {
      testIdRef.current = testId;
      fetch(apiUrl('/api/proctoring/start'), {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ testId }),
      }).catch(() => {});

      const mimeType = pickMimeType();

      if (camStreamRef.current) {
        const rec = new MediaRecorder(camStreamRef.current, mimeType ? { mimeType } : undefined);
        rec.ondataavailable = (e) => uploadChunk('camera', e.data);
        rec.start(CHUNK_MS);
        camRecorderRef.current = rec;
        camStreamRef.current.getVideoTracks()[0]?.addEventListener('ended', () => logEvent('CAMERA_LOST'));
      }

      if (screenStreamRef.current) {
        const rec = new MediaRecorder(screenStreamRef.current, mimeType ? { mimeType } : undefined);
        rec.ondataavailable = (e) => uploadChunk('screen', e.data);
        rec.start(CHUNK_MS);
        screenRecorderRef.current = rec;
        screenStreamRef.current.getVideoTracks()[0]?.addEventListener('ended', () => logEvent('SCREEN_SHARE_LOST'));
      }
    },
    [uploadChunk, logEvent]
  );

  const stopRecording = useCallback(() => {
    try {
      camRecorderRef.current?.stop();
    } catch {
      /* already stopped */
    }
    try {
      screenRecorderRef.current?.stop();
    } catch {
      /* already stopped */
    }
    camStreamRef.current?.getTracks().forEach((t) => t.stop());
    screenStreamRef.current?.getTracks().forEach((t) => t.stop());

    if (testIdRef.current) {
      fetch(apiUrl('/api/proctoring/stop'), {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ testId: testIdRef.current }),
        keepalive: true, // survives the page unloading right after submit
      }).catch(() => {});
    }
    testIdRef.current = null;
  }, []);

  useEffect(() => {
    function onVisibility() {
      logEvent(document.hidden ? 'TAB_HIDDEN' : 'TAB_VISIBLE');
    }
    function onFullscreenChange() {
      logEvent(document.fullscreenElement ? 'FULLSCREEN_ENTER' : 'FULLSCREEN_EXIT');
    }
    document.addEventListener('visibilitychange', onVisibility);
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      document.removeEventListener('fullscreenchange', onFullscreenChange);
    };
  }, [logEvent]);

  // Best-effort cleanup if the component unmounts without an explicit submit.
  useEffect(() => () => stopRecording(), [stopRecording]);

  return { consent, requestConsent, startRecording, stopRecording };
}
