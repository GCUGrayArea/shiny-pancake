# MessageAI MVP - Task Breakdown by Dependency Chain

---

## Block 1: Foundation & Project Setup

### PR-001: Project Initialization & Configuration
**Dependencies:** None  
**Estimated Time:** 30 minutes  
**Prerequisites:** ✅ Ready to start

**Tasks:**
1. Initialize Expo project with TypeScript
2. Install core dependencies:
   - Firebase SDK (Auth, RTDB, Storage, Messaging)
   - Expo SQLite
   - Expo SecureStore
   - Expo ImagePicker
   - Expo Notifications
   - React Navigation
   - React Native Paper or NativeBase
3. Set up project structure:
   ```
   /src
     /components
     /screens
     /services
     /hooks
     /utils
     /contexts
     /types
     /constants
     /__tests__
   ```
4. Configure TypeScript (tsconfig.json)
5. Configure Jest for testing
6. Create .env.example with Firebase config placeholders
7. Add .gitignore (exclude .env, node_modules)
8. Create README.md with setup instructions

**Validation:**
- [ ] Project builds successfully
- [ ] TypeScript compiles without errors
- [ ] Can run on Expo Go
- [ ] Test suite runs (even with no tests)

---

### PR-002: Firebase Backend Setup
**Dependencies:** None  
**Estimated Time:** 45 minutes  
**Prerequisites:** ✅ Ready to start

**Tasks:**
1. Create Firebase project
2. Enable Firebase Authentication (email/password)
3. Create Firebase Realtime Database
4. Configure Firebase Storage
5. Set up Firebase Cloud Messaging
6. Write Firebase RTDB Security Rules:
   ```json
   {
     "rules": {
       "users": {
         "$uid": {
           ".read": "auth != null",
           ".write": "auth != null && auth.uid == $uid"
         }
       },
       "chats": {
         "$chatId": {
           ".read": "auth != null && data.child('participantIds').child(auth.uid).val() == true",
           ".write": "auth != null && data.child('participantIds').child(auth.uid).val() == true"
         }
       },
       "messages": {
         "$chatId": {
           ".read": "auth != null && root.child('chats').child($chatId).child('participantIds').child(auth.uid).val() == true",
           ".write": "auth != null && root.child('chats').child($chatId).child('participantIds').child(auth.uid).val() == true"
         }
       },
       "presence": {
         "$uid": {
           ".read": "auth != null",
           ".write": "auth != null && auth.uid == $uid"
         }
       }
     }
   }
   ```
7. Write Firebase Storage Security Rules
8. Create Firebase Cloud Function project structure (for notifications)
9. Document Firebase configuration in README

**Validation:**
- [ ] Firebase project created and accessible
- [ ] Security rules deployed
- [ ] Can authenticate test user via Firebase Console
- [ ] Database structure documented

---

### PR-003: Data Models & TypeScript Interfaces
**Dependencies:** PR-001 (Project setup)  
**Estimated Time:** 30 minutes  
**Prerequisites:** ✅ PR-001 must be merged

**Tasks:**
1. Create `/src/types/index.ts` with core interfaces:
   ```typescript
   export interface User {
     uid: string;
     email: string;
     displayName: string;
     createdAt: number;
     lastSeen: number;
     isOnline: boolean;
     fcmToken?: string;
   }

   export interface Message {
     id: string;
     chatId: string;
     senderId: string;
     type: 'text' | 'image';
     content: string;
     timestamp: number;
     status: 'sending' | 'sent' | 'delivered' | 'read';
     localId?: string;
     deliveredTo?: string[];
     readBy?: string[];
     metadata?: {
       imageWidth?: number;
       imageHeight?: number;
       imageSize?: number;
     };
   }

   export interface Chat {
     id: string;
     type: '1:1' | 'group';
     participantIds: string[];
     name?: string;
     createdAt: number;
     lastMessage?: {
       content: string;
       senderId: string;
       timestamp: number;
       type: 'text' | 'image';
     };
     unreadCounts?: {
       [userId: string]: number;
     };
   }

   export type DeliveryStatus = 'sending' | 'sent' | 'delivered' | 'read';
   export type MessageType = 'text' | 'image';
   export type ChatType = '1:1' | 'group';
   ```

2. Create utility types for API responses, errors, etc.
3. Write JSDoc comments for all interfaces
4. Create constants file (`/src/constants/index.ts`):
   - Max message length: 5000
   - Max image size: 2MB
   - Max group size: 5
   - Message pagination size: 50

**Validation:**
- [ ] All types compile without errors
- [ ] Types are properly exported
- [ ] Constants defined and documented

---

## Block 2: Authentication Flow

### PR-004: Firebase Service Layer
**Dependencies:** PR-001, PR-002, PR-003  
**Estimated Time:** 1 hour  
**Prerequisites:** ✅ PR-001, PR-002, PR-003 must be merged

**Tasks:**
1. Create `/src/services/firebase.ts`:
   - Initialize Firebase app
   - Export auth, database, storage instances
   - Type-safe wrappers
2. Create `/src/services/auth.service.ts` (max 75 lines per function):
   - `signUp(email, password, displayName)` → User
   - `signIn(email, password)` → User
   - `signOut()` → void
   - `getCurrentUser()` → User | null
   - `onAuthStateChanged(callback)` → unsubscribe function
3. Create `/src/services/user.service.ts`:
   - `createUserProfile(uid, email, displayName)` → void
   - `getUserProfile(uid)` → User | null
   - `updateUserProfile(uid, updates)` → void
4. Write unit tests for auth service:
   - Mock Firebase auth methods
   - Test sign up/sign in success cases
   - Test error handling (invalid email, weak password)
   - Test auth state change listener

**Validation:**
- [ ] All functions under 75 lines
- [ ] Unit tests pass (>80% coverage)
- [ ] TypeScript compiles without errors
- [ ] Can create/fetch user profile in Firebase Console

---

### PR-005: Authentication Context & Secure Storage
**Dependencies:** PR-004  
**Estimated Time:** 45 minutes  
**Prerequisites:** ✅ PR-004 must be merged

**Tasks:**
1. Create `/src/contexts/AuthContext.tsx` (under 200 lines):
   - AuthProvider component
   - useAuth hook
   - State: currentUser, loading, error
   - Methods: signUp, signIn, signOut
2. Implement session persistence with Expo SecureStore:
   - Store auth token on login
   - Restore session on app launch
   - Clear token on logout
