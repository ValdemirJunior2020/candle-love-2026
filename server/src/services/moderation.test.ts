import { describe, expect, it } from "vitest";
import { moderateMessage } from "./moderation.js";

describe("moderateMessage", () => {
  it("allows a kind message", () => expect(moderateMessage("You have a beautiful smile.", 0).allowed).toBe(true));
  it("blocks profanity", () => expect(moderateMessage("This is shit", 3).reason).toBe("profanity"));
  it("blocks phone numbers for new accounts", () => expect(moderateMessage("Text me at 305-555-1212", 0).reason).toBe("contact"));
  it("allows contact details for trusted accounts", () => expect(moderateMessage("Text me at 305-555-1212", 2).allowed).toBe(true));
  it("blocks outside payment requests", () => expect(moderateMessage("Send me money on Cash App", 3).allowed).toBe(false));
});
