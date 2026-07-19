import type { ConfigContext, ExpoConfig } from 'expo/config';

const appName = process.env.EXPO_PUBLIC_APP_NAME?.trim() || 'Candle Love';
const rawOwner = process.env.EXPO_PUBLIC_EXPO_OWNER?.trim();
const rawProjectId = process.env.EXPO_PUBLIC_EAS_PROJECT_ID?.trim();
const owner = rawOwner && !rawOwner.startsWith('YOUR_') ? rawOwner : undefined;
const projectId =
  rawProjectId && /^[0-9a-f-]{36}$/i.test(rawProjectId)
    ? rawProjectId
    : undefined;
const iosBundleIdentifier =
  process.env.EXPO_PUBLIC_IOS_BUNDLE_IDENTIFIER?.trim() ||
  'com.candlelove.app';
const androidPackage =
  process.env.EXPO_PUBLIC_ANDROID_PACKAGE?.trim() || 'com.candlelove.app';
const appVersion = process.env.EXPO_PUBLIC_APP_VERSION?.trim() || '1.0.0';

const brandBackground = '#120A06';
const logoPath = './assets/images/logo.png';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: appName,
  slug: 'candle-love',
  version: appVersion,
  orientation: 'portrait',
  icon: logoPath,
  scheme: 'candlelove',
  userInterfaceStyle: 'dark',
  platforms: ['ios', 'android', 'web'],
  ...(owner ? { owner } : {}),
  runtimeVersion: { policy: 'appVersion' },
  ...(projectId
    ? { updates: { url: `https://u.expo.dev/${projectId}` } }
    : {}),
  ios: {
    supportsTablet: true,
    bundleIdentifier: iosBundleIdentifier,
    buildNumber: '1',
    deploymentTarget: '16.4',
    icon: logoPath,
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
    },
  },
  android: {
    package: androidPackage,
    versionCode: 1,
    adaptiveIcon: {
      foregroundImage: logoPath,
      backgroundColor: brandBackground,
    },
    permissions: [],
  },
  web: {
    bundler: 'metro',
    output: 'single',
    favicon: logoPath,
  },
  plugins: [
    'expo-router',
    'expo-secure-store',
    ['expo-audio', { microphonePermission: 'Allow Candle Love to record your 20-second Voice Candle.', enableBackgroundRecording: false, enableBackgroundPlayback: false }],
    [
      'expo-image-picker',
      {
        photosPermission:
          'Candle Love uses your selected photos to build your dating profile.',
        cameraPermission:
          'Candle Love uses the camera when you choose to take a profile photo.',
        microphonePermission: false,
      },
    ],
    [
      'expo-splash-screen',
      {
        backgroundColor: brandBackground,
        image: logoPath,
        imageWidth: 260,
        resizeMode: 'contain',
        dark: {
          backgroundColor: brandBackground,
          image: logoPath,
        },
      },
    ],
  ],
  experiments: { typedRoutes: true },
  extra: {
    ...(projectId ? { eas: { projectId } } : {}),
    appEnv: process.env.EXPO_PUBLIC_APP_ENV?.trim() || 'development',
  },
});
