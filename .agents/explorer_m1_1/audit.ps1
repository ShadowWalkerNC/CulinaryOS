# Comprehensive Monorepo Alignment & Package Contract Audit Script (v2)

$rootDir = "c:\Users\white\OneDrive\Documents\GitHub\CulinaryOS".ToLower()

$packageMap = @{} # RelativeDir -> PackageInfo
$pkgNameMap = @{} # PkgName -> RelativeDir

$pkgJsonFiles = Get-ChildItem -Path $rootDir -Recurse -Include package.json | Where-Object {
    $_.FullName -notmatch '\\node_modules\\' -and $_.FullName -notmatch '\\\.git\\' -and $_.FullName -notmatch '\\\.agents\\'
}

foreach ($pj in $pkgJsonFiles) {
    $fullDir = $pj.DirectoryName.ToLower()
    $pkgDir = $fullDir.Replace($rootDir + "\", "")
    if ($fullDir -eq $rootDir) { $pkgDir = "root" }
    
    $content = Get-Content $pj.FullName -Raw | ConvertFrom-Json
    
    $deps = @()
    if ($content.dependencies) { $deps += $content.dependencies.psobject.properties.Name }
    if ($content.devDependencies) { $deps += $content.devDependencies.psobject.properties.Name }
    if ($content.peerDependencies) { $deps += $content.peerDependencies.psobject.properties.Name }
    
    $info = [PSCustomObject]@{
        Name = $content.name
        Directory = $pkgDir
        FullPath = $pj.DirectoryName
        PackageJsonPath = $pj.FullName
        Main = $content.main
        Module = $content.module
        Types = $content.types
        Exports = $content.exports
        Dependencies = $deps
    }
    $packageMap[$pkgDir] = $info
    if ($content.name) {
        $pkgNameMap[$content.name] = $pkgDir
    }
}

Write-Host "Discovered $($packageMap.Count) package.json locations:"
foreach ($key in ($packageMap.Keys | Sort-Object)) {
    Write-Host "  - [$key] name: '$($packageMap[$key].Name)'"
}

$codeFiles = Get-ChildItem -Path $rootDir -Recurse -Include *.ts,*.tsx,*.js,*.jsx,*.json | Where-Object {
    $_.FullName -notmatch '\\node_modules\\' -and $_.FullName -notmatch '\\\.git\\' -and $_.FullName -notmatch '\\\.agents\\' -and $_.FullName -notmatch '\\dist\\' -and $_.FullName -notmatch '\\build\\'
}

$issues = @()

foreach ($file in $codeFiles) {
    $fullFile = $file.FullName.ToLower()
    $relFile = $fullFile.Replace($rootDir + "\", "")
    
    # Determine owning package/directory
    $ownerPkg = "root"
    foreach ($pkgDir in ($packageMap.Keys | Sort-Object Length -Descending)) {
        if ($pkgDir -ne "root" -and $relFile.StartsWith($pkgDir)) {
            $ownerPkg = $pkgDir
            break
        }
    }
    
    $lines = Get-Content $file.FullName -ErrorAction SilentlyContinue
    if (-not $lines) { continue }
    
    $lineNum = 0
    foreach ($line in $lines) {
        $lineNum++
        
        $regexes = @(
            "import\s+.*?from\s*['""]([^'""]+)['""]",
            "import\s*['""]([^'""]+)['""]",
            "export\s+.*?from\s*['""]([^'""]+)['""]",
            "require\s*\(\s*['""]([^'""]+)['""]\s*\)",
            "import\s*\(\s*['""]([^'""]+)['""]\s*\)"
        )
        
        foreach ($reg in $regexes) {
            $matches = [regex]::Matches($line, $reg)
            foreach ($m in $matches) {
                $imp = $m.Groups[1].Value
                
                # Check 1: Direct /src/ import or internal file import of another package
                if ($imp -match '@culinaryos/[^/]+/src(/.*)?$' -or ($imp.StartsWith(".") -and $imp -match '/src(/.*)?$')) {
                    $issues += [PSCustomObject]@{
                        Category = "DIRECT_SRC_IMPORT"
                        File = $relFile
                        LineNumber = $lineNum
                        OwnerPackage = $ownerPkg
                        ImportSpecifier = $imp
                        CodeSnippet = $line.Trim()
                        Description = "Importing directly from internal src/ directory instead of published package entrypoint/export contract."
                    }
                }
                
                # Check 2: Relative path crossing package boundaries or accessing unmonorepoized root directories
                if ($imp.StartsWith(".")) {
                    $fileDir = $file.DirectoryName
                    $resolvedPath = [System.IO.Path]::GetFullPath([System.IO.Path]::Combine($fileDir, $imp)).ToLower()
                    $relTarget = $resolvedPath.Replace($rootDir + "\", "")
                    
                    $targetPkg = "root"
                    foreach ($pkgDir in ($packageMap.Keys | Sort-Object Length -Descending)) {
                        if ($pkgDir -ne "root" -and $relTarget.StartsWith($pkgDir)) {
                            $targetPkg = $pkgDir
                            break
                        }
                    }
                    
                    if ($ownerPkg -ne $targetPkg -and $targetPkg -ne "root" -and $ownerPkg -ne "root") {
                        $issues += [PSCustomObject]@{
                            Category = "CROSS_PACKAGE_RELATIVE_IMPORT"
                            File = $relFile
                            LineNumber = $lineNum
                            OwnerPackage = $ownerPkg
                            ImportSpecifier = $imp
                            CodeSnippet = $line.Trim()
                            Description = "Relative path '$imp' crosses from package '$ownerPkg' into package '$targetPkg'. Violates monorepo package boundary."
                        }
                    }
                    elseif ($ownerPkg -ne "root" -and ($relTarget.StartsWith("shared\") -or $relTarget.StartsWith("shared/"))) {
                        $issues += [PSCustomObject]@{
                            Category = "UNMONOREPOIZED_ROOT_IMPORT"
                            File = $relFile
                            LineNumber = $lineNum
                            OwnerPackage = $ownerPkg
                            ImportSpecifier = $imp
                            CodeSnippet = $line.Trim()
                            Description = "Package '$ownerPkg' imports from unmonorepoized root directory 'shared' using relative path '$imp'."
                        }
                    }
                    elseif ($ownerPkg -ne "root" -and ($relTarget.StartsWith("kds\") -or $relTarget.StartsWith("kds/"))) {
                        $issues += [PSCustomObject]@{
                            Category = "UNMONOREPOIZED_ROOT_IMPORT"
                            File = $relFile
                            LineNumber = $lineNum
                            OwnerPackage = $ownerPkg
                            ImportSpecifier = $imp
                            CodeSnippet = $line.Trim()
                            Description = "Package '$ownerPkg' imports from unmonorepoized root directory 'kds' using relative path '$imp'."
                        }
                    }
                    elseif ($ownerPkg -eq "root" -and $relFile.StartsWith("tests\") -and ($relTarget.StartsWith("kds\") -or $relTarget.StartsWith("shared\"))) {
                        $issues += [PSCustomObject]@{
                            Category = "UNMONOREPOIZED_ROOT_IMPORT"
                            File = $relFile
                            LineNumber = $lineNum
                            OwnerPackage = "tests"
                            ImportSpecifier = $imp
                            CodeSnippet = $line.Trim()
                            Description = "Test file imports from unmonorepoized root directory ('kds' or 'shared') via relative path '$imp'."
                        }
                    }
                }
                
                # Check 3: Package imports (@culinaryos/*) missing from package.json
                if ($imp -like "@culinaryos/*") {
                    $parts = $imp.Split('/')
                    $basePkgName = $parts[0] + "/" + $parts[1]
                    if ($ownerPkg -ne "root" -and $packageMap.ContainsKey($ownerPkg)) {
                        $declared = $packageMap[$ownerPkg].Dependencies
                        if ($declared -notcontains $basePkgName) {
                            $issues += [PSCustomObject]@{
                                Category = "UNDECLARED_DEPENDENCY"
                                File = $relFile
                                LineNumber = $lineNum
                                OwnerPackage = $ownerPkg
                                ImportSpecifier = $imp
                                CodeSnippet = $line.Trim()
                                Description = "Package '$ownerPkg' imports '$basePkgName' but does not declare '$basePkgName' in package.json dependencies."
                            }
                        }
                    }
                }
            }
        }
    }
}

Write-Host "`nTotal issues detected: $($issues.Count)"
$issues | Export-Csv -Path "$rootDir\.agents\explorer_m1_1\audit_issues_v2.csv" -NoTypeInformation

$issues | Group-Object Category | Select-Object Name, Count | Format-Table -AutoSize
