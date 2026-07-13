$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$configPath = Join-Path $projectRoot "dashboard\map-config.js"

if (-not (Test-Path -LiteralPath $configPath)) {
  throw "Cannot find dashboard\map-config.js"
}

$existingCatalogKey = [Environment]::GetEnvironmentVariable("OMARTA_2GIS_CATALOG_KEY", "Process")
$configText = Get-Content -LiteralPath $configPath -Raw
$configKeyMatch = [regex]::Match($configText, 'twoGisMapKey:\s*"([^"]*)"')
$existingMapKey = if ($configKeyMatch.Success) { $configKeyMatch.Groups[1].Value } else { "" }

$key = $existingCatalogKey
if (-not $key) {
  $key = $existingMapKey
}
if (-not $key) {
  $key = Read-Host "Paste 2GIS API key"
}

if (-not $key) {
  throw "2GIS API key is required."
}

$env:OMARTA_2GIS_CATALOG_KEY = $key

if (-not $existingMapKey) {
  $escapedKey = $key.Replace("\", "\\").Replace('"', '\"')
  $updatedConfig = [regex]::Replace($configText, 'twoGisMapKey:\s*"[^"]*"', "twoGisMapKey: `"$escapedKey`"")
  Set-Content -LiteralPath $configPath -Value $updatedConfig -Encoding UTF8
}

Write-Host "OMARTA server will use 2GIS key for map and catalog analysis."
Write-Host "Open http://127.0.0.1:8000/ after the server starts."

Set-Location -LiteralPath $projectRoot
python server.py
