# MessageAI MVP Task List
## Parallel Development Blocks

---

## Block 1: Project Foundation & Firebase Setup
*No dependencies - can start immediately*

### PR-1A: Initialize Expo Project
**Prerequisites**: None

**Tasks**:
- Initialize Expo app with TypeScript template
- Configure `app.json` with project metadata
- Set up TypeScript configuration (`tsconfig.json`)
- Create folder structure:
  ```
  /src
    /screens
    /components
    /services
    /utils
    /types
    /hooks
  /assets
  ```
- Install core dependencies: `expo-router`, `expo-constants`
- Configure path aliases in `tsconfig.json`
- Create basic `app/_layout.tsx` with Expo Router
- Test app runs in Expo Go

**Acceptance Criteria**:
- App launches in Expo Go
- TypeScript compiles without errors
- Folder structure in place
- Path aliases working

---

### PR-1B: Firebase Project Setup
**Prerequisites**: None

**Tasks**:
- Create Firebase project in console
- Enable Firebase Realtime Database
- Configure RTDB security rules (authenticated users only)
- Enable Firebase Authentication (email/password)
- Enable Firebase Storage
- Configure Storage security rules (authenticated uploads)
- Enable Firebase Cloud Messaging
- Download and save Firebase config
- Set up environment variables structure
- Create `.env.example` file
- Document Firebase setup in README

**Acceptance Criteria**:
- Firebase project created and configured
- All services enabled
- Security rules in place
- Config credentials obtained (not committed)

---

### PR-1C: Local Storage Setup (SQLite)
**Prerequisites**: None

**Tasks**:
- Install `expo-sqlite`
- Create database service (`src/services/database.ts`)
- Define SQLite schema:
  - `messages` table
  - `conversations` table
  - `sync_queue` table
- Create database initialization function
- Create database helper functions (query, insert, update, delete)
- Add migration system for schema changes
- Create TypeScript types for database models
- Write database test queries

**Acceptance Criteria**:
- SQLite database initializes on app launch
- Tables created successfully
- Helper functions work
- Types defined

---

## Block 2: Authentication Flow
*Depends on: PR-1A, PR-1B*

### PR-2A: Firebase Integration & Auth Service
**Prerequisites**: PR-1A (project initialized), PR-1B (Firebase configured)

**Tasks**:
- Install `@react-native-firebase/app`, `@react-native-firebase/auth`, `@react-native-firebase/database`, `@react-native-firebase/storage`
- Create Firebase service (`src/services/firebase.ts`)
- Initialize Firebase with config
- Create auth service (`src/services/auth.ts`):
  - `signUp(email, password, displayName)`
  - `signIn(email, password)`
  - `signOut()`
  - `getCurrentUser()`
  - `onAuthStateChanged` listener
- Create auth context (`src/contexts/AuthContext.tsx`)
- Handle auth state persistence
- Create user document in RTDB on signup

**Acceptance Criteria**:
- Firebase initialized successfully
- Auth methods work
- Auth context provides user state
- User document created in RTDB on signup

---

### PR-2B: Authentication Screens
**Prerequisites**: PR-1A (project initialized), PR-2A (auth service ready)

**Tasks**:
- Create `src/screens/AuthScreen.tsx`
- Create `src/screens/SignUpScreen.tsx`
- Create `src/screens/SignInScreen.tsx`
- Create `src/components/AuthInput.tsx` (reusable input component)
- Create `src/components/AuthButton.tsx`
- Implement email/password validation
- Add loading states during auth operations
- Add error handling and display
- Add navigation between sign in/sign up
- Create initial avatar component with initials
- Style screens (basic, clean design)

**Acceptance Criteria**:
- Users can create accounts
- Users can sign in
- Validation works
- Errors displayed appropriately
- Loading states shown
- Navigation works

---

## Block 3: User Presence & Profile
*Depends on: PR-2A*

### PR-3A: Online/Offline Presence System
**Prerequisites**: PR-2A (Firebase & auth service ready)

**Tasks**:
- Create presence service (`src/services/presence.ts`)
- Implement Firebase `.info/connected` listener
- Update user's `online` status in RTDB on connection change
- Update user's `lastSeen` timestamp
- Set up `onDisconnect()` handlers to mark user offline
- Handle app state changes (background/foreground)
- Create presence hook (`src/hooks/usePresence.ts`)
- Create online indicator component (`src/components/OnlineIndicator.tsx`)

