# Candle Love — Expo app with Docker backend

The default local and home-hosted setup now runs PostgreSQL, migrations, the API server, and scheduled backups through Docker Compose. The Expo client remains outside Docker so it can run normally in Expo Web, Expo Go, or an EAS development build.

## Start the complete backend on Windows

```powershell
npm.cmd run docker:up
npm.cmd run docker:seed
```

Then start the Expo client:

```powershell
cd client
npx expo start --web
```

API checks:

```text
http://localhost:5000/api/health
http://localhost:5000/api/ready
```

The database is stored in the persistent Docker volume `candle-love-postgres-data`. PostgreSQL is bound only to `127.0.0.1:5432`; the mobile app talks only to the API on port 5000. Daily compressed backups are written to `backups/`.

For iPhone LAN testing, public HTTPS hosting, Cloudflare Tunnel setup, backups, restore steps, and restart behavior, read [`docs/DOCKER_HOME_HOSTING.md`](docs/DOCKER_HOME_HOSTING.md).

---

# Candle Love — Expo iOS, Android, Web, and Render API

Candle Love is a mobile-first dating app built around intentional daily introductions, respectful conversation, safety tools, and a fair Spark token system. The project is split into an Expo React Native client and a Fastify API so each side can be deployed independently.

## Technology

The client uses Expo SDK 57, React 19.2, React Native 0.86, Expo Router, TypeScript, RevenueCat for native in-app purchases, Stripe Checkout for web purchases, and Socket.IO for real-time messages.

The server uses Node.js 22+, Fastify 5, PostgreSQL, Socket.IO, JWT access tokens, rotating refresh sessions, Stripe webhooks, RevenueCat webhooks, Zod validation, rate limits, and server-side message moderation.

React 22 does not exist. This project uses the stable React version bundled with Expo SDK 57.

## Folder structure

```text
Candle-Love-v2/
├── client/
│   ├── app/                     Expo Router screens and routes
│   ├── assets/                  Icon, splash, favicon, gifts, profile image
│   ├── components/              Reusable React Native UI
│   ├── constants/               Theme colors and spacing
│   ├── context/                 Authentication state
│   ├── services/                API, storage, purchases, sockets, demo data
│   ├── types/                   Shared client models
│   ├── app.config.ts            Expo and Apple/Android configuration
│   ├── eas.json                 Development, preview, production builds
│   ├── package.json
│   └── .env.example
├── server/
│   ├── migrations/              PostgreSQL schema
│   ├── src/routes/              Auth, discovery, chat, wallet, safety, profile
│   ├── src/services/            Auth, moderation, password, wallet logic
│   ├── render.yaml              Render Blueprint
│   ├── package.json
│   └── .env.example
├── docs/
├── docker-compose.yml
├── package.json
└── README.md
```

## What was converted

The old Next.js frontend was replaced with React Native components. HTML elements, browser CSS, Next.js routing, Next Image, and browser-only session assumptions were removed. The new interface uses `View`, `Text`, `Pressable`, `TextInput`, `FlatList`, `ScrollView`, `expo-image`, `StyleSheet`, Expo Router, and platform-aware secure token storage.

The existing backend business rules were kept and expanded. Native clients now authenticate with bearer access tokens and rotating refresh tokens, while secure cookies remain available for browser clients. The API still supports daily discovery, mutual matches, chat limits, permanent chat unlocks, gifts, wallet history, reporting, blocking, account deletion, and moderated messages.

## Windows setup

Install Node.js 22 or newer, Git, and Docker Desktop. PowerShell may block `npm.ps1`. Use `npm.cmd` instead of `npm`, or enable signed local scripts with:

```powershell
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
```

Open PowerShell in the project root and run:

```powershell
npm.cmd install
Copy-Item client\.env.example client\.env -Force
Copy-Item server\.env.example server\.env -Force
```

The root `postinstall` installs both the client and server dependencies. You can also run:

```powershell
npm.cmd run setup
```

## Local database and server

Start PostgreSQL:

```powershell
docker compose up -d
```

Run the database migration and seed data from the project root:

```powershell
npm.cmd run db:migrate
npm.cmd run db:seed
```

Start only the API:

