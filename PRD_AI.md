# Product Requirements Document: MessageAI - Full Project
## AI-Enhanced Cross-Platform Messaging App - International Communicator

**Version:** 2.0 Full Project  
**Target Persona:** International Communicator  
**Timeline:** 84 hours (Sunday 11 PM deadline)  
**Current State:** MVP Complete with known issues  
**Grading Target:** 90+ points (Grade A)

---

## Executive Summary

This PRD covers the completion of MessageAI from MVP state to full project submission. The focus is on implementing AI features for the International Communicator persona, fixing MVP issues, completing required features (typing indicators, profile pictures), and delivering all required documentation and demo materials.

**Priorities (in order):**
1. Fix critical MVP bugs
2. Implement 5 required AI features + 1 advanced capability
3. Complete MVP stretch goals (typing indicators, profile pictures)
4. Polish & optimization
5. Documentation & demo preparation
6. Bonus features (if time permits)

---

## Current State Assessment

### Completed (MVP)
✅ Authentication (email/password)  
✅ One-on-one messaging  
✅ Group chat (3-5 users)  
✅ Real-time message delivery  
✅ Offline support & message queue  
✅ Message persistence (SQLite)  
✅ Optimistic UI updates  
✅ Message delivery states (sending, sent, delivered, read)  
✅ Read receipts  
✅ Online/offline presence  
✅ Image messaging with compression  
✅ Push notifications (foreground)  
✅ Chat list with sorting  
✅ User profiles with avatars (initials)  
✅ Firebase backend deployed  
✅ ~80% test coverage  

### Known Issues (MVP Bugs)
🐛 1:1 chats show generic "Chat" name instead of other user's display name  
🐛 Group naming field refills with placeholder when cleared  
🐛 Images lack caption support  
🐛 Chat list shows "no messages yet" for all chats (last message not displaying)  
🐛 Pull-to-refresh positioned at top instead of bottom  

### Missing (Required for Full Project)
❌ All 5 required AI features (30 points at stake)  
❌ Advanced AI capability - Context-Aware Smart Replies (10 points)  
❌ Typing indicators (required per rubric)  
❌ Profile pictures (required per rubric)  
❌ Architecture documentation  
❌ Demo video  
❌ Push notifications in background/killed state (8 points)  

---

## Grading Rubric Breakdown & Strategy

| Section | Points | Status | Strategy |
|---------|--------|--------|----------|
| **Core Messaging Infrastructure** | 35 | ✅ MVP Done | Fix bugs, ensure "Excellent" tier (33-35 pts) |
| **Mobile App Quality** | 20 | ⚠️ Partial | Add typing indicators, improve lifecycle (18-20 pts) |
| **AI Features** | 30 | ❌ Not Started | Implement all 6 features, prioritize accuracy (27-30 pts) |
| **Technical Implementation** | 10 | ✅ MVP Done | Add RAG, secure architecture (9-10 pts) |
| **Documentation & Deployment** | 5 | ⚠️ Partial | Complete docs, maintain deployment (5 pts) |
| **Deliverables (Pass/Fail)** | -30 | ❌ Incomplete | Demo video required (-15 if missing) |
| **Bonus Points** | +10 | ❌ None | Stretch goals if time permits |
| **Target Total** | **90+** | | A grade threshold |

---

## Project Phases

### Phase 1: Critical Bug Fixes & Foundation (Hours 0-8)
Fix MVP bugs that impact user experience and prepare foundation for AI features.

### Phase 2: AI Feature Implementation (Hours 8-40)
Implement all 5 required AI features plus Context-Aware Smart Replies.

### Phase 3: Required Features & Polish (Hours 40-60)
Add typing indicators, profile pictures, background notifications.

### Phase 4: Testing & Optimization (Hours 60-72)
Comprehensive testing, performance optimization, bug fixes.

### Phase 5: Documentation & Demo (Hours 72-84)
Architecture docs, demo video, final testing, submission preparation.

---

## Phase 1: Critical Bug Fixes & Foundation

### PR-040: Fix MVP Critical Bugs
**Dependencies:** None (all MVP PRs complete)  
**Estimated Time:** 3 hours  
**Prerequisites:** ✅ MVP complete

**Tasks:**
1. **Fix 1:1 Chat Naming** (1 hour):
   - Update ConversationScreen header logic
   - For 1:1 chats: Show other participant's displayName
   - For group chats: Show group name
   - Update ChatListItem to display correct name
   - Write unit tests for name resolution logic
   
2. **Fix Group Name Input Field** (30 min):
   - Update CreateGroupScreen input handling
   - Prevent auto-refill of placeholder
   - Clear field properly when user deletes all text
   - Test edge cases (paste, cut, undo)

3. **Fix Chat List Last Message Display** (1 hour):
   - Debug sync issue between messages and chat records
   - Ensure `lastMessage` field updates on new message
   - Update UI to display sender name + preview
   - Format: "You: message" or "Alice: message"
   - Show image icon for image messages
   - Test with multiple chats

4. **Fix Pull-to-Refresh Position** (30 min):
   - Move pull-to-refresh trigger to bottom of chat
   - Adjust FlatList inverted behavior if needed
   - Ensure loads older messages (pagination)
   - Test scroll behavior

**Validation:**
- [ ] 1:1 chats show other user's name
- [ ] Group name field behaves correctly
- [ ] Chat list shows accurate last messages
- [ ] Pull-to-refresh works at bottom
- [ ] All existing tests still pass

---

### PR-041: Add Image Captions
**Dependencies:** PR-040  
**Estimated Time:** 2 hours  
**Prerequisites:** ✅ PR-040 merged

**Tasks:**
1. **Update Message Model** (30 min):
   - Add optional `caption: string` field to Message interface
   - Update local SQLite schema
   - Create migration for existing messages
   - Update Firebase RTDB structure

