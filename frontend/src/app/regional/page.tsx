'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { fetchStories, fetchPersonalization } from '../../lib/api';
import { Story } from '../../types/api';
import StoryCard from '../../components/StoryCard';
import { t } from '../../lib/translations';

const INDIAN_STATES = [
  'Maharashtra', 'Delhi', 'Karnataka', 'Tamil Nadu',
  'Andhra Pradesh', 'Telangana', 'Uttar Pradesh', 'West Bengal', 'Kerala',
  'Gujarat', 'Rajasthan', 'Punjab', 'Haryana', 'Bihar', 'Madhya Pradesh',
  'Arunachal Pradesh', 'Assam', 'Chhattisgarh', 'Goa', 'Himachal Pradesh',
  'Jharkhand', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha',
  'Sikkim', 'Tripura', 'Uttarakhand'
];

function RegionalPulseContent() {
  const searchParams = useSearchParams();

  const [mounted, setMounted] = useState(false);
  const [stories, setStories] = useState<Story[]>([]);
  const [savedStoryIds, setSavedStoryIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [triggerCount, setTriggerCount] = useState(0);

  // Check preferred_location in localStorage on mount
  const [preferredState, setPreferredState] = useState<string>('Maharashtra');

  useEffect(() => {
    const saved = localStorage.getItem('preferred_location');
    if (saved && INDIAN_STATES.includes(saved)) {
      setPreferredState(saved);
    }
    setMounted(true);
  }, []);

  // Filters read from URL search params
  const selectedState = searchParams.get('state') || preferredState;
  const selectedLanguage = searchParams.get('language') || '';

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);

  // Load Saved stories to mark cards
  useEffect(() => {
    if (!mounted) return;
    async function loadSaved() {
      const data = await fetchPersonalization(selectedLanguage);
      if (data && data.savedStories) {
        setSavedStoryIds(data.savedStories.map(s => s.id));
      }
    }
    loadSaved();
  }, [selectedLanguage, mounted]);

  // Background regional feed auto-refresh loop (every 15 minutes)
  useEffect(() => {
    if (!mounted) return;
    const interval = setInterval(() => {
      console.log('[RegionalPulse] Automatically refreshing feed...');
      setTriggerCount(prev => prev + 1);
    }, 15 * 60 * 1000); // 15 minutes

    return () => clearInterval(interval);
  }, [mounted]);

  // Load feed based on state, language & triggerCount
  useEffect(() => {
    if (!mounted) return;
    let active = true;
    async function loadFeed() {
      setLoading(true);
      const data = await fetchStories({
        state: selectedState,
        language: selectedLanguage,
        page: 1,
        limit: 30,
      });

      if (active) {
        if (data && data.stories) {
          setStories(data.stories);
          setTotalPages(data.pagination.totalPages || 1);
        } else {
          setStories([]);
          setTotalPages(1);
        }
        setPage(1);
        setLoading(false);
      }
    }
    loadFeed();
    return () => {
      active = false;
    };
  }, [selectedState, selectedLanguage, mounted, triggerCount]);



  const handleLoadMore = async () => {
    if (loadingMore || page >= totalPages) return;
    setLoadingMore(true);
    const nextPage = page + 1;
    const data = await fetchStories({
      state: selectedState,
      language: selectedLanguage,
      page: nextPage,
      limit: 30,
    });
    if (data && data.stories) {
      setStories(prev => [...prev, ...data.stories]);
      setPage(nextPage);
    }
    setLoadingMore(false);
  };

  // Render a clean loader skeleton before mounting to prevent hydration errors
  if (!mounted) {
    return (
      <div className="space-y-6 pt-4 md:pt-6">
        <section className="space-y-4 border-b border-border pb-5">
          <div className="h-8 bg-muted-light rounded w-1/4 animate-pulse"></div>
          <div className="h-4 bg-muted-light rounded w-2/3 animate-pulse"></div>
        </section>
        <div className="space-y-4 pt-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="animate-pulse border border-border bg-card rounded-2xl p-5 h-44 space-y-4">
              <div className="h-4 bg-muted-light rounded w-1/4"></div>
              <div className="h-6 bg-muted-light rounded w-3/4"></div>
              <div className="h-4 bg-muted-light rounded w-5/6"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pt-4 md:pt-6">

      {/* Page Header */}
      <section className="space-y-4 border-b border-border pb-5">
        <div>
          <h1 className="text-xl md:text-3xl font-extrabold tracking-tight flex items-center gap-2">
            {t('Regional Pulse', selectedLanguage)}
            <span className="text-sm font-semibold px-2.5 py-1 bg-accent/15 text-accent rounded-lg border border-accent/20">
              {t(selectedState, selectedLanguage)}
            </span>
          </h1>
          <p className="text-xs md:text-sm text-muted leading-relaxed max-w-xl mt-1">
            {t('Read local news and updates from your region', selectedLanguage)}
          </p>
        </div>
      </section>

      {/* Stories list */}
      {loading ? (
        <div className="space-y-4 pt-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="animate-pulse border border-border bg-card rounded-2xl p-5 h-44 space-y-4">
              <div className="h-4 bg-muted-light rounded w-1/4"></div>
              <div className="h-6 bg-muted-light rounded w-3/4"></div>
              <div className="h-4 bg-muted-light rounded w-5/6"></div>
            </div>
          ))}
        </div>
      ) : stories.length === 0 ? (
        /* Empty State */
        <div className="text-center py-16 border border-dashed border-border rounded-2xl bg-card/40 space-y-3">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-12 h-12 text-muted mx-auto">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 7.5h.008v.008H12V7.5ZM12 11.25a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-1.5 0v-4.5a.75.75 0 0 1 .75-.75Z" />
          </svg>
          <div className="max-w-sm mx-auto space-y-1">
            <h3 className="font-bold text-base">
              {t('No Regional Reports Found', selectedLanguage)}
            </h3>
            <p className="text-xs text-muted leading-relaxed">
              {t("We couldn't find any stories matching your state ({state}) and language selection. Try selecting a different state or trigger manual ingestion to seed more articles.", selectedLanguage).replace('{state}', t(selectedState, selectedLanguage))}
            </p>
          </div>
        </div>
      ) : (
        /* Stories Feed */
        <div className="space-y-6">
          <div className="flex flex-col gap-6">
            {stories.map((story) => (
              <StoryCard
                key={story.id}
                story={story}
                isBookmarkedInitially={savedStoryIds.includes(story.id)}
              />
            ))}
          </div>

          {/* Load More Button */}
          {page < totalPages && (
            <div className="flex justify-center pt-4">
              <button
                onClick={handleLoadMore}
                disabled={loadingMore}
                className="px-6 py-2.5 bg-primary hover:bg-primary-hover disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md transition cursor-pointer flex items-center gap-2"
              >
                {loadingMore ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    {t('Loading...', selectedLanguage)}
                  </>
                ) : (
                  t('Load More News', selectedLanguage)
                )}
              </button>
            </div>
          )}
        </div>
      )}

    </div>
  );
}

export default function RegionalPulsePage() {
  return (
    <Suspense fallback={<div className="text-center py-12 text-sm text-muted">Loading regional news...</div>}>
      <RegionalPulseContent />
    </Suspense>
  );
}
