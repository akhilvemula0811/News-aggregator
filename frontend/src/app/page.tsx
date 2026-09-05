'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { fetchStories, fetchPersonalization, fetchGroupedStories } from '../lib/api';
import { Story } from '../types/api';
import CategoryBar from '../components/CategoryBar';
import StoryCard from '../components/StoryCard';
import { t } from '../lib/translations';

// List of Indian states for Regional Pulse filter
const INDIAN_STATES = [
  'National Coverage', 'Maharashtra', 'Delhi', 'Karnataka', 'Tamil Nadu',
  'Andhra Pradesh', 'Telangana', 'Uttar Pradesh', 'West Bengal', 'Kerala',
  'Gujarat', 'Rajasthan', 'Punjab', 'Haryana', 'Bihar', 'Madhya Pradesh',
  'Arunachal Pradesh', 'Assam', 'Chhattisgarh', 'Goa', 'Himachal Pradesh',
  'Jharkhand', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha',
  'Sikkim', 'Tripura', 'Uttarakhand'
];

// List of languages supported
const LANGUAGES = [
  { code: 'en', name: 'English', indicTrans: 'eng_Latn' },
  { code: 'hi', name: 'Hindi (हिंदी)', indicTrans: 'hin_Deva' },
  { code: 'te', name: 'Telugu (తెలుగు)', indicTrans: 'tel_Telu' },
  { code: 'ta', name: 'Tamil (தமிழ்)', indicTrans: 'tam_Taml' },
  { code: 'mr', name: 'Marathi (मराठी)', indicTrans: 'mar_Deva' },
  { code: 'bn', name: 'Bengali (বাংলা)', indicTrans: 'ben_Beng' },
  { code: 'kn', name: 'Kannada (ಕನ್ನಡ)', indicTrans: 'kan_Knda' },
  { code: 'ml', name: 'Malayalam (മലയാളം)', indicTrans: 'mal_Mlym' },
  { code: 'gu', name: 'Gujarati (ગુજરાતી)', indicTrans: 'guj_Gujr' },
  { code: 'pa', name: 'Punjabi (ਪੰਜਾਬੀ)', indicTrans: 'pan_Guru' },
  { code: 'or', name: 'Odia (ଓଡ଼ିଆ)', indicTrans: 'ory_Orya' },
  { code: 'as', name: 'Assamese (অસમীয়া)', indicTrans: 'asm_Beng' },
  { code: 'mni', name: 'Manipuri (ꯃꯩꯇꯩꯂꯣꯟ)', indicTrans: 'mni_Beng' },
  { code: 'lus', name: 'Mizo (Mizo ṭawng)', indicTrans: 'lus_Latn' },
  { code: 'kha', name: 'Khasi (Ka Ktien Khasi)', indicTrans: 'kha_Latn' },
  { code: 'gom', name: 'Konkani (कोंकणी)', indicTrans: 'gom_Deva' },
  { code: 'ne', name: 'Nepali (नेपाली)', indicTrans: 'npi_Deva' },
  { code: 'ur', name: 'Urdu (اُردُو)', indicTrans: 'urd_Arab' }
];

const CATEGORY_DISPLAY_MAP: Record<string, string> = {
  'National News': 'National News',
  'Politics': 'Politics',
  'Stocks/Business': 'Stocks & Business',
  'AI & Tech Deep Dives': 'AI & Tech Deep Dives',
  'Startup & Funding Tracker': 'Startup & Funding',
  'World News': 'World News',
  'Technology': 'Technology',
  'Science': 'Science',
  'Sports': 'Sports',
  'Jobs & Career': 'Jobs & Career',
  'Movies/Entertainment': 'Movies & Ent.',
  'Health': 'Health',
  'Education': 'Education',
  'Crime': 'Crime',
  'Automobile': 'Automobile',
  'Travel': 'Travel',
  'Weather': 'Weather',
  'Food': 'Food'
};

function FeedContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // Filter states
  const [stories, setStories] = useState<Story[]>([]);
  const [groupedStories, setGroupedStories] = useState<Record<string, Story[]>>({});
  const [orderedCategories, setOrderedCategories] = useState<string[]>([]);
  const [savedStoryIds, setSavedStoryIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [triggerCount, setTriggerCount] = useState(0);

  // Pagination states
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Extract query filters from URL
  const selectedCategory = searchParams.get('category') || '';
  const searchQuery = searchParams.get('search') || '';
  const selectedState = searchParams.get('state') || '';
  const selectedLanguage = searchParams.get('language') || '';

  // Load Saved stories to mark cards
  useEffect(() => {
    async function loadSaved() {
      const data = await fetchPersonalization();
      if (data && data.savedStories) {
        setSavedStoryIds(data.savedStories.map(s => s.id));
      }
    }
    loadSaved();
  }, [triggerCount]);

  // Background feed auto-refresh loop (every 15 minutes)
  useEffect(() => {
    const interval = setInterval(() => {
      console.log('[HomeFeed] Automatically refreshing feed...');
      setTriggerCount(prev => prev + 1);
    }, 15 * 60 * 1000); // 15 minutes

    return () => clearInterval(interval);
  }, []);

  // Load feed based on categories, search, language, page (state filtration decoupled from home feed)
  useEffect(() => {
    async function loadFeed() {
      setLoading(true);
      if (selectedCategory === '' && !searchQuery) {
        const data = await fetchGroupedStories({
          language: selectedLanguage,
        });
        if (data && data.stories) {
          // Identify categories with stories that are configured for display
          const activeCats = Object.keys(CATEGORY_DISPLAY_MAP).filter(
            cat => data.stories[cat] && data.stories[cat].length > 0
          );

          if (activeCats.length > 0) {
            // Read and advance session refresh count so every refresh showcases a new category first
            let refreshCount = 0;
            try {
              const currentCountStr = sessionStorage.getItem('ai_news_home_refresh_idx');
              refreshCount = currentCountStr ? parseInt(currentCountStr, 10) : 0;
              sessionStorage.setItem('ai_news_home_refresh_idx', String(refreshCount + 1));
            } catch {
              refreshCount = Math.floor(Math.random() * activeCats.length);
            }

            // Guaranteed rotation: top category rotates on every refresh
            const topCatIndex = refreshCount % activeCats.length;
            const topCategory = activeCats[topCatIndex];
            const otherCategories = activeCats.filter((_, idx) => idx !== topCatIndex);

            // Dynamically shuffle the remaining categories so the rest of the feed is also fresh
            for (let i = otherCategories.length - 1; i > 0; i--) {
              const j = Math.floor(Math.random() * (i + 1));
              [otherCategories[i], otherCategories[j]] = [otherCategories[j], otherCategories[i]];
            }

            const newOrderedCats = [topCategory, ...otherCategories];
            setOrderedCategories(newOrderedCats);

            // Refresh & randomize the present stories within each category
            const refreshedGrouped: Record<string, Story[]> = {};
            for (const cat of activeCats) {
              const list = [...(data.stories[cat] || [])];
              for (let i = list.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [list[i], list[j]] = [list[j], list[i]];
              }
              refreshedGrouped[cat] = list;
            }
            setGroupedStories(refreshedGrouped);
          } else {
            setOrderedCategories([]);
            setGroupedStories({});
          }
        } else {
          setOrderedCategories([]);
          setGroupedStories({});
        }
      } else {
        const data = await fetchStories({
          category: selectedCategory,
          search: searchQuery,
          language: selectedLanguage,
          page,
          limit: 20,
        });

        if (data && data.stories) {
          setStories(data.stories);
          setTotalPages(data.pagination.totalPages || 1);
        }
      }
      setLoading(false);
    }
    loadFeed();
  }, [selectedCategory, searchQuery, selectedLanguage, page, triggerCount]);

  const selectCategory = (category: string) => {
    setPage(1);
    const params = new URLSearchParams(searchParams.toString());
    if (category) {
      params.set('category', category);
    } else {
      params.delete('category');
      // When resetting to All News, trigger refresh count rotation
      setTriggerCount(prev => prev + 1);
    }
    router.push(`/?${params.toString()}`);
  };

  return (
    <div className="space-y-6">

      {/* Category Horizontal Filter Bar */}
      <CategoryBar
        selectedCategory={selectedCategory}
        onSelectCategory={selectCategory}
      />

      {/* FEED SECTION */}
      <section className="space-y-6">
        {/* Header Banner */}
        {searchQuery && (
          <div className="flex items-center justify-between border-b border-border pb-3">
            <h2 className="text-sm font-semibold text-muted">
              Search results for: &quot;<span className="text-foreground font-bold">{searchQuery}</span>&quot;
            </h2>
            <button
              onClick={() => router.push('/')}
              className="text-xs text-primary hover:underline"
            >
              Clear Search
            </button>
          </div>
        )}

        {/* Loading view */}
        {loading ? (
          <div className="space-y-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="animate-pulse border border-border bg-card rounded-2xl p-5 space-y-4 h-48">
                <div className="h-4 bg-muted-light rounded w-1/4"></div>
                <div className="h-6 bg-muted-light rounded w-3/4"></div>
                <div className="space-y-2">
                  <div className="h-3 bg-muted-light rounded w-full"></div>
                  <div className="h-3 bg-muted-light rounded w-5/6"></div>
                </div>
              </div>
            ))}
          </div>
        ) : selectedCategory === '' && !searchQuery ? (
          /* Portal Grouped Layout */
          orderedCategories.length === 0 ? (
            /* Empty State */
            <div className="text-center py-16 border border-dashed border-border rounded-2xl bg-card/40 space-y-4">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-12 h-12 text-muted mx-auto">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 7.5h.008v.008H12V7.5ZM12 11.25a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-1.5 0v-4.5a.75.75 0 0 1 .75-.75Z" />
              </svg>
              <div className="max-w-sm mx-auto space-y-2">
                <h3 className="font-bold text-base">{t('No Articles Found', selectedLanguage)}</h3>
                <p className="text-xs text-muted leading-relaxed">
                  {t('The database is currently empty or no stories match the filter.', selectedLanguage)}
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-12">
              {orderedCategories.map((cat) => {
                const catStories = groupedStories[cat] || [];
                if (catStories.length === 0) return null;

                const displayName = CATEGORY_DISPLAY_MAP[cat] || cat;

                return (
                  <section key={cat} className="space-y-5 border-b border-border pb-8 last:border-b-0 last:pb-0">
                    <div className="flex items-center justify-between border-l-4 border-primary pl-3">
                      <h2 className="text-base md:text-lg font-extrabold tracking-tight text-foreground uppercase">
                        {t(displayName, selectedLanguage)}
                      </h2>
                      <button
                        onClick={() => selectCategory(cat)}
                        className="text-xs font-bold text-primary hover:text-primary-hover hover:underline transition cursor-pointer"
                      >
                        {t('View All', selectedLanguage)} →
                      </button>
                    </div>

                    <div className="flex flex-col gap-6">
                      {catStories.map((story) => (
                        <StoryCard
                          key={story.id}
                          story={story}
                          isBookmarkedInitially={savedStoryIds.includes(story.id)}
                        />
                      ))}
                    </div>
                  </section>
                );
              })}
            </div>
          )
        ) : stories.length === 0 ? (
          /* Empty Feed View */
          <div className="text-center py-16 border border-dashed border-border rounded-2xl bg-card/40 space-y-4">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-12 h-12 text-muted mx-auto">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 7.5h.008v.008H12V7.5ZM12 11.25a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-1.5 0v-4.5a.75.75 0 0 1 .75-.75Z" />
            </svg>
            <div className="max-w-sm mx-auto space-y-2">
              <h3 className="font-bold text-base">{t('No Articles Found', selectedLanguage)}</h3>
              <p className="text-xs text-muted leading-relaxed">
                {t('The database is currently empty or no stories match the filter.', selectedLanguage)}
              </p>
            </div>
          </div>
        ) : (
          /* Story Feed Grid */
          <div className="flex flex-col gap-6">
            {stories.map((story) => (
              <StoryCard
                key={story.id}
                story={story}
                isBookmarkedInitially={savedStoryIds.includes(story.id)}
              />
            ))}

            {/* Feed Pagination controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-border pt-6 mt-4">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-4 py-2 border border-border rounded-xl text-xs font-semibold bg-card text-muted hover:text-foreground disabled:opacity-40 transition cursor-pointer"
                >
                  {t('Previous', selectedLanguage)}
                </button>
                <span className="text-xs text-muted">
                  {t('Page', selectedLanguage)} <span className="font-bold text-foreground">{page}</span> of {totalPages}
                </span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-4 py-2 border border-border rounded-xl text-xs font-semibold bg-card text-muted hover:text-foreground disabled:opacity-40 transition cursor-pointer"
                >
                  {t('Next', selectedLanguage)}
                </button>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}

export default function HomeFeedPage() {
  return (
    <Suspense fallback={
      <div className="text-center py-12 text-sm text-muted">Loading feed configurations...</div>
    }>
      <FeedContent />
    </Suspense>
  );
}
