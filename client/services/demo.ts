import type { ChatMessage, Gift, Match, Profile, User } from '@/types/models';
export const demoUser: User = { id: 'demo-user', email: 'maya@example.com', displayName: 'Maya', birthDate: '1998-05-12', verified: true, trustLevel: 2, bio: 'Lover of cozy evenings, deep conversation, and finding that spark.', city: 'Miami, FL', photoUrl: null, intentions: 'relationship', interests: ['Book Club', 'Wine Tasting', 'Photography'], promptAnswer: 'A perfect Sunday starts with coffee and ends near the ocean.', profileComplete: true, sparkBalance: 25 };
export const demoProfiles: Profile[] = [
  { id: 'maya', displayName: 'Maya', age: 28, city: 'Miami, FL', photoUrl: null, verified: true, bio: 'Lover of cozy evenings, deep conversation, and finding that spark.', interests: ['Book Club', 'Wine Tasting', 'Photography'], promptAnswer: 'My perfect Sunday starts with coffee and ends near the ocean.' },
  { id: 'sofia', displayName: 'Sofia', age: 30, city: 'Fort Lauderdale, FL', photoUrl: null, verified: true, bio: 'Chef, beach walker, and terrible singer who still loves karaoke.', interests: ['Cooking', 'Beach Walks', 'Live Music'], promptAnswer: 'Kindness when nobody is watching gets my attention.' },
  { id: 'jordan', displayName: 'Jordan', age: 31, city: 'West Palm Beach, FL', photoUrl: null, verified: false, bio: 'Building a calm life with room for travel and laughter.', interests: ['Travel', 'Fitness', 'Design'], promptAnswer: 'Let’s find the best hidden restaurant in town.' }
];
export const demoMatches: Match[] = [
  { id: '1', conversationId: 'maya', userId: 'maya', displayName: 'Maya', verified: true, photoUrl: null, bio: 'Matched 12 minutes ago', unlockedAt: null, freeMessageLimit: 6, messageCount: 3 },
  { id: '2', conversationId: 'jordan', userId: 'jordan', displayName: 'Jordan', verified: true, photoUrl: null, bio: 'Your candle is lit', unlockedAt: new Date().toISOString(), freeMessageLimit: 6, messageCount: 9 }
];
export const demoMessages: Record<string, ChatMessage[]> = {
  maya: [
    { id: 'm1', senderId: 'maya', content: 'Your profile made me smile. What book are you reading?', createdAt: new Date(Date.now() - 300000).toISOString() },
    { id: 'm2', senderId: 'demo-user', content: 'That is a much better opener than “hey.” I just started a mystery novel.', createdAt: new Date(Date.now() - 180000).toISOString() },
    { id: 'm3', senderId: 'maya', content: 'Then we already have something to talk about.', createdAt: new Date(Date.now() - 60000).toISOString() }
  ],
  jordan: [{ id: 'j1', senderId: 'jordan', content: 'Our candle is lit. How was your day?', createdAt: new Date().toISOString() }]
};
export const demoGifts: Gift[] = [
  { id: 'g1', slug: 'royal-panda', name: 'Royal Panda', cost: 5, imagePath: 'royal-panda.png' },
  { id: 'g2', slug: 'crystal-heart', name: 'Crystal Heart', cost: 8, imagePath: 'crystal-heart.png' },
  { id: 'g3', slug: 'love-bot', name: 'Love Bot', cost: 10, imagePath: 'love-bot.png' },
  { id: 'g4', slug: 'cozy-mushroom', name: 'Cozy Mushroom', cost: 12, imagePath: 'cozy-mushroom.png' },
  { id: 'g5', slug: 'sky-date', name: 'Sky Date', cost: 18, imagePath: 'sky-date.png' }
];