```powershell
npm.cmd --prefix server run dev
```

API URLs:

```text
Liveness:  http://localhost:5000/api/health
Readiness: http://localhost:5000/api/ready
```

The liveness route confirms the process is running. The readiness route also checks PostgreSQL.

## Test in a Windows browser

The included `client/.env` starts in demo mode, so the UI works before PostgreSQL is configured.

```powershell
cd client
npx expo start --web
```

Open the URL shown by Expo, normally `http://localhost:8081`.

To use the real server, update `client/.env`:

```env
EXPO_PUBLIC_DEMO_MODE=false
EXPO_PUBLIC_API_URL=http://localhost:5000
```

Then restart Expo with a clean cache:

```powershell
npx expo start --web --clear
```

## Test on a physical iPhone

`localhost` on an iPhone means the iPhone itself. For local API testing, find the Windows computer's IPv4 address with `ipconfig`, then use it in `client/.env`:

```env
EXPO_PUBLIC_DEMO_MODE=false
EXPO_PUBLIC_API_URL=http://192.168.1.100:5000
```

Allow Node.js through Windows Firewall and keep the iPhone and computer on the same Wi-Fi network.

Most screens can be tested through Expo Go. RevenueCat native purchases require an Expo development build because Expo Go cannot include custom native purchase code.

Create the development build from Windows using EAS cloud builds:

```powershell
cd client
npx eas-cli login
npx eas-cli build:configure
npx eas-cli build --platform ios --profile development
```

Install the returned iOS build on the registered device, then run:

```powershell
npx expo start --dev-client
```

## Environment variables

`client/.env.example` contains every public value used by the app. Values beginning with `EXPO_PUBLIC_` are bundled into the app and must never contain private secrets.

`server/.env.example` contains the API, database, JWT, Stripe, RevenueCat, rate-limit, CORS, and product variables. Keep all private values in Render or local `.env` files. The server refuses unsafe placeholder configuration in production.

For a production Expo build, set:

```env
EXPO_PUBLIC_DEMO_MODE=false
EXPO_PUBLIC_API_URL=https://YOUR-RENDER-SERVICE.onrender.com
EXPO_PUBLIC_EXPO_OWNER=YOUR_EXPO_USERNAME
EXPO_PUBLIC_EAS_PROJECT_ID=YOUR_EAS_PROJECT_UUID
EXPO_PUBLIC_IOS_BUNDLE_IDENTIFIER=com.yourcompany.candlelove
EXPO_PUBLIC_ANDROID_PACKAGE=com.yourcompany.candlelove
EXPO_PUBLIC_ENABLE_PAYMENTS=true
EXPO_PUBLIC_REVENUECAT_IOS_API_KEY=appl_YOUR_PUBLIC_KEY
EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY=goog_YOUR_PUBLIC_KEY
```

## Spark purchases

Web purchases use Stripe Checkout and the signed Stripe webhook. iOS and Android purchases use RevenueCat, which receives Apple/Google purchases and calls the signed RevenueCat webhook on the API.

Create these consumable products in App Store Connect, Google Play, and RevenueCat:

```text
candle_sparks_50
candle_sparks_140
candle_sparks_320
```

Configure RevenueCat's webhook URL as:

```text
https://YOUR-RENDER-SERVICE.onrender.com/api/wallet/revenuecat-webhook
```

Set its authorization header to `Bearer YOUR_REVENUECAT_WEBHOOK_SECRET`, then put the same secret in Render. The server credits wallet transactions idempotently so a repeated webhook cannot duplicate Sparks.

Do not replace native in-app purchases with Stripe inside the iOS app. Sparks are digital goods and should use Apple's purchase system.

## Render deployment

Push the project to GitHub:

```powershell
git init
git add .
git commit -m "Build Candle Love Expo app"
git branch -M main
git remote add origin YOUR_GITHUB_REPOSITORY_URL
git push -u origin main
```

In Render:

