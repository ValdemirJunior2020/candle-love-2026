$ErrorActionPreference = "Stop"
Set-Location (Split-Path $PSScriptRoot -Parent)
docker compose ps
docker compose logs --tail=80 server postgres backup