**Acceptance Criteria**:
- User status updates to online when connected
- User status updates to offline on disconnect
- `lastSeen` timestamp updates correctly
- `onDisconnect` handlers work
- Works across app backgrounding

---

### PR-3B: User Profile Service
**Prerequisites**: PR-2A (auth service ready)

**Tasks**:
- Create user service (`src/services/user.ts`):
  - `createUserProfile(uid, email, displayName)`
  - `getUserProfile(uid)`
  - `updateUserProfile(uid, data)`
  - `listenToUserProfile(uid, callback)`
- Define User type in `src/types/user.ts`
- Create RTDB structure for users:
  ```
  /users/{uid}
    - email
    - displayName
    - online
    - lastSeen
    - createdAt
  ```
- Add indexing rules for user lookups
- Create profile hook (`src/hooks/useUserProfile.ts`)

**Acceptance Criteria**:
- User profiles stored in RTDB
- Profile operations work
- Real-time listeners work
- Types defined

---

## Block 4: Conversation Infrastructure
*Depends on: PR-1C, PR-2A*

### PR-4A: Conversation Service
**Prerequisites**: PR-1C (SQLite setup), PR-2A (Firebase ready)

**Tasks**:
- Define Conversation types (`src/types/conversation.ts`)
- Create conversation service (`src/services/conversation.ts`):
  - `createDirectConversation(userId1, userId2)`
  - `createGroupConversation(userIds[], groupName?)`
  - `getConversation(conversationId)`
  - `getUserConversations(userId)`
  - `listenToConversation(conversationId, callback)`
- Create RTDB structure:
  ```
  /conversations/{conversationId}
    - type: 'direct' | 'group'
    - participantIds: []
    - lastMessage: {}
    - createdAt
  /userConversations/{uid}/{conversationId}
    - lastRead (for future)
  ```
- Implement local SQLite caching for conversations
- Create conversation hook (`src/hooks/useConversations.ts`)

**Acceptance Criteria**:
- Can create direct conversations
- Can create group conversations (3-5 users)
- Conversations stored in RTDB and SQLite
- User conversation list updates
- Real-time listeners work

---

### PR-4B: Conversation List Screen
**Prerequisites**: PR-4A (conversation service), PR-3B (user profile service)