3. Create loading screen for auth state initialization
4. Write unit tests for AuthContext:
   - Test provider wrapping
   - Test state updates
   - Mock SecureStore operations

**Validation:**
- [ ] Auth context provides all required methods
- [ ] Session persists after app restart
- [ ] Unit tests pass
- [ ] Loading states handled properly

---

### PR-006: Authentication UI Screens
**Dependencies:** PR-005  
**Estimated Time:** 1.5 hours  
**Prerequisites:** ✅ PR-005 must be merged

**Tasks:**
1. Create `/src/screens/LoginScreen.tsx` (under 200 lines):
   - Email input with validation
   - Password input (secure entry)
   - Login button with loading state
   - "Create account" link
   - Error message display
2. Create `/src/screens/SignUpScreen.tsx` (under 200 lines):
   - Email input with validation
   - Password input (min 8 chars)
   - Display name input (2-50 chars)
   - Sign up button with loading state
   - "Already have account" link
   - Error message display
3. Create form validation utilities:
   - `validateEmail(email)` → boolean
   - `validatePassword(password)` → { valid: boolean, message?: string }
   - `validateDisplayName(name)` → { valid: boolean, message?: string }
4. Set up React Navigation:
   - Auth stack (Login, SignUp)
   - Main stack (will be added later)
   - Conditional rendering based on auth state
5. Write unit tests for validation functions
6. Write component tests for auth screens

**Validation:**
- [ ] Can register new account
- [ ] Can log in with existing account
- [ ] Form validation works correctly
- [ ] Error messages display properly
- [ ] Navigation between screens works
- [ ] Unit tests pass

**Checkpoint 1 Complete:** Authentication working, session persists

---

## Block 3: Local Storage & Data Persistence

### PR-007: SQLite Database Setup
**Dependencies:** PR-003  
**Estimated Time:** 1 hour  
**Prerequisites:** ✅ PR-003 must be merged

**Tasks:**
1. Create `/src/services/database.service.ts`:
   - Initialize SQLite database
   - Database schema creation
   - Migration system placeholder
2. Create database schema:
   ```sql
   CREATE TABLE IF NOT EXISTS users (
     uid TEXT PRIMARY KEY,
     email TEXT NOT NULL,
     displayName TEXT NOT NULL,
     createdAt INTEGER NOT NULL,
     lastSeen INTEGER,
     isOnline INTEGER DEFAULT 0
   );

   CREATE TABLE IF NOT EXISTS chats (
     id TEXT PRIMARY KEY,
     type TEXT NOT NULL,
     name TEXT,
     createdAt INTEGER NOT NULL,
     lastMessageContent TEXT,
     lastMessageSenderId TEXT,
     lastMessageTimestamp INTEGER,
     lastMessageType TEXT
   );

   CREATE TABLE IF NOT EXISTS chat_participants (
     chatId TEXT NOT NULL,
     userId TEXT NOT NULL,
     unreadCount INTEGER DEFAULT 0,
     PRIMARY KEY (chatId, userId),
     FOREIGN KEY (chatId) REFERENCES chats(id)
   );

   CREATE TABLE IF NOT EXISTS messages (
     id TEXT PRIMARY KEY,
     localId TEXT,
     chatId TEXT NOT NULL,
     senderId TEXT NOT NULL,
     type TEXT NOT NULL,
     content TEXT NOT NULL,
     timestamp INTEGER NOT NULL,
     status TEXT NOT NULL,
     FOREIGN KEY (chatId) REFERENCES chats(id)
   );

   CREATE TABLE IF NOT EXISTS message_delivery (
     messageId TEXT NOT NULL,
     userId TEXT NOT NULL,
     delivered INTEGER DEFAULT 0,
     read INTEGER DEFAULT 0,
     PRIMARY KEY (messageId, userId),
     FOREIGN KEY (messageId) REFERENCES messages(id)
   );

   CREATE INDEX idx_messages_chatId ON messages(chatId, timestamp);
   CREATE INDEX idx_chats_lastMessage ON chats(lastMessageTimestamp DESC);
   ```
3. Create database utility functions (max 75 lines each):
   - `initDatabase()` → void
   - `executeQuery(sql, params)` → Promise<any>
   - `executeTransaction(queries)` → Promise<void>
4. Write unit tests for database operations:
   - Test database initialization
   - Test table creation
   - Test query execution
   - Mock SQLite methods

**Validation:**
- [ ] Database initializes successfully
- [ ] All tables created
- [ ] Indexes created
- [ ] Unit tests pass
- [ ] No SQL syntax errors

---

### PR-008: Local User Storage Service
**Dependencies:** PR-007  
**Estimated Time:** 45 minutes  
**Prerequisites:** ✅ PR-007 must be merged

**Tasks:**
1. Create `/src/services/local-user.service.ts` (max 75 lines per function):
   - `saveUser(user: User)` → Promise<void>
   - `getUser(uid: string)` → Promise<User | null>
   - `getUsers(uids: string[])` → Promise<User[]>
   - `updateUserPresence(uid, isOnline, lastSeen)` → Promise<void>
   - `getAllUsers()` → Promise<User[]>
2. Write unit tests:
   - Test CRUD operations
   - Test batch operations
   - Test presence updates
   - Mock database service

**Validation:**
- [ ] All functions under 75 lines
- [ ] Can save and retrieve users
- [ ] Unit tests pass (>80% coverage)
- [ ] Handles null cases gracefully

---

### PR-009: Local Chat Storage Service
**Dependencies:** PR-007  
**Estimated Time:** 1 hour  
**Prerequisites:** ✅ PR-007 must be merged

**Tasks:**
1. Create `/src/services/local-chat.service.ts` (max 75 lines per function):
   - `saveChat(chat: Chat)` → Promise<void>
   - `getChat(chatId: string)` → Promise<Chat | null>
   - `getAllChats()` → Promise<Chat[]>
   - `updateChatLastMessage(chatId, message)` → Promise<void>
   - `deleteChat(chatId)` → Promise<void>
   - `addParticipant(chatId, userId)` → Promise<void>
   - `removeParticipant(chatId, userId)` → Promise<void>
   - `getUnreadCount(chatId, userId)` → Promise<number>
   - `updateUnreadCount(chatId, userId, count)` → Promise<void>
   - `resetUnreadCount(chatId, userId)` → Promise<void>
2. Write unit tests:
   - Test chat CRUD operations
   - Test participant management
   - Test unread count tracking
   - Mock database service

