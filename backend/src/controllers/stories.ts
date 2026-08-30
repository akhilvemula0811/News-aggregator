import { Request, Response } from 'express';
import axios from 'axios';
import { prisma } from '../config/db';
import { cache } from '../services/cache';
import { translateBatch } from '../services/translation';

const STATE_CITY_KEYWORDS: Record<string, string[]> = {
  'Maharashtra': ['Maharashtra', 'Mumbai', 'Bombay', 'Pune', 'Nagpur', 'Thane', 'Nashik', 'Aurangabad', 'Dombivli'],
  'Delhi': ['Delhi', 'New Delhi', 'Noida', 'Gurugram', 'Gurgaon', 'Safdarjung'],
  'Karnataka': ['Karnataka', 'Bengaluru', 'Bangalore', 'Mysuru', 'Mysore', 'Hubli', 'Dharwad', 'Hangal'],
  'Tamil Nadu': ['Tamil Nadu', 'Chennai', 'Madras', 'Coimbatore', 'Madurai'],
  'Andhra Pradesh': ['Andhra Pradesh', 'Andhra', 'Visakhapatnam', 'Vizag', 'Vijayawada', 'Guntur', 'Nellore'],
  'Telangana': ['Telangana', 'Hyderabad', 'Secunderabad', 'Warangal'],
  'Uttar Pradesh': ['Uttar Pradesh', 'Lucknow', 'Kanpur', 'Agra', 'Varanasi', 'Mathura', 'Ghaziabad'],
  'West Bengal': ['West Bengal', 'Kolkata', 'Calcutta', 'Howrah', 'Darjeeling'],
  'Kerala': ['Kerala', 'Kochi', 'Cochin', 'Thiruvananthapuram', 'Trivandrum', 'Kozhikode', 'Calicut'],
  'Gujarat': ['Gujarat', 'Ahmedabad', 'Surat', 'Vadodara', 'Baroda', 'Rajkot'],
  'Rajasthan': ['Rajasthan', 'Jaipur', 'Jodhpur', 'Udaipur', 'Kota'],
  'Punjab': ['Punjab', 'Amritsar', 'Ludhiana', 'Jalandhar', 'Patiala'],
  'Haryana': ['Haryana', 'Faridabad', 'Ambala', 'Panipat'],
  'Bihar': ['Bihar', 'Patna', 'Gaya', 'Muzaffarpur'],
  'Madhya Pradesh': ['Madhya Pradesh', 'Bhopal', 'Indore', 'Gwalior', 'Jabalpur'],
  'Arunachal Pradesh': ['Arunachal Pradesh', 'Arunachal', 'Itanagar', 'Tawang', 'Ziro', 'Pasighat'],
  'Assam': ['Assam', 'Guwahati', 'Dispur', 'Dibrugarh', 'Silchar', 'Jorhat', 'Tezpur'],
  'Chhattisgarh': ['Chhattisgarh', 'Raipur', 'Bhilai', 'Bilaspur', 'Durg', 'Korba', 'Jagdalpur'],
  'Goa': ['Goa', 'Panaji', 'Panjim', 'Margao', 'Vasco da Gama', 'Mapusa'],
  'Himachal Pradesh': ['Himachal Pradesh', 'Himachal', 'Shimla', 'Dharamshala', 'Manali', 'Solan', 'Mandi'],
  'Jharkhand': ['Jharkhand', 'Ranchi', 'Jamshedpur', 'Dhanbad', 'Bokaro', 'Deoghar', 'Hazaribagh'],
  'Manipur': ['Manipur', 'Imphal', 'Churachandpur', 'Thoubal'],
  'Meghalaya': ['Meghalaya', 'Shillong', 'Tura', 'Jowai', 'Cherrapunji'],
  'Mizoram': ['Mizoram', 'Aizawl', 'Lunglei', 'Champhai'],
  'Nagaland': ['Nagaland', 'Kohima', 'Dimapur', 'Mokokchung'],
  'Odisha': ['Odisha', 'Orissa', 'Bhubaneswar', 'Cuttack', 'Rourkela', 'Puri', 'Sambalpur', 'Balasore'],
  'Sikkim': ['Sikkim', 'Gangtok', 'Namchi', 'Geyzing'],
  'Tripura': ['Tripura', 'Agartala', 'Dharmanagar', 'Udaipur Tripura'],
  'Uttarakhand': ['Uttarakhand', 'Dehradun', 'Haridwar', 'Rishikesh', 'Nainital', 'Haldwani', 'Roorkee']
};

