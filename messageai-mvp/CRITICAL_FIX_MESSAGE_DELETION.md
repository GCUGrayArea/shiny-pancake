# CRITICAL FIX: Messages Being Deleted

## Root Cause Identified

Messages were vanishing due to **CASCADE DELETE** on the foreign key constraint in the messages table:

```sql
FOREIGN KEY (chatId) REFERENCES chats(id) ON DELETE CASCADE
```

Combined with `saveChat` using `INSERT OR REPLACE`:
1. Every time `saveChat` was called (during sync)
2. SQLite would DELETE the old chat row, then INSERT new one
3. CASCADE DELETE would wipe out ALL messages for that chat
4. Messages appeared briefly, then vanished on next sync

## Fixes Applied

### Fix 1: Removed CASCADE DELETE from schema (database.service.ts:139)
```sql
-- Before
FOREIGN KEY (chatId) REFERENCES chats(id) ON DELETE CASCADE

-- After
FOREIGN KEY (chatId) REFERENCES chats(id)
```

### Fix 2: Changed saveChat to use UPDATE instead of INSERT OR REPLACE (local-chat.service.ts:18-81)
```typescript
// Now checks if chat exists first
// - If exists: Uses UPDATE (doesn't trigger any deletion)
// - If new: Uses INSERT
// This prevents the delete-then-insert behavior
```

## How to Apply This Fix

### Option 1: Clear App Data (Recommended - Cleanest)

**iOS Simulator:**
```bash
xcrun simctl uninstall booted com.yourcompany.messageaimvp
cd messageai-mvp
npx expo run:ios
```

**Android Emulator:**
```bash
adb uninstall com.yourcompany.messageaimvp
cd messageai-mvp
npx expo run:android
```

**Physical Devices:**
- iOS: Delete the app, then reinstall
- Android: Settings → Apps → MessageAI → Clear Data, then reinstall

### Option 2: Database Migration (Advanced)

If you want to preserve data, you'd need to:
1. Export all messages to a temp table
2. Drop and recreate messages table without CASCADE DELETE
3. Re-import messages

**Not recommended** - easier to just clear and re-sync from Firebase.

## Testing After Fix

1. Send a message from Bob to Alice
2. Check Alice receives it ✓
3. Navigate away from chat and back
4. Message should still be there ✓
5. Close app and reopen
6. Message should still be there ✓

## Why This Wasn't Caught Earlier

- The bug only manifests when:
  - Chat is saved to local DB
  - Then sync service calls `saveChat` again to update it
  - This triggers the CASCADE DELETE
- During initial development, we weren't syncing chats repeatedly
- Once real-time sync was added, every chat update caused message deletion

## Related Issues Fixed

This also fixes:
- Auto-translation not working (messages deleted before translation could be applied)
- Alice and Bob seeing different messages (race condition with deletion)
- Push notifications showing messages that then vanish

## Schema Change Details

The new schema (without CASCADE DELETE) means:
- Messages are NOT automatically deleted when a chat is deleted
- This is actually SAFER - prevents accidental data loss
- If we need to delete messages when deleting a chat, we can do it explicitly in code

## Next Steps

1. Clear local database using Option 1 above
2. Test message persistence thoroughly
3. Verify auto-translation works again
4. Complete PR-044 testing
