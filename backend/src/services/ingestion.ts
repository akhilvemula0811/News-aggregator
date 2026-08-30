import axios from 'axios';
import Parser from 'rss-parser';
import { prisma } from '../config/db';

function cleanHtmlText(text: string | null): string | null {
  if (!text) return null;
  
  // Remove HTML tags
  let cleaned = text.replace(/<[^>]*>/g, '').trim();
  
  // Replace HTML entities
  cleaned = cleaned
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'");

  // Remove any remaining consecutive whitespace/newlines
  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  
  return cleaned.length > 0 ? cleaned : null;
}

const parser = new Parser({
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'application/rss+xml, application/rdf+xml, application/atom+xml, application/xml, text/xml',
  },
  timeout: 8000,
  customFields: {
    item: [
      ['media:content', 'media'],
      ['media:thumbnail', 'thumbnail'],
      ['enclosure', 'enclosure'],
      ['image', 'image'],
    ],
  },
});

interface IngestedArticle {
  title: string;
  description: string | null;
  content: string | null;
  url: string;
  urlToImage: string | null;
  publishedAt: Date;
  author: string | null;
  sourceName: string;
  sourceUrl: string;
  category: string; // Feed type: e.g. "General", "AI & Tech Deep Dives", "Startup & Funding Tracker", "National News"
}

const CATEGORY_IMAGES: Record<string, string> = {
  'Politics': 'https://images.unsplash.com/photo-1540910419892-4a36d2c3266c?w=600&auto=format&fit=crop&q=60',
  'Sports': 'https://images.unsplash.com/photo-1517649763962-0c623066013b?w=600&auto=format&fit=crop&q=60',
  'Technology': 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=600&auto=format&fit=crop&q=60',
  'Stocks/Business': 'https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?w=600&auto=format&fit=crop&q=60',
  'Science': 'https://images.unsplash.com/photo-1507668077129-56e32842fceb?w=600&auto=format&fit=crop&q=60',
  'Health': 'https://images.unsplash.com/photo-1505751172876-fa1923c5c528?w=600&auto=format&fit=crop&q=60',
  'Movies/Entertainment': 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=600&auto=format&fit=crop&q=60',
  'Crime': 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=600&auto=format&fit=crop&q=60',
  'Education': 'https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?w=600&auto=format&fit=crop&q=60',
  'Weather': 'https://images.unsplash.com/photo-1428908728789-d2de25dbd4e2?w=600&auto=format&fit=crop&q=60',
  'Travel': 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=600&auto=format&fit=crop&q=60',
  'Food': 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&auto=format&fit=crop&q=60',
  'Fashion': 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=600&auto=format&fit=crop&q=60',
  'Gaming': 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=600&auto=format&fit=crop&q=60',
  'Jobs & Career': 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=600&auto=format&fit=crop&q=60',
  'Local + Regional Pulse': 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=600&auto=format&fit=crop&q=60'
};

// Configurable RSS Feeds
export const RSS_SOURCES = [
  {
    name: 'PIB (Press Information Bureau)',
    url: 'https://pib.gov.in/Rss/Rssxml.aspx?OP=1', // English Release
    sourceUrl: 'https://pib.gov.in',
    category: 'National News',
    type: 'Government Policy',
  },
  {
    name: 'Times of India - Top Stories',
    url: 'https://timesofindia.indiatimes.com/rssfeedstopstories.cms',
    sourceUrl: 'https://timesofindia.indiatimes.com',
    category: 'General',
    type: 'Mainstream',
  },
  {
    name: 'Times of India - India',
    url: 'https://timesofindia.indiatimes.com/rssfeeds/296589292.cms',
    sourceUrl: 'https://timesofindia.indiatimes.com',
    category: 'National News',
    type: 'Mainstream',
  },
  {
    name: 'NDTV - Top Stories',
    url: 'https://feeds.feedburner.com/NdtvNews-TopStories',
    sourceUrl: 'https://www.ndtv.com',
    category: 'General',
    type: 'Mainstream',
  },
  {
    name: 'NDTV - India News',
    url: 'https://feeds.feedburner.com/ndtvindianews',
    sourceUrl: 'https://www.ndtv.com',
    category: 'National News',
    type: 'Mainstream',
  },
  {
    name: 'The Hindu',
    url: 'https://www.thehindu.com/feeder/default.rss',
    sourceUrl: 'https://www.thehindu.com',
    category: 'General',
    type: 'Mainstream',
  },
  {
    name: 'arXiv cs.AI',
    url: 'http://export.arxiv.org/rss/cs.AI',
    sourceUrl: 'https://arxiv.org',
    category: 'AI & Tech Deep Dives',
    type: 'Academic',
  },
  {
    name: 'Hacker News Frontpage',
    url: 'https://hnrss.org/frontpage',
    sourceUrl: 'https://news.ycombinator.com',
    category: 'AI & Tech Deep Dives',
    type: 'Tech Community',
  },
  {
    name: 'OpenAI Blog',
    url: 'https://openai.com/news/rss.xml',
    sourceUrl: 'https://openai.com',
    category: 'AI & Tech Deep Dives',
    type: 'Corporate AI',
  },
  {
    name: 'Google DeepMind Blog',
    url: 'https://deepmind.google/blog/rss.xml',
    sourceUrl: 'https://deepmind.google',
    category: 'AI & Tech Deep Dives',
    type: 'Corporate AI',
  },
  {
    name: 'Anthropic News (RSSHub)',
    url: 'https://rsshub.bestblogs.dev/anthropic/news',
    sourceUrl: 'https://www.anthropic.com',
    category: 'AI & Tech Deep Dives',
    type: 'Corporate AI',
  },
  {
    name: 'The Hindu - Fashion',
    url: 'https://www.thehindu.com/life-and-style/fashion/feeder/default.rss',
    sourceUrl: 'https://www.thehindu.com/life-and-style/fashion',
    category: 'Fashion',
    type: 'Mainstream',
  },
  {
    name: 'The Hindu - Food',
    url: 'https://www.thehindu.com/life-and-style/food/feeder/default.rss',
    sourceUrl: 'https://www.thehindu.com/life-and-style/food',
    category: 'Food',
    type: 'Mainstream',
  },
  {
    name: 'Times of India - Sports',
    url: 'https://timesofindia.indiatimes.com/rssfeeds/4719148.cms',
    sourceUrl: 'https://timesofindia.indiatimes.com/sports',
    category: 'Sports',
    type: 'Mainstream',
  },
  {
    name: 'Times of India - Cricket',
    url: 'https://timesofindia.indiatimes.com/rssfeeds/54829575.cms',
    sourceUrl: 'https://timesofindia.indiatimes.com/sports/cricket',
    category: 'Sports',
    type: 'Mainstream',
  },
  {
    name: 'BBC Sport',
    url: 'https://feeds.bbci.co.uk/sport/rss.xml',
    sourceUrl: 'https://www.bbc.com/sport',
    category: 'Sports',
    type: 'Mainstream',
  },
];

