# Block 7: Single Queue Processor Architecture

## 🎯 Problem

Multiple components were calling `processQueue()`, causing:
- **Triple-send bug**: Messages sent 3 times
- **Race conditions**: Concurrent queue processing
- **Unclear responsibility**: Who owns queue processing?

### What Was Happening

```
ConversationScreen:
  └─> enqueueMessage()
  └─> processQueue() ❌ (Attempt 1)

NetworkProvider (on reconnection):
  └─> processQueue() ❌ (Attempt 2)

Retry Logic:
  └─> processQueue() ❌ (Attempt 3?)

Result: Message sent 3 times! 
```

## ✅ Solution: Single Source of Truth

**NetworkProvider is now the ONLY place that processes the queue.**

### New Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    NETWORK PROVIDER                         │
│              (Single Queue Processor)                       │
│                                                             │
│  Processes queue when:                                      │
│  1. App initializes (if online)                            │
│  2. Network reconnects (offline → online)                  │
│  3. Component triggers it (new message enqueued)           │
│                                                             │
│  Safety features:                                           │
│  - Prevents concurrent processing (isProcessing flag)      │
│  - Only processes when online                              │
│  - Logs reason for each processing attempt                 │
└─────────────────────────────────────────────────────────────┘
              ↑                    ↑                  ↑
              │                    │                  │
         Initial Load         Reconnection     triggerQueueProcessing()
              │                    │                  │
              │                    │                  └─ Called by components
              │                    │                     when they enqueue
              │                    │
        If messages        Network state
        queued from       changes from
        previous          offline → online
        session
```

## 🔧 Implementation

### NetworkProvider Changes

**Added:**
1. `isProcessing` state - prevents concurrent queue processing
2. `processQueueSafely()` - single processor with guards
3. `triggerQueueProcessing()` - exposed to components via context

**Guards in processQueueSafely():**
```typescript
// Guard 1: Already processing?
if (isProcessing) {
  console.log('Queue already processing, skipping');
  return;
}

// Guard 2: Online?
if (!online) {
  console.log('Offline, not processing queue');
  return;
}

// Process!
setIsProcessing(true);
try {
  await processQueue();
} finally {
  setIsProcessing(false);
}
```

### ConversationScreen Changes

**Before:**
```typescript
await enqueueMessage(message);
await processQueue();  // ❌ Direct call
```

**After:**
```typescript
await enqueueMessage(message);
triggerQueueProcessing();  // ✅ Trigger via context
```

## 📊 Flow Diagrams

### Online Message Send
```
User sends message
    ↓
ConversationScreen:
  ├─ Create message (status: 'sending')
  ├─ Add to UI state
  ├─ enqueueMessage() → SQLite
  └─ triggerQueueProcessing()
    ↓
NetworkProvider:
  ├─ Check: already processing? No
  ├─ Check: online? Yes
  ├─ setIsProcessing(true)
  ├─ processQueue()
  │   ├─ Get pending messages
  │   ├─ Send to Firebase
  │   ├─ Update SQLite (id + status: 'sent')
  │   └─ Clean up retry state
  └─ setIsProcessing(false)
    ↓
Real-time listener:
  ├─ Receives message with Firebase ID
  ├─ Matches by localId
  └─ Updates UI state
    ↓
Status indicators update: gray → blue
```

### Offline Message Send → Reconnect
```
User sends message (offline)
    ↓
ConversationScreen:
  ├─ Create message (status: 'sending')
  ├─ Add to UI state (gray checkmark)
  ├─ enqueueMessage() → SQLite
  └─ triggerQueueProcessing()
    ↓
NetworkProvider:
  ├─ Check: online? No
  └─ Skip processing ⏸️
    ↓
[Message queued in SQLite, user sees gray checkmark]
    ↓
[User closes app, time passes...]
    ↓
[Network reconnects]
    ↓
NetworkProvider:
  ├─ Detects: offline → online
  ├─ Check: already processing? No
  ├─ setIsProcessing(true)
  ├─ processQueue()
  │   ├─ Get pending messages
  │   ├─ Send to Firebase
  │   ├─ Update SQLite (id + status: 'sent')
  │   └─ Clean up retry state
  └─ setIsProcessing(false)
    ↓
Real-time listener:
  ├─ Receives message with Firebase ID
  ├─ Matches by localId
  └─ Updates UI state
    ↓
Status indicators update: gray → blue
```

### App Reopens with Queued Messages
```
App starts (messages queued from previous session)
    ↓
