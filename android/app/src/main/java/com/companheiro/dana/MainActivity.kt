package com.companheiro.dana

import android.Manifest
import android.app.TimePickerDialog
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.provider.Settings
import android.webkit.WebView
import androidx.activity.ComponentActivity
import androidx.activity.compose.BackHandler
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.layout.*
import androidx.compose.material3.FloatingActionButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.core.content.ContextCompat
import com.companheiro.dana.data.TokenStore
import com.companheiro.dana.network.ApiClient
import com.companheiro.dana.network.ApiException
import com.companheiro.dana.service.AlarmScheduler
import com.companheiro.dana.service.DanaListeningService
import com.companheiro.dana.ui.ChatLine
import com.companheiro.dana.ui.ChatScreen
import com.companheiro.dana.ui.CompanheiroWebScreen
import com.companheiro.dana.ui.LoginScreen
import com.companheiro.dana.voice.AudioPlayer
import com.companheiro.dana.voice.SpeechToText
import kotlinx.coroutines.launch
import java.util.Calendar

class MainActivity : ComponentActivity() {

    private val apiClient = ApiClient()
    private lateinit var tokenStore: TokenStore
    private lateinit var speechToText: SpeechToText
    private lateinit var audioPlayer: AudioPlayer

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        tokenStore = TokenStore(applicationContext)
        speechToText = SpeechToText(applicationContext)
        audioPlayer = AudioPlayer(applicationContext)

