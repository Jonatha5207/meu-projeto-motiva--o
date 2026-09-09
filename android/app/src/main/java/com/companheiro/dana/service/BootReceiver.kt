package com.companheiro.dana.service

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import com.companheiro.dana.data.TokenStore

class BootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != Intent.ACTION_BOOT_COMPLETED) return
        val tokenStore = TokenStore(context.applicationContext)
        val time = tokenStore.trainingTime
        if (tokenStore.scheduledCallEnabled && time != null) {
            AlarmScheduler.scheduleNext(context.applicationContext, time)
        }
    }
}
