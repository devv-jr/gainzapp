// app.config.js
import 'dotenv/config';

export default ({ config }) => ({
  ...config,
  expo: {
    name: "Gainz",
    slug: "gainzapp",
    version: "2.0.0",
    orientation: "portrait",
    icon: "./assets/gainz-icon.png",
    userInterfaceStyle: "dark",
    newArchEnabled: true,
    splash: {
      image: "./assets/gainz-icon.png",
      resizeMode: "contain",
      backgroundColor: "#0F0F0F"
    },
    assetBundlePatterns: [
      "**/*"
    ],
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.gainzapp.fitness"
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/gainz-icon.png",
        backgroundColor: "#0F0F0F"
      },
      edgeToEdgeEnabled: true,
      package: "com.gainzapp.fitness"
    },
    web: {
      favicon: "./assets/gainz-icon.png",
      bundler: "metro"
    },
    extra: {
      // Mantén esto para EAS, no lo toques:
      eas: {
        projectId: "127a340e-2914-4901-9cd6-442fb716b6d6"
      },
      
      // Inyectamos aquí tus claves de Firebase desde el .env / EAS Secrets
      FIREBASE_API_KEY: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
      FIREBASE_AUTH_DOMAIN: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
      FIREBASE_PROJECT_ID: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
      FIREBASE_STORAGE_BUCKET: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
      FIREBASE_MESSAGING_SENDER_ID: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      FIREBASE_APP_ID: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
    },
    owner: "devvjr",
    runtimeVersion: {
      policy: "appVersion"
    },
    updates: {
      url: "https://u.expo.dev/127a340e-2914-4901-9cd6-442fb716b6d6"
    }
  }
});
