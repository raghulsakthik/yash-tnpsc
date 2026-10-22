package com.nova.tnpsc.data.network

import android.content.Context
import com.jakewharton.retrofit2.converter.kotlinx.serialization.asConverterFactory
import com.nova.tnpsc.BuildConfig
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.SupervisorJob
import kotlinx.serialization.json.Json
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import java.util.concurrent.TimeUnit

/**
 * One Retrofit instance for the whole app, talking to the Next.js backend
 * at [BuildConfig.API_BASE_URL]. Session auth rides on [PersistentCookieJar]
 * (an httpOnly cookie, same as the web app), not an Authorization header --
 * there is no token to attach per-request.
 */
class ApiClient(context: Context) {

    private val appScope = CoroutineScope(SupervisorJob())

    val cookieJar = PersistentCookieJar(
        store = SessionCookieStore(context.applicationContext),
        scope = appScope,
        host = BuildConfig.API_BASE_URL.toHttpUrlHost(),
    )

    private val json = Json { ignoreUnknownKeys = true }

    private val okHttpClient: OkHttpClient = OkHttpClient.Builder()
        .cookieJar(cookieJar)
        .connectTimeout(15, TimeUnit.SECONDS)
        .readTimeout(15, TimeUnit.SECONDS)
        .addInterceptor(
            HttpLoggingInterceptor().apply {
                level = if (BuildConfig.DEBUG) HttpLoggingInterceptor.Level.BASIC else HttpLoggingInterceptor.Level.NONE
            }
        )
        .build()

    val retrofit: Retrofit = Retrofit.Builder()
        .baseUrl(BuildConfig.API_BASE_URL)
        .client(okHttpClient)
        .addConverterFactory(json.asConverterFactory("application/json".toMediaType()))
        .build()

    fun <T> create(service: Class<T>): T = retrofit.create(service)

    private fun String.toHttpUrlHost(): String =
        removePrefix("https://").removePrefix("http://").substringBefore("/").substringBefore(":")
}
