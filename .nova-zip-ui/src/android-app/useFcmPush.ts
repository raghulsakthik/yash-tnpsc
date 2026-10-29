import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { novaApi } from '../api/novaApi';

/**
 * Real FCM push registration for the Capacitor app -- the mobile
 * equivalent of the web app's browser push subscription (PushNotifications.tsx),
 * since a WebView has no service-worker push of its own. Requests the
 * notification permission, gets a real FCM token from Google Play
 * services, and registers it against the same /api/push/fcm/register
 * endpoint and fcm_token table the native Kotlin app's (never-deployed)
 * FcmTokenRegistrar already targeted.
 *
 * This wiring is real end-to-end on the client and in the database, but
 * actual delivery needs two things only the project owner can supply:
 *   1. A real Firebase project's google-services.json dropped into
 *      android/app/ (this Capacitor project) -- without it, Firebase
 *      never initializes and getToken() simply never resolves, no crash.
 *   2. FIREBASE_SERVICE_ACCOUNT_JSON set in the server's environment
 *      (see src/lib/fcm.mjs) -- without it, sendFcmToLearner() is a
 *      silent no-op, same as it already was for the Kotlin app.
 * Neither can be fabricated here; both are genuine external setup steps.
 */
export function useFcmPush(isLoggedIn: boolean, onNotificationTapped?: () => void) {
  useEffect(() => {
    if (!isLoggedIn) return;
    if (!Capacitor.isNativePlatform()) return; // no-op in a plain browser tab

    let cancelled = false;

    async function register() {
      const permission = await PushNotifications.checkPermissions();
      let granted = permission.receive === 'granted';
      if (!granted) {
        const requested = await PushNotifications.requestPermissions();
        granted = requested.receive === 'granted';
      }
      if (!granted || cancelled) return;

      await PushNotifications.register();
    }

    const registrationListener = PushNotifications.addListener('registration', (token) => {
      novaApi.registerFcmToken(token.value, Capacitor.getPlatform()).catch(() => {
        // Best-effort -- a failed registration just means this device
        // doesn't get pushes until the next successful one (app reopen,
        // token refresh); it shouldn't block anything else in the app.
      });
    });

    const errorListener = PushNotifications.addListener('registrationError', () => {
      // Expected until a real google-services.json is in place -- not
      // surfaced to the learner, same as the rest of this app's
      // best-effort push paths.
    });

    const tapListener = PushNotifications.addListener('pushNotificationActionPerformed', () => {
      onNotificationTapped?.();
    });

    void register();

    return () => {
      cancelled = true;
      registrationListener.then((h) => h.remove());
      errorListener.then((h) => h.remove());
      tapListener.then((h) => h.remove());
    };
  }, [isLoggedIn, onNotificationTapped]);
}
