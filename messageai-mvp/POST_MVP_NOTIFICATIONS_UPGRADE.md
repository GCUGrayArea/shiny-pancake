# Post-MVP: Notifications Upgrade to FCM with Cloud Functions

## Current Implementation (MVP)

The MVP uses **client-side local notifications** that work reliably with Expo Go. This implementation:

✅ **Works for:**
- Foreground notifications (app open)
- Background notifications (app recently backgrounded, not killed)
- Notification tapping / deep linking
- Testing in Expo Go on physical devices

❌ **Does NOT work for:**
- Notifications when app is fully killed/terminated
- Notifications sent from other users' devices when they're offline
- Server-side notification triggers
- True push notifications via APNs/FCM

## Why This Approach for MVP

1. **Expo Go Compatibility**: Works immediately without custom dev build
2. **Faster Development**: ~2.5 hours vs 4-5+ hours for full FCM setup
3. **Easier Testing**: Can test on Android device right away
4. **MVP Priority**: Foreground notifications are P0 (blocker), background/killed state is P1 (not blocker)
5. **Clean Architecture**: Easy to upgrade to FCM later without breaking existing code

## Upgrade Path: FCM with Cloud Functions

### Overview

The upgrade involves:
1. Setting up Firebase Cloud Messaging (FCM) tokens
2. Creating Cloud Functions to send notifications server-side
3. Building a custom dev client (Expo Go won't work for background push)
4. Updating notification handlers for FCM

### Step 1: Firebase Cloud Functions Setup

#### 1.1 Initialize Cloud Functions

```bash
cd messageai-mvp
firebase init functions
```

Choose:
- Language: **TypeScript**
- ESLint: **Yes**
- Install dependencies: **Yes**

This creates a `functions/` directory in your project.

#### 1.2 Install Dependencies

```bash
cd functions
npm install firebase-admin
npm install firebase-functions
```

#### 1.3 Create Notification Cloud Function

Create `functions/src/index.ts`:

```typescript
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

admin.initializeApp();

/**
 * Cloud Function: Send notification when new message is created
 * Triggers on new message in Firebase RTDB
 */
export const sendMessageNotification = functions.database
  .ref('/messages/{chatId}/{messageId}')
  .onCreate(async (snapshot, context) => {
    const message = snapshot.val();
    const { chatId, messageId } = context.params;

    try {
      // Get chat participants
      const chatSnapshot = await admin.database()
        .ref(`/chats/${chatId}`)
        .once('value');
      
      const chat = chatSnapshot.val();
      if (!chat || !chat.participantIds) {
        console.log('Chat not found or no participants');
        return null;
      }

      // Get sender info
      const senderSnapshot = await admin.database()
        .ref(`/users/${message.senderId}`)
        .once('value');
      
      const sender = senderSnapshot.val();
      if (!sender) {
        console.log('Sender not found');
        return null;
      }

      // Get recipient FCM tokens (all participants except sender)
      const participantIds = Object.keys(chat.participantIds);
      const recipientIds = participantIds.filter(id => id !== message.senderId);

      const tokens: string[] = [];
      for (const recipientId of recipientIds) {
        const userSnapshot = await admin.database()
          .ref(`/users/${recipientId}`)
          .once('value');
        
        const user = userSnapshot.val();
        if (user?.fcmToken) {
          tokens.push(user.fcmToken);
        }
      }

      if (tokens.length === 0) {
        console.log('No FCM tokens found for recipients');
        return null;
      }

      // Format notification based on chat type and message type
      const title = chat.type === 'group'
        ? `${sender.displayName} in ${chat.name || 'Group Chat'}`
        : sender.displayName;

      const body = message.type === 'text'
        ? message.content.length > 100
          ? `${message.content.substring(0, 97)}...`
          : message.content
        : '📷 Photo';

      // Create notification payload
      const payload: admin.messaging.MulticastMessage = {
        notification: {
          title,
          body,
        },
        data: {
          chatId,
          messageId,
          senderId: message.senderId,
          senderName: sender.displayName,
          type: 'message',
        },
        tokens,
        android: {
          priority: 'high',
          notification: {
            sound: 'default',
            channelId: 'messages',
          },
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: 1,
            },
          },
        },
      };

      // Send notification
      const response = await admin.messaging().sendMulticast(payload);

      console.log('Notification sent:', {
        success: response.successCount,
        failure: response.failureCount,
      });

      // Handle token cleanup for invalid tokens
      if (response.failureCount > 0) {
        const failedTokens: string[] = [];
        response.responses.forEach((resp, idx) => {
          if (!resp.success) {
            failedTokens.push(tokens[idx]);
          }
        });

        console.log('Failed tokens (should be cleaned up):', failedTokens);
        // TODO: Remove invalid tokens from user profiles
      }

      return response;
    } catch (error) {
      console.error('Error sending notification:', error);
      return null;
    }
  });

/**
 * Cloud Function: Clean up old messages (optional)
 * Runs daily to delete messages older than 90 days
 */
export const cleanupOldMessages = functions.pubsub
  .schedule('0 2 * * *') // Run at 2 AM daily
  .onRun(async (context) => {
    const ninetyDaysAgo = Date.now() - (90 * 24 * 60 * 60 * 1000);
    
    const chatsSnapshot = await admin.database()
      .ref('/messages')
      .once('value');
    
    let deletedCount = 0;
    const updates: { [key: string]: null } = {};

    chatsSnapshot.forEach((chatSnapshot) => {
      chatSnapshot.forEach((messageSnapshot) => {
        const message = messageSnapshot.val();
        if (message.timestamp < ninetyDaysAgo) {
          updates[`/messages/${chatSnapshot.key}/${messageSnapshot.key}`] = null;
          deletedCount++;
        }
      });
    });

    if (deletedCount > 0) {
      await admin.database().ref().update(updates);
      console.log(`Deleted ${deletedCount} old messages`);
    }

    return null;
  });
```

#### 1.4 Deploy Cloud Functions

```bash
firebase deploy --only functions
```

### Step 2: Update Mobile App for FCM

#### 2.1 Build Custom Dev Client

FCM background notifications don't work in Expo Go. You need a custom dev client:

```bash
# Install EAS CLI
npm install -g eas-cli

# Login to Expo
eas login

# Configure project
eas build:configure

# Build custom dev client for Android
eas build --profile development --platform android

# For iOS (requires Apple Developer account)
eas build --profile development --platform ios
```

After build completes, download and install the APK on your Android device.

#### 2.2 Add FCM Configuration to app.json

```json
{
  "expo": {
    "plugins": [
      [
        "expo-notifications",
        {
          "icon": "./assets/notification-icon.png",
          "color": "#2196F3",
          "sounds": ["./assets/notification-sound.wav"],
          "androidMode": "default",
          "androidCollapsedTitle": "#{unread_notifications} new notifications"
        }
      ]
    ],
    "android": {
      "googleServicesFile": "./google-services.json",
      "permissions": [
        "RECEIVE_BOOT_COMPLETED"
      ]
    },
    "ios": {
      "googleServicesFile": "./GoogleService-Info.plist"
    }
  }
}
```

Download `google-services.json` (Android) and `GoogleService-Info.plist` (iOS) from Firebase Console.

#### 2.3 Update notification.service.ts

Replace the `getPushToken` function:

```typescript
/**
 * Get FCM push notification token
 */
export async function getPushToken(): Promise<string | null> {
  try {
    // Check if running in Expo Go (FCM won't work)
    const { isDevice } = await import('expo-device');
    if (!isDevice) {
      console.warn('Push notifications only work on physical devices');
      return null;
    }

    // Get FCM token
    const { data: token } = await Notifications.getExpoPushTokenAsync({
      projectId: 'your-expo-project-id', // From app.json
    });

    console.log('FCM token obtained:', token);
    return token;
  } catch (error) {
    console.error('Error getting FCM token:', error);
    return null;
  }
}

/**
 * Save FCM token to user profile in Firebase
 */
export async function savePushTokenToProfile(
  userId: string,
  token: string
): Promise<void> {
  try {
    const { updateUserInFirebase } = await import('./firebase-user.service');
    const result = await updateUserInFirebase(userId, { fcmToken: token });
    
    if (result.success) {
      console.log('FCM token saved to user profile');
    } else {
      console.error('Failed to save FCM token:', result.error);
    }
  } catch (error) {
    console.error('Error saving FCM token:', error);
  }
}
```

#### 2.4 Update AuthContext to Register FCM Token

In `src/contexts/AuthContext.tsx`, add FCM token registration on login:

```typescript
// After successful login
const token = await getPushToken();
if (token && u.uid) {
  await savePushTokenToProfile(u.uid, token);
}
```

#### 2.5 Remove Client-Side Notification Triggers

In `src/services/sync.service.ts`, REMOVE this line:

```typescript
// Trigger notification for new message
await NotificationManager.handleNewMessage(message);
```

The Cloud Function will now handle sending notifications instead.

### Step 3: Update Notification Handlers

#### 3.1 Update NotificationContext for FCM

The notification tap handler remains the same, but add FCM-specific handling:

```typescript
// Handle notification received in different states
useEffect(() => {
  const subscription = Notifications.addNotificationReceivedListener(
    (notification) => {
      // Handle notification based on app state
      if (AppState.currentState === 'active') {
        // App is in foreground - notification was shown by OS
        console.log('Notification received while in foreground');
      }
    }
  );

  return () => subscription.remove();
}, []);
```

### Step 4: Testing FCM Implementation

#### 4.1 Test Token Registration

1. Login to the app
2. Check Firebase RTDB: `users/{userId}/fcmToken` should contain the token
3. Verify in console logs that token was obtained

#### 4.2 Test Server-Side Notifications

1. Open Firebase Console → Realtime Database
2. Manually create a message in `/messages/{chatId}/{messageId}`
3. Cloud Function should trigger and send notification
4. Check Cloud Functions logs for success/failure

#### 4.3 Test Notification Delivery

**Foreground:**
- App is open
- Send a message from another user
- Notification banner should appear at top

**Background:**
- App is backgrounded (recent apps)
- Send a message from another user
- Notification should appear in notification tray
- Tap notification → app should open to correct chat

**Killed:**
- Force kill the app
- Send a message from another user
- Notification should appear in notification tray
- Tap notification → app should launch and navigate to chat

#### 4.4 Test with Firebase Cloud Messaging Tool

Use Firebase Console → Cloud Messaging to send test notifications:

1. Go to Firebase Console → Cloud Messaging
2. Click "Send test message"
3. Enter FCM token from RTDB
4. Send and verify delivery

### Step 5: Monitoring & Debugging

#### 5.1 Cloud Functions Logs

```bash
# View real-time logs
firebase functions:log --follow

# Filter for specific function
firebase functions:log --only sendMessageNotification
```

#### 5.2 Firebase Console

- Cloud Functions → Dashboard: Shows invocation count, errors, execution time
- Realtime Database → Usage: Monitor read/write operations
- Cloud Messaging → Reports: Delivery statistics

#### 5.3 Client-Side Debugging

Add detailed logging:

```typescript
// Log all notification events
Notifications.addNotificationReceivedListener((notif) => {
  console.log('Notification received:', {
    title: notif.request.content.title,
    body: notif.request.content.body,
    data: notif.request.content.data,
    trigger: notif.request.trigger,
  });
});

Notifications.addNotificationResponseReceivedListener((response) => {
  console.log('Notification tapped:', {
    notification: response.notification.request.content,
    actionIdentifier: response.actionIdentifier,
  });
});
```

## Estimated Upgrade Time

- **Step 1 (Cloud Functions)**: 2-3 hours
- **Step 2 (Mobile App FCM)**: 2-3 hours
- **Step 3 (Handlers Update)**: 1 hour
- **Step 4 (Testing)**: 2-3 hours
- **Step 5 (Monitoring Setup)**: 1 hour

**Total: 8-13 hours**

## Rollback Plan

If FCM implementation has issues, you can easily rollback:

1. Re-enable client-side notifications in `sync.service.ts`
2. Disable Cloud Function in Firebase Console
3. App will continue working with local notifications
4. No data loss or breaking changes

## Additional Resources

- [Expo Notifications Documentation](https://docs.expo.dev/versions/latest/sdk/notifications/)
- [Firebase Cloud Messaging Documentation](https://firebase.google.com/docs/cloud-messaging)
- [Firebase Cloud Functions Documentation](https://firebase.google.com/docs/functions)
- [Expo Custom Dev Client Guide](https://docs.expo.dev/develop/development-builds/create-a-build/)

## Cost Considerations

Firebase Free Tier (Spark Plan) includes:
- Cloud Functions: 125K invocations/month, 40K GB-seconds/month
- Cloud Messaging: Unlimited
- Realtime Database: 1 GB storage, 10 GB/month download

For typical usage (< 1000 users):
- **Expected Cost**: $0/month (stays within free tier)

For scaling (> 10,000 users):
- **Expected Cost**: $10-50/month on Blaze (Pay-as-you-go) plan
- Monitor Cloud Functions invocations - optimize by batching

## Security Considerations

1. **Cloud Functions**: Already authenticated via Firebase Admin SDK
2. **FCM Tokens**: Sensitive - stored in RTDB with proper security rules
3. **Notification Content**: Never include sensitive data in notification body (only preview)
4. **Token Cleanup**: Remove invalid tokens to prevent unnecessary FCM calls

## Performance Optimization

1. **Batch Notifications**: For group chats with many participants
2. **Token Caching**: Cache FCM tokens in memory for Cloud Functions
3. **Conditional Sends**: Don't send if user is currently viewing the chat
4. **Message Bundling**: Combine multiple rapid messages into one notification

---

**Document Status**: Ready for Post-MVP Implementation  
**Last Updated**: October 22, 2025  
**Estimated Complexity**: Medium (requires custom dev client)  
**Priority**: P1 (implement after MVP validation)


