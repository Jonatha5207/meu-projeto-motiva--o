package com.companheiro.dana.service

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import androidx.core.content.ContextCompat
import com.companheiro.dana.data.TokenStore

class TrainingAlarmReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val tokenStore = TokenStore(context.applicationContext)
        if (!tokenStore.scheduledCallEnabled || tokenStore.token == null) return

        val serviceIntent = Intent(context, DanaListeningService::class.java).apply {
            action = DanaListeningService.ACTION_SPEAK_FIRST
        }
        ContextCompat.startForegroundService(context, serviceIntent)

        tokenStore.trainingTime?.let { AlarmScheduler.scheduleNext(context.applicationContext, it) }
    }
}
