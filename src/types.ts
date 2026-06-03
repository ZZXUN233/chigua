export type WatermelonStatus = 'unripe' | 'ripe' | 'overripe';

export interface WatermelonRecord {
  id: string;
  name: string;
  soundScore: number;
  lookScore: number;
  overallScore: number;
  frequency: number;
  stripeContrast: number; // 0 to 1
  greenness: number; // 0 to 1
  ripenessStatus: WatermelonStatus;
  ratedStars: number;
  message: string;
  timestamp: number;
  photoUrl?: string; // base64 representation of scanned image, or watermelon avatar
  likes: number;
  location?: string;
  mood?: string;
}
