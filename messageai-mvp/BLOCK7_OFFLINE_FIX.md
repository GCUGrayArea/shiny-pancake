# Block 7: Offline Queue Bug Fix

## 🐛 Issues Found

### Issue 1: SQLite Transaction Error
**Error Message:**
```
Transaction failed: call to function NativeDatabase.execAsync has been rejected. 
Caused by: cannot rollback - no transaction active
```

**Cause:**
When enqueueing a message with only a `localId` (no Firebase `id` yet), the `saveMessage()` function tried to insert delivery tracking records with an empty `messageId`, causing foreign key constraint violations and transaction failures.

**Code Path:**
```typescript
// Message created with empty id
const message = {
  id: '',           // Empty - no Firebase ID yet
  localId: 'local_123',
  // ...
};

// saveMessage() tries to save delivery tracking
if (message.deliveredTo || message.readBy) {
  // DELETE FROM message_delivery WHERE messageId = ''  ❌ Invalid!
  // INSERT INTO message_delivery (...) VALUES ('', ...)  ❌ Foreign key violation!
}
```

### Issue 2: UI Text Field Not Clearing
**Problem:**
Text field didn't clear immediately after hitting send. If the enqueue operation failed (due to Issue 1), the text field remained frozen with the typed message.

**Cause:**
Text field was cleared AFTER async operations started, not before. If an error occurred, the clear never happened.

## ✅ Fixes Applied

### Fix 1: Skip Delivery Tracking for Unsaved Messages
**File:** `src/services/local-message.service.ts`

**Before:**
```typescript
// Save delivery tracking for group messages
if (message.deliveredTo || message.readBy) {
  // Always tries to save, even with empty id
  queries.push({
    sql: 'DELETE FROM message_delivery WHERE messageId = ?',
    params: [message.id],  // Empty string!
  });
  // ...
}
```

**After:**
```typescript
// Save delivery tracking for group messages (only if message has a Firebase ID)
if (message.id && (message.deliveredTo || message.readBy)) {
  // Only saves if message has a real Firebase ID
  queries.push({
    sql: 'DELETE FROM message_delivery WHERE messageId = ?',
    params: [message.id],  // Valid ID
  });
  // ...
}
```

**Rationale:**
- Delivery tracking is only relevant AFTER a message is sent to Firebase
- Messages with only `localId` are pending/unsent
- Delivery records should only be created when the message gets a real Firebase `id`

### Fix 2: Clear Text Field Immediately
**File:** `src/screens/ConversationScreen.tsx`

**Before:**
```typescript
const handleSendMessage = async () => {
  const messageContent = messageText.trim();
  
  try {
    setSending(true);
    // ... async operations ...
    setMessageText('');  // Cleared later ❌
  } catch (error) {
    // If error, never cleared! ❌
  }
}
```

**After:**
```typescript
const handleSendMessage = async () => {
  const messageContent = messageText.trim();
  
  // Clear immediately, before any async operations ✅
  setMessageText('');
  
  try {
    setSending(true);
    // ... async operations ...
  } catch (error) {
    // Field already cleared ✅
  }
}
```

**Rationale:**
- Text field should clear immediately when user hits send (optimistic UI)
- User should be able to type next message immediately
- Even if send fails, text field stays clear (message is in UI bubble)

### Fix 3: Clean Error Recovery
**File:** `src/screens/ConversationScreen.tsx`

**Added:**
```typescript
if (!enqueueResult.success) {
  console.error('Failed to enqueue message:', enqueueResult.error);
  // Remove the failed message from UI
  setMessages(prev => prev.filter(m => m.localId !== localId));
  // TODO: Show error to user (Snackbar or Alert)
  return;
}
```

**Rationale:**
- If enqueue fails, remove the optimistic message bubble
- Text field already cleared, so user can try again
- Prevents "stuck" messages in UI
- `finally` block ensures `setSending(false)` always runs

## 🧪 Testing

### Test Scenario 1: Airplane Mode Send (Primary Bug)
**Steps:**
1. Enable airplane mode
2. Type message "Test offline"
3. Hit send

**Expected Before Fix:**
- ❌ Error: "Transaction failed"
- ❌ Text field frozen
- ❌ Can't type new message

**Expected After Fix:**
- ✅ Text field clears immediately
- ✅ Message appears with gray checkmark
- ✅ Can type next message immediately
- ✅ No console errors
- ✅ When back online, message sends automatically

### Test Scenario 2: Online Send (Regression Check)
**Steps:**
1. Ensure online
2. Type message "Test online"
3. Hit send

**Expected:**
- ✅ Text field clears immediately
- ✅ Message appears with gray checkmark
- ✅ Checkmarks update: gray → blue (delivered/read)
- ✅ No errors

### Test Scenario 3: Multiple Offline Messages
**Steps:**
1. Enable airplane mode
2. Send 3 messages rapidly
3. Disable airplane mode

**Expected:**
- ✅ All 3 messages appear immediately
- ✅ Text field clears after each send
- ✅ When back online, all send in order
- ✅ Checkmarks update for all

## 📊 Root Cause Analysis

### Why Was This Happening?

1. **Database Schema Design:**
   - `message_delivery` table has foreign key constraint to `messages.id`
   - Trying to insert with empty `id` violates constraint

2. **Queue Design Pattern:**
   - Messages created with `localId` first (client-side ID)
   - Firebase assigns real `id` when sent
   - Local DB needs to handle both states

3. **Transaction Safety:**
   - SQLite transaction wraps all queries together
   - Any failure rolls back entire transaction
   - Foreign key violation caused full rollback

### The Lifecycle of a Message ID

```
┌────────────────────────────────────────────────────────┐
│                    MESSAGE CREATED                     │
│                                                        │
│  id: ''                    ← Empty (not sent yet)     │
│  localId: 'local_123'      ← Client-generated        │
│  status: 'sending'                                    │
└────────────────────────────────────────────────────────┘
                        ↓
            [Enqueued to SQLite]
                        ↓
            [Network available?]
                        ↓
              [Sent to Firebase]
                        ↓
┌────────────────────────────────────────────────────────┐
│                  FIREBASE CONFIRMS                     │
│                                                        │
│  id: '-Oc75AMJR_jz...'    ← Firebase-generated       │
│  localId: 'local_123'      ← Preserved               │
│  status: 'sent'                                       │
└────────────────────────────────────────────────────────┘
                        ↓
         [Now delivery tracking can begin]
                        ↓
┌────────────────────────────────────────────────────────┐
│              DELIVERY TRACKING POSSIBLE                │
│                                                        │
│  deliveredTo: ['user2']                               │
│  readBy: ['user2']                                    │
│                                                        │
│  message_delivery table:                              │
│    messageId: '-Oc75AMJR_jz...' ✅ Valid FK           │
└────────────────────────────────────────────────────────┘
```

## 🎯 Key Takeaway

**The fix ensures:**
1. ✅ Delivery tracking only happens for messages with real Firebase IDs
2. ✅ UI stays responsive even if operations fail
3. ✅ Text field clears immediately for better UX
4. ✅ Error recovery removes failed messages cleanly

**The pattern:**
- **Optimistic UI first** (clear input, show message)
- **Then async operations** (enqueue, send)
- **If failure** (rollback optimistic changes)

---

**Status**: ✅ Fixed and tested
**Branch**: block7
**Date**: October 21, 2025

