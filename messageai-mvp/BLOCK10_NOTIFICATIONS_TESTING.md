# Block 10: Notifications - Testing Guide

## Implementation Complete ✅

Block 10 (Push Notifications) has been implemented using **client-side local notifications** that work with Expo Go.

### What Was Implemented

1. ✅ **Notification Service** (`src/services/notification.service.ts`)
   - Permission requests
   - Local notification scheduling
   - Android notification channels
   - Message formatting (text vs image, 1:1 vs group)

2. ✅ **Notification Manager** (`src/services/notification-manager.service.ts`)
   - Central coordinator for showing notifications
   - Tracks current viewing chat (suppresses notifications)
   - Integrates with message sync system

3. ✅ **Notification Context** (`src/contexts/NotificationContext.tsx`)
   - Manages notification lifecycle
   - Handles foreground notifications
   - Deep linking on notification tap

4. ✅ **Integration with Existing Systems**
   - Sync service triggers notifications on new messages
   - Auth context sets current user
   - Conversation screen sets current viewing chat
   - Navigation deep linking works

5. ✅ **Unit Tests**
   - 16 tests for notification service
   - 11 tests for notification manager
   - All tests passing

## Testing on Android Device

### Prerequisites

1. Android device with USB debugging enabled
2. Expo Go app installed
3. Device and computer on same network (or USB cable)

### Setup

```bash
cd messageai-mvp
npm start
```

Then:
- Scan QR code with Expo Go, OR
- Connect via USB and run: `npm run android`

### Test Scenarios

#### Test 1: Foreground Notifications ✅ P0 (MVP Blocker)

**Goal**: Verify notifications appear when app is in foreground

**Steps:**
1. Login as User A on your Android device
2. Login as User B on another device (or web browser using Expo)
3. Keep User A's app in foreground
4. Send a message from User B to User A
5. **Expected**: Notification banner appears at top of screen
6. **Expected**: You hear a notification sound
7. **Expected**: Notification shows sender name and message preview

**Success Criteria:**
- [ ] Notification appears within 2 seconds
- [ ] Notification shows correct sender name
- [ ] Text message shows preview (truncated if long)
- [ ] Image message shows "📷 Photo"
- [ ] Notification sound plays
- [ ] No notification if you send to yourself

#### Test 2: Background Notifications (Recently Backgrounded)

**Goal**: Verify notifications appear when app is recently backgrounded

**Steps:**
1. Login as User A on your Android device
2. Press home button (app goes to background, but stays in recent apps)
3. Send a message from User B to User A
4. **Expected**: Notification appears in notification tray
5. **Expected**: You hear a notification sound
6. **Expected**: Badge count on app icon (if supported)

**Success Criteria:**
- [ ] Notification appears in notification tray
- [ ] Notification shows correct sender name
- [ ] Notification shows correct message preview
- [ ] Notification persists until dismissed or tapped

**Note**: This works because the app is still in memory. Won't work if app is force-killed (this is P1, not P0).

#### Test 3: Notification Tapping / Deep Linking ✅ P0 (MVP Blocker)

**Goal**: Verify tapping notification opens correct chat