const STATE_TO_CHANNELS: Record<string, string[]> = {
  'Maharashtra': ['ABP Majha'],
  'Delhi': ['NDTV'],
  'Karnataka': ['TV9 Kannada'],
  'Tamil Nadu': ['Oneindia Tamil'],
  'Andhra Pradesh': ['TV9 Telugu'],
  'Telangana': ['V6 News'],
  'Uttar Pradesh': ['Amar Ujala Uttar Pradesh'],
  'West Bengal': ['ABP Ananda'],
  'Kerala': ['Asianet News'],
  'Gujarat': ['TV9 Gujarati'],
  'Rajasthan': ['Amar Ujala Rajasthan'],
  'Punjab': ['Amar Ujala Punjab'],
  'Haryana': ['Amar Ujala Haryana'],
  'Bihar': ['Amar Ujala Bihar'],
  'Madhya Pradesh': ['IBC24'],
  'Arunachal Pradesh': ['Arunachal Today'],
  'Assam': ['News Live'],
  'Chhattisgarh': ['IBC24'],
  'Goa': ['Prudent Media'],
  'Himachal Pradesh': ['Amar Ujala Himachal Pradesh'],
  'Jharkhand': ['Zee Bihar Jharkhand'],
  'Manipur': ['Impact TV'],
  'Meghalaya': ['Batesi TV'],
  'Mizoram': ['Zonet Cable TV'],
  'Nagaland': ['Hornbill TV'],
  'Odisha': ['OTV (Odisha TV)', 'OTV'],
  'Sikkim': ['Sikkim Chronicle'],
  'Tripura': ['Headlines Tripura'],
  'Uttarakhand': ['Amar Ujala Uttarakhand']
};

async function scrapeFullContent(url: string): Promise<string | null> {
  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
      timeout: 8000, // Increased timeout to 8 seconds
    });

    const html = response.data;
    if (typeof html !== 'string') return null;

    // Strip scripts, styles, comments, head, header, footer, nav, and iframe tags to avoid pulling code/boilerplates
    let cleanedHtml = html
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<!--[\s\S]*?-->/g, '')
      .replace(/<head[\s\S]*?<\/head>/gi, '')
      .replace(/<header[\s\S]*?<\/header>/gi, '')
      .replace(/<footer[\s\S]*?<\/footer>/gi, '')
      .replace(/<nav[\s\S]*?<\/nav>/gi, '')
      .replace(/<iframe[\s\S]*?<\/iframe>/gi, '');

    // Try to extract the main content container to avoid sidebars/footers
    const articleContainerRegexes = [
      /<article[^>]*>([\s\S]*?)<\/article>/i,
      /<main[^>]*>([\s\S]*?)<\/main>/i,
      /<div[^>]*class="[^"]*(?:article-body|story-body|article-content|story-content|content-body|entry-content|main-content|post-content|article-text|story-text|article-detail|post-detail|story-detail|entry-body)[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
      /<div[^>]*id="[^"]*(?:article-body|story-body|article-content|story-content|content-body|entry-content|main-content|post-content|article-text|story-text|article-detail|post-detail|story-detail|entry-body)[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
    ];

    let contentHtml = cleanedHtml;
    for (const regex of articleContainerRegexes) {
      const match = cleanedHtml.match(regex);
      if (match && match[1] && match[1].length > 200) { // Reduced minimum HTML length to 200
        contentHtml = match[1];
        break;
      }
    }

    // Extract all <p> tags
    const pMatches = contentHtml.match(/<p[^>]*>([\s\S]*?)<\/p>/gi);
    let paragraphsToProcess: string[] = [];
    
    if (pMatches && pMatches.length > 0) {
      paragraphsToProcess = pMatches;
    } else {
      // Fallback: If no <p> tags are found, extract text blocks/lines from the container
      const plainText = contentHtml.replace(/<[^>]*>/g, '\n');
      const lines = plainText
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 50); // keep substantial text segments
      if (lines.length > 0) {
        paragraphsToProcess = lines;
      } else {
        return null;
      }
    }

    const cleanedParagraphs = paragraphsToProcess
      .map(p => {
        // Remove nested tags
        let text = p.replace(/<[^>]*>/g, '');
        // Decode HTML entities
        text = text
          .replace(/&nbsp;/g, ' ')
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'")
          .replace(/&#039;/g, "'")
          .replace(/\s+/g, ' ')
          .trim();

        // Strip out photo/image credit text patterns (e.g. "| Photo Credit: File Photo")
        text = text.replace(/\|?\s*(?:photo|image|pic)\s*credit\s*:\s*[^|]*/gi, '');
        return text.trim();
      })
      .filter(text => {
        // Filter out boilerplate text
        if (text.length < 30) return false;
        
        const lower = text.toLowerCase();
        
        const blacklistedKeywords = [
          'subscribe',
          'cookie',
          'privacy policy',
          'all rights reserved',
          'terms and conditions',
          'copyright',
          'feedback',
          'advertisement',
          'unlock these with',
          'subscription benefits',
          'newsletter',
          'books of the week',
          'decoding the headlines',
          'news and reviews from',
          'writes to you on',
          'sign in to read',
          'premium stories',
          'read also',
          'also read',
          'related stories',
          'follow us',
          'click here',
          'download the app',
          'telegram channel',
          'staff reporter',
          'registered office',
          'editorial team',
          'about us',
          'view from india',
          'looking at world affairs',
          'first day first show',
          'science for all',
          'data point',
          'health matters',
          'today\'s cache',
        ];

        for (const word of blacklistedKeywords) {
          if (lower.includes(word)) {
            return false;
          }
        }
        return true;
      });

    if (cleanedParagraphs.length === 0) return null;
    return cleanedParagraphs.join('\n\n');
  } catch (error: any) {
    console.error(`[Scraper] Failed to scrape full content for ${url}:`, error.message);
    return null;
  }
}