NetworkProvider initialization:
  ├─ Check network state
  ├─ Online? Yes
  └─ processQueueSafely('initial load')
    ↓
    ├─ Get pending messages from SQLite
    ├─ Send to Firebase
    ├─ Update statuses
    └─ Messages sent automatically ✅
```

## 🔒 Safety Features

### 1. Prevents Concurrent Processing
```typescript
if (isProcessing) {
  console.log('Queue already processing, skipping');
  return;
}
```

**Prevents:**
- Double-processing if triggered quickly multiple times
- Race conditions from simultaneous calls

### 2. Online Check
```typescript
if (!online) {
  console.log('Offline, not processing queue');
  return;
}
```

**Prevents:**
- Attempting to send while offline
- Wasted processing cycles

### 3. Logged Reasons
```typescript
processQueueSafely('new message enqueued');
processQueueSafely('reconnection');
processQueueSafely('initial load');
```

**Benefits:**
- Debuggable - know why queue was processed
- Traceable - can follow message flow in logs

## 📝 API

### For Components (like ConversationScreen)

```typescript
const { triggerQueueProcessing } = useNetwork();

// After enqueueing a message:
await enqueueMessage(message);
triggerQueueProcessing();  // Ask NetworkProvider to process
```

**DO:**
- ✅ Call after enqueueing messages
- ✅ Call from any component that enqueues

**DON'T:**
- ❌ Call processQueue() directly
- ❌ Implement your own queue processing
- ❌ Worry about online state (NetworkProvider handles it)

## 🧪 Testing

### Test 1: Single Send (Online)
1. User sends message while online
2. **Expected:**
   - Console: "Processing queue (new message enqueued)"
   - Console: "Queue processed - sent: 1, failed: 0"
   - Message appears ONCE ✅

### Test 2: No Double Processing
1. User sends 5 messages rapidly
2. **Expected:**
   - First: "Processing queue"
   - Next 4: "Queue already processing, skipping"
   - All 5 messages sent (but queue processed once) ✅

### Test 3: Offline → Online
1. User sends message offline
2. **Expected:** "Offline, not processing queue"
3. Network reconnects
4. **Expected:**
   - "Connection restored"
   - "Processing queue (reconnection)"
   - "Queue processed - sent: 1"
   - Message sent ✅

### Test 4: Initial Load with Queued Messages
1. App closed with messages queued
2. App reopens (online)
3. **Expected:**
   - "Processing queue (initial load)"
   - "Queue processed - sent: N"
   - Messages sent automatically ✅

## 🔍 Debugging

### Look for these log patterns:

**Successful Send:**
```
✅ ConversationScreen: Message enqueued successfully
🔄 NetworkProvider: Processing queue (new message enqueued)
✅ NetworkProvider: Queue processed - sent: 1, failed: 0
```

**Offline:**
```
✅ ConversationScreen: Message enqueued successfully
📴 NetworkProvider: Offline, not processing queue
```

**Prevented Concurrent Processing:**
```
⏭️ NetworkProvider: Queue already processing, skipping (new message enqueued)
```

**Reconnection:**
```
🌐 NetworkProvider: Connection restored
🔄 NetworkProvider: Processing queue (reconnection)
✅ NetworkProvider: Queue processed - sent: N, failed: 0
```

## 💡 Key Benefits

1. **Single Responsibility**: NetworkProvider owns queue processing
2. **No Race Conditions**: isProcessing flag prevents concurrent processing
3. **Predictable**: Clear triggers (new message, reconnection, initial load)
4. **Debuggable**: Logged reasons for every processing attempt
5. **Efficient**: No redundant processing

## ⚠️ Gray Checkmarks Issue

If checkmarks stay gray after sending, check:

1. **Is message getting Firebase ID?**
   - Look for message ID in Firebase console
   - Check real-time listener logs

2. **Is status being updated in SQLite?**
   - Check: "Queue processed - sent: 1"
   - Verify message updated with status: 'sent'

3. **Is real-time listener matching?**
   - Look for: "Received message update: <id>"
   - Check if localId matching works

4. **Is status progression logic blocking?**
   - Review: markMessagesAsDelivered() requires status === 'sent'
   - Review: markMessagesAsRead() requires status === 'delivered'

---

**Status**: ✅ Implemented and tested  
**Branch**: block7  
**Date**: October 21, 2025  
**Architecture**: Single Source of Truth pattern

