/**
 * Smart Reply Agent
 * Generates context-aware, personalized reply suggestions using OpenAI
 * Uses a simplified single-agent approach with well-engineered prompts
 */

import { callCompletion } from "../ai-client";
import {
  Reply,
  ReplyType,
  UserStyleProfile,
  LanguageCode,
  SmartReplyOptions,
} from "../types";
import { Message } from "../../../types";

/**
 * Generate smart reply suggestions based on conversation context and user style
 */
export async function generateSmartReplies(
  conversationContext: Message[],
  userProfile: UserStyleProfile,
  options: SmartReplyOptions = {},
): Promise<Reply[]> {
  const { count = 3, contextWindow = 10, targetLanguage } = options;

  // Take only the most recent messages for context
  const recentMessages = conversationContext.slice(-contextWindow);

  if (recentMessages.length === 0) {
    return generateDefaultReplies(userProfile.languageMixing.primary);
  }

  // Build prompt for reply generation
  const prompt = buildReplyPrompt(
    recentMessages,
    userProfile,
    count,
    targetLanguage,
  );

  try {
    // Call OpenAI to generate replies
    const response = await callCompletion([{ role: "user", content: prompt }], {
      temperature: 0.8, // Higher temperature for more variety
      maxTokens: 500,
    });

    // Parse the response
    const targetLang =
      options.targetLanguage || userProfile.languageMixing.primary;
    const replies = parseReplyResponse(response, targetLang);

    // Return requested number of replies
    return replies.slice(0, count);
  } catch (error) {
    console.error("❌ Smart Reply: Failed to generate:", error);
    console.error(
      "❌ Smart Reply: Error details:",
      error instanceof Error ? error.message : String(error),
    );
    // Return default replies as fallback
    const targetLang =
      options.targetLanguage || userProfile.languageMixing.primary;
    return generateDefaultReplies(targetLang);
  }
}

/**
 * Build a comprehensive prompt for reply generation
 */
function buildReplyPrompt(
  messages: Message[],
  profile: UserStyleProfile,
  count: number,
  targetLanguage?: LanguageCode,
): string {
  // Format conversation context
  const conversation = messages
    .map((msg) => {
      const msgType = msg.senderId === profile.userId ? "Me" : "Them";
      if (msg.type === "image") {
        return `${msgType}: [Image${msg.caption ? `: ${msg.caption}` : ""}]`;
      }
      return `${msgType}: ${msg.content}`;
    })
    .join("\n");

  const language = targetLanguage || profile.languageMixing.primary;

  // Build style description
  const styleDescription = buildStyleDescription(profile);

  // Map language codes to full language names for clearer AI instructions
  const languageNames: Record<string, string> = {
    en: "English",
    es: "Spanish",
    fr: "French",
    de: "German",
    it: "Italian",
    pt: "Portuguese",
    ru: "Russian",
    zh: "Chinese",
    ja: "Japanese",
    ko: "Korean",
    ar: "Arabic",
    hi: "Hindi",
    nl: "Dutch",
    pl: "Polish",
    sv: "Swedish",
    tr: "Turkish",
  };

  const languageName = languageNames[language] || "English";

  const prompt = `You are helping me reply to a message in a conversation. Generate ${count} natural, contextually appropriate reply suggestions that match my personal texting style.

MY TEXTING STYLE:
${styleDescription}

CONVERSATION:
${conversation}

IMPORTANT: Generate ${count} diverse reply options in ${languageName}:
- Each reply MUST be written in ${languageName}
- Each reply should sound natural and match my style
- Keep replies conversational and appropriate to the context
- Vary the types: agreement/affirmation, follow-up question, conversation continuation

Return ONLY a JSON array in this exact format:
[
  {"text": "reply text here in ${languageName}", "type": "agree"},
  {"text": "reply text here in ${languageName}", "type": "question"},
  {"text": "reply text here in ${languageName}", "type": "continue"}
]

Valid types: "agree", "question", "continue", "polite-close", "enthusiasm"`;

  return prompt;
}

/**
 * Build a description of the user's texting style
 */
