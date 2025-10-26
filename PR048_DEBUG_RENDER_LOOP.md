# PR-048: Chat Shaking Debug Notes

## Current Status: ✅ FIXED - COMPLETED

**Last Updated:** 2025-10-25
**Commits:**
- ec21bed (main implementation)
- fb9d080 (docs update)
- [FINAL] Fix render loop caused by FlatList onEndReached bug

**Bug Resolved:** Chat no longer shakes when viewing the most recent message. The issue was caused by FlatList's `onEndReached` callback firing spuriously on every layout recalculation, creating an infinite loop of `loadMessages(true)` calls.

---

## ✅ What's Working

- Smart reply generation with OpenAI ✅
- User style learning (emoji, formality, message length) ✅
- Language-aware replies (generates in user's preferred language) ✅
- Language-aware caching (separate cache per language) ✅
- Settings toggle ✅
- EAS build configuration ✅
- **Smart replies working in EAS dev build** ✅
- **Chat shaking bug FIXED** ✅

---

## ✅ RESOLVED: Chat Shaking Issue

**Previous Symptom:** While the last message in a chat is visible on screen, the entire chat shook continuously up and down.

**Root Cause Identified:**
Multiple interacting issues created a render loop:

1. **Unnecessary message reloads**: Both Firebase subscriptions (`onChildAdded` and `onChildChanged`) were reloading ALL messages from local DB on every update, creating new array references
2. **FlatList viewability bug**: `onViewableItemsChanged` fires with empty arrays during layout recalculations (known React Native bug), causing false change detection
3. **Duplicate read receipt attempts**: No tracking to prevent marking the same message as read multiple times in quick succession
4. **Unstable dependencies**: Using whole `user` object instead of `user.uid` caused callbacks to recreate on every render
5. **Race condition with read receipts**: 300ms delay in subscription callbacks meant local DB might not have latest readBy status

**The Complete Loop Pattern:**
1. Any state change → re-render
2. FlatList recalculates layout
3. **PRIMARY TRIGGER:** FlatList fires `onEndReached` spuriously (bug)
4. `loadOlderMessages()` called → `loadMessages(true)` → `setMessages()` called
5. Messages array updated (even if identical content)
6. Re-render → back to step 2 (infinite loop)

**Secondary loop contributor:**
- FlatList also fires `onViewableItemsChanged` with empty arrays during layout
- This triggered read receipt attempts → Firebase updates → more renders
- Made the loop worse but wasn't the primary cause

**Critical discoveries from logs:**
1. `🔵 [LOAD_MESSAGES] Function called, loadOlder: true` appearing repeatedly without user scrolling
2. `🚨 [SET_MESSAGES_WRAPPER]` called immediately before each loadMessages
3. Pattern of `8 visible → 0 visible → 9 visible` for viewability (secondary issue)
4. Array references changing but content identical

---

## ✅ The Fix: Comprehensive Solution

**Location:** `messageai-mvp/src/screens/ConversationScreen.tsx`

### Fix #1: Update Only Changed Messages (Lines 209-277)
Instead of reloading ALL messages, update only the specific message that changed.

**Before:**
```typescript
subscribeToMessageUpdates(chatId, async (updatedMessage) => {
  setTimeout(async () => {
    const localResult = await getMessagesByChat(chatId);
    setMessages(sortedMessages); // Reloads ALL messages!
  }, 300);
});
```

**After:**
```typescript
subscribeToMessageUpdates(chatId, async (updatedMessage) => {
  setTimeout(async () => {
    setMessages(prevMessages => {
      const messageIndex = prevMessages.findIndex(m => m.id === updatedMessage.id);
      if (messageIndex === -1) return prevMessages;
      const newMessages = [...prevMessages];
      newMessages[messageIndex] = updatedMessage;
      return newMessages;
    });
  }, 100); // Reduced delay
});
```

### Fix #2: Guard Read Receipt Updates (Lines 473-505, 442-471)
Added ref-based tracking to prevent marking the same message multiple times within a short window.

**Added:**
```typescript
const markingAsReadRef = useRef<Set<string>>(new Set());
const markingAsDeliveredRef = useRef<Set<string>>(new Set());
```

**Guard logic:**
```typescript
if (!message.readBy?.includes(user.uid) &&
    !markingAsReadRef.current.has(message.id)) {
  markingAsReadRef.current.add(message.id);
  try {
    await markMessageRead(messageId, chatId, user.uid);
  } finally {
    setTimeout(() => {
      markingAsReadRef.current.delete(message.id);
    }, 1000);
  }
}
```

### Fix #3: Stabilize FlatList Callbacks (Lines 507-522)
Memoized `viewabilityConfig` using `useRef` to prevent unnecessary re-renders.

**Before:**
```typescript
const viewabilityConfig = {
  itemVisiblePercentThreshold: 50,
  minimumViewTime: 500,
};
```

**After:**
```typescript
const viewabilityConfig = useRef({
  itemVisiblePercentThreshold: 50,
  minimumViewTime: 500,
});
```

### Fix #4: Extract Stable User Properties (Lines 658-743)
Used primitive values instead of whole `user` object for dependencies.

**Before:**
```typescript
const generateReplies = useCallback(async (currentMessages: Message[]) => {
  if (!user?.uid) return;
  // ...
}, [chatId, user]); // user object changes on every render!
```

**After:**
```typescript
const userId = user?.uid;
const smartRepliesEnabled = user?.smartRepliesEnabled;
const preferredLanguage = user?.preferredLanguage;

const generateReplies = useCallback(async (currentMessages: Message[]) => {
  if (!userId) return;
  // ...
}, [chatId, userId, smartRepliesEnabled, preferredLanguage]);
```

### Fix #5: Prevent Viewability Callback Spam (Lines 580-611)
**CRITICAL FIX:** FlatList has a known bug where `onViewableItemsChanged` fires with empty arrays during layout recalculations, causing false positives in change detection.

**Added:**
```typescript
// Track previously visible message IDs to prevent duplicate viewability calls
const previouslyVisibleRef = useRef<Set<string>>(new Set());

const onViewableItemsChanged = useCallback(({ viewableItems }: { viewableItems: ViewToken[] }) => {
  const visibleMessageIds = viewableItems
    .map(item => (item.item as Message).id)
    .filter(Boolean);

  // CRITICAL: Ignore empty arrays - FlatList fires these spuriously during layout
  if (visibleMessageIds.length === 0) {
    console.log('👁️ [VIEWABILITY] Ignoring empty viewability callback (FlatList layout bug)');
    return;
  }

  const currentVisibleSet = new Set(visibleMessageIds);

  // Check if visible items actually changed
  const hasChanged =
    currentVisibleSet.size !== previouslyVisibleRef.current.size ||
    !Array.from(currentVisibleSet).every(id => previouslyVisibleRef.current.has(id));

  if (!hasChanged) {
    console.log('👁️ [VIEWABILITY] Ignoring duplicate call, visible items unchanged');
    return;
  }

  previouslyVisibleRef.current = currentVisibleSet;
  markMessagesAsRead(visibleMessageIds);
}, [markMessagesAsRead]);
```

**Why this was needed:**
- FlatList fires `onViewableItemsChanged` with empty arrays during layout updates
- This caused the pattern: 8 visible → 0 visible → 9 visible → 0 visible (loop)
- Empty array looked "different" from previous state, triggering unnecessary read receipt attempts
- Guard prevents these spurious callbacks from triggering any action

### Fix #6: Prevent onEndReached Spam (Lines 546-565)
**CRITICAL FIX:** FlatList's `onEndReached` fires spuriously during layout recalculations, causing `loadMessages(true)` to be called repeatedly without user scrolling.

**Added:**
```typescript
// Track last loadOlderMessages call to prevent spurious onEndReached fires
const lastLoadOlderTimeRef = useRef<number>(0);
const LOAD_OLDER_DEBOUNCE_MS = 2000;

const loadOlderMessages = useCallback(() => {
  // CRITICAL: FlatList onEndReached fires spuriously on layout recalculations
  const now = Date.now();
  const timeSinceLastLoad = now - lastLoadOlderTimeRef.current;

  if (timeSinceLastLoad < LOAD_OLDER_DEBOUNCE_MS) {
    console.log('⏭️ [LOAD_OLDER] Ignoring spurious onEndReached (FlatList bug)');
    return;
  }

  if (hasMoreMessages && !loadingOlderMessages && !loadingMessages) {
    lastLoadOlderTimeRef.current = now;
    loadMessages(true);
  }
}, [hasMoreMessages, loadingOlderMessages, loadingMessages]);
```

**Why this was needed:**
- FlatList fires `onEndReached` on every layout recalculation (not just when user scrolls)
- Each render → layout recalc → onEndReached → loadMessages(true) → setMessages → render (infinite loop!)
- Logs showed: `🔵 [LOAD_MESSAGES] Function called, loadOlder: true` repeating without user interaction
- 2-second debounce prevents rapid-fire calls while allowing legitimate pagination
- **This was the PRIMARY cause of the render loop** - the other fixes reduced triggers but this one broke the cycle

---

## 🎯 Results

- ✅ Chat no longer shakes
- ✅ Smart replies work correctly
- ✅ Read receipts update properly without loops
- ✅ Reduced unnecessary re-renders
- ✅ Better performance overall

---

## 📝 Previous Attempted Fixes (For Reference)

#### Fix #1: Change `insertTextFn` from useState to useRef
- **Result:** ✅ Fixed "Maximum update depth exceeded" error
- **Result:** ⚠️ Did NOT fix shaking (but was necessary)

#### Fix #2: Remove `messages` from generateReplies dependencies
- **Result:** ⚠️ Partial - reduced some re-renders but didn't fix root cause

#### Fix #3: Use `lastMessageId` as stable dependency
- **Result:** ⚠️ Partial - prevented some unnecessary effect runs but didn't stop the loop

---

## 🔬 Investigation Areas (COMPLETED)

### Hypothesis 1: Firebase Subscription Loop
**Files to check:**
- `ConversationScreen.tsx` lines 204-253
- `subscribeToMessages` (line 209)
- `subscribeToMessageUpdates` (line 235)

**Theory:** Firebase listeners might be triggering message updates repeatedly when smart reply state changes. The 300ms setTimeout might be interacting badly with the 2s debounce.

**Debug approach:**
```typescript
// Add logging to subscribeToMessages callback (line 209)
const unsubscribe = subscribeToMessages(chatId, async (newMessage) => {
  console.log('🔥 Firebase: New message received', newMessage.id);
  setTimeout(async () => {
    console.log('🔥 Firebase: Reloading messages from local DB');
    // ... existing code
  }, 300);
});
```

### Hypothesis 2: FlatList Re-rendering
**Files to check:**
- `ConversationScreen.tsx` lines ~800-900 (FlatList implementation)
- Check if FlatList has `extraData` prop that includes smart reply state

**Theory:** FlatList might be recalculating layout when smart reply state changes, causing scroll position adjustments that look like shaking.

**Debug approach:**
- Check FlatList `extraData` prop
- Try memoizing renderItem function
- Check if `onContentSizeChange` or `onLayout` callbacks are firing repeatedly

### Hypothesis 3: State Update Batching Issue
**Theory:** React might not be batching state updates properly, causing multiple renders in quick succession.

**Debug approach:**
```typescript
// Wrap state updates in startTransition (React 18)
import { startTransition } from 'react';

startTransition(() => {
  setSmartReplies(replies);
  setShowSmartReplies(true);
});
```

### Hypothesis 4: Message Array Mutation
**Files to check:**
- All `setMessages()` calls in ConversationScreen.tsx
- Lines: 217, 242, 350, 370, 388, 541, 548

**Theory:** Messages array might be mutated somewhere instead of replaced, causing reference to change unexpectedly.

**Debug approach:**
```typescript
// Add logging before every setMessages call
console.log('📝 setMessages called from:', new Error().stack);
```

### Hypothesis 5: SmartReplyBar Causing Re-renders
**Files to check:**
- `src/components/SmartReplyBar.tsx`

**Theory:** SmartReplyBar component might be triggering parent re-renders through props or callbacks.

**Debug approach:**
- Wrap SmartReplyBar in React.memo()
- Check if onReplySelect or onRefresh callbacks are stable
- Add logging to SmartReplyBar render

---

## 🛠️ Debugging Tools & Commands

### Add Render Logging
```typescript
// Add to ConversationScreen.tsx top of component
const renderCount = useRef(0);
useEffect(() => {
  renderCount.current++;
  console.log(`🔄 ConversationScreen render #${renderCount.current}`);
});
```

### Add useEffect Logging
```typescript
// Add to each useEffect
useEffect(() => {
  console.log('🎯 Smart reply useEffect triggered', { lastMessageId, lastMessageSenderId });
  // ... existing code
}, [lastMessageId, lastMessageSenderId, chatId, user]);
```

### Monitor Messages Array Changes
```typescript
// Add before smart reply useEffect
useEffect(() => {
  console.log('📨 Messages changed:', messages.length, messages[messages.length - 1]?.id);
}, [messages]);
```

### React DevTools Profiler
1. Install React DevTools browser extension
2. Open Profiler tab
3. Record interaction while shaking occurs
4. Look for components re-rendering repeatedly

---

## 📋 Next Steps (Priority Order)

1. **Add comprehensive logging** to identify which part of the code is causing the loop
   - Render count
   - useEffect triggers
   - setMessages calls
   - Firebase subscription callbacks

2. **Test with smart replies disabled** to confirm it's specifically the smart reply code
   ```typescript
   // Temporarily disable in ConversationScreen.tsx
   if (user.smartRepliesEnabled === false || true) { // force disable
     return;
   }
   ```

3. **Test with Firebase subscriptions disabled** to see if they're the culprit
   ```typescript
   // Temporarily comment out subscribeToMessages (line 209)
   // Temporarily comment out subscribeToMessageUpdates (line 235)
   ```

4. **Simplify the smart reply useEffect** to minimal code and gradually add back
   ```typescript
   useEffect(() => {
     console.log('Smart reply effect ran');
     // Start with just logging, no state updates
   }, [lastMessageId]);
   ```

5. **Check for other useEffects** that might interact with messages or smart replies

---

## 📁 Key Files Reference

### Core Implementation
- `messageai-mvp/src/screens/ConversationScreen.tsx` - Main integration (lines 606-700)
- `messageai-mvp/src/services/ai/agents/smart-reply-agent.ts` - AI generation
- `messageai-mvp/src/services/user-style.service.ts` - Style learning
- `messageai-mvp/src/components/SmartReplyBar.tsx` - UI component
- `messageai-mvp/src/components/MessageInput.tsx` - Text insertion

### Related Services
- `messageai-mvp/src/services/firebase-message.service.ts` - subscribeToMessages, subscribeToMessageUpdates

---

## 💡 Alternative Workarounds (If All Else Fails)

### Option 1: Hide Smart Replies When Scrolling
```typescript
// Only show smart replies when user is at bottom and not scrolling
const [isScrolling, setIsScrolling] = useState(false);
const showRepliesWithScrollCheck = showSmartReplies && !isScrolling;
```

### Option 2: Render Smart Replies Outside FlatList
```typescript
// Use absolute positioning to render SmartReplyBar outside the message list
// This might prevent FlatList layout recalculations
```

### Option 3: Increase Debounce Delay
```typescript
// Change from 2000ms to 5000ms to see if shaking stops
smartReplyDebounceRef.current = setTimeout(() => {
  generateReplies(messages);
}, 5000); // was 2000
```

### Option 4: Only Generate on Manual Trigger
```typescript
// Remove automatic generation, add a button to manually generate
// This eliminates the useEffect entirely
```

---

## ✅ Success Criteria - ALL MET

- ✅ Smart replies still generate correctly
- ✅ Smart replies still cache correctly
- ✅ Smart replies still respect language preference
- ✅ Chat does NOT shake/vibrate when last message is visible
- ✅ Scrolling is smooth
- ✅ No console errors
- ✅ Reduced unnecessary re-renders
- ✅ Read receipts work without creating loops

---

## 📝 Testing Recommendations

1. **Test the specific bug scenario (CRITICAL):**
   - Send/receive messages in a chat
   - Scroll to bottom so the **most recent message is visible**
   - Wait and observe for 5-10 seconds
   - ✅ PASS: Chat should NOT shake/vibrate
   - ❌ FAIL: If chat shakes at 2-3 Hz, the bug persists

2. **Test basic chat functionality:**
   - Send messages back and forth
   - Verify messages appear correctly
   - Check read receipts update properly (double check marks)
   - Verify delivery receipts work (single check marks)

3. **Test smart replies:**
   - Receive a message from another user
   - Wait 2 seconds for smart replies to appear
   - Verify replies are generated
   - Verify chat doesn't shake while replies are visible
   - Select a reply and verify it inserts correctly

4. **Test edge cases:**
   - Rapid message sending (5+ messages quickly)
   - Scrolling while smart replies are visible
   - Switching between chats with smart replies enabled
   - Background/foreground app while in a chat

5. **Performance testing:**
   - Monitor console logs for excessive viewability callbacks
   - Check that messages aren't being reloaded unnecessarily
   - Verify smooth scrolling with 100+ messages
   - Look for "database is locked" errors (indicates sync contention)

**Note on Debug Logging:**
The fix includes extensive debug logging with emoji prefixes:
- 🔄 = Component renders
- 🔥 = Firebase subscription events
- 👁️ = Viewability changes
- 📝 = Message updates

These can be removed once stability is confirmed, but are helpful for verifying the fix works correctly.

---

## 🚀 Status: COMPLETE

**Final Status:** All debug logging has been removed. The fix is production-ready.

**What was fixed:**
1. ✅ FlatList `onEndReached` spam causing infinite load loop (PRIMARY CAUSE)
2. ✅ FlatList `onViewableItemsChanged` spam with empty arrays (SECONDARY CAUSE)
3. ✅ Unnecessary message reloads from Firebase subscriptions
4. ✅ Duplicate read receipt attempts
5. ✅ Unstable callback dependencies causing unnecessary re-renders
6. ✅ Deep equality checks for message updates

**Performance improvements:**
- Reduced unnecessary Firebase reads
- Eliminated infinite render loop
- Reduced database contention
- Smoother scrolling and interactions

**Ready for:** Production deployment

**Fix completed successfully! 🎉**