2. **Update Image Input UI** (1 hour):
   - Add caption input field after image selection
   - Show image preview + caption field
   - Limit caption to 500 characters
   - Allow sending without caption (optional)
   - Update MessageInput component

3. **Update Message Display** (30 min):
   - Show caption below image in MessageBubble
   - Style caption text appropriately
   - Ensure caption visible in full-screen image view
   - Handle long captions (scrollable)

**Validation:**
- [ ] Can add caption to images
- [ ] Caption displays in chat
- [ ] Caption persists across app restart
- [ ] Can send images without captions
- [ ] Unit tests pass

---

### PR-042: OpenAI Swarm Setup & Architecture
**Dependencies:** PR-040, PR-041  
**Estimated Time:** 3 hours  
**Prerequisites:** ✅ PR-040, PR-041 merged

**Tasks:**
1. **Install Dependencies** (15 min):
   - Install OpenAI Swarm package
   - Install any required dependencies
   - Configure environment variables
   - Add OpenAI API key to Firebase Cloud Functions

2. **Create AI Service Layer** (1.5 hours):
   - Create `/src/services/ai/` directory structure:
     ```
     /ai
       /agents         # Swarm agent definitions
       /tools          # Function calling tools
       /prompts        # Prompt templates
       ai-client.ts    # OpenAI client wrapper
       rag.service.ts  # RAG pipeline
     ```
   - Implement `ai-client.ts` with OpenAI connection
   - Create base Swarm agent configuration
   - Implement error handling and retry logic
   - Add response streaming support

3. **Implement RAG Pipeline** (1 hour):
   - Create `rag.service.ts` for conversation context retrieval
   - Function: `getConversationContext(chatId, limit)` → formatted messages
   - Function: `buildContextPrompt(messages, query)` → prompt string
   - Retrieve last N messages from local database
   - Format for LLM consumption (role, content, timestamp)
   - Handle multilingual content encoding
   - Implement context window management (token limits)

4. **Create Tools/Functions** (30 min):
   - Define tool schemas for function calling
   - Tool: `get_message_history(chatId, limit)`
   - Tool: `get_user_preferences(userId)`
   - Tool: `detect_language(text)`
   - Format according to OpenAI function calling spec

**Validation:**
- [ ] OpenAI client connects successfully
- [ ] Swarm agent initializes
- [ ] RAG pipeline retrieves conversation context
- [ ] Function calling tools defined
- [ ] Error handling works
- [ ] API keys secured (not in client code)

---

## Phase 2: AI Feature Implementation

### PR-043: Language Detection & Auto-Translate
**Dependencies:** PR-042  
**Estimated Time:** 4 hours  
**Prerequisites:** ✅ PR-042 merged

**Tasks:**
1. **Language Detection Service** (1.5 hours):
   - Create `/src/services/ai/language-detection.service.ts`
   - Function: `detectLanguage(text)` → Promise<LanguageCode>
   - Use OpenAI for detection (fast, accurate)
   - Cache results to reduce API calls
   - Support 50+ languages
   - Fallback to 'en' if uncertain
   - Write unit tests with multilingual samples

2. **Auto-Translation Toggle** (1 hour):
   - Add user preference: `autoTranslateEnabled: boolean`
   - Add user preference: `preferredLanguage: LanguageCode`
   - Create settings UI:
     - Toggle for auto-translate
     - Language picker for preferred language
   - Store preferences in user profile
   - Sync to Firebase

