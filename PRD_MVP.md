# Product Requirements Document: MessageAI MVP
## International Communicator Edition

---

## 1. Executive Summary

**Project Name**: MessageAI  
**Version**: MVP (24-hour checkpoint)  
**Target Persona**: International Communicator  
**Platform**: React Native with Expo (Expo Go testing)  
**Backend**: Firebase (Realtime Database, Auth, Storage, Cloud Messaging)  
**Development Approach**: AI-driven development with no human-generated code  
**Timeline**: 24 hours to MVP checkpoint

### Purpose
Build a production-quality messaging application that solves communication barriers for people with friends, family, and colleagues speaking different languages. The MVP focuses on rock-solid messaging infrastructure with real-time delivery, offline support, and cross-device synchronization.

### Success Criteria
- Reliable one-on-one messaging between 2+ users
- Basic group chat (3-5 users)
- Messages persist through app restarts
- Graceful offline/online handling
- Deployed and testable via Expo Go

---

## 2. User Persona

**Primary Persona**: International Communicator

**Profile**: 
- Has friends, family, or colleagues speaking different languages
- Needs to communicate across language barriers regularly
- Values reliable message delivery over feature complexity
- Often deals with poor network conditions (international connections)
- Needs messages to persist and sync reliably across devices

**Core Pain Points** (to be addressed post-MVP):
- Language barriers in conversations
- Translation nuances and context
- Copy-paste translation overhead
- Learning difficulty with new languages

---

## 3. MVP Scope

### 3.1 In-Scope Features (MVP Requirements)

#### Authentication & User Management
- Email/password authentication via Firebase Auth
- User profiles with display names
- Initial-based avatars (first letter of display name)
- User account persistence

#### One-on-One Chat
- Real-time text message delivery between two users
- Message timestamps (ISO 8601 format)
- Message persistence in local storage
- Message state: `sending`, `sent`
- Optimistic UI updates (messages appear immediately)
- Online/offline status indicators per user

#### Group Chat
- Support for 3-5 users in a single conversation
- Message attribution (showing sender in group context)
- Real-time delivery to all group members
- Basic group creation/management

#### Message Infrastructure
- Text message support (required)
- Image sending/receiving via Firebase Storage (required)
- Message delivery queue for offline scenarios
- Automatic sync when connectivity restored
- Handle app lifecycle (background/foreground/force-quit)

#### Push Notifications
- Foreground notifications (required for MVP)
- Firebase Cloud Messaging integration via Expo
- Notification payload includes sender and message preview

#### Network Resilience
- Graceful handling of poor network conditions
- Message queueing during offline periods
- Visual "sending" state for queued messages
- Retry logic for failed sends
- Connection status indicator in UI

#### Deployment
- Expo Go compatible build
- Firebase backend deployed and accessible
- Testable on iOS and Android via Expo Go

### 3.2 Out-of-Scope for MVP (Final Submission Requirements)

**To be implemented for final submission**:
- Profile pictures (upload/display)
- Message delivery receipts (`delivered` state)
- Message read receipts (`read` state)
- Background/killed app push notifications
- Typing indicators
- All AI features (translation, language detection, cultural hints, formality adjustment, slang explanations)
- Advanced contextual AI features
- Context-aware smart replies

### 3.3 MVP Stretch Goals (if time permits)

**Priority 1**: Typing indicators  
**Priority 2**: Basic multi-language UI support (i18n infrastructure)

### 3.4 Explicitly Out-of-Scope

**Not part of project at all**:
- End-to-end encryption
- Voice/video calls
- Message editing/deletion
- Message reactions
- File attachments (other than images)
- Contact discovery/sync
- Phone number authentication
- AI chat interface (noted as potential future feature)

---

## 4. Technical Architecture

### 4.1 Technology Stack

**Mobile Frontend**:
- React Native
- Expo SDK (latest stable)
- Expo Go for testing/deployment
- Expo Router for navigation
- Expo SQLite for local persistence
- Expo Notifications for FCM integration
- React Native Firebase for real-time sync

**Backend Services**:
- Firebase Realtime Database (primary datastore)
- Firebase Authentication (email/password)
- Firebase Storage (image uploads)
- Firebase Cloud Messaging (push notifications)

**AI Integration** (post-MVP):
- OpenAI GPT-4 or Anthropic Claude
- Firebase Cloud Functions for secure API calls
- AI SDK by Vercel or LangChain for agent framework