export const REGIONAL_RSS_SOURCES = [
  { name: 'ABP Majha', state: 'Maharashtra', url: 'https://news.google.com/rss/search?q=ABP+Majha+OR+Maharashtra+news+when:2d&hl=en-IN&gl=IN&ceid=IN:en', sourceUrl: 'https://marathi.abplive.com' },
  { name: 'NDTV', state: 'Delhi', url: 'https://news.google.com/rss/search?q=NDTV+Delhi+news+when:2d&hl=en-IN&gl=IN&ceid=IN:en', sourceUrl: 'https://www.ndtv.com' },
  { name: 'TV9 Kannada', state: 'Karnataka', url: 'https://news.google.com/rss/search?q=TV9+Kannada+OR+Karnataka+news+when:2d&hl=en-IN&gl=IN&ceid=IN:en', sourceUrl: 'https://tv9kannada.com' },
  { name: 'Oneindia Tamil', state: 'Tamil Nadu', url: 'https://news.google.com/rss/search?q=Oneindia+Tamil+OR+Tamil+Nadu+news+when:2d&hl=en-IN&gl=IN&ceid=IN:en', sourceUrl: 'https://tamil.oneindia.com' },
  { name: 'TV9 Telugu', state: 'Andhra Pradesh', url: 'https://news.google.com/rss/search?q=TV9+Telugu+OR+Andhra+Pradesh+news+when:2d&hl=en-IN&gl=IN&ceid=IN:en', sourceUrl: 'https://tv9telugu.com' },
  { name: 'V6 News', state: 'Telangana', url: 'https://news.google.com/rss/search?q=V6+News+OR+Telangana+news+when:2d&hl=en-IN&gl=IN&ceid=IN:en', sourceUrl: 'https://www.v6velugu.com' },
  { name: 'Amar Ujala Uttar Pradesh', state: 'Uttar Pradesh', url: 'https://news.google.com/rss/search?q=Amar+Ujala+OR+Uttar+Pradesh+news+when:2d&hl=en-IN&gl=IN&ceid=IN:en', sourceUrl: 'https://www.amarujala.com' },
  { name: 'ABP Ananda', state: 'West Bengal', url: 'https://news.google.com/rss/search?q=ABP+Ananda+OR+West+Bengal+news+when:2d&hl=en-IN&gl=IN&ceid=IN:en', sourceUrl: 'https://bengali.abplive.com' },
  { name: 'Asianet News', state: 'Kerala', url: 'https://news.google.com/rss/search?q=Asianet+News+OR+Kerala+news+when:2d&hl=en-IN&gl=IN&ceid=IN:en', sourceUrl: 'https://www.asianetnews.com' },
  { name: 'TV9 Gujarati', state: 'Gujarat', url: 'https://news.google.com/rss/search?q=TV9+Gujarati+OR+Gujarat+news+when:2d&hl=en-IN&gl=IN&ceid=IN:en', sourceUrl: 'https://tv9gujarati.com' },
  { name: 'Amar Ujala Rajasthan', state: 'Rajasthan', url: 'https://news.google.com/rss/search?q=Amar+Ujala+OR+Rajasthan+news+when:2d&hl=en-IN&gl=IN&ceid=IN:en', sourceUrl: 'https://www.amarujala.com' },
  { name: 'Amar Ujala Punjab', state: 'Punjab', url: 'https://news.google.com/rss/search?q=Amar+Ujala+OR+Punjab+news+when:2d&hl=en-IN&gl=IN&ceid=IN:en', sourceUrl: 'https://www.amarujala.com' },
  { name: 'Amar Ujala Haryana', state: 'Haryana', url: 'https://news.google.com/rss/search?q=Amar+Ujala+OR+Haryana+news+when:2d&hl=en-IN&gl=IN&ceid=IN:en', sourceUrl: 'https://www.amarujala.com' },
  { name: 'Amar Ujala Bihar', state: 'Bihar', url: 'https://news.google.com/rss/search?q=Amar+Ujala+OR+Bihar+news+when:2d&hl=en-IN&gl=IN&ceid=IN:en', sourceUrl: 'https://www.amarujala.com' },
  { name: 'IBC24', state: 'Madhya Pradesh', url: 'https://news.google.com/rss/search?q=IBC24+OR+Madhya+Pradesh+news+when:2d&hl=en-IN&gl=IN&ceid=IN:en', sourceUrl: 'https://www.ibc24.in' },
  { name: 'Arunachal Today', state: 'Arunachal Pradesh', url: 'https://news.google.com/rss/search?q=Arunachal+Today+OR+Arunachal+news+when:2d&hl=en-IN&gl=IN&ceid=IN:en', sourceUrl: 'https://arunachaltoday.in' },
  { name: 'News Live', state: 'Assam', url: 'https://news.google.com/rss/search?q=News+Live+OR+Assam+news+when:2d&hl=en-IN&gl=IN&ceid=IN:en', sourceUrl: 'https://newslive.com' },
  { name: 'IBC24', state: 'Chhattisgarh', url: 'https://news.google.com/rss/search?q=IBC24+OR+Chhattisgarh+news+when:2d&hl=en-IN&gl=IN&ceid=IN:en', sourceUrl: 'https://www.ibc24.in' },
  { name: 'Prudent Media', state: 'Goa', url: 'https://news.google.com/rss/search?q=Prudent+Media+OR+Goa+news+when:2d&hl=en-IN&gl=IN&ceid=IN:en', sourceUrl: 'https://www.prudentmedia.in' },
  { name: 'Amar Ujala Himachal Pradesh', state: 'Himachal Pradesh', url: 'https://news.google.com/rss/search?q=Amar+Ujala+OR+Himachal+Pradesh+news+when:2d&hl=en-IN&gl=IN&ceid=IN:en', sourceUrl: 'https://www.amarujala.com' },
  { name: 'Zee Bihar Jharkhand', state: 'Jharkhand', url: 'https://news.google.com/rss/search?q=Zee+Bihar+Jharkhand+OR+Jharkhand+news+when:2d&hl=en-IN&gl=IN&ceid=IN:en', sourceUrl: 'https://zeehar.com' },
  { name: 'Impact TV', state: 'Manipur', url: 'https://news.google.com/rss/search?q=Impact+TV+OR+Manipur+news+when:2d&hl=en-IN&gl=IN&ceid=IN:en', sourceUrl: 'https://www.impacttv.in' },
  { name: 'Batesi TV', state: 'Meghalaya', url: 'https://news.google.com/rss/search?q=Batesi+TV+OR+Meghalaya+news+when:2d&hl=en-IN&gl=IN&ceid=IN:en', sourceUrl: 'https://batesitv.com' },
  { name: 'Zonet Cable TV', state: 'Mizoram', url: 'https://news.google.com/rss/search?q=Zonet+Cable+TV+OR+Mizoram+news+when:2d&hl=en-IN&gl=IN&ceid=IN:en', sourceUrl: 'https://zonet.in' },
  { name: 'Hornbill TV', state: 'Nagaland', url: 'https://news.google.com/rss/search?q=Hornbill+TV+OR+Nagaland+news+when:2d&hl=en-IN&gl=IN&ceid=IN:en', sourceUrl: 'https://hornbilltv.com' },
  { name: 'OTV (Odisha TV)', state: 'Odisha', url: 'https://news.google.com/rss/search?q=OTV+OR+Odisha+news+when:2d&hl=en-IN&gl=IN&ceid=IN:en', sourceUrl: 'https://odishatv.in' },
  { name: 'Sikkim Chronicle', state: 'Sikkim', url: 'https://news.google.com/rss/search?q=Sikkim+Chronicle+OR+Sikkim+news+when:2d&hl=en-IN&gl=IN&ceid=IN:en', sourceUrl: 'https://sikkimchronicle.com' },
  { name: 'Headlines Tripura', state: 'Tripura', url: 'https://news.google.com/rss/search?q=Headlines+Tripura+OR+Tripura+news+when:2d&hl=en-IN&gl=IN&ceid=IN:en', sourceUrl: 'https://headlinestripura.com' },
  { name: 'Amar Ujala Uttarakhand', state: 'Uttarakhand', url: 'https://news.google.com/rss/search?q=Amar+Ujala+OR+Uttarakhand+news+when:2d&hl=en-IN&gl=IN&ceid=IN:en', sourceUrl: 'https://www.amarujala.com' }
];

