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
  relationshipIntention?: 'marriage_minded' | 'long_term' | 'building_commitment' | 'discovering' | 'friendship_first';
  voiceIntroUrl?: string | null;
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
  relationshipIntention?: 'marriage_minded' | 'long_term' | 'building_commitment' | 'discovering' | 'friendship_first';
  voiceIntroUrl?: string | null;
  compatibilityReasons?: string[];
  compatibilityScore?: number;
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
  journeyStage?: 'spark' | 'glow' | 'flame' | 'ready_to_meet' | 'date_planned';
  relationshipIntention?: string;
  voiceIntroUrl?: string | null;
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