**Validation:**
- [ ] All functions under 75 lines
- [ ] Can save and retrieve chats
- [ ] Unread counts work correctly
- [ ] Unit tests pass (>80% coverage)

---

### PR-010: Local Message Storage Service
**Dependencies:** PR-007  
**Estimated Time:** 1.5 hours  
**Prerequisites:** ✅ PR-007 must be merged

**Tasks:**
1. Create `/src/services/local-message.service.ts` (max 75 lines per function):
   - `saveMessage(message: Message)` → Promise<void>
   - `getMessage(messageId: string)` → Promise<Message | null>
   - `getMessagesByChat(chatId, limit, offset)` → Promise<Message[]>
   - `updateMessageStatus(messageId, status)` → Promise<void>
   - `updateMessageDelivery(messageId, userId, delivered, read)` → Promise<void>
   - `getMessageDeliveryStatus(messageId)` → Promise<{userId: string, delivered: boolean, read: boolean}[]>
   - `deleteMessage(messageId)` → Promise<void>
   - `getPendingMessages()` → Promise<Message[]> (status = 'sending')
   - `getMessageByLocalId(localId)` → Promise<Message | null>
2. Implement pagination helper:
   - Cursor-based pagination
   - Load 50 messages at a time
3. Write unit tests:
   - Test message CRUD operations
   - Test pagination
   - Test status updates
   - Test delivery tracking
   - Mock database service

**Validation:**
- [ ] All functions under 75 lines
- [ ] Can save and retrieve messages
- [ ] Pagination works correctly
- [ ] Status updates work
- [ ] Unit tests pass (>80% coverage)

---

## Block 4: Real-Time Sync & Firebase Integration

### PR-011: Firebase RTDB Service - Users
**Dependencies:** PR-004, PR-008  
**Estimated Time:** 1 hour  
**Prerequisites:** ✅ PR-004, PR-008 must be merged

**Tasks:**
1. Create `/src/services/firebase-user.service.ts` (max 75 lines per function):
   - `createUserInFirebase(user: User)` → Promise<void>
   - `getUserFromFirebase(uid: string)` → Promise<User | null>
   - `updateUserInFirebase(uid, updates)` → Promise<void>
   - `subscribeToUser(uid, callback)` → unsubscribe function
   - `searchUsers(query: string)` → Promise<User[]>
2. Write unit tests:
   - Mock Firebase RTDB methods
   - Test CRUD operations
   - Test listener subscriptions
   - Test search functionality

**Validation:**
- [ ] Can create user in Firebase
- [ ] Can retrieve user from Firebase
- [ ] Listeners work correctly
- [ ] Unit tests pass

---

### PR-012: Firebase RTDB Service - Chats
**Dependencies:** PR-004, PR-009  
**Estimated Time:** 1 hour  
**Prerequisites:** ✅ PR-004, PR-009 must be merged

**Tasks:**
1. Create `/src/services/firebase-chat.service.ts` (max 75 lines per function):
   - `createChatInFirebase(chat: Chat)` → Promise<string> (returns chatId)
   - `getChatFromFirebase(chatId: string)` → Promise<Chat | null>
   - `updateChatInFirebase(chatId, updates)` → Promise<void>
   - `subscribeToUserChats(userId, callback)` → unsubscribe function
   - `subscribeToChat(chatId, callback)` → unsubscribe function
   - `findOrCreateOneOnOneChat(userId1, userId2)` → Promise<string>
2. Write unit tests:
   - Mock Firebase RTDB methods
   - Test chat creation
   - Test 1:1 chat deduplication
   - Test listener subscriptions

**Validation:**
- [ ] Can create chats in Firebase
- [ ] 1:1 chat deduplication works
- [ ] Listeners work correctly
- [ ] Unit tests pass

---

### PR-013: Firebase RTDB Service - Messages
**Dependencies:** PR-004, PR-010  
**Estimated Time:** 1.5 hours  
**Prerequisites:** ✅ PR-004, PR-010 must be merged

**Tasks:**
1. Create `/src/services/firebase-message.service.ts` (max 75 lines per function):
   - `sendMessageToFirebase(message: Message)` → Promise<string> (returns messageId)
   - `getMessagesFromFirebase(chatId, limit?, startAfter?)` → Promise<Message[]>
   - `subscribeToMessages(chatId, callback)` → unsubscribe function
   - `updateMessageStatusInFirebase(messageId, chatId, status)` → Promise<void>
   - `markMessageDelivered(messageId, chatId, userId)` → Promise<void>
   - `markMessageRead(messageId, chatId, userId)` → Promise<void>
   - `getMessageDeliveryFromFirebase(messageId, chatId)` → Promise<{[userId: string]: {delivered: boolean, read: boolean}}>
2. Implement query optimization:
   - Use Firebase query orderByChild('timestamp')
   - Limit queries to last 50 messages
   - Pagination support
3. Write unit tests:
   - Mock Firebase RTDB methods
   - Test message sending
   - Test status updates
   - Test delivery tracking
   - Test pagination

**Validation:**
- [ ] Can send messages to Firebase
- [ ] Can retrieve messages with pagination
- [ ] Listeners work correctly
- [ ] Status updates work
- [ ] Unit tests pass

---

### PR-014: Sync Service - Orchestration Layer
**Dependencies:** PR-008, PR-009, PR-010, PR-011, PR-012, PR-013  
**Estimated Time:** 2 hours  
**Prerequisites:** ✅ PR-008, PR-009, PR-010, PR-011, PR-012, PR-013 must be merged

**Tasks:**
1. Create `/src/services/sync.service.ts` (max 75 lines per function):
   - `syncUserToLocal(firebaseUser)` → Promise<void>
   - `syncChatToLocal(firebaseChat)` → Promise<void>
   - `syncMessageToLocal(firebaseMessage)` → Promise<void>
   - `syncUserToFirebase(localUser)` → Promise<void>
   - `syncChatToFirebase(localChat)` → Promise<void>
   - `syncMessageToFirebase(localMessage)` → Promise<void>
   - `startRealtimeSync(userId)` → void (sets up all listeners)
   - `stopRealtimeSync()` → void (cleans up listeners)
2. Implement conflict resolution:
   - Timestamp-based winner (newer wins)
   - Handle concurrent updates
3. Implement initial sync on app launch:
   - Fetch user's chats
   - Fetch recent messages per chat (last 50)
   - Update local database
