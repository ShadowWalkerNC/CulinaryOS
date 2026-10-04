param(
  [switch]$Check,
  [switch]$Restart
)

$bin = Join-Path ([IO.Path]::GetTempPath()) 'culinaryos-postgres-verification-20260930/runtime/pgsql/bin'
$pgCtl = Join-Path $bin 'pg_ctl.exe'
$dataDir = Join-Path ([IO.Path]::GetTempPath()) 'culinaryos-postgres-verification-20260930/cluster/data'

if ($Check) {
  & $pgCtl -D $dataDir status
  Write-Host "pg_ctl status exit code: $LASTEXITCODE"
  $state = Get-Content (Join-Path ([IO.Path]::GetTempPath()) 'culinaryos-postgres-verification-20260930/cluster/test-env.json') | ConvertFrom-Json
  $pw = Get-Content (Join-Path ([IO.Path]::GetTempPath()) 'culinaryos-postgres-verification-20260930/cluster/test-password.txt')
  $env:PGPASSWORD = $pw
  & (Join-Path $bin 'psql.exe') -h 127.0.0.1 -p $state.port -U postgres -d culinaryos_verification -c 'SELECT 1 AS alive'
  Write-Host "psql test query exit code: $LASTEXITCODE"
}
if ($Restart) {
  & $pgCtl -D $dataDir -m immediate -w stop
  Remove-Item (Join-Path $dataDir 'postmaster.pid') -Force -ErrorAction SilentlyContinue
  Write-Host "Cleaned up cluster state"
}