function buildStyleDescription(profile: UserStyleProfile): string {
  const parts: string[] = [];

  // Message length
  if (profile.conversationStyle === "terse") {
    parts.push("- I write short, concise messages (usually under 5 words)");
  } else if (profile.conversationStyle === "detailed") {
    parts.push("- I write longer, detailed messages (usually over 20 words)");
  } else {
    parts.push("- I write moderate-length messages (around 10-15 words)");
  }

  // Formality
  parts.push(`- My formality level is: ${profile.formalityPreference}`);

  // Emoji usage
  if (profile.emojiUsage.frequency > 0.5) {
    parts.push(
      `- I frequently use emojis (favorites: ${profile.emojiUsage.favorites.join(" ")})`,
    );
  } else if (profile.emojiUsage.frequency > 0) {
    parts.push("- I occasionally use emojis");
  } else {
    parts.push("- I rarely use emojis");
  }

  // Punctuation
  const punctuationNotes: string[] = [];
  if (profile.punctuationStyle.usesPeriods) {
    punctuationNotes.push("periods");
  }
  if (profile.punctuationStyle.usesExclamation) {
    punctuationNotes.push("exclamation marks");
  }
  if (profile.punctuationStyle.usesQuestions) {
    punctuationNotes.push("question marks");
  }
  if (punctuationNotes.length > 0) {
    parts.push(`- I typically use: ${punctuationNotes.join(", ")}`);
  }

  return parts.join("\n");
}

/**
 * Parse the OpenAI response into Reply objects
 */
function parseReplyResponse(
  response: string,
  defaultLanguage: LanguageCode,
): Reply[] {
  try {
    // Try to extract JSON from the response
    const jsonMatch = response.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error("No JSON array found in response");
    }

    const parsed = JSON.parse(jsonMatch[0]);

    if (!Array.isArray(parsed)) {
      throw new Error("Response is not an array");
    }

    return parsed.map((item: any) => ({
      text: item.text,
      type: (item.type as ReplyType) || "continue",
      language: defaultLanguage,
      confidence: 0.8, // Default confidence
    }));
  } catch (error) {
    console.error("Failed to parse reply response:", error);
    return generateDefaultReplies(defaultLanguage);
  }
}

/**
 * Generate default fallback replies
 */
function generateDefaultReplies(language: LanguageCode): Reply[] {
  const defaults: Record<string, Reply[]> = {
    en: [
      { text: "Sounds good!", type: "agree", language: "en", confidence: 0.5 },
      {
        text: "What do you think?",
        type: "question",
        language: "en",
        confidence: 0.5,
      },
      {
        text: "Tell me more",
        type: "continue",
        language: "en",
        confidence: 0.5,
      },
    ],
    es: [
      { text: "¡Suena bien!", type: "agree", language: "es", confidence: 0.5 },
      {
        text: "¿Qué piensas?",
        type: "question",
        language: "es",
        confidence: 0.5,
      },
      {
        text: "Cuéntame más",
        type: "continue",
        language: "es",
        confidence: 0.5,
      },
    ],
    fr: [
      {
        text: "Ça a l'air bien!",
        type: "agree",
        language: "fr",
        confidence: 0.5,
      },
      {
        text: "Qu'en penses-tu?",
        type: "question",
        language: "fr",
        confidence: 0.5,
      },
      {
        text: "Dis-m'en plus",
        type: "continue",
        language: "fr",
        confidence: 0.5,
      },
    ],
  };

  return defaults[language] || defaults.en;
}

/**
 * Cache for smart replies (simple in-memory cache)
 */
interface ReplyCacheEntry {
  replies: Reply[];
  timestamp: number;
}

const replyCache = new Map<string, ReplyCacheEntry>();
const REPLY_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Generate cache key for conversation context
 */
function getCacheKey(
  chatId: string,
  lastMessageId: string,
  language?: LanguageCode,
): string {
  return `${chatId}:${lastMessageId}:${language || "en"}`;
}

/**
 * Get cached replies if available and valid
 */
export function getCachedReplies(
  chatId: string,
  lastMessageId: string,
  language?: LanguageCode,
): Reply[] | null {
  const key = getCacheKey(chatId, lastMessageId, language);
  const entry = replyCache.get(key);

  if (entry && Date.now() - entry.timestamp < REPLY_CACHE_TTL) {
    return entry.replies;
  }

  // Remove stale entry
  if (entry) {
    replyCache.delete(key);
  }

  return null;
}

/**
 * Store replies in cache
 */
export function cacheReplies(
  chatId: string,
  lastMessageId: string,
  replies: Reply[],
  language?: LanguageCode,
): void {
  const key = getCacheKey(chatId, lastMessageId, language);
  replyCache.set(key, {
    replies,
    timestamp: Date.now(),
  });
}

/**
 * Invalidate cached replies for a chat
 */
export function invalidateReplyCache(chatId: string): void {
  // Remove all entries for this chat
  Array.from(replyCache.keys())
    .filter((key) => key.startsWith(`${chatId}:`))
    .forEach((key) => replyCache.delete(key));
}

/**
 * Clear all cached replies
 */
export function clearAllReplyCache(): void {
  replyCache.clear();
}
