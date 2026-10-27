import React, { useEffect, useState } from 'react';
import { Bell, BellOff } from 'lucide-react';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

/**
 * Real browser pop-up notifications: registers the service worker, asks
 * for permission, subscribes via the Push API and saves the subscription
 * server-side. Ported from the real backend's original (now-orphaned)
 * implementation at src/app/_components/PushNotifications.js -- same real
 * API contract (/api/push/subscribe|unsubscribe|test), unchanged, just
 * restyled for nova-ui.
 */
export const PushNotifications: React.FC = () => {
  const [supported, setSupported] = useState(true);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [subscribed, setSubscribed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

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
        setMessage("Permission wasn't granted -- check your browser's site settings.");
        return;
      }

      const keyRes = await fetch('/api/push/public-key', { credentials: 'include' });
      const { publicKey } = await keyRes.json();
      if (!publicKey) {
        setMessage('Push is not configured on the server yet.');
        return;
      }

      const reg = await navigator.serviceWorker.ready;
      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
      });

      const res = await fetch('/api/push/subscribe', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription: subscription.toJSON(), userAgent: navigator.userAgent }),
      });
      if (!res.ok) throw new Error((await res.json()).message ?? 'Could not save the subscription');

      setSubscribed(true);
      setMessage('Notifications are on.');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Unable to enable notifications');
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
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        });
        await subscription.unsubscribe();
      }
      setSubscribed(false);
      setMessage('Notifications are off.');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Unable to disable notifications');
    } finally {
      setBusy(false);
    }
  }

  async function sendTest() {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch('/api/push/test', { method: 'POST', credentials: 'include' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? 'Could not send a test notification');
      setMessage(data.sent > 0 ? 'Test sent -- check for the pop-up.' : 'Sent, but no active device found. Try enabling again.');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Unable to send a test notification');
    } finally {
      setBusy(false);
    }
  }

  if (!supported) {
    return <p className="text-xs text-neutral-500 dark:text-neutral-400">This browser doesn&apos;t support push notifications.</p>;
  }

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-800/60">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          {subscribed ? <Bell className="h-4.5 w-4.5 text-orange-500" /> : <BellOff className="h-4.5 w-4.5 text-neutral-400" />}
          <div>
            <p className="text-sm font-semibold text-neutral-900 dark:text-white">Browser pop-up notifications</p>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              {subscribed ? 'On for this device' : permission === 'denied' ? 'Blocked in browser settings' : 'Off'}
            </p>
          </div>
        </div>
        {subscribed ? (
          <button
            type="button"
            onClick={disable}
            disabled={busy}
            className="rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-1.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-100 disabled:opacity-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700"
          >
            Turn off
          </button>
        ) : (
          <button
            type="button"
            onClick={enable}
            disabled={busy || permission === 'denied'}
            className="rounded-lg bg-orange-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-orange-600 disabled:opacity-50"
          >
            Enable
          </button>
        )}
      </div>
      {subscribed && (
        <button
          type="button"
          onClick={sendTest}
          disabled={busy}
          className="mt-3 rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-1.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-100 disabled:opacity-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700"
        >
          Send a test
        </button>
      )}
      {message && <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">{message}</p>}
    </div>
  );
};
