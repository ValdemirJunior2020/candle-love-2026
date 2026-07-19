import "fastify";
import type { AuthUser } from "./types.js";

export {};

declare module "fastify" {
  interface FastifyRequest {
    authUser?: AuthUser;
    rawBody?: Buffer;
  }
}
