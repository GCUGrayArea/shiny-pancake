/**
 * User Style Service
 * Manages user style profiles for personalizing smart replies
 * Implements per-conversation style analysis with SQLite + in-memory caching
 */

import { UserStyleProfile, FormalityLevel, LanguageCode } from "./ai/types";
import {
  getDatabase,
  executeQuery,
  executeQueryFirst,
  executeUpdate,
} from "./database.service";
import { getMessagesByChat } from "./local-message.service";
import { Message } from "../types";

// In-memory cache for style profiles (TTL: 24 hours)
interface CacheEntry {
  profile: UserStyleProfile;
  timestamp: number;
}

const profileCache = new Map<string, CacheEntry>();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Generate cache key for a user-chat combination
 */
function getCacheKey(userId: string, chatId: string): string {
  return `${userId}:${chatId}`;
}

/**
 * Check if a cache entry is still valid
 */
function isCacheValid(entry: CacheEntry): boolean {
  return Date.now() - entry.timestamp < CACHE_TTL;
}

/**
 * Get user style profile from cache
 */
function getFromCache(userId: string, chatId: string): UserStyleProfile | null {
  const key = getCacheKey(userId, chatId);
  const entry = profileCache.get(key);

  if (entry && isCacheValid(entry)) {
    return entry.profile;
  }

  // Remove stale entry
  if (entry) {
    profileCache.delete(key);
  }

  return null;
}

/**
 * Store user style profile in cache
 */
function storeInCache(profile: UserStyleProfile): void {
  const key = getCacheKey(profile.userId, profile.chatId);
  profileCache.set(key, {
    profile,
    timestamp: Date.now(),
  });
}

/**
 * Build user style profile by analyzing recent messages in a conversation
 */
export async function buildUserProfile(
  userId: string,
  chatId: string,
  messageLimit: number = 100,
): Promise<UserStyleProfile> {
  // Check cache first
  const cached = getFromCache(userId, chatId);
  if (cached) {
    return cached;
  }

  // Fetch user's messages from this conversation
  const result = await getMessagesByChat(chatId, messageLimit);
  if (!result.success || !result.data) {
    throw new Error("Failed to fetch messages for style analysis");
  }

  // Filter to only this user's messages
  const userMessages = result.data.filter((msg) => msg.senderId === userId);

  if (userMessages.length === 0) {
    // Return default profile for users with no message history
    return createDefaultProfile(userId, chatId);
  }

  // Analyze messages to build profile
  const profile = analyzeMessages(userId, chatId, userMessages);

  // Save to database and cache
  await saveUserProfile(profile);
  storeInCache(profile);

  return profile;
}

/**
 * Create a default profile for users with no message history
 */
function createDefaultProfile(
  userId: string,
  chatId: string,
): UserStyleProfile {
  return {
    userId,
    chatId,
    commonPhrases: [],
    averageMessageLength: 10,
    formalityPreference: "neutral" as FormalityLevel,
    emojiUsage: {
      frequency: 0,
      favorites: [],
    },
    languageMixing: {
      primary: "en" as LanguageCode,
      secondary: [],
      switchingPatterns: [],
    },
    conversationStyle: "balanced",
    punctuationStyle: {
      usesPeriods: true,
      usesExclamation: false,
      usesQuestions: false,
    },
    greetingStyle: [],
    closingStyle: [],
    lastUpdated: Date.now(),
    messageCount: 0,
  };
}

/**
 * Analyze user messages to extract style patterns
 */
function analyzeMessages(
  userId: string,
  chatId: string,
  messages: Message[],
): UserStyleProfile {
  const totalMessages = messages.length;

  // Calculate average message length
  const totalWords = messages.reduce((sum, msg) => {
    if (msg.type === "text") {
      return sum + msg.content.split(/\s+/).length;
    }
    return sum;
  }, 0);
  const averageMessageLength = totalWords / totalMessages;

  // Analyze emoji usage
  const emojiRegex =
    /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu;
  let totalEmojis = 0;
  const emojiCounts = new Map<string, number>();

  messages.forEach((msg) => {
    if (msg.type === "text") {
      const emojis = msg.content.match(emojiRegex) || [];
      totalEmojis += emojis.length;
      emojis.forEach((emoji) => {
        emojiCounts.set(emoji, (emojiCounts.get(emoji) || 0) + 1);
      });
    }
  });

  const emojiFrequency = totalEmojis / totalMessages;
  const favorites = Array.from(emojiCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([emoji]) => emoji);

  // Analyze punctuation
  let usesPeriods = 0;
  let usesExclamation = 0;
  let usesQuestions = 0;

  messages.forEach((msg) => {
    if (msg.type === "text") {
      if (msg.content.includes(".")) usesPeriods++;
      if (msg.content.includes("!")) usesExclamation++;
      if (msg.content.includes("?")) usesQuestions++;
    }
  });

  // Determine conversation style based on message length
  let conversationStyle: "terse" | "detailed" | "balanced" = "balanced";
  if (averageMessageLength < 5) {
    conversationStyle = "terse";
  } else if (averageMessageLength > 20) {
    conversationStyle = "detailed";
  }

  // Detect primary language (simplified - assumes English by default)
  const primaryLanguage: LanguageCode = "en";

  // Build profile
  return {
    userId,
    chatId,
    commonPhrases: [], // Could be enhanced with NLP phrase extraction
    averageMessageLength: Math.round(averageMessageLength * 10) / 10,
    formalityPreference: "neutral" as FormalityLevel, // Could be enhanced with formality detection
    emojiUsage: {
      frequency: Math.round(emojiFrequency * 10) / 10,
      favorites,
    },
    languageMixing: {
      primary: primaryLanguage,
      secondary: [],
      switchingPatterns: [],
    },
    conversationStyle,
    punctuationStyle: {
      usesPeriods: usesPeriods > totalMessages / 3,
      usesExclamation: usesExclamation > totalMessages / 4,
      usesQuestions: usesQuestions > totalMessages / 5,
    },
    greetingStyle: [],
    closingStyle: [],
    lastUpdated: Date.now(),
    messageCount: totalMessages,
  };
}

