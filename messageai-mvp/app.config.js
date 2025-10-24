module.exports = {
  expo: {
    name: "messageai-gray",
    slug: "messageai-gray",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "light",
    newArchEnabled: true,
    plugins: [
      [
        "expo-image-picker",
        {
          photosPermission: "The app accesses your photos to let you share them with your friends."
        }
      ]
    ],
    notification: {
      color: "#2196F3",
      androidMode: "default",
      androidCollapsedTitle: "New message"
    },
    splash: {
      image: "./assets/splash-icon.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff"
    },
    ios: {
      supportsTablet: true,
      infoPlist: {
        UIBackgroundModes: [
          "remote-notification"
        ],
        ITSAppUsesNonExemptEncryption: false
      },
      bundleIdentifier: "com.gauntletai.gray.messageai.ios",
      googleServicesFile: process.env.GOOGLE_SERVICE_INFO_PLIST
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#ffffff"
      },
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false,
      googleServicesFile: process.env.GOOGLE_SERVICES_JSON,
      useNextNotificationsApi: true,
      permissions: [
        "android.permission.RECEIVE_BOOT_COMPLETED",
        "android.permission.VIBRATE",
        "android.permission.WAKE_LOCK",
        "android.permission.RECORD_AUDIO"
      ],
      package: "com.gauntletai.gray.messageai.android"
    },
    web: {
      favicon: "./assets/favicon.png"
    },
    extra: {
      eas: {
        projectId: "aeb9270e-960f-4673-b06d-d96d57d2c081"
      }
    }
  }
};
