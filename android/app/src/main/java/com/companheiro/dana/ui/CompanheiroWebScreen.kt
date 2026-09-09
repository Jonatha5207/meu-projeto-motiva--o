package com.companheiro.dana.ui

import android.Manifest
import android.annotation.SuppressLint
import android.content.ActivityNotFoundException
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.webkit.GeolocationPermissions
import android.webkit.JavascriptInterface
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.viewinterop.AndroidView
import androidx.core.content.ContextCompat
import com.companheiro.dana.ble.HeartRateMonitor
import org.json.JSONObject

private const val COMPANHEIRO_URL = "https://companheiro-app.onrender.com/"
private const val TOKEN_KEY = "companheiro-auth-token"

private fun hasBluetoothPermission(context: Context): Boolean {
    val needed = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
        listOf(Manifest.permission.BLUETOOTH_SCAN, Manifest.permission.BLUETOOTH_CONNECT)
    } else {
        listOf(Manifest.permission.ACCESS_FINE_LOCATION)
    }
    return needed.all { ContextCompat.checkSelfPermission(context, it) == PackageManager.PERMISSION_GRANTED }
}

// Ponte JS <-> Android: o site usa isso pra pedir pro app nativo escanear e
// conectar num monitor cardiaco BLE de verdade -- o Web Bluetooth do navegador
// nao existe dentro do WebView, entao sem essa ponte o botao "Conectar" nunca
// funcionava aqui dentro do app.
private class DanaBluetoothBridge(
    private val context: Context,
    private val webView: WebView,
    private val onNeedsBluetoothPermission: () -> Unit,
) {
    private val monitor = HeartRateMonitor(context)

    private fun callJs(js: String) { webView.post { webView.evaluateJavascript(js, null) } }

    @JavascriptInterface
    fun connectHeartRate() {
        if (!hasBluetoothPermission(context)) { onNeedsBluetoothPermission(); return }
        monitor.connect(
            onConnected = { name -> callJs("window.__danaNativeHeartRate && window.__danaNativeHeartRate({connected:true,name:${JSONObject.quote(name)}})") },
            onBpm = { bpm -> callJs("window.__danaNativeHeartRate && window.__danaNativeHeartRate({bpm:$bpm})") },
            onDisconnected = { callJs("window.__danaNativeHeartRate && window.__danaNativeHeartRate({connected:false})") },
            onError = { callJs("window.__danaNativeHeartRate && window.__danaNativeHeartRate({connected:false,error:true})") },
        )
    }

    @JavascriptInterface
    fun disconnectHeartRate() { monitor.disconnect() }

    @JavascriptInterface
    fun hasNativeBluetooth(): Boolean = true
}

// Links como Waze/Google Maps abrem com esquemas tipo "intent://" ou "geo:" --
// um WebView normal nao sabe navegar pra isso e mostra ERR_UNKNOWN_URL_SCHEME.
// Aqui a gente detecta esses casos e pede pro proprio Android abrir o app certo.
private fun tryLaunchExternally(context: Context, url: String): Boolean {
    if (url.startsWith("http://") || url.startsWith("https://")) return false
    return try {
        val intent = if (url.startsWith("intent://")) Intent.parseUri(url, Intent.URI_INTENT_SCHEME)
        else Intent(Intent.ACTION_VIEW, Uri.parse(url))
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        context.startActivity(intent)
        true
    } catch (e: Exception) {
        true // Sem app instalado pra abrir isso -- nao deixa o WebView tentar navegar mesmo assim.
    }
}

@SuppressLint("SetJavaScriptEnabled")
@Composable
fun CompanheiroWebScreen(
    authToken: String?,
    webViewRef: (WebView) -> Unit = {},
    onNeedsLocationPermission: () -> Unit = {},
    onNeedsBluetoothPermission: () -> Unit = {},
) {
    AndroidView(
        modifier = Modifier.fillMaxSize(),
        factory = { context ->
            WebView(context).apply {
                settings.javaScriptEnabled = true
                settings.domStorageEnabled = true
                settings.mediaPlaybackRequiresUserGesture = false
                settings.setGeolocationEnabled(true)
                addJavascriptInterface(DanaBluetoothBridge(context, this, onNeedsBluetoothPermission), "DanaNative")
                // Sem isso o mapa do site nunca conseguia a localizacao: o WebView
                // sempre nega o pedido de geolocalizacao do site se ninguem responder
                // ao prompt. Aqui a gente confere se o app tem a permissao do Android
                // e libera pro site (ou pede a permissao do sistema, se faltar).
                webChromeClient = object : WebChromeClient() {
                    override fun onGeolocationPermissionsShowPrompt(
                        origin: String,
                        callback: GeolocationPermissions.Callback,
                    ) {
                        val granted = ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED
                        if (granted) callback.invoke(origin, true, false)
                        else { onNeedsLocationPermission(); callback.invoke(origin, false, false) }
                    }
                }
                webViewClient = object : WebViewClient() {
                    override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
                        return tryLaunchExternally(context, request.url.toString())
                    }

                    override fun onPageFinished(view: WebView, url: String?) {
                        if (authToken != null) {
                            val encodedToken = JSONObject.quote(authToken)
                            view.evaluateJavascript(
                                """
                                (function() {
                                    if (localStorage.getItem('$TOKEN_KEY') !== $encodedToken) {
                                        localStorage.setItem('$TOKEN_KEY', $encodedToken);
                                        location.reload();
                                    }
                                })();
                                """.trimIndent(),
                                null,
                            )
                        }
                    }
                }
                loadUrl(COMPANHEIRO_URL)
                webViewRef(this)
            }
        },
    )
}
