# ==============================================================================
# CulinaryOS - Android TV Native Kiosk Builder & CleanMyTV Staging Script
# Reuses CleanMyTV's portable JDK 17, Android SDK 34, Gradle, and ADB toolchain.
# ==============================================================================

param(
    [switch]$Sideload = $false,
    [string]$Device = "",
    [string]$DisplayUrl = "",
    [string]$ApiUrl = ""
)

$ErrorActionPreference = "Stop"
$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$TvProjectDir = Join-Path $RepoRoot "apps\android-tv"

# 1. Locate CleanMyTV Portable Toolchain (%APPDATA%\cleanmytv\tools or .cytv-build\tools)
$ToolsCandidates = @(
    (Join-Path $env:APPDATA "cleanmytv\tools"),
    "C:\Users\white\Desktop\CleanMyTV\.cytv-build\tools"
)

$ToolsRoot = $null
foreach ($candidate in $ToolsCandidates) {
    if ($candidate -and (Test-Path (Join-Path $candidate "android-sdk"))) {
        $ToolsRoot = $candidate
        break
    }
}

if (-not $ToolsRoot) {
    Write-Error "CleanMyTV Android SDK not found in %APPDATA%\cleanmytv\tools or C:\Users\white\Desktop\CleanMyTV\.cytv-build\tools."
    exit 1
}

# Find JAVA_HOME inside tools\jdk
$JavaExe = Get-ChildItem -Path (Join-Path $ToolsRoot "jdk") -Filter "java.exe" -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1
if (-not $JavaExe) {
    Write-Error "JDK 17 java.exe not found under $ToolsRoot\jdk"
    exit 1
}
$JavaHome = $JavaExe.Directory.Parent.FullName
$SdkDir = Join-Path $ToolsRoot "android-sdk"
$GradleHome = Join-Path $ToolsRoot "gradle"
$AdbExe = Join-Path $ToolsRoot "platform-tools\adb.exe"

Write-Host "[OK] Using CleanMyTV Toolchain:" -ForegroundColor Green
Write-Host "  JAVA_HOME   = $JavaHome"
Write-Host "  ANDROID_SDK = $SdkDir"

# 2. Ensure Gradle Wrapper exists in apps/android-tv (reuse from CleanMyTV\launcher if needed)
$GradlewBat = Join-Path $TvProjectDir "gradlew.bat"
$CleanMyTvLauncher = "C:\Users\white\Desktop\CleanMyTV\launcher"
if (-not (Test-Path $GradlewBat) -and (Test-Path (Join-Path $CleanMyTvLauncher "gradlew.bat"))) {
    Copy-Item (Join-Path $CleanMyTvLauncher "gradlew.bat") $GradlewBat -Force
    Copy-Item (Join-Path $CleanMyTvLauncher "gradlew") (Join-Path $TvProjectDir "gradlew") -Force -ErrorAction SilentlyContinue
    $WrapperDest = Join-Path $TvProjectDir "gradle\wrapper"
    New-Item -ItemType Directory -Path $WrapperDest -Force | Out-Null
    Copy-Item (Join-Path $CleanMyTvLauncher "gradle\wrapper\*") $WrapperDest -Force
}

# 3. Write local.properties (escaped for Java properties)
$EscapedSdk = $SdkDir.Replace("\", "\\").Replace(":", "\:")
Set-Content -Path (Join-Path $TvProjectDir "local.properties") -Value "sdk.dir=$EscapedSdk`n" -Encoding Ascii

# 4. Run Gradle assembleDebug
$env:JAVA_HOME = $JavaHome
$env:ANDROID_HOME = $SdkDir
$env:GRADLE_USER_HOME = $GradleHome

Push-Location $TvProjectDir
try {
    Write-Host "[>>] Building com.culinaryos.display APK..." -ForegroundColor Cyan
    & cmd.exe /c "`"$GradlewBat`" assembleDebug --no-daemon --console=plain"
    if ($LASTEXITCODE -ne 0) {
        throw "Gradle assembleDebug failed with exit code $LASTEXITCODE"
    }
} finally {
    Pop-Location
}

$ApkPath = Join-Path $TvProjectDir "app\build\outputs\apk\debug\app-debug.apk"
if (-not (Test-Path $ApkPath)) {
    throw "APK was not generated at $ApkPath"
}

$ApkSizeKb = [math]::Round((Get-Item $ApkPath).Length / 1KB, 1)
Write-Host "[OK] Built CulinaryOS Android TV APK ($ApkSizeKb KB): $ApkPath" -ForegroundColor Green

# 5. Stage into CleanMyTV APK Library (%APPDATA%\cleanmytv\apks\culinaryos-display.apk)
if ($env:APPDATA) {
    $CytvApksDir = Join-Path $env:APPDATA "cleanmytv\apks"
    New-Item -ItemType Directory -Path $CytvApksDir -Force | Out-Null
    $StagedApk = Join-Path $CytvApksDir "culinaryos-display.apk"
    Copy-Item $ApkPath $StagedApk -Force
    Write-Host "[OK] Staged into CleanMyTV APK Library: $StagedApk" -ForegroundColor Green
}

# 6. Optional Live ADB Sideload
if ($Sideload -and (Test-Path $AdbExe)) {
    $AdbArgs = @()
    if ($Device) { $AdbArgs += @("-s", $Device) }
    Write-Host "[>>] Sideloading onto Android TV via ADB..." -ForegroundColor Cyan
    & $AdbExe @AdbArgs install -r $ApkPath
    $StartArgs = $AdbArgs + @("shell", "am", "start", "-n", "com.culinaryos.display/.MainActivity")
    if ($DisplayUrl) { $StartArgs += @("--es", "DISPLAY_URL", $DisplayUrl) }
    if ($ApiUrl) { $StartArgs += @("--es", "API_URL", $ApiUrl) }
    & $AdbExe @StartArgs
    Write-Host "[OK] Launched com.culinaryos.display on Android TV!" -ForegroundColor Green
}
