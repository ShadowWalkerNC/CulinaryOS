# Monorepo import scanner script
$rootDir = "c:\Users\white\OneDrive\Documents\GitHub\CulinaryOS"
$files = Get-ChildItem -Path $rootDir -Recurse -Include *.ts,*.tsx,*.js,*.jsx,*.json | Where-Object { 
    $_.FullName -notmatch '\\node_modules\\' -and 
    $_.FullName -notmatch '\\\.git\\' -and 
    $_.FullName -notmatch '\\\.agents\\' 
}

Write-Host "Scanning $($files.Count) files..."

$results = @()

foreach ($file in $files) {
    $relPath = $file.FullName.Replace($rootDir + "\", "")
    $lines = Get-Content $file.FullName -ErrorAction SilentlyContinue
    if (-not $lines) { continue }
    
    $lineNum = 0
    foreach ($line in $lines) {
        $lineNum++
        
        # Match import/require/export statements
        $regex = "(?:import|require|export).*?['""]([^'""]+)['""]"
        $matches = [regex]::Matches($line, $regex)
        
        foreach ($m in $matches) {
            $impPath = $m.Groups[1].Value
            
            # Check 1: Direct /src/ imports (e.g. /src/ or ending in /src)
            $isDirectSrc = $impPath -match '/src(/|$)'
            
            # Check 2: Relative cross-package imports (e.g. ../../packages, ../../apps, ../../shared, ../../kds)
            $isRelativeCrossPkg = $impPath -match '\.\./\.\./'
            
            # Check 3: @culinaryos package imports
            $isCulinaryosPkg = $impPath -like "@culinaryos/*"
            
            if ($isDirectSrc -or $isRelativeCrossPkg -or $isCulinaryosPkg) {
                $type = "OTHER"
                if ($isDirectSrc) { $type = "DIRECT_SRC" }
                elseif ($isRelativeCrossPkg) { $type = "RELATIVE_CROSS_PACKAGE" }
                elseif ($isCulinaryosPkg) { $type = "PACKAGE_IMPORT" }
                
                $results += [PSCustomObject]@{
                    File = $relPath
                    LineNumber = $lineNum
                    ImportPath = $impPath
                    Type = $type
                    LineContent = $line.Trim()
                }
            }
        }
    }
}

$results | Format-Table -AutoSize -Property File, LineNumber, Type, ImportPath
$results | Export-Csv -Path "$rootDir\.agents\explorer_m1_1\scan_results.csv" -NoTypeInformation
Write-Host "Scan completed. Found $($results.Count) matching import occurrences."
