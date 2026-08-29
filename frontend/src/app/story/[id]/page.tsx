'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { fetchStoryDetails, toggleBookmark, fetchPersonalization } from '../../../lib/api';
import { Story, StoryDetails } from '../../../types/api';
import { addToWatchHistory } from '../../../lib/watchHistory';
import CredibilityBadge from '../../../components/CredibilityBadge';
import { t } from '../../../lib/translations';

function StoryDetailContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const id = params.id as string;
  const currentLanguage = searchParams.get('language') || '';

  const [story, setStory] = useState<StoryDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    async function loadStory() {
      setLoading(true);
      const data = await fetchStoryDetails(id, currentLanguage);
      if (data) {
        setStory(data);

        // Add to watch history
        const storyItem: Story = {
          id: data.id,
          title: data.title,
          summary: data.summary,
          credibilityScore: data.credibilityScore,
          primaryCategory: data.primaryCategory,
          secondaryCategory: data.secondaryCategory,
          isDeveloping: data.isDeveloping,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
          sources: Array.from(new Set(data.articles.map(a => a.sourceName || 'Unknown'))),
          imageUrl: data.articles.find(a => a.urlToImage)?.urlToImage || null,
          articlesCount: data.articles.length,
        };
        addToWatchHistory(storyItem);

        // Check initial bookmark state
        const profile = await fetchPersonalization();
        if (profile && profile.savedStories) {
          const exists = profile.savedStories.some(s => s.id === data.id);
          setIsSaved(exists);
        }
      }
      setLoading(false);
    }
    if (id) loadStory();
  }, [id, currentLanguage]);

  const handleBookmarkToggle = async () => {
    if (isSaving || !story) return;
    setIsSaving(true);
    const bookmarked = await toggleBookmark(story.id);
    setIsSaved(bookmarked);
    setIsSaving(false);
  };

  if (loading) {
    return (
      <div className="space-y-6 pt-4 md:pt-6 pb-6 animate-pulse">
        <div className="h-4 bg-muted-light rounded w-20"></div>
        <div className="h-8 bg-muted-light rounded w-3/4"></div>
        <div className="h-4 bg-muted-light rounded w-1/3"></div>
        <div className="h-48 bg-muted-light rounded-2xl"></div>
      </div>
    );
  }

  if (!story) {
    return (
      <div className="text-center py-16 space-y-4">
        <h2 className="text-xl font-bold">{t('Story Not Found', currentLanguage)}</h2>
        <p className="text-sm text-muted">{t('The requested story cluster could not be loaded.', currentLanguage)}</p>
        <button onClick={() => router.push(`/?language=${currentLanguage}`)} className="px-4 py-2 bg-primary text-white rounded-xl text-xs font-semibold">
          {t('Back to Feed', currentLanguage)}
        </button>
      </div>
    );
  }

  const imageUrl = story.articles.find(a => a.urlToImage)?.urlToImage || null;

  return (
    <div className="space-y-8 pt-4 md:pt-6 pb-10">

      {/* Navigation and Actions */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-xs text-muted hover:text-foreground font-semibold px-3 py-1.5 rounded-xl border border-border bg-card hover:bg-muted-light transition cursor-pointer"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-3.5 h-3.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
          </svg>
          {t('Back', currentLanguage)}
        </button>

        <button
          onClick={handleBookmarkToggle}
          disabled={isSaving}
          className={`flex items-center gap-1.5 text-xs font-semibold px-4 py-1.5 rounded-xl border transition-all cursor-pointer ${isSaved
            ? 'bg-primary/10 border-primary/20 text-primary'
            : 'border-border bg-card hover:bg-muted-light text-muted hover:text-foreground'
            }`}
        >
          {isSaved ? (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
                <path fillRule="evenodd" d="M6.32 2.577a49.255 49.255 0 0 1 11.36 0c1.497.174 2.57 1.46 2.57 2.93V21a.75.75 0 0 1-1.085.67L12 18.089l-7.165 3.583A.75.75 0 0 1 3.75 21V5.507c0-1.47 1.073-2.756 2.57-2.93Z" clipRule="evenodd" />
              </svg>
              {t('Bookmarked', currentLanguage)}
            </>
          ) : (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-3.5 h-3.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0 1 11.186 0Z" />
              </svg>
              {t('Bookmark', currentLanguage)}
            </>
          )}
        </button>
      </div>

      {/* Headline & Credibility Section */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <CredibilityBadge score={story.credibilityScore} />
          <span className="px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-[11px] font-bold uppercase tracking-wider">
            {t(story.primaryCategory, currentLanguage)}
          </span>

          {story.isDeveloping && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-accent/15 text-accent text-[11px] font-bold uppercase tracking-wider">
              <span className="w-2 h-2 rounded-full bg-accent animate-ping"></span>
              {t('Developing Story', currentLanguage)}
            </span>
          )}
        </div>

        <h1 className="text-xl md:text-3xl font-extrabold tracking-tight leading-tight">
          {story.title}
        </h1>
      </section>

      {/* Story Hero Image (if exists) */}
      {imageUrl && (
        <div className="w-full aspect-video md:max-h-[420px] rounded-2xl overflow-hidden bg-muted-light relative shadow-sm">
          <img
            src={imageUrl}
            alt={story.title}
            className="object-cover w-full h-full"
          />
        </div>
      )}

      {/* Complete News Content */}
      <article className="prose dark:prose-invert max-w-none space-y-8">
        {story.articles.some(a => a.content || a.description) ? (
          story.articles.map((art) => {
            const bodyText = art.content || art.description;
            if (!bodyText) return null;

            return (
              <div key={art.id} className="space-y-3">
                {story.articles.length > 1 && (
                  <span className="text-[10px] font-bold text-primary bg-primary/10 px-2.5 py-0.5 rounded-md inline-block">
                    {t(art.sourceName || 'Unknown', currentLanguage)}
                  </span>
                )}
                <p className="text-sm md:text-base leading-relaxed text-card-foreground/90 font-normal whitespace-pre-line">
                  {bodyText}
                </p>
              </div>
            );
          })
        ) : (
          <p className="text-sm md:text-base leading-relaxed text-card-foreground/90 font-normal whitespace-pre-line">
            {story.summary}
          </p>
        )}
      </article>

      {/* Developing Diff Block (if exists) */}
      {story.diffs && story.diffs.length > 0 && (
        <section className="bg-accent/5 border border-accent/20 rounded-2xl p-6 space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-accent flex items-center gap-1.5">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
            {t("What's Changed (Latest Update)", currentLanguage)}
          </h3>
          <p className="text-sm leading-relaxed text-foreground/95">
            {story.diffs[0].diffContent}
          </p>
        </section>
      )}

      {/* Story Lineage / Chronology Timeline */}
      {story.timeline && story.timeline.length > 0 && (
        <section className="space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-muted flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4.5 h-4.5 text-primary">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
            {t('Story Lineage & Timeline', currentLanguage)}
          </h3>

          <div className="relative border-l border-border pl-6 ml-3 space-y-6">
            {story.timeline.map((event) => (
              <div key={event.id} className="relative group">
                {/* Timeline node */}
                <span className="absolute -left-[31px] top-1.5 flex h-4 w-4 items-center justify-center rounded-full border-2 border-primary bg-background transition duration-200 group-hover:scale-110">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                </span>

                {/* Event text content */}
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-bold bg-muted-light text-muted px-2 py-0.5 rounded-md">
                      {new Date(event.eventTime).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                    <h4 className="text-xs md:text-sm font-bold text-card-foreground">
                      {event.eventTitle}
                    </h4>
                  </div>
                  <p className="text-xs text-muted leading-relaxed max-w-2xl">
                    {event.eventDescription}
                  </p>
                  {event.sourceUrl && (
                    <a
                      href={event.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-0.5 text-[10px] text-primary hover:underline"
                    >
                      {t('View Source', currentLanguage)}
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-2.5 h-2.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                      </svg>
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

    </div>
  );
}

export default function StoryDetailPage() {
  return (
    <Suspense fallback={<div className="space-y-6 py-6 animate-pulse"><div className="h-4 bg-muted-light rounded w-20"></div><div className="h-8 bg-muted-light rounded w-3/4"></div></div>}>
      <StoryDetailContent />
    </Suspense>
  );
}
