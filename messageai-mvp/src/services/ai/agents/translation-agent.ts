/**
 * Translation Agent
 * Handles on-demand message translation with formatting preservation
 * Uses OpenAI for natural, fluent translations
 */

import { callCompletion, isInitialized } from '../ai-client';
import type { LanguageCode } from '../types';

/**
 * Language name mapping for better prompts
 */
const LANGUAGE_NAMES: Record<LanguageCode, string> = {
  en: 'English',
  es: 'Spanish',
  fr: 'French',
  de: 'German',
  it: 'Italian',
  pt: 'Portuguese',
  ru: 'Russian',
  zh: 'Chinese',
  ja: 'Japanese',
  ko: 'Korean',
  ar: 'Arabic',
  hi: 'Hindi',
  nl: 'Dutch',
  pl: 'Polish',
  sv: 'Swedish',
  tr: 'Turkish',
  unknown: 'Unknown',
};

/**
 * Translate message with formatting preservation
 *
 * @param text - Text to translate
 * @param fromLang - Source language code
 * @param toLang - Target language code
 * @returns Translated text with preserved formatting
 */
export async function translateMessage(
  text: string,
  fromLang: LanguageCode,
  toLang: LanguageCode
): Promise<string> {
  // Handle empty text
  if (!text || text.trim().length === 0) {
    return text;
  }

  // No translation needed if same language
  if (fromLang === toLang) {
    return text;
  }

  // Can't translate from/to unknown
  if (fromLang === 'unknown' || toLang === 'unknown') {
    throw new Error('Cannot translate from or to unknown language');
  }

  if (!isInitialized()) {
    throw new Error('OpenAI client not initialized');
  }

  try {
    const fromName = LANGUAGE_NAMES[fromLang] || fromLang;
    const toName = LANGUAGE_NAMES[toLang] || toLang;

    const response = await callCompletion([
      {
        role: 'system',
        content: `You are a professional translator. Translate text from ${fromName} to ${toName}.

IMPORTANT: Preserve the following in your translation:
- Line breaks (\\n) - keep them exactly as they appear
- Bullet points and lists
- Emojis - keep unchanged
- Markdown formatting (bold, italic, etc.)
- Special characters
- Tone and formality level
- Natural, fluent expression in the target language

Respond with ONLY the translated text. Do not add any explanations, notes, or preambles.`,
      },
      {
        role: 'user',
        content: text,
      },
    ], {
      maxTokens: Math.max(500, Math.ceil(text.length * 2.5)), // Allow room for expansion
      temperature: 0.3, // Low but not zero for natural translations
    });

    const translation = response.trim();

    // Basic validation - ensure we got a translation
    if (!translation || translation.length === 0) {
      throw new Error('Empty translation received');
    }

    return translation;
  } catch (error) {
    if (error instanceof Error) {
      // Re-throw with more context
      throw new Error(`Translation failed: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Check if a language pair is supported for translation
 */
export function isLanguagePairSupported(
  fromLang: LanguageCode,
  toLang: LanguageCode
): boolean {
  // All non-unknown languages are supported
  return fromLang !== 'unknown' && toLang !== 'unknown' && fromLang !== toLang;
}

/**
 * Get display name for a language code
 */
export function getLanguageName(code: LanguageCode): string {
  return LANGUAGE_NAMES[code] || code.toUpperCase();
}
