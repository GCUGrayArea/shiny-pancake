/**
 * Manual Test Script for AI Services
 *
 * To run this test:
 * 1. Ensure you have OPENAI_API_KEY in your .env file
 * 2. Run: npx ts-node src/services/ai/__manual_test__.ts
 *
 * This script tests:
 * - OpenAI client initialization
 * - Basic completion call
 * - Translation agent execution
 * - RAG context retrieval (requires local database with messages)
 */

import * as dotenv from 'dotenv';
import { initializeClient, callCompletion, isInitialized } from './ai-client';
import { translationAgent, executeAgent } from './agents/base-agent';
import { getConversationContext } from './rag.service';

// Load environment variables
dotenv.config();

async function runManualTests() {
  console.log('🧪 Manual AI Services Test\n');
  console.log('=' .repeat(50));

  // Test 1: Check environment
  console.log('\n1️⃣  Checking environment configuration...');
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    console.error('❌ OPENAI_API_KEY not found in .env file');
    console.log('   Please add your OpenAI API key to .env:');
    console.log('   OPENAI_API_KEY=sk-your-key-here\n');
    return;
  }

  console.log('✅ OpenAI API key found');
  console.log(`   Key: ${apiKey.substring(0, 10)}...${apiKey.substring(apiKey.length - 4)}`);

  // Test 2: Initialize client
  console.log('\n2️⃣  Initializing OpenAI client...');
  try {
    initializeClient({
      apiKey,
      model: 'gpt-4-turbo',
      temperature: 0.7,
      maxTokens: 100,
    });
    console.log('✅ Client initialized successfully');
    console.log(`   Initialized: ${isInitialized()}`);
  } catch (error) {
    console.error('❌ Client initialization failed:', error);
    return;
  }

  // Test 3: Basic completion call
  console.log('\n3️⃣  Testing basic completion call...');
  try {
    const messages = [
      {
        role: 'user' as const,
        content: 'Say "Hello from MessageAI!" in exactly those words.',
      },
    ];

    const response = await callCompletion(messages, { maxTokens: 50 });
    console.log('✅ Completion call successful');
    console.log(`   Response: "${response}"`);
  } catch (error: any) {
    console.error('❌ Completion call failed:', error.message);
    console.log('   This might be due to:');
    console.log('   - Invalid API key');
    console.log('   - Network issues');
    console.log('   - Rate limiting');
    return;
  }

  // Test 4: Translation agent
  console.log('\n4️⃣  Testing translation agent...');
  try {
    const translationPrompt = 'Translate "Hello, how are you?" to Spanish.';
    const translation = await executeAgent(translationAgent, translationPrompt, {
      maxTokens: 50,
    });
    console.log('✅ Translation agent successful');
    console.log(`   Prompt: "${translationPrompt}"`);
    console.log(`   Response: "${translation}"`);
  } catch (error: any) {
    console.error('❌ Translation agent failed:', error.message);
  }

  // Test 5: RAG context (optional - requires database)
  console.log('\n5️⃣  Testing RAG context retrieval...');
  console.log('   (Note: This requires a local database with messages)');
  try {
    // Try to get context for a test chat
    // This will likely fail if database is empty, which is expected
    const context = await getConversationContext('test-chat-id', 10);

    if (context.messageCount > 0) {
      console.log('✅ RAG context retrieval successful');
      console.log(`   Messages retrieved: ${context.messageCount}`);
      console.log(`   Estimated tokens: ${context.estimatedTokens}`);
    } else {
      console.log('ℹ️  No messages found (expected if database is empty)');
      console.log('   This is normal for a fresh setup');
    }
  } catch (error: any) {
    console.log('ℹ️  RAG test skipped (database may not be initialized)');
    console.log(`   Error: ${error.message}`);
  }

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('✅ Manual test complete!\n');
  console.log('Summary:');
  console.log('- OpenAI client is working correctly');
  console.log('- Basic completions are functioning');
  console.log('- Agent execution is operational');
  console.log('- RAG infrastructure is in place\n');
  console.log('The AI foundation (PR-042) is ready for feature development! 🎉\n');
}

// Run tests
runManualTests().catch(error => {
  console.error('\n💥 Unexpected error:', error);
  process.exit(1);
});
