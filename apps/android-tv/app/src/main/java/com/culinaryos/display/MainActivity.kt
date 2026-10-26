package com.culinaryos.display

import android.annotation.SuppressLint
import android.content.Context
import android.graphics.Color
import android.net.ConnectivityManager
import android.net.Network
import android.os.Build
import android.os.Bundle
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
import android.widget.FrameLayout
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity

/**
 * CulinaryOS & Cheezies Android TV Native Kiosk Shell
 * Optimized for Walmart onn. 4K Android TV (Android TV 14)
 */
class MainActivity : AppCompatActivity() {

    private lateinit var webView: WebView
    private lateinit var offlineOverlay: FrameLayout
    private var isNetworkAvailable = true

    // Default display server URL (configurable via intent or local storage)
    private val defaultDisplayUrl = "http://10.0.2.2:5178"

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

        // 4. Create graceful offline fallback overlay
        offlineOverlay = createOfflineOverlay()

        rootLayout.addView(webView)
        rootLayout.addView(offlineOverlay)
        setContentView(rootLayout)

        // 5. Setup Network Monitor & Auto-Reconnect
        setupNetworkCallback()

        // 6. Load Display Platform Web App
        val targetUrl = intent.getStringExtra("DISPLAY_URL") ?: defaultDisplayUrl
        loadDisplayUrl(targetUrl)
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
        if (event.action == KeyEvent.ACTION_DOWN) {
            when (event.keyCode) {
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
                    dispatchJsKey("Enter", 13)
                    return true
                }
                KeyEvent.KEYCODE_BACK -> {
                    dispatchJsKey("Escape", 27)
                    return true
                }
                KeyEvent.KEYCODE_MENU -> {
                    dispatchJsKey("ContextMenu", 82)
                    return true
                }
            }
        }
        return super.dispatchKeyEvent(event)
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
                text = "CulinaryOS Display\nConnecting to Restaurant Network..."
                setTextColor(Color.parseColor("#FBBF24"))
                textSize = 24f
                textAlignment = View.TEXT_ALIGNMENT_CENTER
                layoutParams = FrameLayout.LayoutParams(
                    FrameLayout.LayoutParams.WRAP_CONTENT,
                    FrameLayout.LayoutParams.WRAP_CONTENT,
                    android.view.Gravity.CENTER
                )
            }
            addView(tv)
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
