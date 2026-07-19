export async function changeBalance(
  tx: any,
  userId: string,
  amount: number,
  reason: string,
  referenceId?: string,
  idempotencyKey?: string
): Promise<number> {
  if (amount < 0) {
    const [wallet] = await tx<{ balance: number }[]>`
      SELECT balance FROM wallets WHERE user_id = ${userId} FOR UPDATE
    `;
    if (!wallet || wallet.balance + amount < 0) throw new Error("INSUFFICIENT_SPARKS");
  }

  if (idempotencyKey) {
    const [existing] = await tx<{ id: string }[]>`
      SELECT id FROM wallet_ledger WHERE idempotency_key = ${idempotencyKey}
    `;
    if (existing) {
      const [wallet] = await tx<{ balance: number }[]>`SELECT balance FROM wallets WHERE user_id = ${userId}`;
      return wallet?.balance ?? 0;
    }
  }

  const [updated] = await tx<{ balance: number }[]>`
    UPDATE wallets SET balance = balance + ${amount}, updated_at = NOW()
    WHERE user_id = ${userId}
    RETURNING balance
  `;
  if (!updated) throw new Error("WALLET_NOT_FOUND");

  await tx`
    INSERT INTO wallet_ledger (user_id, amount, reason, reference_id, idempotency_key)
    VALUES (${userId}, ${amount}, ${reason}, ${referenceId ?? null}, ${idempotencyKey ?? null})
  `;
  return updated.balance;
}
