/**
 * Translation Service
 * Translates text between languages using OpenAI with caching and request deduplication
 */

import { callCompletion, isInitialized } from './ai-client';
import type { LanguageCode, TranslationResult, CacheEntry } from './types';
import { logAIError, parseAIError } from './error-handler';
import { createDeduplicator } from './request-batcher';

/**
 * In-memory cache for translations
 * Key: `${messageId}_${targetLang}` or `${textHash}_${fromLang}_${toLang}`
 */
const translationCache = new Map<string, CacheEntry<string>>();

/**
 * Request deduplicator to prevent duplicate translation requests
 */
const deduplicator = createDeduplicator<string, string>();

/**
 * Cache configuration
 */
const CACHE_CONFIG = {
  maxEntries: 200,
  ttlMs: 24 * 60 * 60 * 1000, // 24 hours (translations rarely change)
};

/**
 * Generate cache key for translation
 */
function getCacheKey(
  text: string,
  fromLang: LanguageCode,
  toLang: LanguageCode,
  messageId?: string
): string {
  if (messageId) {
    return `${messageId}_${toLang}`;
  }
  // Use hash of text for cache key
  const textHash = text.substring(0, 50).toLowerCase().trim();
  return `${textHash}_${fromLang}_${toLang}`;
}

/**
 * Check if cache entry is still valid
 */
function isCacheValid(entry: CacheEntry<string>): boolean {
  const now = Date.now();
  return now - entry.timestamp < entry.ttl;
}

/**
 * Get translation from cache
 */
function getCached(
  text: string,
  fromLang: LanguageCode,
  toLang: LanguageCode,
  messageId?: string
): string | null {
  const key = getCacheKey(text, fromLang, toLang, messageId);
  const entry = translationCache.get(key);

  if (entry && isCacheValid(entry)) {
    return entry.value;
  }

  // Remove expired entry
  if (entry) {
    translationCache.delete(key);
  }

  return null;
}

/**
 * Store translation in cache
 */
function setCached(
  text: string,
  fromLang: LanguageCode,
  toLang: LanguageCode,
  translation: string,
  messageId?: string
): void {
  const key = getCacheKey(text, fromLang, toLang, messageId);

  // Enforce max cache size (LRU-style: delete oldest)
  if (translationCache.size >= CACHE_CONFIG.maxEntries) {
    const firstKey = translationCache.keys().next().value;
    if (firstKey) {
      translationCache.delete(firstKey);
    }
  }

  translationCache.set(key, {
    value: translation,
    timestamp: Date.now(),
    ttl: CACHE_CONFIG.ttlMs,
  });
}

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
 * Translate text from one language to another
 */
export async function translateText(
  text: string,
  fromLang: LanguageCode,
  toLang: LanguageCode,
  messageId?: string
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
    return text;
  }

  // Check cache first
  const cached = getCached(text, fromLang, toLang, messageId);
  if (cached) {
    return cached;
  }

  if (!isInitialized()) {
    console.error('OpenAI client not initialized - cannot translate');
    return text;
  }

  // Use deduplicator to prevent duplicate translation requests
  const dedupKey = getCacheKey(text, fromLang, toLang, messageId);
  return deduplicator.execute(dedupKey, async () => {
    try {
      const fromName = LANGUAGE_NAMES[fromLang] || fromLang;
      const toName = LANGUAGE_NAMES[toLang] || toLang;

      const response = await callCompletion([
        {
          role: 'system',
          content: `You are a professional translator. Translate text from ${fromName} to ${toName}. Preserve:
- Line breaks and formatting
- Emojis (keep unchanged)
- Tone and style
- Special characters

Respond with ONLY the translated text, nothing else.`,
        },
        {
          role: 'user',
          content: text,
        },
      ], {
        maxTokens: Math.max(500, Math.ceil(text.length * 2)), // Allow room for expansion
        temperature: 0.3, // Low but not zero for natural translations
      });

      const translation = response.trim();

      // Cache the result
      setCached(text, fromLang, toLang, translation, messageId);

      return translation;
    } catch (error) {
      const aiError = parseAIError(error);
      logAIError(aiError, `Translation ${fromLang} → ${toLang}`);
      // Return original text on error (graceful fallback)
      return text;
    }
  });
}

