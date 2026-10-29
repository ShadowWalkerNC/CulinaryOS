package com.culinaryos.display

import android.annotation.SuppressLint
import android.content.Context
import android.graphics.Color
import android.net.ConnectivityManager
import android.net.Network
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.view.Gravity
import android.view.KeyEvent
import android.view.View
import android.view.WindowInsets
import android.view.WindowInsetsController
import android.view.WindowManager
import android.webkit.WebChromeClient
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Button
import android.widget.FrameLayout
import android.widget.LinearLayout
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity

/**
 * CulinaryOS & Cheezies Android TV Native Kiosk Shell
 * Optimized for Walmart onn. 4K Android TV (Android TV 14) & CleanMyTV Deployment
 */
class MainActivity : AppCompatActivity() {

    private lateinit var webView: WebView
    private lateinit var offlineOverlay: FrameLayout
    private lateinit var configOverlay: FrameLayout
    private lateinit var activeUrlBadge: TextView
    private var isNetworkAvailable = true

    companion object {
        private const val PREFS_NAME = "culinaryos_tv_prefs"
        private const val KEY_DISPLAY_URL = "display_url"
        private const val KEY_API_URL = "api_url"
        private const val DEFAULT_EMULATOR_URL = "http://10.0.2.2:5181"
        private const val CLOUD_DEMO_URL = "https://culinaryos-demo.up.railway.app"
    }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // 1. Keep TV screen on permanently during restaurant operation
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)

        // 2. Hide system bars for full 1080p / 4K immersive display
        enableImmersiveMode()

        // 3. Create Webview Container
        val rootLayout = FrameLayout(this).apply {
            setBackgroundColor(Color.BLACK)
        }

        webView = WebView(this).apply {
            setBackgroundColor(Color.BLACK)
            layoutParams = FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                FrameLayout.LayoutParams.MATCH_PARENT
            )
        }

        configureWebSettings(webView.settings)

        // 4. Create graceful offline fallback overlay & D-Pad Server Switcher overlay
        offlineOverlay = createOfflineOverlay()
        configOverlay = createConfigOverlay()

        rootLayout.addView(webView)
        rootLayout.addView(offlineOverlay)
        rootLayout.addView(configOverlay)
        setContentView(rootLayout)

        // 5. Setup Network Monitor & Auto-Reconnect
        setupNetworkCallback()

        // 6. Resolve & Persist Display Platform Web App URL
        val targetUrl = resolveAndPersistTargetUrl()
        loadDisplayUrl(targetUrl)
    }

    private fun resolveAndPersistTargetUrl(): String {
        val prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val intentDisplay = intent.getStringExtra("DISPLAY_URL") ?: intent.getStringExtra("url")
        val intentApi = intent.getStringExtra("API_URL") ?: intent.getStringExtra("api")

        if (!intentDisplay.isNullOrBlank()) {
            prefs.edit().putString(KEY_DISPLAY_URL, intentDisplay.trim()).apply()
        }
        if (!intentApi.isNullOrBlank()) {
            prefs.edit().putString(KEY_API_URL, intentApi.trim()).apply()
        }

        val base = prefs.getString(KEY_DISPLAY_URL, null) ?: DEFAULT_EMULATOR_URL
        val api = prefs.getString(KEY_API_URL, null)
        return if (!api.isNullOrBlank() && !base.contains("api=")) {
            val sep = if (base.contains("?")) "&" else "?"
            "$base${sep}api=${Uri.encode(api)}"
        } else {
            base
        }
    }

    private fun updateSavedDisplayUrl(newUrl: String, newApiUrl: String? = null) {
        val prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val editor = prefs.edit().putString(KEY_DISPLAY_URL, newUrl)
        if (newApiUrl != null) {
            editor.putString(KEY_API_URL, newApiUrl)
        }
        editor.apply()
        configOverlay.visibility = View.GONE
        offlineOverlay.visibility = View.GONE
        loadDisplayUrl(resolveAndPersistTargetUrl())
    }

    private fun configureWebSettings(settings: WebSettings) {
        settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            databaseEnabled = true
            mediaPlaybackRequiresUserGesture = false
            allowFileAccess = false
            allowContentAccess = false
            cacheMode = WebSettings.LOAD_DEFAULT
            useWideViewPort = true
            loadWithOverviewMode = true
            mixedContentMode = WebSettings.MIXED_CONTENT_ALWAYS_ALLOW
            // TV identifier in User-Agent
            userAgentString = "$userAgentString CulinaryOS-AndroidTV/1.2.0 (onn4K)"
        }

        webView.webChromeClient = WebChromeClient()
        webView.webViewClient = object : WebViewClient() {
            override fun onReceivedError(
                view: WebView?,
                request: WebResourceRequest?,
                error: WebResourceError?
            ) {
                super.onReceivedError(view, request, error)
                if (request?.isForMainFrame == true) {
                    showOfflineNotice()
                }
            }

            override fun onPageFinished(view: WebView?, url: String?) {
                super.onPageFinished(view, url)
                offlineOverlay.visibility = View.GONE
            }
        }
    }

    private fun loadDisplayUrl(url: String) {
        webView.loadUrl(url)
    }

    private fun enableImmersiveMode() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            window.insetsController?.let { controller ->
                controller.hide(WindowInsets.Type.statusBars() or WindowInsets.Type.navigationBars())
                controller.systemBarsBehavior =
                    WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
            }
        } else {
            @Suppress("DEPRECATION")
            window.decorView.systemUiVisibility = (
                View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
                    or View.SYSTEM_UI_FLAG_FULLSCREEN
                    or View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                    or View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                    or View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                    or View.SYSTEM_UI_FLAG_LAYOUT_STABLE
            )
        }
    }

    override fun onWindowFocusChanged(hasFocus: Boolean) {
        super.onWindowFocusChanged(hasFocus)
        if (hasFocus) {
            enableImmersiveMode()
        }
    }

    /**
     * D-Pad Remote Control Interceptor
     * Maps Android TV remote hardware keys to JavaScript KeyboardEvents
     */
    override fun dispatchKeyEvent(event: KeyEvent): Boolean {
        if (configOverlay.visibility == View.VISIBLE) {
            if (event.action == KeyEvent.ACTION_DOWN && event.keyCode == KeyEvent.KEYCODE_BACK) {
                configOverlay.visibility = View.GONE
                return true
            }
            return super.dispatchKeyEvent(event)
        }

        if (event.action == KeyEvent.ACTION_DOWN) {
            when (event.keyCode) {
                KeyEvent.KEYCODE_MENU, KeyEvent.KEYCODE_SETTINGS -> {
                    toggleConfigOverlay()
                    return true
                }
                KeyEvent.KEYCODE_DPAD_UP -> {
                    dispatchJsKey("ArrowUp", 19)
                    return true
                }
                KeyEvent.KEYCODE_DPAD_DOWN -> {
                    dispatchJsKey("ArrowDown", 20)
                    return true
                }
                KeyEvent.KEYCODE_DPAD_LEFT -> {
                    dispatchJsKey("ArrowLeft", 21)
                    return true
                }
                KeyEvent.KEYCODE_DPAD_RIGHT -> {
                    dispatchJsKey("ArrowRight", 22)
                    return true
                }
                KeyEvent.KEYCODE_DPAD_CENTER, KeyEvent.KEYCODE_ENTER -> {
                    if (offlineOverlay.visibility == View.VISIBLE) {
                        toggleConfigOverlay()
                        return true
                    }
                    dispatchJsKey("Enter", 13)
                    return true
                }
                KeyEvent.KEYCODE_BACK -> {
                    if (offlineOverlay.visibility == View.VISIBLE) {
                        toggleConfigOverlay()
                        return true
                    }
                    dispatchJsKey("Escape", 27)
                    return true
                }
            }
        }
        return super.dispatchKeyEvent(event)
    }

    private fun toggleConfigOverlay() {
        if (configOverlay.visibility == View.VISIBLE) {
            configOverlay.visibility = View.GONE
        } else {
            activeUrlBadge.text = "Current Target: ${resolveAndPersistTargetUrl()}"
            configOverlay.visibility = View.VISIBLE
        }
    }

    private fun dispatchJsKey(key: String, keyCode: Int) {
        val script = """
            window.dispatchEvent(new KeyboardEvent('keydown', {
                key: '$key',
                keyCode: $keyCode,
                which: $keyCode,
                bubbles: true,
                cancelable: true
            }));
        """.trimIndent()
        webView.evaluateJavascript(script, null)
    }

    private fun createOfflineOverlay(): FrameLayout {
        return FrameLayout(this).apply {
            visibility = View.GONE
            setBackgroundColor(Color.parseColor("#090D16"))
            layoutParams = FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                FrameLayout.LayoutParams.MATCH_PARENT
            )

            val tv = TextView(this@MainActivity).apply {
                text = "CulinaryOS Display\nConnecting to Restaurant Network...\n\n[Press OK or MENU on TV Remote to Switch Server]"
                setTextColor(Color.parseColor("#FBBF24"))
                textSize = 22f
                textAlignment = View.TEXT_ALIGNMENT_CENTER
                layoutParams = FrameLayout.LayoutParams(
                    FrameLayout.LayoutParams.WRAP_CONTENT,
                    FrameLayout.LayoutParams.WRAP_CONTENT,
                    Gravity.CENTER
                )
            }
            addView(tv)
        }
    }

    private fun createConfigOverlay(): FrameLayout {
        return FrameLayout(this).apply {
            visibility = View.GONE
            setBackgroundColor(Color.parseColor("#E6090D16"))
            layoutParams = FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                FrameLayout.LayoutParams.MATCH_PARENT
            )

            val panel = LinearLayout(this@MainActivity).apply {
                orientation = LinearLayout.VERTICAL
                setPadding(64, 48, 64, 48)
                setBackgroundColor(Color.parseColor("#141A29"))
                layoutParams = FrameLayout.LayoutParams(
                    FrameLayout.LayoutParams.WRAP_CONTENT,
                    FrameLayout.LayoutParams.WRAP_CONTENT,
                    Gravity.CENTER
                )
            }

            val title = TextView(this@MainActivity).apply {
                text = "CULINARYOS ANDROID TV — SERVER CONFIG"
                setTextColor(Color.parseColor("#FBBF24"))
                textSize = 20f
            }
            panel.addView(title)

            activeUrlBadge = TextView(this@MainActivity).apply {
                text = "Current Target: $DEFAULT_EMULATOR_URL"
                setTextColor(Color.parseColor("#94A3B8"))
                textSize = 14f
                setPadding(0, 8, 0, 24)
            }
            panel.addView(activeUrlBadge)

            fun addPresetButton(label: String, onClick: () -> Unit) {
                val btn = Button(this@MainActivity).apply {
                    text = label
                    isFocusable = true
                    isFocusableInTouchMode = true
                    setOnClickListener { onClick() }
                }
                panel.addView(btn)
            }

            addPresetButton("1. Connect to Railway Cloud Demo (culinaryos-demo.up.railway.app)") {
                updateSavedDisplayUrl(CLOUD_DEMO_URL, "")
            }
            addPresetButton("2. Connect to Local LAN Host (http://192.168.40.1:5181)") {
                updateSavedDisplayUrl("http://192.168.40.1:5181", "http://192.168.40.1:3000")
            }
            addPresetButton("3. Connect to Android Emulator Host (http://10.0.2.2:5181)") {
                updateSavedDisplayUrl(DEFAULT_EMULATOR_URL, "http://10.0.2.2:3000")
            }
            addPresetButton("4. Reload Active Display") {
                configOverlay.visibility = View.GONE
                offlineOverlay.visibility = View.GONE
                webView.reload()
            }

            addView(panel)
        }
    }

    private fun showOfflineNotice() {
        offlineOverlay.visibility = View.VISIBLE
    }

    private fun setupNetworkCallback() {
        val connectivityManager =
            getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
        connectivityManager.registerDefaultNetworkCallback(object :
            ConnectivityManager.NetworkCallback() {
            override fun onAvailable(network: Network) {
                runOnUiThread {
                    isNetworkAvailable = true
                    webView.reload()
                }
            }

            override fun onLost(network: Network) {
                runOnUiThread {
                    isNetworkAvailable = false
                    showOfflineNotice()
                }
            }
        })
    }
}
