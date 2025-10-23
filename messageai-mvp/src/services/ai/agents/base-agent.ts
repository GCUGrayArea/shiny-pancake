/**
 * Base Agent Configuration
 * Implements agent pattern for multi-step AI workflows
 *
 * Note: This implements a Swarm-like agent pattern since OpenAI's Swarm
 * is an experimental framework. We create agents with specific roles
 * that can collaborate on complex tasks.
 */

import OpenAI from 'openai';
import { callCompletion, callStream } from '../ai-client';
import { AICompletionOptions, AIResponse } from '../types';

/**
 * Agent role definition
 */
export interface AgentRole {
  /** Name of the agent */
  name: string;
  /** Description of the agent's purpose */
  description: string;
  /** System prompt for the agent */
  systemPrompt: string;
  /** Available tools for the agent */
  tools?: any[];
  /** Temperature setting for this agent */
  temperature?: number;
}

/**
 * Agent execution context
 */
export interface AgentContext {
  /** Current conversation messages */
  messages: OpenAI.Chat.ChatCompletionMessageParam[];
  /** Shared context between agents */
  sharedData?: Record<string, any>;
}

/**
 * Base Agent class
 */
export class Agent {
  private role: AgentRole;

  constructor(role: AgentRole) {
    this.role = role;
  }

  /**
   * Get agent's name
   */
  getName(): string {
    return this.role.name;
  }

  /**
   * Get agent's system prompt
   */
  getSystemPrompt(): string {
    return this.role.systemPrompt;
  }

  /**
   * Execute agent with user message
   */
  async execute(
    userMessage: string,
    context?: AgentContext,
    options?: AICompletionOptions
  ): Promise<AIResponse> {
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      {
        role: 'system',
        content: this.role.systemPrompt,
      },
    ];

    // Add context messages if provided
    if (context?.messages) {
      messages.push(...context.messages);
    }

    // Add user message
    messages.push({
      role: 'user',
      content: userMessage,
    });

    // Execute with agent's temperature or default
    const executionOptions = {
      ...options,
      temperature: this.role.temperature ?? options?.temperature,
    };

    return callCompletion(messages, executionOptions);
  }

  /**
   * Execute agent with streaming response
   */
  async executeStream(
    userMessage: string,
    context?: AgentContext,
    options?: AICompletionOptions
  ): AsyncGenerator<string> {
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      {
        role: 'system',
        content: this.role.systemPrompt,
      },
    ];

    if (context?.messages) {
      messages.push(...context.messages);
    }

    messages.push({
      role: 'user',
      content: userMessage,
    });

    const executionOptions = {
      ...options,
      temperature: this.role.temperature ?? options?.temperature,
    };

    return callStream(messages, executionOptions);
  }

  /**
   * Chain this agent with another agent (for multi-step workflows)
   */
  async chain(
    userMessage: string,
    nextAgent: Agent,
    options?: AICompletionOptions
  ): Promise<AIResponse> {
    // Execute this agent first
    const firstResponse = await this.execute(userMessage, undefined, options);

    // Pass response to next agent
    const context: AgentContext = {
      messages: [
        {
          role: 'assistant',
          content: firstResponse.content,
        },
      ],
    };

    // Execute next agent
    return nextAgent.execute(
      `Based on the previous analysis: ${firstResponse.content}`,
      context,
      options
    );
  }
}

/**
 * Create a specialized agent
 */
export function createAgent(role: AgentRole): Agent {
  return new Agent(role);
}

/**
 * Multi-agent coordinator for complex workflows
 */
export class AgentCoordinator {
  private agents: Map<string, Agent>;

  constructor() {
    this.agents = new Map();
  }

  /**
   * Register an agent
   */
  registerAgent(agent: Agent): void {
    this.agents.set(agent.getName(), agent);
  }

  /**
   * Get an agent by name
   */
  getAgent(name: string): Agent | undefined {
    return this.agents.get(name);
  }

  /**
   * Execute a multi-agent workflow
   */
  async executeWorkflow(
    agentNames: string[],
    initialMessage: string,
    options?: AICompletionOptions
  ): Promise<AIResponse> {
    if (agentNames.length === 0) {
      throw new Error('No agents specified for workflow');
    }

    let currentMessage = initialMessage;
    let response: AIResponse | null = null;

    for (const agentName of agentNames) {
      const agent = this.getAgent(agentName);
      if (!agent) {
        throw new Error(`Agent not found: ${agentName}`);
      }

      response = await agent.execute(currentMessage, undefined, options);
      currentMessage = response.content;
    }

    return response!;
  }
}

/**
 * Pre-configured agent roles
 */
export const AGENT_ROLES = {
  TRANSLATOR: {
    name: 'translator',
    description: 'Translates text between languages',
    systemPrompt:
      'You are a professional translator. Provide accurate, natural translations.',
    temperature: 0.3,
  },
  LANGUAGE_DETECTOR: {
    name: 'language_detector',
    description: 'Detects the language of text',
    systemPrompt:
      'You are a language detection expert. Identify languages accurately.',
    temperature: 0.1,
  },
  CULTURAL_ANALYST: {
    name: 'cultural_analyst',
    description: 'Analyzes cultural context and references',
    systemPrompt:
      'You are a cultural expert. Identify and explain cultural references.',
    temperature: 0.5,
  },
  FORMALITY_ANALYZER: {
    name: 'formality_analyzer',
    description: 'Analyzes and adjusts formality levels',
    systemPrompt:
      'You are a linguistic expert in formality analysis and adjustment.',
    temperature: 0.4,
  },
  STYLE_ANALYST: {
    name: 'style_analyst',
    description: 'Analyzes user communication style',
    systemPrompt:
      'You are a communication style expert. Analyze writing patterns.',
    temperature: 0.3,
  },
  REPLY_GENERATOR: {
    name: 'reply_generator',
    description: 'Generates contextual reply suggestions',
    systemPrompt:
      'You are a helpful assistant generating natural reply suggestions.',
    temperature: 0.7,
  },
};