### 4.2 Data Models

#### User
```typescript
{
  uid: string,
  email: string,
  displayName: string,
  createdAt: timestamp,
  lastSeen: timestamp,
  online: boolean
}
```

#### Message
```typescript
{
  messageId: string,
  conversationId: string,
  senderId: string,
  text?: string,
  imageUrl?: string,
  timestamp: timestamp,
  state: 'sending' | 'sent',
  localId?: string  // for optimistic updates
}
```

#### Conversation
```typescript
{
  conversationId: string,
  type: 'direct' | 'group',
  participantIds: string[],
  lastMessage: {
    text: string,
    timestamp: timestamp,
    senderId: string
  },
  createdAt: timestamp
}
```

### 4.3 Firebase Realtime Database Structure

```
/users/{uid}
  - email
  - displayName
  - online
  - lastSeen

/conversations/{conversationId}
  - type
  - participantIds[]
  - lastMessage
  - createdAt

/messages/{conversationId}/{messageId}
  - senderId
  - text
  - imageUrl
  - timestamp
  - state

/userConversations/{uid}/{conversationId}
  - lastRead (for future read receipts)
```

### 4.4 Local Storage (Expo SQLite)

**Messages Table**:
- Caches all messages for offline access
- Syncs with Firebase RTDB when online
- Queues outgoing messages when offline

**Conversations Table**:
- Caches conversation metadata
- Updates lastMessage from local data

**SyncQueue Table**:
- Tracks pending operations (send message, send image)
- Processes queue when connectivity returns

### 4.5 Real-Time Synchronization

**Message Flow**:
1. User sends message → immediately appears in UI (optimistic)
2. Message added to local SQLite with state='sending'
3. If online: push to Firebase RTDB
4. On successful write: update local state to 'sent'
5. If offline: add to sync queue
6. When back online: process sync queue

**Receiving Messages**:
1. Firebase RTDB listener detects new message
2. Message saved to local SQLite
3. UI updates from local database
4. Push notification triggered (if app backgrounded)

### 4.6 Offline Handling Strategy

**Offline Detection**:
- Monitor Firebase connection state
- Display connection indicator in UI
- Queue all operations when offline

**Reconnection**:
- Process sync queue in chronological order
- Update message states as operations complete
- Handle conflicts (duplicate detection via localId)

---

## 5. User Experience Requirements

### 5.1 Core User Flows

#### First-Time User Flow
1. Open app → see welcome/login screen
2. Enter email and password → create account
3. Set display name
4. See empty conversation list
5. Create new conversation or wait for invitation

#### Send Message Flow (Online)
1. Open conversation
2. Type message in input field
3. Tap send button
4. Message appears immediately with "sending" indicator
5. Indicator changes to "sent" when confirmed
6. Recipient sees message appear in real-time

#### Send Message Flow (Offline)
1. User goes offline (visible indicator)
2. Type and send message
3. Message appears with "sending" state
4. Message remains in queue
5. User comes back online (indicator updates)
6. Message automatically sends
7. State updates to "sent"

#### Receive Message Flow
1. Recipient's app is open
2. Message appears in real-time in conversation
3. Conversation list updates with latest message preview
4. If app backgrounded: push notification appears

#### Group Chat Flow
1. Create new group conversation
2. Select 2-4 other participants (3-5 total)
3. Send message
4. All participants see message with sender attribution
5. Each participant can reply
6. Messages appear in chronological order for all

### 5.2 UI Requirements

#### Conversation List Screen
- List of conversations (sorted by most recent activity)
- Each item shows:
  - Participant name(s) or group name
  - Last message preview (truncated)
  - Timestamp
  - Unread indicator (future: count)
  - Online status for direct messages
- Pull to refresh
- New conversation button (floating action button)

#### Chat Screen
- Header with conversation name and online status
- Scrollable message list (newest at bottom)
- Each message shows:
  - Sender name (in groups) or omit (in direct chats)
  - Message text or image
  - Timestamp
  - State indicator (sending/sent)
- Message input field at bottom
- Send button
- Image picker button
- Connection status indicator (top of screen or in header)

#### Message Bubbles
- Own messages: aligned right, distinct color
- Others' messages: aligned left, different color
- Sender initial avatar (groups only)
- Timestamp below message
- State icon (sending: spinner, sent: checkmark)

#### Connection Indicator
- Online: green dot or "Connected" text
- Offline: red/yellow dot or "Offline - messages will send when connected"
- Reconnecting: animated indicator

