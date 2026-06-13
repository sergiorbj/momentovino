import type { ExpoConfig } from 'expo/config'

const googleIosUrlScheme = process.env.EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME

const googleSignInPlugin: [string, Record<string, string>] | null = googleIosUrlScheme
  ? ['@react-native-google-signin/google-signin', { iosUrlScheme: googleIosUrlScheme }]
  : null

const config: ExpoConfig = {
  name: 'MomentoVino',
  slug: 'momentovino',
  owner: 'sergiobernardidev',
  version: '1.0.2',
  orientation: 'portrait',
  extra: {
    eas: {
      projectId: '728f1f3e-4bd0-48aa-b647-cdb1c871c2ba',
    },
  },
  icon: './assets/icon.png',
  userInterfaceStyle: 'light',
  splash: {
    image: './assets/splash.png',
    resizeMode: 'contain',
    backgroundColor: '#F5EBE0',
  },
  assetBundlePatterns: ['**/*'],
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.momentovino.app',
    usesAppleSignIn: true,
    buildNumber: '41',
    config: { usesNonExemptEncryption: false },
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#ffffff',
    },
    package: 'com.momentovino.app',
  },
  web: {
    favicon: './assets/favicon.png',
  },
  plugins: [
    'expo-router',
    'expo-font',
    'expo-localization',
    'expo-apple-authentication',
    'expo-notifications',
    '@react-native-community/datetimepicker',
    [
      'expo-image-picker',
      {
        photosPermission:
          'MomentoVino uses your photo library so you can choose existing wine label photos when scanning a bottle, add pictures to your tasting moments, set your profile photo, and pick a family cover image.',
      },
    ],
    [
      'expo-camera',
      {
        cameraPermission:
          'MomentoVino uses the camera so you can scan the label on a wine bottle. The app reads the label to identify the wine and add it to your collection.',
        recordAudioAndroid: false,
      },
    ],
    [
      'expo-location',
      {
        locationWhenInUsePermission:
          'Allow MomentoVino to use your location to tag where you tasted this wine.',
        isIosBackgroundLocationEnabled: false,
        isAndroidBackgroundLocationEnabled: false,
      },
    ],
    ...(googleSignInPlugin ? [googleSignInPlugin] : []),
  ],
  scheme: 'momentovino',
}

export default config