        setContent {
            val colorScheme = if (isSystemInDarkTheme()) darkColorScheme() else lightColorScheme()
            MaterialTheme(colorScheme = colorScheme) {
                Surface(modifier = Modifier.fillMaxSize(), color = MaterialTheme.colorScheme.background) {
                    DanaApp()
                }
            }
        }
    }

    @Composable
    private fun DanaApp() {
        var token by remember { mutableStateOf(tokenStore.token) }
        var userName by remember { mutableStateOf(tokenStore.userName ?: "") }
        var userActivity by remember { mutableStateOf(tokenStore.activity ?: "Corrida") }
        LaunchedEffect(Unit) { if (tokenStore.activity == null) tokenStore.activity = userActivity }

        var authLoading by remember { mutableStateOf(false) }
        var authError by remember { mutableStateOf<String?>(null) }

        val chatLines = remember { mutableStateListOf<ChatLine>() }
        var isListening by remember { mutableStateOf(false) }
        var isThinking by remember { mutableStateOf(false) }
        var statusMessage by remember { mutableStateOf<String?>(null) }
        var alwaysOnEnabled by remember { mutableStateOf(false) }
        var trainingTime by remember { mutableStateOf(tokenStore.trainingTime) }
        var scheduledCallEnabled by remember { mutableStateOf(tokenStore.scheduledCallEnabled) }

        val scope = rememberCoroutineScope()

        fun openExactAlarmSettings() {
            val intent = Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM, Uri.parse("package:$packageName"))
            startActivity(intent)
        }

        fun enableScheduledCall() {
            val time = trainingTime ?: return
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && !AlarmScheduler.canScheduleExact(this@MainActivity)) {
                statusMessage = "Permite \"Alarmes e lembretes\" nas configurações pra Dana poder te chamar na hora certa."
                openExactAlarmSettings()
                return
            }
            AlarmScheduler.scheduleNext(this@MainActivity, time)
            tokenStore.scheduledCallEnabled = true
            scheduledCallEnabled = true
        }

        fun showTimePicker(andEnable: Boolean) {
            val now = Calendar.getInstance()
            val currentHour = trainingTime?.substringBefore(":")?.toIntOrNull() ?: now.get(Calendar.HOUR_OF_DAY)
            val currentMinute = trainingTime?.substringAfter(":")?.toIntOrNull() ?: now.get(Calendar.MINUTE)
            TimePickerDialog(this@MainActivity, { _, hour, minute ->
                val formatted = "%02d:%02d".format(hour, minute)
                trainingTime = formatted
                tokenStore.trainingTime = formatted
                if (andEnable || scheduledCallEnabled) enableScheduledCall()
            }, currentHour, currentMinute, true).show()
        }

        val micPermissionLauncher = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) { granted ->
            if (granted) startListeningFlow(scope, token, userActivity, userName, chatLines,
                onListening = { isListening = it }, onThinking = { isThinking = it }, onStatus = { statusMessage = it })
            else statusMessage = "Preciso da permissão de microfone pra te ouvir."
        }

        val notificationPermissionLauncher = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) {
            startDanaService()
            alwaysOnEnabled = true
        }

        val locationPermissionLauncher = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) {}
        val bluetoothPermissionLauncher = rememberLauncherForActivityResult(ActivityResultContracts.RequestMultiplePermissions()) {}

        val alwaysOnMicLauncher = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) { granted ->
            if (!granted) { statusMessage = "Preciso da permissão de microfone pra ficar ouvindo."; return@rememberLauncherForActivityResult }
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                val hasNotifPermission = ContextCompat.checkSelfPermission(this@MainActivity, Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED
                if (hasNotifPermission) { startDanaService(); alwaysOnEnabled = true }
                else notificationPermissionLauncher.launch(Manifest.permission.POST_NOTIFICATIONS)
            } else {
                startDanaService(); alwaysOnEnabled = true
            }
        }

        if (token == null) {
            LoginScreen(
                isLoading = authLoading,
                errorMessage = authError,
                onLogin = { email, password ->
                    authLoading = true; authError = null
                    scope.launch {
                        try {
                            val result = apiClient.login(email, password)
                            tokenStore.token = result.token
                            tokenStore.userName = result.userName
                            token = result.token
                            userName = result.userName
                        } catch (e: ApiException) {
                            authError = "Não consegui entrar: ${e.message}"
                        } catch (e: Exception) {
                            authError = "Sem conexão com o servidor agora."
                        } finally {
                            authLoading = false
                        }
                    }
                },
                onRegister = { name, email, password ->
                    authLoading = true; authError = null
                    scope.launch {
                        try {
                            val result = apiClient.register(name, email, password)
                            tokenStore.token = result.token
                            tokenStore.userName = result.userName
                            token = result.token
                            userName = result.userName
                        } catch (e: ApiException) {
                            authError = if (e.message == "email_already_registered") "Esse e-mail já tem conta -- toca em \"Já tenho conta\" e entra com ele."
                                else "Não consegui criar sua conta: ${e.message}"
                        } catch (e: Exception) {
                            authError = "Sem conexão com o servidor agora."
                        } finally {
                            authLoading = false
                        }
                    }
                },
                onGuestEntry = {
                    authLoading = true; authError = null
                    scope.launch {
                        try {
                            val guestId = "${System.currentTimeMillis()}${(0..9999).random()}"
                            val result = apiClient.register("Visitante", "visitante-$guestId@companheiro.app", "visitante-$guestId")
                            tokenStore.token = result.token
                            tokenStore.userName = result.userName
                            token = result.token
                            userName = result.userName
                        } catch (e: Exception) {
                            authError = "Sem conexão com o servidor agora."
                        } finally {
                            authLoading = false
                        }
                    }
                },
            )
        } else {
            var danaOpen by remember { mutableStateOf(false) } // false = mostra o site (que ja tem suas proprias abas), true = Dana em cima
            var webView by remember { mutableStateOf<WebView?>(null) }

            BackHandler(enabled = danaOpen) { danaOpen = false }
            BackHandler(enabled = !danaOpen && webView?.canGoBack() == true) { webView?.goBack() }

            Box(modifier = Modifier.fillMaxSize()) {
                // O site sempre fica montado por baixo -- assim o estado dele (aba em
                // que a pessoa estava, scroll, etc.) nao se perde quando abre e fecha a Dana.
                CompanheiroWebScreen(
                    authToken = token,
                    webViewRef = { webView = it },
                    onNeedsLocationPermission = { locationPermissionLauncher.launch(Manifest.permission.ACCESS_FINE_LOCATION) },
                    onNeedsBluetoothPermission = {
                        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                            bluetoothPermissionLauncher.launch(arrayOf(Manifest.permission.BLUETOOTH_SCAN, Manifest.permission.BLUETOOTH_CONNECT))
                        } else {
                            locationPermissionLauncher.launch(Manifest.permission.ACCESS_FINE_LOCATION)
                        }
                    },
                )

                if (!danaOpen) {
                    FloatingActionButton(
                        onClick = { danaOpen = true },
                        modifier = Modifier.align(Alignment.BottomEnd).padding(end = 16.dp, bottom = 84.dp),
                    ) {
                        Text("🎙️", style = MaterialTheme.typography.headlineSmall)
                    }
                } else {
                    Surface(modifier = Modifier.fillMaxSize(), color = MaterialTheme.colorScheme.background) {
                        Column(modifier = Modifier.fillMaxSize()) {
                            Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.fillMaxWidth().padding(8.dp)) {
                                TextButton(onClick = { danaOpen = false }) { Text("← Voltar") }
                                Text("Falar com a Dana", style = MaterialTheme.typography.titleMedium)
                            }
                            Box(modifier = Modifier.weight(1f)) {
                                ChatScreen(
                            userName = userName,
                            lines = chatLines,
                            isListening = isListening,
                            isThinking = isThinking,
                            statusMessage = statusMessage,
                            alwaysOnEnabled = alwaysOnEnabled,
                            trainingTime = trainingTime,
                            scheduledCallEnabled = scheduledCallEnabled,
                            onMicTap = {
                                val hasPermission = ContextCompat.checkSelfPermission(this@MainActivity, Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED
                                if (hasPermission) startListeningFlow(scope, token, userActivity, userName, chatLines,
                                    onListening = { isListening = it }, onThinking = { isThinking = it }, onStatus = { statusMessage = it })
                                else micPermissionLauncher.launch(Manifest.permission.RECORD_AUDIO)
                            },
                            onToggleAlwaysOn = { enabled ->
                                if (enabled) {
                                    val hasMicPermission = ContextCompat.checkSelfPermission(this@MainActivity, Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED
                                    if (hasMicPermission) {
                                        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU &&
                                            ContextCompat.checkSelfPermission(this@MainActivity, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
                                            notificationPermissionLauncher.launch(Manifest.permission.POST_NOTIFICATIONS)
                                        } else {
                                            startDanaService(); alwaysOnEnabled = true
                                        }
                                    } else {
                                        alwaysOnMicLauncher.launch(Manifest.permission.RECORD_AUDIO)
                                    }
                                } else {
                                    stopDanaService(); alwaysOnEnabled = false
                                }
                            },
                            onPickTrainingTime = { showTimePicker(andEnable = false) },
                            onToggleScheduledCall = { enabled ->
                                if (enabled) {
                                    if (trainingTime == null) showTimePicker(andEnable = true)
                                    else enableScheduledCall()
                                } else {
                                    AlarmScheduler.cancel(this@MainActivity)
                                    tokenStore.scheduledCallEnabled = false
                                    scheduledCallEnabled = false
                                }
                            },
                                )
                            }
                        }
                    }
                }
            }
        }
    }

    private fun startDanaService() {
        val intent = Intent(this, DanaListeningService::class.java)
        ContextCompat.startForegroundService(this, intent)
        requestIgnoreBatteryOptimizations()
    }

    private fun stopDanaService() {
        stopService(Intent(this, DanaListeningService::class.java))
    }

    // Sem isso, o Android (principalmente Xiaomi/Samsung) suspende o microfone e a
    // rede do servico assim que a tela apaga -- e exatamente o "para de funcionar
    // com a tela apagada" que o usuario relatou. Pede uma vez, sem travar o fluxo
    // se a pessoa recusar.
    private fun requestIgnoreBatteryOptimizations() {
        val powerManager = getSystemService(android.os.PowerManager::class.java)
        if (powerManager.isIgnoringBatteryOptimizations(packageName)) return
        try {
            val intent = Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS, Uri.parse("package:$packageName"))
            startActivity(intent)
        } catch (e: Exception) {
            // Alguns aparelhos (customizacoes de fabricante) bloqueiam essa tela --
            // segue sem a exclusao, o servico ainda funciona, so pode ser suspenso mais cedo.
        }
    }

    private fun startListeningFlow(
        scope: kotlinx.coroutines.CoroutineScope,
        token: String?,
        userActivity: String,
        userName: String,
        chatLines: MutableList<ChatLine>,
        onListening: (Boolean) -> Unit,
        onThinking: (Boolean) -> Unit,
        onStatus: (String?) -> Unit,
    ) {
        if (token == null) return
        scope.launch {
            onListening(true); onStatus("Ouvindo...")
            try {
                val heard = speechToText.listenOnce()
                onListening(false)
                chatLines.add(ChatLine(fromUser = true, text = heard))
                onThinking(true); onStatus("Dana está pensando...")
                val reply = apiClient.companionChat(token, userActivity, userName, heard)
                chatLines.add(ChatLine(fromUser = false, text = reply.text))
                onStatus("Dana está falando...")
                val audio = apiClient.motivationAudio(token, reply.text)
                audioPlayer.play(audio)
                onStatus(null)
            } catch (e: Exception) {
                onStatus("Não entendi. Toca no microfone pra tentar de novo.")
            } finally {
                onListening(false); onThinking(false)
            }
        }
    }
}
