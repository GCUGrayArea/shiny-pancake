# Group Chat Manual Testing Guide

## Overview
This guide tests the group chat creation, persistence, and access control behavior described in the previous analysis. The goal is to verify:

1. **Group Creation Persistence**: Groups are immediately persisted to Firebase and remain accessible
2. **Access Control**: Users lose access when they leave groups
3. **Local Sync Behavior**: How groups appear in chat lists and sync to local database
4. **Real-time Updates**: How group membership changes propagate

## Prerequisites
- ✅ Firebase project set up and configured
- ✅ At least 3 test user accounts created (Alice, Bob, Charlie)
- ✅ App running on Expo Go or physical devices
- ✅ All users logged in on separate devices/sessions

## Test Scenario 1: Group Creation and Immediate Persistence

### Setup
1. Log in as **Alice** (creator)
2. Navigate to "New Chat" screen
3. Toggle to "Create Group" mode
4. Select **Bob** and **Charlie** as participants
5. Set group name: "Test Group ABC"
6. Press "Create Group"

### Expected Behavior
✅ **Group should be created immediately in Firebase**
✅ **Navigation should go directly to conversation screen**
✅ **Chat should be functional - can type and send messages**
✅ **All participants should receive messages in real-time**

### Verification Steps
1. **Check Firebase Console**:
   - Go to Realtime Database
   - Verify `/chats/{groupId}` exists with:
     - `type: "group"`
     - `name: "Test Group ABC"`
     - `participantIds: {aliceId: true, bobId: true, charlieId: true}`
     - `createdAt: timestamp`

2. **Check Chat Functionality**:
   - Send a message as Alice
   - Verify Bob and Charlie receive it immediately
   - Check delivery status shows correctly
   - Verify read receipts work

## Test Scenario 2: Local Sync and Chat List Behavior

### Setup (Continue from Test 1)
1. Keep Alice in the group conversation
2. Switch to **Bob's device/session**
3. Navigate to Chat List screen

