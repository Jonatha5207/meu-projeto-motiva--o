package com.companheiro.dana.voice

import android.content.Context
import android.media.MediaPlayer
import kotlinx.coroutines.suspendCancellableCoroutine
import java.io.File
import kotlin.coroutines.resume

class AudioPlayer(private val context: Context) {

    suspend fun play(mp3Bytes: ByteArray) = suspendCancellableCoroutine<Unit> { continuation ->
        val file = File(context.cacheDir, "dana_reply_${System.currentTimeMillis()}.mp3")
        file.writeBytes(mp3Bytes)
        val player = MediaPlayer()
        try {
            player.setDataSource(file.absolutePath)
            player.setOnCompletionListener {
                it.release()
                file.delete()
                if (continuation.isActive) continuation.resume(Unit)
            }
            player.setOnErrorListener { mp, _, _ ->
                mp.release()
                file.delete()
                if (continuation.isActive) continuation.resume(Unit)
                true
            }
            player.prepare()
            player.start()
        } catch (e: Exception) {
            player.release()
            file.delete()
            if (continuation.isActive) continuation.resume(Unit)
        }
        continuation.invokeOnCancellation {
            player.release()
            file.delete()
        }
    }
}