### 5.3 Performance Requirements

**Message Delivery**:
- Messages appear in sender's UI within 100ms (optimistic)
- Messages delivered to online recipients within 500ms
- Offline message queue processes within 2s of reconnection

**App Launch**:
- App becomes interactive within 2s on modern devices
- Cached conversations visible immediately
- Network sync happens in background

**Image Handling**:
- Images compress before upload (max 2MB)
- Loading indicators for image uploads
- Thumbnail preview while uploading

**Group Chat**:
- Support 5 concurrent users smoothly
- Messages sync reliably for all participants
- No message loss or duplication

**Network Resilience**:
- Works on 3G connections
- Handles intermittent connectivity
- Graceful degradation (queue messages, show status)

---

## 6. Testing Requirements

### 6.1 MVP Test Scenarios (Required)

**Two-Device Real-Time Test**:
- Send message from Device A to Device B
- Verify message appears within 500ms
- Verify message persists after app restart on both devices

**Offline Scenario Test**:
- Device A goes offline (airplane mode)
- Device B sends message
- Verify Device A doesn't receive message yet
- Device A comes back online
- Verify Device A receives all missed messages
- Verify no duplicates

**App Lifecycle Test**:
- Send message while app in foreground
- Background app mid-send
- Verify message completes
- Force-quit app
- Reopen app
- Verify message sent successfully

**Poor Network Test**:
- Enable network throttling (simulated 3G)
- Send multiple messages
- Verify all messages eventually send
- Verify correct ordering maintained

**Rapid-Fire Test**:
- Send 20+ messages quickly
- Verify all messages appear
- Verify correct chronological order
- Verify no duplicates
- Verify all reach recipient

**Group Chat Test**:
- Create conversation with 3+ users
- Each user sends message
- Verify all messages appear for all participants
- Verify correct sender attribution
- Verify delivery to all members

**Push Notification Test**:
- Open app, receive message (foreground notification)
- Background app, receive message
- Verify notification appears
- Tap notification
- Verify app opens to correct conversation

### 6.2 Test Devices

**Minimum Test Configuration**:
- 1 iOS device (physical or simulator)
- 1 Android device (physical or emulator)
- Both running Expo Go
- Test on same and different networks

---

## 7. Success Metrics

### 7.1 MVP Checkpoint Metrics

**Hard Gates** (must pass):
- ✅ Two users can send/receive messages in real-time
- ✅ Messages persist after app restart
- ✅ Basic group chat works with 3 users
- ✅ Offline queue works (send when offline, delivers on reconnect)
- ✅ Online/offline status visible
- ✅ Push notifications work in foreground
- ✅ App deployed and testable via Expo Go

**Quality Gates** (should pass):
- Messages deliver within 500ms when online
- No message loss in offline scenarios
- No duplicate messages
- App feels responsive (optimistic UI works)

### 7.2 Technical Debt Acknowledgment

Items deferred from MVP to final submission:
- Profile picture upload/display
- Delivered/read message states
- Background/killed app notifications
- Typing indicators
- All AI features

---

## 8. Build Strategy

### 8.1 Development Phases (24-Hour Sprint)

**Phase 1: Foundation (Hours 0-4)**
- Set up Expo project with TypeScript
- Configure Firebase (RTDB, Auth, Storage)
- Set up navigation (Expo Router)
- Implement authentication screens
- Basic user profile creation

**Phase 2: Core Messaging (Hours 4-12)**
- Implement conversation list UI
- Build chat screen UI
- Set up local SQLite schema
- Implement optimistic message sending
- Firebase RTDB sync for messages
- Basic image upload to Firebase Storage

**Phase 3: Real-Time & Offline (Hours 12-18)**
- Real-time message listeners
- Offline detection and queue
- Sync queue processor
- Online/offline status indicators
- Message state management

**Phase 4: Group Chat & Polish (Hours 18-22)**
- Group conversation creation
- Group message attribution
- Push notification setup (FCM via Expo)
- Handle app lifecycle events
- Bug fixes and testing

**Phase 5: Testing & Deployment (Hours 22-24)**
- Run all required test scenarios
- Fix critical bugs
- Deploy to Expo Go
- Record demo video prep

### 8.2 AI Development Guidelines

