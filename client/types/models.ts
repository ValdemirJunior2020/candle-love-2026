export type ProfilePhoto = {
  id: string;
  photoUrl: string;
  mimeType?: string;
  position: number;
  createdAt?: string;
};

export type User = {
  id: string;
  email: string;
  displayName: string;
  birthDate?: string;
  verified?: boolean;
  trustLevel?: number;
  bio?: string;
  city?: string;
  photoUrl?: string | null;
  photos?: ProfilePhoto[];
  intentions?: 'relationship' | 'friendship' | 'unsure';
  interests?: string[];
  promptAnswer?: string;
  profileComplete?: boolean;
  sparkBalance?: number;
};

export type Profile = {
  id: string;
  displayName: string;
  age: number;
  city: string;
  photoUrl?: string | null;
  photos?: ProfilePhoto[];
  bio: string;
  interests: string[];
  verified: boolean;
  promptAnswer: string;
};

export type Match = {
  id: string;
  conversationId: string;
  unlockedAt?: string | null;
  freeMessageLimit: number;
  userId: string;
  displayName: string;
  verified: boolean;
  photoUrl?: string | null;
  photos?: ProfilePhoto[];
  bio: string;
  messageCount: number;
};

export type ChatMessage = {
  id: string;
  senderId: string;
  content: string;
  createdAt: string;
  giftId?: string | null;
  giftName?: string | null;
  giftImage?: string | null;
};

export type Gift = {
  id: string;
  slug: string;
  name: string;
  cost: number;
  imagePath: string;
};