4. Write unit tests:
   - Test sync operations
   - Test conflict resolution
   - Mock local and Firebase services

**Validation:**
- [ ] Real-time sync works bidirectionally
- [ ] Initial sync loads data correctly
- [ ] Conflicts resolved properly
- [ ] Unit tests pass (>80% coverage)

---

## Block 5: Message Queue & Offline Support

### PR-015: Message Queue Service
**Dependencies:** PR-010, PR-013  
**Estimated Time:** 2 hours  
**Prerequisites:** ✅ PR-010, PR-013 must be merged

**Tasks:**
1. Create `/src/services/message-queue.service.ts` (max 75 lines per function):
   - `enqueueMessage(message: Message)` → Promise<void>
   - `dequeueMessages()` → Promise<Message[]>
   - `processQueue()` → Promise<void>
   - `retryFailedMessages()` → Promise<void>
   - `markMessageSending(localId)` → Promise<void>
   - `markMessageSent(localId, serverId)` → Promise<void>
   - `markMessageFailed(localId, error)` → Promise<void>
2. Implement retry logic:
   - Exponential backoff (1s, 2s, 4s, 8s, 16s)
   - Max 5 retries
   - Preserve message order per chat
3. Handle network state changes:
   - Start processing on online
   - Pause processing on offline
4. Write unit tests:
   - Test queue operations
   - Test retry logic
   - Test network state handling
   - Mock network and Firebase services

**Validation:**
- [ ] Messages queue when offline
- [ ] Messages send when back online
- [ ] Retry logic works correctly
- [ ] Order preserved
- [ ] Unit tests pass (>80% coverage)

---

### PR-016: Network State Manager
**Dependencies:** PR-015  
**Estimated Time:** 45 minutes  
**Prerequisites:** ✅ PR-015 must be merged

**Tasks:**
1. Create `/src/services/network.service.ts` (max 75 lines per function):
   - `isOnline()` → Promise<boolean>
   - `subscribeToNetworkState(callback)` → unsubscribe function
   - `waitForOnline()` → Promise<void>
2. Use React Native NetInfo
3. Create network context:
   - `/src/contexts/NetworkContext.tsx`
   - Provide isOnline state to app
   - Trigger message queue on online
4. Write unit tests:
   - Mock NetInfo
   - Test state subscriptions
   - Test state changes

**Validation:**
- [ ] Network state tracked accurately
- [ ] Context provides state to components
- [ ] Message queue triggered on online
- [ ] Unit tests pass

---

## Block 6: Presence System

### PR-017: Presence Service
**Dependencies:** PR-011, PR-014  
**Estimated Time:** 1.5 hours  
**Prerequisites:** ✅ PR-011, PR-014 must be merged

**Tasks:**
1. Create `/src/services/presence.service.ts` (max 75 lines per function):
   - `setUserOnline(uid)` → Promise<void>
   - `setUserOffline(uid)` → Promise<void>
   - `subscribeToUserPresence(uid, callback)` → unsubscribe function
   - `subscribeToMultiplePresences(uids, callback)` → unsubscribe function
   - `setupPresenceSystem(uid)` → void
2. Implement Firebase presence:
   - Use `.info/connected` for connection state
   - Set presence on connection/disconnection
   - Use `onDisconnect()` for cleanup
3. Handle app state changes:
   - Set online on foreground
   - Set offline on background
   - Update lastSeen timestamp
4. Write unit tests:
   - Mock Firebase RTDB
   - Mock app state
   - Test presence updates
   - Test listeners

**Validation:**
- [ ] Presence updates on app state changes
- [ ] Presence reflects connection state
- [ ] lastSeen updates correctly
- [ ] Unit tests pass (>80% coverage)

---

## Block 7: Core Messaging UI

### PR-018: Avatar & User Display Components
**Dependencies:** PR-003, PR-006  
**Estimated Time:** 1 hour  
**Prerequisites:** ✅ PR-003, PR-006 must be merged

**Tasks:**
1. Create `/src/utils/avatar.utils.ts` (max 75 lines per function):
   - `getInitials(displayName: string)` → string (1-2 chars)
   - `getAvatarColor(uid: string)` → string (consistent color per user)
2. Create `/src/components/Avatar.tsx` (under 150 lines):
   - Circular avatar with initials
   - Background color based on user ID
   - Optional online status indicator (green/gray dot)
   - Size variants: small (32), medium (48), large (64)
3. Create `/src/components/UserListItem.tsx` (under 150 lines):
   - Avatar + display name
   - Online status indicator
   - Optional subtitle (e.g., last seen)
   - Tap handler
4. Write unit tests:
   - Test initial extraction (edge cases: empty, single name, special chars)
   - Test color consistency
   - Test component rendering

**Validation:**
- [ ] Initials extracted correctly
- [ ] Colors consistent per user
- [ ] Avatar displays properly
- [ ] Online status visible
- [ ] Unit tests pass

---

### PR-019: Chat List Screen
**Dependencies:** PR-009, PR-014, PR-017, PR-018  
**Estimated Time:** 2 hours  
**Prerequisites:** ✅ PR-009, PR-014, PR-017, PR-018 must be merged

**Tasks:**
1. Create `/src/screens/ChatListScreen.tsx` (under 250 lines):
   - FlatList of chats
   - Sort by last message timestamp
   - Display avatar (user or group)
   - Display chat name
   - Display last message preview (50 chars)
   - Display timestamp (relative: "2m", "1h", "Yesterday")
   - Display unread badge
   - Display online status (1:1 chats only)
   - Pull-to-refresh
   - Empty state ("No chats yet")
2. Create `/src/components/ChatListItem.tsx` (under 200 lines):
   - Reusable chat row component
   - Swipe actions (optional stretch)
3. Create timestamp utility:
   - `/src/utils/time.utils.ts`
   - `getRelativeTime(timestamp)` → string
   - Handle: seconds ago, minutes ago, hours ago, yesterday, date
4. Implement navigation:
   - Tap chat to open conversation
   - Header with "New Chat" button
5. Write unit tests:
   - Test chat sorting
   - Test timestamp formatting
   - Mock chat data

**Validation:**
- [ ] Chats display correctly
- [ ] Sorted by recency
- [ ] Timestamps formatted properly
- [ ] Unread badges accurate
- [ ] Navigation works
- [ ] Unit tests pass

**Checkpoint 2 Complete:** Can view chat list, see presence

---

