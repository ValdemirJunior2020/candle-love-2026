import type { ModerationResult } from "../types.js";

const profanity = ["fuck", "shit", "bitch", "asshole", "cunt", "dick", "bastard"];
const abusePatterns = [
  /\b(kill|hurt|rape|attack)\s+(you|yourself|them)\b/i,
  /\bworthless\b/i,
  /\bi hate (your|you)\b/i
];
const scamPatterns = [
  /\b(gift\s*card|wire transfer|western union|crypto|bitcoin|investment opportunity)\b/i,
  /\b(send|transfer|pay)\s+(me|money|funds|cash)\b/i,
  /\b(telegram|whatsapp|signal)\b/i
];
const contactPatterns = [
  /https?:\/\//i,
  /\bwww\./i,
  /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i,
  /(?:\+?1[\s.-]?)?(?:\(?\d{3}\)?[\s.-]?)\d{3}[\s.-]?\d{4}/
];
const paymentPatterns = [/\b(cash\s?app|venmo|paypal|zelle|bank account|routing number)\b/i];
const spamPatterns = [/(.)\1{10,}/, /\b(buy now|limited time|click here)\b/i];

export function moderateMessage(input: string, trustLevel = 0): ModerationResult {
  const sanitized = input.replace(/\s+/g, " ").trim();
  const lower = sanitized.toLowerCase();
  const flags: string[] = [];

  if (profanity.some((word) => new RegExp(`\\b${word}\\b`, "i").test(lower))) flags.push("profanity");
  if (abusePatterns.some((pattern) => pattern.test(sanitized))) flags.push("abuse");
  if (scamPatterns.some((pattern) => pattern.test(sanitized))) flags.push("scam");
  if (paymentPatterns.some((pattern) => pattern.test(sanitized))) flags.push("payment");
  if (spamPatterns.some((pattern) => pattern.test(sanitized))) flags.push("spam");
  if (trustLevel < 2 && contactPatterns.some((pattern) => pattern.test(sanitized))) flags.push("contact");

  const reason = flags[0] as ModerationResult["reason"] | undefined;
  return { allowed: flags.length === 0, reason, flags, sanitized };
}

export const moderationMessage: Record<NonNullable<ModerationResult["reason"]>, string> = {
  profanity: "Please keep Candle Love respectful and clean.",
  abuse: "This message looks threatening or abusive and was not sent.",
  scam: "This message looks like a scam or an attempt to move the conversation off-platform.",
  contact: "New accounts cannot share links, phone numbers, or email addresses yet.",
  payment: "Requests for outside payments are not allowed.",
  spam: "This message looks like spam and was not sent."
};
