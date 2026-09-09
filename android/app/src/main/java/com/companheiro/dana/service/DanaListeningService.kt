package com.companheiro.dana.service

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.media.AudioManager
import android.media.ToneGenerator
import android.os.IBinder
import androidx.core.app.NotificationCompat
import com.companheiro.dana.MainActivity
import com.companheiro.dana.data.TokenStore
import com.companheiro.dana.network.ApiClient
import com.companheiro.dana.network.EventReporter
import com.companheiro.dana.voice.AudioPlayer
import com.companheiro.dana.voice.SpeechToText
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

private const val CHANNEL_ID = "dana_listening"
private const val NOTIFICATION_ID = 1

// "dana" sozinho ja cobre "ok dana", "oi dana" etc (contains) -- o reconhecimento
// de voz erra facil o "ok"/"oi" antes do nome, entao exigir o prefixo perdia ativacoes reais.
private val WAKE_PHRASES = listOf("dana")
private val END_PHRASES = listOf("ok dana", "tudo bem", "ja chega", "pode parar", "obrigado dana", "obrigada dana", "ate mais dana")

class DanaListeningService : Service() {

    companion object {
        const val ACTION_SPEAK_FIRST = "com.companheiro.dana.action.SPEAK_FIRST"
    }

    private val scope = CoroutineScope(Dispatchers.Main)
    private var loopJob: Job? = null

    private lateinit var tokenStore: TokenStore
    private lateinit var speechToText: SpeechToText
    private lateinit var audioPlayer: AudioPlayer
    private val apiClient = ApiClient()

    private var consecutiveSilence = 0

    override fun onCreate() {
        super.onCreate()
        tokenStore = TokenStore(applicationContext)
        speechToText = SpeechToText(applicationContext)
        audioPlayer = AudioPlayer(applicationContext)
        createNotificationChannel()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        startForeground(NOTIFICATION_ID, buildNotification("Dana está ouvindo por \"Ok Dana\"..."))
        val speakFirst = intent?.action == ACTION_SPEAK_FIRST
        val ignoringBatteryOptimizations = getSystemService(android.os.PowerManager::class.java).isIgnoringBatteryOptimizations(packageName)
        EventReporter.report(tokenStore.token, "DANA_SERVICE_STARTED", mapOf("speakFirst" to speakFirst, "ignoringBatteryOptimizations" to ignoringBatteryOptimizations))
        if (loopJob == null || loopJob?.isActive != true) {
            loopJob = scope.launch { listenLoop(startActive = speakFirst, speakOpener = speakFirst) }
        }
        return START_STICKY
    }

    override fun onDestroy() {
        EventReporter.report(tokenStore.token, "DANA_SERVICE_DESTROYED")
        loopJob?.cancel()
        super.onDestroy()
    }

    override fun onBind(intent: Intent?): IBinder? = null