### PR-020: Message Bubble Component
**Dependencies:** PR-003, PR-018  
**Estimated Time:** 1.5 hours  
**Prerequisites:** ✅ PR-003, PR-018 must be merged

**Tasks:**
1. Create `/src/components/MessageBubble.tsx` (under 250 lines):
   - Different styles for sent/received
   - Text message display
   - Image message display (thumbnail with tap to expand)
   - Timestamp display
   - Delivery status indicators:
     - Sending: gray single checkmark
     - Sent: gray double checkmark
     - Delivered: blue double checkmark
     - Read: blue double checkmark + "Read" or distinct icon
   - Sender name (for group chats)
   - Avatar (for received messages in groups)
2. Create `/src/components/ImagePreview.tsx` (under 150 lines):
   - Full-screen image viewer
   - Pinch to zoom
   - Swipe to dismiss
3. Handle long messages:
   - Wrap text properly
   - Max width based on screen size
4. Write component tests:
   - Test rendering different message types
   - Test delivery status display
   - Mock message data

**Validation:**
- [ ] Messages display correctly
- [ ] Delivery states visible
- [ ] Images load and expand
- [ ] Sender attribution works (groups)
- [ ] Component tests pass

---

### PR-021: Conversation Screen
**Dependencies:** PR-010, PR-013, PR-014, PR-020  
**Estimated Time:** 2.5 hours  
**Prerequisites:** ✅ PR-010, PR-013, PR-014, PR-020 must be merged

**Tasks:**
1. Create `/src/screens/ConversationScreen.tsx` (under 300 lines):
   - FlatList of messages (inverted for bottom-up)
   - Render MessageBubble components
   - Auto-scroll to bottom on new message
   - Load more messages on scroll up (pagination)
   - Header with chat name and online status
   - Message input at bottom
   - Send button
   - Image picker button
2. Implement real-time message updates:
   - Subscribe to messages on mount
   - Unsubscribe on unmount
   - Update UI on new messages
3. Implement optimistic UI:
   - Show message immediately on send
   - Assign temporary localId
   - Update with server ID when confirmed
   - Show sending → sent → delivered → read states
4. Implement read receipts:
   - Mark messages as read when visible
   - Use IntersectionObserver or onViewableItemsChanged
5. Handle keyboard:
   - Avoid keyboard covering input
   - Adjust scroll position
6. Write component tests:
   - Test message rendering
   - Test pagination
   - Mock conversation data

**Validation:**
- [ ] Messages display in conversation
- [ ] Pagination works
- [ ] Auto-scroll works
- [ ] Optimistic UI works
- [ ] Read receipts sent
- [ ] Component tests pass

**Checkpoint 3 Complete:** Can send/receive messages, see delivery states

---

### PR-022: Message Input Component
**Dependencies:** PR-021  
**Estimated Time:** 1.5 hours  
**Prerequisites:** ✅ PR-021 must be merged

**Tasks:**
1. Create `/src/components/MessageInput.tsx` (under 200 lines):
   - TextInput with auto-growing height (max 5 lines)
   - Character count (5000 max)
   - Send button (disabled when empty or > 5000 chars)
   - Image picker button
   - Loading state while sending
   - Clear input after send
2. Handle edge cases:
   - Trim whitespace
   - Prevent empty messages
   - Disable input while offline (show indicator)
3. Integrate with message queue:
   - Enqueue message on send
   - Show optimistic UI
4. Write component tests:
   - Test input validation
   - Test send action
   - Mock message queue

**Validation:**
- [ ] Input grows appropriately
- [ ] Validation works
- [ ] Messages send correctly
- [ ] Offline state handled
- [ ] Component tests pass

---

## Block 8: Image Handling

### PR-023: Image Upload Service
**Dependencies:** PR-004  
**Estimated Time:** 1.5 hours  
**Prerequisites:** ✅ PR-004 must be merged

**Tasks:**
1. Create `/src/services/image.service.ts` (max 75 lines per function):
   - `compressImage(uri, maxSize)` → Promise<{ uri, width, height, size }>
   - `uploadImage(uri, path)` → Promise<{ url, width, height, size }> (with progress callback)
   - `downloadImage(url)` → Promise<string> (local URI)
   - `generateThumbnail(uri, width, height)` → Promise<string>
2. Implement compression:
   - Use Expo ImageManipulator
   - Target max 2MB
   - Preserve aspect ratio
   - Quality: 0.8
3. Implement upload to Firebase Storage:
   - Path: `/images/{chatId}/{messageId}.jpg`
   - Track upload progress
   - Return download URL
4. Write unit tests:
   - Test compression (mock ImageManipulator)
   - Test upload (mock Firebase Storage)
   - Test progress tracking
   - Test error handling

**Validation:**
- [ ] Images compressed to < 2MB
- [ ] Upload works with progress
- [ ] Download URLs generated
- [ ] Quality acceptable
- [ ] Unit tests pass (>80% coverage)

---

### PR-024: Image Picker Integration
**Dependencies:** PR-022, PR-023  
**Estimated Time:** 1 hour  
**Prerequisites:** ✅ PR-022, PR-023 must be merged

**Tasks:**
1. Update `/src/components/MessageInput.tsx`:
   - Add image picker button
   - Request media library permissions
   - Handle permission denial gracefully
2. Create image selection flow:
   - Open Expo ImagePicker
   - Show selected image preview
   - Confirm/cancel options
   - Compress image before sending
3. Integrate with message sending:
   - Upload image to Firebase Storage
   - Create message with image URL
   - Show upload progress in UI
   - Handle upload failures
4. Write component tests:
   - Test image selection
   - Mock ImagePicker
   - Test upload flow

**Validation:**
- [ ] Can select images from gallery
- [ ] Image preview shows
- [ ] Upload progress visible
- [ ] Images send successfully
- [ ] Component tests pass

---

## Block 9: Group Chat

### PR-025: New Chat Flow - User Selection
**Dependencies:** PR-011, PR-019  
**Estimated Time:** 1.5 hours  
**Prerequisites:** ✅ PR-011, PR-019 must be merged

**Tasks:**
1. Create `/src/screens/NewChatScreen.tsx` (under 250 lines):
   - Search bar for users
   - List of all users (except current user)
   - Filter users by search query
   - Checkbox/selection mode for group chat
   - "Next" button (disabled if no selection)
2. Create `/src/components/UserSelectItem.tsx` (under 150 lines):
   - User avatar + name
   - Checkbox for selection
   - Selected state styling
