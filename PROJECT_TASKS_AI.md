# MessageAI Full Project - Task Breakdown by Dependency Chain

**Timeline:** 84 hours from start  
**Current State:** MVP Complete  
**Target:** 90+ points (Grade A)

---

## Phase 1: Foundation & Bug Fixes (Hours 0-8)

### Block 1A: Critical Bug Fixes (Can run in parallel)

#### PR-040: Fix MVP Critical Bugs ✅ COMPLETED
**Dependencies:** None
**Estimated Time:** 2.5 hours (reduced from 3 - removed pull-to-refresh)
**Prerequisites:** ✅ Ready to start
**Status:** ✅ Committed (f8efb7a)

**Files Modified:**
- `src/screens/ConversationScreen.tsx` - Fix header to show correct names
- `src/screens/ChatListScreen.tsx` - Fix chat name display in list (renderChatItem function)
- `src/screens/CreateGroupScreen.tsx` - Fix group name input field behavior
- `src/services/local-chat.service.ts` - Debug and fix updateChatLastMessage function
- `src/utils/chat.utils.ts` - NEW FILE: Add getChatDisplayName utility
- `src/__tests__/utils/chat.utils.test.ts` - NEW FILE: Tests for chat utilities

**Tasks:**
1. **Fix 1:1 Chat Naming** (1 hour):
   - Update `ConversationScreen.tsx` header logic
   - For 1:1 chats: Display other participant's `displayName`
   - For group chats: Display group `name`
   - Update `ChatListScreen.tsx` renderChatItem name resolution (line 180)
   - Add utility function: `getChatDisplayName(chat, currentUserId)` in new chat.utils.ts (max 50 lines)
   - Write unit tests for name resolution
   - Test with multiple 1:1 and group chats

2. **Fix Group Name Input Field** (30 min):
   - Update `CreateGroupScreen.tsx` input state management
   - Prevent placeholder from auto-refilling
   - Clear `value` properly when user deletes all text
   - Test edge cases: paste, cut, undo, autocomplete
   - Ensure controlled component behavior correct

3. **Fix Chat List Last Message Display** (1 hour):
   - Debug `updateChatLastMessage` function in local-chat.service.ts
   - Ensure Firebase listener updates local chat record
   - Verify sync timing (message saved → chat updated)
   - Update `ChatListScreen.tsx` renderChatItem to display (lines 137-158):
     - "You: {preview}" for own messages
     - "{senderName}: {preview}" for others
     - "📷 Photo" for image messages (with sender clarification)
   - Test with rapid messaging, group chats, images
   - Verify updates in real-time

4. ~~**Fix Pull-to-Refresh Position**~~ - **REMOVED FROM SCOPE**
   - Moved to stretch goals: Message pagination with scroll-up-to-load
   - Current implementation loads all messages (acceptable for MVP)

**Validation:**
- [x] 1:1 chats show other user's display name in header
- [x] 1:1 chats show other user's display name in chat list
- [x] Group chats show group name
- [x] Group name input clears properly
- [x] Chat list displays last messages correctly (not "No messages yet")
- [x] Last message shows sender name in groups
- [x] Last message shows sender for image messages
- [x] All existing tests still pass
- [x] No regressions introduced

---

#### PR-041: Add Image Captions ✅ COMPLETED
**Dependencies:** None (parallel with PR-040)
**Estimated Time:** 2 hours
**Prerequisites:** ✅ Ready to start
**Status:** ✅ Committed (f8efb7a)

**Files Modified:**
- `src/types/index.ts` - Add caption field to Message interface
- `src/services/database.service.ts` - Update SQLite schema (no formal migration system)
- `src/components/MessageInput.tsx` - Add caption input UI after image selection
- `src/components/MessageBubble.tsx` - Display caption below images
- `src/screens/ChatListScreen.tsx` - Show image+caption preview in last message (renderChatItem)
- `src/services/local-message.service.ts` - Handle caption field in message operations
- `src/services/firebase-message.service.ts` - Sync caption to/from Firebase

**Tasks:**
1. **Update Message Model** (30 min):
   - Add optional `caption?: string` to `Message` interface in types/index.ts
   - Update SQLite schema in database.service.ts: `ALTER TABLE messages ADD COLUMN caption TEXT`
   - **NO formal migration system** (out of scope - mark in PRD)
   - Update Firebase RTDB message structure (just add field, Firebase is schemaless)
   - Test schema update works on existing database

2. **Update Image Input UI** (1 hour):
   - Modify `MessageInput.tsx` after image selection
   - Show image preview with caption input field below
   - Add character counter (max 500 chars)
   - "Send" button sends image + optional caption
   - "Cancel" button returns to normal input
   - Validate caption length
   - Style preview + input nicely

3. **Update Message Display** (30 min):
   - Modify `MessageBubble.tsx` for image messages
   - Display caption below image with appropriate styling
   - Caption should be selectable/copyable
   - Caption displayed in full-screen view (MessageBubble handles this)
   - Handle long captions (scrollable if needed)
   - Update ChatListScreen.tsx to show "📷 Photo: [caption preview]" with sender
   - Test various caption lengths

**Validation:**
- [x] Can add caption when sending image
- [x] Caption optional (can send without)
- [x] Caption displays in chat bubble
- [x] Caption visible in full-screen image view
- [x] Caption shows in chat list preview with sender
- [x] Caption persists across app restart
- [x] Character limit enforced (500 chars)
- [x] Long captions handled gracefully
- [x] Caption syncs to Firebase correctly

---

### Block 1B: AI Foundation Setup

#### PR-042: OpenAI Swarm Setup & Architecture
**Dependencies:** PR-040, PR-041 (should complete first to ensure stability)
**Estimated Time:** 3 hours
**Prerequisites:** ✅ PR-040, PR-041 merged

**Files Modified:**
- `messageai-mvp/package.json` - Add OpenAI dependencies
- `messageai-mvp/package-lock.json` - Auto-updated by npm
- `.env.example` - Add OpenAI API key configuration
- `messageai-mvp/src/services/ai/ai-client.ts` - NEW FILE: OpenAI client wrapper
- `messageai-mvp/src/services/ai/rag.service.ts` - NEW FILE: RAG pipeline for context
- `messageai-mvp/src/services/ai/types.ts` - NEW FILE: AI-specific TypeScript types
- `messageai-mvp/src/services/ai/agents/base-agent.ts` - NEW FILE: Base Swarm agent config
- `messageai-mvp/src/services/ai/tools/message-tools.ts` - NEW FILE: Message function calling tools
- `messageai-mvp/src/services/ai/tools/user-tools.ts` - NEW FILE: User function calling tools
- `messageai-mvp/src/services/ai/prompts/system-prompts.ts` - NEW FILE: Prompt templates
- `messageai-mvp/src/__tests__/services/ai/ai-client.test.ts` - NEW FILE: Tests for AI client
- `messageai-mvp/src/__tests__/services/ai/rag.service.test.ts` - NEW FILE: Tests for RAG service

**Tasks:**
1. **Install Dependencies** (15 min):
   - Install OpenAI Swarm: `npm install openai-swarm` (or appropriate package)
   - Install OpenAI SDK: `npm install openai`
   - Update `package.json`
   - Add environment variables to `.env.example`:
     ```
     OPENAI_API_KEY=sk-...
     OPENAI_MODEL=gpt-4-turbo
     ```
   - Configure Firebase Cloud Functions environment
   - Test API connection

2. **Create AI Service Layer** (1.5 hours):
   - Create directory structure:
     ```
     /src/services/ai/
       /agents/          # Swarm agent definitions
         base-agent.ts   # Base agent configuration
       /tools/           # Function calling tools
         message-tools.ts
         user-tools.ts
       /prompts/         # Prompt templates
         system-prompts.ts
       ai-client.ts      # OpenAI client wrapper
       rag.service.ts    # RAG pipeline
       types.ts          # AI-specific types
     ```
   - Implement `ai-client.ts` (max 75 lines per function):
     - `initializeClient()` → OpenAI client instance
     - `callCompletion(messages, options)` → Promise<string>
     - `callStream(messages, options)` → AsyncGenerator<string>
     - Error handling with retry logic (exponential backoff)
     - Timeout handling (30s default)
   - Create base Swarm agent configuration in `base-agent.ts`
   - Write unit tests (mock OpenAI responses)

3. **Implement RAG Pipeline** (1 hour):
   - Create `rag.service.ts` (max 75 lines per function):
     - `getConversationContext(chatId, limit)` → Promise<Message[]>
       - Query local database for last N messages
       - Include message content, sender info, timestamp
       - Order chronologically
     - `formatMessagesForLLM(messages, users)` → string
       - Format as conversation: "Alice: message\nBob: message"
       - Include timestamps if relevant
       - Handle images: "[image: caption]"
     - `buildContextPrompt(query, context)` → string
       - Combine user query with conversation context
       - Add system instructions
       - Manage token limits (estimate ~4 chars per token)
   - Implement token counting utility
   - Test with sample conversations
   - Write unit tests

4. **Create Tools/Functions** (30 min):
   - Define function calling tools in `message-tools.ts`:
     ```typescript
     export const getMessageHistoryTool = {
       name: "get_message_history",
       description: "Retrieve recent messages from a conversation",
       parameters: {
         type: "object",
         properties: {
           chatId: { type: "string" },
           limit: { type: "number", default: 50 }
         },
         required: ["chatId"]
       }
     };
     ```
   - Define tools in `user-tools.ts`:
     - `get_user_preferences`
     - `detect_language`
   - Create tool execution handlers
   - Test tool schemas

**Validation:**
- [x] OpenAI client initializes successfully
- [x] Can make test API call
- [x] Swarm agent configures properly
- [x] RAG pipeline retrieves messages from database
- [x] Context formatting produces valid prompts
- [x] Function calling tools defined correctly
- [x] Error handling works (timeouts, API errors)
- [x] API keys secured (environment variables only)
- [x] Unit tests pass (>80% coverage)

**Status:** ✅ COMPLETE
**Tests:** 29/29 passing
**Completion Date:** 2025-10-23

**Checkpoint:** AI Foundation Ready (Hour 8)

---

## Phase 2: AI Features Implementation (Hours 8-40)

### Block 2A: Core Translation Features (Sequential within block, but block runs in parallel with 2B)

#### PR-043: Language Detection & Auto-Translate ✅ COMPLETED
**Dependencies:** PR-042
**Estimated Time:** 4 hours
**Prerequisites:** ✅ PR-042 merged
**Status:** ✅ COMPLETED

**Files to Create:**
- `messageai-mvp/src/services/ai/language-detection.service.ts` - Language detection with caching
- `messageai-mvp/src/services/ai/translation.service.ts` - Translation service
- `messageai-mvp/src/screens/AISettingsScreen.tsx` - AI settings UI
- `messageai-mvp/src/__tests__/services/ai/language-detection.service.test.ts` - Tests
- `messageai-mvp/src/__tests__/services/ai/translation.service.test.ts` - Tests

**Files to Modify:**
- `messageai-mvp/src/types/index.ts` - Add language fields to User and Message interfaces
- `messageai-mvp/src/components/MessageBubble.tsx` - Display translations
- `messageai-mvp/src/services/sync.service.ts` - Auto-translate on receive
- `messageai-mvp/src/services/database.service.ts` - Update schema for translation fields

**Tasks:**
1. **Language Detection Service** (1.5 hours):
   - Create `/src/services/ai/language-detection.service.ts`
   - Implement functions (max 75 lines each):
     - `detectLanguage(text)` → Promise<LanguageCode>
       - Call OpenAI with simple prompt
       - Return ISO 639-1 code (e.g., 'en', 'es', 'fr')
       - Handle short texts (< 10 words)
       - Confidence threshold (>80% or return 'unknown')
     - `detectMultipleLanguages(texts)` → Promise<LanguageCode[]>
       - Batch detect for efficiency
       - Cache results by text hash
   - Create language code type: `type LanguageCode = 'en' | 'es' | 'fr' | ...` (50+ languages)
   - Implement caching:
     - In-memory cache (last 100 detections)
     - Key: text hash (first 50 chars)
     - TTL: 1 hour
   - Write unit tests:
     - Test English, Spanish, French, Chinese, Arabic
     - Test mixed language text
     - Test very short text
     - Test caching behavior

2. **Auto-Translation Toggle** (1 hour):
   - Update `User` interface:
     ```typescript
     interface User {
       // ... existing fields
       autoTranslateEnabled: boolean;
       preferredLanguage: LanguageCode;
     }
     ```
   - Update user profile in Firebase
   - Create `/src/screens/AISettingsScreen.tsx` (under 250 lines):
     - Toggle: "Auto-translate messages"
     - Language picker: "Preferred Language"
     - Show current language
     - Save to user preferences
   - Add navigation to settings from profile/menu
   - Sync preferences to Firebase immediately

3. **Message Translation on Receive** (1.5 hours):
   - Hook into message receive pipeline in `sync.service.ts`
   - Function: `processIncomingMessage(message)` (max 75 lines):
     - Detect message language
     - Get user's auto-translate setting
     - If enabled and language mismatch:
       - Translate message
       - Store both original and translation
     - Update message in local database
   - Update `Message` interface:
     ```typescript
     interface Message {
       // ... existing fields
       detectedLanguage?: LanguageCode;
       translatedText?: string;
       translationTargetLang?: LanguageCode;
     }
     ```
   - Implement translation caching:
     - Cache key: `${messageId}_${targetLang}`
     - Don't re-translate same message
   - Update `MessageBubble.tsx` (keep under 250 lines total):
     - Show translated text if available
     - Small indicator: "Translated from Spanish"
     - "Show Original" button
     - Toggle between original and translated

**Validation:**
- [x] Language detection accurate (>90% for common languages)
- [x] Auto-translate toggle works
- [x] Preferred language saves correctly
- [x] Messages auto-translate on receive when enabled
- [x] Can view original message
- [x] Translations cached (no duplicate API calls)
- [x] Settings sync across app restarts
- [x] Response time <3s per message
- [x] Unit tests pass (>80% coverage)

