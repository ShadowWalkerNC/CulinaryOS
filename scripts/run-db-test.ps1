$ErrorActionPreference = 'Stop'
$clusterFile = Join-Path ([IO.Path]::GetTempPath()) 'culinaryos-postgres-verification-20260930/cluster/test-env.json'
if (-not (Test-Path $clusterFile)) {
    throw "Test cluster state file not found at $clusterFile"
}
$clusterJson = Get-Content $clusterFile -Raw | ConvertFrom-Json
$env:NODE_ENV = 'test'
$env:TEST_DATABASE_URL = $clusterJson.TEST_DATABASE_URL

if ($args.Count -eq 0) {
    Write-Host "Running default test suite: tests/db/runtime-role.test.ts"
    node -r ./scripts/test-hook.cjs --import tsx tests/db/runtime-role.test.ts
} else {
    foreach ($testPath in $args) {
        Write-Host "Running test: $testPath"
        node -r ./scripts/test-hook.cjs --import tsx $testPath
        if ($LASTEXITCODE -ne 0) {
            exit $LASTEXITCODE
        }
    }
}