### Expected Behavior
✅ **Group chat should appear in Bob's chat list** (if real-time sync is running)
❓ **Group chat may not appear immediately** (if real-time sync isn't active)

### Verification Steps
1. **Check Bob's Chat List**:
   - Does "Test Group ABC" appear in the list?
   - If not, pull-to-refresh the chat list
   - If still not visible, check Firebase console for Bob's user data

2. **Test Real-time Sync**:
   - On Alice's device, send another message
   - Does it appear on Bob's device immediately?
   - Does the chat now appear in Bob's chat list?

3. **Check Local Database**:
   - Use database debugging tools
   - Verify group chat exists in local SQLite database

## Test Scenario 3: Creator Leaves Without Sending Messages

### Setup (Continue from Test 1)
1. Alice has created "Test Group ABC" but hasn't sent any messages
2. Alice navigates to the group conversation
3. Alice presses the info button (ℹ️) to view group details

### Expected Behavior
❓ **Leave Group functionality may not be fully implemented yet**
✅ **Group should still exist in Firebase for other participants**
✅ **Bob and Charlie should still have access to the group**

### Verification Steps
1. **Check Leave Group UI**:
   - Does the "Leave Group" button appear in Group Info?
   - Does pressing it show confirmation dialog?
   - Does it actually remove Alice from participants?

2. **Test Persistence After Leave**:
   - If leave functionality works: Alice should lose access to the group
   - Bob and Charlie should still see the group in their chat lists
   - Group should still exist in Firebase with remaining participants

3. **Test Rejoining**:
   - Can Alice be re-added to the group by Bob or Charlie?
   - Does the group reappear in Alice's chat list after rejoining?

## Test Scenario 4: Access Control and Security Rules

### Setup
1. Create a group with Alice, Bob, Charlie
2. Have Alice leave the group (if leave functionality works)
3. Try to access the group from Alice's account

### Expected Behavior
✅ **Alice should lose all access to the group**
✅ **Alice should not see the group in chat list**
✅ **Alice should not be able to send messages to the group**
✅ **Alice should get permission denied errors** when trying to access

### Verification Steps
1. **Firebase Security Rules Testing**:
   - In Firebase console, try to read `/chats/{groupId}` as Alice
   - Should get permission denied (unless Alice is still a participant)
   - Try to write to the chat as Alice
   - Should get permission denied

2. **App-Level Access Control**:
   - Does Alice still see the group in her chat list?
   - Can Alice navigate to the conversation?
   - What happens when Alice tries to send a message?

## Test Scenario 5: Real-time Sync and Chat List Updates

### Setup
1. Have Alice, Bob, Charlie in a group
2. Ensure real-time sync is running for all users
3. Have users on separate devices/sessions

### Expected Behavior
✅ **Chat list updates should propagate in real-time**
✅ **New groups should appear in all participants' chat lists**
✅ **Membership changes should update all participants' views**

### Verification Steps
1. **Cross-Device Sync**:
   - Create a new group as Alice
   - Does it appear in Bob's chat list within 5 seconds?
   - Does it appear in Charlie's chat list?

2. **Chat List Updates**:
   - Send messages in the group
   - Do last message previews update in real-time?
   - Do unread counts update correctly?

3. **Performance Testing**:
   - Create 5 groups rapidly
   - Do they all appear in chat lists?
   - Any duplicates or sync issues?

## Test Scenario 6: Edge Cases and Error Handling

### Setup
1. Test various group creation scenarios
2. Test error conditions

### Expected Behavior
✅ **App should handle errors gracefully**
✅ **Groups should validate participant requirements**
✅ **Network issues should not cause data loss**

### Verification Steps
1. **Invalid Group Creation**:
   - Try to create group with only 1 participant
   - Try to create group with more than 5 participants
   - Try to create group without being a participant yourself

2. **Network Issues**:
   - Create group while offline
   - Go back online
   - Does the group sync properly?

3. **Rapid Operations**:
   - Create and leave groups rapidly
   - Create multiple groups simultaneously
   - Any race conditions or sync issues?

## Test Scenario 7: Comparison with 1:1 Chat Behavior

### Setup
1. Create both 1:1 chats and group chats
2. Compare persistence and sync behavior

### Expected Behavior
✅ **1:1 chats may be more ephemeral**
✅ **Group chats are persistent entities**
✅ **Different sync timing between chat types**

### Verification Steps
1. **Chat List Population**:
   - Create a 1:1 chat with Bob as Alice
   - Create a group chat with Bob and Charlie as Alice
   - Do both appear in chat lists at the same time?
   - Any difference in sync timing?

2. **Persistence Testing**:
   - Start a 1:1 chat conversation without sending messages
   - Do the same with a group chat
   - Any differences in how they persist?

3. **Real-time Updates**:
   - Compare message delivery speed between 1:1 and group chats
   - Compare chat list updates between types

## Reporting Template

For each test scenario, please report:

### Test Scenario X: [Name]
**Setup Completed:** ✅ / ❌
**Expected Behavior Observed:** ✅ / ❌ / ⚠️
**Actual Behavior:** [Describe what actually happened]
**Firebase Console Verification:** [What you saw in Firebase]
**Screenshots/Logs:** [Any relevant evidence]

**Issues Found:**
- [List any bugs or unexpected behavior]
- [Include error messages or screenshots]

**Notes:**
- [Any additional observations]
- [Performance notes]
- [User experience feedback]

## Expected Results Summary

Based on the code analysis, you should observe:

1. ✅ **Groups persist in Firebase immediately** upon creation
2. ✅ **Groups remain accessible** to other participants even if creator leaves
3. ❓ **Leave functionality may not be fully implemented** (marked as TODO)
4. ✅ **Access control enforced** by Firebase security rules
5. ❓ **Real-time sync timing** may vary depending on when sync starts
6. ✅ **Local persistence** happens when accessing conversations
7. ✅ **Chat list updates** depend on real-time sync being active

## Critical Tests to Verify

1. **Group Creation → Firebase Persistence** (Should work immediately)
2. **Cross-user Access** (Should work for all participants)
3. **Leave Group Impact** (May be incomplete - check if it actually removes access)
4. **Chat List Sync** (May require real-time sync to be running)
5. **Real-time Message Delivery** (Should work immediately for all participants)

## Troubleshooting

If tests don't behave as expected:

1. **Check Firebase Security Rules**:
   - Verify all participants have proper access
   - Check if security rules are deployed correctly

2. **Check Real-time Sync**:
   - Is `startRealtimeSync()` being called?
   - Are Firebase listeners active?

3. **Check Network Connectivity**:
   - Are all devices connected to Firebase?
   - Any network issues causing sync delays?

4. **Check Local Database**:
   - Use debugging tools to inspect SQLite data
   - Verify chats are being synced locally

5. **Check Authentication**:
   - Are all test users properly authenticated?
   - Any auth token issues?

Run these tests and report your findings! The results will help validate the group chat persistence behavior and identify any implementation gaps.

