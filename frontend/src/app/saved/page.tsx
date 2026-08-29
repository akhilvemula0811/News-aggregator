'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { fetchPersonalization } from '../../lib/api';
import { Story } from '../../types/api';
import StoryCard from '../../components/StoryCard';
import { getWatchHistory, subscribeWatchHistory } from '../../lib/watchHistory';
import { t } from '../../lib/translations';

function SavedArticlesContent() {
  const searchParams = useSearchParams();
  const currentLanguage = searchParams.get('language') || '';

  const [savedStories, setSavedStories] = useState<Story[]>([]);
  const [watchHistory, setWatchHistory] = useState<Story[]>([]);
  const [activeTab, setActiveTab] = useState<'saved' | 'watch'>('saved');
  const [loading, setLoading] = useState(true);

  const loadSavedStories = async () => {
    setLoading(true);
    const data = await fetchPersonalization(currentLanguage);
    if (data && data.savedStories) {
      setSavedStories(data.savedStories);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadSavedStories();

    // Load watch history and subscribe to session updates
    setWatchHistory(getWatchHistory());
    const unsubscribe = subscribeWatchHistory(() => {
      setWatchHistory(getWatchHistory());
    });
    return () => unsubscribe();
  }, [currentLanguage]);

  const handleTabChange = async (tab: 'saved' | 'watch') => {
    setActiveTab(tab);
    if (tab === 'saved') {
      try {
        const data = await fetchPersonalization(currentLanguage);
        if (data && data.savedStories) {
          setSavedStories(data.savedStories);
        }
      } catch (err) {
        console.error('Failed to sync bookmarks:', err);
      }
    }
  };

  const activeStories = activeTab === 'saved' ? savedStories : watchHistory;

  return (
    <div className="space-y-6 pt-4 md:pt-6">

      {/* Page Header */}
      <section className="space-y-4 border-b border-border pb-5">
        <div className="space-y-2">
          <h1 className="text-xl md:text-3xl font-extrabold tracking-tight">
            {activeTab === 'saved' ? t('Saved Stories', currentLanguage) : t('Watch History', currentLanguage)}
          </h1>
          <p className="text-xs md:text-sm text-muted leading-relaxed max-w-xl">
            {activeTab === 'saved'
              ? t('Your saved Bookmark stories and News Articles. Also available in offline mode.', currentLanguage)
              : t("Rewatch your Articles and stories you've clicked and read during this session.\n NOTE: This list will clear automatically when you refresh the page.", currentLanguage)}
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="inline-flex p-1 bg-muted-light/60 rounded-xl border border-border/85">
          <button
            onClick={() => handleTabChange('saved')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all duration-200 cursor-pointer ${activeTab === 'saved'
              ? 'bg-card text-foreground shadow-sm'
              : 'text-muted hover:text-foreground'
              }`}
          >
            {t('Saved Bookmarks', currentLanguage)} ({savedStories.length})
          </button>
          <button
            onClick={() => handleTabChange('watch')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all duration-200 cursor-pointer ${activeTab === 'watch'
              ? 'bg-card text-foreground shadow-sm'
              : 'text-muted hover:text-foreground'
              }`}
          >
            {t('Watch History', currentLanguage)} ({watchHistory.length})
          </button>
        </div>
      </section>

      {/* Stories list */}
      {loading ? (
        <div className="space-y-4">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="animate-pulse border border-border bg-card rounded-2xl p-5 h-44 space-y-4">
              <div className="h-4 bg-muted-light rounded w-1/4"></div>
              <div className="h-6 bg-muted-light rounded w-3/4"></div>
              <div className="h-4 bg-muted-light rounded w-5/6"></div>
            </div>
          ))}
        </div>
      ) : activeStories.length === 0 ? (
        /* Empty State */
        activeTab === 'saved' ? (
          <div className="text-center py-16 border border-dashed border-border rounded-2xl bg-card/40 space-y-3">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-12 h-12 text-muted mx-auto">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0 1 11.186 0Z" />
            </svg>
            <div className="max-w-sm mx-auto space-y-1">
              <h3 className="font-bold text-base">{t('No Saved Stories', currentLanguage)}</h3>
              <p className="text-xs text-muted leading-relaxed">
                {t('Bookmarked articles appear here. Click the bookmark icon on any news card in the home feed or detailed reports page to save stories for later.', currentLanguage)}
              </p>
            </div>
          </div>
        ) : (
          <div className="text-center py-16 border border-dashed border-border rounded-2xl bg-card/40 space-y-3">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-12 h-12 text-muted mx-auto">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
            <div className="max-w-sm mx-auto space-y-1">
              <h3 className="font-bold text-base">{t('Watch History Empty', currentLanguage)}</h3>
              <p className="text-xs text-muted leading-relaxed">
                {t('Stories you click and read will appear here. Refreshing the browser page will automatically clear your history.', currentLanguage)}
              </p>
            </div>
          </div>
        )
      ) : (
        /* Stories Feed */
        <div className="flex flex-col gap-6">
          {activeStories.map((story) => (
            <StoryCard
              key={story.id}
              story={story}
              isBookmarkedInitially={savedStories.some((s) => s.id === story.id)}
            />
          ))}
        </div>
      )}

    </div>
  );
}

export default function SavedArticlesPage() {
  return (
    <Suspense fallback={<div className="text-center py-12 text-sm text-muted">Loading saved profile...</div>}>
      <SavedArticlesContent />
    </Suspense>
  );
}