const INGEST_STATE_CITIES: Record<string, string[]> = {
  'Maharashtra': ['Mumbai', 'Pune', 'Nagpur', 'Thane', 'Nashik', 'Aurangabad'],
  'Delhi': ['Delhi', 'New Delhi', 'Noida', 'Gurugram', 'Gurgaon'],
  'Karnataka': ['Bengaluru', 'Mysuru', 'Hubli', 'Dharwad', 'Hangal'],
  'Tamil Nadu': ['Chennai', 'Coimbatore', 'Madurai'],
  'Andhra Pradesh': ['Visakhapatnam', 'Vijayawada', 'Guntur', 'Nellore'],
  'Telangana': ['Hyderabad', 'Secunderabad', 'Warangal'],
  'Uttar Pradesh': ['Lucknow', 'Kanpur', 'Agra', 'Varanasi', 'Mathura', 'Ghaziabad'],
  'West Bengal': ['Kolkata', 'Howrah', 'Darjeeling'],
  'Kerala': ['Kochi', 'Thiruvananthapuram', 'Kozhikode'],
  'Gujarat': ['Ahmedabad', 'Surat', 'Vadodara', 'Rajkot'],
  'Rajasthan': ['Jaipur', 'Jodhpur', 'Udaipur', 'Kota'],
  'Punjab': ['Amritsar', 'Ludhiana', 'Jalandhar', 'Patiala'],
  'Haryana': ['Faridabad', 'Ambala', 'Panipat'],
  'Bihar': ['Patna', 'Gaya', 'Muzaffarpur'],
  'Madhya Pradesh': ['Bhopal', 'Indore', 'Gwalior', 'Jabalpur'],
  'Arunachal Pradesh': ['Itanagar', 'Tawang', 'Ziro', 'Pasighat'],
  'Assam': ['Guwahati', 'Dispur', 'Dibrugarh', 'Silchar'],
  'Chhattisgarh': ['Raipur', 'Bhilai', 'Bilaspur', 'Durg'],
  'Goa': ['Panaji', 'Margao', 'Vasco da Gama', 'Mapusa'],
  'Himachal Pradesh': ['Shimla', 'Dharamshala', 'Manali', 'Solan'],
  'Jharkhand': ['Ranchi', 'Jamshedpur', 'Dhanbad', 'Bokaro'],
  'Manipur': ['Imphal', 'Churachandpur', 'Thoubal'],
  'Meghalaya': ['Shillong', 'Tura', 'Jowai'],
  'Mizoram': ['Aizawl', 'Lunglei', 'Champhai'],
  'Nagaland': ['Kohima', 'Dimapur', 'Mokokchung'],
  'Odisha': ['Bhubaneswar', 'Cuttack', 'Rourkela', 'Puri'],
  'Sikkim': ['Gangtok', 'Namchi', 'Geyzing'],
  'Tripura': ['Agartala', 'Dharmanagar', 'Udaipur Tripura'],
  'Uttarakhand': ['Dehradun', 'Haridwar', 'Rishikesh', 'Nainital']
};


