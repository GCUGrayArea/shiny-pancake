# PR-052: Background/Killed Push Notifications - Manual Testing Guide

## Overview
This guide provides step-by-step instructions for manually testing the FCM-based push notification system, including background and killed state scenarios.

**⚠️ IMPORTANT**: These tests MUST be performed on physical devices, not emulators. Push notifications do not work reliably in emulators.

## Prerequisites

### Required Setup
1. **Two Physical Devices** (for best testing):
   - Device A: Primary test device (iOS or Android)
   - Device B: Secondary device to send messages (can be another phone or use Expo Go on computer)

2. **Firebase Project Configuration**:
   - Ensure Firebase Cloud Functions are deployed: `cd functions && npm run deploy`
   - Verify Firebase RTDB rules are updated
   - Check that `google-services.json` (Android) or `GoogleService-Info.plist` (iOS) is in place

3. **Expo Project ID**:
   - Update `notification.service.ts` line 205 with your actual Expo project ID
   - Find it in `app.json` or Expo dashboard

4. **App Installation**:
   - Install app via Expo Go OR build a standalone APK/IPA
   - For production testing, standalone builds are recommended

---

## Test Suite

### Test 1: Initial Setup & Token Registration

**Objective**: Verify push token is registered when app starts

**Steps**:
1. Fresh install the app on Device A
2. Sign up or log in with a test account
3. Grant notification permissions when prompted
4. Check Firebase Console → Realtime Database → `/users/{userId}`
5. Verify `pushToken` field exists and contains a token string

**Expected Result**:
- ✅ Notification permission granted
- ✅ Push token saved to user profile in Firebase
- ✅ No errors in console

**Troubleshooting**:
- If no token: Check notification permissions in device settings
- If token not saved: Check Firebase rules allow write to `pushToken`

---

### Test 2: Foreground Notifications

**Objective**: Verify notifications appear when app is open

**Steps**:
1. Open app on Device A, navigate to chat list (not in a conversation)
2. From Device B, send a message to Device A's account
3. Observe notification behavior on Device A

**Expected Result**:
- ✅ Notification banner appears at top of screen
- ✅ Sound plays (if not silenced)
- ✅ Notification shows correct sender name and message preview
- ✅ Tapping notification navigates to the correct chat

**Pass/Fail**: ___________

---

### Test 3: Background Notifications

**Objective**: Verify notifications work when app is backgrounded

**Steps**:
1. Open app on Device A, then press Home button (app moves to background)
2. From Device B, send a message to Device A's account
3. Wait 2-3 seconds
4. Observe notification on Device A
5. Tap the notification
6. Verify app opens to the correct chat

**Expected Result**:
- ✅ Notification appears while app is in background
- ✅ Notification shows correct content (sender, message preview)
- ✅ Badge count on app icon shows correct unread count
- ✅ Tapping notification brings app to foreground
- ✅ App navigates directly to the chat that sent the message
- ✅ Message is visible in the conversation

**Pass/Fail**: ___________

---

### Test 4: Killed State Notifications (Critical Test)

**Objective**: Verify notifications work when app is completely closed

**Steps**:
1. On Device A, force quit the app:
   - iOS: Swipe up from bottom, swipe app up to close
   - Android: Recent apps → swipe app away OR Settings → Force Stop
2. Verify app is completely closed (not in recent apps)
3. From Device B, send a message to Device A's account
4. Wait 3-5 seconds
5. Observe notification on Device A (app should still be closed)
6. Tap the notification
7. Observe app launch and navigation behavior

**Expected Result**:
- ✅ Notification appears even though app was completely closed
- ✅ Notification content is correct (sender name, message preview)
- ✅ Badge count shows correct unread count
- ✅ Tapping notification launches the app
- ✅ App performs cold start successfully
- ✅ App automatically navigates to the correct chat
- ✅ Message is visible without manual refresh

**Pass/Fail**: ___________

**⚠️ This is the most critical test - if this fails, background notifications are not working**

---

### Test 5: Multiple Message Notifications

**Objective**: Verify notification behavior with multiple messages

**Steps**:
1. Force quit app on Device A
2. From Device B, send 3 messages in quick succession to Device A
3. Observe notifications on Device A
4. Tap one of the notifications
5. Check if all messages are visible in the chat

**Expected Result**:
- ✅ Multiple notifications appear (may be grouped on some devices)
- ✅ Badge count reflects total unread messages across all chats
- ✅ Opening app shows all sent messages
- ✅ No message loss

