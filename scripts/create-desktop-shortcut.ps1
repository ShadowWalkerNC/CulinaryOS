# ============================================================
# CulinaryOS - Desktop Shortcut Generator
# ============================================================

$desktopPath = [Environment]::GetFolderPath('Desktop')
$shortcutPath = Join-Path -Path $desktopPath -ChildPath "CulinaryOS.lnk"
$repoRoot = (Get-Item $PSScriptRoot).Parent.FullName
$targetScript = Join-Path -Path $repoRoot -ChildPath "scripts\launch-with-update.bat"

Write-Host "Creating Desktop Shortcut: $shortcutPath"

try {
    $WshShell = New-Object -ComObject WScript.Shell
    $Shortcut = $WshShell.CreateShortcut($shortcutPath)
    $Shortcut.TargetPath = $targetScript
    $Shortcut.WorkingDirectory = $repoRoot
    $Shortcut.Description = "CulinaryOS - Turnkey Restaurant Operating System Workstation"
    $Shortcut.IconLocation = "$env:SystemRoot\System32\shell32.dll,14"
    $Shortcut.Save()

    Write-Host "[SUCCESS] Desktop Shortcut created successfully on your Windows Desktop!"
} catch {
    Write-Host "[ERROR] Failed to create shortcut: $_"
}
