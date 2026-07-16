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
  senderGuestId: string;
  senderHandle: string;
  type: 'TEXT' | 'IMAGE' | 'VIDEO' | 'FILE' | 'VOICE' | 'SYSTEM';
  body?: string;
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
    const message = await createMessage({
      roomId: params.roomId,
      senderGuestId: params.senderGuestId,
      senderHandle: params.senderHandle,
      type: params.type,
      body: params.body,
      attachments: params.attachments,
    });
    return { success: true, message };
  } catch (error) {
    console.error('Failed to send message:', error);
    return {
      success: false,
      error: 'Failed to send message. Please try again.',
    };
  }
}

export async function getRecentMessagesService(
  roomId: string,
  limit: number = 50
): Promise<Message[]> {
  return getMessages(roomId, limit);
}

export async function recallMessageService(
  messageId: string,
  senderGuestId: string
): Promise<{ success: boolean; error?: string }> {
  const message = getMessage(messageId);

  if (!message) {
    return { success: false, error: 'Message not found.' };
  }

  if (message.senderGuestId !== senderGuestId) {
    return { success: false, error: 'Bạn chỉ có thể thu hồi tin nhắn của mình.' };
  }

  if (message.recalledAt) {
    return { success: false, error: 'Tin nhắn đã được thu hồi.' };
  }

  const success = await recallMessage_(messageId);
  return success ? { success: true } : { success: false, error: 'Failed to recall message.' };
}

export async function deleteMessageService(
  messageId: string,
  senderGuestId: string
): Promise<{ success: boolean; error?: string }> {
  const message = getMessage(messageId);

  if (!message) {
    return { success: false, error: 'Message not found.' };
  }

  if (message.senderGuestId !== senderGuestId) {
    return { success: false, error: 'Bạn chỉ có thể xóa tin nhắn của mình.' };
  }

  const success = await deleteMessage_(messageId);
  return success ? { success: true } : { success: false, error: 'Failed to delete message.' };
}
