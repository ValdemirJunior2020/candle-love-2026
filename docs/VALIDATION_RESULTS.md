# Validation results

Validation date: July 18, 2026

## Expo client

- `npm install`: passed
- `npm audit`: passed with 0 known vulnerabilities after a compatible `uuid` override for Expo build tooling
- `npx tsc --noEmit`: passed
- `npx expo lint`: passed with 0 errors and 0 warnings
- `npx expo config --type public`: passed
- Expo SDK package-version validation: passed
- Required peer dependencies: passed
- Duplicate native dependencies: passed
- Web development page: served successfully
- Web JavaScript bundle: compiled and downloaded successfully, 5,065,185 bytes
- iOS icon: 1024×1024, RGB, no alpha channel

`npx expo-doctor --verbose` completed 18 of 20 checks. Every local project, dependency, SDK, peer, Metro, native-module, lockfile, and app-store version check passed. The two remaining checks require Expo-hosted services. The build container could not resolve `exp.host`, and the React Native Directory request returned a remote-service error. Rerun the same command on a normal internet connection before the EAS build.

## Server

- `npm install`: passed
- `npm audit`: passed with 0 known vulnerabilities
- `npm run lint`: passed
- `npm run test`: passed, 5 moderation tests
- `npm run typecheck`: passed
- `npm run build`: passed
- `npm run start`: passed
- `GET /api/health`: returned `{"status":"ok","service":"api","environment":"development"}`
- `server/render.yaml`: valid YAML

## External configuration still required

A source-code validation cannot create the user's Expo account, EAS project ID, Apple App Store Connect app, Apple signing credentials, RevenueCat products, Stripe account, Render database, Render service, public legal pages, or production domain. The project includes exact placeholders and setup steps for those external services.

## Docker home-hosting conversion — 2026-07-18

- Server `npm ci`: passed; zero reported vulnerabilities.
- Server TypeScript (`npm run typecheck`): passed.
- Server moderation tests: 5/5 passed.
- Server production build (`npm run build`): passed.
- Client `npm ci`: passed; zero reported vulnerabilities.
- Client TypeScript (`npm run typecheck`): passed.
- Client Expo lint: passed.
- `docker-compose.yml`: parsed successfully and contains isolated PostgreSQL, migration, API, backup, and optional Cloudflare Tunnel services.
- Docker image startup was not executed in the build environment because Docker Engine is not installed there. Run `docker compose up -d --build` on the target Windows computer to perform the final container runtime check.
- Expo Doctor: 18/20 checks passed. The two remote metadata checks could not reach Expo services (`exp.host` and React Native Directory) from the build environment. No local dependency or TypeScript failure was reported.

## Multi-photo profile update validation

Validated after adding the profile-photo gallery:

- Server TypeScript: passed
- Server ESLint: passed
- Server production build: passed
- Server moderation tests: 5/5 passed
- Client TypeScript: passed
- Client Expo lint: passed
- Expo web production export: passed
- Expo public config generation: passed
- Docker Compose YAML parse: passed
- Expo Doctor: 18/20; the two remote metadata checks could not run because `exp.host` and React Native Directory were unreachable from the validation environment

Docker Engine was not available in the validation environment, so the final container runtime and multipart upload flow must be exercised on the Windows Docker Desktop host.