---

#### PR-044: Real-Time Inline Translation
**Dependencies:** PR-043
**Estimated Time:** 3 hours
**Prerequisites:** ✅ PR-043 merged
**Status:** ✅ COMPLETE

**Files Created:**
- `messageai-mvp/src/services/ai/agents/translation-agent.ts` - Translation agent with formatting preservation
- `messageai-mvp/src/components/TranslationBubble.tsx` - Translation display component
- `messageai-mvp/src/components/MessageContextMenu.tsx` - Context menu for message actions
- `messageai-mvp/src/components/LanguagePickerModal.tsx` - Language selection modal
- `messageai-mvp/src/__tests__/services/ai/agents/translation-agent.test.ts` - Unit tests (18 tests, all passing)

**Files Modified:**
- `messageai-mvp/src/services/ai/translation.service.ts` - Added translateMessageOnDemand and hasTranslationInCache functions
- `messageai-mvp/src/components/MessageBubble.tsx` - Integrated long-press context menu, translation UI, and on-demand translation
- `messageai-mvp/src/__tests__/services/ai/translation.service.test.ts` - Added tests for new functions (26 total tests, all passing)

**Implementation Summary:**
- ✅ Created translation agent with enhanced formatting preservation
- ✅ Extended translation service with on-demand translation support
- ✅ Created TranslationBubble component with language indicators and toggle
- ✅ Implemented long-press context menu with "Translate" and "Translate to..." options
- ✅ Created language picker modal with search functionality (16 languages supported)
- ✅ Integrated on-demand translation into MessageBubble
- ✅ Database schema already supports translation fields (no changes needed)
- ✅ Written comprehensive unit tests (44 tests total, all passing)
- ✅ Translation caching works seamlessly with existing auto-translation

**Tasks:**
1. **Translation UI Component** (1 hour):
   - Create `/src/components/TranslationBubble.tsx` (under 200 lines):
     - Props: `original`, `translated`, `fromLang`, `toLang`, `loading`
     - Display original text
     - Display translated text below with subtle styling
     - Language badges: "🇪🇸 ES → 🇺🇸 EN"
     - Loading spinner while translating
     - Error state handling
   - Style translation text:
     - Slightly smaller font
     - Different color (gray)
     - Clear visual separation
   - Integrate into `MessageBubble.tsx`

2. **On-Demand Translation** (1 hour):
   - Add contextual menu to `MessageBubble.tsx`:
     - Long-press message → context menu appears
     - Options: "Translate", "Copy", "Reply"
     - Or: Add translate icon button (if not already translated)
   - Implement translate action:
     - Call translation service
     - Update message state locally
     - Cache translation
     - Show loading state
     - Handle errors gracefully
   - Allow translating own messages (for checking)
   - Support re-translation to different language

3. **Inline Translation Service** (1 hour):
   - Create translation agent in `/src/services/ai/agents/translation-agent.ts`:
     - Use Swarm for multi-step reasoning if needed
     - Basic agent: single completion call
   - Function: `translateMessage(text, fromLang, toLang)` → Promise<string>
     - Preserve formatting:
       - Line breaks (\n)
       - Bullet points
       - Emphasis (markdown)
     - Handle special characters
     - Handle emojis (keep unchanged)
     - Natural, fluent translation
   - Prompt engineering:
     - System: "You are a professional translator..."
     - User: "Translate from {from} to {to}: {text}"
     - Request: "Preserve formatting and tone"
   - Error handling:
     - Timeout (30s)
     - API errors
     - Unsupported language pairs
   - Write unit tests:
     - Test various language pairs
     - Test formatting preservation
     - Test emoji handling

**Validation:**
- [x] Can translate any message on demand
- [x] Translations accurate and natural (uses professional translator prompt)
- [x] Formatting preserved correctly (line breaks, emojis, markdown, special chars)
- [x] Language indicators display clearly (flag emojis + language codes)
- [x] Loading states show during translation (spinner in TranslationBubble)
- [x] Errors handled gracefully (error display in UI, fallback to original text)
- [x] Response time optimized with caching
- [x] Works for 16 language pairs (EN, ES, FR, DE, IT, PT, RU, ZH, JA, KO, AR, HI, NL, PL, SV, TR)
- [x] Unit tests pass (44 tests total - 18 translation-agent + 26 translation.service)

**Desiderata:**
- Response time determined by OpenAI API (caching helps reduce repeated calls)

---

### Block 2B: Context & Style Features (Runs in parallel with Block 2A)

#### PR-045: Cultural Context Hints ✅ COMPLETED
**Dependencies:** PR-042, PR-043 (for language detection)
**Estimated Time:** 4 hours
**Prerequisites:** ✅ PR-042, PR-043 merged
**Status:** ✅ COMPLETE

**Files Created:**
- `messageai-mvp/src/services/ai/agents/cultural-context-agent.ts` - Cultural context detection agent
- `messageai-mvp/src/services/cultural-hints.service.ts` - Storage and retrieval service for hints
- `messageai-mvp/src/components/ContextHintModal.tsx` - Modal component to display cultural hints

**Files Modified:**
- `messageai-mvp/src/services/ai/types.ts` - Added ContextHint and ContextHintCategory types
- `messageai-mvp/src/services/database.service.ts` - Added cultural_hints table and migration for culturalHintsEnabled
- `messageai-mvp/src/types/index.ts` - Added culturalHintsEnabled to User interface
- `messageai-mvp/src/components/MessageBubble.tsx` - Added cultural context analysis feature and modal integration
- `messageai-mvp/src/screens/AISettingsScreen.tsx` - Added cultural hints toggle and settings
- `messageai-mvp/src/screens/ConversationScreen.tsx` - Pass culturalHintsEnabled prop to MessageBubble
- `messageai-mvp/src/services/local-user.service.ts` - Updated saveUser and mapRowToUser for culturalHintsEnabled

**Tasks:**
1. **Cultural Context Detection** (2 hours):
   - Create `/src/services/ai/agents/cultural-context-agent.ts`
   - Define Swarm agent: `CulturalContextAgent`
   - Function: `analyzeCulturalContext(message, language, conversationContext)` → Promise<ContextHint[]>
     - Analyze for cultural references:
       - Holidays/festivals (Christmas, Diwali, Lunar New Year)
       - Idioms/proverbs
       - Cultural norms (greetings, gestures, formality)
       - Historical references
       - Local customs (food, traditions)
     - Use RAG for conversation context
     - Return hints only when relevant (threshold)
   - Define `ContextHint` interface:
     ```typescript
     interface ContextHint {
       phrase: string;              // Original phrase
       explanation: string;         // What it means
       culturalBackground: string;  // Why it's significant
       category: 'holiday' | 'idiom' | 'custom' | 'historical' | 'norm';
     }
     ```
   - Prompt engineering:
     - System: "You are a cultural expert..."
     - Task: "Identify cultural references in this message"
     - Output: Structured JSON with hints
   - Implement relevance filtering:
     - Only return hints for non-obvious references
     - Minimum confidence threshold
   - Batch processing (analyze multiple messages together)
   - Write unit tests with cultural examples

2. **Context Hint UI** (1.5 hours):
   - Create `/src/components/ContextHint.tsx` (under 150 lines):
     - Small info icon (ℹ️ or 🌍) next to message
     - Badge: subtle, not intrusive
     - Tap to expand explanation modal
     - Modal content:
       - Phrase highlighted
       - Clear explanation
       - Cultural background
       - "Got it" button to dismiss
     - Animation: smooth expand/collapse
   - Update `MessageBubble.tsx`:
     - Show hint icon if hints available
     - Position icon appropriately
     - Handle multiple hints per message
   - Style hint icon:
     - Subtle (small, gray)
     - Tooltip on long-press

3. **Hint Storage & Management** (30 min):
   - Create local storage for hints:
     - Table: `cultural_hints(messageId, phrase, explanation, seen)`
     - Index by messageId
   - Track seen hints per user:
     - User preference: `seenHints: string[]` (phrase hashes)
     - Don't show same hint twice
   - Settings toggle: "Show cultural context hints"
   - Batch hint requests:
     - Analyze last 10 messages on conversation load
     - Cache results
   - Implement hint dismissal tracking

**Validation:**
- [x] Cultural context analysis available in message context menu
- [x] Hints stored in SQLite database with proper schema
- [x] ContextHintModal displays hints with categories and explanations
- [x] "Got it" button marks hints as seen
- [x] Settings toggle in AISettingsScreen controls feature
- [x] Feature disabled by default (matches auto-translate pattern)
- [x] Agent uses moderate detection threshold
- [x] Batch analysis support implemented
- [x] Caching prevents redundant analysis

**Implementation Notes:**
- Cultural hints triggered on-demand via context menu (not automatic)
- Detection uses OpenAI with structured JSON output
- Supports 5 categories: holiday, idiom, custom, historical, norm
- Hints include phrase, explanation, cultural background, and position indexes
- Modal design provides clear, educational explanations
- Integration follows PR-044 pattern (context menu → analysis → modal display)

---

#### PR-046: Formality Level Adjustment
**Dependencies:** PR-042, PR-044 (translation service for reference)
**Estimated Time:** 3 hours
**Prerequisites:** ✅ PR-042, PR-044 merged
**Status:** ✅ COMPLETE

**Files Created:**
- `messageai-mvp/src/services/ai/agents/formality-agent.ts` - Formality detection and adjustment agent
- `messageai-mvp/src/components/FormalityIndicator.tsx` - Formality level display with quick adjustment buttons
- `messageai-mvp/src/components/FormalityPreviewModal.tsx` - Side-by-side comparison modal
- `messageai-mvp/src/__tests__/services/ai/agents/formality-agent.test.ts` - 22 unit tests (all passing)

**Files Modified:**
- `messageai-mvp/src/services/ai/types.ts` - Added FormalityLevel type and related interfaces
- `messageai-mvp/src/components/MessageInput.tsx` - Integrated formality detection and adjustment UI

