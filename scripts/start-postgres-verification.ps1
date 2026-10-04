param(
  [string]$BinaryDirectory = (Join-Path ([IO.Path]::GetTempPath()) 'culinaryos-postgres-verification-20260930/runtime/pgsql/bin'),
  [string]$StateDirectory = (Join-Path ([IO.Path]::GetTempPath()) 'culinaryos-postgres-verification-20260930/cluster'),
  [switch]$Stop
)
$ErrorActionPreference = 'Stop'
$stateRoot = [IO.Path]::GetFullPath($StateDirectory)
$tempRoot = [IO.Path]::GetFullPath([IO.Path]::GetTempPath())
if (-not $stateRoot.StartsWith($tempRoot, [StringComparison]::OrdinalIgnoreCase)) {
  throw 'Verification cluster must be contained in the temporary directory; never point this script at production.'
}
$binRoot = [IO.Path]::GetFullPath($BinaryDirectory)
$pgCtl = Join-Path $binRoot 'pg_ctl.exe'
if (-not (Test-Path -LiteralPath $pgCtl)) { throw 'Portable PostgreSQL binaries must be prepared first.' }
$dataDir = Join-Path $stateRoot 'data'
$stateFile = Join-Path $stateRoot 'test-env.json'
if ($Stop) {
  if (Test-Path -LiteralPath (Join-Path $dataDir 'postmaster.pid')) {
    & $pgCtl -D $dataDir -m fast -w stop
    if ($LASTEXITCODE -ne 0) {
      # If process is not running, clean up stale pid
      Remove-Item -LiteralPath (Join-Path $dataDir 'postmaster.pid') -Force -ErrorAction SilentlyContinue
    }
  }
  exit 0
}
[IO.Directory]::CreateDirectory($stateRoot) | Out-Null
if (Test-Path -LiteralPath $stateFile) {
  & $pgCtl -D $dataDir status
  if ($LASTEXITCODE -eq 0) { Write-Output 'Verification cluster already running; credentials remain in the private temp state file.'; exit 0 }
}
$passwordFile = Join-Path $stateRoot 'test-password.txt'
if (-not (Test-Path -LiteralPath $passwordFile)) {
  $passwordBytes = [byte[]]::new(32)
  [Security.Cryptography.RandomNumberGenerator]::Fill($passwordBytes)
  [IO.File]::WriteAllText($passwordFile, [Convert]::ToHexString($passwordBytes))
}
$testPassword = [IO.File]::ReadAllText($passwordFile)
if (-not (Test-Path -LiteralPath (Join-Path $dataDir 'PG_VERSION'))) {
  & (Join-Path $binRoot 'initdb.exe') -D $dataDir -U postgres --pwfile=$passwordFile -A scram-sha-256 -E UTF8 --no-locale
  if ($LASTEXITCODE -ne 0) { throw 'Verification initdb failed.' }
}
$portProbe = [Net.Sockets.TcpListener]::new([Net.IPAddress]::Loopback, 0)
$portProbe.Start()
$testPort = $portProbe.LocalEndpoint.Port
$portProbe.Stop()
& $pgCtl -D $dataDir -l (Join-Path $stateRoot 'postgres.log') -o "-h 127.0.0.1 -p $testPort" -w start
if ($LASTEXITCODE -ne 0) { throw 'Verification PostgreSQL start failed.' }
$previousPassword = $env:PGPASSWORD
try {
  $env:PGPASSWORD = $testPassword
  & (Join-Path $binRoot 'psql.exe') -h 127.0.0.1 -p $testPort -U postgres -d postgres -c 'CREATE DATABASE culinaryos_verification' | Out-Null
  # Existing verification database is retained across restarts, never reset automatically.
  $databaseUrl = "postgresql://postgres:$testPassword@127.0.0.1:$testPort/culinaryos_verification"
  [IO.File]::WriteAllText($stateFile, (@{ TEST_DATABASE_URL = $databaseUrl; port = $testPort; dataDirectory = $dataDir } | ConvertTo-Json))
} finally {
  if ($null -eq $previousPassword) { Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue }
  else { $env:PGPASSWORD = $previousPassword }
}
Write-Output "Isolated PostgreSQL verification cluster listening on loopback port $testPort. No Windows service installed."
