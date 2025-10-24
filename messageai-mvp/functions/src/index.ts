/**
 * Firebase Cloud Functions for MessageAI
 * Handles server-side push notification delivery
 */

import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

// Initialize Firebase Admin SDK
admin.initializeApp();

/**
 * Send push notification when a new message is created
 * Triggered by RTDB writes to /messages/{chatId}/{messageId}
 */
export const sendMessageNotification = functions.database
  .ref("/messages/{chatId}/{messageId}")
  .onCreate(async (snapshot, context) => {
    const message = snapshot.val();
    const { chatId, messageId } = context.params;

    try {
      // Don't send notification if message is null
      if (!message) {
        console.log("Message is null, skipping notification");
        return null;
      }

      const { senderId, content, type, timestamp } = message;

      // Get sender information
      const senderSnapshot = await admin.database()
        .ref(`/users/${senderId}`)
        .once("value");
      const sender = senderSnapshot.val();

      if (!sender) {
        console.log(`Sender ${senderId} not found`);
        return null;
      }

      // Get chat information
      const chatSnapshot = await admin.database()
        .ref(`/chats/${chatId}`)
        .once("value");
      const chat = chatSnapshot.val();

      if (!chat) {
        console.log(`Chat ${chatId} not found`);
        return null;
      }

      // Get all chat participants
      const participants = chat.participants || [];

      // Filter out the sender
      const recipients = participants.filter(
        (uid: string) => uid !== senderId
      );

      if (recipients.length === 0) {
        console.log("No recipients to notify");
        return null;
      }

      // Get push tokens for all recipients
      const tokenPromises = recipients.map(async (uid: string) => {
        const userSnapshot = await admin.database()
          .ref(`/users/${uid}`)
          .once("value");
        const user = userSnapshot.val();
        return {
          uid,
          token: user?.pushToken,
          displayName: user?.displayName || "Unknown",
        };
      });

      const tokenData = await Promise.all(tokenPromises);
      const validTokens = tokenData.filter((data) => data.token);

      if (validTokens.length === 0) {
        console.log("No valid push tokens found");
        return null;
      }

      // Prepare notification payload
      const isGroupChat = chat.type === "group";
      const title = isGroupChat
        ? `${sender.displayName} in ${chat.name || "Group Chat"}`
        : sender.displayName;

      const body = type === "text"
        ? content.length > 100
          ? `${content.substring(0, 97)}...`
          : content
        : "📷 Photo";

      // Get total unread count for each recipient
      const unreadCountPromises = validTokens.map(async (data) => {
        const chatsSnapshot = await admin.database()
          .ref("/chats")
          .orderByChild(`participants/${data.uid}`)
          .once("value");

        let totalUnread = 0;
        chatsSnapshot.forEach((chatSnap) => {
          const chatData = chatSnap.val();
          const unreadCount = chatData.unreadCount?.[data.uid] || 0;
          totalUnread += unreadCount;
        });

        return {
          ...data,
          badge: totalUnread + 1, // +1 for the current message
        };
      });

      const tokensWithBadges = await Promise.all(unreadCountPromises);

      // Send notifications to all recipients
      const notificationPromises = tokensWithBadges.map(async (data) => {
        const payload = {
          notification: {
            title,
            body,
            sound: "default",
          },
          data: {
            chatId,
            messageId,
            senderId,
            senderName: sender.displayName,
            type: "message",
            timestamp: String(timestamp),
          },
          token: data.token,
          android: {
            priority: "high" as const,
            notification: {
              channelId: "messages",
              priority: "high" as const,
              sound: "default",
              tag: chatId,
              clickAction: "FLUTTER_NOTIFICATION_CLICK",
            },
          },
          apns: {
            payload: {
              aps: {
                badge: data.badge,
                sound: "default",
                contentAvailable: true,
                category: "MESSAGE",
              },
            },
          },
        };

        try {
          const response = await admin.messaging().send(payload);
          console.log(
            `Successfully sent notification to ${data.uid}:`, response
          );
          return response;
        } catch (error) {
          console.error(
            `Failed to send notification to ${data.uid}:`, error
          );
          // If token is invalid, remove it from user profile
          if (
            error instanceof Error &&
            (error.message.includes("invalid-registration-token") ||
            error.message.includes("registration-token-not-registered"))
          ) {
            await admin.database()
              .ref(`/users/${data.uid}/pushToken`)
              .remove();
            console.log(`Removed invalid token for user ${data.uid}`);
          }
          throw error;
        }
      });

      await Promise.allSettled(notificationPromises);

      // Increment unread count for recipients
      const unreadUpdatePromises = recipients.map((uid: string) =>
        admin.database()
          .ref(`/chats/${chatId}/unreadCount/${uid}`)
          .transaction((current) => (current || 0) + 1)
      );

      await Promise.all(unreadUpdatePromises);

      console.log(
        `Sent ${validTokens.length} notifications for message ${messageId}`
      );
      return null;
    } catch (error) {
      console.error("Error sending notification:", error);
      return null;
    }
  });

/**
 * Clean up old messages (optional cleanup function)
 * Runs daily to remove messages older than 90 days
 */
export const cleanupOldMessages = functions.pubsub
  .schedule("every 24 hours")
  .onRun(async (context) => {
    const now = Date.now();
    const ninetyDaysAgo = now - (90 * 24 * 60 * 60 * 1000);

    const chatsSnapshot = await admin.database()
      .ref("/messages")
      .once("value");

    const deletePromises: Promise<void>[] = [];

    chatsSnapshot.forEach((chatSnapshot) => {
      chatSnapshot.forEach((messageSnapshot) => {
        const message = messageSnapshot.val();
        if (message.timestamp < ninetyDaysAgo) {
          deletePromises.push(messageSnapshot.ref.remove());
        }
      });
    });

    await Promise.all(deletePromises);
    console.log(`Cleaned up ${deletePromises.length} old messages`);
    return null;
  });
