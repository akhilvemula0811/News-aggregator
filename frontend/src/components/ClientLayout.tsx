'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { t } from '../lib/translations';
import newsLogo from '@/app/newslogo.png';
import { fetchStories } from '../lib/api';

const INDIAN_STATES = [
  'Maharashtra', 'Delhi', 'Karnataka', 'Tamil Nadu',
  'Andhra Pradesh', 'Telangana', 'Uttar Pradesh', 'West Bengal', 'Kerala',
  'Gujarat', 'Rajasthan', 'Punjab', 'Haryana', 'Bihar', 'Madhya Pradesh',
  'Arunachal Pradesh', 'Assam', 'Chhattisgarh', 'Goa', 'Himachal Pradesh',
  'Jharkhand', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha',
  'Sikkim', 'Tripura', 'Uttarakhand'
];

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
  { code: 'as', name: 'Assamese (অসমীয়া)', indicTrans: 'asm_Beng' },
  { code: 'mni', name: 'Manipuri (ꯃꯩꯇꯩꯂꯣꯟ)', indicTrans: 'mni_Beng' },
  { code: 'lus', name: 'Mizo (Mizo ṭawng)', indicTrans: 'lus_Latn' },
  { code: 'kha', name: 'Khasi (Ka Ktien Khasi)', indicTrans: 'kha_Latn' },
  { code: 'gom', name: 'Konkani (कोंकणी)', indicTrans: 'gom_Deva' },
  { code: 'ne', name: 'Nepali (नेपाली)', indicTrans: 'npi_Deva' },
  { code: 'ur', name: 'Urdu (اُردُو)', indicTrans: 'urd_Arab' }
];

function HeaderSearch() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [searchVal, setSearchVal] = useState('');

  useEffect(() => {
    const q = searchParams.get('search');
    if (q) {
      setSearchVal(q);
    } else {
      setSearchVal('');
    }
  }, [searchParams]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchVal.trim()) {
      router.push(`/?search=${encodeURIComponent(searchVal.trim())}`);
    } else {
      router.push('/');
    }
  };

  return (
    <form onSubmit={handleSearchSubmit} className="flex-1 max-w-[100px] xs:max-w-[150px] sm:max-w-md mx-1.5 sm:mx-4">
      <div className="relative">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="absolute left-2.5 sm:left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted">
          <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.602 10.602Z" />
        </svg>
        <input
          type="text"
          placeholder="Search..."
          value={searchVal}
          onChange={(e) => setSearchVal(e.target.value)}
          className="w-full pl-7 sm:pl-10 pr-3 sm:pr-4 py-1.5 rounded-xl border border-border bg-background focus:outline-none focus:border-border-focus text-[11px] sm:text-sm transition-all"
        />
      </div>
    </form>
  );
}

