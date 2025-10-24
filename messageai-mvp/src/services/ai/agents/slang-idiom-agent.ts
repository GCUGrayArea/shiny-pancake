/**
 * Slang & Idiom Agent
 * Detects and explains slang, idioms, and colloquial expressions in messages
 */

import { callCompletion } from '../ai-client';
import { SlangItem, SlangCategory, LanguageCode } from '../types';

/**
 * Generate a unique ID for React Native
 * Uses timestamp + random number for uniqueness
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Get human-readable language name from language code
 */
function getLanguageName(code: LanguageCode): string {
  const names: Record<LanguageCode, string> = {
    'en': 'English',
    'es': 'Spanish',
    'fr': 'French',
    'de': 'German',
    'it': 'Italian',
    'pt': 'Portuguese',
    'ru': 'Russian',
    'zh': 'Chinese',
    'ja': 'Japanese',
    'ko': 'Korean',
    'ar': 'Arabic',
    'hi': 'Hindi',
    'nl': 'Dutch',
    'pl': 'Polish',
    'sv': 'Swedish',
    'tr': 'Turkish',
    'unknown': 'English',
  };
  return names[code] || 'English';
}

/**
 * System prompt for slang and idiom detection
 */
const SLANG_IDIOM_SYSTEM_PROMPT = `You are a language expert who helps people understand slang, idioms, and colloquial expressions.

Your task is to identify informal language that might not be obvious to non-native speakers or people from different regions. Focus on:

1. **Slang**: Informal vocabulary (e.g., "sick" meaning "cool/awesome")
2. **Idioms**: Figurative expressions (e.g., "break the ice", "spill the beans")
3. **Colloquialisms**: Regional phrases (e.g., "y'all", "mate", "cheers")
4. **Internet Slang**: Online abbreviations and terms (e.g., "LOL", "FOMO", "ghosting")

IMPORTANT GUIDELINES:
- Only flag expressions that would genuinely need explanation for learners
- Skip universal/well-known terms (e.g., "okay", "hello", "thanks")
- Consider the language and regional context
- Provide clear, educational explanations
- Include both literal and actual meanings
- Be culturally sensitive and respectful

If you identify slang or idioms, respond with a JSON array of objects with this structure:
{
  "phrase": "the exact expression from the message",
  "literal": "word-for-word translation or literal interpretation",
  "actual": "what it actually means in simple terms",
  "usage": "example sentence showing proper usage",
  "formality": "when to use or avoid (e.g., 'Informal, avoid in professional settings')",
  "category": "slang|idiom|colloquialism|internet-slang",
  "regions": ["US", "UK"] (optional: where it's commonly used),
  "startIndex": number (position in text where phrase starts),
  "endIndex": number (position in text where phrase ends)
}

If no significant slang or idioms are found, respond with an empty array: []`;

/**
 * Detected slang/idiom from AI (before full SlangItem creation)
 */
interface DetectedSlang {
  phrase: string;
  literal: string;
  actual: string;
  usage: string;
  formality: string;
  category: SlangCategory;
  regions?: string[];
  startIndex: number;
  endIndex: number;
}

/**
 * Analyze a message for slang, idioms, and colloquial expressions
 *
 * @param messageText - The message text to analyze
 * @param language - The language of the message
 * @param messageId - ID of the message being analyzed
 * @param preferredLanguage - User's preferred language for explanations (optional, defaults to English)
 * @returns Array of slang items
 */
export async function detectSlangIdioms(
  messageText: string,
  language: LanguageCode,
  messageId: string,
  preferredLanguage: LanguageCode = 'en'
): Promise<SlangItem[]> {
  try {
    // Skip if message is too short (unlikely to have complex slang)
    if (messageText.trim().length < 5) {
      return [];
    }

    // Build the analysis prompt
    const explanationLanguage = getLanguageName(preferredLanguage);
    const userPrompt = `Analyze this ${getLanguageName(language)} message for slang, idioms, and colloquial expressions:

"${messageText}"

Identify any informal language, figurative expressions, or regional phrases that might need explanation for a non-native speaker or someone unfamiliar with the dialect.

IMPORTANT: Provide all explanations (literal, actual, usage, formality) in ${explanationLanguage}. The user's preferred language is ${explanationLanguage}, so write your response entirely in that language.`;

    // Call OpenAI for analysis
    const response = await callCompletion(
      [
        { role: 'system', content: SLANG_IDIOM_SYSTEM_PROMPT },
        { role: 'user', content: userPrompt }
      ],
      {
        temperature: 0.3, // Lower temperature for consistent detection
        maxTokens: 1000
      }
    );

    // Parse the response
    const detectedSlang = parseAIResponse(response);

    // Convert detected slang to SlangItems
    const slangItems: SlangItem[] = detectedSlang.map(item => ({
      id: generateId(),
      messageId,
      phrase: item.phrase,
      literal: item.literal,
      actual: item.actual,
      usage: item.usage,
      formality: item.formality,
      category: item.category,
      regions: item.regions,
      language,
      startIndex: item.startIndex,
      endIndex: item.endIndex,
      known: false,
      timestamp: Date.now()
    }));

    return slangItems;
  } catch (error) {
    console.error('Error detecting slang/idioms:', error);
    // Return empty array on error - slang explanations are optional
    return [];
  }
}

/**
 * Parse AI response into detected slang items
 * Handles various response formats from OpenAI
 */
function parseAIResponse(response: string): DetectedSlang[] {
  try {
    // Try to find JSON array in response
    const jsonMatch = response.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.warn('No JSON array found in slang detection response');
      return [];
    }

    const parsed = JSON.parse(jsonMatch[0]);

    // Validate that it's an array
    if (!Array.isArray(parsed)) {
      console.warn('Parsed response is not an array');
      return [];
    }

    // Validate and filter items
    const validItems = parsed.filter(item => {
      return (
        item &&
        typeof item.phrase === 'string' &&
        typeof item.literal === 'string' &&
        typeof item.actual === 'string' &&
        typeof item.usage === 'string' &&
        typeof item.formality === 'string' &&
        typeof item.category === 'string' &&
        typeof item.startIndex === 'number' &&
        typeof item.endIndex === 'number'
      );
    });

    return validItems as DetectedSlang[];
  } catch (error) {
    console.error('Error parsing slang detection response:', error);
    return [];
  }
}
