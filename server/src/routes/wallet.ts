import type { FastifyPluginAsync } from 'fastify';
import Stripe from 'stripe';
import { z } from 'zod';
import { allowedOrigins, config } from '../config.js';
import { sql } from '../db.js';
import { authenticate } from '../services/auth.js';
import { changeBalance } from '../services/tokens.js';

const packs = { glow: { name: 'Glow Pack', tokens: 50, cents: 499 }, flame: { name: 'Flame Pack', tokens: 140, cents: 999 }, bonfire: { name: 'Bonfire Pack', tokens: 320, cents: 1999 } } as const;
const productTokens = new Map([[config.SPARK_PACK_50_PRODUCT_ID, 50], [config.SPARK_PACK_140_PRODUCT_ID, 140], [config.SPARK_PACK_320_PRODUCT_ID, 320]]);
function allowedReturnUrl(value: string): boolean { try { const url = new URL(value); return ['http:', 'https:'].includes(url.protocol) && allowedOrigins.includes(url.origin); } catch { return false; } }

export const walletRoutes: FastifyPluginAsync = async (app) => {
  app.get('/', { preHandler: authenticate }, async (request) => { const [wallet] = await sql`SELECT balance, updated_at FROM wallets WHERE user_id = ${request.authUser!.id}`; const ledger = await sql`SELECT amount, reason, reference_id, created_at FROM wallet_ledger WHERE user_id = ${request.authUser!.id} ORDER BY created_at DESC LIMIT 30`; return { wallet, ledger, packs }; });
  app.get('/gifts', { preHandler: authenticate }, async () => ({ gifts: await sql`SELECT id, slug, name, cost, image_path FROM gifts WHERE active = TRUE ORDER BY cost` }));
  app.post('/checkout', { preHandler: authenticate }, async (request, reply) => {
    const parsed = z.object({ packId: z.enum(['glow', 'flame', 'bonfire']), returnUrl: z.string().url() }).safeParse(request.body);
    if (!parsed.success || !allowedReturnUrl(parsed.data.returnUrl)) return reply.code(400).send({ error: 'INVALID_CHECKOUT_REQUEST' });
    if (!config.STRIPE_SECRET_KEY) return reply.code(503).send({ error: 'STRIPE_NOT_CONFIGURED' });
    const stripe = new Stripe(config.STRIPE_SECRET_KEY); const pack = packs[parsed.data.packId];
    const session = await stripe.checkout.sessions.create({ mode: 'payment', line_items: [{ quantity: 1, price_data: { currency: 'usd', unit_amount: pack.cents, product_data: { name: `${pack.name} — ${pack.tokens} Sparks` } } }], success_url: `${parsed.data.returnUrl}?purchase=success`, cancel_url: `${parsed.data.returnUrl}?purchase=cancelled`, metadata: { userId: request.authUser!.id, tokens: String(pack.tokens), packId: parsed.data.packId } });
    return { url: session.url };
  });
  app.post('/stripe-webhook', { config: { rawBody: true } }, async (request, reply) => {
    if (!config.STRIPE_SECRET_KEY || !config.STRIPE_WEBHOOK_SECRET) return reply.code(503).send({ error: 'STRIPE_NOT_CONFIGURED' });
    const signature = request.headers['stripe-signature']; if (typeof signature !== 'string' || !request.rawBody) return reply.code(400).send({ error: 'INVALID_SIGNATURE' });
    const stripe = new Stripe(config.STRIPE_SECRET_KEY); let event: Stripe.Event;
    try { event = stripe.webhooks.constructEvent(request.rawBody, signature, config.STRIPE_WEBHOOK_SECRET); } catch { return reply.code(400).send({ error: 'INVALID_SIGNATURE' }); }
    if (event.type === 'checkout.session.completed') { const session = event.data.object; const userId = session.metadata?.userId; const tokens = Number(session.metadata?.tokens ?? 0); if (userId && Number.isInteger(tokens) && tokens > 0) await sql.begin((tx) => changeBalance(tx, userId, tokens, 'stripe_purchase', session.id, event.id)); }
    return { received: true };
  });
  app.post('/revenuecat-webhook', async (request, reply) => {
    if (!config.REVENUECAT_WEBHOOK_SECRET) return reply.code(503).send({ error: 'REVENUECAT_NOT_CONFIGURED' });
    if (request.headers.authorization !== `Bearer ${config.REVENUECAT_WEBHOOK_SECRET}`) return reply.code(401).send({ error: 'INVALID_SIGNATURE' });
    const parsed = z.object({ event: z.object({ id: z.string(), type: z.string(), app_user_id: z.string().uuid(), product_id: z.string() }) }).safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: 'INVALID_EVENT' });
    const { event } = parsed.data;
    if (!['INITIAL_PURCHASE', 'NON_RENEWING_PURCHASE'].includes(event.type)) return { received: true, ignored: true };
    const tokens = productTokens.get(event.product_id); if (!tokens) return reply.code(400).send({ error: 'UNKNOWN_PRODUCT' });
    await sql.begin((tx) => changeBalance(tx, event.app_user_id, tokens, 'app_store_purchase', event.product_id, `revenuecat_${event.id}`));
    return { received: true };
  });
};
