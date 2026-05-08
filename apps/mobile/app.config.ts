import type { ExpoConfig } from 'expo/config'

const googleIosUrlScheme = process.env.EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME

const googleSignInPlugin: [string, Record<string, string>] | null = googleIosUrlScheme
  ? ['@react-native-google-signin/google-signin', { iosUrlScheme: googleIosUrlScheme }]
  : null

const config: ExpoConfig = {
  name: 'MomentoVino',
  slug: 'momentovino',
  owner: 'sergiobernardidev',
  version: '0.1.1',
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
    buildNumber: '22',
    usesAppleSignIn: true,
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
    'expo-apple-authentication',
    '@react-native-community/datetimepicker',
    [
      'expo-camera',
      {
        cameraPermission: 'Allow MomentoVino to use the camera to scan wine labels.',
        recordAudioAndroid: false,
      },
    ],
    ...(googleSignInPlugin ? [googleSignInPlugin] : []),
  ],
  scheme: 'momentovino',
}

export default config
