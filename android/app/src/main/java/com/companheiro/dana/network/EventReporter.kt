package com.companheiro.dana.network

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.GlobalScope
import kotlinx.coroutines.launch
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject

/** Manda eventos de diagnostico pro mesmo /api/events que o site ja usa --
 * assim a gente ve o que esta acontecendo de verdade no celular da pessoa
 * em vez de tentar adivinhar pelo que ela descreve. Nunca deixa o app mais
 * lento nem quebra nada -- dispara e esquece, silencioso em qualquer erro. */
object EventReporter {
    private const val BASE_URL = "https://companheiro-app.onrender.com"
    private val client = OkHttpClient()
    private val jsonMedia = "application/json; charset=utf-8".toMediaType()

    fun report(token: String?, eventName: String, metadata: Map<String, Any?> = emptyMap()) {
        if (token == null) return
        val payload = JSONObject().apply {
            put("event_name", eventName)
            put("metadata", JSONObject(metadata.mapValues { it.value?.toString() ?: "" }))
        }
        @Suppress("OPT_IN_USAGE")
        GlobalScope.launch(Dispatchers.IO) {
            try {
                val request = Request.Builder()
                    .url("$BASE_URL/api/events")
                    .header("Authorization", "Bearer $token")
                    .post(payload.toString().toRequestBody(jsonMedia))
                    .build()
                client.newCall(request).execute().close()
            } catch (e: Exception) {
                // Sem conexao agora -- perde esse evento, sem tentar de novo pra nao acumular.
            }
        }
    }
}