export class IngestionService {
  /**
   * Fetch articles from NewsAPI.org
   */
  async fetchNewsAPI(): Promise<IngestedArticle[]> {
    const apiKey = process.env.NEWS_API_KEY;
    if (!apiKey) {
      console.warn('[Ingestion] NewsAPI.org key is missing. Skipping NewsAPI ingestion.');
      return [];
    }

    try {
      console.log('[Ingestion] Fetching from NewsAPI.org (Top Indian headlines)...');
      // Fetch Indian top headlines
      const response = await axios.get('https://newsapi.org/v2/top-headlines', {
        params: {
          country: 'in',
          pageSize: 50,
          apiKey,
        },
        timeout: 8000,
      });

      if (response.data && response.data.articles) {
        return response.data.articles.map((art: any) => ({
          title: art.title || 'Untitled',
          description: art.description || null,
          content: art.content || null,
          url: art.url,
          urlToImage: art.urlToImage || null,
          publishedAt: new Date(art.publishedAt || Date.now()),
          author: art.author || null,
          sourceName: art.source?.name || 'NewsAPI',
          sourceUrl: new URL(art.url).origin,
          category: 'General',
        }));
      }
    } catch (error: any) {
      console.error('[Ingestion] Error fetching from NewsAPI.org:', error.message);
    }
    return [];
  }

  /**
   * Fetch articles from Currents API
   */
  async fetchCurrentsAPI(): Promise<IngestedArticle[]> {
    const apiKey = process.env.CURRENTS_API_KEY;
    if (!apiKey) {
      console.warn('[Ingestion] Currents API key is missing. Skipping Currents API ingestion.');
      return [];
    }

    try {
      console.log('[Ingestion] Fetching from Currents API (India/English)...');
      const response = await axios.get('https://api.currentsapi.services/v1/search', {
        params: {
          country: 'IN',
          language: 'en',
          apiKey,
        },
        timeout: 8000,
      });

      if (response.data && response.data.news) {
        return response.data.news.map((art: any) => ({
          title: art.title || 'Untitled',
          description: art.description || null,
          content: null, // Currents doesn't supply full content block usually
          url: art.url,
          urlToImage: art.image !== 'None' ? art.image : null,
          publishedAt: new Date(art.published || Date.now()),
          author: art.author || null,
          sourceName: art.author || 'CurrentsAPI',
          sourceUrl: new URL(art.url).origin,
          category: 'General',
        }));
      }
    } catch (error: any) {
      console.error('[Ingestion] Error fetching from Currents API:', error.message);
    }
    return [];
  }

  async fetchRSSFeed(source: typeof RSS_SOURCES[0]): Promise<IngestedArticle[]> {
    try {
      console.log(`[Ingestion] Fetching RSS feed: ${source.name}...`);
      const response = await axios.get(source.url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'application/rss+xml, application/xml, text/xml, */*'
        },
        timeout: 10000
      });
      const feed = await parser.parseString(response.data);
      
