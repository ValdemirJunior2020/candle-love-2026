# Candle Love product, token, and safety plan

## A different dating model

Candle Love limits the daily discovery set instead of creating endless swiping. Each profile includes a specific prompt, and mutual matches open with something meaningful to discuss.

The product can stand out with **Candle Layers**: values and written answers first, interests second, and extra photos after both people agree to reveal the next layer. Other strong ideas are a guided seven-minute text date, quiet and respectful match exits, scheduled date safety check-ins, and a Trust Shield based on verification and safe behavior rather than popularity.

## Fair Spark economy

New users receive 25 Sparks. A mutual match receives six free messages. Either person can spend 15 Sparks once to Light the Candle, permanently unlocking ordinary chat for both people. Normal unlocked messages do not cost tokens.

Super Sparks cost 5. Spark Gifts cost 5–18. Tokens cannot improve report priority, avoid moderation, purchase verification, or prevent another person from blocking the sender. Avoid random loot boxes, expiring balances, confusing exchange rates, or manipulative pay-per-message pressure.

Web purchases use Stripe. iOS and Android digital-token purchases use store in-app purchases through RevenueCat. The server credits tokens only after signed provider webhooks and records every balance change in an idempotent ledger.

## Safety controls in the code

- Adults-only birth-date check
- Password hashing and rate-limited login
- Short-lived access tokens and rotating refresh sessions
- Server-side profanity, threat, scam, payment-request, contact-sharing, and spam filters
- Immediate user blocking
- Private report records and categories
- New-account restrictions on contact information
- Account deletion and session revocation
- Exact production CORS origins
- Safe public errors without secret leakage

## Launch operations still required

Code alone cannot run a safe dating community. Before a public launch, add trained human moderation, clear response targets, identity and age verification, verified email, secure photo upload, nudity/violence/impersonation image checks, incident escalation, backups, monitoring, audit logs, support staffing, and an appeal process.

Publish a zero-tolerance user agreement, privacy policy, terms, safety center, and support contact. Test reporting and blocking with real accounts. Review all token wording and dating-app policies with qualified legal counsel before release.
