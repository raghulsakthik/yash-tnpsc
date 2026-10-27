package com.nova.tnpsc.data.features

import android.content.ContentValues
import android.content.Context
import android.os.Build
import android.os.Environment
import android.provider.MediaStore
import java.io.File
import java.io.FileOutputStream
import okhttp3.ResponseBody

/**
 * Saves a real downloaded resource file (src/app/api/resources/:id/download)
 * to the device's Downloads folder. MediaStore on API 29+ (scoped storage,
 * no permission needed); a direct file write to the legacy Downloads
 * directory on API 26-28 (minSdk), which does need WRITE_EXTERNAL_STORAGE --
 * the caller is responsible for having that granted first on those versions.
 */
object ResourceDownloader {
    fun save(context: Context, body: ResponseBody, fileName: String, mimeType: String): Boolean {
        return try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                val resolver = context.contentResolver
                val values = ContentValues().apply {
                    put(MediaStore.Downloads.DISPLAY_NAME, fileName)
                    put(MediaStore.Downloads.MIME_TYPE, mimeType)
                    put(MediaStore.Downloads.IS_PENDING, 1)
                }
                val uri = resolver.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values) ?: return false
                resolver.openOutputStream(uri)?.use { out -> body.byteStream().use { it.copyTo(out) } }
                values.clear()
                values.put(MediaStore.Downloads.IS_PENDING, 0)
                resolver.update(uri, values, null, null)
                true
            } else {
                @Suppress("DEPRECATION")
                val downloadsDir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS)
                if (!downloadsDir.exists()) downloadsDir.mkdirs()
                val target = File(downloadsDir, fileName)
                FileOutputStream(target).use { out -> body.byteStream().use { it.copyTo(out) } }
                true
            }
        } catch (_: Exception) {
            false
        }
    }
}
