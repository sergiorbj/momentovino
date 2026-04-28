import type { ExpoConfig } from 'expo/config'

const googleIosUrlScheme = process.env.EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME

const googleSignInPlugin = googleIosUrlScheme
  ? (['@react-native-google-signin/google-signin', { iosUrlScheme: googleIosUrlScheme }] as const)
  : null

const config: ExpoConfig = {
  name: 'MomentoVino',
  slug: 'momentovino',
  owner: 'sergiobernardidev',
  version: '0.1.0',
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
    backgroundColor: '#ffffff',
  },
  assetBundlePatterns: ['**/*'],
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.momentovino.app',
    config: {
      usesNonExemptEncryption: false,
    },
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
    '@react-native-community/datetimepicker',
    [
      'expo-camera',
      {
        cameraPermission: 'Allow MomentoVino to use the camera to scan wine labels.',
        recordAudioAndroid: false,
      },
    ],
    // Registers Google's reverse-client-id URL scheme in Info.plist so the iOS SDK
    // can return to the app after the user finishes the Google auth flow. Skipped
    // when the env var is missing so builds don't crash on `Missing iosUrlScheme`.
    googleSignInPlugin,
  ].filter(Boolean) as ExpoConfig['plugins'],
  scheme: 'momentovino',
}

export default config