3. Implement user search:
   - Search by display name or email
   - Debounce search queries (300ms)
   - Show "No results" state
4. Handle navigation:
   - Single user selected → create/open 1:1 chat
   - Multiple users selected → go to group creation
5. Write component tests:
   - Test user filtering
   - Test selection logic
   - Mock user data

**Validation:**
- [ ] Can search users
- [ ] Can select multiple users
- [ ] Navigation works correctly
- [ ] Component tests pass

---

### PR-026: Group Chat Creation
**Dependencies:** PR-012, PR-025  
**Estimated Time:** 1.5 hours  
**Prerequisites:** ✅ PR-012, PR-025 must be merged

**Tasks:**
1. Create `/src/screens/CreateGroupScreen.tsx` (under 200 lines):
   - Group name input (optional)
   - List of selected participants
   - Remove participant option
   - "Create Group" button
   - Auto-generate name if empty (from first 2-3 names)
2. Implement group creation:
   - Call `createChatInFirebase` with participants
   - Generate group name if not provided
   - Navigate to new group conversation
3. Create name generation utility:
   - `/src/utils/group.utils.ts`
   - `generateGroupName(participants)` → string
   - Format: "Alice, Bob, Charlie" or "Alice, Bob, +2 others"
4. Write unit tests:
   - Test name generation
   - Test group creation
   - Mock chat service

**Validation:**
- [ ] Can create group with 3-5 users
- [ ] Auto-generated names work
- [ ] Navigation to conversation works
- [ ] All participants see group
- [ ] Unit tests pass

---

### PR-027: Group Chat UI Enhancements
**Dependencies:** PR-021, PR-026  
**Estimated Time:** 1.5 hours  
**Prerequisites:** ✅ PR-021, PR-026 must be merged

**Tasks:**
1. Update `/src/components/MessageBubble.tsx`:
   - Show sender name in group chats (received messages only)
   - Show sender avatar in group chats (received messages)
   - Different layout for group messages
2. Update `/src/screens/ConversationScreen.tsx`:
   - Group header shows participant count
   - "View Info" button → group details screen
3. Create `/src/screens/GroupInfoScreen.tsx` (under 200 lines):
   - Group name display
   - List of participants with avatars
   - "Leave Group" button
   - Show who's online
4. Implement leave group:
   - Remove user from participants
   - Update Firebase
   - Navigate back to chat list
5. Write component tests:
   - Test group message rendering
   - Test participant display
   - Mock group data

**Validation:**
- [ ] Sender attribution visible in groups
- [ ] Group info screen works
- [ ] Can leave group
- [ ] Remaining members unaffected
- [ ] Component tests pass

---

### PR-028: Group Message Delivery Tracking
**Dependencies:** PR-013, PR-027  
**Estimated Time:** 1.5 hours  
**Prerequisites:** ✅ PR-013, PR-027 must be merged

**Tasks:**
1. Update `/src/components/MessageBubble.tsx`:
   - Show read count for sent messages in groups
   - Format: "Read by 3" or "Read by Alice, Bob"
   - Show delivery count: "Delivered to 4"
2. Implement delivery/read tracking:
   - Track per participant in Firebase
   - Update local database
   - Subscribe to delivery status changes
3. Update read receipt logic:
   - Mark message as read for current user
   - Increment read count in UI
4. Create utility for formatting read receipts:
   - `/src/utils/receipt.utils.ts`
   - `formatReadReceipt(readBy, allParticipants)` → string
5. Write unit tests:
   - Test delivery tracking
   - Test read count formatting
   - Mock delivery data

**Validation:**
- [ ] Delivery counts accurate
- [ ] Read counts accurate
- [ ] Formatting readable
- [ ] Updates in real-time
- [ ] Unit tests pass

**Checkpoint 4 Complete:** Group chat fully functional

---

## Block 10: Push Notifications

### PR-029: FCM Setup & Configuration
**Dependencies:** PR-002, PR-005  
**Estimated Time:** 1.5 hours  
**Prerequisites:** ✅ PR-002, PR-005 must be merged

**Tasks:**
1. Configure Expo for FCM:
   - Update `app.json` with FCM credentials
   - Configure notification channels (Android)
   - Configure notification categories (iOS)
2. Create `/src/services/notification.service.ts` (max 75 lines per function):
   - `requestPermissions()` → Promise<boolean>
   - `getToken()` → Promise<string | null>
   - `saveTokenToFirebase(uid, token)` → Promise<void>
   - `subscribeToNotifications(handler)` → unsubscribe function
   - `handleNotificationTap(notification)` → void (deep link logic)
3. Implement token management:
   - Get FCM token on login
   - Save to user profile in Firebase
   - Update on token refresh
4. Write unit tests:
   - Mock Expo Notifications
   - Test token retrieval
   - Test permission requests

**Validation:**
- [ ] Can request notification permissions
- [ ] FCM token retrieved
- [ ] Token saved to Firebase
- [ ] Unit tests pass

---

### PR-030: Notification Handlers
**Dependencies:** PR-029  
**Estimated Time:** 1 hour  
**Prerequisites:** ✅ PR-029 must be merged

**Tasks:**
1. Update `/src/services/notification.service.ts`:
   - `handleForegroundNotification(notification)` → void
   - `handleBackgroundNotification(notification)` → void
   - `handleNotificationResponse(response)` → void (user tapped)
2. Implement notification handlers:
   - Foreground: Show banner with sender + preview
   - Background: System handles display
   - Tap: Navigate to specific chat
3. Create notification context:
   - `/src/contexts/NotificationContext.tsx`
   - Set up listeners on app launch
   - Handle deep linking to chats
4. Implement deep linking:
   - Parse notification data (chatId)
   - Navigate to conversation screen
5. Write component tests:
   - Test notification handling
   - Mock notification data
   - Test navigation

**Validation:**
- [ ] Foreground notifications show
- [ ] Tapping notification opens chat
- [ ] Deep linking works
- [ ] Component tests pass

---

### PR-031: Firebase Cloud Function - Send Notifications
**Dependencies:** PR-002, PR-029  
**Estimated Time:** 2 hours  
**Prerequisites:** ✅ PR-002, PR-029 must be merged

**Tasks:**
1. Create Firebase Cloud Function:
   - `functions/src/index.ts`
   - Trigger on new message in RTDB
   - Get recipient FCM tokens
   - Send notification to each recipient (except sender)
