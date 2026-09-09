package com.companheiro.dana.data

import android.content.Context
import android.content.SharedPreferences
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey

class TokenStore(context: Context) {
    private val prefs: SharedPreferences = run {
        val masterKey = MasterKey.Builder(context)
            .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
            .build()
        EncryptedSharedPreferences.create(
            context,
            "dana_secure_prefs",
            masterKey,
            EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
            EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM,
        )
    }

    var token: String?
        get() = prefs.getString(KEY_TOKEN, null)
        set(value) = prefs.edit().putString(KEY_TOKEN, value).apply()

    var userName: String?
        get() = prefs.getString(KEY_NAME, null)
        set(value) = prefs.edit().putString(KEY_NAME, value).apply()

    var activity: String?
        get() = prefs.getString(KEY_ACTIVITY, null)
        set(value) = prefs.edit().putString(KEY_ACTIVITY, value).apply()

    /** Horário no formato "HH:mm". */
    var trainingTime: String?
        get() = prefs.getString(KEY_TRAINING_TIME, null)
        set(value) = prefs.edit().putString(KEY_TRAINING_TIME, value).apply()

    var scheduledCallEnabled: Boolean
        get() = prefs.getBoolean(KEY_SCHEDULED_CALL, false)
        set(value) = prefs.edit().putBoolean(KEY_SCHEDULED_CALL, value).apply()

    var alwaysOnEnabled: Boolean
        get() = prefs.getBoolean(KEY_ALWAYS_ON, false)
        set(value) = prefs.edit().putBoolean(KEY_ALWAYS_ON, value).apply()

    /** Historico da tela "Falar com a Dana", serializado como JSON. Sem isso a
     * conversa some toda vez que o app e reaberto, mesmo o resto do app lembrando
     * de tudo. */
    var chatHistory: String?
        get() = prefs.getString(KEY_CHAT_HISTORY, null)
        set(value) = prefs.edit().putString(KEY_CHAT_HISTORY, value).apply()

    fun clear() = prefs.edit().clear().apply()

    companion object {
        private const val KEY_TOKEN = "auth_token"
        private const val KEY_NAME = "user_name"
        private const val KEY_ACTIVITY = "user_activity"
        private const val KEY_TRAINING_TIME = "training_time"
        private const val KEY_SCHEDULED_CALL = "scheduled_call_enabled"
        private const val KEY_ALWAYS_ON = "always_on_enabled"
        private const val KEY_CHAT_HISTORY = "chat_history"
    }
}