function HeaderFilters() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const [preferredState, setPreferredState] = useState('');

  useEffect(() => {
    const saved = localStorage.getItem('preferred_location');
    if (saved) {
      setPreferredState(saved);
    } else {
      setPreferredState('');
    }
  }, [searchParams]);

  const currentState = searchParams.get('state') || preferredState;
  const currentLanguage = searchParams.get('language') || '';

  const handleStateChange = (state: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (state) {
      params.set('state', state);
      if (state !== 'National Coverage') {
        localStorage.setItem('preferred_location', state);
      } else {
        localStorage.removeItem('preferred_location');
      }
    } else {
      params.delete('state');
      localStorage.removeItem('preferred_location');
    }
    params.delete('page'); // Reset pagination on filter change
    router.push(`${pathname}?${params.toString()}`);
  };

  const handleLanguageChange = (language: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (language) {
      params.set('language', language);
    } else {
      params.delete('language');
    }
    params.delete('page'); // Reset pagination on filter change
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="flex items-center gap-1.5 sm:gap-2">
      {/* Location Selector */}
      <div className="relative flex items-center bg-background hover:bg-muted-light border border-border rounded-xl px-1.5 sm:px-2.5 py-1.5 transition-all text-xs font-semibold text-foreground/80 cursor-pointer">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-3.5 h-3.5 text-primary shrink-0">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
        </svg>
        <select
          value={currentState}
          onChange={(e) => handleStateChange(e.target.value)}
          className="bg-transparent border-none outline-none pl-0.5 pr-3.5 sm:pr-4 appearance-none cursor-pointer text-[10px] sm:text-xs font-semibold text-foreground/90 focus:ring-0 max-w-[65px] xs:max-w-[85px] sm:max-w-[120px] truncate"
        >
          <option value="" className="bg-card text-foreground">Location</option>
          {INDIAN_STATES.map((st) => (
            <option key={st} value={st} className="bg-card text-foreground">
              {st}
            </option>
          ))}
        </select>
        <span className="absolute right-1.5 pointer-events-none text-muted">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-2.5 h-2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
          </svg>
        </span>
      </div>

      {/* Language Selector */}
      <div className="relative flex items-center bg-background hover:bg-muted-light border border-border rounded-xl px-1.5 sm:px-2.5 py-1.5 transition-all text-xs font-semibold text-foreground/80 cursor-pointer">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-3.5 h-3.5 text-primary shrink-0">
          <path strokeLinecap="round" strokeLinejoin="round" d="m10.5 21 5.25-11.25L21 21m-9-3h7.5M3 5.621a48.474 48.474 0 0 1 6-.371m0 0c1.12 0 2.233.038 3.334.114M9 5.25V3m3.334 2.364C11.176 10.658 7.69 15.08 3 17.502m9.334-12.138c.896.061 1.785.147 2.666.257m-4.589 8.495a18.023 18.023 0 0 1-3.827-5.802" />
        </svg>
        <select
          value={currentLanguage}
          onChange={(e) => handleLanguageChange(e.target.value)}
          className="bg-transparent border-none outline-none pl-0.5 pr-3.5 sm:pr-4 appearance-none cursor-pointer text-[10px] sm:text-xs font-semibold text-foreground/90 focus:ring-0 max-w-[65px] xs:max-w-[85px] sm:max-w-[120px] truncate"
        >
          {LANGUAGES.map((lang) => (
            <option key={lang.code} value={lang.code} className="bg-card text-foreground">
              {lang.code === '' ? t('Language', currentLanguage) : lang.name}
            </option>
          ))}
        </select>
        <span className="absolute right-1.5 pointer-events-none text-muted">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-2.5 h-2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
          </svg>
        </span>
      </div>
    </div>
  );
}

function ClientLayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [preferredState, setPreferredState] = useState('');

  const [showPreloader, setShowPreloader] = useState(true);
  const [preloaderActive, setPreloaderActive] = useState(true);
  const [preloaderProgress, setPreloaderProgress] = useState(0);

  useEffect(() => {
    let isMounted = true;
    let currentProgress = 0;

    // Slowly load the progress bar (takes about 2.2 seconds for a premium feel)
    const interval = setInterval(() => {
      if (!isMounted) return;
      currentProgress += Math.random() * 0.035 + 0.012; // Slow, natural loading speed

      if (currentProgress >= 1) {
        currentProgress = 1;
        setPreloaderProgress(1);
        clearInterval(interval);

        // Pause briefly at 100% then trigger overlay fade out
        setTimeout(() => {
          if (!isMounted) return;
          setPreloaderActive(false);
          setTimeout(() => {
            if (!isMounted) return;
            setShowPreloader(false);
          }, 500); // Overlay opacity transition duration
        }, 300);
      } else {
        setPreloaderProgress(currentProgress);
      }
    }, 45);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);


  useEffect(() => {
    const saved = localStorage.getItem('preferred_location');
    if (saved) {
      setPreferredState(saved);
    } else {
      setPreferredState('');
    }
  }, [searchParams]);

  const currentLanguage = searchParams.get('language') || '';
  const currentState = searchParams.get('state') || preferredState;

  const getNavHref = (path: string) => {
    const params = new URLSearchParams();
    if (currentLanguage) params.set('language', currentLanguage);
    if (currentState) params.set('state', currentState);
    const queryString = params.toString();
    return queryString ? `${path}?${queryString}` : path;
  };

  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [ingesting, setIngesting] = useState(false);

  const handleManualIngest = async () => {
    setIngesting(true);
    const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5000/api';
    const adminSecret = process.env.NEXT_PUBLIC_ADMIN_SECRET || 'super_secret_admin_token_123';
    try {
      const res = await fetch(`${apiBase}/admin/ingest`, {
        method: 'POST',
        headers: {
          'x-admin-secret': adminSecret
        }
      });
      if (res.ok) {
        alert(t('Ingestion triggered successfully! Feed is updating...', currentLanguage));
        window.location.reload();
      } else {
        alert(t('Ingestion trigger failed. Check your API endpoint and admin secret configuration.', currentLanguage));
      }
    } catch (err) {
      alert(t('Network error trying to contact backend ingestion server.', currentLanguage));
    }
    setIngesting(false);
  };

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light') {
      setTheme('light');
      document.documentElement.classList.remove('dark');
    } else {
      setTheme('dark');
      document.documentElement.classList.add('dark');
    }
  }, []);

  const toggleTheme = () => {
    if (theme === 'dark') {
      setTheme('light');
      localStorage.setItem('theme', 'light');
      document.documentElement.classList.remove('dark');
    } else {
      setTheme('dark');
      localStorage.setItem('theme', 'dark');
      document.documentElement.classList.add('dark');
    }
  };

  const navItems = [
    {
      name: 'Home Feed',
      path: '/',
      icon: (active: boolean) => (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={`w-6 h-6 ${active ? 'text-primary' : ''}`}>
          <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M7.5 9.75l4.89-4.89c.196-.196.54-.196.736 0l4.89 4.89" />
        </svg>
      ),
    },

    {
      name: 'Regional Pulse',
      path: '/regional',
      icon: (active: boolean) => (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={`w-6 h-6 ${active ? 'text-primary' : ''}`}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
        </svg>
      ),
    },
    {
      name: 'Watch History',
      path: '/saved',
      icon: (active: boolean) => (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={`w-6 h-6 ${active ? 'text-primary' : ''}`}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0 1 11.186 0Z" />
        </svg>
      ),
    },
  ];

  return (
    <div className="flex min-h-screen flex-col md:flex-row bg-background text-foreground transition-all duration-200">

      {/* DESKTOP SIDEBAR */}
      <aside className="hidden md:flex flex-col w-64 border-r border-border bg-card p-6 fixed h-full z-10">
        {/* Logo */}
        <div
          onClick={() => window.location.reload()}
          className="flex items-center gap-2 mb-8 select-none cursor-pointer hover:opacity-80 transition-opacity"
        >
          <Image
            src={newsLogo}
            alt="AI News Pulse Logo"
            width={35}
            height={35}
            className="w-12 h-12 object-contain"
          />
          <div>
            <h1 className="font-bold text-xl leading-tight tracking-tight">AI News Pulse</h1>
            <span className="text-[10px] font-semibold text-accent tracking-wider uppercase">Indian & Global</span>
          </div>
        </div>

        {/* Sidebar Nav */}
        <nav className="flex-1 space-y-2">
          {navItems.map((item) => {
            const active = pathname === item.path;
            return (
              <Link
                key={item.name}
                href={getNavHref(item.path)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all duration-150 group ${active
                  ? 'bg-muted-light text-primary'
                  : 'text-muted hover:bg-muted-light hover:text-foreground'
                  }`}
              >
                {item.icon(active)}
                <span>{t(item.name, currentLanguage)}</span>
              </Link>
            );
          })}
        </nav>

        {/* Run Ingestion Action */}
        <div className="mt-auto mb-4 pt-4 border-t border-border">

          <button
            onClick={handleManualIngest}
            disabled={ingesting}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-muted-light hover:bg-border/60 disabled:opacity-50 text-foreground rounded-xl text-xs font-semibold border border-border transition cursor-pointer"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={`w-3.5 h-3.5 ${ingesting ? 'animate-spin' : ''}`}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
            </svg>
            {ingesting ? t('Ingesting...', currentLanguage) : t('Run Ingestion', currentLanguage)}
          </button>
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-border text-[11px] text-muted">
          <p>© 2026 AI News Pulse.</p>
          <p className="mt-1">Daily News & AI processed stories.</p>
        </div>
      </aside>

      {/* MAIN CONTAINER */}
      <div className="flex-1 flex flex-col md:pl-64 min-w-0">

        {/* HEADER */}
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-border bg-card/85 backdrop-blur-md px-4 sm:px-6">
          {/* Mobile logo */}
          <div
            onClick={() => window.location.reload()}
            className="flex items-center gap-1.5 sm:gap-2 md:hidden select-none cursor-pointer hover:opacity-80 transition-opacity"
          >
            <Image
              src={newsLogo}
              alt="AI News Pulse Logo"
              width={30}
              height={30}
              className="w-8 h-8 object-contain"
            />
            <h1 className="font-bold text-lg tracking-tight hidden sm:block">AI News Pulse</h1>
          </div>

          {/* Search bar wrapped in Suspense */}
          <Suspense fallback={<div className="flex-1 max-w-[100px] xs:max-w-[150px] sm:max-w-md mx-1.5 sm:mx-4 h-9 bg-muted-light rounded-xl animate-pulse"></div>}>
            <HeaderSearch />
          </Suspense>

          {/* Header Actions */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <Suspense fallback={<div className="w-28 sm:w-44 h-9 bg-muted-light rounded-xl animate-pulse"></div>}>
              <HeaderFilters />
            </Suspense>
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl border border-border hover:bg-muted-light transition-all text-foreground/80"
              aria-label={t('Toggle dark mode', currentLanguage)}
            >
              {theme === 'dark' ? (
                // Sun Icon
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m0 13.5V21M4.22 4.22l1.62 1.62m12.32 12.32 1.62 1.62M3 12h2.25m13.5 0H21M5.84 18.16l1.62-1.62M18.16 5.84l1.62-1.62M12 7.5a4.5 4.5 0 1 1 0 9 4.5 4.5 0 0 1 0-9Z" />
                </svg>
              ) : (
                // Moon Icon
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.72 9.72 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 0 0 9.002-5.998Z" />
                </svg>
              )}
            </button>
          </div>
        </header>

        {/* PAGE CONTENT */}
        <main className="flex-grow px-4 md:px-6 pt-0 pb-20 md:pb-6 overflow-y-auto">
          <div className="max-w-5xl mx-auto w-full">
            {children}
          </div>
        </main>

        {/* MOBILE BOTTOM NAVIGATION */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 border-t border-border bg-card/95 backdrop-blur-md flex items-center justify-around z-30 px-2 pb-safe">
          {navItems.map((item) => {
            const active = pathname === item.path;
            return (
              <Link
                key={item.name}
                href={getNavHref(item.path)}
                className={`flex flex-col items-center justify-center flex-1 h-full py-1 text-[10px] font-semibold transition-all ${active ? 'text-primary' : 'text-muted'
                  }`}
              >
                {item.icon(active)}
                <span className="mt-1">{t(item.name, currentLanguage).split(' ')[0]}</span>
              </Link>
            );
          })}
        </nav>

      </div>

      {showPreloader && (
        <div
          id="Preloader"
          className={`transition-opacity duration-500 ease-in-out ${preloaderActive ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
        >
          <div className="circle-container">
            {/* Centered layout with logo and brand titles */}
            <div
              className="flex flex-col items-center gap-6 z-10 select-none transition-all duration-1000 ease-out"
              style={{
                transform: `scale(${preloaderActive ? 1 : 1.25})`,
                opacity: preloaderActive ? 1 : 0,
              }}
            >
              {/* Pulsing visual logo asset with blurred backdrop glow */}
              <div className="relative flex items-center justify-center w-28 h-28 md:w-32 md:h-32">
                <div className="absolute inset-0 bg-primary/20 rounded-full blur-2xl animate-pulse" />
                <Image
                  src={newsLogo}
                  alt="AI News Pulse Logo"
                  width={128}
                  height={128}
                  className="w-20 h-20 md:w-24 md:h-24 object-contain relative z-10 animate-pulse-glow"
                  priority
                />
              </div>

              {/* Centered Brand text overlay */}
              <div className="flex flex-col items-center text-center">
                <span className="text-white font-bold text-3xl sm:text-4xl tracking-[0.25em] uppercase font-sans drop-shadow-[0_2px_10px_rgba(0,0,0,0.9)]">
                  AI News Pulse
                </span>
                <span className="text-muted-light font-semibold text-[10px] sm:text-xs tracking-[0.3em] uppercase mt-2 opacity-80 drop-shadow-[0_2px_5px_rgba(0,0,0,0.9)]">
                  Indian & Global News
                </span>

                {/* Minimalist horizontal progress bar loader */}
                <div className="w-32 h-[1px] bg-white/15 mt-5 relative overflow-hidden rounded-full">
                  <div
                    className="h-full bg-white absolute left-0 top-0 transition-transform duration-100 ease-out"
                    style={{
                      width: '100%',
                      transform: `scaleX(${preloaderProgress})`,
                      transformOrigin: 'left center',
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background flex items-center justify-center text-muted">Loading interface...</div>}>
      <ClientLayoutContent>{children}</ClientLayoutContent>
    </Suspense>
  );
}