**Implementation Summary:**
- ✅ Created formality detection with 5 levels (very-informal to very-formal)
- ✅ Implemented formality adjustment with meaning preservation
- ✅ Added cultural awareness for multiple languages (EN, ES, FR, DE, JA, KO, AR, ZH)
- ✅ Created FormalityIndicator component with visual feedback and quick action buttons
- ✅ Created FormalityPreviewModal with side-by-side comparison and change explanations
- ✅ Integrated into MessageInput with debounced detection (500ms)
- ✅ Added caching for detection results (improves performance)
- ✅ Written comprehensive unit tests (22 tests, all passing)
- ✅ Graceful error handling (non-blocking, AI failures don't break app)
- ✅ UI enhanced: Modal enlarged to 50% screen height with larger, more readable text
- ✅ Tested and verified working in English and Spanish

**Tasks:**
1. **Formality Detection** (1 hour):
   - Create `/src/services/ai/agents/formality-agent.ts`
   - Define Swarm agent: `FormalityAgent`
   - Define formality levels:
     ```typescript
     type FormalityLevel = 'very-informal' | 'informal' | 'neutral' | 'formal' | 'very-formal';
     ```
   - Function: `detectFormality(text, language)` → Promise<FormalityLevel>
     - Analyze vocabulary, grammar, structure
     - Consider cultural norms per language:
       - Spanish: tú vs. usted
       - French: tu vs. vous
       - Japanese: keigo levels
     - Return formality rating with confidence
   - Prompt engineering:
     - Provide examples of each level
     - Request explanation of rating
   - Cache detections (by text hash)
   - Write unit tests with various formality examples

2. **Formality Adjustment Service** (1.5 hours):
   - Function: `adjustFormality(text, currentLevel, targetLevel, language)` → Promise<string>
     - Transform text to target formality
     - Preserve meaning precisely
     - Adjust:
       - Vocabulary (casual ↔ formal words)
       - Grammar (contractions, sentence structure)
       - Tone markers (please, kindly, etc.)
     - Use Swarm multi-step:
       - Step 1: Analyze current formality
       - Step 2: Plan adjustments
       - Step 3: Generate adjusted text
       - Step 4: Verify meaning preserved
   - Provide explanation of changes:
     - "Changed 'hey' to 'hello'"
     - "Added 'please' for politeness"
   - Show side-by-side comparison
   - Write unit tests for various adjustments

3. **Formality UI** (30 min):
   - Update `MessageInput.tsx`:
     - Add formality indicator above input
     - Show detected level as user types
     - Debounce detection (500ms after typing stops)
     - Quick action buttons: "↑ More Formal" / "↓ More Casual"
   - Create preview modal:
     - Show original vs. adjusted
     - Highlight changes
     - "Use This" button
     - "Keep Original" button
   - Show in compose state (before sending)

**Validation:**
- [ ] Detects formality accurately (>80% accuracy)
- [ ] Adjustments sound natural
- [ ] Meaning preserved (no semantic drift)
- [ ] Works for multiple languages (EN, ES, FR, DE, JA)
- [ ] UI intuitive and fast
- [ ] Response time <4s for adjustment
- [ ] Comparison view clear
- [ ] Unit tests pass

**Desiderata:**
- Response time <2s
- Accuracy >90%

---

#### PR-047: Slang & Idiom Explanations
**Dependencies:** PR-042, PR-043, PR-044  
**Estimated Time:** 3 hours  
**Prerequisites:** ✅ PR-042, PR-043, PR-044 merged

**Tasks:**
1. **Slang/Idiom Detection** (1.5 hours):
   - Create `/src/services/ai/agents/slang-idiom-agent.ts`
   - Define Swarm agent: `SlangIdiomAgent`
   - Function: `detectSlangIdioms(text, language, context)` → Promise<SlangItem[]>
     - Identify colloquial expressions
     - Types:
       - Slang (informal vocabulary)
       - Idioms (figurative expressions)
       - Colloquialisms (regional phrases)
       - Internet slang (LOL, FOMO, etc.)
     - Use conversation context for disambiguation
     - Return structured data:
       ```typescript
       interface SlangItem {
         phrase: string;
         literal: string;        // Word-for-word meaning
         actual: string;         // What it really means
         usage: string;          // Example sentence
         formality: string;      // When to use/avoid
         regions?: string[];     // Where it's common
       }
       ```
   - Prompt engineering:
     - Provide context about formality differences
     - Ask for cultural appropriateness notes
   - Filter out common knowledge (e.g., "okay")
   - Write unit tests with slang examples from multiple regions

2. **Explanation UI** (1 hour):
   - Update `MessageBubble.tsx`:
     - Underline or highlight slang/idioms subtly
     - Different color or style (dotted underline)
     - Tap to show explanation popup
   - Create explanation popup/modal:
     - Clean, card-style design
     - Display:
       - **Phrase:** "spill the tea"
       - **Literal:** reveal the tea leaves
       - **Meaning:** share gossip or secrets
       - **Example:** "She's ready to spill the tea about the party"
       - **Note:** Informal, common in US/UK
     - "Got It" button with option to mark "I know this"
     - Smooth animations
   - Create glossary view:
     - Screen: `/src/screens/SlangGlossaryScreen.tsx`
     - List all learned slang/idioms
     - Search functionality
     - Alphabetical organization

3. **Learning & Personalization** (30 min):
   - Track user's slang knowledge:
     - User preference: `knownSlang: string[]` (phrase hashes)
     - Firebase sync
   - Don't highlight known phrases
   - "I know this" button:
     - Adds to known list
     - Removes highlight immediately
     - Syncs to profile
   - Settings:
     - Toggle: "Explain slang and idioms"
     - "Reset learned slang" button
   - Analytics (optional):
     - Track which slang is most commonly explained
     - Use to improve detection

**Validation:**
- [ ] Detects slang/idioms accurately (>80% precision)
- [ ] Explanations clear, helpful, accurate
- [ ] Literal vs. actual meaning distinction clear
- [ ] UI unobtrusive
- [ ] Highlights dismissible
- [ ] Learning system works (phrases not re-highlighted)
- [ ] Works across languages and regions
- [ ] Glossary functional
- [ ] Response time <4s for detection
- [ ] Unit tests pass

**Desiderata:**
- Response time <2s
- Precision >85%

---

### Block 2C: Advanced AI - Smart Replies (Dependent on all basic AI features)

#### PR-048: Context-Aware Smart Replies (Advanced AI)
**Dependencies:** PR-043, PR-044, PR-045, PR-046, PR-047  
**Estimated Time:** 6 hours  
**Prerequisites:** ✅ PR-043, PR-044, PR-045, PR-046, PR-047 merged

**Tasks:**
1. **User Style Learning** (2 hours):
   - Create `/src/services/ai/agents/smart-reply-agent.ts`
   - Define Swarm agent: `SmartReplyAgent` with multiple sub-agents
   - Function: `buildUserProfile(userId)` → Promise<UserStyleProfile>
     - Analyze user's message history (last 100-200 messages)
     - Extract style attributes:
       ```typescript
       interface UserStyleProfile {
         commonPhrases: string[];           // Frequently used phrases
         averageMessageLength: number;      // Words per message
         formalityPreference: FormalityLevel;
         emojiUsage: {
           frequency: number;               // Emojis per message
           favorites: string[];             // Most used emojis
         };
         languageMixing: {
           primary: LanguageCode;
           secondary?: LanguageCode[];
           switchingPatterns: string[];     // e.g., "starts EN, ends ES"
         };
         conversationStyle: 'terse' | 'detailed' | 'balanced';
         punctuationStyle: {
           usesPeriods: boolean;
           usesExclamation: boolean;
           usesQuestions: boolean;
         };
         greeting Style: string[];           // "hey", "hi", "hello"
         closingStyle: string[];            // "thanks", "bye", "ttyl"
       }
       ```
     - Use RAG to retrieve message history
     - Multi-agent analysis:
       - Agent 1: Vocabulary analysis
       - Agent 2: Structure analysis
       - Agent 3: Pattern recognition
       - Agent 4: Synthesis
     - Cache profile (TTL: 24 hours)
     - Update incrementally with new messages
   - Write unit tests with synthetic user profiles

2. **Smart Reply Generation** (3 hours):
   - Function: `generateSmartReplies(conversationContext, recipientLanguage, userStyle, count)` → Promise<Reply[]>
     - Input: Last 5-10 messages for context
     - Output: 3-5 reply suggestions
   - Reply generation strategy:
     ```typescript
     interface Reply {
       text: string;
       type: 'agree' | 'question' | 'continue' | 'polite-close' | 'enthusiasm';
       language: LanguageCode;
       confidence: number;
     }
     ```
   - Multi-agent workflow using Swarm:
     - **Agent 1: Context Understanding**
       - Analyze conversation thread
       - Identify topic, mood, intent
       - Determine what's being asked/discussed
     - **Agent 2: Reply Candidate Generation**
       - Generate 8-10 potential replies
       - Vary types (agree, question, etc.)
       - Consider multiple languages if user mixes
     - **Agent 3: Style Matching**
       - Apply user's style profile
       - Match formality level
       - Add typical emojis if user uses them
       - Match message length preference
       - Use common phrases
     - **Agent 4: Quality Check**
       - Filter duplicates
       - Ensure relevance
       - Check appropriateness
       - Rank by confidence
       - Select top 3-5
   - Handle multilingual users:
     - Detect if user code-switches
     - Generate replies in appropriate language(s)
     - Example: "That sounds great! 😊 ¿Cuándo nos vemos?"
   - Implement caching:
     - Cache by conversation context hash
     - TTL: 5 minutes
     - Invalidate on new message
   - Write extensive unit tests:
     - Test various conversation contexts
     - Test style matching accuracy
     - Test multilingual scenarios

3. **Smart Reply UI** (1 hour):
   - Create `/src/components/SmartReplyBar.tsx` (under 200 lines):
     - Horizontal scrollable row
     - 3-5 reply chips
     - Each chip: bubble with suggested text
     - Tap to insert into input
     - "↻" refresh button for new suggestions
     - Loading state (skeleton chips)
     - Hide when user starts typing
   - Position above keyboard in `ConversationScreen.tsx`
   - Trigger generation:
     - On new message received
     - On refresh button tap
     - Debounce (don't regenerate too frequently)
   - Allow editing before sending:
     - Tap chip → inserts text in input
     - User can modify
     - Send button becomes active
   - Show loading indicator:
     - Skeleton chips while generating
     - Smooth transition when replies load

**Validation:**
- [ ] User style profile accurately captures patterns
- [ ] Replies sound authentic to user's style
- [ ] Replies contextually relevant (>80% useful)
- [ ] Generates diverse reply types
- [ ] Works in multiple languages
- [ ] Handles code-switching correctly
- [ ] 3+ reply options provided
- [ ] Response time <15s for generation (Excellent tier)
- [ ] UI intuitive and responsive
- [ ] Refresh generates new options
- [ ] Users actually use suggested replies (>50% acceptance in testing)
- [ ] Seamless integration with message input
- [ ] Unit tests pass (>80% coverage)

**Desiderata:**
- Response time <8s
- User acceptance >70%
- Accuracy >90%

---

### Block 2D: AI Integration & Polish

#### PR-049: AI Feature Integration & Polish
**Dependencies:** PR-043, PR-044, PR-045, PR-046, PR-047, PR-048  
**Estimated Time:** 3 hours  
**Prerequisites:** ✅ All AI feature PRs merged

**Tasks:**
1. **AI Settings Screen** (1 hour):
   - Create `/src/screens/AISettingsScreen.tsx` (under 300 lines):
     - Section: Translation
       - Toggle: "Auto-translate messages"
       - Picker: "Preferred language"
       - Show current language with flag
     - Section: Context & Learning
       - Toggle: "Show cultural context hints"
       - Toggle: "Explain slang and idioms"
       - Button: "View slang glossary"
     - Section: Message Assistance
       - Toggle: "Smart reply suggestions"
       - Toggle: "Formality suggestions"
     - Section: Data & Privacy
       - Button: "Reset AI learnings"
         - Clears user style profile
         - Clears known slang/hints
         - Confirmation dialog
       - Info: "Your data stays on your device"
     - Save all changes immediately to user profile
     - Sync to Firebase
   - Add navigation from profile/main menu
   - Style consistently with app theme

2. **AI Loading States** (30 min):
   - Create `/src/components/AILoadingIndicator.tsx`:
     - Consistent spinner/skeleton for all AI features
     - Text: "Translating...", "Generating replies...", etc.
     - Timeout indicator (if taking >10s)
   - Update all AI feature UIs:
     - Translation: Loading spinner
     - Cultural hints: Skeleton hint icon
     - Smart replies: Skeleton chips
     - Formality: Loading in preview
     - Slang: Loading in popup
   - Ensure consistent styling

3. **AI Error Handling** (1 hour):
   - Create `/src/services/ai/error-handler.ts`:
     - Function: `handleAIError(error, feature)` (max 75 lines)
     - Error types:
       - Network error
       - API rate limit
       - Timeout (>30s)
       - Invalid response
       - API key invalid
     - User-friendly messages:
       - "Translation temporarily unavailable"
       - "Unable to generate replies. Try again."
       - "AI features offline. Core messaging still works."
   - Implement retry mechanisms:
     - Automatic retry (2x with backoff)
     - Manual retry button
   -Implement graceful degradation:
       - App remains fully usable if AI fails
       - Core messaging unaffected
       - Clear indication of AI unavailability
   - Create error toast/banner component:
     - Non-intrusive
     - Dismissible
     - Action button if applicable
   - Log errors for debugging (non-PII only)
   - Write unit tests for error scenarios

4. **AI Performance Optimization** (30 min):
   - Implement request batching:
     - Batch multiple language detections
     - Batch cultural context analyses
     - Process together for efficiency
   - Aggressive caching strategy:
     - Cache all AI responses by input hash
     - In-memory cache (last 200 items)
     - Persistent cache in SQLite
     - Cache translations indefinitely
     - Cache detections for 1 hour
     - Cache style profiles for 24 hours
   - Implement request deduplication:
     - If same request in flight, wait for result
     - Don't make duplicate API calls
   - Debounce user inputs:
     - Formality detection: 500ms after typing stops
     - Smart reply generation: Only on message received
   - Monitor API usage:
     - Log API call counts
     - Track costs (estimate)
     - Alert if approaching limits

**Validation:**
- [ ] All AI features accessible from settings
- [ ] All toggles work correctly
- [ ] Settings persist across restarts
- [ ] Loading states consistent and clear
- [ ] Errors handled gracefully with helpful messages
- [ ] Retry mechanisms work
- [ ] App usable when AI fails
- [ ] Performance acceptable with batching/caching
- [ ] No duplicate API calls
- [ ] User experience smooth and professional

**Checkpoint:** All AI Features Complete (Hour 40)

---

## Phase 3: Required Features & Polish (Hours 40-60)

### Block 3A: Required MVP Stretch Goals (Can run in parallel)

#### PR-050: Typing Indicators
**Dependencies:** PR-040 (bug fixes for stability)  
**Estimated Time:** 3 hours  
**Prerequisites:** ✅ PR-040 merged (can start in parallel with AI features)

**Tasks:**
1. **Typing State Management** (1 hour):
   - Update Firebase RTDB structure:
     ```
     /typing/{chatId}/{userId}: {
       isTyping: boolean,
       timestamp: number
     }
     ```
   - Create `/src/services/typing.service.ts` (max 75 lines per function):
     - `setTyping(chatId, userId, isTyping)` → Promise<void>
       - Update Firebase immediately
       - Set `onDisconnect()` to clear typing state
       - Throttle updates (max every 2s)
     - `subscribeToTyping(chatId, callback)` → unsubscribe function
       - Listen for typing state changes
       - Filter out current user
       - Debounce rapid changes
     - `clearTyping(chatId, userId)` → Promise<void>
   - Implement automatic clearing:
     - Clear after 5s of inactivity
     - Clear on message send
     - Clear on input cleared
     - Clear on navigation away
   - Write unit tests (mock Firebase)

2. **Typing Detection** (1 hour):
   - Update `MessageInput.tsx`:
     - Hook into `onChangeText` event
     - Implement debounced typing signal:
       ```typescript
       const handleTyping = useMemo(() => 
         debounce((text: string) => {
           if (text.length > 0) {
             typingService.setTyping(chatId, currentUserId, true);
           } else {
             typingService.setTyping(chatId, currentUserId, false);
           }
         }, 300),
         [chatId, currentUserId]
       );
       ```
     - Set typing=true when user types
     - Set typing=false when:
       - Input becomes empty
       - Message sent
       - 5s timeout (use useEffect cleanup)
   - Ensure cleanup on unmount:
     - Clear typing state
     - Unsubscribe from listeners
   - Test various scenarios:
     - Rapid typing
     - Typing then deleting
     - Switching between chats
     - App backgrounding

3. **Typing Indicator UI** (1 hour):
   - Create `/src/components/TypingIndicator.tsx` (under 150 lines):
     - Animated dots: "..." (fade in/out animation)
     - Text formatting:
       - 1:1: "Alice is typing..."
       - 2 users: "Alice and Bob are typing..."
       - 3+ users: "Alice, Bob, and 2 others are typing..."
     - Props: `typingUsers: User[]`
     - Auto-hide when empty
     - Smooth fade in/out transitions
   - Position in `ConversationScreen.tsx`:
     - Option A: In header below chat name
     - Option B: Above message input area (recommended)
     - Doesn't push messages up (overlay)
   - Handle multiple typers:
     - Show up to 3 names
     - Use "and X others" for more
   - Performance:
     - Memoize component
     - Don't re-render message list
   - Write component tests

**Validation:**
- [x] Typing indicators appear promptly (<500ms)
- [x] Clear when user stops typing (within 5s)
- [x] Work in 1:1 chats
- [x] Work in group chats with multiple typers
- [x] Names formatted correctly
- [x] No performance impact on messaging
- [x] Smooth animations
- [x] Cleanup happens properly
- [x] Unit tests pass (19/19 passing)

**Status:** ✅ **COMPLETE** - All tasks implemented and tested

---

#### PR-051: Profile Pictures
**Dependencies:** PR-023 (image upload service from MVP)
**Estimated Time:** 3 hours
**Prerequisites:** ✅ PR-023 merged
**Status:** ✅ **COMPLETE** - All tasks implemented

**Files Created:**
- `messageai-mvp/src/screens/EditProfileScreen.tsx` - Profile editing screen with photo upload

**Files Modified:**
- `messageai-mvp/src/types/index.ts` - Added profilePictureUrl to User interface
- `messageai-mvp/src/components/Avatar.tsx` - Added support for profile pictures with fallback to initials
- `messageai-mvp/src/services/database.service.ts` - Updated user schema with profilePictureUrl column
- `messageai-mvp/src/services/firebase-user.service.ts` - Added uploadProfilePicture and removeProfilePicture functions
- `messageai-mvp/src/services/local-user.service.ts` - Added profilePictureUrl to saveUser and mapRowToUser
- `messageai-mvp/src/navigation/AppNavigator.tsx` - Added EditProfile screen to navigation
- `messageai-mvp/src/screens/ChatListScreen.tsx` - Added profile button in header
- `messageai-mvp/src/components/UserListItem.tsx` - Pass profilePictureUrl to Avatar
- `messageai-mvp/src/utils/avatar.utils.ts` - Added xlarge size (96px) for profile screen

**Tasks:**
1. **Profile Picture Upload** (1.5 hours):
   - Create `/src/screens/EditProfileScreen.tsx` (under 250 lines):
     - Show current profile (name, email, avatar)
     - "Change Photo" button
     - Display name edit field
     - "Save" button
   - Implement photo picker flow:
     - Use Expo ImagePicker
     - Request permissions gracefully
     - Show image crop/resize UI
     - Crop to square (1:1 aspect ratio)
     - Preview before upload
     - "Use Photo" / "Cancel" buttons
   - Image processing:
     - Resize to 512x512 pixels
     - Compress to <200KB
     - JPEG format
     - Use image.service.ts from MVP
   - Upload to Firebase Storage:
     - Path: `/profile-pictures/{uid}.jpg`
     - Get download URL
     - Update user profile: `profilePictureUrl: string`
     - Sync to Firebase RTDB
     - Update local database
   - Add photo removal:
     - "Remove Photo" option
     - Confirm dialog
     - Delete from Storage
     - Clear URL from profile
   - Write unit tests (mock image picker)

2. **Avatar Component Updates** (1 hour):
   - Update `/src/components/Avatar.tsx`:
     - Check for `profilePictureUrl` in user object
     - If URL exists:
       - Load image with progressive loading
       - Show placeholder (blur or color) during load
       - Cache image locally (use Image caching)
     - If no URL:
       - Fallback to initials
       - Use existing color generation
     - Handle loading errors:
       - Retry once
       - Fallback to initials on failure
     - Add loading state prop (optional skeleton)
   - Support different sizes:
     - small: 32x32
     - medium: 48x48
     - large: 64x64
     - xlarge: 96x96 (for profile screen)
   - Implement image caching:
     - Use React Native Image cache
     - Or implement custom cache with AsyncStorage
   - Write component tests

3. **Profile Picture Display** (30 min):
   - Update all Avatar usage locations:
     - ✅ ChatListItem (chat list)
     - ✅ MessageBubble (in groups, for others)
     - ✅ ConversationScreen header
     - ✅ GroupInfoScreen participant list
     - ✅ NewChatScreen user list
     - ✅ UserSelectItem
     - ✅ Profile screens
   - Verify consistent sizing per location
   - Test with mixed users (some with photos, some without)
   - Test loading performance with many avatars
   - Ensure no image flickering

**Validation:**
- [ ] Can upload profile picture successfully
- [ ] Picture displays in all locations
- [ ] Fallback to initials works when no picture
- [ ] Image compressed correctly (<200KB)
- [ ] Images cached properly (no re-downloads)
- [ ] Loading states smooth
- [ ] Can remove profile picture
- [ ] Performance acceptable (no lag with many avatars)
- [ ] Unit tests pass

---

#### PR-052: Background/Killed Push Notifications
**Dependencies:** PR-031 (foreground notifications from MVP)
**Estimated Time:** 2 hours
**Prerequisites:** ✅ PR-031 merged (can start in parallel with AI features)
**Status:** ✅ COMPLETE - All tests passed on physical device

**Implementation Summary:**
- ✅ Firebase Cloud Functions deployed for server-side push notification delivery
- ✅ Native FCM token registration (switched from Expo tokens)
- ✅ AsyncStorage auth persistence for killed-state recovery
- ✅ Unread message counting system (per-chat and global)
- ✅ Real-time badge count updates
- ✅ Deep linking from background and killed state notifications
- ✅ Automatic invalid token cleanup
- ✅ Unit tests written (14 test cases)
- ✅ Comprehensive testing guide created (TESTING_PR052.md)
- ✅ Setup documentation created (FCM_SETUP.md)
- ✅ EAS build configuration complete (Firebase SDK env vars uploaded as secrets)
- ✅ Physical device testing complete (all tests passed)
- ✅ Force-stop limitation documented (expected Android behavior)

**Files Created:**
- `functions/` - Complete Cloud Functions setup (TypeScript)
- `src/services/unread.service.ts` - Unread count management
- `src/__tests__/services/unread.service.test.ts` - Unit tests
- `src/__tests__/services/notification-fcm.service.test.ts` - FCM tests
- `FCM_SETUP.md` - Setup instructions
- `TESTING_PR052.md` - 14-test manual testing guide
- `PR052_SUMMARY.md` - Implementation summary
- `KILLED_STATE_NOTIFICATION_ANALYSIS.md` - Force-stop behavior analysis

**Files Modified:**
- `app.config.js` - iOS/Android notification config (migrated from app.json)
- `firebase.json` - Cloud Functions configuration
- `firebase-rules/database-rules.json` - Token and unread rules
- `src/types/index.ts` - Push token and unread types
- `src/services/notification.service.ts` - Native FCM token integration
- `src/services/firebase.ts` - AsyncStorage auth persistence
- `src/contexts/NotificationContext.tsx` - Background/killed handling
- `src/screens/ConversationScreen.tsx` - Mark chat as read

**Next Steps for Testing:**
1. Deploy Cloud Functions: `cd functions && npm install && npm run build && firebase deploy --only functions`
2. Update Expo project ID in `notification.service.ts` line 205
3. Add `google-services.json` (Android) or `GoogleService-Info.plist` (iOS)
4. Run all 14 tests in `TESTING_PR052.md` on physical devices
5. See `FCM_SETUP.md` for complete setup instructions

**Commit:** cdae39b

**Tasks:**
1. **Background Notification Handling** (1 hour):
   - Update Expo notification configuration in `app.json`:
     - Ensure background mode enabled
     - Configure notification categories
     - Set priority to high
   - Test notification delivery when app backgrounded:
     - Send test messages
     - Verify notifications appear
     - Check notification content (sender, preview)
   - Verify deep linking from background:
     - Tap notification
     - Should open app to specific chat
     - Test chatId extraction from notification data
   - Test badge count:
     - Badge should show unread count
     - Update on new messages
     - Clear on chat open
   - Update `notification.service.ts`:
     - Handle background notification tap
     - Extract chatId from data payload
     - Navigate to correct chat
   - Test on physical device (critical)

2. **Killed State Notification Handling** (1 hour):
   - Configure FCM for killed state delivery
   - Test notifications when app completely closed:
     - Force quit app
     - Send message from another device
     - Verify notification received
   - Test app launch from notification:
     - Tap notification
     - App should launch directly to chat
     - Message should be visible
   - Verify no message loss:
     - Messages sent while app killed
     - Should sync on app open
     - Verify message queue processes
   - Test on physical Android device:
     - Background restrictions
     - Battery optimization
     - Doze mode
   - Document any platform-specific behavior

**Validation:**
- ✅ Notifications received when app backgrounded (minimized)
- ✅ Notifications received when app naturally killed (not in recents)
- ✅ Deep linking works from background state
- ✅ Deep linking works from killed state
- ✅ Auth persists across app restarts
- ✅ Badge counts accurate
- ✅ No message loss during app restart
- ✅ Works on physical device (Android)
- ✅ Notification content correct (sender, preview)
- ✅ Sound/vibration work per device settings
- ✅ Force-stop limitation documented (expected Android behavior - see KILLED_STATE_NOTIFICATION_ANALYSIS.md)

**Note:** All critical tests passed on physical device. Force-stop (swipe from recents) prevents notifications as expected Android behavior - this is normal and affects all apps except system-whitelisted ones like WhatsApp.

---

### Block 3B: Performance & Polish (Can run in parallel)

#### PR-053: Performance Optimization Pass
**Dependencies:** All AI features complete, typing indicators, profile pictures  
**Estimated Time:** 4 hours  
**Prerequisites:** ✅ PR-048, PR-050, PR-051 merged

**Tasks:**
1. **Message List Optimization** (1.5 hours):
   - Profile `ConversationScreen.tsx` FlatList:
     - Use React DevTools Profiler
     - Identify slow renders
     - Measure frame rates
   - Implement FlatList optimizations:
     - `getItemLayout` (if message heights predictable):
       ```typescript
       getItemLayout={(data, index) => ({
         length: ITEM_HEIGHT,
         offset: ITEM_HEIGHT * index,
         index,
       })}
       ```
     - Optimize `keyExtractor`:
       ```typescript
       keyExtractor={(item) => item.id}
       ```
     - Tune rendering props:
       - `initialNumToRender={20}`
       - `maxToRenderPerBatch={10}`
       - `windowSize={10}`
       - `removeClippedSubviews={true}`
   - Memoize MessageBubble:
     - Wrap with `React.memo(MessageBubble, arePropsEqual)`
     - Custom comparison function
     - Prevent unnecessary re-renders
   - Optimize event handlers:
     - Use `useCallback` for all handlers
     - Ensure stable references
   - Test with large datasets:
     - Create test chat with 1000+ messages
     - Measure scroll performance
     - Target: 60fps scrolling

2. **Image Loading Optimization** (1 hour):
   - Implement progressive image loading:
     - Show blur hash or color placeholder
     - Load thumbnail first (if available)
     - Load full resolution after
   - Optimize Avatar images:
     - Cache profile pictures aggressively
     - Preload visible avatars
     - Lazy load off-screen avatars
   - Optimize message images:
     - Load compressed versions in chat
     - Full resolution only in full-screen view
     - Implement lazy loading (only load visible)
   - Use React Native's Image component optimizations:
     - `resizeMode="cover"`
     - `progressiveRenderingEnabled={true}`
   - Test with image-heavy conversation:
     - Create chat with 50+ images
     - Measure loading times
     - Ensure smooth scrolling

3. **AI Response Optimization** (1 hour):
   - Review AI service layer:
     - Identify bottlenecks
     - Measure response times for each feature
   - Implement batch processing:
     - Queue multiple AI requests
     - Process together when possible
     - Example: Detect language for all messages at once
   - Implement request deduplication:
     - Track in-flight requests by key
     - If duplicate request, wait for existing
     - Return same promise
   - Add aggressive caching review:
     - Verify all AI responses cached
     - Check cache hit rates
     - Increase cache sizes if needed
   - Implement response streaming where beneficial:
     - Smart replies: Stream as generated
     - Translations: Stream for long texts
   - Monitor API call frequency:
     - Log API calls
     - Identify redundant calls
     - Optimize triggering logic

4. **Database Optimization** (30 min):
   - Profile SQLite queries:
     - Enable query logging
     - Identify slow queries (>100ms)
   - Add missing indexes:
     - Review common queries
     - Add indexes where beneficial
     - Example: Index on `(chatId, timestamp)` for messages
   - Optimize pagination queries:
     - Use LIMIT and OFFSET efficiently
     - Consider cursor-based pagination
   - Test with large datasets:
     - Seed database with 10,000+ messages
     - Measure query times
     - Target: <500ms for all queries
   - Optimize database writes:
     - Batch inserts where possible
     - Use transactions for multi-step operations

**Validation:**
- [ ] Smooth 60fps scrolling through 1000+ messages
- [ ] App launch <3s (cold start)
- [ ] AI responses <4s average
- [ ] No jank during typing or scrolling
- [ ] Images load progressively and smoothly
- [ ] Database queries <500ms (95th percentile)
- [ ] Cache hit rates >70% for AI features
- [ ] No memory leaks or excessive memory usage
- [ ] Battery usage reasonable

**Desiderata:**
- App launch <2s (Excellent tier: 11-12 points)
- AI responses <2s (Excellent tier: 14-15 points)
- Smooth scrolling through 5000+ messages

---

#### PR-054: UI Polish & Consistency
**Dependencies:** All previous PRs  
**Estimated Time:** 3 hours  
**Prerequisites:** ✅ All feature PRs merged

**Tasks:**
1. **Design System Audit** (1 hour):
   - Review `/src/styles/theme.ts`:
     - Ensure all colors defined
     - Consistent color usage
     - Semantic color names (primary, secondary, error, etc.)
   - Audit all screens for consistency:
     - Font sizes (heading, body, caption)
     - Font weights (regular, medium, bold)
     - Spacing (margins, padding) - use 4px/8px grid
     - Button styles (primary, secondary, text)
     - Input field styles
     - Icon sizes and styles
   - Check accessibility:
     - Color contrast ratios (WCAG AA minimum)
     - Touch target sizes (44x44 minimum)
     - Font sizes (minimum 14px for body)
   - Create style guide document:
     - Typography scale
     - Color palette
     - Spacing scale
     - Component patterns

2. **Animation Polish** (1 hour):
   - Screen transitions:
     - Ensure smooth navigation transitions
     - Consistent animation timing (300ms)
     - Use native animations where possible
   - Message appearance animations:
     - New messages fade in + slide up
     - Smooth, not jarring
     - Don't interfere with scrolling
   - Loading animations:
     - Consistent spinners throughout
     - Skeleton loaders for content
     - Progress bars for uploads
   - Gesture feedback:
     - Haptic feedback on button press (iOS)
     - Vibration on actions (Android)
     - Visual feedback (press states)
   - Keyboard animations:
     - Smooth keyboard appearance/dismissal
     - Content adjusts smoothly
     - Use KeyboardAvoidingView properly
   - Test all animations on physical device

3. **Empty States** (1 hour):
   - Review and improve empty states:
     - **ChatListScreen** - no chats:
       - Friendly illustration or icon
       - Message: "No conversations yet"
       - CTA: "Start a new chat" button
     - **ConversationScreen** - no messages:
       - Message: "Send your first message to {name}"
       - Hint: "Say hi! 👋" or similar
     - **NewChatScreen** - no users found:
       - Icon: 🔍
       - Message: "No users found"
       - Suggestion: "Try a different search"
     - **UserSelectItem** - no users to select:
       - Message: "No users available"
     - **Smart replies** - no suggestions:
       - Message: "No suggestions available"
       - Optional: Subtle refresh button
     - **Search results** - no matches:
       - Icon: 🔍
       - Message: "No messages found"
   - Ensure all empty states:
     - Helpful and friendly
     - Clear next action (when applicable)
     - Consistent styling
     - Appropriate illustrations/icons
   - Test by triggering all empty states

**Validation:**
- [ ] UI consistent across all screens
- [ ] Colors match theme throughout
- [ ] Typography consistent
- [ ] Spacing follows grid system
- [ ] Animations smooth and purposeful (60fps)
- [ ] Haptic feedback appropriate
- [ ] Empty states helpful and clear
- [ ] Accessibility requirements met
- [ ] Professional appearance
- [ ] No visual glitches or jarring transitions

---

## Phase 4: Testing & Optimization (Hours 60-72)

### Block 4A: Comprehensive Testing (Can run in parallel)

#### PR-055: Integration Testing - AI Features
**Dependencies:** All AI PRs (PR-043 through PR-049)  
**Estimated Time:** 3 hours  
**Prerequisites:** ✅ PR-043-049 merged

**Tasks:**
1. **Translation Integration Tests** (1 hour):
   - Create `/src/__tests__/integration/translation.test.ts`
   - Test language detection accuracy:
     - 20+ test samples across languages:
       - English: "Hello, how are you?"
       - Spanish: "Hola, ¿cómo estás?"
       - French: "Bonjour, comment allez-vous?"
       - German: "Hallo, wie geht es dir?"
       - Chinese: "你好吗？"
       - Japanese: "元気ですか？"
       - Arabic: "كيف حالك؟"
     - Measure accuracy: >90% expected
   - Test translation quality:
     - Translate 10+ phrases each for EN↔ES, EN↔FR, EN↔ZH
     - Verify meaning preserved
     - Check for natural phrasing
     - Measure response times
   - Test auto-translate behavior:
     - Enable auto-translate
     - Send message in different language
     - Verify translation appears
     - Disable auto-translate
     - Verify translation doesn't appear
   - Test inline translation:
     - Translate on demand
     - Verify caching (don't re-translate)
     - Test various language pairs
   - Test caching:
     - Translate same message twice
     - Verify second call instant (cached)

2. **Cultural Context Tests** (1 hour):
   - Create `/src/__tests__/integration/cultural-context.test.ts`
   - Test cultural reference detection:
     - Test samples with clear cultural content:
       - "Happy Diwali! 🪔"
       - "Let's grab some dim sum for lunch"
       - "It's raining cats and dogs"
       - "That's a piece of cake"
       - "We celebrate Día de los Muertos"
     - Verify hints generated
     - Measure precision (no false positives)
   - Test hint quality:
     - Review generated explanations
     - Verify completeness (phrase, meaning, background)
     - Check cultural accuracy
   - Test hint UI behavior:
     - Tap hint icon
     - Verify modal appears
     - Dismiss hint
     - Verify not reshown
   - Test across cultures:
     - Western (US, UK, Europe)
     - Asian (Chinese, Japanese, Indian)
     - Middle Eastern
     - Latin American

3. **Smart Reply Tests** (1 hour):
   - Create `/src/__tests__/integration/smart-replies.test.ts`
   - Test reply generation quality:
     - Create test conversations (10+ scenarios):
       - Question: "Want to grab coffee?"
       - Statement: "I finished the report"
       - Invitation: "Party at my place Friday"
       - Request: "Can you help me with this?"
     - Generate replies for each
     - Verify replies make sense
     - Verify variety (different types)
   - Test style matching accuracy:
     - Create synthetic user profiles:
       - Formal user (uses punctuation, no emojis)
       - Casual user (no punctuation, many emojis)
       - Bilingual user (mixes EN/ES)
     - Generate replies
     - Verify style matches profile
   - Test multilingual replies:
     - User who code-switches
     - Generate replies
     - Verify appropriate language mixing
   - Test context awareness:
     - Long conversation thread
     - Generate replies
     - Verify references recent context
   - Measure response times:
     - Track generation time for each test
     - Calculate average
     - Target: <15s (acceptable), <8s (excellent)

**Validation:**
- [ ] All integration tests pass
- [ ] Language detection >90% accurate
- [ ] Translation quality good (natural, accurate)
- [ ] Cultural context hints relevant and accurate
- [ ] Smart replies contextually appropriate
- [ ] Style matching works (>75% accuracy)
- [ ] Multilingual replies work correctly
- [ ] AI response times acceptable (<15s avg)
- [ ] No regressions in core messaging

**Desiderata:**
- AI response times <8s
- Style matching >85% accurate

---

#### PR-056: End-to-End Testing - Complete Flows
**Dependencies:** All PRs complete  
**Estimated Time:** 4 hours  
**Prerequisites:** ✅ All PRs merged

**Tasks:**
1. **Create E2E Test Scenarios** (1 hour):
   - Document 7 critical test scenarios:
   
   **Scenario 1: New User Onboarding with AI**
   - Create new account
   - Set preferred language
   - Start first conversation
   - Send message (auto-translate should work)
   - Receive message with cultural hint
   - Use smart reply suggestion
   - Send image with caption
   - Verify all features work

   **Scenario 2: Multilingual Conversation**
   - User A (English speaker)
   - User B (Spanish speaker)
   - Both have auto-translate enabled
   - Exchange 10+ messages
   - Verify translations appear correctly
   - Test inline translation
   - Test formality adjustment
   - Test slang explanations

   **Scenario 3: Group Chat with Typing & Smart Replies**
   - Create group with 3 users
   - User A starts typing (others see indicator)
   - User A sends message
   - User B starts typing
   - User B uses smart reply
   - User C sends image
   - Verify typing indicators
   - Verify read receipts show counts
   - Verify smart replies contextual

   **Scenario 4: Offline → Online with AI Processing**
   - User A goes offline (airplane mode)
   - User B sends 5 messages (one in Spanish)
   - User A comes back online
   - Verify all messages sync
   - Verify AI processing happens (translation, etc.)
   - Verify no message loss
   - Verify message queue cleared

   **Scenario 5: Image Sharing with Translation**
   - User A sends image with Spanish caption
   - User B receives (English speaker)
   - Caption should auto-translate
   - User B can view original caption
   - Test inline translation of caption
   - Verify image loads correctly

   **Scenario 6: Profile Pictures Across Devices**
   - User A uploads profile picture
   - Verify appears in chat list
   - User B sees updated picture immediately
   - User A changes picture
   - User B sees update
   - Test with multiple users in group

   **Scenario 7: Push Notifications in All States**
   - App in foreground: Message arrives, notification banner
   - App in background: Message arrives, notification appears
   - Tap notification, opens to chat
   - App killed: Message arrives, notification appears
   - Tap notification, app launches to chat
   - Verify badge counts

2. **Execute Manual Tests** (2 hours):
   - Set up test environment:
     - 2-3 physical devices (or emulators)
     - Test user accounts ready
     - Network conditions controlled
   - Run each scenario:
     - Follow script precisely
     - Document results
     - Note any issues
     - Screenshot problems
   - Test with poor network:
     - Enable 3G simulation/throttling
     - Test message delivery
     - Test AI features (may be slower)
     - Verify graceful degradation
   - Test rapid messaging:
     - Send 20+ messages quickly
     - Verify no lag
     - Verify all deliver
     - Verify AI features keep up
   - Test app lifecycle:
     - Background app multiple times
     - Force quit during various actions
     - Test recovery
     - Verify no data loss
   - Test with multiple users simultaneously:
     - 3+ users in group chat
     - All messaging at once
     - Verify no conflicts
     - Verify typing indicators

3. **Performance Testing** (1 hour):
   - Measure app launch time:
     - 5 cold starts
     - Record times
     - Calculate average
     - Target: <3s (acceptable), <2s (excellent)
   - Measure message delivery latency:
     - Send 20 messages
     - Measure time from send to receive
     - Calculate p50, p95, p99
     - Target: <300ms p95 (acceptable), <200ms (excellent)
   - Measure AI response times:
     - Test each AI feature 10 times
     - Record response times
     - Calculate averages
     - Targets:
       - Language detection: <2s
       - Translation: <4s
       - Cultural context: <5s
       - Formality: <4s
       - Slang: <4s
       - Smart replies: <15s
   - Measure scrolling performance:
     - Create chat with 1000+ messages
     - Scroll rapidly
     - Measure frame rate
     - Target: 60fps sustained
   - Measure image upload time:
     - Upload 5 images (various sizes)
     - Record times
     - Target: <5s for 2MB image on 4G
   - Compare to rubric targets:
     - Document which tier achieved
     - Identify bottlenecks if below target

**Validation:**
- [ ] All 7 E2E scenarios pass completely
- [ ] No critical bugs found
- [ ] Performance meets "Good" tier minimum
- [ ] App feels production-ready
- [ ] All features work on physical device
- [ ] Works with poor network conditions
- [ ] No data loss in any scenario

**Desiderata:**
- Performance meets "Excellent" tier
- Zero bugs found

---

### Block 4B: Bug Fixes & Stability

#### PR-057: Bug Fix Pass
**Dependencies:** PR-055, PR-056  
**Estimated Time:** 4 hours  
**Prerequisites:** ✅ PR-055, PR-056 complete

**Tasks:**
1. **Prioritize Issues** (30 min):
   - Review all bugs from testing
   - Create bug list with:
     - Description
     - Steps to reproduce
     - Expected vs actual behavior
     - Severity rating
   - Categorize by severity:
     - **Critical:** App crashes, data loss, security issues
     - **High:** Major features broken, bad UX
     - **Medium:** Minor features broken, cosmetic issues
     - **Low:** Edge cases, nice-to-haves
   - Sort by: Critical > High > Medium > Low
   - Estimate fix time for each
   - Decide what to fix (focus on Critical and High)

2. **Fix Critical Bugs** (2 hours):
   - Address all Critical severity bugs:
     - App crashes
     - Data loss issues
     - Security vulnerabilities
     - Authentication failures
     - Message delivery failures
   - For each bug:
     - Reproduce locally
     - Identify root cause
     - Implement fix
     - Write test to prevent regression
     - Verify fix works
     - Re-test related functionality
   - Document fixes in commit messages
   - Update tests as needed

3. **Fix High-Priority Bugs** (1.5 hours):
   - Address High severity bugs:
     - AI features not working
     - UI severely broken
     - Major UX issues
     - Performance problems
   - Follow same process as Critical bugs
   - Test thoroughly after each fix
   - Ensure no new bugs introduced

**Validation:**
- [ ] All critical bugs fixed and verified
- [ ] All high-priority bugs fixed
- [ ] Fixes don't introduce new bugs
- [ ] All tests passing
- [ ] App stable and reliable
- [ ] Re-run E2E scenarios to confirm

---

## Phase 5: Documentation & Demo (Hours 72-84)

### Block 5A: Documentation (Can partially run in parallel)

#### PR-058: Architecture Documentation
**Dependencies:** All implementation complete  
**Estimated Time:** 3 hours  
**Prerequisites:** ✅ All PRs merged

**Tasks:**
1. **Architecture Overview** (1.5 hours):
   - Create `/docs/ARCHITECTURE.md`
   - System Architecture section:
     - Create diagram (use Excalidraw, draw.io, or similar):
       ```
       [Mobile App (React Native + Expo)]
              |
              v
       [Firebase Services]
         - RTDB (real-time sync)
         - Auth (authentication)
         - Storage (images)
         - Functions (notifications)
              |
              v
       [OpenAI + Swarm]
         - Language models
         - Function calling
         - Agent orchestration
       ```
     - Data flow diagram:
       - Message send flow
       - Message receive flow
       - Offline message queue flow
       - AI processing flow
     - Export diagrams as images
     - Embed in markdown
   - Component Architecture:
     - Screen hierarchy:
       - Auth Stack
       - Main Stack (Chat List, Conversation, etc.)
       - Modal Stack (Image Preview, Settings, etc.)
     - Service layer organization:
       - Firebase services
       - AI services
       - Local database services
       - Utility services
     - State management:
       - React Context usage (Auth, Network, Notification)
       - Local state patterns
       - Firebase real-time subscriptions
   - Data Models:
     - Document all interfaces (User, Message, Chat)
     - Include Firebase schema
     - Include SQLite schema
     - Show relationships
   - Security Architecture:
     - Firebase Security Rules explained
     - API key management
     - Authentication flow
     - Data encryption (if any)

2. **AI System Documentation** (1 hour):
   - AI Architecture section:
     - Swarm agent setup:
       - Base configuration
       - Agent definitions
       - How agents communicate
     - RAG pipeline design:
       - How context retrieved
       - How formatted for LLM
       - Token management
     - Function calling tools:
       - List all tools
       - Parameters
       - Use cases
     - Caching strategy:
       - What's cached
       - Cache invalidation
       - Cache sizes
   - Feature-by-Feature Documentation:
     - For each AI feature:
       - **Language Detection & Auto-Translate:**
         - How it works
         - Prompt used
         - Caching strategy
         - Performance characteristics
       - **Real-time Translation:**
         -How it works
         - Contextual triggers
         - Prompt engineering approach
       - **Cultural Context Hints:**
         - Detection logic
         - Agent workflow
         - Hint generation process
       - **Formality Adjustment:**
         - Multi-step agent process
         - Style analysis
         - Transformation approach
       - **Slang/Idiom Explanations:**
         - Detection patterns
         - Explanation generation
       - **Smart Replies (Advanced):**
         - User style learning process
         - Multi-agent workflow (4 agents)
         - Context analysis
         - Reply generation strategy
         - Style matching algorithm
   - Prompt Engineering:
     - Key prompts used
     - System messages
     - Few-shot examples (if used)
     - Temperature settings
   - Performance Optimization:
     - Batching strategies
     - Caching approach
     - Request deduplication
     - Response streaming

3. **Deployment Documentation** (30 min):
   - Firebase Setup:
     - Create project steps
     - Enable services
     - Configure Security Rules
     - Set up Cloud Functions
   - Environment Variables:
     - List all required vars
     - Where to get values
     - How to configure
   - Build Process:
     - Install dependencies
     - Configure Expo
     - Run locally
     - Build for Expo Go
   - Testing on Expo Go:
     - QR code instructions
     - Test account credentials
     - Known limitations
   - Troubleshooting:
     - Common issues and solutions
     - Firebase connection problems
     - OpenAI API errors
     - Build failures

**Validation:**
- [ ] Architecture clearly explained with diagrams
- [ ] All major systems documented
- [ ] AI system thoroughly documented
- [ ] Each AI feature explained
- [ ] Deployment steps clear
- [ ] Can be understood by another developer
- [ ] Diagrams export correctly

---

#### PR-059: README Update
**Dependencies:** PR-058  
**Estimated Time:** 2 hours  
**Prerequisites:** ✅ PR-058 merged (can partially parallelize)

**Tasks:**
1. **Update README.md** (2 hours):
   - Create comprehensive README with sections:
   
   **Project Overview** (10 min):
   ```markdown
   # MessageAI - International Communicator
   
   An AI-enhanced messaging app built for people who communicate across language barriers. Built with React Native, Firebase, and OpenAI Swarm in 7 days.
   
   🌍 Real-time translation  
   💬 Smart reply suggestions  
   🎯 Cultural context awareness  
   📱 Production-quality messaging infrastructure  
   ```

   **Features List** (20 min):
   - Core Messaging Features:
     - ✅ Real-time messaging (<300ms delivery)
     - ✅ One-on-one and group chat (3-5 users)
     - ✅ Offline support with message queue
     - ✅ Message persistence (SQLite)
     - ✅ Optimistic UI updates
     - ✅ Delivery states (sending, sent, delivered, read)
     - ✅ Read receipts with counts
     - ✅ Typing indicators
     - ✅ Online/offline presence
     - ✅ Image messaging with captions
     - ✅ Profile pictures
     - ✅ Push notifications (all app states)
   
   - AI Features (International Communicator):
     - ✅ **Language Detection & Auto-Translate**: Automatically detect message language and translate to your preferred language
     - ✅ **Real-time Inline Translation**: Translate any message on-demand with language indicators
     - ✅ **Cultural Context Hints**: Get explanations for cultural references, holidays, and customs
     - ✅ **Formality Level Adjustment**: Adjust message formality before sending (casual ↔ formal)
     - ✅ **Slang & Idiom Explanations**: Tap underlined phrases for clear explanations
     - ✅ **Context-Aware Smart Replies**: AI generates 3-5 reply suggestions matching your personal style in multiple languages

   **Technology Stack** (10 min):
   ```markdown
   **Frontend:**
   - React Native with Expo
   - TypeScript
   - Expo SQLite (local storage)
   - React Navigation
   - React Native Paper (UI components)
   
   **Backend:**
   - Firebase Realtime Database (real-time sync)
   - Firebase Authentication (email/password)
   - Firebase Storage (images)
   - Firebase Cloud Functions (push notifications)
   
   **AI:**
   - OpenAI GPT-4
   - OpenAI Swarm (multi-agent orchestration)
   - RAG pipeline for conversation context
   - Function calling for tool use
   ```

   **Architecture** (5 min):
   ```markdown
   See [Architecture Documentation](./docs/ARCHITECTURE.md) for detailed system design.
   
   Key architectural decisions:
   - Offline-first: Local SQLite database syncs with Firebase
   - Optimistic UI: Messages appear instantly, sync in background
   - Multi-agent AI: Swarm orchestrates complex workflows
   - RAG pipeline: AI has access to conversation context
   ```

   **Setup Instructions** (30 min):
   ```markdown
   ### Prerequisites
   - Node.js 18+ and npm
   - Expo CLI: `npm install -g expo-cli`
   - Firebase account
   - OpenAI API key
   
   ### Installation
   
   1. Clone repository:
   ```bash
   git clone https://github.com/yourusername/messageai.git
   cd messageai
   ```
   
   2. Install dependencies:
   ```bash
   npm install
   ```
   
   3. Configure Firebase:
      - Create Firebase project at https://console.firebase.google.com
      - Enable Realtime Database, Authentication (email/password), Storage, Cloud Functions
      - Download config and add to `.env`
   
   4. Set environment variables:
   ```bash
   cp .env.example .env
   ```
   Edit `.env` with your values:
   ```
   FIREBASE_API_KEY=your_key_here
   FIREBASE_AUTH_DOMAIN=your_domain
   FIREBASE_PROJECT_ID=your_project
   FIREBASE_STORAGE_BUCKET=your_bucket
   FIREBASE_MESSAGING_SENDER_ID=your_id
   FIREBASE_APP_ID=your_app_id
   OPENAI_API_KEY=sk-your_key_here
   ```
   
   5. Deploy Firebase Security Rules:
   ```bash
   firebase deploy --only database
   ```
   
   6. Deploy Cloud Functions:
   ```bash
   cd functions
   npm install
   npm run deploy
   ```
   
   7. Run app:
   ```bash
   npm start
   ```
   Scan QR code with Expo Go app (iOS/Android)
   ```

   **Testing Instructions** (10 min):
   ```markdown
   ### Running Tests
   ```bash
   npm test
   ```
   
   ### Test Coverage
   ```bash
   npm run test:coverage
   ```
   Current coverage: ~80%
   
   ### Manual Testing
   Test accounts available for demo:
   - User A: alice@test.com / password123
   - User B: bob@test.com / password123
   - User C: carlos@test.com / password123
   
   See [E2E Test Scenarios](./docs/TESTING.md) for complete test scripts.
   ```

   **International Communicator Persona** (15 min):
   ```markdown
   ### Target User: International Communicator
   
   **Who they are:**
   People with friends, family, or colleagues who speak different languages. This includes:
   - Multilingual families
   - International remote teams
   - Language learners
   - Global friend groups
   - Cross-cultural relationships
   
   **Pain points addressed:**
   - 🌐 Language barriers in daily communication
   - 🤔 Translation nuances and cultural context
   - ⌨️ Copy-paste overhead for translation tools
   - 📚 Difficulty learning through conversation
   - 🎭 Understanding cultural references and idioms
   
   **How AI features help:**
   - **Auto-translate**: Messages automatically translate to your language
   - **Cultural context**: Learn about holidays, customs, and references
   - **Slang explanations**: Understand informal language and idioms
   - **Formality adjustment**: Write appropriately for any situation
   - **Smart replies**: Get suggestions in the right language and tone
   ```

   **Known Limitations** (10 min):
   ```markdown
   - Group chat limited to 5 users (can be increased)
   - AI features require internet connection
   - Translation quality depends on language pair
   - Smart replies work best after 20+ messages
   - Push notifications may be delayed on some Android devices with aggressive battery optimization
   ```

   **Future Enhancements** (10 min):
   ```markdown
   - Voice messages with AI transcription
   - Message reactions and threading
   - Video/audio calls
   - End-to-end encryption
   - Advanced search with semantic AI
   - Conversation insights dashboard
   - Language learning features
   ```

   **License** (5 min):
   ```markdown
   MIT License - see LICENSE file
   
   Built with AI coding tools in 7 days for the Gauntlet AI coding challenge.
   ```

   **Credits** (5 min):
   ```markdown
   - OpenAI for GPT-4 and Swarm framework
   - Firebase for backend infrastructure
   - Expo for React Native development platform
   - React Native community for excellent libraries
   ```

**Validation:**
- [ ] README comprehensive and clear
- [ ] Setup instructions accurate (test with fresh clone)
- [ ] All features documented
- [ ] Technology stack complete
- [ ] Links to documentation work
- [ ] Code blocks formatted correctly
- [ ] Professional appearance

---

### Block 5B: Demo Preparation & Recording (Partially parallel with documentation)

#### PR-060: Demo Video Preparation
**Dependencies:** All implementation complete, PR-057 (bugs fixed)  
**Estimated Time:** 2 hours  
**Prerequisites:** ✅ All PRs merged, app stable

**Tasks:**
1. **Demo Script Creation** (30 min):
   - Write detailed script (see below)
   - Time each section
   - Total target: 5-7 minutes
   - Include talking points
   - Plan transitions
   - Prepare any props/visuals

   **Demo Script:**
   ```
   [00:00-00:30] INTRODUCTION
   - "Hi, I'm [name] and this is MessageAI"
   - "Built for International Communicators - people who chat across languages"
   - "Built in 7 days with React Native, Firebase, and OpenAI Swarm"
   - "Let me show you what makes it special"
   [Show: Title screen or app icon]
   
   [00:30-01:30] REAL-TIME MESSAGING
   - "First, the fundamentals: production-quality messaging"
   - Show 2 devices side-by-side (both screens visible)
   - Device A sends message → appears instantly on Device B
   - "Sub-300ms delivery on good networks"
   - Rapid fire: Send 5-10 messages quickly
   - "Watch the delivery states: sending, sent, delivered, read"
   - Point to checkmarks changing
   [Show: Both devices, rapid messaging, delivery states]
   
   [01:30-02:30] GROUP CHAT
   - "Group chats work great too"
   - Show group with 3+ participants
   - User A sends message
   - "Alice is typing..." appears for others
   - User B sends message
   - User C sends message
   - "Read receipts show who's read: Read by 3"
   - Point to read count
   [Show: Group chat with 3 devices if possible, or simulate]
   
   [02:30-03:15] OFFLINE SCENARIO
   - "Real-world networks aren't perfect"
   - Device A: Enable airplane mode
   - "See the offline indicator"
   - Try to send messages
   - "Messages queue locally"
   - Device B sends messages to Device A
   - Device A: Disable airplane mode
   - "Watch them sync instantly"
   - All messages appear
   [Show: Airplane mode toggle, offline indicator, message queue, sync]
   
   [03:15-03:45] APP LIFECYCLE
   - "The app handles backgrounding perfectly"
   - Background app, send message from other device
   - Notification appears
   - Tap notification, opens to chat
   - "Force quit for the ultimate test"
   - Force quit app
   - Send message
   - Notification appears
   - Tap, app launches directly to chat
   - "Chat history intact, no messages lost"
   [Show: Background, notification, force quit, notification, reopen]
   
   [03:45-05:45] AI FEATURES (2 minutes)
   - "Now the AI magic for International Communicators"
   
   - **Language Detection & Auto-Translate** (25s):
     - "Alice speaks English, Bob speaks Spanish"
     - Bob sends: "Hola, ¿cómo estás?"
     - "Auto-translate kicks in"
     - Show translation: "Hello, how are you?"
     - "Tap to see original"
     [Show: Spanish message, translation indicator, toggle]
   
   - **Real-time Inline Translation** (20s):
     - "Translate any message on demand"
     - Long-press message
     - Tap "Translate"
     - Shows translation with language badges
     - "ES → EN"
     [Show: Long-press menu, translate action, result]
   
   - **Cultural Context Hints** (20s):
     - Bob sends: "Happy Día de los Muertos! 🌺"
     - Info icon appears
     - Tap to see explanation
     - "Day of the Dead: Mexican holiday honoring ancestors..."
     - "Learn while you chat"
     [Show: Message with hint icon, tap, explanation modal]
   
   - **Formality Adjustment** (20s):
     - Alice typing casual message: "hey wanna meet up?"
     - Formality indicator shows: "Informal"
     - Tap "More Formal"
     - Preview: "Hello, would you like to meet?"
     - "Use this" → Sends formal version
     [Show: Typing, formality indicator, adjustment preview]
   
   - **Slang Explanations** (20s):
     - Bob sends: "That's lit! 🔥"
     - Underlined automatically
     - Tap "lit"
     - Explanation: "Slang meaning: excellent or exciting"
     - "Build your glossary as you chat"
     [Show: Underlined slang, tap, explanation popup]
   
   - **Smart Replies** (30s):
     - Bob asks: "Want to grab dinner Friday?"
     - Smart reply bar appears with 3 suggestions:
       - "Sounds great! What time? 😊"
       - "I'd love to! Where should we go?"
       - "Sorry, I can't make it this Friday"
     - "AI learned Alice's style from past messages"
     - Tap first suggestion
     - Appears in input, can edit
     - Send
     - "Works in multiple languages too"
     [Show: Incoming message, smart replies appear, tap, send]
   
   [05:45-06:15] TECHNICAL ARCHITECTURE
   - Show architecture diagram
   - "React Native + Expo for cross-platform mobile"
   - "Firebase for real-time sync and offline support"
   - "OpenAI Swarm for multi-agent AI workflows"
   - "RAG pipeline gives AI conversation context"
   - "SQLite local database for offline-first architecture"
   [Show: Architecture diagram from docs]
   
   [06:15-06:30] CONCLUSION
   - "MessageAI: Production messaging + intelligent AI"
   - "Built in 7 days with AI coding tools"
   - "All code, tests, and docs on GitHub"
   - Show GitHub link
   - "Thanks for watching!"
   [Show: GitHub repo, star count if any]
   ```

2. **Demo Environment Setup** (30 min):
   - Create/verify test accounts:
     - Alice (English): alice@test.com / demo123
     - Bob (Spanish): bob@test.com / demo123
     - Carlos (for group): carlos@test.com / demo123
   - Set up conversations:
     - 1:1 chat between Alice and Bob (some history)
     - Group chat with all 3 users (some history)
     - Clear any test garbage
   - Configure user preferences:
     - Alice: English preferred, auto-translate ON
     - Bob: Spanish preferred, auto-translate ON
   - Upload profile pictures for all users
   - Prepare sample messages:
     - Cultural reference message ready to copy/paste
     - Slang message ready
     - Question for smart replies
   - Device setup:
     - Charge both devices to 100%
     - Clean screens
     - Disable notifications from other apps
     - Set Do Not Disturb (except test notifications)
     - Test network toggle (airplane mode easy to access)
   - Recording setup:
     - Clear space for recording
     - Good lighting
     - Quiet environment
     - Test camera/tripod setup

3. **Test Run** (1 hour):
   - Do complete dry run:
     - Follow script exactly
     - Time each section
     - Adjust timing if needed
   - Test all features work:
     - Real-time messaging smooth
     - Group chat functional
     - Offline scenario works
     - App lifecycle handles correctly
     - All AI features respond
     - Notifications appear
   - Practice transitions:
     - Moving between devices
     - Navigating screens
     - Smooth narration
   - Test audio:
     - Voice clear and audible
     - No background noise
     - Good microphone placement
   - Refine script:
     - Adjust wording
     - Trim if over 7 minutes
     - Add emphasis points
   - Do 2-3 full practice runs

**Validation:**
- [ ] Script covers all rubric requirements
- [ ] Script times to 5-7 minutes
- [ ] Demo flows smoothly
- [ ] All features work reliably
- [ ] Devices charged and ready
- [ ] Environment ready for recording
- [ ] Comfortable with narration

---

#### PR-061: Demo Video Recording & Editing
**Dependencies:** PR-060  
**Estimated Time:** 4 hours  
**Prerequisites:** ✅ PR-060 complete

**Tasks:**
1. **Recording Setup** (30 min):
   - Set up camera/phone:
     - Position to capture both device screens
     - Frame tightly (focus on screens)
     - Ensure stable (tripod or stand)
   - Lighting:
     - Even lighting on screens (no glare)
     - Bright enough to see clearly
     - Test for reflections
   - Audio:
     - Good microphone (external if possible)
     - Test audio levels
     - Quiet environment
   - Clean background:
     - Remove clutter
     - Neutral or simple background
   - Test recording:
     - Record 30 seconds
     - Check video quality
     - Check audio quality
     - Adjust as needed

2. **Record Demo** (1.5 hours):
   - Do warm-up:
     - Practice script once more
     - Relax, breathe
   - Record multiple takes:
     - Take 1: Full run-through
     - Review, note issues
     - Take 2: Address issues
     - Take 3: Safety take (optional)
   - Recording tips:
     - Speak clearly and at moderate pace
     - Show features properly (not too fast)
     - Point to UI elements when relevant
     - Smile (voice sounds better)
     - Pause between sections (easy editing)
   - If mistake happens:
     - Don't stop
     - Continue from next section
     - Or re-record just that section
   - Capture extra footage:
     - B-roll of key features
     - Close-ups if needed
     - Can use in editing
   - Verify recordings:
     - Video clear and stable
     - Audio clear throughout
     - All features demonstrated
     - Timing reasonable

3. **Video Editing** (2 hours):
   - Import footage into editor:
     - iMovie, Adobe Premiere, DaVinci Resolve, etc.
   - Select best takes:
     - Use best sections from each take
     - Splice together if needed
   - Edit structure:
     - Trim dead space
     - Cut mistakes
     - Pace appropriately
     - Add transitions (simple cuts, no fancy)
   - Add text overlays:
     - Intro title: "MessageAI - International Communicator"
     - Feature labels appear as demonstrated:
       - "Real-time Messaging"
       - "Language Detection & Auto-Translate"
       - "Cultural Context Hints"
       - Etc.
     - Use simple, readable font (white text, dark shadow)
     - Position top or bottom third
     - Display 2-3 seconds each
   - Add arrows/highlights (optional):
     - Point to delivery states changing
     - Highlight typing indicators
     - Circle AI features in action
     - Use sparingly (not distracting)
   - Add background music (optional):
     - Subtle, low volume
     - Royalty-free music only
     - Doesn't overpower narration
     - Fade in/out
   - Intro/outro:
     - Clean intro screen (0-2s): Title + tagline
     - Outro screen (2-3s): "github.com/youruser/messageai" + "Thanks for watching!"
   - Color correction (if needed):
     - Ensure consistent brightness
     - Good contrast
     - Natural colors
   - Audio:
     - Normalize audio levels
     - Remove background noise (if possible)
     - Ensure clear throughout
   - Final review:
     - Watch complete video
     - Check timing: 5-7 minutes
     - Verify all requirements shown
     - Check for errors
     - Get second opinion if possible
   - Export:
     - Resolution: 1080p (1920x1080)
     - Format: MP4 (H.264)
     - Bitrate: 5-10 Mbps
     - Frame rate: 30fps
     - File size: Aim for <100MB if possible
   - Upload:
     - YouTube (unlisted or public)
     - Loom
     - Google Drive with sharing enabled
     - Get shareable link

**Validation:**
- [ ] Video quality clear (1080p minimum)
- [ ] Audio clear and professional
- [ ] Length: 5-7 minutes exactly
- [ ] All rubric requirements demonstrated:
  - [ ] Real-time messaging (2 devices visible)
  - [ ] Group chat (3+ participants)
  - [ ] Offline scenario (airplane mode shown)
  - [ ] App lifecycle (background, foreground, force quit)
  - [ ] All 5 required AI features with clear examples
  - [ ] Advanced AI capability (smart replies) with use cases
  - [ ] Brief technical architecture explanation
- [ ] Both device screens visible throughout
- [ ] Text overlays helpful and readable
- [ ] Professional appearance
- [ ] Uploaded and shareable link obtained

---

### Block 5C: Final Validation & Submission

#### PR-062: Final Testing & Submission Prep
**Dependencies:** All PRs complete, demo video done  
**Estimated Time:** 3 hours  
**Prerequisites:** ✅ All PRs merged, PR-061 (demo) complete

**Tasks:**
1. **Final Test Pass** (1 hour):
   - Complete rubric checklist:
   
   **Core Messaging Infrastructure (35 points):**
   - [ ] Real-time messaging <300ms consistently
   - [ ] Offline support: messages queue and sync
   - [ ] Group chat with 3-5 users works smoothly
   - [ ] Typing indicators functioning
   - [ ] Message delivery states all working
   - [ ] Read receipts show counts
   - [ ] Online/offline presence accurate
   - [ ] Message persistence survives restart
   
   **Mobile App Quality (20 points):**
   - [ ] App lifecycle: background, foreground, force quit
   - [ ] Push notifications in all states
   - [ ] App launch <3s
   - [ ] Smooth scrolling (60fps goal)
   - [ ] Optimistic UI updates working
   - [ ] Keyboard handling good
   - [ ] Professional layout
   
   **AI Features (30 points):**
   - [ ] Language detection & auto-translate
   - [ ] Real-time inline translation
   - [ ] Cultural context hints
   - [ ] Formality level adjustment
   - [ ] Slang/idiom explanations
   - [ ] Smart replies (advanced capability)
   - [ ] All features accurate (>80%)
   - [ ] Response times acceptable (<4s avg for basic, <15s for smart replies)
   - [ ] Clean UI integration
   - [ ] Error handling works
   
   **Technical Implementation (10 points):**
   - [ ] Clean, organized code
   - [ ] API keys secured (environment variables only)
   - [ ] Function calling/tool use working
   - [ ] RAG pipeline functional
   - [ ] Proper authentication & data management
   - [ ] Local database working
   
   **Documentation & Deployment (5 points):**
   - [ ] Comprehensive README
   - [ ] Architecture documentation
   - [ ] Setup instructions clear
   - [ ] App deployed/runnable on Expo Go
   - [ ] Works on physical device

   - Run final test on physical device:
     - Complete E2E test scenarios
     - Verify all features
     - Check performance
     - No critical bugs

2. **Code Cleanup** (1 hour):
   - Remove debugging code:
     - All `console.log()` statements
     - All `console.warn()` statements
     - Debug buttons/features
   - Remove commented code:
     - Old implementations
     - Unused functions
     - Dead code
   - Clean up imports:
     - Remove unused imports
     - Organize import order
     - Group by type (React, libraries, local)
   - Format code:
     - Run Prettier (if configured)
     - Consistent indentation
     - Consistent spacing
     - Consistent quote style
   - Run linter:
     - `npm run lint`
     - Fix all errors
     - Fix critical warnings
   - Update comments:
     - Remove outdated comments
     - Add JSDoc where missing
     - Clarify complex logic
   - Final commit:
     - Commit message: "chore: final cleanup and polish"
     - Push to GitHub

3. **Submission Checklist** (1 hour):
   
   **GitHub Repository:**
   - [ ] All code pushed to main branch
   - [ ] README.md complete and accurate
   - [ ] `/docs/ARCHITECTURE.md` exists and complete
   - [ ] `.env.example` file present with all variables
   - [ ] `.gitignore` properly configured
   - [ ] Clean commit history (meaningful messages)
   - [ ] No sensitive data in repo
   - [ ] Repository public (or accessible to graders)
   - [ ] GitHub link ready: `https://github.com/yourusername/messageai`
   
   **Demo Video:**
   - [ ] Video uploaded (YouTube/Loom/Drive)
   - [ ] Link shareable and tested
   - [ ] Video length: 5-7 minutes
   - [ ] Covers all rubric requirements
   - [ ] High quality (1080p, clear audio)
   - [ ] Both device screens visible
   - [ ] Shows:
     - [ ] Real-time messaging (2 devices)
     - [ ] Group chat (3+ participants)
     - [ ] Offline scenario
     - [ ] App lifecycle handling
     - [ ] All 5 AI features
     - [ ] Smart replies (advanced)
     - [ ] Technical architecture
   - [ ] Link ready: `https://youtu.be/...` or similar
   
   **Deployment:**
   - [ ] Firebase backend deployed
   - [ ] Cloud Functions deployed and working
   - [ ] Firebase config correct
   - [ ] App works on Expo Go
   - [ ] QR code or link for testing
   - [ ] Test on physical device working
   - [ ] Expo link ready: `exp://...` or web link
   
   **Test Accounts:**
   - [ ] Document credentials for graders:
     ```
     Test Accounts:
     - alice@test.com / demo123 (English)
     - bob@test.com / demo123 (Spanish)
     - carlos@test.com / demo123 (Group member)
     ```
   - [ ] Accounts have sample conversations
   - [ ] Profile pictures set
   - [ ] Preferences configured
   
   **Social Post (Ready for submission form):**
   - [ ] Post text drafted (2-3 sentences):
     ```
     Just built MessageAI - an AI-enhanced messaging app for International Communicators!
     Real-time translation, cultural context hints, and smart replies powered by OpenAI Swarm.
     Built in 7 days with React Native + Firebase. 🌍💬🤖
     ```
   - [ ] Key features listed
   - [ ] Demo video link ready
   - [ ] GitHub link ready
   - [ ] Screenshots ready (3-5 images)
   - [ ] @GauntletAI tag noted
   - [ ] Platform chosen (X/Twitter or LinkedIn)
   
   **Architecture Documentation:**
   - [ ] `/docs/ARCHITECTURE.md` complete
   - [ ] System diagrams included
   - [ ] AI system explained
   - [ ] All features documented
   
   **Final Verification:**
   - [ ] Clone repo fresh in new directory
   - [ ] Follow setup instructions from README
   - [ ] Verify app runs
   - [ ] Test key features
   - [ ] Confirm all links work
   
   **Scoring Estimate:**
   - Calculate expected score based on testing
   - Core Messaging: __/35
   - Mobile Quality: __/20
   - AI Features: __/30
   - Technical: __/10
   - Documentation: __/5
   - **Total: __/100**
   - **Target: 90+ (Grade A)**

**Validation:**
- [ ] All checklist items complete
- [ ] Repository professional and polished
- [ ] Demo video meets all requirements
- [ ] App deployed and accessible
- [ ] Documentation complete
- [ ] Ready for submission form
- [ ] Expected score 90+

---

## Optional: Stretch Goals (If Time Permits - Hours 72-84)

### Bonus Block 0: App Polish & Icons

#### PR-066: Custom Notification Icon
**Dependencies:** None
**Estimated Time:** 30 minutes
**Prerequisites:** ✅ Can be done anytime

**Tasks:**
1. **Create Notification Icon** (20 min):
   - Design simple 24x24dp icon (white, transparent background)
   - Export as PNG for various densities (mdpi, hdpi, xhdpi, xxhdpi, xxxhdpi)
   - Or use online tool like https://romannurik.github.io/AndroidAssetStudio/
   - Save to `assets/notification-icon.png`

2. **Update Configuration** (10 min):
   - Add to `app.config.js`: `notification: { icon: "./assets/notification-icon.png" }`
   - Test notification appearance on device

**Validation:**
- [ ] Custom icon appears in Android notifications
- [ ] Icon follows Material Design guidelines
- [ ] Icon visible on various notification backgrounds

---

### Bonus Block 1: Enhanced Messaging Features (+2 points)

#### PR-063: Message Reactions & Forwarding
**Dependencies:** All core features complete  
**Estimated Time:** 3 hours  
**Prerequisites:** ✅ Submission-ready, extra time available

**Tasks:**
1. **Message Reactions** (1.5 hours):
   - Long-press message → reaction picker
   - Show emoji picker (common reactions: ❤️ 👍 😂 😮 😢 🙏)
   - Store reactions in Firebase: `reactions: {userId: emoji}`
   - Display reactions below message
   - Show count per emoji
   - Tap reaction to see who reacted
   - Real-time updates

2. **Message Forwarding** (1 hour):
   - Long-press message → "Forward" option
   - Show chat selector
   - Select target chat(s)
   - Confirm forward
   - Send to selected chats
   - Show "Forwarded" indicator

3. **Copy Message** (30 min):
   - Long-press → "Copy" option
   - Copy text to clipboard
   - Show toast confirmation

**Validation:**
- [ ] Reactions work smoothly
- [ ] Forwarding functional
- [ ] Copy works
- [ ] No performance impact

---

### Bonus Block 2: Advanced Search (+2 points)

#### PR-064: Message Search
**Dependencies:** All core features complete  
**Estimated Time:** 2 hours  
**Prerequisites:** ✅ Submission-ready, extra time available

**Tasks:**
1. **Search UI** (30 min):
   - Add search icon to chat list header
   - Search input screen
   - Show results grouped by chat
   - Highlight matching text

2. **Search Implementation** (1 hour):
   - Search local database (SQLite FTS if possible)
   - Query: `SELECT * FROM messages WHERE content LIKE '%query%'`
   - Order by relevance/recency
   - Fast results (<1s)

3. **Filters** (30 min):
   - Filter by chat
   - Filter by sender
   - Filter by date range
   - Filter by media type

**Validation:**
- [ ] Search fast (<1s)
- [ ] Results accurate
- [ ] Filters work
- [ ] Highlights text

---

### Bonus Block 3: Voice Messages (+3 points)

#### PR-065: Voice Messages with AI Transcription
**Dependencies:** All core features complete, extra OpenAI budget  
**Estimated Time:** 4 hours  
**Prerequisites:** ✅ Submission-ready, extra time available

**Tasks:**
1. **Voice Recording** (1.5 hours):
   - Add microphone button to message input
   - Record audio using Expo AV
   - Show waveform visualization (simple bars)
   - Max duration: 60 seconds
   - Cancel/send options
   - Upload to Firebase Storage

2. **Voice Playback** (1 hour):
   - Play button in message bubble
   - Show duration
   - Progress bar
   - Pause/resume

3. **AI Transcription** (1.5 hours):
   - Use OpenAI Whisper API for transcription
   - Function: `transcribeAudio(audioUrl)` → Promise<string>
   - Display transcription below audio player
   - "Show Transcript" toggle
   - Translate transcript if different language
   - Cache transcriptions

**Validation:**
- [ ] Recording works smoothly
- [ ] Playback functional
- [ ] Transcription accurate (>90%)
- [ ] Translation of transcripts works
- [ ] Waveform displays nicely

---

## Summary of Parallel Work Opportunities

### Maximum Parallelization Points

**Phase 1 (Hours 0-8):**
- **Agent 1:** PR-040 (Bug Fixes) - 3 hours
- **Agent 2:** PR-041 (Image Captions) - 2 hours (starts parallel)
- **Agent 3:** PR-042 (AI Setup) - 3 hours (starts after 040/041)
- **Total wall time:** ~5 hours with 2 agents, ~3 hours with 3 agents

**Phase 2A (Hours 8-24):**
- **Agent 1:** PR-043 (Language Detection) → PR-044 (Inline Translation) - 7 hours sequential
- **Agent 2:** PR-045 (Cultural Context) - 4 hours parallel with 043
- **Agent 3:** PR-046 (Formality) - 3 hours parallel with 044
- **Total wall time:** ~7 hours with proper sequencing

**Phase 2B (Hours 24-32):**
- **Agent 1:** PR-047 (Slang) - 3 hours
- **Agent 2:** PR-048 (Smart Replies) - 6 hours (can start after basic features)
- **Total wall time:** ~6 hours overlapped

**Phase 2C (Hours 32-40):**
- **Agent 1:** PR-049 (AI Integration) - 3 hours
- **Total wall time:** ~3 hours

**Phase 3 (Hours 40-60):**
- **Agent 1:** PR-050 (Typing) - 3 hours
- **Agent 2:** PR-051 (Profile Pictures) - 3 hours parallel
- **Agent 3:** PR-052 (Background Notifications) - 2 hours parallel
- **Agent 4:** PR-053 (Performance) - 4 hours (starts after others)
- **Agent 5:** PR-054 (UI Polish) - 3 hours parallel with 053
- **Total wall time:** ~7 hours with good parallelization

**Phase 4 (Hours 60-72):**
- **Agent 1:** PR-055 (AI Integration Tests) - 3 hours
- **Agent 2:** PR-056 (E2E Tests) - 4 hours parallel
- **Agent 3:** PR-057 (Bug Fixes) - 4 hours (starts after tests complete)
- **Total wall time:** ~8 hours

**Phase 5 (Hours 72-84):**
- **Agent 1:** PR-058 (Architecture Docs) - 3 hours
- **Agent 2:** PR-059 (README) - 2 hours (partial parallel)
- **Agent 3:** PR-060 (Demo Prep) - 2 hours parallel
- **Agent 4:** PR-061 (Demo Recording) - 4 hours (sequential after 060)
- **Agent 5:** PR-062 (Final Prep) - 3 hours (sequential after 061)
- **Total wall time:** ~9 hours with recording dependencies

---

## Critical Path Analysis

### Absolute Critical Path (Cannot be Parallelized)
1. **PR-040** (Bug Fixes) → Must be stable first
2. **PR-042** (AI Setup) → Foundation for all AI
3. **PR-043** (Language Detection) → Required for other AI features
4. **PR-048** (Smart Replies) → Most complex, depends on other AI
5. **PR-057** (Bug Fixes) → After testing reveals issues
6. **PR-061** (Demo Recording) → Must be last when all works
7. **PR-062** (Final Submission) → Absolute last

**Critical path total:** ~25 hours of sequential work

**With parallelization:** Can complete in ~50-60 hours wall time

---

## Dependency Visualization

```
Phase 1: Foundation
├─ PR-040 (Bugs) ──────┐
├─ PR-041 (Captions) ──┤
└─ PR-042 (AI Setup) ──┴─→ Phase 2

Phase 2: AI Features
├─ PR-043 (Lang Detect) ─→ PR-044 (Translation) ────┐
├─ PR-045 (Cultural) ────────────────────────────────┤
├─ PR-046 (Formality) ───────────────────────────────┤
├─ PR-047 (Slang) ───────────────────────────────────┤
└─ PR-048 (Smart Replies) ◄──────────────────────────┴─→ Phase 3
   PR-049 (AI Integration) ────────────────────────────→ Phase 3

Phase 3: Required Features
├─ PR-050 (Typing) ──────┐
├─ PR-051 (Profile Pics) ┤
├─ PR-052 (Notifications)├─→ Phase 4
├─ PR-053 (Performance) ─┤
└─ PR-054 (UI Polish) ───┘

Phase 4: Testing
├─ PR-055 (AI Tests) ────┐
├─ PR-056 (E2E Tests) ───┴─→ PR-057 (Bug Fixes) ─→ Phase 5
└─────────────────────────────────────────────────→ Phase 5

Phase 5: Documentation & Demo
├─ PR-058 (Architecture) ┐
├─ PR-059 (README) ──────┤
└─ PR-060 (Demo Prep) ───┴─→ PR-061 (Recording) ─→ PR-062 (Submission)
```

---

## Risk Mitigation by Phase

### Phase 1 Risks
- **Risk:** Bugs take longer than expected
- **Mitigation:** Strict 3-hour timebox, defer non-critical bugs

### Phase 2 Risks
- **Risk:** AI features don't work well enough
- **Mitigation:** Start with simplest features first, iterate prompts quickly
- **Risk:** Smart replies too slow or inaccurate
- **Mitigation:** Start early (after basic AI works), budget 6 hours

### Phase 3 Risks
- **Risk:** Performance optimization takes too long
- **Mitigation:** Focus on most impactful optimizations only
- **Risk:** Running out of time for polish
- **Mitigation:** Polish is nice-to-have, prioritize functionality

### Phase 4 Risks
- **Risk:** Tests reveal critical bugs late
- **Mitigation:** Test continuously throughout, don't wait for Phase 4

### Phase 5 Risks
- **Risk:** Demo recording takes multiple attempts
- **Mitigation:** Practice extensively, start recording early
- **Risk:** Documentation takes longer than expected
- **Mitigation:** Document as you build, Phase 5 is just polishing

---

## Hour-by-Hour Recommended Schedule

| Hour | Task | Agent(s) | Priority |
|------|------|----------|----------|
| 0-3 | PR-040 Bug Fixes | 1 | P0 |
| 2-4 | PR-041 Image Captions | 2 | P0 |
| 4-7 | PR-042 AI Setup | 1 | P0 |
| 8-12 | PR-043 Language Detection | 1 | P0 |
| 8-12 | PR-045 Cultural Context | 2 | P0 |
| 12-15 | PR-044 Inline Translation | 1 | P0 |
| 12-15 | PR-046 Formality | 2 | P0 |
| 15-18 | PR-047 Slang | 1 | P0 |
| 18-24 | PR-048 Smart Replies | 2 | P0 |
| 24-27 | PR-049 AI Integration | 1 | P0 |
| 27-30 | PR-050 Typing Indicators | 1 | P1 |
| 27-30 | PR-051 Profile Pictures | 2 | P1 |
| 30-32 | PR-052 Notifications | 3 | P1 |
| 32-36 | PR-053 Performance | 1 | P1 |
| 36-39 | PR-054 UI Polish | 2 | P1 |
| 40-43 | PR-055 AI Tests | 1 | P1 |
| 40-44 | PR-056 E2E Tests | 2 | P1 |
| 44-48 | PR-057 Bug Fixes | 1,2 | P0 |
| 48-51 | PR-058 Architecture Docs | 1 | P1 |
| 51-53 | PR-059 README | 2 | P1 |
| 51-53 | PR-060 Demo Prep | 3 | P0 |
| 53-57 | PR-061 Demo Recording | 3 | P0 |
| 57-60 | PR-062 Final Prep | All | P0 |
| 60-84 | Buffer / Stretch Goals | All | P2 |

**Note:** This assumes work is front-loaded. Real schedule should adapt to progress.

---

## Success Criteria by Phase

### Phase 1 Success (Hour 8)
- [ ] All MVP bugs fixed
- [ ] Image captions working
- [ ] AI foundation set up
- [ ] Can make test AI call
- [ ] Ready to build AI features

### Phase 2 Success (Hour 40)
- [ ] All 5 required AI features working
- [ ] Smart replies generating reasonable suggestions
- [ ] Response times acceptable (<5s for most)
- [ ] No critical bugs in AI features
- [ ] Ready for required features

### Phase 3 Success (Hour 60)
- [ ] Typing indicators working
- [ ] Profile pictures displaying
- [ ] Background notifications working
- [ ] Performance acceptable
- [ ] UI polished
- [ ] Ready for testing

### Phase 4 Success (Hour 72)
- [ ] All tests passing
- [ ] No critical bugs remaining
- [ ] Performance meets rubric minimums
- [ ] App stable and reliable
- [ ] Ready for demo

### Phase 5 Success (Hour 84)
- [ ] Documentation complete
- [ ] Demo video finished and uploaded
- [ ] All submission materials ready
- [ ] Submission form completed
- [ ] Expected score: 90+

---

## Emergency Contingency Plans

### If Behind Schedule at Hour 40
- **Cut:** Formality adjustment (4 of 5 AI features minimum)
- **Focus:** Language detection, translation, cultural hints, slang, smart replies
- **Risk:** Lose 3-5 points, still can get 85+

### If Behind Schedule at Hour 60
- **Cut:** UI polish, some performance optimization
- **Focus:** All AI features, typing, profile pictures, core functionality
- **Risk:** Lose 2-3 points on performance/UX, still can get 87+

### If Behind Schedule at Hour 72
- **Cut:** Advanced testing, stretch goals
- **Focus:** Demo video preparation (critical)
- **Risk:** Some bugs may remain, but demo is pass/fail

### If AI Features Not Working Well
- **Fallback:** Simplify prompts, reduce complexity
- **Example:** Smart replies → simpler suggestions without full style matching
- **Goal:** Working > Perfect

### If Demo Recording Fails
- **Fallback:** Record sections separately, stitch together
- **Alternative:** Screen recording with voiceover added later
- **Last resort:** Extend deadline slightly if possible (ask instructors)

---

## Final Submission Checklist (Hour 84)

### Required Deliverables
- [ ] **GitHub Repository** with:
  - [ ] Complete source code
  - [ ] README.md
  - [ ] Architecture documentation
  - [ ] .env.example
  - [ ] Clean commit history
  
- [ ] **Demo Video** (5-7 min):
  - [ ] All rubric requirements shown
  - [ ] High quality
  - [ ] Shareable link
  
- [ ] **Deployed Application**:
  - [ ] Firebase backend live
  - [ ] App accessible via Expo Go
  - [ ] Test accounts provided
  
- [ ] **Social Media Post** (via submission form):
  - [ ] Description (2-3 sentences)
  - [ ] Key features
  - [ ] Demo link
  - [ ] GitHub link
  - [ ] @GauntletAI tagged

### Scoring Self-Assessment
- Core Messaging: __/35 (target: 33+)
- Mobile Quality: __/20 (target: 18+)
- AI Features: __/30 (target: 27+)
- Technical: __/10 (target: 9+)
- Documentation: __/5 (target: 5)
- **Total: __/100**
- **Goal: 90+**

---

**Task List Status:** Ready for Parallel Execution  
**Next Action:** Begin PR-040 (Fix MVP Critical Bugs)  
**Expected Completion:** 60 hours wall time with 3-5 parallel agents  
**Target Grade:** A (90-100 points)  
**Critical Success Factor:** AI features quality and demo video