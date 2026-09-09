package com.companheiro.dana.voice

import android.content.Context
import android.content.Intent
import android.os.Bundle
import android.speech.RecognitionListener
import android.speech.RecognizerIntent
import android.speech.SpeechRecognizer
import kotlinx.coroutines.TimeoutCancellationException
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlinx.coroutines.withTimeout
import java.util.Locale
import kotlin.coroutines.resume
import kotlin.coroutines.resumeWithException

class SpeechToTextException(message: String) : Exception(message)

class SpeechToText(private val context: Context) {

    /** Nunca fica esperando pra sempre -- se o reconhecedor nao responder em
     * 12s (trava, sem rede, servico preso), desiste e deixa o chamador tentar
     * de novo, em vez de travar o loop de escuta contínua pra sempre. */
    suspend fun listenOnce(): String = try {
        withTimeout(12_000) { listenOnceInternal() }
    } catch (e: TimeoutCancellationException) {
        throw SpeechToTextException("timeout")
    }

    private suspend fun listenOnceInternal(): String = suspendCancellableCoroutine { continuation ->
        if (!SpeechRecognizer.isRecognitionAvailable(context)) {
            continuation.resumeWithException(SpeechToTextException("recognition_unavailable"))
            return@suspendCancellableCoroutine
        }
        val recognizer = SpeechRecognizer.createSpeechRecognizer(context)
        val portuguese = Locale("pt", "BR").toLanguageTag()
        val intent = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
            putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
            putExtra(RecognizerIntent.EXTRA_LANGUAGE, portuguese)
            putExtra("android.speech.extra.EXTRA_ADDITIONAL_LANGUAGES", arrayOf(portuguese))
            putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 1)
        }
        recognizer.setRecognitionListener(object : RecognitionListener {
            override fun onResults(results: Bundle) {
                val matches = results.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
                val best = matches?.firstOrNull()
                if (continuation.isActive) {
                    if (best.isNullOrBlank()) continuation.resumeWithException(SpeechToTextException("empty_result"))
                    else continuation.resume(best)
                }
                recognizer.destroy()
            }

            override fun onError(error: Int) {
                if (continuation.isActive) continuation.resumeWithException(SpeechToTextException("recognizer_error_$error"))
                recognizer.destroy()
            }

            override fun onReadyForSpeech(params: Bundle?) {}
            override fun onBeginningOfSpeech() {}
            override fun onRmsChanged(rmsdB: Float) {}
            override fun onBufferReceived(buffer: ByteArray?) {}
            override fun onEndOfSpeech() {}
            override fun onPartialResults(partialResults: Bundle?) {}
            override fun onEvent(eventType: Int, params: Bundle?) {}
        })
        continuation.invokeOnCancellation { recognizer.destroy() }
        recognizer.startListening(intent)
    }
}
