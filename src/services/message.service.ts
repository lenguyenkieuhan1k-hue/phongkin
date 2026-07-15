import {
  createMessage,
  getMessages,
  getMessage,
  recallMessage as recallMessage_,
  deleteMessage as deleteMessage_,
  Message,
} from '@/lib/messages';

export interface SendMessageParams {
  roomId: string;
  senderId: string;
  senderDarkId: string;
  senderHandle: string;
  type: 'TEXT' | 'IMAGE' | 'VIDEO' | 'FILE' | 'VOICE' | 'SYSTEM';
  body?: string;
  attachmentId?: string;
  attachments?: Array<{
    id: string;
    storageKey: string;
    mimeType: string;
    byteSize: string | number;
    messageId?: string;
  }>;
}

export interface SendMessageResult {
  success: true;
  message: Message;
}

export interface SendMessageError {
  success: false;
  error: string;
}

export async function sendMessageService(
  params: SendMessageParams
): Promise<SendMessageResult | SendMessageError> {
  try {
    const message = createMessage(params);
    return { success: true, message };
  } catch (error) {
    console.error('Failed to send message:', error);
    return {
      success: false,
      error: 'Failed to send message. Please try again.',
    };
  }
}

export async function getMessagesService(
  roomId: string,
  cursor?: string,
  limit: number = 50
): Promise<Message[]> {
  return getMessages(roomId, limit);
}

export async function getRecentMessagesService(
  roomId: string,
  limit: number = 50
): Promise<Message[]> {
  return getMessages(roomId, limit);
}

export async function recallMessageService(
  messageId: string,
  senderId: string
): Promise<{ success: boolean; error?: string }> {
  const message = getMessage(messageId);

  if (!message) {
    return { success: false, error: 'Message not found.' };
  }

  if (message.senderId !== senderId) {
    return { success: false, error: 'You can only recall your own messages.' };
  }

  if (message.recalledAt) {
    return { success: false, error: 'Message already recalled.' };
  }

  const success = recallMessage_(messageId);
  return success ? { success: true } : { success: false, error: 'Failed to recall message.' };
}

export async function deleteMessageService(
  messageId: string,
  senderId: string
): Promise<{ success: boolean; error?: string }> {
  const message = getMessage(messageId);

  if (!message) {
    return { success: false, error: 'Message not found.' };
  }

  if (message.senderId !== senderId) {
    return { success: false, error: 'You can only delete your own messages.' };
  }

  const success = deleteMessage_(messageId);
  return success ? { success: true } : { success: false, error: 'Failed to delete message.' };
}