**AI-Driven Development Principles**:
- Use AI coding assistants (Claude, Cursor, GitHub Copilot) for all code generation
- Start with high-level architecture prompts
- Iterate with specific feature requests
- Use AI for debugging and optimization
- No manual code writing

**Prompt Strategy**:
- Provide full context (this PRD, tech stack, constraints)
- Request complete file implementations
- Ask for error handling and edge cases
- Request tests alongside features
- Iterate based on errors and test results

**Quality Control**:
- AI-generated code must pass TypeScript checks
- Must handle errors gracefully
- Must follow React Native best practices
- Must work in Expo Go environment

---

## 9. Deployment Requirements

### 9.1 MVP Deployment

**Expo Go Setup**:
- App must run in Expo Go (no custom native modules requiring dev build)
- Published to Expo servers
- Shareable QR code/link for testing

**Firebase Setup**:
- Firebase project created and configured
- Realtime Database rules set up (authenticated access only)
- Storage rules configured (authenticated uploads only)
- Auth configured for email/password
- FCM configured with Expo

**Environment Configuration**:
- Firebase config in environment variables
- Expo project properly configured
- All API keys secured

### 9.2 Testing Access

**Required Artifacts**:
- Expo Go link/QR code
- Test user credentials (2+ accounts)
- Firebase console access for debugging
- README with setup instructions

---

## 10. Known Limitations & Risks

### 10.1 MVP Limitations

**Features Intentionally Limited**:
- Only email authentication (no phone/social)
- Initial avatars only (no profile pictures)
- No message editing/deletion
- No message reactions
- Basic group chat (max 5 users)
- No typing indicators
- No read receipts
- Image only (no other file types)

**Technical Constraints**:
- Expo Go compatibility requirements
- Firebase RTDB scale limits (acceptable for MVP)
- No end-to-end encryption
- Basic conflict resolution

### 10.2 Risks & Mitigations

**Risk**: Message delivery fails in edge cases  
**Mitigation**: Robust offline queue, retry logic, local persistence

**Risk**: Firebase costs exceed budget during testing  
**Mitigation**: Implement reasonable quotas, monitor usage

**Risk**: Expo Go limitations block features  
**Mitigation**: Research Expo compatibility before implementing features

**Risk**: 24-hour timeline too aggressive  
**Mitigation**: Focus on core messaging first, cut stretch goals if needed

**Risk**: Group chat performance issues  
**Mitigation**: Limit to 5 users in MVP, optimize queries

**Risk**: Image uploads slow on poor connections  
**Mitigation**: Image compression, progress indicators, queue for retry

---

## 11. Future Considerations (Post-MVP)

### 11.1 AI Features (Final Submission)

**Required AI Features** (for International Communicator persona):
1. Real-time inline translation
2. Language detection & auto-translate
3. Cultural context hints
4. Formality level adjustment
5. Slang/idiom explanations

**Advanced AI Feature** (choose one):
- A) Context-aware smart replies in multiple languages
- B) Intelligent processing: extract structured data from multilingual conversations

**AI Architecture** (to be implemented):
- Contextual AI features (primary approach)
- Firebase Cloud Functions for secure LLM API calls
- RAG pipeline for conversation context
- Function calling for tool use

### 11.2 Feature Roadmap

**Phase 2 (Final Submission - Days 2-7)**:
- All 5 required AI features
- One advanced AI capability
- Profile pictures
- Delivered/read receipts
- Typing indicators
- Background notifications
- UI polish and performance optimization

**Future Enhancements** (beyond project scope):
- Voice messages
- Video calls
- Message reactions
- Message search
- Contact sync
- Phone number authentication
- End-to-end encryption
- Desktop/web versions

---

## 12. Appendices

### 12.1 Key Resources

**Documentation**:
- Expo Documentation: https://docs.expo.dev/
- Firebase Realtime Database: https://firebase.google.com/docs/database
- React Native Firebase: https://rnfirebase.io/
- Expo Router: https://docs.expo.dev/router/introduction/

**Tools**:
- Expo Go app (iOS/Android)
- Firebase Console
- Expo CLI

### 12.2 Contact & Support

**Project**: MessageAI  
**Organization**: GauntletAI  
**Submission Deadline**: Tuesday (24 hours from start)  
**Final Deadline**: Sunday 10:59 PM CT

---

## Document Control

**Version**: 1.0  
**Date**: October 20, 2025  
**Author**: AI-Generated PRD  
**Status**: Approved for MVP Development  
**Next Review**: After MVP checkpoint (Tuesday)