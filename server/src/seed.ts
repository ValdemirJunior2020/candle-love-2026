import { sql } from "./db.js";
import { hashPassword } from "./services/password.js";

const demoPassword = await hashPassword("CandleLove123!");
const demoUsers = [
  { email: "maya@example.com", name: "Maya", birth: "1998-05-12", city: "Miami", bio: "Lover of cozy evenings, deep conversation, and finding that spark.", interests: ["Book Club", "Wine Tasting", "Photography"], photo: "/profiles/maya.png" },
  { email: "jordan@example.com", name: "Jordan", birth: "1995-11-03", city: "Fort Lauderdale", bio: "Coffee walks, live music, and thoughtful conversations.", interests: ["Music", "Coffee", "Travel"], photo: null },
  { email: "sofia@example.com", name: "Sofia", birth: "1997-02-22", city: "Boca Raton", bio: "Building a peaceful life and looking for someone kind to share it with.", interests: ["Cooking", "Beach", "Art"], photo: null }
];

for (const item of demoUsers) {
  await sql.begin(async (tx) => {
    const [user] = await tx<{ id: string }[]>`
      INSERT INTO users (email, password_hash, display_name, birth_date, verified, trust_level)
      VALUES (${item.email}, ${demoPassword}, ${item.name}, ${item.birth}, TRUE, 2)
      ON CONFLICT (email) DO UPDATE SET display_name = EXCLUDED.display_name
      RETURNING id
    `;
    if (!user) return;
    await tx`
      INSERT INTO profiles (user_id, bio, city, photo_url, interests, prompt_answer, profile_complete)
      VALUES (${user.id}, ${item.bio}, ${item.city}, ${item.photo}, ${item.interests}, 'Kindness is the fastest way to my heart.', TRUE)
      ON CONFLICT (user_id) DO UPDATE SET bio = EXCLUDED.bio, city = EXCLUDED.city, photo_url = EXCLUDED.photo_url, interests = EXCLUDED.interests, profile_complete = TRUE
    `;
    await tx`INSERT INTO wallets (user_id, balance) VALUES (${user.id}, 100) ON CONFLICT (user_id) DO NOTHING`;
  });
}

const gifts = [
  ["royal-panda", "Royal Panda", 5, "/gifts/royal-panda.png"],
  ["crystal-heart", "Crystal Heart", 8, "/gifts/crystal-heart.png"],
  ["love-bot", "Love Bot", 10, "/gifts/love-bot.png"],
  ["cozy-mushroom", "Cozy Mushroom", 12, "/gifts/cozy-mushroom.png"],
  ["sky-date", "Sky Date", 18, "/gifts/sky-date.png"]
] as const;
for (const gift of gifts) {
  await sql`INSERT INTO gifts (slug, name, cost, image_path) VALUES (${gift[0]}, ${gift[1]}, ${gift[2]}, ${gift[3]}) ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, cost = EXCLUDED.cost, image_path = EXCLUDED.image_path`;
}
console.log("Seeded demo users and gifts. Demo password: CandleLove123!");
await sql.end();
