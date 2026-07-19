$ErrorActionPreference = "Stop"
Set-Location (Split-Path $PSScriptRoot -Parent)

if (-not (Test-Path ".env")) {
  Copy-Item ".env.example" ".env"
  Write-Host "Created .env from .env.example. Replace the placeholder passwords before continuing." -ForegroundColor Yellow
  exit 1
}

Write-Host "Building Candle Love with the public npm registry..." -ForegroundColor Cyan
docker compose up -d --build
if ($LASTEXITCODE -ne 0) {
  throw "Docker build failed. Review the error above; services were not started."
}

Write-Host "Waiting for Candle Love services..." -ForegroundColor Cyan
$healthy = $false
for ($attempt = 1; $attempt -le 30; $attempt++) {
  try {
    $response = Invoke-RestMethod -Uri "http://localhost:5000/api/ready" -TimeoutSec 3
    if ($response.status -eq "ready") {
      $healthy = $true
      break
    }
  } catch {
    Start-Sleep -Seconds 2
  }
}

docker compose ps

if (-not $healthy) {
  Write-Host "The containers started, but the API did not become ready in time." -ForegroundColor Yellow
  Write-Host "Run: docker compose logs --tail=200 server migrate postgres" -ForegroundColor Yellow
  exit 1
}

Write-Host "Candle Love is ready: http://localhost:5000/api/health" -ForegroundColor Green
