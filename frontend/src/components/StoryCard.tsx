import React, { useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Story } from '../types/api';
import CredibilityBadge from './CredibilityBadge';
import { logEngagement, toggleBookmark } from '../lib/api';
import { addToWatchHistory } from '../lib/watchHistory';
import { t } from '../lib/translations';

interface Props {
  story: Story;
  isBookmarkedInitially?: boolean;
}

export default function StoryCard({ story, isBookmarkedInitially = false }: Props) {
  const searchParams = useSearchParams();
  const currentLanguage = searchParams.get('language') || '';

  const [isSaved, setIsSaved] = useState(isBookmarkedInitially);
  const [isSaving, setIsSaving] = useState(false);

  const handleCardClick = () => {
    logEngagement(story.id);
    addToWatchHistory(story);
  };

  const handleBookmarkToggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isSaving) return;
    
    setIsSaving(true);
    const success = await toggleBookmark(story.id);
    setIsSaved(success);
    setIsSaving(false);
  };

  const formattedDate = new Date(story.createdAt).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });

  const detailUrl = `/story/${story.id}${currentLanguage ? `?language=${currentLanguage}` : ''}`;

  return (
    <article 
      onClick={handleCardClick}
      className={`group relative flex flex-col sm:flex-row gap-5 md:gap-6 overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-sm hover:shadow-md hover:border-border-focus transition-all duration-200 cursor-pointer ${story.imageUrl ? 'min-h-[220px] sm:h-[265px]' : 'h-auto'}`}
    >
      {/* Left Column: Image (Optional) */}
      {story.imageUrl && (
        <div className="w-full sm:w-52 md:w-64 h-48 sm:h-full shrink-0 rounded-xl overflow-hidden bg-muted-light relative">
          <img 
            src={story.imageUrl} 
            alt={story.title} 
            className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
        </div>
      )}

      {/* Right Column: News Content */}
      <div className="flex-1 flex flex-col justify-between min-w-0">
        <div>
          {/* Card Header: Badges & Bookmark */}
          <div className="flex items-center justify-between gap-4 mb-2.5">
            <div className="flex flex-wrap items-center gap-2">
              {story.credibilityScore !== 'UNVERIFIED' && (
                <CredibilityBadge score={story.credibilityScore} />
              )}
              
              {/* Primary Category Tag */}
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary uppercase tracking-wider">
                {t(story.primaryCategory, currentLanguage)}
              </span>
              


              {/* Developing Badge */}
              {story.isDeveloping && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-accent/15 text-accent uppercase tracking-wider animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent"></span>
                  {t('Developing Story', currentLanguage)}
                </span>
              )}
            </div>

            {/* Bookmark Button */}
            <button
              onClick={handleBookmarkToggle}
              className={`p-1.5 rounded-lg border border-border hover:bg-muted-light text-muted hover:text-foreground transition-all duration-150 shrink-0 ${isSaved ? 'bg-primary/5 text-primary border-primary/20 hover:text-primary-hover' : ''}`}
              disabled={isSaving}
              aria-label="Save story"
            >
              {isSaved ? (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                  <path fillRule="evenodd" d="M6.32 2.577a49.255 49.255 0 0 1 11.36 0c1.497.174 2.57 1.46 2.57 2.93V21a.75.75 0 0 1-1.085.67L12 18.089l-7.165 3.583A.75.75 0 0 1 3.75 21V5.507c0-1.47 1.073-2.756 2.57-2.93Z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0 1 11.186 0Z" />
                </svg>
              )}
            </button>
          </div>

          {/* Title */}
          <Link href={detailUrl}>
            <h2 className="text-base md:text-lg font-bold tracking-tight leading-snug group-hover:text-primary transition-colors mb-2 line-clamp-2">
              {story.title}
            </h2>
          </Link>

          {/* AI Summary */}
          <p className="text-xs md:text-sm text-muted/90 line-clamp-3 leading-relaxed mb-4">
            {story.summary}
          </p>
        </div>

        {/* Footer Info */}
        <div className="flex items-center justify-between pt-3 mt-auto border-t border-border/60 text-[11px] text-muted">
          {/* Outlets */}
          <span className="truncate max-w-[150px] xs:max-w-[200px] md:max-w-xs" title={story.sources?.join(', ') || ''}>
            {t('Reported by', currentLanguage)} <span className="font-semibold text-foreground/80">{t(story.sources?.[0] || 'Unknown', currentLanguage)}</span>
            {story.sources && story.sources.length > 1 && ` + ${story.sources.length - 1} ${t('outlets', currentLanguage)}`}
          </span>

          {/* Date Time */}
          <span className="flex items-center gap-1">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3 h-3">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
            {formattedDate}
          </span>
        </div>
      </div>
    </article>
  );
}