    private suspend fun listenLoop(startActive: Boolean = false, speakOpener: Boolean = false) {
        var active = startActive
        if (speakOpener) {
            updateNotification("Conversando com você...")
            try {
                val token = tokenStore.token
                val name = tokenStore.userName ?: "você"
                val activityLabel = tokenStore.activity ?: "treino"
                if (token != null) {
                    val opener = "Oi, $name! Hoje tem $activityLabel. Vamos começar juntos?"
                    val audio = apiClient.motivationAudio(token, opener)
                    audioPlayer.play(audio)
                }
            } catch (e: Exception) {
                // Sem conexão: segue direto pra escuta ativa mesmo sem a fala de abertura.
            }
        }
        while (true) {
            // So pula o ciclo quando esta so esperando o "Ok Dana" (nao numa
            // conversa ativa) -- ligar o reconhecedor de fala nessa hora rouba
            // o foco de audio de quem estiver tocando video/musica (YouTube,
            // Instagram etc.), dando aquela pausadinha chata. Enquanto tiver
            // algo tocando, so espera -- a pessoa ainda pode acordar a Dana
            // depois que o video parar.
            if (!active && isOtherAudioPlaying()) {
                delay(1500)
                continue
            }
            try {
                val heard = speechToText.listenOnce().lowercase()
                consecutiveSilence = 0
                if (!active) {
                    val wakeMatch = WAKE_PHRASES.firstNotNullOfOrNull { phrase -> heard.indexOf(phrase).takeIf { it >= 0 }?.let { it to phrase } }
                    if (wakeMatch != null) {
                        active = true
                        EventReporter.report(tokenStore.token, "DANA_WAKE_DETECTED")
                        val (index, phrase) = wakeMatch
                        // Se a pessoa falar "Dana" e a pergunta junto, numa unica
                        // frase (ex.: "Dana, como foi meu treino?"), o resto depois
                        // da palavra de ativacao ia se perder -- a gente so marcava
                        // "ativo" e esperava a PROXIMA fala, que nunca vinha porque
                        // ela ja tinha falado tudo. Agora processa esse resto direto.
                        val remainder = heard.substring(index + phrase.length).trim(' ', ',', '.', '!', '?')
                        if (remainder.length >= 3) {
                            handleMessage(remainder)
                        } else {
                            playTone(ToneGenerator.TONE_PROP_BEEP)
                            updateNotification("Conversando com você...")
                        }
                    }
                } else if (containsAny(heard, END_PHRASES)) {
                    active = false
                    EventReporter.report(tokenStore.token, "DANA_CONVERSATION_ENDED", mapOf("reason" to "phrase"))
                    playTone(ToneGenerator.TONE_PROP_ACK)
                    updateNotification("Dana está ouvindo por \"Ok Dana\"...")
                } else {
                    handleMessage(heard)
                }
                delay(300) // Da um respiro pro reconhecedor antes do proximo ciclo -- sem isso, reinicios em sequencia deixam o servico de reconhecimento instavel.
            } catch (e: Exception) {
                EventReporter.report(tokenStore.token, "DANA_LISTEN_ERROR", mapOf("message" to e.message, "active" to active, "consecutiveSilence" to consecutiveSilence))
                if (active) {
                    consecutiveSilence++
                    // O reconhecedor de fala do Android da timeout sozinho depois de
                    // uns 4-5s de silencio -- isso e normal quando a pessoa so esta
                    // pensando no que vai falar. Com o limite antigo (2 ciclos, ~8-10s)
                    // a Dana "desligava sozinha" no meio de uma pausa natural da
                    // conversa. Agora precisa de bem mais silencio de verdade (~40s)
                    // antes de voltar a so escutar "Ok Dana".
                    if (consecutiveSilence >= 8) {
                        active = false
                        consecutiveSilence = 0
                        EventReporter.report(tokenStore.token, "DANA_CONVERSATION_ENDED", mapOf("reason" to "silence"))
                        updateNotification("Dana está ouvindo por \"Ok Dana\"...")
                    }
                }
                delay(600)
            }
        }
    }

    private suspend fun handleMessage(text: String) {
        val token = tokenStore.token ?: return
        val activity = tokenStore.activity ?: "atividade física"
        val name = tokenStore.userName ?: "você"
        // Confirma na hora que ouviu e ja esta processando -- sem isso, os alguns
        // segundos de espera pela resposta da IA + do audio pareciam trava/nao funcionar.
        playTone(ToneGenerator.TONE_PROP_BEEP2)
        updateNotification("Dana está pensando...")
        try {
            val reply = apiClient.companionChat(token, activity, name, text)
            val audio = apiClient.motivationAudio(token, reply.text)
            updateNotification("Conversando com você...")
            audioPlayer.play(audio)
            EventReporter.report(token, "DANA_MESSAGE_HANDLED")
        } catch (e: Exception) {
            EventReporter.report(token, "DANA_MESSAGE_FAILED", mapOf("message" to e.message))
            updateNotification("Conversando com você...")
            // Sem conexão agora: continua ouvindo, tenta de novo na próxima fala.
        }
    }

    private fun containsAny(text: String, phrases: List<String>) = phrases.any { text.contains(it) }

    private fun isOtherAudioPlaying(): Boolean {
        val audioManager = getSystemService(Context.AUDIO_SERVICE) as? AudioManager
        return audioManager?.isMusicActive == true
    }

    private suspend fun playTone(tone: Int) {
        val generator = try { ToneGenerator(AudioManager.STREAM_MUSIC, 80) } catch (e: Exception) { return }
        generator.startTone(tone, 200)
        delay(220)
        generator.release()
    }

    private fun createNotificationChannel() {
        val channel = NotificationChannel(CHANNEL_ID, "Dana ouvindo", NotificationManager.IMPORTANCE_LOW)
        val manager = getSystemService(NotificationManager::class.java)
        manager.createNotificationChannel(channel)
    }

    private fun buildNotification(text: String): Notification {
        val openAppIntent = PendingIntent.getActivity(
            this, 0, Intent(this, MainActivity::class.java),
            PendingIntent.FLAG_IMMUTABLE,
        )
        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("Dana")
            .setContentText(text)
            .setSmallIcon(android.R.drawable.ic_btn_speak_now)
            .setContentIntent(openAppIntent)
            .setOngoing(true)
            .build()
    }

    private fun updateNotification(text: String) {
        val manager = getSystemService(NotificationManager::class.java)
        manager.notify(NOTIFICATION_ID, buildNotification(text))
    }
}
