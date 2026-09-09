package com.companheiro.dana.service

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat
import com.companheiro.dana.MainActivity
import com.companheiro.dana.data.TokenStore

private const val ALERT_CHANNEL_ID = "dana_alerts"
private const val ALERT_NOTIFICATION_ID = 2

class TrainingAlarmReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val tokenStore = TokenStore(context.applicationContext)
        if (tokenStore.token == null) return

        // Notificacao push (web) nao funciona dentro do WebView do app -- essa e
        // a notificacao nativa de verdade, que aparece na barra do Android mesmo
        // sem depender do site. Dispara sempre que o alarme do horario de treino
        // toca, independente da chamada de voz da Dana estar ligada ou nao.
        postTrainingNotification(context.applicationContext, tokenStore.activity ?: "seu treino")

        if (tokenStore.scheduledCallEnabled) {
            val serviceIntent = Intent(context, DanaListeningService::class.java).apply {
                action = DanaListeningService.ACTION_SPEAK_FIRST
            }
            ContextCompat.startForegroundService(context, serviceIntent)
        }

        tokenStore.trainingTime?.let { AlarmScheduler.scheduleNext(context.applicationContext, it) }
    }

    private fun postTrainingNotification(context: Context, activityLabel: String) {
        val channel = NotificationChannel(ALERT_CHANNEL_ID, "Lembretes de treino", NotificationManager.IMPORTANCE_HIGH)
        context.getSystemService(NotificationManager::class.java).createNotificationChannel(channel)

        val openAppIntent = PendingIntent.getActivity(
            context, 0, Intent(context, MainActivity::class.java),
            PendingIntent.FLAG_IMMUTABLE,
        )
        val notification = NotificationCompat.Builder(context, ALERT_CHANNEL_ID)
            .setContentTitle("Hora de treinar! 💪")
            .setContentText("Hoje tem $activityLabel. Toque pra conversar com a Dana.")
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setAutoCancel(true)
            .setContentIntent(openAppIntent)
            .build()
        try {
            NotificationManagerCompat.from(context).notify(ALERT_NOTIFICATION_ID, notification)
        } catch (e: SecurityException) {
            // Permissao de notificacao nao concedida -- sem travar o alarme por isso.
        }
    }
}
