import { Platform } from 'react-native';
import Purchases, { LOG_LEVEL, type PurchasesPackage } from 'react-native-purchases';
import { appConfig } from './config';
import type { PurchasePack } from './purchases';
let packages = new Map<string, PurchasesPackage>();
let configuredFor = '';
export async function configurePurchases(userId: string) { if (configuredFor === userId) return; const apiKey = Platform.OS === 'ios' ? appConfig.revenueCatIosKey : appConfig.revenueCatAndroidKey; if (!apiKey) throw new Error('RevenueCat public API key is not configured.'); Purchases.setLogLevel(__DEV__ ? LOG_LEVEL.DEBUG : LOG_LEVEL.ERROR); Purchases.configure({ apiKey, appUserID: userId }); configuredFor = userId; }
export async function getPurchasePacks(): Promise<PurchasePack[]> { const offerings = await Purchases.getOfferings(); const available = offerings.current?.availablePackages ?? []; packages = new Map(available.map(item => [item.identifier, item])); return available.map(item => ({ id: item.identifier, title: item.product.title, description: item.product.description, price: item.product.priceString, tokens: Number(item.product.identifier.match(/(50|140|320)/)?.[1] ?? 0) })); }
export async function buyPack(id: string): Promise<void> { const item = packages.get(id); if (!item) throw new Error('That Spark pack is unavailable.'); await Purchases.purchasePackage(item); }
