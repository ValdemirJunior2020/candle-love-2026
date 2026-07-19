export type PurchasePack = { id: string; title: string; description: string; price: string; tokens: number };
export async function configurePurchases(_userId: string): Promise<void> {}
export async function getPurchasePacks(): Promise<PurchasePack[]> { return []; }
export async function buyPack(_id: string): Promise<void> { throw new Error('Native in-app purchases require an EAS development build.'); }
