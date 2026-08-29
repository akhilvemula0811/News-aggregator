import React from 'react';
import { useSearchParams } from 'next/navigation';
import { t } from '../lib/translations';

// Common categories to display in the filter bar
export const CATEGORIES = [
  { name: 'All News', filter: '' },
  { name: 'National News', filter: 'National News' },
  { name: 'Politics', filter: 'Politics' },
  { name: 'Stocks & Business', filter: 'Stocks/Business' },
  { name: 'AI & Tech Deep Dives', filter: 'AI & Tech Deep Dives' },
  { name: 'Startup & Funding', filter: 'Startup & Funding Tracker' },
  { name: 'World News', filter: 'World News' },
  { name: 'Technology', filter: 'Technology' },
  { name: 'Science', filter: 'Science' },
  { name: 'Sports', filter: 'Sports' },
  { name: 'Jobs & Career', filter: 'Jobs & Career' },
  { name: 'Movies & Ent.', filter: 'Movies/Entertainment' },
  { name: 'Health', filter: 'Health' },
  { name: 'Education', filter: 'Education' },
  { name: 'Crime', filter: 'Crime' },
  { name: 'Automobile', filter: 'Automobile' },
  { name: 'Travel', filter: 'Travel' },
  { name: 'Weather', filter: 'Weather' },
  { name: 'Food', filter: 'Food' },
];

interface Props {
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
}

export default function CategoryBar({ selectedCategory, onSelectCategory }: Props) {
  const searchParams = useSearchParams();
  const currentLanguage = searchParams.get('language') || '';

  return (
    <div className="w-full relative py-2 overflow-x-auto hide-scrollbar select-none border-b border-border bg-background sticky top-0 z-10 flex items-center gap-1.5 px-1 scroll-smooth">
      {CATEGORIES.map((cat) => {
        const active = selectedCategory === cat.filter;
        return (
          <button
            key={cat.name}
            onClick={() => onSelectCategory(cat.filter)}
            className={`whitespace-nowrap px-4 py-1.5 rounded-full text-xs font-semibold tracking-wide border transition-all duration-150 cursor-pointer ${
              active
                ? 'bg-primary text-white border-primary shadow-sm'
                : 'bg-card text-muted hover:text-foreground border-border hover:border-border-focus'
            }`}
          >
            {t(cat.name, currentLanguage)}
          </button>
        );
      })}
    </div>
  );
}
