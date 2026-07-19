import { io, type Socket } from 'socket.io-client';
import { appConfig } from './config';
import { getAccessToken } from './api';

export function connectConversationSocket(conversationId: string, onMessage: (message: unknown) => void): Socket | null {
  const token = getAccessToken();
  if (!token || appConfig.demoMode) return null;
  const socket = io(appConfig.apiUrl, {
    transports: ['websocket'],
    auth: { token },
    reconnectionAttempts: 5,
    timeout: 10000
  });
  socket.on('connect', () => socket.emit('conversation:join', conversationId));
  socket.on('message:new', onMessage);
  return socket;
}
