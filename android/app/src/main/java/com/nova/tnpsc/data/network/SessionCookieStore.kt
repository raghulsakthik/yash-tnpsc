package com.nova.tnpsc.data.network

import android.content.Context
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.runBlocking

private val Context.sessionDataStore by preferencesDataStore(name = "session")
private val SESSION_COOKIE_KEY = stringPreferencesKey("session_token_cookie")

/**
 * Persists the raw `session_token=...` cookie string across process death,
 * so she isn't asked to log in again every time the app is killed and
 * reopened. The backend's session is this one httpOnly cookie (see
 * src/lib/auth.mjs's createSession) -- there's no separate bearer token to
 * store, this cookie IS the credential.
 */
class SessionCookieStore(private val context: Context) {

    /** Blocking on purpose: OkHttp's CookieJar interface is synchronous, called from the network thread. */
    fun loadBlocking(): String? = runBlocking {
        context.sessionDataStore.data.first()[SESSION_COOKIE_KEY]
    }

    suspend fun save(cookie: String) {
        context.sessionDataStore.edit { it[SESSION_COOKIE_KEY] = cookie }
    }

    suspend fun clear() {
        context.sessionDataStore.edit { it.remove(SESSION_COOKIE_KEY) }
    }
}
