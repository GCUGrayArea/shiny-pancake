/**
 * Cultural Context Agent
 * Detects and explains cultural references in messages
 */

import { callCompletion } from '../ai-client';
import { ContextHint, ContextHintCategory, LanguageCode } from '../types';
import { v4 as uuidv4 } from 'uuid';

/**
 * System prompt for cultural context detection
 */
const CULTURAL_CONTEXT_SYSTEM_PROMPT = `You are a cultural expert who helps people understand cultural references in messages.

Your task is to analyze messages and identify cultural references that might not be obvious to someone from a different cultural background. Focus on:

1. **Holidays and Festivals**: Christmas, Diwali, Lunar New Year, Ramadan, etc.
2. **Idioms and Expressions**: Culture-specific phrases with non-literal meanings
3. **Cultural Customs**: Greetings, gestures, food traditions, ceremonies
4. **Historical References**: Events, figures, or periods significant to a culture
5. **Cultural Norms**: Formality conventions, social etiquette, communication styles

IMPORTANT GUIDELINES:
- Only flag references that would genuinely benefit from explanation
- Avoid flagging common knowledge or universal concepts
- Consider the cultural context and language of the message
- Provide clear, concise, and educational explanations
- Be respectful and avoid stereotypes

If you identify cultural references, respond with a JSON array of objects with this structure:
{
  "phrase": "the exact phrase from the message",
  "explanation": "what it means in simple terms",
  "culturalBackground": "why it's culturally significant",
  "category": "holiday|idiom|custom|historical|norm",
  "startIndex": number (position in text where phrase starts),
  "endIndex": number (position in text where phrase ends)
}

If no significant cultural references are found, respond with an empty array: []`;

/**
 * Detected cultural reference from AI (before full ContextHint creation)
 */
interface DetectedReference {
  phrase: string;
  explanation: string;
  culturalBackground: string;
  category: ContextHintCategory;
  startIndex: number;
  endIndex: number;
}

/**
 * Analyze a message for cultural references
 *
 * @param messageText - The message text to analyze
 * @param language - The language of the message
 * @param messageId - ID of the message being analyzed
 * @returns Array of cultural context hints
 */
export async function analyzeCulturalContext(
  messageText: string,
  language: LanguageCode,
  messageId: string
): Promise<ContextHint[]> {
  try {
    // Skip if message is too short (likely no cultural references)
    if (messageText.trim().length < 10) {
      return [];
    }

    // Build the analysis prompt
    const userPrompt = `Analyze this ${language} message for cultural references:

"${messageText}"

Identify any holidays, idioms, customs, historical references, or cultural norms that might need explanation for someone from a different cultural background.`;

    // Call OpenAI for analysis
    const response = await callCompletion(
      [
        { role: 'system', content: CULTURAL_CONTEXT_SYSTEM_PROMPT },
        { role: 'user', content: userPrompt }
      ],
      {
        temperature: 0.3, // Lower temperature for more consistent detection
        maxTokens: 1000
      }
    );

    // Parse the response
    const detectedReferences = parseAIResponse(response);

    // Convert detected references to ContextHints
    const hints: ContextHint[] = detectedReferences.map(ref => ({
      id: uuidv4(),
      messageId,
      phrase: ref.phrase,
      explanation: ref.explanation,
      culturalBackground: ref.culturalBackground,
      category: ref.category,
      startIndex: ref.startIndex,
      endIndex: ref.endIndex,
      seen: false,
      timestamp: Date.now()
    }));

    return hints;
  } catch (error) {
    console.error('Error analyzing cultural context:', error);
    // Return empty array on error - cultural hints are optional
    return [];
  }
}

/**
 * Parse AI response into detected references
 *
 * @param response - Raw AI response text
 * @returns Array of detected cultural references
 */
function parseAIResponse(response: string): DetectedReference[] {
  try {
    // Clean up the response (remove markdown code blocks if present)
    let cleaned = response.trim();
    if (cleaned.startsWith('```json')) {
      cleaned = cleaned.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    } else if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/```\n?/g, '');
    }

    // Parse JSON
    const parsed = JSON.parse(cleaned);

    // Validate it's an array
    if (!Array.isArray(parsed)) {
      console.warn('AI response is not an array:', parsed);
      return [];
    }

    // Validate and filter references
    return parsed.filter(ref =>
      ref.phrase &&
      ref.explanation &&
      ref.culturalBackground &&
      ref.category &&
      typeof ref.startIndex === 'number' &&
      typeof ref.endIndex === 'number'
    );
  } catch (error) {
    console.error('Error parsing AI response:', error);
    console.error('Response was:', response);
    return [];
  }
}

/**
 * Analyze multiple messages in batch for efficiency
 *
 * @param messages - Array of messages to analyze
 * @returns Map of messageId to array of hints
 */
export async function analyzeCulturalContextBatch(
  messages: Array<{ id: string; text: string; language: LanguageCode }>
): Promise<Map<string, ContextHint[]>> {
  const results = new Map<string, ContextHint[]>();

  // Process in parallel with limit to avoid rate limiting
  const BATCH_SIZE = 3;
  for (let i = 0; i < messages.length; i += BATCH_SIZE) {
    const batch = messages.slice(i, i + BATCH_SIZE);
    const promises = batch.map(msg =>
      analyzeCulturalContext(msg.text, msg.language, msg.id)
    );

    const batchResults = await Promise.all(promises);
    batch.forEach((msg, index) => {
      results.set(msg.id, batchResults[index]);
    });
  }

  return results;
}
