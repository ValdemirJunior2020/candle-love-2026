# Candle Love: Render API + Netlify Web

## Production architecture

- Netlify: exported Expo web application
- Render Web Service: Fastify API and Socket.IO
- Render Postgres: production users, profiles, matches, messages, tokens, safety records, and wallet data
- Render persistent disk: profile photos and Voice Candle recordings
- Home Docker: local development, testing, local backups, and future heavy background workers

This setup does not require Firebase or Supabase. The production source of truth is standard PostgreSQL on Render.

## Before deployment

1. Confirm `.env`, `client/.env`, and `server/.env` are not tracked:

   ```powershell
   git ls-files | Select-String "(^|/)\.env$"
   ```

   The command should return nothing. Example files are safe to commit.

2. Commit the deployment files:

   ```powershell
   git add render.yaml netlify.toml client server docs
   git commit -m "Prepare Render API and Netlify web deployment"
   git push
   ```

## Deploy the API and PostgreSQL on Render

1. In Render, choose **New > Blueprint**.
2. Connect the Candle Love GitHub repository.
3. Use the repository-root `render.yaml` Blueprint.
4. During creation, enter `CORS_ALLOWED_ORIGINS` temporarily as:

   ```text
   http://localhost:8081,http://localhost:19006,http://localhost:3000
   ```

5. Deploy the Blueprint.
6. Wait for the database, pre-deploy migration, and API deployment to complete.
7. Open:

   ```text
   https://YOUR-RENDER-SERVICE.onrender.com/api/ready
   ```

   Expected response:

   ```json
   {"status":"ready","database":"connected"}
   ```

The Blueprint uses a paid web service, a paid Render Postgres instance, and a persistent disk so uploaded photos and voice recordings survive restarts and redeployments.

## Deploy the Expo web frontend on Netlify

1. In Netlify, choose **Add new project > Import an existing project**.
2. Connect the same GitHub repository.
3. Netlify reads `netlify.toml` automatically. Confirm:

   ```text
   Base directory: client
   Build command: npm ci --no-audit --no-fund && npm run build:web
   Publish directory: client/dist (shown as dist when base is client)
   ```

4. Add the variables from `client/.env.netlify.example` under **Project configuration > Environment variables**.
5. Replace the placeholders with the real Render and Netlify URLs.
6. Deploy the site.

## Connect Netlify to Render CORS

After Netlify gives you the final site name, update Render's `CORS_ALLOWED_ORIGINS` value.

For a Netlify site named `candle-love-web`, use:

```text
https://candle-love-web.netlify.app,https://*--candle-love-web.netlify.app,http://localhost:8081,http://localhost:19006,http://localhost:3000
```

The first origin is production. The wildcard is limited to preview and branch deployments for that same Netlify site.

Save the Render environment change and redeploy the API.

## Final tests

Run these in PowerShell, replacing the URLs:

```powershell
Invoke-RestMethod https://YOUR-RENDER-SERVICE.onrender.com/api/health
Invoke-RestMethod https://YOUR-RENDER-SERVICE.onrender.com/api/ready
```

Then open the Netlify site and test:

- registration
- login and refresh session
- uploading at least two profile photos
- reordering photos
- matching and messaging
- Voice Candle upload
- browser refresh on a nested route

## Optional: move existing local Docker users to Render

Do this before public launch and while nobody is modifying either database.

Create a custom-format backup inside the existing Postgres container:

```powershell
docker exec candle-love-postgres pg_dump `
  -U candle_app `
  -d candle_love `
  -Fc `
  -f /tmp/candle_love.dump

docker cp `
  candle-love-postgres:/tmp/candle_love.dump `
  .\backups\candle_love_render.dump
```

In Render, temporarily add your current public IP to the database inbound rules and copy the **External Database URL**. Put it only into the current PowerShell session:

```powershell
$env:RENDER_DATABASE_EXTERNAL_URL = "PASTE_EXTERNAL_DATABASE_URL_HERE"
```

Restore using a temporary Postgres container:

```powershell
docker run --rm `
  -e DATABASE_URL="$env:RENDER_DATABASE_EXTERNAL_URL" `
  -v "$($PWD.Path)\backups:/backups:ro" `
  postgres:17-alpine `
  sh -c 'pg_restore --clean --if-exists --no-owner --no-privileges --dbname "$DATABASE_URL" /backups/candle_love_render.dump'
```

Remove your public IP from the Render database inbound rules after the restore.

Existing photo files must also be copied from the Docker `candle-love-uploads` volume to the Render persistent disk while preserving the `profile/...` and `voice/...` directory structure. Database rows use relative `/uploads/...` paths, so those files work after a structure-preserving copy.

## Keep local Docker working

No local Docker values need to change. Continue using:

```text
EXPO_PUBLIC_API_URL=http://localhost:5000
```

for local development. Netlify receives the production Render URL only at build time through its own environment variables.