1. Create a PostgreSQL database and copy its internal database URL.
2. Create a new Web Service from the GitHub repository, or apply `server/render.yaml` as a Blueprint.
3. Set the root directory to `server`.
4. Set the build command to `npm ci && npm run build`.
5. Set the start command to `npm run start`.
6. Set the health-check path to `/api/health`.
7. Add the variables from `server/.env.example`. Use the Render PostgreSQL URL for `DATABASE_URL`, set `DATABASE_SSL=true`, and use an HTTPS `SERVER_URL`.
8. Set `CORS_ALLOWED_ORIGINS` to the exact production web origins. Native apps commonly send no browser origin and are supported separately.
9. Deploy and watch the Logs page for startup or migration errors.

Run migrations against the Render database before opening the production app. One option is a one-time Render Shell command:

```bash
npm run db:migrate
npm run db:seed
```

Test the deployment:

```text
https://YOUR-RENDER-SERVICE.onrender.com/api/health
https://YOUR-RENDER-SERVICE.onrender.com/api/ready
```

After the deployed health and readiness checks succeed, put the Render URL in `client/.env` as `EXPO_PUBLIC_API_URL`, restart Expo, and test login, discovery, messaging, wallet, report, block, and account deletion.

Render redeploys automatically after pushes when `autoDeploy` is enabled. A manual deploy is available from the service's Manual Deploy menu.

## Validation commands

Client:

```powershell
cd client
npm.cmd install
npx tsc --noEmit
npx expo-doctor
npx expo config --type public
npx expo start --web
```

Server:

```powershell
cd server
npm.cmd install
npm.cmd run lint
npm.cmd run test
npm.cmd run typecheck
npm.cmd run build
npm.cmd run start
```

## EAS preview and production builds

First connect the local Expo project to your Expo account:

```powershell
cd client
npx eas-cli login
npx eas-cli build:configure
```

Add the generated owner and project ID to `client/.env`. Store production variables through EAS environment variables or the Expo dashboard rather than committing them.

Preview build for registered iPhones:

```powershell
npx eas-cli build --platform ios --profile preview
```

Production App Store build:

```powershell
npx eas-cli build --platform ios --profile production
```

Submit the newest production build:

```powershell
npx eas-cli submit --platform ios --profile production
```

Replace `YOUR_APP_STORE_CONNECT_APP_ID` in `client/eas.json` before submitting. An active Apple Developer membership and accepted Apple agreements are required.

## App Store preparation

Before submission, replace the example website links and support email. Publish a privacy policy, terms, safety policy, and support page. Configure the RevenueCat products, test purchases in Apple's sandbox, and confirm the report/block flow with a second test account.

Candle Love already includes 18+ registration, message filtering, report and block endpoints, account deletion, visible support links, and zero-tolerance rules. A real launch should also add human moderation operations, email verification, identity/age verification, secure photo upload, image moderation, report response targets, backups, monitoring, and a user appeal process.

The app does not request microphone, camera, location, contacts, tracking, Bluetooth, calendar, or notification permissions. Add a permission only when a real feature needs it, then add the matching Apple usage description.

## Troubleshooting

**PowerShell blocks npm:** use `npm.cmd` or change the current-user execution policy.

**The browser opens but API calls fail:** confirm the server is on port 5000, `EXPO_PUBLIC_DEMO_MODE=false`, and `EXPO_PUBLIC_API_URL` is correct. Restart Expo after changing `.env`.

**The iPhone cannot reach the API:** use the Windows LAN IP instead of localhost, allow port 5000 through the firewall, and keep both devices on the same network.

**`expo-doctor` reports an online-check error:** confirm internet access and rerun. Expo's config schema and React Native Directory checks call remote services.

**RevenueCat says the native module is missing:** use an EAS development build, not Expo Go.

**Render cannot connect to PostgreSQL:** verify `DATABASE_URL`, set `DATABASE_SSL=true`, run migrations, and check `/api/ready`.

**The build profile mentions update channels:** `expo-updates` is installed and configured. After `eas build:configure`, make sure the EAS project ID is present in `client/.env`.

## Multi-photo profiles

Profile galleries now support 2 required, 4 recommended, and 6 maximum photos. Uploaded files live in the persistent `candle-love-uploads` Docker volume while PostgreSQL stores ordering and metadata. See `docs/MULTI_PHOTO_PROFILES.md` for startup, migration, backup, and restore instructions.
#   c a n d l e - l o v e - 2 0 2 6  
 