import mongoose from "mongoose";
import { ChatConversation, ChatMessage, User } from "../models/index.js";
import { ApiError } from "../utils/ApiError.js";
import { assertCanStartConversation } from "./chat.roleRules.js";

/**
 * Find or create a DM conversation between two users
 * @param {Object} params - Parameters
 * @param {string} params.userA - First user ID
 * @param {string} params.roleA - First user role
 * @param {string} params.userB - Second user ID  
 * @param {string} params.roleB - Second user role
 * @returns {Promise<Object>} Conversation object
 */
export async function findOrCreateDm({ userA, roleA, userB, roleB }) {
  // Enforce role rules
  assertCanStartConversation(roleA, roleB);
  
  // Check if conversation already exists between these two users
  const existingConversation = await ChatConversation.findOne({
    isGroup: false,
    "participants.user": { $all: [userA, userB] },
    $expr: { $eq: [{ $size: "$participants" }, 2] }, // Ensure exactly 2 participants
  })
    .populate("participants.user", "fullName email role")
    .populate("lastMessage");
  
  if (existingConversation) {
    return existingConversation;
  }
  
  // Create new conversation
  const newConversation = new ChatConversation({
    participants: [
      { user: userA, role: roleA },
      { user: userB, role: roleB },
    ],
    isGroup: false,
    unread: new Map([
      [userA.toString(), 0],
      [userB.toString(), 0],
    ]),
  });
  
  await newConversation.save();
  
  // Populate and return
  return await ChatConversation.findById(newConversation._id)
    .populate("participants.user", "fullName email role")
    .populate("lastMessage");
}

/**
 * Append a new message to a conversation
 * @param {Object} params - Parameters
 * @param {string} params.conversationId - Conversation ID
 * @param {string} params.senderId - Sender user ID
 * @param {string} params.text - Message text (optional)
 * @param {Array} params.attachments - Message attachments (optional)
 * @param {string} params.replyTo - Reply to message ID (optional)
 * @returns {Promise<Object>} Created message
 */
