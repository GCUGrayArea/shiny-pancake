/**
 * Formality Agent
 * Detects and adjusts the formality level of text
 * Helps users adapt their message tone for different cultural contexts
 */

import { callCompletion, isInitialized } from '../ai-client';
import type { LanguageCode } from '../types';

/**
 * Formality levels from very informal to very formal
 */
export type FormalityLevel =
  | 'very-informal'
  | 'informal'
  | 'neutral'
  | 'formal'
  | 'very-formal';

/**
 * Formality detection result with confidence and explanation
 */
export interface FormalityDetectionResult {
  /** Detected formality level */
  level: FormalityLevel;
  /** Confidence score (0-1) */
  confidence: number;
  /** Brief explanation of the rating */
  explanation: string;
}

/**
 * Formality adjustment result
 */
export interface FormalityAdjustmentResult {
  /** Original text */
  originalText: string;
  /** Adjusted text */
  adjustedText: string;
  /** Changes made during adjustment */
  changes: string[];
  /** Source formality level */
  fromLevel: FormalityLevel;
  /** Target formality level */
  toLevel: FormalityLevel;
}

/**
 * Cache for formality detections (by text hash)
 */
const detectionCache = new Map<string, FormalityDetectionResult>();
const CACHE_SIZE = 100;
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

/**
 * Simple hash function for caching
 */
function hashText(text: string): string {
  // Use first 100 chars + length as simple hash key
  return `${text.substring(0, 100)}_${text.length}`;
}

/**
 * Clear expired cache entries
 */
function clearExpiredCache(): void {
  if (detectionCache.size > CACHE_SIZE) {
    // Clear oldest entries (simple FIFO)
    const entries = Array.from(detectionCache.entries());
    entries.slice(0, entries.length - CACHE_SIZE).forEach(([key]) => {
      detectionCache.delete(key);
    });
  }
}

/**
 * Detect the formality level of text
 *
 * @param text - Text to analyze
 * @param language - Language code for cultural context
 * @returns Formality detection result with confidence and explanation
 */
