/**
 * Message Queue Service
 * Handles offline message queueing with retry logic and exponential backoff
 * Max 75 lines per function as per PRD requirements
 */

import { Message } from '../types';
import { DbResult } from './database.service';
import {
  saveMessage,
  getPendingMessages,
  updateMessageStatus,
  getMessageByLocalId,
} from './local-message.service';
import { sendMessageToFirebase } from './firebase-message.service';

/**
 * Retry configuration for failed messages
 */
interface RetryConfig {
  attempts: number;
  lastAttempt: number;
  nextRetry: number;
}

/**
 * Map to track retry state for messages by localId
 */
const retryState = new Map<string, RetryConfig>();

/**
 * Maximum retry attempts
 */
const MAX_RETRIES = 5;

/**
 * Base delay for exponential backoff (milliseconds)
 */
const BASE_DELAY = 1000;

/**
 * Enqueue a message for sending
 */
export async function enqueueMessage(message: Message): Promise<DbResult<void>> {
  try {
    // Save message with 'sending' status
    const messageWithStatus: Message = {
      ...message,
      status: 'sending',
    };

    const result = await saveMessage(messageWithStatus);

    if (!result.success) {
      return { success: false, error: result.error };
    }

    // Initialize retry state
    if (message.localId) {
      retryState.set(message.localId, {
        attempts: 0,
        lastAttempt: Date.now(),
        nextRetry: Date.now(),
      });
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: `Failed to enqueue message: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Get all pending messages from queue
 */
export async function dequeueMessages(): Promise<DbResult<Message[]>> {
  try {
    const result = await getPendingMessages();
    return result;
  } catch (error) {
    return {
      success: false,
      error: `Failed to dequeue messages: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Process the message queue
 */
export async function processQueue(): Promise<DbResult<{
  sent: number;
  failed: number;
}>> {
  try {
    const pendingResult = await getPendingMessages();

    if (!pendingResult.success || !pendingResult.data) {
      return {
        success: false,
        error: pendingResult.error ?? 'No pending messages',
      };
    }

    let sent = 0;
    let failed = 0;

    for (const message of pendingResult.data) {
      if (!message.localId) continue;

      // Check if message is ready for retry
      const retry = retryState.get(message.localId);
      if (retry && Date.now() < retry.nextRetry) {
        continue; // Skip, not ready yet
      }

      // Attempt to send
      const sendResult = await sendMessageToFirebase(message);

      if (sendResult.success && sendResult.data) {
        // Update message with server ID and status
        const updatedMessage: Message = {
          ...message,
          id: sendResult.data,
          status: 'sent',
        };
        await saveMessage(updatedMessage);

        // Remove from retry state
        retryState.delete(message.localId);
        sent++;
      } else {
        // Handle failure
        await handleMessageFailure(message.localId);
        failed++;
      }
    }

    return { success: true, data: { sent, failed } };
  } catch (error) {
    return {
      success: false,
      error: `Failed to process queue: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Retry failed messages
 */
export async function retryFailedMessages(): Promise<DbResult<void>> {
  try {
    const result = await processQueue();
    return result.success ? { success: true } : { success: false, error: result.error };
  } catch (error) {
    return {
      success: false,
      error: `Failed to retry messages: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Mark message as sending (internal)
 */
export async function markMessageSending(localId: string): Promise<DbResult<void>> {
  try {
    const messageResult = await getMessageByLocalId(localId);

    if (!messageResult.success || !messageResult.data) {
      return {
        success: false,
        error: messageResult.error ?? 'Message not found',
      };
    }

    const result = await updateMessageStatus(messageResult.data.id, 'sending');
    return result;
  } catch (error) {
    return {
      success: false,
      error: `Failed to mark sending: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Mark message as sent with server ID
 */
export async function markMessageSent(
  localId: string,
  serverId: string
): Promise<DbResult<void>> {
  try {
    const messageResult = await getMessageByLocalId(localId);

    if (!messageResult.success || !messageResult.data) {
      return {
        success: false,
        error: messageResult.error ?? 'Message not found',
      };
    }

    // Update message with server ID and sent status
    const updatedMessage: Message = {
      ...messageResult.data,
      id: serverId,
      status: 'sent',
    };

    const result = await saveMessage(updatedMessage);

    if (result.success) {
      retryState.delete(localId);
    }

    return result;
  } catch (error) {
    return {
      success: false,
      error: `Failed to mark sent: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Mark message as failed with error
 */
export async function markMessageFailed(
  localId: string,
  error: string
): Promise<DbResult<void>> {
  try {
    await handleMessageFailure(localId);

    return {
      success: true,
      data: undefined,
      error: `Message failed: ${error}`,
    };
  } catch (err) {
    return {
      success: false,
      error: `Failed to mark failed: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

/**
 * Handle message failure with exponential backoff
 */
async function handleMessageFailure(localId: string): Promise<void> {
  const retry = retryState.get(localId) ?? {
    attempts: 0,
    lastAttempt: Date.now(),
    nextRetry: Date.now(),
  };

  retry.attempts++;
  retry.lastAttempt = Date.now();

  if (retry.attempts >= MAX_RETRIES) {
    // Max retries reached, keep as 'sending' for manual retry
    retryState.delete(localId);
    return;
  }

  // Calculate exponential backoff: 1s, 2s, 4s, 8s, 16s
  const delay = BASE_DELAY * Math.pow(2, retry.attempts - 1);
  retry.nextRetry = Date.now() + delay;

  retryState.set(localId, retry);
}

/**
 * Clear retry state (for testing)
 */
export function clearRetryState(): void {
  retryState.clear();
}

/**
 * Get retry state for a message (for debugging)
 */
export function getRetryState(localId: string): RetryConfig | undefined {
  return retryState.get(localId);
}