3. **Message Translation on Receive** (1.5 hours):
   - Hook into message receive pipeline
   - Check if sender language ≠ user's preferred language
   - If auto-translate enabled: translate message
   - Store both original and translated text locally
   - Display translated text with indicator
   - Add "Show Original" button
   - Implement caching (don't re-translate same message)

**Validation:**
- [ ] Detects language accurately (>90% for common languages)
- [ ] Auto-translate works when enabled
- [ ] Can toggle between original and translated
- [ ] Translations cached
- [ ] Settings persist
- [ ] Response time <3s per message

**Desiderata (not required):**
- Response time <2s (Excellent tier)

---

### PR-044: Real-Time Inline Translation
**Dependencies:** PR-043  
**Estimated Time:** 3 hours  
**Prerequisites:** ✅ PR-043 merged

**Tasks:**
1. **Translation UI Component** (1 hour):
   - Create `/src/components/TranslationBubble.tsx`
   - Show original message
   - Show translated message below (subtle styling)
   - "Translate" button for on-demand translation
   - Language indicator badges (e.g., "🇪🇸 ES → 🇺🇸 EN")
   - Loading state while translating

2. **On-Demand Translation** (1 hour):
   - Long-press message → "Translate" option
   - Or: Translate button in message bubble (contextual)
   - Translate to user's preferred language
   - Cache translation result
   - Support translating own messages (for checking)

3. **Inline Translation Service** (1 hour):
   - Create translation agent using Swarm
   - Function: `translateMessage(text, fromLang, toLang)` → Promise<string>
   - Preserve formatting (line breaks, emphasis)
   - Handle special characters, emojis
   - Error handling for translation failures
   - Write unit tests

**Validation:**
- [ ] Can translate any message on demand
- [ ] Translations accurate and natural
- [ ] Formatting preserved
- [ ] Language indicators clear
- [ ] Response time <3s
- [ ] Works for 10+ language pairs

**Desiderata:**
- Response time <2s

---

### PR-045: Cultural Context Hints
**Dependencies:** PR-043, PR-044  
**Estimated Time:** 4 hours  
**Prerequisites:** ✅ PR-043, PR-044 merged

**Tasks:**
1. **Cultural Context Detection** (2 hours):
   - Create Swarm agent: `CulturalContextAgent`
   - Analyze messages for cultural references:
     - Holidays, festivals
     - Idioms, proverbs
     - Cultural norms (greetings, gestures)
     - Historical references
     - Local customs
   - Function: `analyzeCulturalContext(text, language)` → Promise<ContextHint[]>
   - Return hints only when relevant (not every message)
   - Use RAG to understand conversation context

2. **Context Hint UI** (1.5 hours):
   - Create `/src/components/ContextHint.tsx`
   - Small info icon next to message with cultural content
   - Tap to expand explanation
   - Show: Original phrase, meaning, cultural background
   - Dismissible hints
   - Cache shown hints (don't repeat)

3. **Hint Storage & Management** (30 min):
   - Store hints locally to avoid re-analysis
   - Track which hints user has seen
   - Allow user to disable hints in settings
   - Batch hint requests (analyze multiple messages)

**Validation:**
- [ ] Detects cultural references accurately
- [ ] Hints are helpful and informative
- [ ] UI is unobtrusive
- [ ] Can disable hints
- [ ] Response time <5s for analysis
- [ ] Works across multiple cultures

**Desiderata:**
- Response time <3s

---

### PR-046: Formality Level Adjustment
**Dependencies:** PR-044  
**Estimated Time:** 3 hours  
**Prerequisites:** ✅ PR-044 merged

**Tasks:**
1. **Formality Detection** (1 hour):
   - Create Swarm agent: `FormalityAgent`
   - Analyze message formality level:
     - Informal/casual
     - Neutral/standard
     - Formal/polite
     - Very formal/official
   - Function: `detectFormality(text, language)` → Promise<FormalityLevel>
   - Consider cultural norms per language

2. **Formality Adjustment Service** (1.5 hours):
   - Function: `adjustFormality(text, fromLevel, toLevel, language)` → Promise<string>
   - Provide suggestions before sending:
     - "Make more formal"
     - "Make more casual"
   - Preserve meaning while adjusting tone
   - Show comparison (original vs. adjusted)
   - Use Swarm for multi-step reasoning

3. **Formality UI** (30 min):
   - Add formality indicator to message input
   - Show detected formality level of draft
   - Quick action buttons: "↑ More Formal" / "↓ More Casual"
   - Preview adjusted message before sending
   - Accept or modify suggestion

**Validation:**
- [ ] Detects formality accurately
- [ ] Adjustments sound natural
- [ ] Meaning preserved
- [ ] Works for multiple languages
- [ ] Response time <4s
- [ ] UI is intuitive

**Desiderata:**
- Response time <2s

---

### PR-047: Slang & Idiom Explanations
**Dependencies:** PR-043, PR-044  
**Estimated Time:** 3 hours  
**Prerequisites:** ✅ PR-043, PR-044 merged

**Tasks:**
1. **Slang/Idiom Detection** (1.5 hours):
   - Create Swarm agent: `SlangIdiomAgent`
   - Detect slang, idioms, colloquialisms in messages
   - Function: `detectSlangIdioms(text, language)` → Promise<SlangItem[]>
   - Identify phrases that may need explanation
   - Return: phrase, literal meaning, cultural meaning, usage example
   - Use RAG for context-aware detection

2. **Explanation UI** (1 hour):
   - Underline or highlight slang/idioms in messages
   - Tap to see explanation popup
   - Show:
     - Phrase
     - Literal translation
     - Actual meaning
     - Usage example
     - Cultural notes
   - "Got it" button to dismiss and remember
   - Glossary view (all saved explanations)

3. **Learning & Personalization** (30 min):
   - Track which slang user has learned
   - Don't re-highlight learned phrases
   - User can mark "I know this" to skip future highlights
   - Store in user preferences

**Validation:**
- [ ] Detects slang/idioms accurately
- [ ] Explanations clear and helpful
- [ ] Learns user's knowledge
- [ ] UI is unobtrusive
- [ ] Works across languages
- [ ] Response time <4s

**Desiderata:**
- Response time <2s

---

### PR-048: Context-Aware Smart Replies (Advanced AI)
**Dependencies:** PR-043, PR-044, PR-045, PR-046, PR-047  
**Estimated Time:** 6 hours  
**Prerequisites:** ✅ PR-043, PR-044, PR-045, PR-046, PR-047 merged

**Tasks:**
1. **User Style Learning** (2 hours):
   - Create Swarm agent: `SmartReplyAgent`
   - Analyze user's message history:
     - Common phrases
     - Tone and formality preferences
     - Emoji usage patterns
     - Message length preferences
     - Language mixing patterns (if multilingual)
   - Function: `buildUserProfile(userId)` → Promise<UserStyleProfile>
   - Use RAG to analyze last 100+ messages
   - Extract style attributes
   - Update profile periodically

2. **Smart Reply Generation** (3 hours):
   - Function: `generateSmartReplies(conversationContext, recipientLanguage, userStyle)` → Promise<Reply[]>
   - Generate 3+ relevant reply options
   - Match user's style in target language
   - Consider conversation context (last 5-10 messages)
   - Handle code-switching (multilingual users)
   - Each reply:
     - Appropriate language
     - Natural tone
     - Contextually relevant
     - Different options (agree, question, continue, etc.)
   - Use multi-agent workflow:
     - Agent 1: Understand context
     - Agent 2: Generate candidates
     - Agent 3: Style matching
     - Agent 4: Quality check

3. **Smart Reply UI** (1 hour):
   - Show reply suggestions above keyboard
   - Horizontal scrollable chips
   - Tap to insert reply
   - Can edit before sending
   - Loading state while generating
   - Refresh button for new suggestions
   - Hide if not relevant (e.g., user typing)

**Validation:**
- [ ] Replies sound authentic to user's style
- [ ] Relevant to conversation context
- [ ] Works in multiple languages
- [ ] Generates 3+ diverse options
- [ ] Response time <15s (Excellent tier for agents)
- [ ] Accuracy >80% (users actually use replies)
- [ ] Seamless integration

**Desiderata:**
- Response time <8s
- Accuracy >90%

---

### PR-049: AI Feature Integration & Polish
**Dependencies:** PR-043, PR-044, PR-045, PR-046, PR-047, PR-048  
**Estimated Time:** 3 hours  
**Prerequisites:** ✅ All AI feature PRs merged

**Tasks:**
1. **AI Settings Screen** (1 hour):
   - Create `/src/screens/AISettingsScreen.tsx`
   - Toggles for each AI feature:
     - Auto-translate
     - Cultural context hints
     - Slang/idiom explanations
     - Smart replies
     - Formality suggestions
   - Preferred language picker
   - "Reset AI Learnings" button
   - Test all toggles

2. **AI Loading States** (30 min):
   - Consistent loading indicators for all AI features
   - Skeleton loaders where appropriate
   - Clear feedback when AI is processing
   - Timeout handling (30s max)

3. **AI Error Handling** (1 hour):
   - Graceful degradation if AI unavailable
   - Clear error messages:
     - "Translation unavailable"
     - "Unable to generate replies"
   - Retry mechanisms
   - Fallback behaviors (app still usable)
   - Log errors for debugging

4. **AI Performance Optimization** (30 min):
   - Batch AI requests where possible
   - Cache aggressively (translations, detections)
   - Debounce user inputs (formality, smart replies)
   - Implement request queuing
   - Monitor API usage/costs

**Validation:**
- [ ] All AI features accessible from settings
- [ ] Loading states clear and consistent
- [ ] Errors handled gracefully
- [ ] App remains usable if AI fails
- [ ] Performance acceptable under load
- [ ] User experience smooth

---

## Phase 3: Required Features & Polish

### PR-050: Typing Indicators
**Dependencies:** PR-040 (bug fixes)  
**Estimated Time:** 3 hours  
**Prerequisites:** ✅ PR-040 merged

**Tasks:**
1. **Typing State Management** (1 hour):
   - Add typing state to Firebase RTDB:
     ```
     /typing/{chatId}/{userId}: {
       isTyping: boolean,
       timestamp: number
     }
     ```
   - Use `onDisconnect()` to clear typing state
   - Throttle typing updates (send max every 2s)
   - Clear on message send or 5s inactivity

2. **Typing Detection** (1 hour):
   - Hook into MessageInput `onChangeText`
   - Set user typing state on input change
   - Debounce updates (wait 300ms)
   - Clear typing state on:
     - Message sent
     - Input cleared
     - User navigates away
     - 5s of inactivity

3. **Typing Indicator UI** (1 hour):
   - Create `/src/components/TypingIndicator.tsx`
   - Show in ConversationScreen header or above message input
   - Format:
     - 1:1: "Alice is typing..."
     - Group: "Alice and Bob are typing..."
     - Multiple: "Alice, Bob, and 2 others are typing..."
   - Animated dots (...)
   - Update in real-time
   - Handle multiple users typing simultaneously

**Validation:**
- [ ] Typing indicators appear promptly
- [ ] Clear when user stops typing
- [ ] Work in 1:1 and group chats
- [ ] Multiple users handled correctly
- [ ] No performance impact
- [ ] Smooth animations

---

### PR-051: Profile Pictures
**Dependencies:** PR-023 (image upload service), PR-040  
**Estimated Time:** 3 hours  
**Prerequisites:** ✅ PR-023, PR-040 merged

**Tasks:**
1. **Profile Picture Upload** (1.5 hours):
   - Create profile edit screen
   - Image picker for profile photo
   - Crop/resize UI (square crop)
   - Upload to Firebase Storage: `/profile-pictures/{uid}.jpg`
   - Compress to 512x512, <200KB
   - Update user profile with photo URL
   - Sync to Firebase RTDB

2. **Avatar Component Updates** (1 hour):
   - Update `/src/components/Avatar.tsx`
   - Show profile picture if available
   - Fallback to initials if no picture
   - Cache images locally
   - Progressive loading (placeholder → image)
   - Handle loading errors (show initials)

3. **Profile Picture Display** (30 min):
   - Update all locations using Avatar:
     - Chat list
     - Conversation screen (messages in groups)
     - Group member list
     - User search
     - Profile screens
   - Test with and without profile pictures
   - Ensure consistent sizing

**Validation:**
- [ ] Can upload profile picture
- [ ] Picture displays everywhere
- [ ] Fallback to initials works
- [ ] Images cached properly
- [ ] Performance acceptable
- [ ] Compressed correctly

---

### PR-052: Background/Killed Push Notifications
**Dependencies:** PR-031 (foreground notifications)  
**Estimated Time:** 2 hours  
**Prerequisites:** ✅ PR-031 merged

**Tasks:**
1. **Background Notification Handling** (1 hour):
   - Configure Expo notifications for background
   - Test notification delivery when app backgrounded
   - Ensure notification data includes chatId
   - Test deep linking from background notifications
   - Verify badge counts update

2. **Killed State Notification Handling** (1 hour):
   - Test notifications when app completely closed
   - Ensure app launches to correct chat
   - Test notification tap handling
   - Verify no message loss during app restart
   - Test on physical device

**Validation:**
- [ ] Notifications received when app backgrounded
- [ ] Notifications received when app killed
- [ ] Deep linking works from all states
- [ ] Badge counts accurate
- [ ] No message loss
- [ ] Works on physical device

---

### PR-053: Performance Optimization Pass
**Dependencies:** All AI features complete  
**Estimated Time:** 4 hours  
**Prerequisites:** ✅ PR-048, PR-049, PR-050, PR-051, PR-052 merged

**Tasks:**
1. **Message List Optimization** (1.5 hours):
   - Profile FlatList rendering with React DevTools
   - Implement `getItemLayout` if possible
   - Optimize `keyExtractor`
   - Tune `initialNumToRender`, `maxToRenderPerBatch`, `windowSize`
   - Memoize MessageBubble with React.memo
   - Use useCallback for all handlers
   - Test with 1000+ messages

2. **Image Loading Optimization** (1 hour):
   - Implement progressive image loading
   - Add image placeholders
   - Cache images efficiently
   - Lazy load images outside viewport
   - Test with conversation containing 50+ images

3. **AI Response Optimization** (1 hour):
   - Batch AI requests where possible
   - Implement request deduplication
   - Add aggressive caching
   - Stream responses when possible
   - Monitor API call frequency

4. **Database Optimization** (30 min):
   - Review SQLite queries
   - Add missing indexes if needed
   - Optimize pagination queries
   - Profile slow queries
   - Test with 10,000+ messages locally

**Validation:**
- [ ] Smooth 60fps scrolling through 1000+ messages
- [ ] App launch <3s (target <2s)
- [ ] AI responses <4s average (target <2s)
- [ ] No jank during typing
- [ ] Images load smoothly
- [ ] Database queries <500ms

**Desiderata:**
- App launch <2s (Excellent tier)
- AI responses <2s (Excellent tier)
- Scrolling 60fps through 5000+ messages

---

### PR-054: UI Polish & Consistency
**Dependencies:** All previous PRs  
**Estimated Time:** 3 hours  
**Prerequisites:** ✅ All feature PRs merged

**Tasks:**
1. **Design System Audit** (1 hour):
   - Review all screens for consistency
   - Ensure colors match theme
   - Check font sizes and weights
   - Verify spacing is consistent
   - Ensure button styles match
   - Check icon usage

2. **Animation Polish** (1 hour):
   - Smooth screen transitions
   - Message appearance animations
   - Loading state animations
   - Gesture feedback (haptics)
   - Keyboard animations

3. **Empty States** (1 hour):
   - Review all empty states:
     - No chats yet
     - No messages in conversation
     - No search results
     - No users found
     - No AI suggestions available
   - Ensure helpful and friendly
   - Add appropriate illustrations/icons
   - Clear call-to-action where relevant

**Validation:**
- [ ] UI consistent across all screens
- [ ] Animations smooth and purposeful
- [ ] Empty states helpful
- [ ] Professional appearance
- [ ] No visual glitches

---

## Phase 4: Testing & Optimization

### PR-055: Integration Testing - AI Features
**Dependencies:** All AI PRs (PR-043 through PR-049)  
**Estimated Time:** 3 hours  
**Prerequisites:** ✅ PR-043-049 merged

**Tasks:**
1. **Translation Integration Tests** (1 hour):
   - Test language detection accuracy with 20+ samples
   - Test translation quality across language pairs
   - Test auto-translate on/off behavior
   - Test inline translation
   - Test caching

2. **Cultural Context Tests** (1 hour):
   - Test cultural reference detection
   - Test hint quality and relevance
   - Test hint UI and dismissal
   - Test across multiple cultures

3. **Smart Reply Tests** (1 hour):
   - Test reply generation quality
   - Test style matching accuracy
   - Test multilingual replies
   - Test context awareness
   - Measure response times

**Validation:**
- [ ] All integration tests pass
- [ ] AI accuracy >80% across features
- [ ] Response times acceptable
- [ ] No regressions in core messaging

---

### PR-056: End-to-End Testing - Complete Flows
**Dependencies:** All PRs complete  
**Estimated Time:** 4 hours  
**Prerequisites:** ✅ All PRs merged

**Tasks:**
1. **Create E2E Test Scenarios** (1 hour):
   - Scenario 1: New user onboarding → send first message with AI features
   - Scenario 2: Multilingual conversation with auto-translate
   - Scenario 3: Group chat with typing indicators and smart replies
   - Scenario 4: Offline → online with queued messages and AI processing
   - Scenario 5: Image sharing with captions and translation
   - Scenario 6: Profile picture updates across devices
   - Scenario 7: Push notifications in all states

2. **Execute Manual Tests** (2 hours):
   - Run all scenarios on physical device
   - Test with poor network (3G simulation)
   - Test rapid messaging (20+ messages)
   - Test app lifecycle thoroughly
   - Test with multiple users simultaneously
   - Document any issues found

3. **Performance Testing** (1 hour):
   - Measure app launch time (5 cold starts)
   - Measure message delivery latency
   - Measure AI response times
   - Measure scrolling performance (1000+ messages)
   - Measure image upload time
   - Compare to rubric targets

**Validation:**
- [ ] All E2E scenarios pass
- [ ] Performance meets targets
- [ ] No critical bugs found
- [ ] App feels production-ready

---

### PR-057: Bug Fix Pass
**Dependencies:** PR-055, PR-056  
**Estimated Time:** 4 hours  
**Prerequisites:** ✅ PR-055, PR-056 complete

**Tasks:**
1. **Prioritize Issues** (30 min):
   - List all bugs found during testing
   - Categorize: Critical, High, Medium, Low
   - Focus on Critical and High only

2. **Fix Critical Bugs** (2 hours):
   - Address any blocking issues
   - Re-test after fixes
   - Update tests if needed

3. **Fix High-Priority Bugs** (1.5 hours):
   - Address important but non-blocking issues
   - Focus on user experience impacts
   - Re-test

**Validation:**
- [ ] All critical bugs fixed
- [ ] All high-priority bugs fixed
- [ ] App stable and reliable
- [ ] All tests passing

---

## Phase 5: Documentation & Demo

### PR-058: Architecture Documentation
**Dependencies:** All implementation complete  
**Estimated Time:** 3 hours  
**Prerequisites:** ✅ All PRs merged

**Tasks:**
1. **Architecture Overview** (1.5 hours):
   - Create `/docs/ARCHITECTURE.md`
   - System architecture diagram:
     - Mobile app (React Native + Expo)
     - Firebase services (RTDB, Auth, Storage, Functions)
     - OpenAI Swarm agents
     - Data flow
   - Component architecture:
     - Screen hierarchy
     - Service layer organization
     - State management approach
   - Data models and schemas
   - Security architecture

2. **AI System Documentation** (1 hour):
   - Document AI architecture:
     - Swarm agent setup
     - RAG pipeline design
     - Function calling tools
     - Caching strategy
   - Document each AI feature:
     - How it works
     - Prompt engineering approach
     - Performance characteristics
   - Document user style learning
   - Document smart reply generation

3. **Deployment Documentation** (30 min):
   - Document Firebase setup
   - Document environment variables
   - Document build process
   - Document testing on Expo Go
   - Troubleshooting guide

**Validation:**
- [ ] Architecture clearly explained
- [ ] Diagrams included
- [ ] AI system well-documented
- [ ] Deployment steps clear
- [ ] Can be understood by another developer

---

### PR-059: README Update
**Dependencies:** PR-058  
**Estimated Time:** 2 hours  
**Prerequisites:** ✅ PR-058 merged

**Tasks:**
1. **Update README.md** (2 hours):
   - Project overview and purpose
   - Features list (comprehensive):
     - Core messaging features
     - All 6 AI features with descriptions
     - Additional features (typing indicators, profile pictures, etc.)
   - Technology stack section:
     - Frontend: React Native, Expo
     - Backend: Firebase (RTDB, Auth, Storage, Functions)
     - AI: OpenAI, Swarm
   - Architecture overview (link to detailed docs)
   - Setup instructions:
     - Prerequisites (Node, Expo CLI, Firebase account)
     - Clone repository
     - Install dependencies
     - Configure Firebase
     - Set environment variables
     - Run on Expo Go
   - Testing instructions:
     - Unit tests: `npm test`
     - E2E tests: manual steps
     - Test account credentials for demo
   - International Communicator persona:
     - Description
     - Pain points addressed
     - How AI features help
   - Known limitations
   - Future enhancements
   - License and credits

**Validation:**
- [ ] README comprehensive and clear
- [ ] Setup instructions work (test fresh clone)
- [ ] All features documented
- [ ] Links to documentation work

---

### PR-060: Demo Video Preparation
**Dependencies:** All implementation complete, PR-057 (bugs fixed)  
**Estimated Time:** 2 hours  
**Prerequisites:** ✅ All PRs merged, app stable

**Tasks:**
1. **Demo Script Creation** (30 min):
   - Write detailed script covering all requirements:
     - **Introduction** (30s):
       - "MessageAI for International Communicators"
       - Built with React Native, Firebase, OpenAI Swarm
     - **Real-time Messaging** (1 min):
       - Show 2 physical devices side-by-side
       - Send messages back and forth
       - Show instant delivery
       - Show delivery states changing
     - **Group Chat** (1 min):
       - Create group with 3+ participants
       - Show multiple users messaging
       - Show read receipts with counts
       - Show typing indicators
     - **Offline Scenario** (1 min):
       - Enable airplane mode on one device
       - Send messages from other device
       - Show offline indicator
       - Disable airplane mode
       - Show messages sync instantly
     - **App Lifecycle** (45s):
       - Background app
       - Receive notification
       - Foreground app
       - Force quit app
       - Reopen - chat history intact
     - **AI Features** (2 min):
       - **Language Detection & Auto-Translate**:
         - Send message in Spanish
         - Show automatic translation to English
         - Toggle to show original
       - **Real-time Inline Translation**:
         - Translate message on-demand
         - Show language indicators
       - **Cultural Context Hints**:
         - Send message with cultural reference
         - Show context hint icon
         - Tap to see explanation
       - **Formality Adjustment**:
         - Type casual message
         - Show formality detection
         - Adjust to formal
         - Show comparison
       - **Slang/Idiom Explanations**:
         - Send message with slang
         - Show underline/highlight
         - Tap for explanation
       - **Smart Replies**:
         - Show incoming message
         - Show 3+ smart reply suggestions
         - Select one and send
         - Demonstrate multilingual replies
     - **Technical Architecture** (30s):
       - Quick diagram walkthrough
       - React Native + Firebase + OpenAI
       - Mention offline-first design
       - Mention RAG pipeline
     - **Conclusion** (15s):
       - Summary of features
       - Built in 7 days with AI coding tools
       - GitHub link

2. **Demo Environment Setup** (30 min):
   - Create test accounts:
     - User A (English speaker)
     - User B (Spanish speaker)
     - User C (for group chat)
   - Pre-populate some conversation history
   - Create sample group chat
   - Clear any test messages
   - Ensure profile pictures set
   - Charge both devices fully
   - Test network on/off on both devices

3. **Test Run** (1 hour):
   - Do complete dry run of demo
   - Time each section
   - Ensure transitions smooth
   - Verify all features work
   - Check audio will be clear
   - Adjust script as needed
   - Practice explanations

**Validation:**
- [ ] Script covers all rubric requirements
- [ ] Demo flows smoothly
- [ ] Timing fits 5-7 minutes
- [ ] All features work reliably
- [ ] Environment ready for recording

---

### PR-061: Demo Video Recording & Editing
**Dependencies:** PR-060  
**Estimated Time:** 4 hours  
**Prerequisites:** ✅ PR-060 complete

**Tasks:**
1. **Recording Setup** (30 min):
   - Set up camera/phone to record both devices
   - Ensure good lighting
   - Test audio (clear voice recording)
   - Clean background
   - Set devices side-by-side
   - Test recording quality

2. **Record Demo** (1.5 hours):
   - Record multiple takes if needed
   - Follow script closely
   - Speak clearly and at good pace
   - Show both device screens clearly
   - Demonstrate each feature properly
   - Record extra footage if needed
   - Keep best take

3. **Video Editing** (2 hours):
   - Import footage into video editor
   - Trim and arrange clips
   - Add text overlays for feature names:
     - "Real-time Messaging"
     - "Language Detection & Auto-Translate"
     - Etc.
   - Add arrows/highlights to show important UI elements
   - Add background music (subtle, optional)
   - Add intro title: "MessageAI - International Communicator"
   - Add outro with GitHub link
   - Export at good quality (1080p minimum)
   - Keep file size reasonable (<100MB if possible)
   - Length: 5-7 minutes

**Validation:**
- [ ] Video quality clear (1080p+)
- [ ] Audio clear and professional
- [ ] All required features shown
- [ ] Length 5-7 minutes
- [ ] Both screens visible throughout
- [ ] Text overlays helpful
- [ ] Professional appearance

---

### PR-062: Final Testing & Submission Prep
**Dependencies:** All PRs complete  
**Estimated Time:** 3 hours  
**Prerequisites:** ✅ All PRs merged, demo video complete

**Tasks:**
1. **Final Test Pass** (1 hour):
   - Complete rubric checklist:
     - ✅ Real-time messaging (<300ms)
     - ✅ Offline support works
     - ✅ Group chat (3+ users)
     - ✅ Typing indicators
     - ✅ Profile pictures
     - ✅ All 5 AI features working
     - ✅ Smart replies (advanced AI)
     - ✅ Push notifications (all states)
     - ✅ App lifecycle handling
     - ✅ Performance acceptable
   - Test on physical device one final time
   - Verify all deliverables ready

2. **Code Cleanup** (1 hour):
   - Remove all console.logs
   - Remove commented code
   - Remove unused imports
   - Format code consistently
   - Run linter and fix issues
   - Update any stale comments
   - Final commit and push

3. **Submission Checklist** (1 hour):
   - **GitHub Repository**:
     - ✅ All code pushed
     - ✅ README.md complete and accurate
     - ✅ Architecture documentation in /docs
     - ✅ .env.example present
     - ✅ Clean commit history
   - **Demo Video**:
     - ✅ 5-7 minutes
     - ✅ Covers all requirements
     - ✅ High quality
     - ✅ Uploaded (YouTube, Loom, or direct link)
   - **Deployment**:
     - ✅ Firebase backend deployed
     - ✅ Cloud Functions deployed
     - ✅ App works on Expo Go
     - ✅ Provide QR code or link
   - **Social Post** (will do via submission form):
     - Brief description ready
     - Key features listed
     - Demo link ready
     - Screenshots/video ready
     - @GauntletAI tag noted
   - **Test Accounts**:
     - Document credentials for graders
     - Ensure accounts have sample data

**Validation:**
- [ ] All checklist items complete
- [ ] Repository professional and clean
- [ ] Demo video meets all requirements
- [ ] App deployed and accessible
- [ ] Ready for submission

---

## Stretch Goals (If Time Permits)

### Bonus Feature Set 1: Enhanced Messaging (+2 points)
**Estimated Time:** 3 hours

**Tasks:**
- Message reactions (emoji reactions)
- Message forwarding
- Rich link previews with metadata
- Copy message text

**Validation:**
- [ ] Features work smoothly
- [ ] UI intuitive
- [ ] No performance impact

---

### Bonus Feature Set 2: Advanced Search (+2 points)
**Estimated Time:** 2 hours

**Tasks:**
- Search within conversation
- Search across all conversations
- Filter by sender, date, media type
- Semantic search using AI (optional)

**Validation:**
- [ ] Search fast (<1s)
- [ ] Results accurate
- [ ] Filters work correctly

---

### Bonus Feature Set 3: Voice Messages (+3 points)
**Estimated Time:** 4 hours

**Tasks:**
- Record voice messages
- Play voice messages
- Waveform visualization
- AI transcription (using OpenAI Whisper)
- Translation of transcribed text

**Validation:**
- [ ] Recording quality good
- [ ] Playback smooth
- [ ] Transcription accurate
- [ ] Translation works

---

## Risk Management

### High-Risk Areas

**1. AI Feature Response Times (30 points at stake)**
- **Risk:** AI features too slow (>5s), lose points
- **Mitigation:**
  - Implement aggressive caching early
  - Use streaming where possible
  - Set realistic timeout expectations
  - Show loading states clearly
  - Test response times continuously

**2. Smart Replies Quality (10 points at stake)**
- **Risk:** Replies don't match user style, not useful
- **Mitigation:**
  - Start with simple style analysis
  - Test with real conversation samples
  - Iterate on prompts frequently
  - Get feedback early
  - Have fallback to generic but safe replies

**3. OpenAI Swarm Integration (Technical risk)**
- **Risk:** Swarm harder to use than expected
- **Mitigation:**
  - Set up and test Swarm agent quickly (PR-042)
  - Have fallback to direct OpenAI API calls
  - Document Swarm patterns as you learn
  - Budget extra time for Swarm learning curve

**4. Demo Video Quality (Required deliverable)**
- **Risk:** Demo doesn't show features clearly, loses 15 points
- **Mitigation:**
  - Start demo prep early
  - Do multiple test recordings
  - Budget generous time for editing
  - Have backup recording plan

**5. Time Pressure (84 hours total)**
- **Risk:** Not finishing all required features
- **Mitigation:**
  - Strict prioritization (AI features > stretch goals)
  - Work in parallel where possible (multiple agents)
  - Cut bonus features aggressively if behind
  - Focus on "working > perfect"

---

## Parallel Work Opportunities

With multiple AI agents working simultaneously:

### Parallel Block A (Hours 8-16):
- **Agent 1:** PR-043 (Language Detection)
- **Agent 2:** PR-050 (Typing Indicators)
- **Agent 3:** PR-051 (Profile Pictures)

### Parallel Block B (Hours 16-24):
- **Agent 1:** PR-044 (Inline Translation)
- **Agent 2:** PR-045 (Cultural Context)
- **Agent 3:** PR-052 (Background Notifications)

### Parallel Block C (Hours 24-32):
- **Agent 1:** PR-046 (Formality Adjustment)
- **Agent 2:** PR-047 (Slang Explanations)

### Parallel Block D (Hours 40-48):
- **Agent 1:** PR-053 (Performance)
- **Agent 2:** PR-054 (UI Polish)

---

## Success Metrics

### Minimum for Grade A (90+ points)

**Core Messaging (33-35 points):**
- Real-time delivery <300ms consistently
- Offline support with zero message loss
- Group chat smooth with 3-5 users
- Typing indicators working

**Mobile Quality (18-20 points):**
- App lifecycle handled perfectly
- Launch time <3s
- Smooth scrolling
- Professional UX

**AI Features (27-30 points):**
- All 5 required features working well
- Command accuracy >80%
- Response times <4s average
- Smart replies generating relevant options
- Advanced feature (Smart Replies) impressive

**Technical (9-10 points):**
- Clean architecture
- API keys secured
- RAG pipeline working
- Good error handling

**Documentation (5 points):**
- Comprehensive README
- Architecture docs present
- Deployed and accessible

**Deliverables (0 points lost):**
- Demo video complete and high quality
- Social post made

---

## Timeline Overview

| Phase | Hours | Completion | Key Deliverables |
|-------|-------|------------|------------------|
| **Phase 1: Foundation** | 0-8 | Hour 8 | MVP bugs fixed, Swarm setup, image captions |
| **Phase 2: AI Features** | 8-40 | Hour 40 | All 6 AI features implemented |
| **Phase 3: Required Features** | 40-60 | Hour 60 | Typing, profile pics, notifications |
| **Phase 4: Testing** | 60-72 | Hour 72 | All tests pass, bugs fixed |
| **Phase 5: Documentation** | 72-84 | Hour 84 | Docs complete, demo video done |

**Buffer:** Each phase has ~10% time buffer for unexpected issues

---

## Development Guidelines

### Code Quality Standards
- **Maximum Function Length:** 75 lines
- **Maximum File Length:** 750 lines
- **Test Coverage Target:** >80% for business logic
- **TypeScript:** Strict mode, no `any` types
- **Formatting:** Consistent (Prettier recommended)
- **Comments:** JSDoc for all public functions

### AI Development Best Practices
- Test AI features with edge cases early
- Cache aggressively to reduce API costs
- Monitor API usage continuously
- Have fallbacks for AI failures
- Optimize prompts iteratively
- Use streaming for long responses

### Testing Standards
- Unit tests for all business logic
- Integration tests for AI features
- E2E tests for critical flows
- Test on physical device regularly
- Test offline scenarios thoroughly

---

## Grading Optimization Strategy

### Maximize Points in High-Value Areas

**AI Features (30 points) - HIGHEST PRIORITY**
- Focus on accuracy over speed initially
- All 5 features must work well
- Smart replies must be impressive
- Budget 40% of time here

**Core Messaging (35 points) - MAINTAIN QUALITY**
- Already mostly complete from MVP
- Fix bugs to avoid losing points
- Ensure typing indicators work
- Budget 10% of time here

**Mobile Quality (20 points) - GOOD ENOUGH**
- Focus on lifecycle handling
- Acceptable performance is fine
- Don't over-optimize
- Budget 15% of time here

**Technical (10 points) - STRAIGHTFORWARD**
- Follow architecture guidelines
- Security basics covered
- Budget 10% of time here

**Documentation (5 points) - QUICK WINS**
- Clear README and docs
- Professional appearance
- Budget 10% of time here

**Deliverables (Pass/Fail) - CRITICAL**
- Demo video is make-or-break
- Budget 15% of time here

---

## Final Checklist

### Before Starting Phase 2 (AI Implementation)
- [ ] All MVP bugs fixed (PR-040, PR-041)
- [ ] Swarm agent working (PR-042)
- [ ] Image captions implemented
- [ ] Test coverage still >80%
- [ ] App stable on physical device

### Before Starting Phase 4 (Testing)
- [ ] All 6 AI features implemented
- [ ] Typing indicators working
- [ ] Profile pictures working
- [ ] Background notifications working
- [ ] All code committed and pushed

### Before Starting Phase 5 (Documentation)
- [ ] All tests passing
- [ ] No critical bugs remaining
- [ ] Performance acceptable
- [ ] App feels production-ready
- [ ] Ready for demo recording

### Before Submission
- [ ] Demo video complete (5-7 min)
- [ ] README comprehensive
- [ ] Architecture documented
- [ ] Code clean (no console.logs)
- [ ] All deliverables ready
- [ ] Repository polished
- [ ] Test accounts documented
- [ ] Social post drafted

---

## Questions & Clarifications Resolved

1. ✅ Timeline: 84 hours until Sunday 11 PM
2. ✅ Priority: AI features > MVP stretch goals > other polish
3. ✅ Advanced AI: Context-Aware Smart Replies chosen
4. ✅ Architecture: Contextual AI features, OpenAI Swarm
5. ✅ Performance: Nice-to-have targets, not requirements
6. ✅ Stretch goals: Include if time permits
7. ✅ Testing: Implicit, physical device available
8. ✅ Demo: Include preparation tasks
9. ✅ Deliverables: Architecture docs required, social post via form
10. ✅ MVP state: Complete, bugs documented

---

**Document Status:** Ready for Implementation  
**Next Action:** Begin PR-040 (Fix MVP Critical Bugs)  
**Expected Grade:** 90+ (Grade A) if all requirements met  
**Critical Path:** Phase 2 (AI Features) - 40% of remaining time