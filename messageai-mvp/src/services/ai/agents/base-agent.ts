/**
 * Base Swarm Agent Configuration
 * Provides foundation for creating specialized AI agents
 */

import type { SwarmAgent, FunctionTool, CompletionOptions } from '../types';
import { callCompletion, callStream } from '../ai-client';
import { getSystemPrompt } from '../prompts/system-prompts';
import { messageToolHandlers } from '../tools/message-tools';
import { userToolHandlers } from '../tools/user-tools';

/**
 * All available tool handlers combined
 */
const allToolHandlers = {
  ...messageToolHandlers,
  ...userToolHandlers,
};

/**
 * Create a base agent configuration
 */
export function createAgent(
  name: string,
  agentType: string,
  description: string,
  tools?: FunctionTool[]
): SwarmAgent {
  return {
    name,
    description,
    instructions: getSystemPrompt(agentType),
    tools,
    model: 'gpt-4-turbo', // Can be overridden per call
  };
}

/**
 * Execute an agent with a user message
 * Handles function calling if tools are available
 */
export async function executeAgent(
  agent: SwarmAgent,
  userMessage: string,
  options: CompletionOptions = {}
): Promise<string> {
  const messages = [
    {
      role: 'system' as const,
      content: agent.instructions,
    },
    {
      role: 'user' as const,
      content: userMessage,
    },
  ];

  // Merge agent tools with additional options
  const completionOptions: CompletionOptions = {
    ...options,
    model: options.model || agent.model,
    tools: options.tools || agent.tools,
  };

  // First call to get response (may include tool calls)
  const response = await callCompletion(messages, completionOptions);

  return response;
}

/**
 * Execute an agent with streaming response
 */
export async function* executeAgentStream(
  agent: SwarmAgent,
  userMessage: string,
  options: CompletionOptions = {}
): AsyncGenerator<string> {
  const messages = [
    {
      role: 'system' as const,
      content: agent.instructions,
    },
    {
      role: 'user' as const,
      content: userMessage,
    },
  ];

  const completionOptions: CompletionOptions = {
    ...options,
    model: options.model || agent.model,
  };

  yield* callStream(messages, completionOptions);
}

/**
 * Execute a function/tool by name
 */
export async function executeTool(
  toolName: string,
  args: any
): Promise<any> {
  const handler = allToolHandlers[toolName];

  if (!handler) {
    throw new Error(`Tool not found: ${toolName}`);
  }

  return await handler(args);
}

/**
 * Pre-configured agent instances for common tasks
 */

/**
 * Translation agent
 */
export const translationAgent = createAgent(
  'translator',
  'translation',
  'Translates text between languages naturally and accurately'
);

/**
 * Language detection agent
 */
export const languageDetectionAgent = createAgent(
  'language-detector',
  'language-detection',
  'Detects the language of text messages'
);

/**
 * Cultural context agent
 */
export const culturalContextAgent = createAgent(
  'cultural-expert',
  'cultural-context',
  'Identifies and explains cultural references in messages'
);

/**
 * Formality analysis agent
 */
export const formalityAnalysisAgent = createAgent(
  'formality-analyzer',
  'formality-analysis',
  'Analyzes the formality level of text'
);

/**
 * Formality adjustment agent
 */
export const formalityAdjustmentAgent = createAgent(
  'formality-adjuster',
  'formality-adjustment',
  'Adjusts text to different formality levels'
);

/**
 * Slang and idiom explanation agent
 */
export const slangIdiomAgent = createAgent(
  'slang-expert',
  'slang-idiom',
  'Explains slang and idiomatic expressions'
);

/**
 * Smart reply generation agent
 */
export const smartReplyAgent = createAgent(
  'reply-generator',
  'smart-reply',
  'Generates contextually appropriate reply suggestions'
);

/**
 * User style analysis agent
 */
export const userStyleAgent = createAgent(
  'style-analyzer',
  'user-style',
  'Analyzes user communication style and patterns'
);

/**
 * Get agent by name
 */
export function getAgent(agentName: string): SwarmAgent | null {
  const agents: Record<string, SwarmAgent> = {
    translator: translationAgent,
    'language-detector': languageDetectionAgent,
    'cultural-expert': culturalContextAgent,
    'formality-analyzer': formalityAnalysisAgent,
    'formality-adjuster': formalityAdjustmentAgent,
    'slang-expert': slangIdiomAgent,
    'reply-generator': smartReplyAgent,
    'style-analyzer': userStyleAgent,
  };

  return agents[agentName] || null;
}