**Pass/Fail**: ___________

---

### Test 6: Unread Count Accuracy

**Objective**: Verify badge counts are accurate

**Steps**:
1. On Device A, open app, navigate to Chat List
2. From Device B, send 1 message to Chat #1
3. Check badge count on Device A's app icon
4. From Device B, send 2 messages to Chat #2
5. Check badge count again
6. On Device A, open Chat #1, read the message
7. Return to Chat List
8. Check badge count (should decrease by 1)

**Expected Result**:
- ✅ After 1 message: badge = 1
- ✅ After 3 messages total: badge = 3
- ✅ After reading Chat #1: badge = 2
- ✅ Chat List shows individual unread counts per chat
- ✅ Global badge matches sum of all chat unread counts

**Pass/Fail**: ___________

---

### Test 7: Group Chat Notifications

**Objective**: Verify notifications in group chats

**Steps**:
1. Create a group chat with Device A, Device B, and optionally a third user
2. On Device A, background the app
3. From Device B, send a message to the group
4. Observe notification on Device A
5. Tap notification

**Expected Result**:
- ✅ Notification shows sender name + group name (e.g., "Bob in Family Chat")
- ✅ Tapping notification navigates to correct group chat
- ✅ Message visible in group

**Pass/Fail**: ___________

---

### Test 8: Image Message Notifications

**Objective**: Verify notifications for image messages

**Steps**:
1. On Device A, background app
2. From Device B, send an image with caption "Test image"
3. Observe notification on Device A
4. Tap notification

**Expected Result**:
- ✅ Notification shows "📷 Photo" in preview
- ✅ If caption exists, it may be shown (implementation dependent)
- ✅ Opening chat displays image correctly

**Pass/Fail**: ___________

---

### Test 9: Android-Specific: Doze Mode

**Objective**: Verify notifications work in Android Doze mode

**Prerequisites**: Android device only

**Steps**:
1. On Android Device A, enable Developer Options
2. Settings → Developer Options → Enable "Don't keep activities"
3. Put device to sleep (lock screen)
4. Wait 5 minutes (device enters Doze mode)
5. From Device B, send a message
6. Observe if notification wakes device

**Expected Result**:
- ✅ Notification received even in Doze mode
- ✅ Notification priority set to HIGH causes wake-up
- ✅ Tapping notification opens app correctly

**Pass/Fail**: ___________ (Android only)

---

### Test 10: iOS-Specific: Silent Notifications

**Objective**: Verify iOS background notification delivery

**Prerequisites**: iOS device only

**Steps**:
1. On iOS Device A, ensure app has notification permissions
2. Background app (Home button)
3. Lock device
4. From Device B, send a message
5. Check if notification appears on lock screen

**Expected Result**:
- ✅ Notification appears on lock screen
- ✅ Sound plays (if not in silent mode)
- ✅ Badge count updates
- ✅ 3D Touch/Long press on notification shows preview

**Pass/Fail**: ___________ (iOS only)

---

### Test 11: Deep Linking from Killed State

**Objective**: Verify deep linking works when app launches from notification

**Steps**:
1. On Device A, force quit the app
2. From Device B, send messages to TWO different chats
3. On Device A, check notifications (should have 2)
4. Tap the SECOND notification
5. Observe which chat opens

**Expected Result**:
- ✅ App launches successfully from cold start
- ✅ App navigates to the SECOND chat (the one whose notification was tapped)
- ✅ Navigation is automatic (no manual interaction needed)
- ✅ Both chats' messages are synced

**Pass/Fail**: ___________

---

### Test 12: Token Invalidation Handling

**Objective**: Verify system handles invalid/expired tokens

**Steps**:
1. On Device A, log in and verify token is registered
2. In Firebase Console, manually delete the `pushToken` from user profile
3. Restart the app
4. Check if token is re-registered

**Expected Result**:
- ✅ App detects missing token
- ✅ New token is automatically requested and saved
- ✅ Subsequent notifications work correctly

**Pass/Fail**: ___________

---

### Test 13: Notification Persistence

**Objective**: Verify notification clears when chat is opened

