import type { ExpoConfig } from 'expo/config'

const googleIosUrlScheme = process.env.EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME

const config: ExpoConfig = {
  name: 'MomentoVino',
  slug: 'momentovino',
  version: '0.1.0',
  orientation: 'portrait',
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
    usesAppleSignIn: true,
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
    '@react-native-community/datetimepicker',
    [
      'expo-camera',
      {
        cameraPermission: 'Allow MomentoVino to use the camera to scan wine labels.',
        recordAudioAndroid: false,
      },
    ],
    // Registers Google's reverse-client-id URL scheme in Info.plist so the iOS SDK
    // can return to the app after the user finishes the Google auth flow.
    [
      '@react-native-google-signin/google-signin',
      googleIosUrlScheme ? { iosUrlScheme: googleIosUrlScheme } : {},
    ],
  ],
  scheme: 'momentovino',
}

export default config