/**
 * Save user style profile to database
 */
export async function saveUserProfile(
  profile: UserStyleProfile,
): Promise<void> {
  const id = `${profile.userId}_${profile.chatId}`;

  await executeUpdate(
    `INSERT OR REPLACE INTO user_style_profiles (
      id, userId, chatId, commonPhrases, averageMessageLength,
      formalityPreference, emojiFrequency, emojiFavorites,
      primaryLanguage, secondaryLanguages, switchingPatterns,
      conversationStyle, usesPeriods, usesExclamation, usesQuestions,
      greetingStyle, closingStyle, lastUpdated, messageCount
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      profile.userId,
      profile.chatId,
      JSON.stringify(profile.commonPhrases),
      profile.averageMessageLength,
      profile.formalityPreference,
      profile.emojiUsage.frequency,
      JSON.stringify(profile.emojiUsage.favorites),
      profile.languageMixing.primary,
      JSON.stringify(profile.languageMixing.secondary),
      JSON.stringify(profile.languageMixing.switchingPatterns),
      profile.conversationStyle,
      profile.punctuationStyle.usesPeriods ? 1 : 0,
      profile.punctuationStyle.usesExclamation ? 1 : 0,
      profile.punctuationStyle.usesQuestions ? 1 : 0,
      JSON.stringify(profile.greetingStyle),
      JSON.stringify(profile.closingStyle),
      profile.lastUpdated,
      profile.messageCount,
    ],
  );
}

/**
 * Load user style profile from database
 */
export async function loadUserProfile(
  userId: string,
  chatId: string,
): Promise<UserStyleProfile | null> {
  // Check cache first
  const cached = getFromCache(userId, chatId);
  if (cached) {
    return cached;
  }

  const id = `${userId}_${chatId}`;

  const result = await executeQueryFirst<any>(
    "SELECT * FROM user_style_profiles WHERE id = ?",
    [id],
  );

  if (!result.success || !result.data) {
    return null;
  }

  const row = result.data;

  const profile: UserStyleProfile = {
    userId: row.userId,
    chatId: row.chatId,
    commonPhrases: JSON.parse(row.commonPhrases || "[]"),
    averageMessageLength: row.averageMessageLength,
    formalityPreference: row.formalityPreference as FormalityLevel,
    emojiUsage: {
      frequency: row.emojiFrequency,
      favorites: JSON.parse(row.emojiFavorites || "[]"),
    },
    languageMixing: {
      primary: row.primaryLanguage as LanguageCode,
      secondary: JSON.parse(row.secondaryLanguages || "[]"),
      switchingPatterns: JSON.parse(row.switchingPatterns || "[]"),
    },
    conversationStyle: row.conversationStyle,
    punctuationStyle: {
      usesPeriods: row.usesPeriods === 1,
      usesExclamation: row.usesExclamation === 1,
      usesQuestions: row.usesQuestions === 1,
    },
    greetingStyle: JSON.parse(row.greetingStyle || "[]"),
    closingStyle: JSON.parse(row.closingStyle || "[]"),
    lastUpdated: row.lastUpdated,
    messageCount: row.messageCount,
  };

  // Store in cache
  storeInCache(profile);

  return profile;
}

/**
 * Clear cached profile (useful after new messages)
 */
export function invalidateProfileCache(userId: string, chatId: string): void {
  const key = getCacheKey(userId, chatId);
  profileCache.delete(key);
}

/**
 * Clear all cached profiles
 */
export function clearAllProfileCache(): void {
  profileCache.clear();
}
