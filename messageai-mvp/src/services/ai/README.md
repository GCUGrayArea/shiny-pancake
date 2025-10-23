# AI Services

This directory contains the AI service layer for MessageAI, providing translation, cultural context, and smart reply features using OpenAI's API.

## Structure

```
/ai
  /agents           # Agent definitions for multi-step workflows
    base-agent.ts   # Base agent class and coordinator
  /prompts          # System prompts for different AI tasks
    system-prompts.ts
  /tools            # Function calling tools for agents
    message-tools.ts
    user-tools.ts
  /__tests__        # Unit tests
  ai-client.ts      # OpenAI client wrapper
  rag.service.ts    # RAG pipeline for context retrieval
  types.ts          # TypeScript type definitions
  index.ts          # Central export point
```

## Core Components

### AI Client (`ai-client.ts`)
- OpenAI API wrapper with retry logic and error handling
- Supports both completion and streaming modes
- Configurable via environment variables

### RAG Service (`rag.service.ts`)
- Retrieval-Augmented Generation pipeline
- Fetches conversation context from local database
- Formats context for LLM consumption
- Manages token limits for context windows

### Agents (`agents/base-agent.ts`)
- Base agent pattern for multi-step AI workflows
- Agent coordinator for complex multi-agent tasks
- Pre-configured agent roles for different tasks

### Tools (`tools/`)
- Function calling tools for OpenAI function calling
- Message history retrieval
- User preferences access
- Language detection utilities

## Environment Variables

Required environment variables (add to `.env`):

```
OPENAI_API_KEY=sk-your-api-key-here
OPENAI_MODEL=gpt-4-turbo
OPENAI_MAX_TOKENS=1000
OPENAI_TEMPERATURE=0.7
```

## Usage Examples

### Initialize Client

```typescript
import { initializeClient } from './services/ai';

const client = initializeClient();
```

### Simple Completion

```typescript
import { callCompletion } from './services/ai';

const response = await callCompletion([
  { role: 'system', content: 'You are a helpful assistant.' },
  { role: 'user', content: 'Hello!' }
]);

console.log(response.content);
```

### Get Conversation Context

```typescript
import { getConversationContext } from './services/ai';

const context = await getConversationContext('chat-id-123', 50);
console.log(context.messages); // Last 50 messages
console.log(context.participants); // User info
```

### Use an Agent

```typescript
import { createAgent, AGENT_ROLES } from './services/ai';

const translator = createAgent(AGENT_ROLES.TRANSLATOR);
const response = await translator.execute('Translate this to Spanish');
```

## Testing

Run AI service tests:

```bash
npm test -- src/services/ai/__tests__
```

## Future Features

The following AI features will be implemented in subsequent PRs:

1. **Language Detection & Auto-Translate** (PR-043)
2. **Real-Time Inline Translation** (PR-044)
3. **Cultural Context Hints** (PR-045)
4. **Formality Level Adjustment** (PR-046)
5. **Slang & Idiom Explanations** (PR-047)
6. **Context-Aware Smart Replies** (PR-048)