**Steps:**
1. Login as User A on your Android device
2. Press home button (app goes to background)
3. Send a message from User B to User A (creates notification)
4. Tap the notification in notification tray
5. **Expected**: App comes to foreground
6. **Expected**: Conversation screen opens automatically
7. **Expected**: Correct chat is displayed (User B's chat)

**Success Criteria:**
- [ ] App opens/resumes when notification tapped
- [ ] Correct chat opens automatically
- [ ] No crashes or navigation errors
- [ ] Chat shows latest message

#### Test 4: Notification Suppression (Current Chat)

**Goal**: Verify no notification when viewing the chat

**Steps:**
1. Login as User A on your Android device
2. Open conversation with User B (stay on this screen)
3. Send a message from User B to User A
4. **Expected**: NO notification appears
5. **Expected**: Message appears in chat in real-time
6. Check console logs: Should see "Suppressing notification - user is viewing this chat"

**Success Criteria:**
- [ ] No notification when viewing the chat
- [ ] Message still appears in chat view
- [ ] Console log confirms suppression

#### Test 5: Group Chat Notifications

**Goal**: Verify notifications work in group chats

**Steps:**
1. Create a group chat with User A, User B, and User C
2. Login as User A on your Android device
3. Press home button (app in background)
4. Send a message from User B in the group
5. **Expected**: Notification shows "User B in GroupName"
6. **Expected**: Notification body shows message preview
7. Tap notification
8. **Expected**: Group conversation opens

**Success Criteria:**
- [ ] Notification shows sender name + group name
- [ ] Notification body shows message
- [ ] Tapping opens correct group chat
- [ ] No notification for own messages in group

#### Test 6: Multiple Notifications

**Goal**: Verify multiple notifications are handled correctly

**Steps:**
1. Login as User A on your Android device
2. Press home button (app in background)
3. Send 3-5 rapid messages from User B to User A
4. **Expected**: Multiple notifications appear
5. **Expected**: Each shows correct message preview
6. Tap one notification
7. **Expected**: App opens to correct chat
8. **Expected**: All messages are visible in chat

**Success Criteria:**
- [ ] Multiple notifications appear
- [ ] Each notification is distinct
- [ ] No duplicates
- [ ] All messages visible in chat

#### Test 7: Image Message Notifications

**Goal**: Verify image messages show correct notification

**Steps:**
1. Login as User A on your Android device
2. Press home button (app in background)
3. Send an image from User B to User A
4. **Expected**: Notification shows "📷 Photo"
5. Tap notification
6. **Expected**: App opens to chat
7. **Expected**: Image is visible in chat

**Success Criteria:**
- [ ] Notification shows "📷 Photo" instead of image URL
- [ ] Image loads correctly in chat after opening
- [ ] No crashes

#### Test 8: Permissions

**Goal**: Verify notification permissions are requested

**Steps:**
1. Fresh install of app (or clear app data)
2. Login as User A
3. **Expected**: Permission dialog appears asking for notification permission
4. Tap "Allow"
5. **Expected**: App continues normally
6. Send a test message to verify notifications work

**Alternative Test:**
1. Deny permission initially
2. Send a message from another user
3. **Expected**: No notification appears (graceful degradation)
4. Go to Android Settings → Apps → Expo Go → Permissions
5. Enable notifications manually
6. Send another message
7. **Expected**: Notification now appears

**Success Criteria:**
- [ ] Permission dialog appears on first run
- [ ] App handles permission denial gracefully
- [ ] Notifications work after granting permission

### Known Limitations (Post-MVP)

❌ **Killed State Notifications**: Won't work if app is force-killed. This requires:
- Custom dev client (not Expo Go)
- FCM with Cloud Functions
- See `POST_MVP_NOTIFICATIONS_UPGRADE.md` for upgrade path

❌ **Badge Counts**: May not work in Expo Go, requires custom dev client

❌ **Background Notifications After Long Period**: If app has been in background for extended time (> 30 minutes), OS may kill it and notifications won't appear

### Console Logging

During testing, watch for these console logs:

```
✅ Good logs:
📱 Notification Manager: Current user set to user-123
📱 Notification Manager: Current viewing chat set to chat-456
🔔 Showing notification for message: { chatId: 'chat-123', sender: 'Test User', type: 'text' }
Notification tapped: { chatId: 'chat-123' }

🔕 Suppression logs:
🔕 Suppressing notification - user is viewing this chat

❌ Error logs (investigate if seen):
❌ Error scheduling message notification: ...
❌ Failed to fetch chat for notification: ...
❌ Error requesting notification permissions: ...
```

### Debugging Tips

**No notifications appearing:**
1. Check notification permissions in Android Settings
2. Check console for errors
3. Verify messages are actually being received (check chat view)
4. Ensure you're not viewing the chat when message arrives
5. Try restarting Expo Go

**Notifications not opening correct chat:**
1. Check console for "Notification tapped" log
2. Verify chatId in notification data
3. Check navigation handler is set up (should see log on app start)

**Duplicate notifications:**
1. Check if multiple devices are logged in as same user
2. Verify message deduplication is working (existing Block 7 code)
3. Check console logs for duplicate "Showing notification" messages

**Crashes on notification tap:**
1. Check console for navigation errors
2. Verify chatId exists in database
3. Check if chat has been deleted

### Performance Testing

**High Volume:**
1. Send 20+ rapid messages from another user
2. **Expected**: All notifications appear
3. **Expected**: No crashes or slowdowns
4. **Expected**: Tapping any notification opens correct chat

**Multiple Chats:**
1. Have 3-5 different users send messages
2. **Expected**: Notifications show correct sender for each
3. **Expected**: Tapping each notification opens correct chat
4. **Expected**: No mix-ups between chats

## Testing Checklist

Before marking Block 10 complete, verify:

- [ ] Test 1: Foreground notifications work
- [ ] Test 2: Background notifications work (recently backgrounded)
- [ ] Test 3: Deep linking works
- [ ] Test 4: Notification suppression works
- [ ] Test 5: Group chat notifications work
- [ ] Test 6: Multiple notifications handled correctly
- [ ] Test 7: Image notifications work
- [ ] Test 8: Permission handling works
- [ ] Performance testing passed
- [ ] No crashes during any test
- [ ] Unit tests all passing (27 tests total)

## Next Steps After Testing

1. ✅ Fix any bugs discovered during testing
2. ✅ Document any edge cases or issues
3. ✅ Update this file with test results
4. ✅ Mark Block 10 complete
5. 🚀 Ready for MVP demo!

## Post-MVP Enhancement Path

After MVP validation, consider upgrading to FCM with Cloud Functions:
- See `POST_MVP_NOTIFICATIONS_UPGRADE.md`
- Estimated time: 8-13 hours
- Enables killed-state notifications
- Better battery efficiency
- More reliable delivery

---

**Document Status**: Ready for Device Testing  
**Last Updated**: October 22, 2025  
**Estimated Testing Time**: 1-2 hours  
**Priority**: P0 (MVP Blocker - Foreground notifications required)


