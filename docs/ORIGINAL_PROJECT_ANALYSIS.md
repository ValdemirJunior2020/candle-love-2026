# Project audit and conversion record

## Original state

The starting project was a mobile-first Next.js application with a separate Fastify/PostgreSQL API. The interface already had Candle Love branding, daily discovery, matches, messages, a Spark wallet, profile settings, safety pages, gifts, and a one-time chat-unlock model. The backend already contained password hashing, JWT sessions, database migrations, message moderation, block/report routes, Socket.IO, Stripe checkout, and account deletion.

## Reused backend logic

The PostgreSQL schema, discovery and matching rules, six-message chat allowance, 15-Spark permanent chat unlock, Super Spark cost, gift catalog, wallet ledger, moderation rules, block/report records, account deletion, seed data, and Socket.IO server were retained.

The API was updated for native apps. Authentication now accepts bearer tokens as well as browser cookies. Login and registration return access and refresh tokens. Refresh tokens rotate and are stored as hashes. Native logout sends the refresh token so the server can revoke it.

The wallet now supports Stripe Checkout for web and a signed RevenueCat webhook for Apple/Google consumable purchases. Render configuration, production CORS, liveness/readiness routes, production environment validation, and secure error handling were added.

## Replaced frontend technology

The Next.js frontend was removed. It depended on HTML, CSS, Next routing, Next Image, and browser cookie behavior that do not map directly to iOS.

The replacement uses Expo SDK 57, React Native, Expo Router, React Native Web, TypeScript, platform-aware secure storage, `expo-image`, `StyleSheet`, bearer-token API calls, and a development-build-compatible RevenueCat client.

## React Native screens

- Sign in and 18+ registration
- Daily discovery with Pass, Ignite the Spark, and Super Spark
- Matches and message inbox
- Real-time conversation screen
- Six free messages and Light the Candle unlock
- Paid Spark Gift selector
- Spark wallet and platform-specific purchases
- Profile summary and profile editing
- Safety center with direct report/block context
- Privacy, terms, support, sign out, and account deletion
- Loading, empty, error, locked-chat, and disabled-payment states

## Assets

A new opaque 1024×1024 iOS icon was created from the Candle Love candle-heart concept. Android adaptive foreground, splash image, web favicon, five gift assets, and the profile image are present and referenced by the Expo configuration.

## Validation performed

- Client TypeScript: passed
- Client ESLint/Expo lint: passed
- Expo public config generation: passed
- Expo SDK dependency-version check: passed
- Expo web HTML and JavaScript bundle: served successfully in the browser test
- Server ESLint: passed
- Server moderation tests: 5 passed
- Server TypeScript: passed
- Server production build: passed
- Server start and `/api/health`: passed

The latest Expo Doctor completed all local checks. Two remote-only checks could not finish in the build container because DNS could not resolve `exp.host` and the React Native Directory service. Rerun `npx expo-doctor` on a normal internet connection; no local package or configuration mismatch remained after the fixes.
