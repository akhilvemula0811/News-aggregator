import { Story, StoryDetails, UserProfile } from '../types/api';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5000/api';

/**
 * Safely generate or retrieve an anonymous device ID for tracking personalization
 */
export function getDeviceId(): string {
  if (typeof window === 'undefined') {
    return 'server_environment';
  }

  let deviceId = localStorage.getItem('ai_news_device_id');
  if (!deviceId) {
    deviceId = `dev_${Math.random().toString(36).substring(2, 15)}_${Date.now()}`;
    localStorage.setItem('ai_news_device_id', deviceId);
  }
  return deviceId;
}

/**
 * Fetch stories feed with filtering and personalization re-ranking
 */
export async function fetchStories(params: {
  category?: string;
  search?: string;
  state?: string;
  language?: string;
  page?: number;
  limit?: number;
}): Promise<{ stories: Story[]; pagination: { total: number; page: number; limit: number; totalPages: number } }> {
  try {
    const url = new URL(`${API_BASE_URL}/stories`);
    const deviceId = getDeviceId();
    
    if (deviceId && deviceId !== 'server_environment') {
      url.searchParams.append('deviceId', deviceId);
    }
    if (params.category) url.searchParams.append('category', params.category);
    if (params.search) url.searchParams.append('search', params.search);
    if (params.state) url.searchParams.append('state', params.state);
    if (params.language) url.searchParams.append('language', params.language);
    if (params.page) url.searchParams.append('page', params.page.toString());
    if (params.limit) url.searchParams.append('limit', params.limit.toString());

    const res = await fetch(url.toString(), { cache: 'no-store' });
    if (!res.ok) {
      throw new Error(`Failed to fetch stories: ${res.statusText}`);
    }
    return await res.json();
  } catch (error) {
    console.error('[API CLIENT] fetchStories error:', error);
    return { stories: [], pagination: { total: 0, page: 1, limit: 10, totalPages: 1 } };
  }
}

/**
 * Fetch category-grouped stories feed
 */
export async function fetchGroupedStories(params: {
  state?: string;
  language?: string;
}): Promise<{ stories: Record<string, Story[]> }> {
  try {
    const url = new URL(`${API_BASE_URL}/stories`);
    url.searchParams.append('grouped', 'true');
    const deviceId = getDeviceId();
    
    if (deviceId && deviceId !== 'server_environment') {
      url.searchParams.append('deviceId', deviceId);
    }
    if (params.state) url.searchParams.append('state', params.state);
    if (params.language) url.searchParams.append('language', params.language);

    const res = await fetch(url.toString(), { cache: 'no-store' });
    if (!res.ok) {
      throw new Error(`Failed to fetch grouped stories: ${res.statusText}`);
    }
    return await res.json();
  } catch (error) {
    console.error('[API CLIENT] fetchGroupedStories error:', error);
    return { stories: {} };
  }
}

/**
 * Fetch details of a single story (claims, articles, timeline, diffs)
 */
export async function fetchStoryDetails(id: string, language?: string): Promise<StoryDetails | null> {
  try {
    const url = new URL(`${API_BASE_URL}/stories/${id}`);
    if (language) {
      url.searchParams.append('language', language);
    }
    const res = await fetch(url.toString(), { cache: 'no-store' });
    if (!res.ok) {
      throw new Error(`Failed to fetch story details: ${res.statusText}`);
    }
    return await res.json();
  } catch (error) {
    console.error(`[API CLIENT] fetchStoryDetails error for ID ${id}:`, error);
    return null;
  }
}

/**
 * Log engagement (click/view) to update personalization weights
 */
export async function logEngagement(storyId: string): Promise<void> {
  try {
    const deviceId = getDeviceId();
    if (!deviceId || deviceId === 'server_environment') return;

    await fetch(`${API_BASE_URL}/stories/${storyId}/engagement`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ deviceId }),
    });
  } catch (error) {
    console.error(`[API CLIENT] logEngagement error for ID ${storyId}:`, error);
  }
}

/**
 * Toggle bookmark state of a story
 */
export async function toggleBookmark(storyId: string): Promise<boolean> {
  try {
    const deviceId = getDeviceId();
    if (!deviceId || deviceId === 'server_environment') return false;

    const res = await fetch(`${API_BASE_URL}/stories/${storyId}/bookmark`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ deviceId }),
    });
    
    if (res.ok) {
      const data = await res.json();
      return data.bookmarked;
    }
  } catch (error) {
    console.error(`[API CLIENT] toggleBookmark error for ID ${storyId}:`, error);
  }
  return false;
}

/**
 * Fetch current personalization profile (category weights & saved stories)
 */
export async function fetchPersonalization(language?: string): Promise<UserProfile> {
  try {
    const deviceId = getDeviceId();
    if (!deviceId || deviceId === 'server_environment') {
      return { interests: {}, savedStories: [] };
    }

    const url = new URL(`${API_BASE_URL}/personalization`);
    url.searchParams.append('deviceId', deviceId);
    if (language) {
      url.searchParams.append('language', language);
    }

    const res = await fetch(url.toString(), { cache: 'no-store' });
    if (!res.ok) {
      throw new Error(`Failed to fetch profile: ${res.statusText}`);
    }
    return await res.json();
  } catch (error) {
    console.error('[API CLIENT] fetchPersonalization error:', error);
    return { interests: {}, savedStories: [] };
  }
}