2. Implement notification logic:
   - Extract message data (sender, content, chat)
   - Get sender display name
   - Get recipient tokens
   - Format notification payload
3. Handle different message types:
   - Text: Show preview (first 100 chars)
   - Image: Show "📷 Photo"
   - Group: Include sender name
4. Implement batching:
   - Send to multiple recipients efficiently
   - Handle token expiration
5. Deploy Cloud Function:
   - `firebase deploy --only functions`
6. Write tests:
   - Test notification payload generation
   - Mock Firebase Admin SDK
   - Test trigger logic

**Validation:**
- [ ] Cloud Function deploys successfully
- [ ] Notifications sent on new message
- [ ] Payload formatted correctly
- [ ] Recipients receive notifications
- [ ] Tests pass

**Checkpoint 5 Complete:** Push notifications working (foreground confirmed)

---

## Block 11: Polish & Optimization

### PR-032: Loading States & Error Handling
**Dependencies:** PR-019, PR-021, PR-025  
**Estimated Time:** 1.5 hours  
**Prerequisites:** ✅ PR-019, PR-021, PR-025 must be merged

**Tasks:**
1. Create loading components:
   - `/src/components/LoadingSpinner.tsx`
   - `/src/components/LoadingOverlay.tsx`
   - `/src/components/SkeletonLoader.tsx` (for chat list)
2. Add loading states to all screens:
   - ChatListScreen: Skeleton while loading
   - ConversationScreen: Spinner while loading messages
   - NewChatScreen: Spinner while searching
   - ImageUpload: Progress indicator
3. Create error components:
   - `/src/components/ErrorMessage.tsx`
   - `/src/components/ErrorBoundary.tsx`
4. Add error handling:
   - Network errors: "Connection lost" banner
   - Message send failures: Retry button
   - Image upload failures: Error message + retry
   - Auth errors: Clear messages
5. Implement retry logic UI:
   - Failed messages show red icon
   - Tap to retry
6. Write component tests:
   - Test loading states
   - Test error displays
   - Mock error conditions

**Validation:**
- [ ] Loading states show appropriately
- [ ] Error messages clear and helpful
- [ ] Retry functionality works
- [ ] No unhandled errors crash app
- [ ] Component tests pass

---

### PR-033: UI Polish & Accessibility
**Dependencies:** PR-018, PR-020, PR-022  
**Estimated Time:** 1.5 hours  
**Prerequisites:** ✅ PR-018, PR-020, PR-022 must be merged

**Tasks:**
1. Implement consistent styling:
   - Create `/src/styles/theme.ts` (colors, fonts, spacing)
   - Apply theme throughout app
   - Ensure readable contrast ratios
2. Add accessibility:
   - Accessibility labels for all interactive elements
   - Screen reader support
   - Sufficient touch target sizes (44x44 minimum)
   - Focus management
3. Add haptic feedback:
   - On message send
   - On button press
   - On error
4. Improve animations:
   - Smooth transitions between screens
   - Message appearance animations
   - Scroll animations
5. Add empty states:
   - No chats: Welcome message + "Start a chat" CTA
   - No messages: "Send your first message"
   - No users found: "No users match your search"
6. Write accessibility tests:
   - Test screen reader labels
   - Test keyboard navigation (if applicable)

**Validation:**
- [ ] UI consistent across screens
- [ ] Accessibility labels present
- [ ] Touch targets adequate size
- [ ] Empty states helpful
- [ ] Animations smooth

---

### PR-034: Performance Optimization
**Dependencies:** PR-019, PR-021  
**Estimated Time:** 2 hours  
**Prerequisites:** ✅ PR-019, PR-021 must be merged

**Tasks:**
1. Optimize FlatList rendering:
   - Implement `getItemLayout` for fixed-height items
   - Set appropriate `initialNumToRender`
   - Set `maxToRenderPerBatch` and `windowSize`
   - Use `keyExtractor` efficiently
2. Implement memoization:
   - Use React.memo for MessageBubble
   - Use React.memo for ChatListItem
   - Use useMemo for expensive computations
   - Use useCallback for event handlers
3. Optimize images:
   - Implement image caching
   - Use progressive loading
   - Lazy load images
4. Optimize Firebase queries:
   - Add indexes to RTDB
   - Limit initial query sizes
   - Use pagination consistently
5. Profile performance:
   - Use React DevTools Profiler
   - Identify and fix slow renders
   - Measure frame rates
6. Write performance tests:
   - Test with large datasets (100+ chats, 1000+ messages)
   - Measure render times

**Validation:**
- [ ] Smooth scrolling (60fps)
- [ ] Fast initial load (< 3s)
- [ ] No jank on message send
- [ ] Efficient re-renders
- [ ] Performance tests pass

---

### PR-035: Offline Indicator & Network Handling
**Dependencies:** PR-016, PR-019  
**Estimated Time:** 1 hour  
**Prerequisites:** ✅ PR-016, PR-019 must be merged

**Tasks:**
1. Create offline banner:
   - `/src/components/OfflineBanner.tsx`
   - Shows at top when offline: "No internet connection"
   - Hides when back online
   - Smooth slide animation
2. Add offline indicators to UI:
   - Disable send button when offline
   - Show "Offline" in header
   - Gray out online status indicators
3. Implement reconnection logic:
   - Show "Reconnecting..." while attempting
   - Show "Connected" briefly when back online
   - Trigger sync on reconnection
4. Handle poor connections:
   - Timeout on slow requests (30s)
   - Show "Slow connection" warning
5. Write component tests:
   - Test banner display
   - Mock network states

**Validation:**
- [ ] Offline banner shows/hides correctly
- [ ] UI responds to network state
- [ ] Reconnection handled gracefully
- [ ] Component tests pass

---

## Block 12: Testing & Validation

### PR-036: Integration Tests
**Dependencies:** PR-014, PR-015, PR-021  
**Estimated Time:** 2 hours  
**Prerequisites:** ✅ PR-014, PR-015, PR-021 must be merged

**Tasks:**
1. Create integration test suite:
   - `/src/__tests__/integration/messaging.test.ts`
2. Test messaging flow end-to-end:
   - User A sends message
   - Verify message in local database
   - Verify message in Firebase
   - Verify User B receives message
   - Verify delivery status updates
   - Verify read receipts
3. Test offline scenarios:
   - Send message while offline
   - Verify message queued
   - Go back online
   - Verify message sent
4. Test group chat flow:
   - Create group
   - Send messages
   - Verify all participants receive
   - Verify read counts
