# CRITICAL FIX: Foreign Key Constraint Failure for New Users

## Issue: FOREIGN KEY constraint failed

**Severity**: CRITICAL (blocks new user onboarding)  
**Discovered**: During demo preparation  
**Status**: ✅ FIXED

---

## Problem Description

When a brand new user logs in and tries to open an existing chat with another user, the app crashes with:

```
ERROR  Failed to sync chat to local: Transaction failed: Call to function 'NativeStatement.finalizeAsync' has been rejected.
→ Caused by: Error code : FOREIGN KEY constraint failed
```

### Root Cause

The SQLite database has foreign key constraints:
- `chat_participants` table has foreign keys to both `chats` and `users` tables
- When syncing chats from Firebase, the code was trying to save chats to local DB BEFORE saving participant users
- This violated the foreign key constraint because participant user IDs didn't exist in the users table yet

### Affected Scenarios

1. **Initial Sync**: New user logs in for the first time
2. **Real-time Sync**: New chat created that includes users not yet in local DB

### Error Flow

```
1. New user (demo@ema.il) logs in
2. initialSync() runs
3. Fetches user's chats from Firebase
4. Tries to save chat to local DB → FAILS (participants don't exist yet)
5. Then tries to fetch and save participants → Too late!
```

---

## Solution

**Fix Order of Operations**: Sync participant users FIRST, then sync the chat.

### Changes Made

**File**: `src/services/sync.service.ts`

#### Fix 0: Helper Function (lines 77-92)

Created `syncChatWithParticipants()` helper function that:
1. Syncs all participant users first
2. Then syncs the chat
3. Used by message sync fallback logic

```typescript
async function syncChatWithParticipants(chat: Chat): Promise<void> {
  // Sync all participants first
  for (const participantId of chat.participantIds) {
    const userResult = await FirebaseUserService.getUserFromFirebase(participantId);
    if (userResult.success && userResult.data) {
      await syncUserToLocal(userResult.data);
    }
  }
  // Now sync the chat
  await syncChatToLocal(chat);
}
```

#### Fix 1: Message Sync Fallback (lines 99-138)

When a message arrives but the chat doesn't exist locally:
- Now uses `syncChatWithParticipants()` helper
- Also ensures message sender exists in local DB
- Prevents FK violations in fallback scenarios

#### Fix 2: Initial Sync (lines 193-215)

**Before** (WRONG order):
```typescript
for (const chat of chatsResult) {
  // Sync chat to local
  await syncChatToLocal(chat);  // ❌ FAILS - participants don't exist
  
  // Fetch participants and sync them
  for (const participantId of chat.participantIds) {
    // ... sync participants
  }
}
```

**After** (CORRECT order - FINAL FIX):
```typescript
for (const chat of chatsResult) {
  // IMPORTANT: Sync participants FIRST to avoid foreign key constraints
  // Fetch participants and sync them (INCLUDING current user!)
  for (const participantId of chat.participantIds) {
    // ⚠️ CRITICAL: Don't skip current user!
    // Original code had: if (participantId !== userId)
    // This caused FK violations because current user wasn't in users table
    const userResult = await FirebaseUserService.getUserFromFirebase(participantId);
    if (userResult.success && userResult.data) {
      await syncUserToLocal(userResult.data);  // ✅ Save ALL participants first
    }
  }
  
  // Now sync chat to local (after participants are in DB)
  await syncChatToLocal(chat);  // ✅ Now succeeds
}
```

**Additional Critical Detail**: The initial fix still had `if (participantId !== userId)` which skipped syncing the current user. This caused FK violations because the current user is ALSO a participant and needs to be in the users table. Final fix removed this check to sync ALL participants.

#### Fix 3: Real-time Sync (lines 253-274)

Added the same participant-first logic to `startRealtimeSync()` to handle new chats coming in via Firebase listeners.

---

## All Code Paths Fixed

1. ✅ **Initial sync on login** - Syncs ALL participants (including current user) before chats
2. ✅ **Real-time sync** - Syncs ALL participants (including current user) before new chats
3. ✅ **Message sync fallback** - Uses helper to sync participants + chat when chat missing
4. ✅ **Sender check** - Ensures message sender exists before saving message

### Two-Stage Fix

**Stage 1** (Initial): Changed sync order to sync participants before chats
- ❌ Still had bug: skipped current user with `if (participantId !== userId)`
- ❌ FK constraint still failed on login

**Stage 2** (Final): Removed userId skip check
- ✅ Now syncs ALL participants including current user
- ✅ No more FK constraint failures
- ✅ Working correctly

---

## Verification

**Test Scenario**:
1. Create a brand new user account
2. Have another user send them a message (creates a chat)
3. New user logs in
4. New user opens the chat

**Before Fix**:
- ❌ FOREIGN KEY constraint failed
- ❌ Chat doesn't appear in chat list
- ❌ Messages don't sync
- ❌ App effectively broken for new users

**After Fix**:
- ✅ Chat syncs successfully
- ✅ Participants synced to local DB
- ✅ Messages appear correctly
- ✅ No errors

---

## Impact

**Critical Impact**: This bug would have blocked ALL new user onboarding in production. Any new user trying to open an existing chat would have gotten database errors.

**Why Missed Earlier**: 
- Unit tests don't catch SQLite foreign key issues (use mocks)
- Integration tests were run with users that already had local data
- Only caught when testing with truly fresh user accounts

**Good Catch**: Found during demo preparation before launch! 🎯

---

## Related Issues

This fix also resolves:
- Chat not appearing in chat list for new users
- Messages not syncing for new users
- Notification failures ("Failed to fetch chat for notification")

---

## Prevention

**For Future Development**:
1. Always consider foreign key constraints when designing sync order
2. Test with truly fresh accounts (clear app data between tests)
3. Add integration tests that start with empty local DB
4. Consider using database transactions to ensure atomicity

---

## Technical Details

### SQLite Schema (Reminder)

```sql
CREATE TABLE chat_participants (
    chatId TEXT NOT NULL,
    userId TEXT NOT NULL,
    unreadCount INTEGER DEFAULT 0,
    PRIMARY KEY (chatId, userId),
    FOREIGN KEY (chatId) REFERENCES chats(id),  -- ← Requires chat exists
    FOREIGN KEY (userId) REFERENCES users(uid)  -- ← Requires user exists
);
```

### Sync Order Requirements

**CORRECT Order**:
1. Sync users (no dependencies)
2. Sync chats (depends on users existing)
3. Sync messages (depends on chats and users existing)

**Violated By**:
- Original code synced chats before ensuring all participant users existed

---

## Files Modified

- `src/services/sync.service.ts` (2 locations)
  - `initialSync()` function (lines 173-195)
  - `startRealtimeSync()` function (lines 233-254)

---

**Status**: ✅ FIXED & VERIFIED (2 fixes applied)  
**Date**: October 22, 2025  
**Found During**: Demo preparation  
**Severity**: CRITICAL (blocks new users)  
**Resolution**: 
1. Sync participants before chats
2. Include current user in participant sync (don't skip with userId check)

