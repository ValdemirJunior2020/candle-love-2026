# Candle Love Docker home hosting

Candle Love now uses a Docker-first backend. PostgreSQL, the API server, database migrations, and scheduled backups run as separate containers. The Expo client never connects directly to PostgreSQL.

## Services

- `postgres`: PostgreSQL 17 with a persistent named volume.
- `migrate`: applies each SQL migration once before the API starts.
- `server`: Fastify API and Socket.IO server on port 5000.
- `backup`: creates a compressed PostgreSQL backup every 24 hours and keeps 14 days.
- `cloudflared`: optional public HTTPS tunnel, disabled unless the `public` profile is enabled.

PostgreSQL is bound to `127.0.0.1:5432`, so other devices cannot connect to it directly. The API is exposed on port 5000 because the Expo app needs it.

## First start on Windows

Open Docker Desktop. In PowerShell, from the project root, run:

```powershell
npm.cmd run docker:up
```

Or run Docker directly:

```powershell
docker compose up -d --build
```

Check the API:

```powershell
Invoke-RestMethod http://localhost:5000/api/health
Invoke-RestMethod http://localhost:5000/api/ready
```

Seed the demo accounts once:

```powershell
npm.cmd run docker:seed
```

Start Expo Web in another PowerShell window:

```powershell
cd client
npx expo start --web
```

The client `.env` already points to `http://localhost:5000` and demo mode is disabled.

## Testing on an iPhone on the same Wi-Fi

Find the Windows computer's IPv4 address:

```powershell
ipconfig
```

Change `client/.env`:

```env
EXPO_PUBLIC_DEMO_MODE=false
EXPO_PUBLIC_API_URL=http://192.168.1.100:5000
```

Replace the sample address with the Windows computer's actual IPv4 address. Allow TCP port 5000 through Windows Defender Firewall for the private network only. Restart Expo after changing `.env`.

## Public iOS access outside the home

An App Store build needs an HTTPS API URL. Do not expose PostgreSQL. The included optional `cloudflared` container can publish only the API through a named Cloudflare Tunnel.

1. Add a domain to Cloudflare.
2. In Cloudflare Zero Trust, create a named tunnel.
3. Create a public hostname such as `api.candlelove.com`.
4. Set the tunnel service target to `http://server:5000`.
5. Copy the tunnel token into the root `.env` as `CLOUDFLARE_TUNNEL_TOKEN`.
6. Change `NODE_ENV=production`, `SERVER_URL=https://api.candlelove.com`, and add your Expo Web/domain origins to `CORS_ALLOWED_ORIGINS`.
7. Start the public profile:

```powershell
docker compose --profile public up -d --build
```

8. Set the production Expo environment value:

```env
EXPO_PUBLIC_API_URL=https://api.candlelove.com
```

Never put the PostgreSQL password or `DATABASE_URL` in the Expo client.

## Automatic startup after Windows restarts

Docker services use `restart: always`. In Docker Desktop settings, enable **Start Docker Desktop when you sign in**. After Docker starts, the containers restart automatically.

For a machine that must recover without anyone signing in, configure Docker Desktop/Windows for unattended startup or run Docker Engine in an environment designed for services. Test recovery by rebooting the computer and confirming:

```powershell
docker compose ps
Invoke-RestMethod http://localhost:5000/api/ready
```

## Backups

Automatic compressed backups are stored in `backups/` once every 24 hours. The backup container keeps 14 days.

Create a manual backup:

```powershell
npm.cmd run docker:backup
```

Restore a manual uncompressed `.sql` backup:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/docker-restore.ps1 -BackupFile backups\YOUR_BACKUP.sql
```

Copy backups to another physical drive or encrypted cloud storage. A backup stored only on the same computer does not protect against disk failure, theft, or fire.

## Useful commands

```powershell
npm.cmd run docker:status
docker compose logs -f server
docker compose logs -f postgres
docker compose restart server
npm.cmd run docker:down
```

To remove containers without deleting database data:

```powershell
docker compose down
```

To permanently erase the database volume:

```powershell
docker compose down -v
```

The `-v` command deletes all database data. Use it only when you intentionally want a complete reset.

## npm registry or ECONNREFUSED during Docker build

The project is configured to use the public npm registry. If an older copy reports a URL containing `applied-caas-gateway` or `internal.api.openai.org`, that copy has an old lockfile. Use the corrected project or run this from the project root before rebuilding:

```powershell
Get-ChildItem -Recurse -Filter package-lock.json | ForEach-Object {
  (Get-Content $_.FullName -Raw).Replace(
    ("https://packages." + "applied-caas-gateway1.internal.api.openai.org" + "/artifactory/api/npm/npm-public/"),
    "https://registry.npmjs.org/"
  ) | Set-Content $_.FullName -NoNewline
}

docker compose build --no-cache
docker compose up -d
```
