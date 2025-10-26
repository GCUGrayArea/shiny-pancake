# PR-044: Real-Time Inline Translation - Testing Guide

## Fixed Issue
**RESOLVED**: Duplicate render blocks in MessageBubble.tsx were preventing long-press from working.
- Removed duplicate return statement
- Long-press context menu now properly attached to message bubbles

## How to Test

### 1. Long-Press Context Menu
1. Open any conversation with text messages
2. **Long-press (hold for ~500ms) on any text message**
3. You should see a context menu appear with options:
   - "Translate to EN" (or your preferred language)
   - "Translate to..."
   - "Copy"

### 2. Translate to Preferred Language
1. Long-press a message
2. Tap "Translate to EN" (or your preferred language)
3. The message should show:
   - A loading spinner while translating
   - Language badge with flags (e.g., "🇪🇸 ES → 🇺🇸 EN")
   - The translated text
   - A toggle button to "Show Original" / "Show Translation"

### 3. Translate to Custom Language
1. Long-press a message
2. Tap "Translate to..."
3. Language picker modal should appear with:
   - Search bar at top
   - List of 16 languages with flags and native names
   - Selected language highlighted
4. Select a language
5. Translation should appear with the selected target language

### 4. Toggle Between Original and Translation
1. After translating a message, tap the "Show Original" button
2. The original message text should appear
3. Tap "Show Translation" to see the translated text again

### 5. Translation Caching
1. Translate a message to a specific language
2. Long-press the same message and translate to the same language again
3. Translation should appear instantly (retrieved from cache)

### 6. Error Handling
1. Turn off WiFi/data
2. Long-press a message and try to translate
3. Should show error message: "Translation failed. Please try again."

## Expected Behavior

### Visual Indicators
- **Language Badge**: Shows source and target language with flag emojis
  - Example: "🇪🇸 ES → 🇺🇸 EN"
- **Loading State**: Spinner with "Translating..." text
- **Error State**: ⚠️ icon with error message
- **Toggle Button**: Underlined text to switch between original/translated

### Performance
- First translation: ~1-3 seconds (depending on OpenAI API response)
- Cached translations: Instant
- Context menu: Appears within 500ms of long-press

## Troubleshooting

### Context Menu Not Appearing
- Make sure you're long-pressing on a **text message** (not images)
- Hold for at least 500ms
- Try on different messages

### Translation Not Working
- Check that OpenAI API key is configured in environment
- Check console logs for error messages
- Verify AI client is initialized (check PR-042 setup)

### Preferred Language Not Set
- Default is English (EN)
- To set preferred language: Will be available in AI Settings (PR-049)
- For testing, modify `preferredLanguage` prop passed to MessageBubble

## Integration with Auto-Translation (PR-043)
- On-demand translation works alongside auto-translation
- On-demand translation takes precedence when active
- Both use the same caching mechanism
- Both store in the same database fields

## Files Modified
- ✅ `MessageBubble.tsx` - Added Pressable wrapper and context menu integration
- ✅ `translation.service.ts` - Extended with on-demand functions
- ✅ Fixed duplicate render blocks issue

## Next Steps After Testing
If everything works:
1. Test on physical device for best experience
2. Verify translations work for multiple languages
3. Check memory usage with multiple translations
4. Confirm caching reduces API calls