**Tasks**:
- Create `src/screens/ConversationListScreen.tsx`
- Create `src/components/ConversationListItem.tsx`
- Display list of user's conversations
- Show last message preview (truncated)
- Show timestamp (formatted: "5m ago", "Yesterday", etc.)
- Show participant names (direct: other user's name, group: all names or group name)
- Show online status indicator for direct conversations
- Add pull-to-refresh
- Add empty state (no conversations yet)
- Add "New Conversation" button (FAB)
- Navigate to chat screen on tap

**Acceptance Criteria**:
- Conversation list displays correctly
- Shows accurate data (names, previews, timestamps)
- Online status shown for direct chats
- Pull to refresh works
- Navigation works
- Empty state displays

---

### PR-4C: New Conversation Screen
**Prerequisites**: PR-4A (conversation service), PR-3B (user profile service)

**Tasks**:
- Create `src/screens/NewConversationScreen.tsx`
- Create user search/selection interface
- Allow selection of 1 user (direct) or 2-4 users (group, 3-5 total)
- Show selected users with remove option
- Create conversation on confirm
- Navigate to new conversation chat screen
- Handle duplicate conversation check (direct messages)
- Add group name input (optional for groups)

**Acceptance Criteria**:
- Can select users
- Can create direct conversation (2 users)
- Can create group conversation (3-5 users)
- Navigates to chat on creation
- Prevents duplicate direct conversations

---

## Block 5: Core Messaging Infrastructure
*Depends on: PR-1C, PR-2A, PR-4A*

### PR-5A: Message Service & Data Layer
**Prerequisites**: PR-1C (SQLite), PR-2A (Firebase), PR-4A (conversation service)

**Tasks**:
- Define Message types (`src/types/message.ts`):
  ```typescript
  type MessageState = 'sending' | 'sent';
  type Message = {
    messageId: string;
    conversationId: string;
    senderId: string;
    text?: string;
    imageUrl?: string;
    timestamp: number;
    state: MessageState;
    localId?: string;
  }
  ```
- Create message service (`src/services/message.ts`):
  - `sendTextMessage(conversationId, text)`
  - `sendImageMessage(conversationId, imageUri)`
  - `getMessages(conversationId, limit?)`
  - `listenToMessages(conversationId, callback)`
- Create RTDB structure:
  ```
  /messages/{conversationId}/{messageId}
    - senderId
    - text
    - imageUrl
    - timestamp
    - state
  ```
- Implement local SQLite storage for messages
- Create message cache sync logic
- Create message hook (`src/hooks/useMessages.ts`)

**Acceptance Criteria**:
- Message types defined
- Message CRUD operations work
- Messages stored in RTDB and SQLite
- Real-time listeners work
- Cache sync works

---

### PR-5B: Optimistic UI & Message Queue
**Prerequisites**: PR-5A (message service), PR-1C (SQLite)

**Tasks**:
- Create sync queue service (`src/services/syncQueue.ts`)
- Implement optimistic message sending:
  - Generate local message ID immediately
  - Add to local SQLite with state='sending'
  - Return immediately to UI
  - Push to Firebase in background
  - Update state to 'sent' on success
  - Retry on failure
- Create sync queue table operations:
  - `addToQueue(operation, data)`
  - `processQueue()`
  - `removeFromQueue(operationId)`
- Implement queue processor with retry logic
- Handle connection state changes
- Update UI on state changes

**Acceptance Criteria**:
- Messages appear instantly in UI
- State updates from 'sending' to 'sent'
- Queue persists across app restarts
- Retry logic works
- No duplicate messages

---

### PR-5C: Offline Detection & Sync
**Prerequisites**: PR-5B (message queue)

**Tasks**:
- Create network service (`src/services/network.ts`)
- Monitor Firebase `.info/connected`
- Monitor device network state with `@react-native-community/netinfo`
- Install `@react-native-community/netinfo`
- Create network context (`src/contexts/NetworkContext.tsx`)
- Expose connection state to app
- Trigger queue processing on reconnection
- Create connection indicator component (`src/components/ConnectionIndicator.tsx`)
- Display connection status in UI
- Handle app backgrounding/foregrounding

**Acceptance Criteria**:
- App detects online/offline state
- Queue processes on reconnection
- Connection indicator displays correctly
- Works across app lifecycle changes
- Messages send when back online

---

## Block 6: Chat Interface
*Depends on: PR-4A, PR-5A, PR-3B*

### PR-6A: Chat Screen UI
**Prerequisites**: PR-4A (conversation service), PR-5A (message service), PR-3B (user profiles)

**Tasks**:
- Create `src/screens/ChatScreen.tsx`
- Create `src/components/MessageBubble.tsx`
- Create `src/components/MessageInput.tsx`
- Display conversation header with:
  - Conversation name (participant name or group name)
  - Online status (direct) or participant count (group)
  - Back button
- Display scrollable message list:
  - Reverse chronological (newest at bottom)
  - Auto-scroll to bottom on new message
  - Load more on scroll to top
- Style message bubbles:
  - Own messages: right-aligned, primary color
  - Other messages: left-aligned, secondary color
  - Show sender name in groups
  - Show timestamp
  - Show state indicator (sending: spinner, sent: checkmark)
- Message input with:
  - Text input field
  - Send button
  - Image picker button
- Handle keyboard avoiding view

**Acceptance Criteria**:
- Chat screen displays messages correctly
- Messages styled appropriately
- Own vs other messages clearly distinguished
- Timestamps displayed
- Input works smoothly
- Keyboard doesn't cover input
- Auto-scroll works

---

### PR-6B: Real-Time Message Updates
**Prerequisites**: PR-6A (chat screen), PR-5A (message service)

**Tasks**:
- Implement real-time message listener in chat screen
- Subscribe to conversation messages on mount
- Unsubscribe on unmount
- Update message list on new messages
- Handle message state updates
- Scroll to bottom on new message (own or other)
- Show message delivery animations
- Update conversation last message in list

**Acceptance Criteria**:
- New messages appear in real-time
- Message state updates in real-time
- No memory leaks (proper cleanup)
- Smooth animations
- Conversation list updates

---

### PR-6C: Send Text Messages
**Prerequisites**: PR-6A (chat screen), PR-5B (optimistic UI)

**Tasks**:
- Connect send button to message service
- Implement `handleSendMessage`:
  - Validate input (non-empty)
  - Call `sendTextMessage`
  - Clear input field
  - Show message immediately (optimistic)
  - Update state on confirmation
- Handle send failures with retry option
- Disable send button while sending
- Handle long messages (no arbitrary limits for MVP)

**Acceptance Criteria**:
- Can send text messages
- Messages appear immediately
- State updates to 'sent'
- Input clears after send
- Validation works

---

## Block 7: Image Support
*Depends on: PR-5A, PR-6A*

### PR-7A: Image Upload Service
**Prerequisites**: PR-2A (Firebase Storage configured), PR-5A (message service)

**Tasks**:
- Install `expo-image-picker`
- Create image service (`src/services/image.ts`):
  - `pickImage()` - launch image picker
  - `compressImage(uri, maxSize)` - compress to <2MB
  - `uploadImage(uri, conversationId)` - upload to Firebase Storage
  - `getImageUrl(path)` - get download URL
- Create storage paths: `/images/{conversationId}/{messageId}.jpg`
- Add upload progress tracking
- Handle upload errors with retry

**Acceptance Criteria**:
- Can pick images from library
- Images compress before upload
- Images upload to Firebase Storage
- Download URLs generated
- Progress tracked

---

### PR-7B: Send Image Messages
**Prerequisites**: PR-7A (image service), PR-6A (chat screen), PR-5B (optimistic UI)

**Tasks**:
- Connect image picker button to image service
- Implement `handleSendImage`:
  - Pick image
  - Show image preview with loading indicator
  - Compress image
  - Upload to Firebase Storage
  - Send message with imageUrl
  - Show optimistically with local URI
  - Update with remote URL when uploaded
- Display uploaded images in message bubbles
- Add image loading states
- Add tap to view full-screen (basic implementation)
- Handle upload failures

**Acceptance Criteria**:
- Can pick and send images
- Image preview shown immediately
- Upload progress visible
- Images display in chat
- Tap to view works
- Handles failures gracefully

---

## Block 8: Group Chat Features
*Depends on: PR-4A, PR-6A*

### PR-8A: Group Message Attribution
**Prerequisites**: PR-4A (conversation service), PR-6A (chat screen), PR-3B (user profiles)

**Tasks**:
- Update message bubble component for groups
- Show sender name above message (except own messages)
- Show sender initial avatar next to message
- Create `src/components/InitialAvatar.tsx`:
  - Display first letter of display name
  - Consistent color per user (hash name to color)
  - Small size for message bubbles
- Fetch sender profiles for group messages
- Cache sender profiles locally
- Handle unknown senders gracefully

**Acceptance Criteria**:
- Group messages show sender names
- Initial avatars display correctly
- Colors consistent per user
- Own messages don't show sender
- Works smoothly without lag

---

### PR-8B: Group Conversation Management
**Prerequisites**: PR-8A (group attribution), PR-4A (conversation service)

**Tasks**:
- Update conversation header for groups:
  - Show all participant names (comma-separated, truncated if long)
  - Show participant count
  - Tap to view group details (simple modal)
- Create group details modal:
  - List all participants with names and online status
  - Show group creation date
  - Close button
- Ensure message delivery to all participants
- Test with 3, 4, and 5 participants
- Optimize Firebase queries for groups

**Acceptance Criteria**:
- Group headers show participant info
- Group details modal works
- Messages deliver to all participants
- Works smoothly with 5 users
- No performance issues

---

## Block 9: Push Notifications
*Depends on: PR-2A, PR-5A*

### PR-9A: FCM Setup & Foreground Notifications
**Prerequisites**: PR-2A (Firebase configured), PR-5A (message service)

**Tasks**:
- Install `expo-notifications`
- Configure FCM in Firebase Console with Expo credentials
- Create notification service (`src/services/notifications.ts`):
  - `registerForPushNotifications()`
  - `getExpoPushToken()`
  - `setupNotificationListeners()`
- Request notification permissions on app launch
- Store FCM token in user profile (RTDB)
- Set up foreground notification handler:
  - Show notification when message received in foreground
  - Include sender name and message preview
  - Don't show for own messages
- Set up notification tap handler:
  - Navigate to conversation on tap
- Test with app in foreground

**Acceptance Criteria**:
- FCM configured with Expo
- Permissions requested
- Tokens stored in RTDB
- Foreground notifications appear
- Tap navigation works
- Own messages don't trigger notifications

---

### PR-9B: Notification Triggers
**Prerequisites**: PR-9A (notification service), PR-5A (message service)

**Tasks**:
- Create Firebase Cloud Function or use RTDB triggers for sending notifications
- Trigger notification on new message:
  - Get recipient FCM tokens from RTDB
  - Send notification via Firebase Admin SDK or Expo Push API
  - Include conversation ID in payload
  - Include sender name and message text
- Handle group messages (notify all except sender)
- Don't send if recipient is currently in conversation (track active conversation)
- Handle notification failures gracefully

**Acceptance Criteria**:
- Notifications sent on new messages
- Group notifications work (all participants notified)
- Payload includes correct data
- No notifications for active conversation
- Handles failures

---

## Block 10: Testing & Polish
*Depends on: All previous blocks*

### PR-10A: App Lifecycle Handling
**Prerequisites**: All core features complete (PR-5C, PR-6B, PR-9A)

**Tasks**:
- Install `expo-app-state`
- Handle app state changes:
  - Foreground: resume sync, update presence
  - Background: pause non-critical sync, maintain presence briefly
  - Inactive: pause sync
- Test message sending during state transitions
- Ensure messages complete after backgrounding mid-send
- Test force-quit and reopen scenarios
- Ensure no data loss during lifecycle changes
- Update online presence appropriately

**Acceptance Criteria**:
- App handles all state transitions
- Messages complete after backgrounding
- No data loss on force-quit
- Presence updates correctly
- Passes app lifecycle test scenario

---

### PR-10B: Error Handling & Edge Cases
**Prerequisites**: All core features complete

**Tasks**:
- Add comprehensive error handling:
  - Network errors
  - Firebase errors
  - Auth errors
  - Image upload errors
  - Permission errors
- Create error display component (`src/components/ErrorBanner.tsx`)
- Add retry mechanisms for failed operations
- Handle edge cases:
  - Empty conversations
  - Deleted users
  - Very long messages
  - Special characters in messages
  - Invalid image formats
  - Large images (>10MB before compression)
- Add loading states everywhere
- Add empty states for all lists
- Test with poor network conditions

**Acceptance Criteria**:
- All errors caught and handled
- User-friendly error messages
- Retry options where appropriate
- Edge cases handled gracefully
- No crashes

---

### PR-10C: Performance Optimization
**Prerequisites**: All core features complete

**Tasks**:
- Optimize message list rendering:
  - Implement virtualization for long conversations
  - Lazy load messages (pagination)
  - Optimize re-renders
- Optimize image loading:
  - Use image caching
  - Show thumbnails, lazy load full images
- Optimize Firebase queries:
  - Add appropriate indexes
  - Limit query results
  - Use efficient listeners
- Reduce unnecessary re-renders:
  - Memoize components
  - Optimize context usage
- Test app launch time
- Test message delivery speed
- Profile with React DevTools

**Acceptance Criteria**:
- App launches <2s
- Message list scrolls smoothly
- Images load efficiently
- Passes rapid-fire test (20+ messages)
- No performance degradation

---

### PR-10D: MVP Testing Suite
**Prerequisites**: All features complete

**Tasks**:
- Set up test environment (2+ devices with Expo Go)
- Execute all required test scenarios:
  1. Two-device real-time test
  2. Offline scenario test
  3. App lifecycle test
  4. Poor network test
  5. Rapid-fire test (20+ messages)
  6. Group chat test (3+ users)
  7. Push notification test
- Document test results
- Fix any critical bugs found
- Create test user accounts
- Verify all MVP requirements met
- Test on both iOS and Android

**Acceptance Criteria**:
- All 7 test scenarios pass
- No critical bugs
- Works on iOS and Android
- Test documentation complete

---

## Block 11: Deployment & Documentation
*Depends on: PR-10D (testing complete)*

### PR-11A: Deployment & Publishing
**Prerequisites**: PR-10D (testing complete)

**Tasks**:
- Configure `app.json` for production
- Set up environment variables properly
- Publish to Expo servers:
  ```bash
  expo publish
  ```
- Generate QR code and shareable link
- Test installation via Expo Go on fresh devices
- Create demo user accounts (at least 3)
- Verify Firebase security rules are production-ready
- Monitor Firebase usage/costs
- Create troubleshooting guide

**Acceptance Criteria**:
- App published to Expo
- Accessible via QR code/link
- Works on fresh installs
- Demo accounts created
- Security verified

---

### PR-11B: Documentation & README
**Prerequisites**: PR-11A (deployment complete)

**Tasks**:
- Create comprehensive README with:
  - Project overview
  - Features implemented
  - Tech stack
  - Setup instructions for developers
  - Firebase configuration steps
  - Environment variables needed
  - How to run locally
  - How to test via Expo Go
  - Demo user credentials
  - Known limitations
  - Troubleshooting section
- Document project structure
- Add code comments where needed
- Create `.env.example` file
- Add contribution guidelines (for future)

**Acceptance Criteria**:
- README is complete and clear
- Setup instructions work
- All necessary info documented
- Code well-commented

---

### PR-11C: Demo Video Preparation
**Prerequisites**: PR-11A (deployment complete), PR-10D (testing done)

**Tasks**:
- Prepare 2 devices for recording (iOS and Android if possible)
- Create demo script covering:
  - Real-time messaging between devices
  - Group chat with 3+ participants
  - Offline scenario (airplane mode test)
  - App lifecycle handling
  - All required MVP features
- Set up screen recording on both devices
- Practice demo flow
- Record demo video (5-7 minutes)
- Edit video if needed
- Upload video (YouTube, Loom, etc.)
- Add video link to README

**Acceptance Criteria**:
- Demo video recorded
- All required scenarios shown
- Video is 5-7 minutes
- Video uploaded and accessible
- Link in README

---

## MVP Stretch Goals
*Only if time permits - not blocking*

### SG-1: Typing Indicators
**Prerequisites**: PR-5A (message service), PR-6A (chat screen)

**Tasks**:
- Add typing state to conversation RTDB structure
- Implement typing detection in message input
- Send typing status to Firebase (debounced)
- Listen to other users' typing status
- Display "User is typing..." indicator in chat
- Auto-clear typing after inactivity (3s)
- Handle multiple users typing in groups ("3 people are typing...")

---

### SG-2: Multi-Language UI Infrastructure
**Prerequisites**: PR-1A (project initialized)

**Tasks**:
- Install `expo-localization` and `i18n-js`
- Create translation files (`/locales/en.json`, `/locales/es.json`, etc.)
- Set up i18n configuration
- Wrap all UI strings in translation function
- Detect device language
- Create language switcher in settings (basic)
- Translate key screens to 2-3 languages

---

## Summary: Development Block Dependencies

```
Block 1: Foundation (1A, 1B, 1C) - Parallel, no dependencies
    ↓
Block 2: Auth (2A, 2B) - Requires 1A, 1B
    ↓
Block 3: Presence (3A, 3B) - Requires 2A
    ↓
Block 4: Conversations (4A → 4B, 4C) - Requires 1C, 2A
    ↓
Block 5: Messaging (5A → 5B → 5C) - Requires 1C, 2A, 4A
    ↓
Block 6: Chat UI (6A → 6B, 6C) - Requires 4A, 5A, 3B
    ↓
Block 7: Images (7A → 7B) - Requires 5A, 6A (Parallel with Block 8 & 9)
Block 8: Groups (8A → 8B) - Requires 4A, 6A (Parallel with Block 7 & 9)
Block 9: Notifications (9A → 9B) - Requires 2A, 5A (Parallel with Block 7 & 8)
    ↓
Block 10: Polish (10A, 10B, 10C → 10D) - Requires all above
    ↓
Block 11: Deploy (11A → 11B, 11C) - Requires 10D
```

**Estimated Timeline**: 22-24 hours for core MVP, assuming parallel development where possible.