function extractHnArticleUrl(description: string): string | null {
  if (!description) return null;
  const match = description.match(/Article URL:\s*(https?:\/\/[^\s]+)/i);
  return match ? match[1] : null;
}

function extractSummaryFromContent(content: string, title?: string): string {
  if (!content) return title || 'Summary unavailable.';
  
  // Clean up whitespace
  const cleanContent = content.replace(/\s+/g, ' ').trim();
  
  // Split into sentences (simple regex split on periods followed by space)
  const sentences = cleanContent.split(/(?<=[.!?])\s+/);
  
  // Take first 3 sentences that are reasonably long
  const validSentences = sentences
    .filter(s => s.length > 15 && !s.includes('http://') && !s.includes('https://'))
    .slice(0, 3);
    
  if (validSentences.length > 0) {
    const summary = validSentences.join(' ');
    if (summary.length > 100) return summary;
  }
  
  // Fallback: take first 250 characters
  return cleanContent.slice(0, 250) + (cleanContent.length > 250 ? '...' : '');
}

async function getOrGenerateProperSummary(story: any): Promise<string> {
  let summary = story.summary || '';
  
  // Clean HTML from summary on the fly if present
  if (summary && (summary.includes('<img') || summary.includes('<a') || /<[^>]*>/.test(summary))) {
    const cleaned = summary.replace(/<[^>]*>/g, '').trim();
    if (cleaned.length > 0) {
      summary = cleaned;
      // Update in DB in the background
      prisma.story.update({
        where: { id: story.id },
        data: { summary: cleaned }
      }).catch(err => console.error(`[DB] Failed to save cleaned summary for story ${story.id}:`, err.message));
    } else {
      summary = ''; // Force regeneration if it becomes empty
    }
  }
  
  const isInvalid = !summary || 
                    summary === 'Summary unavailable.' || 
                    summary.includes('Article URL:') || 
                    summary.includes('Comments URL:');
                    
  if (!isInvalid) {
    return summary;
  }
  
  console.log(`[StoriesController] Story "${story.title}" has invalid summary. Attempting to fetch proper summary...`);
  
  const articles = story.articles || [];
  if (articles.length > 0) {
    const primaryArticle = articles[0];
    let url = primaryArticle.url;
    
    // Hacker News URL override
    if (primaryArticle.source?.name === 'Hacker News Frontpage' || primaryArticle.sourceName === 'Hacker News Frontpage') {
      const hnUrl = extractHnArticleUrl(primaryArticle.description || '');
      if (hnUrl) {
        url = hnUrl;
        console.log(`[StoriesController] Hacker News article URL override: ${url}`);
      }
    }
    
    if (url) {
      const scrapedContent = await scrapeFullContent(url);
      if (scrapedContent && scrapedContent.length > 100) {
        const newSummary = extractSummaryFromContent(scrapedContent, story.title);
        
        // Write back to database in the background
        prisma.story.update({
          where: { id: story.id },
          data: { summary: newSummary }
        }).catch(err => console.error(`[DB] Failed to save generated summary for story ${story.id}:`, err.message));
        
        return newSummary;
      }
    }
  }
  
  // Clean fallback
  if (summary.includes('Article URL:')) {
    return `Discussion and comments on the article "${story.title}".`;
  }
  
  return story.title || 'Summary unavailable.';
}

