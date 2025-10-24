# Firebase Cloud Messaging (FCM) Setup Guide

## Overview
This guide explains how to set up Firebase Cloud Messaging for push notifications in background and killed states.

## Prerequisites
- Firebase project created and configured
- Expo account and project
- Physical devices for testing (iOS and/or Android)

---

## Step 1: Firebase Project Configuration

### 1.1 Enable Cloud Messaging API
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your Firebase project
3. Navigate to **APIs & Services** → **Library**
4. Search for "Firebase Cloud Messaging API"
5. Click **Enable**

### 1.2 Download Configuration Files

**For Android:**
1. Go to Firebase Console → Project Settings → General
2. Under "Your apps", select your Android app (or create one)
3. Download `google-services.json`
4. Place it in `messageai-mvp/` directory (root of your Expo project)
5. Add to `app.json`:
   ```json
   "android": {
     "googleServicesFile": "./google-services.json"
   }
   ```

**For iOS:**
1. Go to Firebase Console → Project Settings → General
2. Under "Your apps", select your iOS app (or create one)
3. Download `GoogleService-Info.plist`
4. Place it in `messageai-mvp/` directory
5. Will be automatically included during build

---

## Step 2: Expo Project ID

### 2.1 Get Your Expo Project ID
1. Run `npx expo whoami` to ensure you're logged in
2. Run `npx expo init` if project not initialized
3. Check `app.json` for project ID OR
4. Visit https://expo.dev and find your project

### 2.2 Update Code
Edit `src/services/notification.service.ts` line ~205:
```typescript
const tokenData = await Notifications.getExpoPushTokenAsync({
  projectId: 'YOUR_ACTUAL_EXPO_PROJECT_ID', // Replace this!
});
```

---

## Step 3: Deploy Firebase Cloud Functions

### 3.1 Install Dependencies
```bash
cd messageai-mvp/functions
npm install
```

### 3.2 Build TypeScript
```bash
npm run build
```

### 3.3 Deploy to Firebase
```bash
firebase deploy --only functions
```

**Expected Output:**
```
✔  functions: Finished running predeploy script.
✔  functions[sendMessageNotification(us-central1)]: Successful create operation.
✔  Deploy complete!
```

### 3.4 Verify Deployment
1. Go to Firebase Console → Functions
2. Confirm `sendMessageNotification` is listed
3. Check that it has trigger type "Realtime Database"

---

## Step 4: Update Firebase Database Rules

The rules should already be updated by this PR. Verify in Firebase Console:

```json
{
  "rules": {
    "users": {
      "$uid": {
        "pushToken": {
          ".write": "auth != null && auth.uid == $uid"
        }
      }
    },
    "chats": {
      "$chatId": {
        "unreadCount": {
          "$uid": {
            ".read": "auth != null && auth.uid == $uid",
            ".write": "auth != null"
          }
        }
      }
    }
  }
}
```

Deploy rules:
```bash
firebase deploy --only database
```

---

## Step 5: Configure Expo for Push Notifications

### 5.1 Install Required Packages
Already installed in this project:
- `expo-notifications`
- `expo-device`

### 5.2 App Configuration (app.json)
Already configured in this PR:
```json
{
  "expo": {
    "notification": {
      "icon": "./assets/notification-icon.png",
      "color": "#2196F3"
    },
    "ios": {
      "infoPlist": {
        "UIBackgroundModes": ["remote-notification"]
      }
    },
    "android": {
      "googleServicesFile": "./google-services.json",
      "useNextNotificationsApi": true,
      "permissions": [
        "RECEIVE_BOOT_COMPLETED",
        "VIBRATE",
        "WAKE_LOCK"
      ]
    }
  }
}
```

---

## Step 6: Build and Test

### 6.1 Development Build (Expo Go)
**⚠️ Limitation**: Expo Go has limited background notification support. For full testing, use a standalone build.

```bash
npx expo start
```

### 6.2 Standalone Build

**For Android (APK)**:
```bash
eas build --platform android --profile preview
```

**For iOS (TestFlight)**:
```bash
eas build --platform ios --profile preview
```

**Note**: Requires EAS CLI and account:
```bash
npm install -g eas-cli
eas login
eas build:configure
```

### 6.3 Install on Device
- **Android**: Download APK and install
- **iOS**: Use TestFlight link

---

## Step 7: Verify Setup

### 7.1 Check Push Token Registration
1. Install app on physical device
2. Log in with test account
3. Open Firebase Console → Realtime Database
4. Navigate to `/users/{userId}`
5. Verify `pushToken` field exists

### 7.2 Test Notification
1. Send a message from another device
2. Check if notification appears
3. Check Firebase Functions logs for errors

### 7.3 View Function Logs
```bash
firebase functions:log
```

Or in Firebase Console → Functions → Logs

---

## Troubleshooting

### Push Token Not Registered
**Symptoms**: No `pushToken` in Firebase user profile

**Solutions**:
1. Check notification permissions in device settings
2. Verify Firebase rules allow write to `pushToken`
3. Check console for errors
4. Ensure Expo project ID is correct

### Notifications Not Received
**Symptoms**: No notifications appear on device

**Solutions**:
1. Verify Cloud Function is deployed and active
2. Check Function logs for errors
3. Ensure device has internet connection
4. Verify user has valid push token
5. Check FCM API is enabled in Google Cloud Console

### Background Notifications Not Working
**Symptoms**: Notifications only work when app is open

**Solutions**:
1. **Must use standalone build** (not Expo Go)
2. Verify `UIBackgroundModes` for iOS
3. Check `google-services.json` for Android
4. Ensure Cloud Function is setting proper notification payload

### Invalid Token Errors
**Symptoms**: Cloud Function logs show "invalid-registration-token"

**Solutions**:
1. Token format should be `ExponentPushToken[...]`
2. Re-install app to generate new token
3. Clear old tokens from Firebase
4. Code automatically removes invalid tokens

### Doze Mode Issues (Android)
**Symptoms**: Notifications delayed on Android

**Solutions**:
1. Disable battery optimization for the app
2. Set notification priority to HIGH (already done)
3. Use high-priority FCM messages (already configured)

---

## Environment Variables

Create `.env.local` (not committed to git):
```env
EXPO_PUBLIC_FIREBASE_API_KEY=your_api_key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
EXPO_PUBLIC_FIREBASE_DATABASE_URL=your_database_url
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
EXPO_PUBLIC_FIREBASE_APP_ID=your_app_id
```

---

## Production Checklist

Before going to production:

- [ ] Firebase Cloud Functions deployed
- [ ] Firebase Database rules deployed
- [ ] Expo project ID updated in code
- [ ] `google-services.json` (Android) in place
- [ ] `GoogleService-Info.plist` (iOS) in place
- [ ] Standalone builds created for both platforms
- [ ] Tested on physical devices (iOS and Android)
- [ ] All tests in `TESTING_PR052.md` pass
- [ ] Function logs reviewed for errors
- [ ] Invalid token cleanup verified
- [ ] Badge counts accurate
- [ ] Deep linking works from killed state

---

## Additional Resources

- [Expo Notifications Documentation](https://docs.expo.dev/versions/latest/sdk/notifications/)
- [Firebase Cloud Messaging](https://firebase.google.com/docs/cloud-messaging)
- [Firebase Cloud Functions](https://firebase.google.com/docs/functions)
- [Expo Push Notifications Guide](https://docs.expo.dev/push-notifications/overview/)

---

## Support

If you encounter issues:
1. Check Firebase Console logs
2. Review `TESTING_PR052.md` for common scenarios
3. Verify all setup steps completed
4. Check Expo documentation for platform-specific issues
