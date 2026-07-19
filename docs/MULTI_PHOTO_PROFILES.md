# Multi-photo profiles

Candle Love now supports a real profile-photo gallery:

- Minimum required for profile completion: **2 photos**
- Recommended: **4 photos**
- Maximum: **6 photos**
- The photo in position 1 is the main profile photo.
- Users can choose several photos from the library, take a photo, reorder photos, make a photo primary, and delete photos while keeping at least two.

## Storage

PostgreSQL stores photo metadata in `profile_photos`. The image files are saved in the persistent Docker volume `candle-love-uploads` and are served by the API under `/uploads/`.

The photo volume survives:

```powershell
docker compose restart
docker compose down
docker compose up -d
```

Do not run `docker compose down -v` unless you intentionally want to delete both the PostgreSQL and uploaded-photo volumes.

## Apply the update

From the project root:

```powershell
docker compose down --remove-orphans
docker compose build --no-cache --pull
docker compose up -d
docker compose ps -a
Invoke-RestMethod http://localhost:5000/api/ready
```

The migration service applies `server/migrations/002_profile_photos.sql` automatically.

Then install the new Expo dependencies and start the web app:

```powershell
cd client
npm.cmd install
npx.cmd expo start --web -c
```

## Backup

The automatic backup container now writes two files each day:

- A compressed PostgreSQL dump
- A compressed archive of uploaded profile photos

Create a manual pair:

```powershell
npm.cmd run docker:backup
```

Restore a database and optional photo archive:

```powershell
npm.cmd run docker:restore -- -DatabaseBackupFile .\backups\candle_love_manual_DATE.sql.gz -PhotoBackupFile .\backups\candle_love_uploads_manual_DATE.tar.gz
```

## Main implementation files

- `server/migrations/002_profile_photos.sql`
- `server/src/routes/profile.ts`
- `server/src/services/profile-photos.ts`
- `server/src/index.ts`
- `docker-compose.yml`
- `client/components/ProfilePhotoManager.tsx`
- `client/app/profile/edit.tsx`
- `client/components/ProfileCard.tsx`
- `client/context/AuthContext.tsx`