// Decay constant: determines how fast interests decay.
// E.g., half-life of 3 days. decayRate = ln(2) / 3 = 0.231 per day = 0.0096 per hour.
const DECAY_RATE_PER_HOUR = 0.0096;
const ENGAGEMENT_PRIMARY_INCREMENT = 0.25;
const ENGAGEMENT_SECONDARY_INCREMENT = 0.10;

/**
 * Exponentially decay category weights based on hours elapsed
 */
function decayInterests(interests: Record<string, number>, hoursElapsed: number): Record<string, number> {
  if (hoursElapsed <= 0) return interests;
  const decayed: Record<string, number> = {};
  const decayFactor = Math.exp(-DECAY_RATE_PER_HOUR * hoursElapsed);

  for (const [category, weight] of Object.entries(interests)) {
    // Decay weight, drop if extremely close to 0
    const newWeight = weight * decayFactor;
    if (newWeight > 0.01) {
      decayed[category] = parseFloat(newWeight.toFixed(4));
    }
  }
  return decayed;
}

function sortStoriesByImportance(stories: any[]): any[] {
  return [...stories].sort((a, b) => {
    const scoreA = (a.articlesCount || a.articles?.length || 0) * (a.credibilityScore === 'VERIFIED' ? 1.5 : 1.0);
    const scoreB = (b.articlesCount || b.articles?.length || 0) * (b.credibilityScore === 'VERIFIED' ? 1.5 : 1.0);
    
    if (scoreB !== scoreA) {
      return scoreB - scoreA;
    }
    
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}

export class StoriesController {
  /**
   * GET /api/stories
   * Fetch stories with search, filters, pagination, and personalization ranking
   */
  async getStories(req: Request, res: Response) {
    try {
      const { category, search, state, language, deviceId, page = '1', limit = '10', grouped } = req.query;
      const pageNum = parseInt(page as string) || 1;
      const limitNum = parseInt(limit as string) || 10;
      const skip = (pageNum - 1) * limitNum;

      const targetLang = (language as string || '').toLowerCase();
      const cutoffTime = new Date(Date.now() - 42 * 60 * 60 * 1000);

      if (grouped === 'true') {
        const categories = [
          'National News',
          'Politics',
          'Stocks/Business',
          'AI & Tech Deep Dives',
          'Startup & Funding Tracker',
          'World News',
          'Technology',
          'Science',
          'Sports',
          'Opinion vs Fact',
          'Fact-Check / Disputed Claims',
          'Local + Regional Pulse',
          'Jobs & Career',
          'Movies/Entertainment',
          'Health',
          'Education',
          'Crime',
          'Automobile',
          'Travel',
          'Weather',
          'Food'
        ];

        const groupedResults: Record<string, any[]> = {};

        // Query database for each category in parallel
        await Promise.all(
          categories.map(async (cat) => {
            const catWhere: any = {
              primaryCategory: cat,
              createdAt: {
                gte: cutoffTime
              }
            };

            const catStories = await prisma.story.findMany({
              where: catWhere,
              include: {
                articles: {
                  include: {
                    source: true
                  }
                }
              },
              orderBy: {
                createdAt: 'desc'
              },
              take: 40
            });

            let results = await Promise.all(
              catStories.map(async (story) => {
                const sources = Array.from(new Set(story.articles.map((a: any) => a.source?.name || 'Unknown')));
                const image = story.articles.find((a: any) => a.urlToImage)?.urlToImage || null;
                const summary = await getOrGenerateProperSummary(story);
                return {
                  id: story.id,
                  title: story.title,
                  summary,
                  credibilityScore: story.credibilityScore,
                  primaryCategory: story.primaryCategory,
                  secondaryCategory: story.secondaryCategory,
                  isDeveloping: story.isDeveloping,
                  createdAt: story.createdAt,
                  updatedAt: story.updatedAt,
                  sources,
                  imageUrl: image,
                  articlesCount: story.articles.length
                };
              })
            );

            // Sort by importance and slice to 20
            results = sortStoriesByImportance(results).slice(0, 20);

            if (targetLang && targetLang !== 'en') {
              const textsToTranslate: string[] = [];
              results.forEach(story => {
                textsToTranslate.push(story.title);
                textsToTranslate.push(story.summary);
              });

              try {
                const translatedTexts = await translateBatch(textsToTranslate, targetLang);
                let transIndex = 0;
                results.forEach(story => {
                  story.title = translatedTexts[transIndex++] || story.title;
                  story.summary = translatedTexts[transIndex++] || story.summary;
                });
              } catch (err) {
                console.error(`[StoriesController] Translation failed for category ${cat}:`, err);
              }
            }

            groupedResults[cat] = results;
          })
        );

        return res.json({
          stories: groupedResults
        });
      }

      // Build database query filters
      const where: any = {
        createdAt: {
          gte: cutoffTime
        }
      };

      if (category) {
        where.primaryCategory = category as string;
      }

      if (search) {
        where.OR = [
          { title: { contains: search as string } },
          { summary: { contains: search as string } },
        ];
      }

      // Regional pulse filtration
      // If a state is provided, filter stories that contain articles from corresponding states.
      if (state && !category) {
        const channels = STATE_TO_CHANNELS[state as string] || [];
        where.articles = {
          some: {
            source: {
              name: { in: channels }
            }
          },
        };
      }

      // Only apply personalization on the general home feed (no category/search/state filters)
      const hasPersonalization = !!(deviceId && typeof deviceId === 'string' && !category && !search && !state);
      const isRegionalPulse = !!(state && !category);
      
      const queryOptions: any = {
        where,
        include: {
          articles: {
            include: {
              source: true,
            },
          },
          claims: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      };

      if (hasPersonalization || isRegionalPulse) {
        queryOptions.take = 100;
      } else {
        queryOptions.take = limitNum;
        queryOptions.skip = skip;
      }

      const stories = await prisma.story.findMany(queryOptions) as any[];

      let results = await Promise.all(
        stories.map(async (story) => {
          // Find main representative article or list sources
          const sources = Array.from(new Set(story.articles.map((a: any) => a.source?.name || 'Unknown')));
          const image = story.articles.find((a: any) => a.urlToImage)?.urlToImage || null;
          const summary = await getOrGenerateProperSummary(story);
          
          return {
            id: story.id,
            title: story.title,
            summary,
            credibilityScore: story.credibilityScore,
            primaryCategory: story.primaryCategory,
            secondaryCategory: story.secondaryCategory,
            isDeveloping: story.isDeveloping,
            createdAt: story.createdAt,
            updatedAt: story.updatedAt,
            sources,
            imageUrl: image,
            articlesCount: story.articles.length,
          };
        })
      );

      if (isRegionalPulse) {
        results = sortStoriesByImportance(results);
      }

      // Apply personalization if deviceId is provided
      if (deviceId && typeof deviceId === 'string') {
        const userPref = await prisma.userPreference.findUnique({
          where: { deviceId },
        });

        if (userPref && userPref.categoryInterests) {
          try {
            let interests = JSON.parse(userPref.categoryInterests) as Record<string, number>;
            
            // Apply interest decay based on last active time
            const now = new Date();
            const elapsedHours = (now.getTime() - new Date(userPref.lastActive).getTime()) / (1000 * 60 * 60);
            
            if (elapsedHours > 1) {
              interests = decayInterests(interests, elapsedHours);
              await prisma.userPreference.update({
                where: { deviceId },
                data: {
                  categoryInterests: JSON.stringify(interests),
                  lastActive: now,
                },
              });
            }

            // Calculate personalization score per story
            // Score = base_recency_score * (1 + user_category_weight)
            const scoredResults = results.map(story => {
              const weight = interests[story.primaryCategory] || 0;
              
              // Recency component (exponential decay based on story age in hours)
              const ageHours = (now.getTime() - new Date(story.createdAt).getTime()) / (1000 * 60 * 60);
              const recencyScore = Math.exp(-0.015 * ageHours); // drops slowly over days

              const personalizationScore = recencyScore * (1 + weight);

              return {
                ...story,
                personalizationScore,
              };
            });

            // Sort by personalization score descending
            scoredResults.sort((a, b) => b.personalizationScore - a.personalizationScore);
            results = scoredResults;
          } catch (e) {
            console.error('[StoriesController] Error parsing personalization weights:', e);
          }
        }
      }

      // Count total matches for pagination indicators. If personalization or regional pulse is active, count is capped by the pool size.
      const total = (hasPersonalization || isRegionalPulse)
        ? results.length 
        : await prisma.story.count({ where });
      const paginatedResults = (hasPersonalization || isRegionalPulse)
        ? results.slice(skip, skip + limitNum) 
        : results;

      // Apply dynamic Gemini translation if regional language is selected
      if (targetLang && targetLang !== 'en') {
        const textsToTranslate: string[] = [];
        paginatedResults.forEach(story => {
          textsToTranslate.push(story.title);
          textsToTranslate.push(story.summary);
        });

        const translatedTexts = await translateBatch(textsToTranslate, targetLang);

        let transIndex = 0;
        paginatedResults.forEach(story => {
          story.title = translatedTexts[transIndex++] || story.title;
          story.summary = translatedTexts[transIndex++] || story.summary;
        });
      }

      return res.json({
        stories: paginatedResults,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(total / limitNum),
        },
      });
    } catch (error: any) {
      console.error('[StoriesController] getStories error:', error.message);
      return res.status(500).json({ error: 'Failed to retrieve stories' });
    }
  }

  /**
   * GET /api/stories/:id
   * Fetch single story with full details (timeline, claims, diffs, linked articles)
   */
  async getStoryDetails(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const targetLang = (req.query.language as string || '').toLowerCase();

      // Try reading from cache first (including language code in key)
      const cacheKey = `story:details:${id}:${targetLang || 'en'}`;
      const cachedStory = await cache.get<any>(cacheKey);
      if (cachedStory) {
        // If the cached story contains promotional boilerplate, bypass cache to trigger re-scraping
        const hasBoilerplateInCache = cachedStory.articles.some((art: any) => {
          const lower = (art.content || '').toLowerCase();
          return lower.includes('subscription benefits') || 
                 lower.includes('first day first show') || 
                 lower.includes('science for all') ||
                 lower.includes('today\'s cache') ||
                 lower.includes('today&#039;s cache') ||
                 lower.includes('health matters') ||
                 lower.includes('view from india') ||
                 lower.includes('data point decoding');
        });
        if (!hasBoilerplateInCache) {
          return res.json(cachedStory);
        }
      }

      const story = await prisma.story.findUnique({
        where: { id },
        include: {
          articles: {
            include: {
              source: true,
            },
          },
          claims: true,
          timelines: {
            orderBy: {
              eventTime: 'asc',
            },
          },
          diffs: {
            orderBy: {
              createdAt: 'desc',
            },
          },
        },
      });

      if (!story) {
        return res.status(404).json({ error: 'Story not found' });
      }

      // Lazy scrape short/missing article contents
      const mappedArticles = [];
      for (const art of story.articles) {
        let content = art.content;
        const isShort = !content || content.length < 300;
        const lowerContent = (content || '').toLowerCase();
        const containsBoilerplate = !!(lowerContent && (
          lowerContent.includes('subscription benefits') || 
          lowerContent.includes('first day first show') || 
          lowerContent.includes('science for all') || 
          lowerContent.includes('health matters') || 
          lowerContent.includes('today\'s cache') ||
          lowerContent.includes('today&#039;s cache') ||
          lowerContent.includes('the hindu on books') ||
          lowerContent.includes('view from india') ||
          lowerContent.includes('data point decoding')
        ));
        if ((isShort || containsBoilerplate) && art.url) {
          console.log(`[Scraper] Lazy scraping article content for: ${art.title} (${art.url})`);
          const scraped = await scrapeFullContent(art.url);
          if (scraped && scraped.length > (content?.length || 0)) {
            content = scraped;
            // Write back to database in the background (non-blocking)
            prisma.article.update({
              where: { id: art.id },
              data: { content: scraped },
            }).catch((err: any) => console.error(`[DB] Failed to save scraped content for article ${art.id}:`, err.message));
          }
        }
        mappedArticles.push({
          id: art.id,
          title: art.title,
          description: art.description,
          content,
          url: art.url,
          urlToImage: art.urlToImage,
          publishedAt: art.publishedAt,
          author: art.author,
          sourceName: art.source?.name || 'Unknown',
          sourceUrl: art.source?.url || '#',
        });
      }

      const properSummary = await getOrGenerateProperSummary(story);

      const result = {
        id: story.id,
        title: story.title,
        summary: properSummary,
        credibilityScore: story.credibilityScore,
        primaryCategory: story.primaryCategory,
        secondaryCategory: story.secondaryCategory,
        isDeveloping: story.isDeveloping,
        createdAt: story.createdAt,
        updatedAt: story.updatedAt,
        articles: mappedArticles,
        claims: story.claims.map(c => ({
          id: c.id,
          claimText: c.claimText,
          status: c.status,
          sourcesCount: c.sourcesCount,
        })),
        timeline: story.timelines.map(t => ({
          id: t.id,
          eventTime: t.eventTime,
          eventTitle: t.eventTitle,
          eventDescription: t.eventDescription,
          sourceUrl: t.sourceUrl,
        })),
        diffs: story.diffs.map(d => ({
          id: d.id,
          diffDate: d.diffDate,
          diffContent: d.diffContent,
        })),
      };

      // Apply dynamic Gemini translation if regional language is selected
      if (targetLang && targetLang !== 'en') {
        const textsToTranslate: string[] = [];
        
        textsToTranslate.push(result.title);
        textsToTranslate.push(result.summary);
        
        result.articles.forEach(art => {
          textsToTranslate.push(art.title || '');
          textsToTranslate.push(art.description || '');
          textsToTranslate.push(art.content || '');
        });
        
        result.claims.forEach(c => {
          textsToTranslate.push(c.claimText || '');
        });
        
        result.timeline.forEach(t => {
          textsToTranslate.push(t.eventTitle || '');
          textsToTranslate.push(t.eventDescription || '');
        });
        
        result.diffs.forEach(d => {
          textsToTranslate.push(d.diffContent || '');
        });

        const translatedTexts = await translateBatch(textsToTranslate, targetLang);

        let transIndex = 0;
        
        result.title = translatedTexts[transIndex++] || result.title;
        result.summary = translatedTexts[transIndex++] || result.summary;
        
        result.articles.forEach(art => {
          art.title = translatedTexts[transIndex++] || art.title;
          art.description = translatedTexts[transIndex++] || art.description;
          art.content = translatedTexts[transIndex++] || art.content;
        });
        
        result.claims.forEach(c => {
          c.claimText = translatedTexts[transIndex++] || c.claimText;
        });
        
        result.timeline.forEach(t => {
          t.eventTitle = translatedTexts[transIndex++] || t.eventTitle;
          t.eventDescription = translatedTexts[transIndex++] || t.eventDescription;
        });
        
        result.diffs.forEach(d => {
          d.diffContent = translatedTexts[transIndex++] || d.diffContent;
        });
      }

      // Cache for 15 minutes
      await cache.set(cacheKey, result, 900);

      return res.json(result);
    } catch (error: any) {
      console.error('[StoriesController] getStoryDetails error:', error.message);
      return res.status(500).json({ error: 'Failed to retrieve story details' });
    }
  }

  /**
   * POST /api/stories/:id/engagement
   * Record user engagement (click/view) and update category weights with interest decay
   */
  async logEngagement(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { deviceId } = req.body;

      if (!deviceId) {
        return res.status(400).json({ error: 'deviceId is required' });
      }

      const story = await prisma.story.findUnique({
        where: { id },
      });

      if (!story) {
        return res.status(404).json({ error: 'Story not found' });
      }

      const now = new Date();
      let userPref = await prisma.userPreference.findUnique({
        where: { deviceId },
      });

      let interests: Record<string, number> = {};

      if (userPref) {
        interests = JSON.parse(userPref.categoryInterests) as Record<string, number>;
        
        // 1. Decay interest weights based on time since last active
        const elapsedHours = (now.getTime() - new Date(userPref.lastActive).getTime()) / (1000 * 60 * 60);
        interests = decayInterests(interests, elapsedHours);
      }

      // 2. Increment weights for this story's categories
      const primCat = story.primaryCategory;
      const secCat = story.secondaryCategory;

      interests[primCat] = (interests[primCat] || 0) + ENGAGEMENT_PRIMARY_INCREMENT;
      if (secCat) {
        interests[secCat] = (interests[secCat] || 0) + ENGAGEMENT_SECONDARY_INCREMENT;
      }

      // Ensure weights stay within sane range, capping at 5.0
      interests[primCat] = Math.min(interests[primCat], 5.0);
      if (secCat) {
        interests[secCat] = Math.min(interests[secCat], 5.0);
      }

      // Save user preference
      userPref = await prisma.userPreference.upsert({
        where: { deviceId },
        update: {
          categoryInterests: JSON.stringify(interests),
          lastActive: now,
        },
        create: {
          deviceId,
          categoryInterests: JSON.stringify(interests),
          savedStories: JSON.stringify([]),
          lastActive: now,
        },
      });

      return res.json({
        status: 'success',
        interests,
      });
    } catch (error: any) {
      console.error('[StoriesController] logEngagement error:', error.message);
      return res.status(500).json({ error: 'Failed to log engagement' });
    }
  }

  /**
   * GET /api/personalization
   * Retrieve user interests mapping and bookmark list
   */
  async getPersonalizationProfile(req: Request, res: Response) {
    try {
      const { deviceId } = req.query;

      if (!deviceId || typeof deviceId !== 'string') {
        return res.status(400).json({ error: 'deviceId query parameter is required' });
      }

      const userPref = await prisma.userPreference.findUnique({
        where: { deviceId },
      });

      if (!userPref) {
        return res.json({
          interests: {},
          savedStories: [],
        });
      }

      const interests = JSON.parse(userPref.categoryInterests) as Record<string, number>;
      const savedIds = JSON.parse(userPref.savedStories) as string[];

      // Fetch actual bookmarked stories metadata
      const bookmarkedStories = await prisma.story.findMany({
        where: {
          id: { in: savedIds },
        },
        include: {
          articles: {
            include: {
              source: true,
            },
          },
        },
      });

      const savedStories = bookmarkedStories.map(story => {
        const image = story.articles.find(a => a.urlToImage)?.urlToImage || null;
        const sources = Array.from(new Set(story.articles.map((a: any) => a.source?.name || 'Unknown')));
        return {
          id: story.id,
          title: story.title,
          summary: story.summary,
          credibilityScore: story.credibilityScore,
          primaryCategory: story.primaryCategory,
          secondaryCategory: story.secondaryCategory,
          isDeveloping: story.isDeveloping,
          imageUrl: image,
          createdAt: story.createdAt,
          updatedAt: story.updatedAt,
          sources,
          articlesCount: story.articles.length,
        };
      });

      // Apply dynamic Gemini translation if regional language is selected
      const language = req.query.language as string;
      const targetLang = (language || '').toLowerCase();
      if (targetLang && targetLang !== 'en') {
        const textsToTranslate: string[] = [];
        savedStories.forEach(story => {
          textsToTranslate.push(story.title);
          textsToTranslate.push(story.summary);
        });

        const translatedTexts = await translateBatch(textsToTranslate, targetLang);

        let transIndex = 0;
        savedStories.forEach(story => {
          story.title = translatedTexts[transIndex++] || story.title;
          story.summary = translatedTexts[transIndex++] || story.summary;
        });
      }

      return res.json({
        interests,
        savedStories,
      });
    } catch (error: any) {
      console.error('[StoriesController] getPersonalizationProfile error:', error.message);
      return res.status(500).json({ error: 'Failed to retrieve profile' });
    }
  }

  /**
   * POST /api/stories/:id/bookmark
   * Toggle save/bookmark status of a story for a user
   */
  async toggleBookmark(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { deviceId } = req.body;

      if (!deviceId) {
        return res.status(400).json({ error: 'deviceId is required' });
      }

      const story = await prisma.story.findUnique({
        where: { id },
      });

      if (!story) {
        return res.status(404).json({ error: 'Story not found' });
      }

      let userPref = await prisma.userPreference.findUnique({
        where: { deviceId },
      });

      let savedStories: string[] = [];

      if (userPref) {
        savedStories = JSON.parse(userPref.savedStories) as string[];
      }

      const idx = savedStories.indexOf(id);
      let bookmarked = false;

      if (idx > -1) {
        savedStories.splice(idx, 1); // remove bookmark
      } else {
        savedStories.push(id); // add bookmark
        bookmarked = true;
      }

      userPref = await prisma.userPreference.upsert({
        where: { deviceId },
        update: {
          savedStories: JSON.stringify(savedStories),
          lastActive: new Date(),
        },
        create: {
          deviceId,
          categoryInterests: JSON.stringify({}),
          savedStories: JSON.stringify(savedStories),
          lastActive: new Date(),
        },
      });

      return res.json({
        status: 'success',
        bookmarked,
        savedCount: savedStories.length,
      });
    } catch (error: any) {
      console.error('[StoriesController] toggleBookmark error:', error.message);
      return res.status(500).json({ error: 'Failed to toggle bookmark' });
    }
  }
}

export const storiesController = new StoriesController();
