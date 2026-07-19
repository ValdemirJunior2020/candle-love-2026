# Security policy

Do not commit `.env` files, database URLs, JWT secrets, Stripe secrets, RevenueCat webhook secrets, Apple credentials, or service-account files.

Report a security issue privately to the support email configured for the production app. Do not post exploit details publicly before a fix is available.

Production requirements include HTTPS, a managed PostgreSQL database, strong generated secrets, exact CORS origins, database backups, provider webhook verification, dependency updates, security monitoring, human moderation, and a documented incident-response process.

Access tokens are short lived. Refresh tokens are random, stored as hashes, rotated after use, and revoked during logout or account deletion. Passwords use Node's `scrypt` with a random salt. Wallet changes are transactional and recorded in an idempotent ledger.
