/**
 * Language Detection Service
 * Detects the language of text using OpenAI with caching
 */

import { callCompletion, isInitialized } from './ai-client';
import type { LanguageCode, LanguageDetectionResult, CacheEntry } from './types';

/**
 * In-memory cache for language detections
 * Key: hash of text (first 50 chars)
 * Value: CacheEntry with language and timestamp
 */
const detectionCache = new Map<string, CacheEntry<LanguageCode>>();

/**
 * Cache configuration
 */
const CACHE_CONFIG = {
  maxEntries: 100,
  ttlMs: 60 * 60 * 1000, // 1 hour
};

/**
 * Generate cache key from text
 */
function getCacheKey(text: string): string {
  // Use first 50 chars as cache key
  return text.substring(0, 50).toLowerCase().trim();
}

/**
 * Check if cache entry is still valid
 */
function isCacheValid(entry: CacheEntry<LanguageCode>): boolean {
  const now = Date.now();
  return now - entry.timestamp < entry.ttl;
}

/**
 * Get language from cache
 */
function getCached(text: string): LanguageCode | null {
  const key = getCacheKey(text);
  const entry = detectionCache.get(key);

  if (entry && isCacheValid(entry)) {
    return entry.value;
  }

  // Remove expired entry
  if (entry) {
    detectionCache.delete(key);
  }

  return null;
}

/**
 * Store language in cache
 */
function setCached(text: string, language: LanguageCode): void {
  const key = getCacheKey(text);

  // Enforce max cache size (LRU-style: delete oldest)
  if (detectionCache.size >= CACHE_CONFIG.maxEntries) {
    const firstKey = detectionCache.keys().next().value;
    if (firstKey) {
      detectionCache.delete(firstKey);
    }
  }

  detectionCache.set(key, {
    value: language,
    timestamp: Date.now(),
    ttl: CACHE_CONFIG.ttlMs,
  });
}

/**
 * Detect language of text using OpenAI
 */
export async function detectLanguage(text: string): Promise<LanguageCode> {
  // Handle empty or very short text
  if (!text || text.trim().length < 2) {
    return 'unknown';
  }

  // Check cache first
  const cached = getCached(text);
  if (cached) {
    return cached;
  }

  if (!isInitialized()) {
    console.error('OpenAI client not initialized - cannot detect language');
    return 'unknown';
  }

  try {
    const response = await callCompletion([
      {
        role: 'system',
        content: 'You are a language detection expert. Respond with ONLY the ISO 639-1 language code (e.g., "en", "es", "fr"). If uncertain or the text is too short, respond with "unknown".',
      },
      {
        role: 'user',
        content: `Detect the language of this text: "${text}"`,
      },
    ], {
      maxTokens: 10,
      temperature: 0, // Deterministic
    });

    // Extract language code from response
    const langCode = response.trim().toLowerCase() as LanguageCode;

    // Validate it's a known language code
    const validCodes: LanguageCode[] = [
      'en', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'zh', 'ja', 'ko',
      'ar', 'hi', 'nl', 'pl', 'sv', 'tr', 'unknown'
    ];

    const detectedLang = validCodes.includes(langCode) ? langCode : 'unknown';

    // Cache the result
    setCached(text, detectedLang);

    return detectedLang;
  } catch (error) {
    console.error('Language detection error:', error);
    return 'unknown';
  }
}

/**
 * Detect languages for multiple texts in batch
 */
export async function detectMultipleLanguages(
  texts: string[]
): Promise<LanguageCode[]> {
  // Process in parallel with individual caching
  const promises = texts.map(text => detectLanguage(text));
  return Promise.all(promises);
}

/**
 * Detect language with confidence score
 */
export async function detectLanguageWithConfidence(
  text: string
): Promise<LanguageDetectionResult> {
  // Handle empty or very short text
  if (!text || text.trim().length < 2) {
    return { language: 'unknown', confidence: 0 };
  }

  // Check cache first
  const cached = getCached(text);
  if (cached) {
    return { language: cached, confidence: 1.0 }; // Cached = high confidence
  }

  try {
    const response = await callCompletion([
      {
        role: 'system',
        content: 'You are a language detection expert. Respond with a JSON object containing "language" (ISO 639-1 code) and "confidence" (0-1 score). Example: {"language":"en","confidence":0.95}',
      },
      {
        role: 'user',
        content: `Detect the language of this text: "${text}"`,
      },
    ], {
      maxTokens: 50,
      temperature: 0,
    });

    // Parse JSON response
    const result = JSON.parse(response);
    const language = result.language as LanguageCode;
    const confidence = result.confidence || 0;

    // Only cache high-confidence results
    if (confidence >= 0.8) {
      setCached(text, language);
    }

    return { language, confidence };
  } catch (error) {
    console.error('Language detection error:', error);
    return { language: 'unknown', confidence: 0 };
  }
}

/**
 * Clear the detection cache (useful for testing)
 */
export function clearCache(): void {
  detectionCache.clear();
}

/**
 * Get cache statistics (for monitoring)
 */
export function getCacheStats() {
  return {
    size: detectionCache.size,
    maxSize: CACHE_CONFIG.maxEntries,
    ttlMs: CACHE_CONFIG.ttlMs,
  };
}
