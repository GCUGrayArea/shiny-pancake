/**
 * Migration Script: Fix Chat Participants
 *
 * This script fixes chats that have missing or empty participantIds by:
 * 1. Finding all chats with missing/empty participantIds
 * 2. Looking at the messages in each chat to determine participants
 * 3. Updating the chat with the correct participantIds structure
 *
 * Run with: npx ts-node scripts/migrate-chat-participants.ts
 */

import dotenv from 'dotenv';
import admin from 'firebase-admin';

// Load environment variables
dotenv.config();

console.log('Firebase config loaded:');
console.log('  Database URL:', process.env.FIREBASE_DATABASE_URL);
console.log('');

async function migrateChatParticipants() {
  console.log('Starting chat participants migration...');

  // Initialize Firebase Admin
  admin.initializeApp({
    databaseURL: process.env.FIREBASE_DATABASE_URL,
  });

  const db = admin.database();

  try {
    // Get all chats
    const chatsRef = db.ref('chats');
    const chatsSnapshot = await chatsRef.once('value');

    if (!chatsSnapshot.exists()) {
      console.log('No chats found in database');
      return;
    }

    let fixedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    const updates: { [key: string]: any } = {};
    const chatsData = chatsSnapshot.val();

    // Process each chat
    for (const chatId of Object.keys(chatsData)) {
      const chatData = chatsData[chatId];

      console.log(`\nProcessing chat: ${chatId}`);

      // Check if participantIds is missing or empty
      const hasValidParticipants = chatData.participantIds &&
        Object.keys(chatData.participantIds).length > 0;

      if (hasValidParticipants) {
        console.log(`  ✓ Chat ${chatId} already has valid participants, skipping`);
        skippedCount++;
        continue;
      }

      console.log(`  ⚠ Chat ${chatId} has missing/empty participantIds, attempting to fix...`);

      // Get messages for this chat to determine participants
      const messagesRef = db.ref(`messages/${chatId}`);
      const messagesSnapshot = await messagesRef.once('value');

      if (!messagesSnapshot.exists()) {
        console.log(`  ✗ No messages found for chat ${chatId}, cannot determine participants`);
        errorCount++;
        continue;
      }

      // Collect unique sender IDs from messages
      const participantSet = new Set<string>();
      messagesSnapshot.forEach((messageSnapshot) => {
        const message = messageSnapshot.val();
        if (message.senderId) {
          participantSet.add(message.senderId);
        }
      });

      if (participantSet.size === 0) {
        console.log(`  ✗ No valid senders found in messages for chat ${chatId}`);
        errorCount++;
        continue;
      }

      // Create participantIds object
      const participantIds: { [key: string]: boolean } = {};
      participantSet.forEach(uid => {
        participantIds[uid] = true;
      });

      console.log(`  ✓ Found ${participantSet.size} participants:`, Array.from(participantSet));

      // Add to batch update
      updates[`chats/${chatId}/participantIds`] = participantIds;
      fixedCount++;
    }

    // Execute batch update
    if (Object.keys(updates).length > 0) {
      console.log(`\n\nApplying updates to ${Object.keys(updates).length} chats...`);
      await db.ref().update(updates);
      console.log('✓ Updates applied successfully!');
    }

    // Summary
    console.log('\n=== Migration Summary ===');
    console.log(`Fixed: ${fixedCount} chats`);
    console.log(`Skipped (already valid): ${skippedCount} chats`);
    console.log(`Errors: ${errorCount} chats`);
    console.log('=========================\n');

  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }

  process.exit(0);
}

// Run migration
migrateChatParticipants();
