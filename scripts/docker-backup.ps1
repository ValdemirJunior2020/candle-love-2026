$ErrorActionPreference = "Stop"
Set-Location (Split-Path $PSScriptRoot -Parent)
New-Item -ItemType Directory -Force -Path "backups" | Out-Null

$stamp = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH-mm-ssZ")
$dbFile = "candle_love_manual_$stamp.sql.gz"
$photoFile = "candle_love_uploads_manual_$stamp.tar.gz"

docker compose exec backup /bin/sh -c "
  set -eu
  PGPASSWORD=\"`$POSTGRES_PASSWORD\" pg_dump \
    --host=postgres \
    --username=\"`$POSTGRES_USER\" \
    --dbname=\"`$POSTGRES_DB\" \
    --no-owner \
    --no-privileges | gzip > '/backups/$dbFile'
  tar -czf '/backups/$photoFile' -C /uploads .
"

if ($LASTEXITCODE -ne 0) {
  throw "Backup failed."
}

Write-Host "Database backup: backups/$dbFile" -ForegroundColor Green
Write-Host "Photo backup:    backups/$photoFile" -ForegroundColor Green