5. Test image messaging:
   - Select image
   - Upload image
   - Verify image message received
6. Mock Firebase services appropriately

**Validation:**
- [ ] All integration tests pass
- [ ] Messaging flow works end-to-end
- [ ] Offline scenarios handled
- [ ] Group chat works correctly

---

### PR-037: E2E Test Scenarios
**Dependencies:** All previous PRs  
**Estimated Time:** 2 hours  
**Prerequisites:** ✅ All previous PRs merged

**Tasks:**
1. Set up Detox or Maestro for E2E testing
2. Implement test scenarios from PRD:
   - **Scenario 1:** Real-time messaging between 2 devices
   - **Scenario 2:** Offline message handling
   - **Scenario 3:** App lifecycle (force quit, restart)
   - **Scenario 4:** Group chat with 3 users
   - **Scenario 5:** Poor network conditions
   - **Scenario 6:** Image messaging
   - **Scenario 7:** Push notifications
3. Create test data setup/teardown:
   - Create test users
   - Clean up after tests
4. Document E2E test execution:
   - Add to README
   - Include in CI/CD pipeline (optional)

**Validation:**
- [ ] All 7 E2E scenarios pass
- [ ] Tests can run reliably
- [ ] Test documentation complete

---

### PR-038: Final Polish & Bug Fixes
**Dependencies:** All previous PRs  
**Estimated Time:** 2 hours  
**Prerequisites:** ✅ All previous PRs merged

**Tasks:**
1. Manual testing on physical devices:
   - Test all MVP requirements
   - Test edge cases
   - Test with poor network
   - Test with rapid interactions
2. Fix any discovered bugs:
   - Message ordering issues
   - Race conditions
   - UI glitches
   - Performance issues
3. Code cleanup:
   - Remove console.logs
   - Remove commented code
   - Format code consistently
   - Add missing comments
4. Update documentation:
   - Update README with complete setup instructions
   - Document known issues
   - Document testing procedures
5. Prepare for demo:
   - Create test accounts
   - Prepare demo script
   - Test demo flow

**Validation:**
- [ ] All MVP criteria met
- [ ] No critical bugs
- [ ] Code clean and documented
- [ ] Ready for demo

---

## Block 13: Deployment & Demo

### PR-039: Deployment & Demo Preparation
**Dependencies:** PR-038  
**Estimated Time:** 1 hour  
**Prerequisites:** ✅ PR-038 must be merged, all checkpoints passed

**Tasks:**
1. Deploy backend:
   - Verify Firebase project deployed
   - Verify Cloud Functions deployed
   - Test all Firebase services
2. Build mobile app:
   - Test build process
   - Resolve any build errors
   - Verify Expo Go compatibility
3. Create test accounts:
   - Create 5 test users
   - Create sample conversations
   - Create sample group chat
4. Record demo video (5-7 minutes):
   - Show real-time messaging (2 devices)
   - Show group chat (3+ participants)
   - Show offline scenario
   - Show app lifecycle handling
   - Show delivery states
   - Show read receipts
   - Show image messaging
5. Prepare demo script:
   - Outline key features to demonstrate
   - Prepare talking points
   - Test demo flow multiple times
6. Create submission package:
   - GitHub repository link
   - Demo video
   - README with setup instructions
   - List of completed features

**Validation:**
- [ ] Backend fully deployed
- [ ] App runs on Expo Go
- [ ] Demo video complete and clear
- [ ] All submission materials ready

---

## Summary by Dependency Chain

### Chain A: Foundation → Auth → Messaging Core
- **Block 1:** PR-001, PR-002, PR-003 (Foundation)
- **Block 2:** PR-004 → PR-005 → PR-006 (Authentication)
- **Block 3:** PR-007 → [PR-008, PR-009, PR-010] (Local Storage)
- **Block 4:** PR-011, PR-012, PR-013 → PR-014 (Firebase Sync)
- **Block 5:** PR-015 → PR-016 (Message Queue)
- **Block 7:** PR-018 → PR-019 → PR-020 → PR-021 → PR-022 (Messaging UI)
- **Block 8:** PR-023 → PR-024 (Images)

### Chain B: Presence (parallel to messaging core)
- **Block 6:** PR-017 (Presence) - depends on PR-011, PR-014

### Chain C: Group Chat (builds on messaging)
- **Block 9:** PR-025 → PR-026 → PR-027 → PR-028 (Group Chat) - depends on PR-012, PR-019, PR-021

### Chain D: Notifications (parallel to group chat)
- **Block 10:** PR-029 → PR-030 → PR-031 (Notifications) - depends on PR-002, PR-005

### Chain E: Polish (after core features)
- **Block 11:** PR-032, PR-033, PR-034, PR-035 (Polish) - depends on messaging UI completion

### Chain F: Testing & Deployment (final)
- **Block 12:** PR-036 → PR-037 → PR-038 (Testing)
- **Block 13:** PR-039 (Deployment)

---

## Estimated Timeline

- **Hours 0-3:** Foundation & Auth (Blocks 1-2)
- **Hours 3-6:** Local Storage (Block 3)
- **Hours 6-10:** Firebase Sync & Queue (Blocks 4-5)
- **Hours 10-12:** Presence (Block 6 - parallel)
- **Hours 12-16:** Messaging UI (Block 7)
- **Hours 16-18:** Images (Block 8)
- **Hours 18-20:** Group Chat (Block 9)
- **Hours 20-22:** Notifications (Block 10 - can start at hour 18 parallel)
- **Hours 22-23:** Polish & Testing (Blocks 11-12)
- **Hour 23-24:** Final Validation & Deployment (Block 13)

---

## Critical Path
1. Foundation (PR-001, PR-002, PR-003)
2. Auth (PR-004, PR-005, PR-006) 
3. Storage (PR-007, PR-008, PR-009, PR-010)
4. Sync (PR-011, PR-012, PR-013, PR-014)
5. Queue (PR-015, PR-016)
6. UI (PR-018, PR-019, PR-020, PR-021, PR-022)
7. Images (PR-023, PR-024)
8. Groups (PR-025, PR-026, PR-027, PR-028)
9. Final (PR-036, PR-037, PR-038, PR-039)

**Parallel opportunities:**
- PR-017 (Presence) can run parallel to PR-015-016
- PR-029-031 (Notifications) can run parallel to PR-025-028
- PR-032-035 (Polish) can run parallel to each other