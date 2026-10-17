package com.nova.tnpsc.push

import android.Manifest
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import androidx.core.app.ActivityCompat
import androidx.core.app.NotificationCompat
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage
import com.nova.tnpsc.MainActivity
import com.nova.tnpsc.R
import com.nova.tnpsc.TnpscApplication
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

private const val CHANNEL_ID = "reminders"
private var nextNotificationId = 1000

/**
 * Receives push sent by src/lib/fcm.mjs (achievements, streak-at-risk,
 * inactivity, test reminders, the 6am-11pm motivational schedule -- the
 * same triggers already live on web push/WhatsApp/email). This service is
 * declared in AndroidManifest.xml and only ever invoked by the OS once
 * Firebase is actually initialized (see FcmTokenRegistrar's doc comment
 * for why that isn't the case yet).
 */
class TnpscFirebaseMessagingService : FirebaseMessagingService() {

    override fun onNewToken(token: String) {
        super.onNewToken(token)
        // A fresh/rotated token must be re-registered immediately, not just
        // on next app launch, or push silently stops working on this device.
        val app = application as? TnpscApplication ?: return
        CoroutineScope(Dispatchers.IO).launch {
            app.fcmTokenRegistrar.registerToken(token)
        }
    }

    override fun onMessageReceived(message: RemoteMessage) {
        super.onMessageReceived(message)
        val title = message.notification?.title ?: message.data["title"] ?: "Yash"
        val body = message.notification?.body ?: message.data["body"] ?: return
        showNotification(this, title, body)
    }
}

fun ensureNotificationChannel(context: Context) {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
    val manager = context.getSystemService(NotificationManager::class.java)
    val existing = manager.getNotificationChannel(CHANNEL_ID)
    if (existing != null) return
    val channel = NotificationChannel(
        CHANNEL_ID,
        "Reminders",
        NotificationManager.IMPORTANCE_DEFAULT,
    ).apply {
        description = "Streak, test and study reminders from Yash"
    }
    manager.createNotificationChannel(channel)
}

private fun showNotification(context: Context, title: String, body: String) {
    ensureNotificationChannel(context)

    val intent = Intent(context, MainActivity::class.java).apply {
        flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
    }
    val pendingIntent = PendingIntent.getActivity(
        context,
        0,
        intent,
        PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
    )

    val notification = NotificationCompat.Builder(context, CHANNEL_ID)
        .setSmallIcon(R.drawable.ic_notification)
        .setContentTitle(title)
        .setContentText(body)
        .setStyle(NotificationCompat.BigTextStyle().bigText(body))
        .setAutoCancel(true)
        .setContentIntent(pendingIntent)
        .build()

    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU &&
        ActivityCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED
    ) {
        return // She hasn't granted POST_NOTIFICATIONS yet -- MainActivity requests it on launch.
    }

    androidx.core.app.NotificationManagerCompat.from(context).notify(nextNotificationId++, notification)
}
