package com.companheiro.dana.network

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONArray
import org.json.JSONObject
import java.util.concurrent.TimeUnit

data class AuthResult(val token: String, val userName: String, val activity: String?)
data class ChatReply(val text: String, val source: String)

class ApiException(message: String) : Exception(message)

class ApiClient(private val baseUrl: String = "https://companheiro-app.onrender.com") {

    private val client = OkHttpClient.Builder()
        .connectTimeout(20, TimeUnit.SECONDS)
        .readTimeout(30, TimeUnit.SECONDS)
        .writeTimeout(30, TimeUnit.SECONDS)
        .build()

    private val jsonMedia = "application/json; charset=utf-8".toMediaType()

    suspend fun register(name: String, email: String, password: String): AuthResult =
        authRequest("/api/auth/register", JSONObject().put("name", name).put("email", email).put("password", password), fallbackName = name)

    suspend fun login(email: String, password: String): AuthResult =
        authRequest("/api/auth/login", JSONObject().put("email", email).put("password", password), fallbackName = email.substringBefore("@"))

    private suspend fun authRequest(path: String, body: JSONObject, fallbackName: String): AuthResult = withContext(Dispatchers.IO) {
        val request = Request.Builder()
            .url(baseUrl + path)
            .post(body.toString().toRequestBody(jsonMedia))
            .build()
        client.newCall(request).execute().use { response ->
            val text = response.body?.string().orEmpty()
            if (!response.isSuccessful) throw ApiException(extractError(text))
            val json = JSONObject(text)
            val user = json.optJSONObject("user")
            AuthResult(
                token = json.getString("token"),
                userName = user?.optString("name")?.takeIf { it.isNotBlank() } ?: fallbackName,
                activity = null,
            )
        }
    }

    suspend fun companionChat(token: String, activity: String, userName: String, message: String): ChatReply =
        withContext(Dispatchers.IO) {
            val payload = JSONObject().apply {
                put("profile", JSONObject().put("activity", activity).put("name", userName))
                put("messages", JSONArray().put(JSONObject().put("from", "user").put("text", message)))
                put("message", message)
            }
            val request = Request.Builder()
                .url(baseUrl + "/api/companion-chat")
                .header("Authorization", "Bearer $token")
                .post(payload.toString().toRequestBody(jsonMedia))
                .build()
            client.newCall(request).execute().use { response ->
                val text = response.body?.string().orEmpty()
                if (!response.isSuccessful) throw ApiException(extractError(text))
                val json = JSONObject(text)
                ChatReply(text = json.optString("response_text", ""), source = json.optString("source", "fallback"))
            }
        }

    suspend fun motivationAudio(token: String, text: String, voice: String = "coral"): ByteArray =
        withContext(Dispatchers.IO) {
            val payload = JSONObject().put("text", text).put("language", "pt-BR").put("voice", voice)
            val request = Request.Builder()
                .url(baseUrl + "/api/motivation-audio")
                .header("Authorization", "Bearer $token")
                .post(payload.toString().toRequestBody(jsonMedia))
                .build()
            client.newCall(request).execute().use { response ->
                if (!response.isSuccessful) throw ApiException("audio_${response.code}")
                response.body?.bytes() ?: throw ApiException("empty_audio")
            }
        }

    private fun extractError(body: String): String = try {
        JSONObject(body).optString("error", "erro_desconhecido")
    } catch (e: Exception) {
        "erro_desconhecido"
    }
}
