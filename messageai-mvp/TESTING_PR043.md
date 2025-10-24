# PR-043: Language Detection & Auto-Translate - Testing Guide

## Prerequisites

### 1. Set Up OpenAI API Key
1. Get an API key from https://platform.openai.com/api-keys
2. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
3. Edit `.env` and add your OpenAI API key:
   ```
   EXPO_PUBLIC_OPENAI_API_KEY=sk-your-actual-key-here
   ```

### 2. Restart the Development Server
After adding the API key, restart the Expo development server:
```bash
npm start
```

**Note:** The `.env` file is already in `.gitignore` and will NOT be committed.

## Features to Test

### Feature 1: AI Settings Screen Navigation
**Expected:** Access AI Settings from the chat list

1. Open the app
2. Navigate to the Chat List screen
3. **Look for robot icon (🤖) in the top-right header**
4. Tap the robot icon
5. ✅ Should navigate to "AI Settings" screen

### Feature 2: Auto-Translate Toggle
**Expected:** Enable/disable auto-translation

1. In AI Settings screen:
2. See "Auto-translate Messages" toggle
3. Toggle it ON
4. ✅ Toggle should turn blue/active
5. ✅ Setting should save immediately (you'll see brief "Saving..." indicator)
6. Close and reopen AI Settings
7. ✅ Toggle should still be ON (persisted)

### Feature 3: Language Selection
**Expected:** Choose preferred language for translations

1. In AI Settings screen with auto-translate ON:
2. See "Preferred Language" section
3. Tap the language button (shows current language, e.g., "English")
4. ✅ Menu should appear with 16+ language options
5. Select a different language (e.g., "Spanish (Español)")
6. ✅ Menu should close
7. ✅ Selected language should display on button
8. ✅ Setting should save automatically

### Feature 4: Auto-Translation on Receive
**Expected:** Messages in other languages get auto-translated

**Setup:** Need 2 test accounts
- Account A: Your primary account (auto-translate enabled, preferred language: English)
- Account B: Another account to send messages from

**Test Steps:**
1. **On Account A:**
   - Enable auto-translate in AI Settings
   - Set preferred language to "English"

2. **On Account B:**
   - Send a message in Spanish to Account A, e.g.:
     ```
     "Hola, ¿cómo estás? Espero que tengas un buen día."
     ```

3. **On Account A:**
   - Open the conversation
   - ✅ Message should display in English (translated)
   - ✅ Should show indicator: "Translated from ES"
   - ✅ Should show "Show Original" button

### Feature 5: Show Original Toggle
**Expected:** Toggle between translated and original text

1. In a conversation with a translated message:
2. See "Show Original" button below the translated text
3. Tap "Show Original"
4. ✅ Message should switch to original text (e.g., Spanish)
5. ✅ Button should change to "Show Translation"
6. ✅ Indicator should change to "Original (ES)"
7. Tap "Show Translation" again
8. ✅ Should switch back to translated text

### Feature 6: Translation Caching
**Expected:** Same message doesn't get re-translated (saves API calls)

1. View a translated message
2. Toggle "Show Original" and back to translation multiple times
3. ✅ Translation should appear instantly (cached)
4. Close and reopen the conversation
5. ✅ Translation should still be there (persisted in database)

**Verify in logs:**
- Check console for "Translation processing error" - should NOT appear for cached translations
- First translation will hit the API, subsequent views use cache

### Feature 7: Own Messages Not Translated
**Expected:** Your own messages should NOT be auto-translated

1. With auto-translate enabled
2. Send a message in a different language than your preferred language
3. ✅ Your message should appear in original language (not translated)
4. ✅ Should NOT show "Translated from..." indicator

### Feature 8: Multiple Languages
**Expected:** System supports 16+ languages

**Test with these sample messages:**

| Language | Sample Message | Expected Translation (to English) |
|----------|---------------|-----------------------------------|
| Spanish | "Buenos días" | "Good morning" |
| French | "Bonjour, comment allez-vous?" | "Hello, how are you?" |
| German | "Guten Tag" | "Good day" |
| Chinese | "你好" | "Hello" |
| Japanese | "こんにちは" | "Hello" |
| Arabic | "مرحبا" | "Hello" |

### Feature 9: Settings Persistence
**Expected:** Settings survive app restart

1. Enable auto-translate and set preferred language to "French"
2. Close the app completely (force quit)
3. Reopen the app
4. Navigate to AI Settings
5. ✅ Auto-translate should still be ON
6. ✅ Preferred language should still be "French"

### Feature 10: Database Migration
**Expected:** Existing users can upgrade without data loss

1. **If you have existing chats from before PR-043:**
2. Start the app (migrations run automatically)
3. Check console for migration warnings (should be none)
4. ✅ All existing chats should still be visible
5. ✅ All existing messages should still be readable
6. ✅ No data loss

## Edge Cases to Test

### Edge Case 1: No API Key
**Expected:** Graceful degradation

1. Remove or invalidate the EXPO_PUBLIC_OPENAI_API_KEY in `.env`
2. Restart the app
3. ✅ App should start normally
4. ✅ Console should show: "⚠️ OpenAI API key not found. AI features will be disabled."
5. Enable auto-translate and send a message
6. ✅ Message should appear in original language (translation fails silently)

### Edge Case 2: Network Errors
**Expected:** Graceful error handling

1. Enable airplane mode
2. Receive a message that would be translated
3. ✅ Message should appear in original language
4. ✅ No app crash
5. Disable airplane mode
6. ✅ Message remains visible (not lost)

### Edge Case 3: Very Long Message
**Expected:** Translation works for long text

1. Send a message with 500+ characters in another language
2. ✅ Should translate successfully
3. ✅ Should display fully in the UI
4. ✅ "Show Original" toggle should work

### Edge Case 4: Same Language
**Expected:** No translation if message is already in preferred language

1. Set preferred language to "English"
2. Receive an English message
3. ✅ Should detect as English
4. ✅ Should NOT translate (no "Translated from..." indicator)
5. ✅ Message displays normally

### Edge Case 5: Unknown/Mixed Language
**Expected:** Graceful handling of unclear language

1. Send a message with mixed languages or gibberish
2. ✅ Should attempt detection (may return 'unknown')
3. ✅ Should NOT crash
4. ✅ Message displays in original form if translation fails

## Performance Checks

### Response Time
**Expected:** Translations complete in <3 seconds (preferably <2s)

1. Enable auto-translate
2. Receive a message in another language
3. ✅ Time from message receive to translated display: <3 seconds
4. ✅ Preferably <2 seconds (Excellent tier per PRD)

### Cache Performance
**Expected:** Cached translations are instant

1. View a translated message
2. Navigate away and back
3. ✅ Translation should appear instantly (<100ms)

### UI Responsiveness
**Expected:** No UI jank or freezing

1. While translation is in progress
2. ✅ UI should remain responsive (can scroll, tap other messages)
3. ✅ No freezing or lag

## Unit Tests

Run the test suite:
```bash
npm test -- language-detection.service.test.ts
npm test -- translation.service.test.ts
```

**Expected Results:**
- ✅ 17/17 tests pass for language-detection.service.test.ts
- ✅ 19/19 tests pass for translation.service.test.ts

## Known Limitations

1. **API Cost:** Each translation costs a small amount via OpenAI API
2. **Cache TTL:** Translations cached for 24 hours, then may need re-translation
3. **Offline:** Auto-translate requires internet connection (no offline translation)
4. **Image Captions:** Currently only text messages are auto-translated (not image captions)

## Checklist Before Commit

- [ ] .env file contains valid OpenAI API key
- [ ] .env is confirmed in .gitignore
- [ ] All unit tests pass (36/36)
- [ ] AI Settings screen is accessible via robot icon
- [ ] Can enable/disable auto-translate
- [ ] Can select preferred language
- [ ] Messages auto-translate when enabled
- [ ] "Show Original" toggle works
- [ ] Settings persist across app restart
- [ ] No console errors during normal operation
- [ ] Translation response time <3s
- [ ] App gracefully handles missing API key
- [ ] Existing chats and messages still work

## Troubleshooting

### "OpenAI client not initialized" error
- Ensure EXPO_PUBLIC_OPENAI_API_KEY is set in `.env`
- Restart the development server after adding the key
- Check console on app startup for "✅ OpenAI client initialized"

### Translations not working
- Check if auto-translate is enabled in AI Settings
- Verify preferred language is set
- Check network connection
- Look for errors in console logs

### Settings not persisting
- Check Firebase connection is working
- Verify user is authenticated
- Check console for Firebase update errors

### Can't access AI Settings
- Verify navigation was added correctly
- Check for robot icon in Chat List header
- Look for TypeScript errors in navigation types
