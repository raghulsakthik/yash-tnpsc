package com.nova.tnpsc.data.network

import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import okhttp3.Cookie
import okhttp3.CookieJar
import okhttp3.HttpUrl

/**
 * The only cookie this app ever needs to carry is the backend's
 * `session_token`. Rather than pull in a general-purpose cookie jar
 * library for that one cookie, this keeps it in memory for the life of
 * the process and persists it to [SessionCookieStore] on change, loading
 * it back on construction so a restarted process picks up where it left off.
 *
 * @param host the API host (e.g. "10.0.2.2"), used to rebuild the cached
 *   cookie on cold start -- this app only ever talks to one backend, so
 *   there's no multi-domain cookie logic to get right here.
 */
class PersistentCookieJar(
    private val store: SessionCookieStore,
    private val scope: CoroutineScope,
    private val host: String,
) : CookieJar {

    @Volatile
    private var cached: Cookie? = store.loadBlocking()?.let { parseCookie(it) }

    override fun saveFromResponse(url: HttpUrl, cookies: List<Cookie>) {
        val sessionCookie = cookies.firstOrNull { it.name == "session_token" } ?: return
        cached = sessionCookie
        scope.launch(Dispatchers.IO) { store.save(sessionCookie.toCookieHeader()) }
    }

    override fun loadForRequest(url: HttpUrl): List<Cookie> {
        return cached?.let { listOf(it) } ?: emptyList()
    }

    fun clear() {
        cached = null
        scope.launch(Dispatchers.IO) { store.clear() }
    }

    private fun Cookie.toCookieHeader(): String = "$name=$value"

    private fun parseCookie(raw: String): Cookie? {
        val parts = raw.split("=", limit = 2)
        if (parts.size != 2) return null
        return Cookie.Builder()
            .name(parts[0])
            .value(parts[1])
            .domain(host)
            .path("/")
            .build()
    }
}