      return feed.items.map((item) => {
        // Extract image URL from enclosure or media content if available
        let imageUrl: string | null = null;
        if (item.enclosure) {
          if (typeof item.enclosure === 'object' && !Array.isArray(item.enclosure)) {
            imageUrl = (item.enclosure as any).url || null;
          } else if (Array.isArray(item.enclosure) && item.enclosure.length > 0) {
            imageUrl = item.enclosure[0].url || null;
          }
        }
        if (!imageUrl && item.media) {
          if (typeof item.media === 'object' && !Array.isArray(item.media)) {
            imageUrl = (item.media as any).url || ((item.media as any).$ && (item.media as any).$.url) || null;
          } else if (Array.isArray(item.media) && item.media.length > 0) {
            const firstMedia = item.media[0];
            imageUrl = firstMedia.url || (firstMedia.$ && firstMedia.$.url) || null;
          }
        }
        if (!imageUrl && (item as any).thumbnail) {
          if (typeof (item as any).thumbnail === 'object') {
            imageUrl = (item as any).thumbnail.url || ((item as any).thumbnail.$ && (item as any).thumbnail.$.url) || null;
          } else if (typeof (item as any).thumbnail === 'string') {
            imageUrl = (item as any).thumbnail;
          }
        }
        if (!imageUrl && (item as any).image) {
          if (typeof (item as any).image === 'object') {
            imageUrl = (item as any).image.url || ((item as any).image.$ && (item as any).image.$.url) || null;
          } else if (typeof (item as any).image === 'string') {
            imageUrl = (item as any).image;
          }
        }
        if (!imageUrl) {
          const htmlSources = [
            (item as any)['content:encoded'],
            item.content,
            (item as any).description,
            (item as any).summary
          ];
          for (const html of htmlSources) {
            if (html && typeof html === 'string' && html.includes('<img')) {
              const match = html.match(/<img[^>]+src=["']([^"']+)["']/i);
              if (match && match[1]) {
                imageUrl = match[1].trim();
                break;
              }
            }
          }
        }

        if (!imageUrl) {
          imageUrl = CATEGORY_IMAGES[source.category] || CATEGORY_IMAGES['Local + Regional Pulse'];
        }

        return {
          title: item.title || 'Untitled',
          description: cleanHtmlText(item.summary || item.contentSnippet || null),
          content: cleanHtmlText(item.content || null),
          url: item.link || '',
          urlToImage: imageUrl,
          publishedAt: new Date(item.pubDate || item.isoDate || Date.now()),
          author: item.creator || (item as any).author || null,
          sourceName: source.name,
          sourceUrl: source.sourceUrl,
          category: source.category,
        };
      }).filter(art => art.url); // filter out articles without a valid link
    } catch (error: any) {
      console.error(`[Ingestion] Error parsing RSS feed ${source.name}:`, error.message);
      return [];
    }
  }


  /**
   * Generate realistic news articles for a regional channel and state covering 15 diverse categories
   */
  generateMockArticles(channelName: string, stateName: string): IngestedArticle[] {
    const today = new Date();
    const cities = INGEST_STATE_CITIES[stateName] || [stateName];
    const city = cities[1] || cities[0];
    const capital = cities[0];

    const getLocalDetail = (state: string, category: string, index: number) => {
      const details: Record<string, string[]> = {
        'Maharashtra': ['Mumbai metro line 3 project', 'Pune IT corridor expansion', 'Nagpur solar energy park initiative', 'Vidarbha farm irrigation scheme', 'Bollywood heritage museum in Mumbai'],
        'Delhi': ['pollution reduction action plan', 'Yamuna ecological restoration drive', 'Dwarka Expressway security measures', 'Delhi University digital campus setup', 'Connaught Place infrastructure renewal'],
        'Karnataka': ['Namma Metro phase 2 progress', 'Bengaluru traffic congestion management', 'Mysuru Palace tourism corridor', 'IT hub cyber security upgrade', 'Hubli-Dharwad industrial park development'],
        'Tamil Nadu': ['Chennai seawater desalination plant', 'Madurai temple heritage corridor', 'Coimbatore auto components hub modernization', 'Marina Beach environment conservation initiative', 'Tiruchirappalli smart city setup'],
        'Andhra Pradesh': ['Visakhapatnam deep sea port expansion', 'Amaravati capital district development', 'Tirupati temple pilgrim facility upgrade', 'Guntur global chili trading platform', 'Nellore aquaculture technology boost'],
        'Telangana': ['Hyderabad IT exports milestone', 'Kaleshwaram lift irrigation project phase 2', 'Warangal mega textile park development', 'T-Hub startup incubation round', 'Charminar heritage corridor restoration']
      };

      const stateDetails = details[state] || [
        `${state} highway development phase ${index + 1}`,
        `${city} digital school integration program`,
        `${state} rural healthcare access mission`,
        `${city} ground water replenishment initiative`,
        `${state} solar power park expansion`
      ];

      return stateDetails[index % stateDetails.length];
    };

    const templates = [
      {
        category: 'Politics',
        variants: [
          {
            title: `assembly speaker outlines legislative priorities in ${capital} for ${getLocalDetail(stateName, 'Politics', 0)}`,
            desc: `The state assembly speaker hosted a briefing in ${capital} to detail the upcoming legislative bill schedules for ${getLocalDetail(stateName, 'Politics', 0)}.`,
            content: `The assembly speaker outlined major legislative priorities today in ${capital}, highlighting crucial bills regarding urban infrastructure and local administrative reform for ${getLocalDetail(stateName, 'Politics', 0)}. Leaders across ${stateName} have welcomed the agenda.`
          },
          {
            title: `municipal elections voter registration drive begins across ${stateName} regarding ${getLocalDetail(stateName, 'Politics', 1)}`,
            desc: `State election authorities have launched a massive campaign to update voter logs for the local councils, focusing on ${getLocalDetail(stateName, 'Politics', 1)}.`,
            content: `Election officials in ${city} and surrounding districts have established special booths to encourage voter turnout. The drive runs for two weeks and aims to enroll first-time voters across ${stateName} to support ${getLocalDetail(stateName, 'Politics', 1)}.`
          }
        ]
      },
      {
        category: 'Sports',
        variants: [
          {
            title: `state sports academy announces multi-million facility upgrade in ${city} for athletes`,
            desc: `The state sports board approved budget plans to build new training facilities and track courses in ${city} matching national standards.`,
            content: `A state-of-the-art sports complex is scheduled to open in ${stateName}. The sports minister confirmed that the academy will train local youth in track and field, archery, and cricket, helping select players for ${getLocalDetail(stateName, 'Sports', 0)}.`
          },
          {
            title: `annual school cricket tournament starts in ${capital} to promote local youth players`,
            desc: `Dozens of youth teams from across ${stateName} are participating in the prestigious school cup.`,
            content: `The annual championship kicked off in ${capital} with a grand opening ceremony. Scouts from the national junior team are expected to watch the final matches to spot upcoming talent for the ${getLocalDetail(stateName, 'Sports', 1)}.`
          }
        ]
      },
      {
        category: 'Technology',
        variants: [
          {
            title: `new cybersecurity center inaugurated in ${capital} to protect digital space`,
            desc: `State police departments partner with technology firms to establish a cyber intelligence division in ${capital} to combat online fraud.`,
            content: `The cybersecurity cell in ${stateName} is now active, focusing on protecting online services and raising public awareness about financial scams. Special training will be provided to local officers to support the ${getLocalDetail(stateName, 'Technology', 0)}.`
          },
          {
            title: `rural digital connectivity scheme reaches 100 villages in ${stateName} hinterlands`,
            desc: `A government initiative to provide broadband internet access to remote regions hits a key milestone, linking rural districts.`,
            content: `Under the rural tech mission, residents in distant districts of ${stateName} now have access to high-speed internet and digital services at community centers in ${city}, supporting ${getLocalDetail(stateName, 'Technology', 1)}.`
          }
        ]
      },
      {
        category: 'Stocks/Business',
        variants: [
          {
            title: `industrial corridor expansion approved for ${city} region to boost trade`,
            desc: `The cabinet greenlit development plans to set up a new manufacturing zone outside ${city} to support businesses.`,
            content: `The new business corridor in ${stateName} is projected to attract foreign direct investments and create thousands of jobs. Construction is set to begin next quarter for the ${getLocalDetail(stateName, 'Stocks/Business', 0)}.`
          },
          {
            title: `local textile cooperatives note surge in export demand for handloom crafts`,
            desc: `Traditional handloom weavers in ${stateName} report a substantial increase in international craft orders from global buyers.`,
            content: `Weaving communities near ${capital} have received fresh export contracts, boosting local revenues and reviving traditional handcraft techniques that define the region's heritage, such as the ${getLocalDetail(stateName, 'Stocks/Business', 1)}.`
          }
        ]
      },
      {
        category: 'Science',
        variants: [
          {
            title: `regional climate research institute set up at university in ${capital} to study weather`,
            desc: `Scientists will study regional weather patterns and water resources using advanced prediction models.`,
            content: `The climate station in ${stateName} will monitor changing weather patterns and provide crucial data to local agricultural boards. The project is funded by national scientific grants for ${getLocalDetail(stateName, 'Science', 0)}.`
          },
          {
            title: `botanists discover rare plant species in ${stateName} forest reserve sanctuary`,
            desc: `A research expedition in the hills of ${stateName} identifies a new medicinal flora species with therapeutic properties.`,
            content: `A scientific team led by botanists from ${city} has documented a rare plant variety with unique properties. The forest department has declared the habitat a protected botanical zone for the ${getLocalDetail(stateName, 'Science', 1)}.`
          }
        ]
      },
      {
        category: 'Health',
        variants: [
          {
            title: `mobile health clinics dispatched to rural blocks of ${stateName} to support villages`,
            desc: `A fleet of medical vans will bring primary healthcare and screening tools directly to remote villages without clinics.`,
            content: `The health department rolled out mobile screening units today in ${capital}. The clinic vans will cover remote locations on weekly routes to ensure medical support is accessible to all, aiding ${getLocalDetail(stateName, 'Health', 0)}.`
          },
          {
            title: `pediatric wing expanded at general hospital in ${city} to help kids`,
            desc: `Super-specialty facility upgrade completed with new beds and intensive care units.`,
            content: `The health minister inaugurated the new medical facility in ${city}. The upgrade will serve families across ${stateName}, providing free healthcare to children under welfare schemes for ${getLocalDetail(stateName, 'Health', 1)}.`
          }
        ]
      },
      {
        category: 'Movies/Entertainment',
        variants: [
          {
            title: `film festival celebrates regional cinema in ${capital} with international entries`,
            desc: `A week-long screening event highlights local filmmakers and artists in ${capital} to promote art.`,
            content: `The regional festival opened in ${stateName} with several national award-winning entries. Discussions on screenwriting and directing are scheduled alongside public movie screenings, promoting ${getLocalDetail(stateName, 'Movies/Entertainment', 0)}.`
          },
          {
            title: `historic theater renovated and reopened to the public in ${city} after decade`,
            desc: `A heritage performing arts venue in ${city} has been restored to its former glory.`,
            content: `The cultural department completed the restoration work, which will now host classical music, regional plays, and dance performances for local audiences in ${stateName}, including ${getLocalDetail(stateName, 'Movies/Entertainment', 1)}.`
          }
        ]
      },
      {
        category: 'Crime',
        variants: [
          {
            title: `cybercrime syndicate busted by regional police in ${city} after raid`,
            desc: `Officers arrested five individuals involved in online fraud schemes targeting citizens.`,
            content: `The special task force in ${stateName} executed a raid in ${city}, seizing computers and mobile devices. Police advised citizens to remain vigilant when sharing personal details online, highlighting ${getLocalDetail(stateName, 'Crime', 0)}.`
          },
          {
            title: `statewide safety campaign launched by traffic police division in ${capital}`,
            desc: `New road safety initiatives aim to reduce accidents through stricter speed checks.`,
            content: `Traffic police departments in ${capital} and other major cities will deploy automated radar systems. Educational drives on road safety are also starting in schools across ${stateName} to support ${getLocalDetail(stateName, 'Crime', 1)}.`
          }
        ]
      },
      {
        category: 'Education',
        variants: [
          {
            title: `smart classrooms launched in government schools in ${city} to help students`,
            desc: `Under the digital education scheme, 50 schools are equipped with smart boards and computer labs.`,
            content: `The district education officer inaugurated the digital labs in ${city}, noting that these resources will enhance science and mathematics learning for children in ${stateName}, supporting ${getLocalDetail(stateName, 'Education', 0)}.`
          },
          {
            title: `state scholarship drive benefits over ten thousand students in need`,
            desc: `Financial aid awarded to meritorious students from lower-income backgrounds.`,
            content: `The education department held a distribution ceremony in ${capital}. The scholarships will support higher education fees for college students throughout ${stateName}, boosting ${getLocalDetail(stateName, 'Education', 1)}.`
          }
        ]
      },
      {
        category: 'Weather',
        variants: [
          {
            title: `moderate rains forecast for coastal and hilly regions of ${stateName} next week`,
            desc: `Meteorological department issues weather warning predicting monsoon rain patterns in hilly areas.`,
            content: `Rainfall is expected in districts surrounding ${city} and ${capital}. Emergency services are on alert to handle localized waterlogging and ensure smooth traffic flow in ${stateName}, especially around ${getLocalDetail(stateName, 'Weather', 0)}.`
          },
          {
            title: `temperatures drop as cold wave touches northern belt of ${stateName} plains`,
            desc: `Winter conditions intensify with a sudden dip in night temperatures in the valleys.`,
            content: `A seasonal cold breeze has swept across the northern plains of ${stateName}. Shelters in ${capital} have been opened for night travelers and homeless individuals, aiding ${getLocalDetail(stateName, 'Weather', 1)}.`
          }
        ]
      },
      {
        category: 'Travel',
        variants: [
          {
            title: `eco-tourism resort opened at scenic lake near ${city} for nature lovers`,
            desc: `The state tourism department inaugurates nature-friendly lodging options for travelers.`,
            content: `A new tourist destination has been launched in ${stateName}, offering adventure sports, wildlife viewing, and organic food experiences. The site is designed to protect local biodiversity, promoting ${getLocalDetail(stateName, 'Travel', 0)}.`
          },
          {
            title: `new train route connects major historical sites in ${stateName} for tourists`,
            desc: `Railway authorities introduce a daily tourist express linking key cultural landmarks.`,
            content: `Commuters can now travel comfortably between ${capital} and ancient heritage temples. The railway department announced discount packages for group bookings in ${stateName}, supporting ${getLocalDetail(stateName, 'Travel', 1)}.`
          }
        ]
      },
      {
        category: 'Food',
        variants: [
          {
            title: `traditional street food festival attracts thousands in ${capital} bazaar`,
            desc: `Food enthusiasts gather in ${capital} to sample unique culinary recipes from different districts.`,
            content: `The three-day food bazaar in ${stateName} features over fifty stalls displaying traditional sweets, spices, and regional specialities. Live cooking workshops are being hosted daily, celebrating ${getLocalDetail(stateName, 'Food', 0)}.`
          },
          {
            title: `organic farming bazaar launched in central market of ${city} city`,
            desc: `Growers sell chemical-free fresh produce directly to urban consumers in ${city}.`,
            content: `The weekly market initiative aims to support eco-friendly farmers in ${stateName}. Residents can purchase organic vegetables, grains, and fruits at competitive prices, promoting ${getLocalDetail(stateName, 'Food', 1)}.`
          }
        ]
      },
      {
        category: 'Fashion',
        variants: [
          {
            title: `traditional weaving workshop organized to train youth in ${city} city limits`,
            desc: `Craft experts host training sessions on regional silk and cotton weaving styles.`,
            content: `An empowerment program has started in ${city} to sustain handloom heritage. Young participants in ${stateName} will receive stipends during the three-month course, promoting ${getLocalDetail(stateName, 'Fashion', 0)}.`
          },
          {
            title: `regional khadi fashion show organized in ${capital} city hall`,
            desc: `Designers present modern apparel collections crafted from locally sourced handspun fabrics.`,
            content: `The fashion exhibition in ${capital} showcased creative fusion wear using regional handloom. The event was held to promote rural handspun garments in ${stateName}, highlighting ${getLocalDetail(stateName, 'Fashion', 1)}.`
          }
        ]
      },
      {
        category: 'Gaming',
        variants: [
          {
            title: `regional esports championship matches scheduled in ${capital} tech stadium`,
            desc: `Top gaming teams gather in ${capital} to compete in the regional tournament finals.`,
            content: `The esports league in ${stateName} has attracted huge interest from college students. Winners will compete in the national esports league and win scholarship funds, celebrating ${getLocalDetail(stateName, 'Gaming', 0)}.`
          },
          {
            title: `student-developed puzzle game gains popularity in ${city} colleges`,
            desc: `A mobile game created by a group of computer science students wins local design prize.`,
            content: `The mobile app highlights historic sites of ${stateName} as levels. Users learn about local history while solving puzzles. The game has crossed fifty thousand downloads, showcasing ${getLocalDetail(stateName, 'Gaming', 1)}.`
          }
        ]
      },
      {
        category: 'Jobs & Career',
        variants: [
          {
            title: `vocational training program launched for youth in ${stateName} districts`,
            desc: `A government initiative to provide skill training in electric vehicle repair and green energy.`,
            content: `Under the skill development mission, centers in ${city} and ${capital} will train thousands of school dropouts, helping them secure technical jobs in the growing clean energy sector, supporting ${getLocalDetail(stateName, 'Jobs & Career', 0)}.`
          },
          {
            title: `job fair in ${city} sees participation from forty corporates for graduates`,
            desc: `Over five thousand candidates register for placement interviews in IT and retail sectors.`,
            content: `The employment department organized the hiring drive in ${city}. Recruiting managers from major companies offered immediate placement letters to qualified students in ${stateName}, promoting ${getLocalDetail(stateName, 'Jobs & Career', 1)}.`
          }
        ]
      }
    ];

    const result: IngestedArticle[] = [];
    templates.forEach((tpl) => {
      tpl.variants.forEach((v, vIdx) => {
        const hoursAgo = tpl.variants.length * 3 + vIdx * 4;
        const pubDate = new Date(today.getTime() - hoursAgo * 60 * 60 * 1000 - vIdx * 12 * 60 * 1000);
        const title = v.title.charAt(0).toUpperCase() + v.title.slice(1);
        const imageUrl = CATEGORY_IMAGES[tpl.category] || null;

        result.push({
          title,
          description: v.desc,
          content: v.content,
          url: `https://mock-news-source.com/${stateName.toLowerCase().replace(/\s+/g, '-')}/${channelName.toLowerCase().replace(/[^a-z0-9]/g, '')}-${tpl.category.toLowerCase()}-${vIdx}-${pubDate.getTime()}`,
          urlToImage: imageUrl,
          publishedAt: pubDate,
          author: `${channelName} News Desk`,
          sourceName: channelName,
          sourceUrl: `https://${channelName.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`,
          category: 'Local + Regional Pulse'
        });
      });
    });

    return result;
  }

  /**
   * Run the full ingestion pipeline
   */
  async run(): Promise<number> {
    console.log('[Ingestion] Starting news ingestion pipeline...');
    let allArticles: IngestedArticle[] = [];

    // 1. Fetch APIs
    const newsApiArticles = await this.fetchNewsAPI();
    const currentsArticles = await this.fetchCurrentsAPI();
    allArticles = [...allArticles, ...newsApiArticles, ...currentsArticles];

    // 2. Fetch RSS Feeds
    for (const rSource of RSS_SOURCES) {
      const feedArticles = await this.fetchRSSFeed(rSource);
      allArticles = [...allArticles, ...feedArticles];
    }

    // 3. Fetch/Generate Regional News Channels
    console.log('[Ingestion] Fetching regional news channels...');
    for (const regSource of REGIONAL_RSS_SOURCES) {
      let regArticles = await this.fetchRSSFeed({
        name: regSource.name,
        url: regSource.url,
        sourceUrl: regSource.sourceUrl,
        category: 'Local + Regional Pulse',
        type: 'RSS'
      });

      if (regArticles.length === 0) {
        console.warn(`[Ingestion] Feed for ${regSource.name} (${regSource.state}) empty/failed. Skipping.`);
      }
      allArticles = [...allArticles, ...regArticles];
    }

    console.log(`[Ingestion] Ingested ${allArticles.length} raw articles. Storing & deduplicating...`);
    let insertCount = 0;

    for (const art of allArticles) {
      try {
        // Find or create Source in the database
        let dbSource = await prisma.source.findFirst({
          where: { name: art.sourceName },
        });

        if (!dbSource) {
          dbSource = await prisma.source.create({
            data: {
              name: art.sourceName,
              url: art.sourceUrl,
              type: art.sourceName.includes('API') ? 'API' : 'RSS',
              category: art.category,
            },
          });
        }

        // Format published date in IST (YYYY-MM-DD)
        const dateObj = new Date(art.publishedAt);
        // Basic shift to Indian Standard Time (UTC +5:30)
        const istOffset = 5.5 * 60 * 60 * 1000;
        const istDate = new Date(dateObj.getTime() + istOffset);
        const publishedIstDate = istDate.toISOString().split('T')[0];

        // Skip insertion if URL already exists
        const exists = await prisma.article.findUnique({
          where: { url: art.url },
        });

        if (!exists) {
          await prisma.article.create({
            data: {
              title: art.title ? (art.title.charAt(0).toUpperCase() + art.title.slice(1)) : 'Untitled',
              description: cleanHtmlText(art.description),
              content: cleanHtmlText(art.content),
              url: art.url,
              urlToImage: art.urlToImage,
              publishedAt: dateObj,
              publishedIstDate,
              author: art.author,
              sourceId: dbSource.id,
            },
          });
          insertCount++;
        }
      } catch (err: any) {
        // Soft fail single insertions to avoid crashing the whole ingestion run
        console.error(`[Ingestion] Failed to store article: ${art.title.slice(0, 50)}...`, err.message);
      }
    }

    console.log(`[Ingestion] Ingestion run completed. Saved ${insertCount} new articles.`);
    return insertCount;
  }

  /**
   * Purge articles older than retention window (default 7 days) to keep DB lean
   */
  async purgeOldArticles(retentionDays = 7): Promise<number> {
    console.log(`[Ingestion] Archiving/purging articles older than ${retentionDays} days...`);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    try {
      const deleteResult = await prisma.article.deleteMany({
        where: {
          publishedAt: {
            lt: cutoffDate,
          },
          // Protect saved stories or keep articles linked to stories?
          // If we delete articles, we should probably set null on storyId, which schema does onDelete: SetNull.
          // However, if the story is developing, we might want to keep the timeline/story.
          // We can delete raw articles not linked to any story, or clean up stories older than retention too.
        },
      });
      console.log(`[Ingestion] Purged ${deleteResult.count} old raw articles.`);
      return deleteResult.count;
    } catch (err: any) {
      console.error('[Ingestion] Error purging old articles:', err.message);
      return 0;
    }
  }
}

export const ingestion = new IngestionService();
