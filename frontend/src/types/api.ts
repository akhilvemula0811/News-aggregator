export interface Article {
  id: string;
  title: string;
  description: string | null;
  content: string | null;
  url: string;
  urlToImage: string | null;
  publishedAt: string;
  author: string | null;
  sourceName: string;
  sourceUrl: string;
}

export interface Claim {
  id: string;
  claimText: string;
  status: 'CORROBORATED' | 'SINGLE_SOURCE' | 'DISPUTED';
  sourcesCount: number;
}

export interface TimelineEvent {
  id: string;
  eventTime: string;
  eventTitle: string;
  eventDescription: string;
  sourceUrl: string | null;
}

export interface StoryDiff {
  id: string;
  diffDate: string;
  diffContent: string;
}

export interface Story {
  id: string;
  title: string;
  summary: string;
  credibilityScore: 'VERIFIED' | 'UNVERIFIED' | 'DISPUTED';
  primaryCategory: string;
  secondaryCategory: string | null;
  isDeveloping: boolean;
  createdAt: string;
  updatedAt: string;
  sources: string[];
  imageUrl: string | null;
  articlesCount: number;
  personalizationScore?: number;
}

export interface StoryDetails {
  id: string;
  title: string;
  summary: string;
  credibilityScore: 'VERIFIED' | 'UNVERIFIED' | 'DISPUTED';
  primaryCategory: string;
  secondaryCategory: string | null;
  isDeveloping: boolean;
  createdAt: string;
  updatedAt: string;
  articles: Article[];
  claims: Claim[];
  timeline: TimelineEvent[];
  diffs: StoryDiff[];
}

export interface UserProfile {
  interests: Record<string, number>;
  savedStories: Story[];
}
