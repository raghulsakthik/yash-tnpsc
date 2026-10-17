package com.nova.tnpsc.push

import android.os.Build
import android.util.Log
import com.google.firebase.FirebaseApp
import com.google.firebase.messaging.FirebaseMessaging
import com.nova.tnpsc.data.network.ApiClient
import kotlinx.coroutines.tasks.await

private const val TAG = "FcmTokenRegistrar"

/**
 * Fetches the device's current FCM token and registers it with the
 * backend (POST /api/push/fcm/register) so achievement/streak/motivation
 * notifications (src/lib/fcm.mjs) can reach this device.
 *
 * Silently does nothing if Firebase was never initialized -- that only
 * happens once a real google-services.json from an actual Firebase
 * project is added to app/ and the com.google.gms.google-services plugin
 * is applied in build.gradle.kts (both deliberately NOT done yet, since
 * no Firebase project exists). This mirrors every server-side
 * "unconfigured = safe no-op" pattern (push.mjs, email.mjs, fcm.mjs) --
 * the rest of the app works fully without it.
 */
class FcmTokenRegistrar(private val apiClient: ApiClient) {

    private val api = apiClient.create(FcmApi::class.java)

    /** Call once at app start (after login) and again from onNewToken. No-op until Firebase is actually configured -- see the class doc. */
    suspend fun registerCurrentToken(context: android.content.Context) {
        if (FirebaseApp.getApps(context).isEmpty()) {
            Log.d(TAG, "Firebase is not configured (no google-services.json) -- skipping FCM registration.")
            return
        }
        try {
            val token = FirebaseMessaging.getInstance().token.await()
            registerToken(token)
        } catch (e: Exception) {
            Log.w(TAG, "Could not fetch/register FCM token: ${e.message}")
        }
    }

    suspend fun registerToken(token: String) {
        try {
            api.register(FcmRegisterRequest(token = token, deviceInfo = "${Build.MANUFACTURER} ${Build.MODEL}, Android ${Build.VERSION.RELEASE}"))
        } catch (e: Exception) {
            Log.w(TAG, "Could not register FCM token with backend: ${e.message}")
        }
    }
}
