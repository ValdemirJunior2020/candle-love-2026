export type AuthUser = {
  id: string;
  email: string;
};

export type ModerationResult = {
  allowed: boolean;
  reason?: "profanity" | "abuse" | "scam" | "contact" | "payment" | "spam";
  flags: string[];
  sanitized: string;
};
