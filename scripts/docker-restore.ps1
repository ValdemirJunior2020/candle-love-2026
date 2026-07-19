param(
  [Parameter(Mandatory=$true)]
  [string]$DatabaseBackupFile,

  [Parameter(Mandatory=$false)]
  [string]$PhotoBackupFile
)

$ErrorActionPreference = "Stop"
$root = Split-Path $PSScriptRoot -Parent
Set-Location $root
$backupDir = Resolve-Path "backups"

function Resolve-SafeBackup([string]$path) {
  $resolved = Resolve-Path $path -ErrorAction Stop
  if (-not $resolved.Path.StartsWith($backupDir.Path, [System.StringComparison]::OrdinalIgnoreCase)) {
    throw "For safety, place backup files inside the project's backups folder."
  }
  return $resolved
}

$dbResolved = Resolve-SafeBackup $DatabaseBackupFile
$dbFileName = Split-Path $dbResolved.Path -Leaf
$photoFileName = $null

if ($PhotoBackupFile) {
  $photoResolved = Resolve-SafeBackup $PhotoBackupFile
  $photoFileName = Split-Path $photoResolved.Path -Leaf
}

Write-Host "This will replace the current Candle Love database." -ForegroundColor Yellow
if ($photoFileName) {
  Write-Host "The uploaded profile-photo volume will also be replaced." -ForegroundColor Yellow
}
$confirm = Read-Host "Type RESTORE to continue"
if ($confirm -ne "RESTORE") { exit 1 }

docker compose stop server backup

docker compose exec -T postgres sh -c 'PGPASSWORD="$POSTGRES_PASSWORD" dropdb --username="$POSTGRES_USER" --if-exists "$POSTGRES_DB" && PGPASSWORD="$POSTGRES_PASSWORD" createdb --username="$POSTGRES_USER" "$POSTGRES_DB"'
if ($LASTEXITCODE -ne 0) { throw "Could not recreate the database." }

if ($dbFileName.EndsWith(".gz")) {
  docker compose run --rm --no-deps backup /bin/sh -c "gzip -dc '/backups/$dbFileName' | PGPASSWORD=\"`$POSTGRES_PASSWORD\" psql --host=postgres --username=\"`$POSTGRES_USER\" --dbname=\"`$POSTGRES_DB\""
} else {
  docker compose run --rm --no-deps backup /bin/sh -c "cat '/backups/$dbFileName' | PGPASSWORD=\"`$POSTGRES_PASSWORD\" psql --host=postgres --username=\"`$POSTGRES_USER\" --dbname=\"`$POSTGRES_DB\""
}
if ($LASTEXITCODE -ne 0) { throw "Database restore failed." }

if ($photoFileName) {
  docker compose run --rm --no-deps backup /bin/sh -c "rm -rf /uploads/* /uploads/.[!.]* /uploads/..?* 2>/dev/null || true; tar -xzf '/backups/$photoFileName' -C /uploads"
  if ($LASTEXITCODE -ne 0) { throw "Photo restore failed." }
}

docker compose up -d migrate server backup
if ($LASTEXITCODE -ne 0) { throw "Services failed to restart after restore." }

Write-Host "Restore completed." -ForegroundColor Green
