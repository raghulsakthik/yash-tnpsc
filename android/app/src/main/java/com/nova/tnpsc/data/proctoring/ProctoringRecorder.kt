package com.nova.tnpsc.data.proctoring

import android.content.Context
import androidx.camera.core.CameraSelector
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.video.FileOutputOptions
import androidx.camera.video.Recorder
import androidx.camera.video.Recording
import androidx.camera.video.VideoCapture
import androidx.core.content.ContextCompat
import androidx.lifecycle.LifecycleOwner
import com.nova.tnpsc.TnpscApplication
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.RequestBody.Companion.asRequestBody
import java.io.File

private const val SEGMENT_MS = 5000L

/**
 * Camera-only proctoring for a test attempt -- records ~5s segment files
 * via CameraX and uploads each to the same /api/proctoring/chunk endpoint
 * the web client posts MediaRecorder blobs to (stream=camera). There is no
 * screen-share stream here: that needs MediaProjection plus a persistent
 * foreground service and notification, a materially bigger piece than
 * camera recording -- deferred as a follow-up, disclosed to the user.
 * Recording never starts silently: start() is only called after the
 * CAMERA permission prompt was granted from an explicit user action.
 */
class ProctoringRecorder(private val context: Context, private val lifecycleOwner: LifecycleOwner) {
    private val app = context.applicationContext as TnpscApplication
    private var cameraProvider: ProcessCameraProvider? = null
    private var videoCapture: VideoCapture<Recorder>? = null
    private var activeRecording: Recording? = null
    private var loopJob: Job? = null
    private var testId: String? = null

    fun start(testId: String, scope: CoroutineScope) {
        this.testId = testId
        scope.launch {
            runCatching { app.proctoringApi.start(ProctoringTestIdRequest(testId)) }
        }

        val providerFuture = ProcessCameraProvider.getInstance(context)
        providerFuture.addListener({
            val provider = runCatching { providerFuture.get() }.getOrNull() ?: return@addListener
            cameraProvider = provider
            val recorder = Recorder.Builder().build()
            val capture = VideoCapture.withOutput(recorder)
            videoCapture = capture
            val bound = runCatching {
                provider.unbindAll()
                provider.bindToLifecycle(lifecycleOwner, CameraSelector.DEFAULT_FRONT_CAMERA, capture)
            }.isSuccess
            if (bound) {
                loopJob = scope.launch { recordLoop(scope) }
            } else {
                logEvent("CAMERA_LOST", scope)
            }
        }, ContextCompat.getMainExecutor(context))
    }

    private suspend fun recordLoop(scope: CoroutineScope) {
        while (true) {
            val capture = videoCapture ?: return
            val file = File.createTempFile("proctor_cam_", ".mp4", context.cacheDir)
            val output = FileOutputOptions.Builder(file).build()
            activeRecording = capture.output.prepareRecording(context, output)
                .start(ContextCompat.getMainExecutor(context)) { }
            delay(SEGMENT_MS)
            runCatching { activeRecording?.stop() }
            activeRecording = null
            delay(200) // let the recorder finalize the file before reading it back
            uploadSegment(file, scope)
        }
    }

    private fun uploadSegment(file: File, scope: CoroutineScope) {
        val id = testId ?: return
        scope.launch {
            runCatching {
                if (file.length() > 0) {
                    val body = file.asRequestBody("video/mp4".toMediaType())
                    app.proctoringApi.chunk(id, "camera", body)
                }
            }
            file.delete()
        }
    }

    fun logEvent(eventType: String, scope: CoroutineScope) {
        val id = testId ?: return
        scope.launch { runCatching { app.proctoringApi.event(ProctoringEventRequest(id, eventType)) } }
    }

    /** Stops local recording/camera synchronously; the stop-session network call is best-effort. */
    fun stop(scope: CoroutineScope) {
        loopJob?.cancel()
        loopJob = null
        runCatching { activeRecording?.stop() }
        activeRecording = null
        runCatching { cameraProvider?.unbindAll() }
        cameraProvider = null
        val id = testId
        testId = null
        if (id != null) {
            scope.launch { runCatching { app.proctoringApi.stop(ProctoringTestIdRequest(id)) } }
        }
    }
}
