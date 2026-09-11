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
        // "Visitante" (modo convidado, sem login) nunca tem token -- antes isso
        // descartava TODO diagnostico nativo em silencio (nada chegava no
        // servidor pra investigar bugs relatados nesse modo). O servidor agora
        // aceita /api/events sem sessao (grava com user_id nulo), entao aqui so
        // manda sem o cabecalho de autorizacao quando nao ha token, em vez de
        // desistir antes de tentar.
        val payload = JSONObject().apply {
            put("event_name", eventName)
            put("metadata", JSONObject(metadata.mapValues { it.value?.toString() ?: "" }))
        }
        @Suppress("OPT_IN_USAGE")
        GlobalScope.launch(Dispatchers.IO) {
            try {
                val builder = Request.Builder()
                    .url("$BASE_URL/api/events")
                    .post(payload.toString().toRequestBody(jsonMedia))
                if (token != null) builder.header("Authorization", "Bearer $token")
                client.newCall(builder.build()).execute().close()
            } catch (e: Exception) {
                // Sem conexao agora -- perde esse evento, sem tentar de novo pra nao acumular.
            }
        }
    }

    /** Igual a [report], mas bloqueante -- usado so pelo capturador de crash global
     * (ver MainActivity), que roda no exato momento em que o app esta prestes a
     * morrer: uma chamada assíncrona via GlobalScope.launch corre risco real de
     * nunca terminar de executar antes do processo ser encerrado pelo Android. */
    fun reportBlocking(token: String?, eventName: String, metadata: Map<String, Any?> = emptyMap()) {
        val payload = JSONObject().apply {
            put("event_name", eventName)
            put("metadata", JSONObject(metadata.mapValues { it.value?.toString() ?: "" }))
        }
        try {
            val builder = Request.Builder()
                .url("$BASE_URL/api/events")
                .post(payload.toString().toRequestBody(jsonMedia))
            if (token != null) builder.header("Authorization", "Bearer $token")
            client.newCall(builder.build()).execute().close()
        } catch (e: Exception) {
            // Sem conexao no momento do crash -- nao ha mais nada a fazer.
        }
    }
}
