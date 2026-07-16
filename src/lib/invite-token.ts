import { customAlphabet } from 'nanoid';

const INVITE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
const generateInviteToken = customAlphabet(INVITE_ALPHABET, 18);

export function createInviteToken(): string {
  return generateInviteToken();
}