/**
 * Translate with full result details
 */
export async function translate(
  text: string,
  fromLang: LanguageCode,
  toLang: LanguageCode,
  messageId?: string
): Promise<TranslationResult> {
  const translatedText = await translateText(text, fromLang, toLang, messageId);

  return {
    originalText: text,
    translatedText,
    sourceLanguage: fromLang,
    targetLanguage: toLang,
    confidence: translatedText !== text ? 0.95 : 1.0,
  };
}

/**
 * Clear the translation cache (useful for testing)
 */
export function clearCache(): void {
  translationCache.clear();
}

/**
 * Get cache statistics (for monitoring)
 */
export function getCacheStats() {
  return {
    size: translationCache.size,
    maxSize: CACHE_CONFIG.maxEntries,
    ttlMs: CACHE_CONFIG.ttlMs,
  };
}

/**
 * Invalidate cache for a specific message
 */
export function invalidateMessageCache(messageId: string): void {
  // Remove all cache entries for this message
  for (const key of translationCache.keys()) {
    if (key.startsWith(messageId + '_')) {
      translationCache.delete(key);
    }
  }
}

/**
 * Translate message on-demand (for user-triggered translation)
 * Uses the translation agent for enhanced formatting preservation
 */
export async function translateMessageOnDemand(
  text: string,
  fromLang: LanguageCode,
  toLang: LanguageCode,
  messageId?: string
): Promise<string> {
  // Reuse the existing translateText function which already has caching
  return translateText(text, fromLang, toLang, messageId);
}

/**
 * Check if translation is available in cache
 */
export function hasTranslationInCache(
  text: string,
  fromLang: LanguageCode,
  toLang: LanguageCode,
  messageId?: string
): boolean {
  const cached = getCached(text, fromLang, toLang, messageId);
  return cached !== null;
}

/**
 * Translate text and optionally detect slang/idioms
 * Used for auto-translation when receiving messages
 *
 * @param text - Text to translate
 * @param fromLang - Source language
 * @param toLang - Target language
 * @param messageId - ID of the message
 * @param detectSlang - Whether to also detect slang in the original text
 * @param userPreferredLanguage - User's preferred language for slang explanations
 * @returns Object with translated text and optional slang items
 */
export async function translateWithSlangDetection(
  text: string,
  fromLang: LanguageCode,
  toLang: LanguageCode,
  messageId: string,
  detectSlang: boolean,
  userPreferredLanguage: LanguageCode = 'en'
): Promise<{ translatedText: string; slangItems?: import('./types').SlangItem[] }> {
  // First translate the text
  const translatedText = await translateText(text, fromLang, toLang, messageId);

  // If slang detection is disabled, return just the translation
  if (!detectSlang) {
    return { translatedText };
  }

  // Detect slang in the ORIGINAL text (not translation)
  // We detect in original because that's where slang actually appears
  try {
    const { detectSlangIdioms } = await import('./agents/slang-idiom-agent');
    const slangItems = await detectSlangIdioms(
      text,
      fromLang,
      messageId,
      userPreferredLanguage
    );

    // Save slang items if any were found
    if (slangItems.length > 0) {
      const { saveSlangItems } = await import('../slang-glossary.service');
      await saveSlangItems(slangItems);
    }

    return { translatedText, slangItems };
  } catch (error) {
    const aiError = parseAIError(error);
    logAIError(aiError, 'Slang Detection during Translation');
    // Return translation even if slang detection fails (graceful fallback)
    return { translatedText };
  }
}