export async function appendMessage({ conversationId, senderId, text, attachments = [], replyTo }) {
  const session = await mongoose.startSession();
  
  try {
    session.startTransaction();
    
    // Sanitize text
    const sanitizedText = text ? ChatMessage.sanitizeText(text) : "";
    
    // Create message
    const message = new ChatMessage({
      conversationId,
      sender: senderId,
      text: sanitizedText,
      attachments,
      replyTo,
    });
    
    await message.save({ session });
    
    // Update conversation atomically
    const conversation = await ChatConversation.findById(conversationId).session(session);
    
    if (!conversation) {
      throw new ApiError(404, "Conversation not found");
    }
    
    // Update last message
    conversation.lastMessage = message._id;
    
    // Increment unread count for all participants except sender
    conversation.incrementUnreadForOthers(senderId);
    
    // Mark as read by sender
    conversation.setUnreadCount(senderId, 0);
    
    await conversation.save({ session });
    
    await session.commitTransaction();
    
    // Populate and return the message
    return await ChatMessage.findById(message._id)
      .populate("sender", "fullName email role")
      .populate("replyTo")
      .lean();
      
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
}

/**
 * Mark messages as read in a conversation
 * @param {Object} params - Parameters
 * @param {string} params.conversationId - Conversation ID
 * @param {string} params.userId - User ID who is marking as read
 * @param {string} params.upToMessageId - Mark all messages up to this ID as read (optional)
 * @returns {Promise<Object>} Updated conversation
 */
export async function markRead({ conversationId, userId, upToMessageId }) {
  const session = await mongoose.startSession();
  
  try {
    session.startTransaction();
    
    // Build query for messages to mark as read
    const messageQuery = {
      conversationId,
      readBy: { $ne: userId }, // Only messages not already read by this user
    };
    
    if (upToMessageId) {
      // Mark only messages up to a specific message ID
      const upToMessage = await ChatMessage.findById(upToMessageId).session(session);
      if (upToMessage) {
        messageQuery.createdAt = { $lte: upToMessage.createdAt };
      }
    }
    
    // Update messages to add user to readBy array
    await ChatMessage.updateMany(
      messageQuery,
      { $addToSet: { readBy: userId } },
      { session }
    );
    
    // Reset unread count for this user in the conversation
    const conversation = await ChatConversation.findById(conversationId).session(session);
    
    if (!conversation) {
      throw new ApiError(404, "Conversation not found");
    }
    
    conversation.setUnreadCount(userId, 0);
    await conversation.save({ session });
    
    await session.commitTransaction();
    
    return conversation;
    
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
}

/**
 * List conversations for a user with pagination
 * @param {Object} params - Parameters
 * @param {string} params.userId - User ID
 * @param {number} params.limit - Limit per page (default: 20)
 * @param {string} params.cursor - Cursor for pagination (updatedAt or _id)
 * @param {string} params.search - Search query (optional)
 * @returns {Promise<Object>} Paginated conversations
 */
export async function listConversationsForUser({ userId, limit = 20, cursor, search }) {
  const matchStage = {
    "participants.user": new mongoose.Types.ObjectId(userId),
  };
  
  // Add cursor-based pagination
  if (cursor) {
    // Try to parse as ObjectId first, then as date
    let cursorValue;
    if (mongoose.Types.ObjectId.isValid(cursor)) {
      cursorValue = new mongoose.Types.ObjectId(cursor);
      matchStage._id = { $lt: cursorValue };
    } else {
      cursorValue = new Date(cursor);
      matchStage.updatedAt = { $lt: cursorValue };
    }
  }
  
  const pipeline = [
    { $match: matchStage },
    
    // Lookup last message
    {
      $lookup: {
        from: "chatmessages",
        localField: "lastMessage",
        foreignField: "_id",
        as: "lastMessageData",
        pipeline: [
          {
            $lookup: {
              from: "users",
              localField: "sender",
              foreignField: "_id",
              as: "senderData",
              pipeline: [
                { $project: { fullName: 1, email: 1, role: 1 } }
              ]
            }
          },
          { $unwind: { path: "$senderData", preserveNullAndEmptyArrays: true } },
        ]
      }
    },
    
    // Lookup participant users
    {
      $lookup: {
        from: "users",
        localField: "participants.user",
        foreignField: "_id",
        as: "participantUsers",
        pipeline: [
          { $project: { fullName: 1, email: 1, role: 1 } }
        ]
      }
    },
    
    // Add search functionality if provided
    ...(search ? [
      {
        $match: {
          $or: [
            { name: { $regex: search, $options: "i" } },
            { "participantUsers.fullName": { $regex: search, $options: "i" } },
            { "participantUsers.email": { $regex: search, $options: "i" } },
          ]
        }
      }
    ] : []),
    
    // Sort by updatedAt descending
    { $sort: { updatedAt: -1, _id: -1 } },
    
    // Limit results
    { $limit: limit + 1 }, // +1 to check if there are more results
    
    // Project final shape
    {
      $project: {
        _id: 1,
        type: { $cond: { if: "$isGroup", then: "group", else: "dm" } },
        name: 1,
        isGroup: 1,
        participants: 1,
        participantUsers: 1,
        lastMessage: { $arrayElemAt: ["$lastMessageData", 0] },
        unreadCount: { $ifNull: [`$unread.${userId}`, 0] },
        updatedAt: 1,
        createdAt: 1,
      }
    }
  ];
  
  const results = await ChatConversation.aggregate(pipeline);
  
  // Check if there are more results
  const hasMore = results.length > limit;
  if (hasMore) {
    results.pop(); // Remove the extra result
  }
  
  // Determine next cursor
  let nextCursor = null;
  if (hasMore && results.length > 0) {
    const lastItem = results[results.length - 1];
    nextCursor = lastItem.updatedAt.toISOString();
  }
  
  return {
    conversations: results,
    pagination: {
      hasMore,
      nextCursor,
      limit,
    }
  };
}

/**
 * List messages in a conversation with pagination
 * @param {Object} params - Parameters
 * @param {string} params.conversationId - Conversation ID
 * @param {number} params.limit - Limit per page (default: 20)
 * @param {string} params.cursor - Cursor for pagination (createdAt or _id)
 * @returns {Promise<Object>} Paginated messages
 */
export async function listMessages({ conversationId, limit = 20, cursor }) {
  const query = { conversationId };
  
  // Add cursor-based pagination
  if (cursor) {
    // Try to parse as ObjectId first, then as date
    if (mongoose.Types.ObjectId.isValid(cursor)) {
      query._id = { $lt: new mongoose.Types.ObjectId(cursor) };
    } else {
      query.createdAt = { $lt: new Date(cursor) };
    }
  }
  
  // Get messages with pagination
  const messages = await ChatMessage.find(query)
    .populate("sender", "fullName email role")
    .populate("replyTo")
    .sort({ createdAt: -1, _id: -1 })
    .limit(limit + 1) // +1 to check if there are more results
    .lean();
  
  // Check if there are more results
  const hasMore = messages.length > limit;
  if (hasMore) {
    messages.pop(); // Remove the extra result
  }
  
  // Reverse to show oldest first (for chat display)
  const orderedMessages = messages.reverse();
  
  // Determine next cursor
  let nextCursor = null;
  if (hasMore && messages.length > 0) {
    const lastItem = messages[messages.length - 1];
    nextCursor = lastItem.createdAt.toISOString();
  }
  
  return {
    messages: orderedMessages,
    pagination: {
      hasMore,
      nextCursor,
      limit,
    }
  };
}

/**
 * Check if a user can access a conversation
 * @param {string} userId - User ID
 * @param {Object} conversation - Conversation object
 * @returns {boolean} Whether user can access the conversation
 */
export function canAccessConversation(userId, conversation) {
  if (!conversation) {
    return false;
  }
  
  return conversation.hasParticipant(userId);
}

/**
 * Get conversation by ID with access check
 * @param {string} conversationId - Conversation ID
 * @param {string} userId - User ID requesting access
 * @returns {Promise<Object>} Conversation object
 * @throws {ApiError} If not found or access denied
 */
export async function getConversationWithAccess(conversationId, userId) {
  const conversation = await ChatConversation.findById(conversationId)
    .populate("participants.user", "fullName email role")
    .populate("lastMessage");
  
  if (!conversation) {
    throw new ApiError(404, "Conversation not found");
  }
  
  if (!canAccessConversation(userId, conversation)) {
    throw new ApiError(403, "Access denied to this conversation");
  }
  
  return conversation;
}

/**
 * Get online users in a conversation
 * @param {string} conversationId - Conversation ID
 * @param {Object} io - Socket.io instance
 * @returns {Array} Array of online user IDs
 */
export function getOnlineUsersInConversation(conversationId, io) {
  const room = io.sockets.adapter.rooms.get(`conv:${conversationId}`);
  if (!room) return [];
  
  const onlineUsers = [];
  for (const socketId of room) {
    const socket = io.sockets.sockets.get(socketId);
    if (socket && socket.userId) {
      onlineUsers.push(socket.userId);
    }
  }
  
  return [...new Set(onlineUsers)]; // Remove duplicates
}
