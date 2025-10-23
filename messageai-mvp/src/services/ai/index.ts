/**
 * AI Services Index
 * Central export point for all AI-related services
 */

// Core client
export {
  initializeClient,
  getClient,
  callCompletion,
  callStream,
  estimateTokens,
  isClientInitialized,
  resetClient,
} from './ai-client';

// RAG service
export {
  getConversationContext,
  formatMessagesForLLM,
  buildContextPrompt,
  buildTranslationSystemPrompt,
  buildLanguageDetectionPrompt,
  buildCulturalContextPrompt,
  buildFormalityDetectionPrompt,
  buildFormalityAdjustmentPrompt,
  buildSmartReplyPrompt,
  extractLanguageCode,
} from './rag.service';

// Agents
export {
  Agent,
  AgentCoordinator,
  createAgent,
  AGENT_ROLES,
  type AgentRole,
  type AgentContext,
} from './agents/base-agent';

// Tools
export {
  messageTools,
  executeMessageTool,
  getMessageHistoryTool,
  getLastMessageTool,
} from './tools/message-tools';

export {
  userTools,
  executeUserTool,
  getUserPreferencesTool,
  detectLanguageTool,
  type UserPreferences,
} from './tools/user-tools';

// Prompts
export * from './prompts/system-prompts';

// Types
export type {
  LanguageCode,
  AICompletionOptions,
  AIResponse,
  ConversationContext,
  FormattedContext,
  ContextHint,
  FormalityLevel,
  FormalityResult,
  SmartReply,
  UserStyleProfile,
  TranslationCacheEntry,
  AIError,
  AIErrorType,
} from './types';