export async function detectFormality(
  text: string,
  language: LanguageCode = 'en'
): Promise<FormalityDetectionResult> {
  // Handle empty text
  if (!text || text.trim().length === 0) {
    return {
      level: 'neutral',
      confidence: 1.0,
      explanation: 'Empty text',
    };
  }

  // Check cache
  const cacheKey = hashText(text + language);
  if (detectionCache.has(cacheKey)) {
    return detectionCache.get(cacheKey)!;
  }

  if (!isInitialized()) {
    throw new Error('OpenAI client not initialized');
  }

  try {
    const culturalNotes = getCulturalNotes(language);

    const response = await callCompletion([
      {
        role: 'system',
        content: `You are a linguistic expert analyzing text formality.

Formality levels:
- very-informal: Slang, abbreviations (lol, brb), minimal punctuation, casual grammar
- informal: Conversational, contractions (can't, won't), friendly tone, some slang
- neutral: Standard grammar, balanced tone, professional but approachable
- formal: Proper grammar, polite markers (please, thank you), no contractions
- very-formal: Academic/legal style, complex vocabulary, elaborate courtesy

${culturalNotes}

Analyze the formality level of the text and respond with ONLY a JSON object in this exact format:
{
  "level": "informal",
  "confidence": 0.85,
  "explanation": "Uses contractions and casual tone"
}

No other text, just the JSON object.`,
      },
      {
        role: 'user',
        content: text,
      },
    ], {
      maxTokens: 150,
      temperature: 0.2, // Low temperature for consistent analysis
    });

    // Parse JSON response
    const result = JSON.parse(response.trim());

    // Validate result
    if (!result.level || !result.confidence || !result.explanation) {
      throw new Error('Invalid detection response format');
    }

    const detectionResult: FormalityDetectionResult = {
      level: result.level as FormalityLevel,
      confidence: Math.max(0, Math.min(1, result.confidence)),
      explanation: result.explanation,
    };

    // Cache the result
    detectionCache.set(cacheKey, detectionResult);
    clearExpiredCache();

    return detectionResult;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Formality detection failed: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Adjust text to a target formality level
 *
 * @param text - Original text to adjust
 * @param targetLevel - Desired formality level
 * @param language - Language code for cultural context
 * @param currentLevel - Current formality level (optional, will detect if not provided)
 * @returns Adjustment result with changes explained
 */
export async function adjustFormality(
  text: string,
  targetLevel: FormalityLevel,
  language: LanguageCode = 'en',
  currentLevel?: FormalityLevel
): Promise<FormalityAdjustmentResult> {
  // Handle empty text
  if (!text || text.trim().length === 0) {
    return {
      originalText: text,
      adjustedText: text,
      changes: [],
      fromLevel: currentLevel || 'neutral',
      toLevel: targetLevel,
    };
  }

  // Detect current level if not provided
  let sourceLevel = currentLevel;
  if (!sourceLevel) {
    const detection = await detectFormality(text, language);
    sourceLevel = detection.level;
  }

  // No adjustment needed if already at target level
  if (sourceLevel === targetLevel) {
    return {
      originalText: text,
      adjustedText: text,
      changes: ['Text is already at target formality level'],
      fromLevel: sourceLevel,
      toLevel: targetLevel,
    };
  }

  if (!isInitialized()) {
    throw new Error('OpenAI client not initialized');
  }

  try {
    const culturalNotes = getCulturalNotes(language);
    const direction = getFormalityDirection(sourceLevel, targetLevel);

    const response = await callCompletion([
      {
        role: 'system',
        content: `You are a linguistic expert helping users adjust message formality.

Task: Rewrite the text to be ${targetLevel} (currently ${sourceLevel}).

${direction}

${culturalNotes}

CRITICAL RULES:
1. Preserve the exact meaning and intent
2. Keep all facts and information
3. Maintain emojis and special characters
4. Keep line breaks and formatting
5. Only adjust vocabulary, grammar, and tone markers

Respond with ONLY a JSON object in this exact format:
{
  "adjustedText": "the rewritten text here",
  "changes": ["Changed 'hey' to 'hello'", "Removed contraction 'can't' → 'cannot'"]
}

No other text, just the JSON object.`,
      },
      {
        role: 'user',
        content: text,
      },
    ], {
      maxTokens: Math.max(300, Math.ceil(text.length * 3)), // Allow room for elaboration
      temperature: 0.3, // Low but allow some variation for natural adjustments
    });

    // Parse JSON response
    const result = JSON.parse(response.trim());

    // Validate result
    if (!result.adjustedText || !result.changes) {
      throw new Error('Invalid adjustment response format');
    }

    return {
      originalText: text,
      adjustedText: result.adjustedText,
      changes: result.changes,
      fromLevel: sourceLevel,
      toLevel: targetLevel,
    };
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Formality adjustment failed: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Get cultural notes for formality in different languages
 */
function getCulturalNotes(language: LanguageCode): string {
  const notes: Record<string, string> = {
    es: 'Spanish: Consider tú (informal) vs. usted (formal) forms. Latin American Spanish tends more formal than European Spanish.',
    fr: 'French: Consider tu (informal) vs. vous (formal) forms. Professional contexts require vous.',
    de: 'German: Consider du (informal) vs. Sie (formal) forms. Use Sie in professional and unfamiliar contexts.',
    ja: 'Japanese: Consider keigo (honorific speech) levels. Use more formal language with superiors and strangers.',
    ko: 'Korean: Consider speech levels (반말/존댓말). Hierarchy and age determine formality.',
    ar: 'Arabic: Formal address is more common. Use appropriate honorifics and polite expressions.',
    zh: 'Chinese: Consider formal vs. casual expressions. Use 您 (nín) for formal "you".',
  };

  return notes[language] || 'Apply standard English formality conventions.';
}

/**
 * Get guidance text for formality adjustment direction
 */
function getFormalityDirection(from: FormalityLevel, to: FormalityLevel): string {
  const formalityOrder: FormalityLevel[] = [
    'very-informal',
    'informal',
    'neutral',
    'formal',
    'very-formal',
  ];

  const fromIndex = formalityOrder.indexOf(from);
  const toIndex = formalityOrder.indexOf(to);

  if (toIndex > fromIndex) {
    // Making more formal
    return `Making text MORE FORMAL:
- Remove slang and abbreviations
- Expand contractions (can't → cannot)
- Add polite markers (please, kindly, would you)
- Use complete sentences
- Choose more sophisticated vocabulary
- Use passive voice where appropriate`;
  } else {
    // Making more casual
    return `Making text MORE CASUAL:
- Use contractions (cannot → can't)
- Simplify vocabulary
- Shorten sentences
- Use active voice
- More conversational tone
- Remove excessive politeness markers`;
  }
}

/**
 * Get a user-friendly label for formality levels
 */
export function getFormalityLabel(level: FormalityLevel): string {
  const labels: Record<FormalityLevel, string> = {
    'very-informal': 'Very Casual',
    'informal': 'Casual',
    'neutral': 'Neutral',
    'formal': 'Polite',
    'very-formal': 'Very Formal',
  };
  return labels[level];
}

/**
 * Get emoji representation of formality level
 */
export function getFormalityEmoji(level: FormalityLevel): string {
  const emojis: Record<FormalityLevel, string> = {
    'very-informal': '😎',
    'informal': '😊',
    'neutral': '🙂',
    'formal': '🎩',
    'very-formal': '🤵',
  };
  return emojis[level];
}

/**
 * Clear the detection cache (for testing or memory management)
 */
export function clearCache(): void {
  detectionCache.clear();
}
