'use client';

import { useEffect, useState } from 'react';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

/**
 * Real browser pop-up notifications: registers the service worker, asks
 * for permission, subscribes via the Push API and saves the subscription
 * server-side. "Send a test" proves it actually works right away instead
 * of asking her to trust it until something is due days from now.
 */
export default function PushNotifications() {
  const [supported, setSupported] = useState(true);
  const [permission, setPermission] = useState('default');
  const [subscribed, setSubscribed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
      setSupported(false);
      return;
    }
    setPermission(Notification.permission);
    navigator.serviceWorker.register('/sw.js').then(async (reg) => {
      const existing = await reg.pushManager.getSubscription();
      setSubscribed(Boolean(existing));
    });
  }, []);

  async function enable() {
    setBusy(true);
    setMessage(null);
    try {
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== 'granted') {
        setMessage("Permission wasn't granted — check your browser's site settings.");
        return;
      }

      const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!publicKey) {
        setMessage('Push is not configured on the server yet.');
        return;
      }

      const reg = await navigator.serviceWorker.ready;
      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });

      const res = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription: subscription.toJSON(), userAgent: navigator.userAgent }),
      });
      if (!res.ok) throw new Error((await res.json()).message ?? 'Could not save the subscription');

      setSubscribed(true);
      setMessage('Notifications are on.');
    } catch (err) {
      setMessage(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    setMessage(null);
    try {
      const reg = await navigator.serviceWorker.ready;
      const subscription = await reg.pushManager.getSubscription();
      if (subscription) {
        await fetch('/api/push/unsubscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        });
        await subscription.unsubscribe();
      }
      setSubscribed(false);
      setMessage('Notifications are off.');
    } catch (err) {
      setMessage(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function sendTest() {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch('/api/push/test', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? 'Could not send a test notification');
      setMessage(data.sent > 0 ? 'Test sent — check for the pop-up.' : "Sent, but no active device found. Try enabling again.");
    } catch (err) {
      setMessage(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (!supported) {
    return <p className="muted" style={{ fontSize: '0.85rem' }}>This browser doesn&apos;t support push notifications.</p>;
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <strong style={{ display: 'block' }}>Browser pop-up notifications</strong>
          <span className="muted" style={{ fontSize: '0.8rem' }}>
            {subscribed ? 'On for this device' : permission === 'denied' ? 'Blocked in browser settings' : 'Off'}
          </span>
        </div>
        {subscribed ? (
          <button type="button" className="btn btn-secondary btn-sm" onClick={disable} disabled={busy}>Turn off</button>
        ) : (
          <button type="button" className="btn btn-primary btn-sm" onClick={enable} disabled={busy || permission === 'denied'}>
            Enable
          </button>
        )}
      </div>
      {subscribed && (
        <button type="button" className="btn btn-secondary btn-sm" style={{ marginTop: 12 }} onClick={sendTest} disabled={busy}>
          Send a test
        </button>
      )}
      {message && <p className="muted" style={{ marginTop: 10, fontSize: '0.82rem' }}>{message}</p>}
    </div>
  );
}
