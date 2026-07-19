import type { Server } from "socket.io";

let io: Server | undefined;
export function setRealtimeServer(server: Server): void { io = server; }
export function emitConversationMessage(conversationId: string, payload: unknown): void {
  io?.to(`conversation:${conversationId}`).emit("message:new", payload);
}
