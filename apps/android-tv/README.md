# CulinaryOS Android TV Client Shell (Walmart onn. 4K Android TV)

Ultra-lean Android TV Leanback client wrapper for CulinaryOS & Cheezies displays.

## Target Hardware Specifications

* **Primary Device:** Walmart onn. 4K / onn. 4K Pro Streaming Box
* **Operating System:** Android TV 14 (API 34)
* **Resolution:** 1080p (1920×1080) / 4K (3840×2160)
* **RAM Footprint:** < 45 MB RAM
* **Storage Footprint:** ~1.8 MB APK
* **System Privileges:** Standard user space (Zero root, zero unlocked bootloader required)

---

## Native Capabilities

1. **Auto-Launch on Boot (`BootReceiver`):** When the onn. box receives power, CulinaryOS Display automatically launches to the configured view.
2. **D-Pad Remote Interception:** Native hardware key translation (`DPAD_UP`, `DPAD_DOWN`, `DPAD_LEFT`, `DPAD_RIGHT`, `DPAD_CENTER`, `BACK`, `MENU`) directly into web events.
3. **Immersive Kiosk Mode:** System bars and navigation elements are permanently hidden.
4. **Auto-Reconnect:** If restaurant Wi-Fi drops, displays a graceful standby indicator and automatically re-syncs when connectivity returns.
5. **Screen Keep-Awake:** `FLAG_KEEP_SCREEN_ON` prevents television panels from entering sleep during active kitchen service.

---

## Build & Install Guide

### 1. Build APK using Gradle

```bash
cd apps/android-tv
./gradlew assembleRelease
# Or for debug build:
./gradlew assembleDebug
```

The compiled APK will be output to:
`apps/android-tv/app/build/outputs/apk/debug/app-debug.apk`

---

### 2. Sideload onto Walmart onn. 4K Streaming Box

#### Step A: Enable Developer Options & USB / Network Debugging on onn. Box
1. On your Walmart onn. remote, go to **Settings (Gear Icon) → System → About**.
2. Scroll down to **Android TV OS build** and press the **Center/OK button 7 times** until you see *"You are now a developer!"*.
3. Go back to **Settings → System → Developer options**.
4. Enable **USB debugging** (and **Network debugging** if connecting over Wi-Fi).

#### Step B: Connect via ADB
Find the IP address of your onn. box (**Settings → Network & Internet → Your Wi-Fi**):

```bash
# Connect over your local network:
adb connect 192.168.1.150:5555

# Verify device is connected:
adb devices
```

#### Step C: Install the APK
```bash
adb install -r apps/android-tv/app/build/outputs/apk/debug/app-debug.apk
```

#### Step D: Launch the Display
```bash
adb shell am start -n com.culinaryos.display/.MainActivity
```

---

## Production Deployment Checklist

1. **First Boot:** The TV screen displays a 6-digit pairing code (e.g., `726 419`).
2. **Manager Pairing:**
   - From phone or admin workstation, open `culinaryos.app/displays` (or `http://<server-ip>:5174/displays`).
   - Click **Pair New Display**, enter code `726 419`, select mode (Kitchen, Wallboard, Menu, Cheezies Ops).
3. **Remote Control:**
   - Use the Walmart onn. remote directional pad to navigate tickets and press the **Center OK** button to bump.
