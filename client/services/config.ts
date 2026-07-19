export const appConfig = {
  appName: process.env.EXPO_PUBLIC_APP_NAME || 'Candle Love',
  apiUrl: (process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000').replace(/\/$/, ''),
  apiTimeout: Number(process.env.EXPO_PUBLIC_API_TIMEOUT || 15000),
  demoMode: process.env.EXPO_PUBLIC_DEMO_MODE !== 'false',
  enablePayments: process.env.EXPO_PUBLIC_ENABLE_PAYMENTS === 'true',
  privacyUrl: process.env.EXPO_PUBLIC_PRIVACY_POLICY_URL || 'https://example.com/privacy',
  termsUrl: process.env.EXPO_PUBLIC_TERMS_URL || 'https://example.com/terms',
  supportUrl: process.env.EXPO_PUBLIC_SUPPORT_URL || 'https://example.com/support',
  supportEmail: process.env.EXPO_PUBLIC_SUPPORT_EMAIL || 'support@example.com',
  revenueCatIosKey: process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY || '',
  revenueCatAndroidKey: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY || ''
};