**Steps**:
1. On Device A, background app
2. From Device B, send 3 messages
3. On Device A, observe notifications (don't tap yet)
4. Manually open the app (don't tap notification)
5. Navigate to the chat that has unread messages
6. Check notification tray

**Expected Result**:
- ✅ When chat is opened, badge count decreases
- ✅ When chat is read, notification is dismissed
- ✅ Unread count in chat list updates to 0

**Pass/Fail**: ___________

---

### Test 14: Firebase Cloud Function Verification

**Objective**: Verify Cloud Function is triggering correctly

**Steps**:
1. Open Firebase Console → Functions → Logs
2. From Device B, send a message to Device A
3. Check function logs within 5 seconds

**Expected Result**:
- ✅ `sendMessageNotification` function triggers
- ✅ No errors in function logs
- ✅ Log shows "Successfully sent notification to {userId}"
- ✅ If token invalid, log shows token removal

**Pass/Fail**: ___________

**Cloud Function Logs**:
```
[Copy/paste relevant logs here during testing]
```

---

## Platform-Specific Notes

### Android
- **Channel ID**: Ensure "messages" channel is created (handled by code)
- **Sound**: Check notification channel settings in device settings
- **Battery Optimization**: May need to disable battery optimization for the app
- **Permissions**: Notification permission required for Android 13+

### iOS
- **Background Modes**: Enabled in `app.json` - "remote-notification"
- **Certificates**: Ensure APNS certificates are valid (if using standalone build)
- **Silent Updates**: Content-available flag enables background updates
- **Badge Count**: Managed by APNS payload

---

## Troubleshooting Guide

### Notifications Not Appearing

**Check**:
1. ✅ Notification permissions granted in device settings
2. ✅ Push token exists in Firebase user profile
3. ✅ Cloud Function deployed successfully
4. ✅ Cloud Function logs show no errors
5. ✅ Device has internet connection
6. ✅ App has correct Firebase configuration files

**Common Issues**:
- **Expo Go**: Limited background notification support - use standalone build
- **Invalid Token**: Check token format in Firebase
- **Network Issues**: Ensure FCM can reach device
- **Rules Error**: Verify Firebase Database rules allow token writes

### Deep Linking Not Working

**Check**:
1. ✅ Notification data includes `chatId`
2. ✅ `handleNotificationResponse` function is called
3. ✅ Navigation handler is set in AppNavigator
4. ✅ Chat exists and user is a participant

### Unread Counts Incorrect

**Check**:
1. ✅ Cloud Function increments unread count
2. ✅ `markChatAsRead` is called when chat is opened
3. ✅ Firebase rules allow reading/writing unread counts
4. ✅ Subscription to unread counts is active

---

## Test Results Summary

| Test # | Test Name | Pass/Fail | Notes |
|--------|-----------|-----------|-------|
| 1 | Token Registration | | |
| 2 | Foreground Notifications | | |
| 3 | Background Notifications | | |
| 4 | Killed State Notifications | | **CRITICAL** |
| 5 | Multiple Messages | | |
| 6 | Unread Count Accuracy | | |
| 7 | Group Chat Notifications | | |
| 8 | Image Message Notifications | | |
| 9 | Android Doze Mode | | Android only |
| 10 | iOS Silent Notifications | | iOS only |
| 11 | Deep Linking (Killed) | | |
| 12 | Token Invalidation | | |
| 13 | Notification Persistence | | |
| 14 | Cloud Function Logs | | |

**Overall Pass Rate**: _____ / 14 (or 12 for single platform)

---

## Deployment Checklist

Before deploying to production:

- [ ] Cloud Functions deployed: `firebase deploy --only functions`
- [ ] Firebase RTDB rules deployed: `firebase deploy --only database`
- [ ] Expo project ID updated in `notification.service.ts`
- [ ] `google-services.json` (Android) or `GoogleService-Info.plist` (iOS) in place
- [ ] Standalone build created (not using Expo Go)
- [ ] All critical tests (1-8, 11) pass on both platforms
- [ ] Platform-specific tests pass (9 or 10)
- [ ] Error handling tested (12, 13)
- [ ] Cloud Function logs reviewed (14)

---

## Notes & Observations

**Tester Name**: _______________
**Test Date**: _______________
**Devices Used**:
- Device A: _______________
- Device B**: _______________

**Additional Observations**:
```
[Record any unusual behavior, performance notes, or suggestions here]
```

---

## Post-Testing Actions

After completing all tests:

1. **Document Results**: Fill in all Pass/Fail fields above
2. **Report Issues**: Create issues for any failed tests
3. **Update Code**: Fix any bugs discovered during testing
4. **Retest**: Run failed tests again after fixes
5. **Approve PR**: Once all critical tests pass, approve PR-052

---

**Remember**: This PR is worth **8 points** on the rubric. Ensure background and killed state notifications work flawlessly!
