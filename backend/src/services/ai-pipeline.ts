import { GoogleGenerativeAI } from '@google/generative-ai';
import { prisma } from '../config/db';
import dotenv from 'dotenv';
import { cache } from './cache';

dotenv.config();

const apiKey = process.env.GEMINI_API_KEY || '';
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

// Predefined categories for classification
const CATEGORIES = [
  'Sports', 'Movies/Entertainment', 'Politics', 'Stocks/Business', 'Technology',
  'Health', 'Education', 'Science', 'World News', 'National News', 'Crime',
  'Automobile', 'Lifestyle', 'Travel', 'Weather', 'Food', 'Fashion', 'Gaming',
  'AI & Tech Deep Dives', 'Startup & Funding Tracker', 'Fact-Check / Disputed Claims',
  'Local + Regional Pulse', 'Jobs & Career', 'Opinion vs Fact'
];

function hasNonAscii(str: string): boolean {
  return /[^\u0000-\u007F]+/.test(str);
}

const CHANNEL_TO_STATE: Record<string, string> = {
  'ABP Majha': 'Maharashtra',
  'NDTV': 'Delhi',
  'TV9 Kannada': 'Karnataka',
  'Oneindia Tamil': 'Tamil Nadu',
  'TV9 Telugu': 'Andhra Pradesh',
  'V6 News': 'Telangana',
  'Amar Ujala Uttar Pradesh': 'Uttar Pradesh',
  'ABP Ananda': 'West Bengal',
  'Asianet News': 'Kerala',
  'TV9 Gujarati': 'Gujarat',
  'Amar Ujala Rajasthan': 'Rajasthan',
  'Amar Ujala Punjab': 'Punjab',
  'Amar Ujala Haryana': 'Haryana',
  'Amar Ujala Bihar': 'Bihar',
  'IBC24': 'Madhya Pradesh',
  'Arunachal Today': 'Arunachal Pradesh',
  'News Live': 'Assam',
  'Prudent Media': 'Goa',
  'Amar Ujala Himachal Pradesh': 'Himachal Pradesh',
  'Zee Bihar Jharkhand': 'Jharkhand',
  'Impact TV': 'Manipur',
  'Batesi TV': 'Meghalaya',
  'Zonet Cable TV': 'Mizoram',
  'Hornbill TV': 'Nagaland',
  'OTV (Odisha TV)': 'Odisha',
  'OTV': 'Odisha',
  'Sikkim Chronicle': 'Sikkim',
  'Headlines Tripura': 'Tripura',
  'Amar Ujala Uttarakhand': 'Uttarakhand'
};

function getArticleState(art: any): string | null {
  const sourceName = art.sourceName || art.source?.name;
  if (sourceName && CHANNEL_TO_STATE[sourceName]) {
    return CHANNEL_TO_STATE[sourceName];
  }
  return null;
}

const STATE_CITY_KEYWORDS: Record<string, string[]> = {
  'Maharashtra': ['Mumbai', 'Pune', 'Nagpur', 'Thane', 'Nashik', 'Aurangabad'],
  'Delhi': ['Delhi', 'New Delhi', 'Noida', 'Gurugram', 'Gurgaon'],
  'Karnataka': ['Bengaluru', 'Mysuru', 'Hubli', 'Dharwad', 'Mangaluru'],
  'Tamil Nadu': ['Chennai', 'Coimbatore', 'Madurai', 'Salem', 'Trichy'],
  'Andhra Pradesh': ['Visakhapatnam', 'Vijayawada', 'Guntur', 'Nellore', 'Tirupati'],
  'Telangana': ['Hyderabad', 'Secunderabad', 'Warangal', 'Nizamabad'],
  'Uttar Pradesh': ['Lucknow', 'Kanpur', 'Agra', 'Varanasi', 'Mathura', 'Ghaziabad', 'Prayagraj'],
  'West Bengal': ['Kolkata', 'Howrah', 'Darjeeling', 'Asansol', 'Siliguri'],
  'Kerala': ['Kochi', 'Thiruvananthapuram', 'Kozhikode', 'Thrissur'],
  'Gujarat': ['Ahmedabad', 'Surat', 'Vadodara', 'Rajkot', 'Gandhinagar'],
  'Rajasthan': ['Jaipur', 'Jodhpur', 'Udaipur', 'Kota', 'Ajmer'],
  'Punjab': ['Amritsar', 'Ludhiana', 'Jalandhar', 'Patiala', 'Bathinda'],
  'Haryana': ['Faridabad', 'Ambala', 'Panipat', 'Gurugram', 'Karnal'],
  'Bihar': ['Patna', 'Gaya', 'Muzaffarpur', 'Bhagalpur'],
  'Madhya Pradesh': ['Bhopal', 'Indore', 'Gwalior', 'Jabalpur', 'Ujjain'],
  'Arunachal Pradesh': ['Itanagar', 'Tawang', 'Ziro', 'Pasighat'],
  'Assam': ['Guwahati', 'Dispur', 'Dibrugarh', 'Silchar', 'Tezpur'],
  'Chhattisgarh': ['Raipur', 'Bhilai', 'Bilaspur', 'Durg', 'Korba'],
  'Goa': ['Panaji', 'Margao', 'Vasco da Gama', 'Mapusa', 'Ponda'],
  'Himachal Pradesh': ['Shimla', 'Dharamshala', 'Manali', 'Solan', 'Mandi'],
  'Jharkhand': ['Ranchi', 'Jamshedpur', 'Dhanbad', 'Bokaro', 'Deoghar'],
  'Manipur': ['Imphal', 'Churachandpur', 'Thoubal', 'Senapati'],
  'Meghalaya': ['Shillong', 'Tura', 'Jowai', 'Nongpoh'],
  'Mizoram': ['Aizawl', 'Lunglei', 'Champhai', 'Serchhip'],
  'Nagaland': ['Kohima', 'Dimapur', 'Mokokchung', 'Tuensang'],
  'Odisha': ['Bhubaneswar', 'Cuttack', 'Rourkela', 'Puri', 'Sambalpur'],
  'Sikkim': ['Gangtok', 'Namchi', 'Geyzing', 'Mangan'],
  'Tripura': ['Agartala', 'Dharmanagar', 'Udaipur Tripura', 'Kailasahar'],
  'Uttarakhand': ['Dehradun', 'Haridwar', 'Rishikesh', 'Nainital', 'Roorkee']
};

function getStringHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function generateDynamicFallbackTitle(state: string, category: string, articleIndex: number): string {
  const cities = STATE_CITY_KEYWORDS[state] || [state];
  const city = cities[articleIndex % cities.length];
  
  const templates: Record<string, string[]> = {
    'Politics': [
      `${city} municipal council passes new administrative reform bill (Phase {phase})`,
      `Local leaders in ${city} discuss upcoming developmental initiatives (Zone {zone})`,
      `${city} administration outlines plans for community welfare center (Drive {drive})`,
      `Public assembly in ${city} debates regional zoning regulations (Phase {phase})`
    ],
    'Sports': [
      `${city} stadium hosts regional athletic championship tournament (Edition {edition})`,
      `Local youth team from ${city} wins district football trophy (Zone {zone})`,
      `${city} sports association announces coaching camp for children (Phase {phase})`,
      `Annual marathon in ${city} attracts thousands of runners (Edition {edition})`
    ],
    'Technology': [
      `New tech incubation hub inaugurated in ${city} to support startups (Phase {phase})`,
      `${city} municipal corporation transitions to digital service portal (Zone {zone})`,
      `Digital literacy program rolled out across schools in ${city} district (Drive {drive})`,
      `${city} cybersecurity unit issues advisory on online transaction safety (Ref: #{ref})`
    ],
    'Stocks/Business': [
      `Business conclave in ${city} highlights trade and investment potential (Edition {edition})`,
      `Local retail markets in ${city} report steady growth in sales (Zone {zone})`,
      `New manufacturing facility approved for industrial zone near ${city} (Phase {phase})`,
      `${city} entrepreneurs receive state awards for innovative enterprises (Ref: #{ref})`
    ],
    'Science': [
      `Research team in ${city} develops sustainable agricultural irrigation technique (Ref: #{ref})`,
      `Botanical survey near ${city} documents rare medicinal flora species (Drive {drive})`,
      `${city} college science department receives state innovation grant (Phase {phase})`,
      `Environmental study in ${city} highlights progress in green energy adoption (Edition {edition})`
    ],
    'Health': [
      `Health department launches free health screening camp in ${city} (Drive {drive})`,
      `New specialty clinic inaugurated at civil hospital in ${city} (Phase {phase})`,
      `${city} wellness seminar focuses on preventative healthcare awareness (Edition {edition})`,
      `Mobile vaccination vans dispatched to villages around ${city} (Zone {zone})`
    ],
    'Movies/Entertainment': [
      `${city} cultural center hosts annual regional film festival (Edition {edition})`,
      `Traditional theater group performs historic drama in ${city} (Zone {zone})`,
      `Local musicians perform at community heritage festival in ${city} (Drive {drive})`,
      `Art exhibition showcasing local painters opens in ${city} gallery (Edition {edition})`
    ],
    'Crime': [
      `Local police in ${city} recover stolen valuables and arrest suspects (Drive {drive})`,
      `Security measures tightened in commercial districts of ${city} (Zone {zone})`,
      `${city} special task force solves high-profile financial fraud case (Ref: #{ref})`,
      `Traffic safety drive launched by ${city} municipal police department (Phase {phase})`
    ],
    'Education': [
      `Education board announces scholarship program for students in ${city} (Drive {drive})`,
      `${city} primary schools to get interactive smart learning modules (Phase {phase})`,
      `Vocational training center in ${city} trains first batch of students (Zone {zone})`,
      `Local college in ${city} introduces new course on digital media (Edition {edition})`
    ],
    'Weather': [
      `Meteorological office forecasts light to moderate showers in ${city} (Zone {zone})`,
      `${city} administration issues advisory ahead of seasonal weather shift (Ref: #{ref})`,
      `Water reservoirs near ${city} receive significant inflow after recent rain (Drive {drive})`,
      `District officials in ${city} inspect flood preparedness plans (Phase {phase})`
    ],
    'Local + Regional Pulse': [
      `${city} developmental package approved by state administration (Phase {phase})`,
      `New rural roadway connects remote villages to ${city} main market (Zone {zone})`,
      `Public transport corporation schedules additional bus routes from ${city} (Drive {drive})`,
      `${city} municipal body launches street lighting upgrade campaign (Zone {zone})`
    ],
    'General': [
      `State welfare scheme benefits thousand families in ${city} block (Block {block})`,
      `${city} town hall hosts civic meeting on local development plans (Zone {zone})`,
      `Community celebration held in ${city} to mark state foundation day (Ref: #{ref})`,
      `Municipal corporation begins seasonal cleanliness drive in ${city} (Phase {phase})`
    ]
  };

  const list = templates[category] || templates['General'];
  const template = list[articleIndex % list.length];
  
  const phase = (articleIndex % 4) + 1;
  const zone = (articleIndex % 9) + 1;
  const drive = (articleIndex % 8) + 1;
  const edition = (articleIndex % 6) + 1;
  const block = (articleIndex % 12) + 1;
  const ref = (articleIndex % 1000) + 100;

  const result = template
    .replace('{phase}', String(phase))
    .replace('{zone}', String(zone))
    .replace('{drive}', String(drive))
    .replace('{edition}', String(edition))
    .replace('{block}', String(block))
    .replace('{ref}', String(ref));

  return result.charAt(0).toUpperCase() + result.slice(1);
}

function generateDynamicFallbackSummary(state: string, category: string, title: string, articleIndex: number): string {
  const cities = STATE_CITY_KEYWORDS[state] || [state];
  const city = cities[articleIndex % cities.length];
  
  const summaries: Record<string, string[]> = {
    'Politics': [
      `A key administrative meeting was convened in ${city} to discuss the upcoming legislative agenda. Representatives highlighted community development projects, municipal guidelines, and governance reforms aimed at improving public welfare across ${state}.`,
      `Local council authorities in ${city} announced the start of a public registration drive. Officials emphasized transparency and citizen participation, planning local awareness sessions in neighboring regions of ${state} to support the initiative.`,
      `State representatives gathered at the municipal hall in ${city} to review zoning updates and infrastructure budgets. The delegates outlined priorities for clean water access, street safety, and public space preservation for the district.`
    ],
    'Sports': [
      `The local athletics arena in ${city} hosted an opening ceremony for the state school championship. Dozens of youth teams are scheduled to compete over the weekend, drawing scouts and spectators to the premier tournament.`,
      `A new sports facility expansion was approved for ${city}'s community academy. The sports minister confirmed that the upgrade will include multi-sport courts and modern gear to support training for regional youth.`,
      `Athletic clubs across the ${city} district reported record enrollment this season. Coaches attributed the interest to recent state victories and local school-level outreach initiatives in ${state}.`
    ],
    'Technology': [
      `Officials in ${city} launched a digital hub to provide high-speed internet and online training to local residents. The government-backed program aims to connect remote blocks of ${state} with the growing tech economy.`,
      `The cybersecurity cell in ${city} has upgraded its network infrastructure to protect citizen data and prevent digital fraud. Officers are conducting workshops on online safety and digital transactions.`,
      `A new mobile app was introduced by ${city}'s public transport department to help commuters track schedules and purchase tickets. The system is expected to reduce wait times at major hubs.`
    ],
    'Stocks/Business': [
      `An industrial development council in ${city} approved plans for a new manufacturing corridor. The project is expected to create several thousand employment opportunities and boost trade across ${state}.`,
      `Handloom weavers and local artisans near ${city} noted a strong increase in demand for traditional crafts. Cooperative societies are preparing to expand production to fulfill new supply contracts.`,
      `Retailers in ${city}'s commercial center reported stable sales growth during the recent festive week. Business associations highlighted consumer confidence and improved transport options.`
    ],
    'Science': [
      `Agricultural researchers near ${city} successfully tested a hybrid seed variety designed to withstand dry seasons. Local farming boards are planning to distribute the seeds to cultivators across ${state}.`,
      `A botanical survey in the forest reserve near ${city} identified a new variety of medicinal shrub. Researchers are studying its properties for healthcare applications, prompting conservation efforts.`,
      `A regional science symposium in ${city} showcased student inventions and green energy models. Experts praised the practical designs and recommended state sponsorship for advanced research.`
    ],
    'Health': [
      `Mobile clinics were deployed to remote blocks surrounding ${city} to provide primary health screenings and check-ups. The health department plans to run the camp for three weeks.`,
      `A specialized pediatric wing was inaugurated at the general hospital in ${city}. The facility features advanced care units and upgraded equipment to serve families in the district.`,
      `Local health workers in ${city} organized a wellness seminar to discuss regional wellness measures. The session included practical guidance on hygiene and nutrition.`
    ],
    'Movies/Entertainment': [
      `The community cultural center in ${city} welcomed filmmakers and actors for the opening of the state cinema showcase. The week-long event features independent features and local documentaries.`,
      `A classic theater production was staged in ${city}'s historic hall, drawing a large crowd of art enthusiasts. The director announced additional shows due to strong ticket demand.`,
      `Musicians performed traditional folk recitals at the annual ${city} heritage fair. The event celebrates the region's diverse cultural history and artistic legacy.`
    ],
    'Crime': [
      `Local authorities in ${city} recovered stolen valuables and apprehended several suspects following a coordinated regional safety sweep. Safety presence has been elevated across prime commerce blocks.`,
      `Security patrols were increased in municipal commercial neighborhoods to verify compliance with local safety directives and protect retail businesses during peak hours.`,
      `A special investigation team in ${city} successfully concluded a case involving digital wire fraud and asset recovery. Security guidelines were updated for local businesses.`
    ],
    'Education': [
      `The state education board announced a new scholarship program to support high-performing students in the district. Eligible candidates will receive financial grants to cover university fees.`,
      `Primary school classrooms in ${city} are receiving modern learning kits and digital resources to improve literacy and mathematics programs for young learners.`,
      `A local vocational institute in ${city} celebrated the graduation of its first cohort of technical apprentices. Graduates secured immediate placements in local automotive workshops.`
    ],
    'Weather': [
      `Meteorological specialists forecasted moderate to heavy rainfall in the hilly blocks surrounding ${city}. Local emergency service units are monitoring drainage channels to prevent waterlogging.`,
      `Administration officers in ${city} issued cold weather safety guidelines for residents. Relief teams are coordinating warm clothing distribution campaigns in key areas.`,
      `Water levels in municipal reservoirs near ${city} returned to stable levels following recent rainfall. Irrigation committees confirmed that regional farming needs are fully covered.`
    ],
    'Local + Regional Pulse': [
      `A major regional development budget was officially approved for the ${city} municipal district to fund road building and sanitation grid upgrades over the coming fiscal year.`,
      `A new rural roadway was completed, linking several agrarian blocks to the central wholesale market in ${city} for faster transport of fresh produce and goods.`,
      `The transit department introduced additional daily bus trips from ${city} to nearby blocks to help local commuters.`
    ],
    'General': [
      `A comprehensive state welfare package has started distributing benefits to families in the ${city} block. Program organizers confirmed that application portals remain open.`,
      `Community representatives hosted a town hall session in ${city} to discuss municipal improvements, waste management contracts, and local library funding projects.`,
      `An annual heritage fair opened in ${city} featuring street parades, food stalls, and traditional crafts exhibition to celebrate regional foundation day.`
    ]
  };

  const list = summaries[category] || summaries['General'];
  const baseSummary = list[articleIndex % list.length];
  const formattedSummary = `Regarding the report "${title}": ${baseSummary}`;
  return formattedSummary.charAt(0).toUpperCase() + formattedSummary.slice(1);
}

const ENGLISH_FALLBACK_HEADLINES: Record<string, string[]> = {
  'Politics': [
    'Regional leaders hold high-level conference on development projects',
    'State assembly discusses new legislative bill on public infrastructure',
    'Local representatives propose major reforms for city administration'
  ],
  'Sports': [
    'State athletic team wins national championship in close contest',
    'Local sports complex to host upcoming regional tournament',
    'Young athletes set new records at annual state track meet'
  ],
  'Technology': [
    'Tech start-up hub announced in capital city to boost innovation',
    'Digital literacy program successfully rolled out in rural sectors',
    'New cybersecurity protocols implemented for local governance networks'
  ],
  'Stocks/Business': [
    'Regional industries report strong growth in quarterly business review',
    'State chamber of commerce hosts annual entrepreneurs summit',
    'Local markets see steady surge amid retail sector expansion'
  ],
  'Science': [
    'Agriculture scientists introduce high-yielding hybrid crop seeds',
    'State environment institute publishes study on clean energy adoption',
    'Local universities collaborate on bio-tech research initiative'
  ],
  'Health': [
    'Health department launches massive public immunization campaign',
    'New specialty ward inaugurated at state hospital in capital city',
    'Local wellness seminar outlines preventative health measures'
  ],
  'Movies/Entertainment': [
    'Regional film festival celebrates local cinema and culture',
    'Traditional theater group holds revival tour across districts',
    'Local musicians perform at cultural heritage festival'
  ],
  'Crime': [
    'District police seize contraband materials and arrest suspects',
    'Law enforcement agencies tighten security measures ahead of festival',
    'State special cell resolves high-profile digital fraud investigation'
  ],
  'Education': [
    'Education department announces scholarship scheme for deserving students',
    'Primary schools implement new smart classroom digital modules',
    'State skill development centers train over ten thousand youths'
  ],
  'Weather': [
    'Meteorological department issues moderate rain alert for districts',
    'State administration prepares response plan for impending heat wave',
    'Monsoon rains revive water reservoirs across rural areas'
  ],
  'Local + Regional Pulse': [
    'State cabinet approves multi-million developmental package for districts',
    'New rural connectivity project connects fifty remote villages',
    'Public transport body expands bus fleets on major urban routes'
  ],
  'General': [
    'State government announces new public welfare and pension scheme',
    'Local municipal corporation begins annual city cleaning drive',
    'Districts celebrate foundation day with cultural programs and events'
  ]
};

/**
 * Helper to classify articles into predefined categories based on keywords.
 * Used during mock runs and API error fallbacks to avoid a "General" category blackhole.
 */
export function mockClassify(title: string, desc: string, sourceCategory: string): { primaryCategory: string; secondaryCategory: string | null } {
  const text = `${title} ${desc}`.toLowerCase();

  // Helper to match any of the keywords as a whole word
  const matchWords = (words: string[]): boolean => {
    return words.some(word => {
      // Escape special regex characters if any
      const escaped = word.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
      const regex = new RegExp(`\\b${escaped}s?\\b`, 'i');
      return regex.test(text);
    });
  };

  if (matchWords(['ai', 'artificial intelligence', 'gpt', 'openai', 'llm', 'nvidia', 'deepmind', 'anthropic', 'gemini'])) {
    return { primaryCategory: 'AI & Tech Deep Dives', secondaryCategory: null };
  }
  if (matchWords(['tech', 'technology', 'software', 'silicon', 'cybersecurity', 'telecom', 'gadget', 'device', 'network', 'computer', 'digital', 'broadband'])) {
    return { primaryCategory: 'Technology', secondaryCategory: null };
  }
  if (matchWords(['modi', 'gandhi', 'minister', 'election', 'bjp', 'congress', 'parliament', 'government', 'protest', 'cabinet', 'legislative', 'assembly', 'voter'])) {
    return { primaryCategory: 'Politics', secondaryCategory: null };
  }
  if (matchWords(['cricket', 'olympics', 'sports', 'sport', 'bowler', 'batsman', 'wicket', 'athlete', 'stadium', 'championship', 'football', 'marathon', 'tennis', 'hockey', 'badminton', 'esports', 'tournament', 'ipl', 'world cup'])) {
    return { primaryCategory: 'Sports', secondaryCategory: null };
  }
  if (matchWords(['funding', 'startup', 'invest', 'raise', 'valuation', 'venture', 'founder'])) {
    return { primaryCategory: 'Startup & Funding Tracker', secondaryCategory: null };
  }
  if (matchWords(['food', 'recipe', 'restaurant', 'cook', 'chef', 'dish', 'eat', 'taste', 'spice', 'kitchen', 'organic', 'bazaar'])) {
    return { primaryCategory: 'Food', secondaryCategory: null };
  }
  if (matchWords(['fashion', 'style', 'wear', 'cloth', 'designer', 'trend', 'jewelry', 'apparel', 'weaving', 'khadi'])) {
    return { primaryCategory: 'Fashion', secondaryCategory: null };
  }
  if (matchWords(['travel', 'tourism', 'tourist', 'destination', 'trip', 'flight', 'hotel', 'vacation', 'lake', 'scenic'])) {
    return { primaryCategory: 'Travel', secondaryCategory: null };
  }
  if (matchWords(['game', 'gaming', 'xbox', 'playstation', 'nintendo', 'esports', 'puzzle'])) {
    return { primaryCategory: 'Gaming', secondaryCategory: null };
  }
  if (matchWords(['car', 'vehicle', 'auto', 'automobile', 'ev', 'electric vehicle', 'motor', 'tesla', 'ford', 'toyota'])) {
    return { primaryCategory: 'Automobile', secondaryCategory: null };
  }
  if (matchWords(['stocks', 'market', 'billion', 'deal', 'business', 'economy', 'trade', 'tariff', 'finance', 'commerce', 'corridor'])) {
    return { primaryCategory: 'Stocks/Business', secondaryCategory: null };
  }
  if (matchWords(['climate', 'space', 'isro', 'nasa', 'moon', 'science', 'study', 'research', 'scientists', 'planet', 'botanists', 'flora', 'species', 'medicinal'])) {
    return { primaryCategory: 'Science', secondaryCategory: null };
  }
  if (matchWords(['covid', 'virus', 'health', 'medical', 'doctor', 'hospital', 'gene', 'disease', 'clinic', 'wellness', 'pediatric'])) {
    return { primaryCategory: 'Health', secondaryCategory: null };
  }
  if (matchWords(['movie', 'film', 'actor', 'book', 'review', 'entertainment', 'show', 'netflix', 'celebrity', 'theater', 'cultural'])) {
    return { primaryCategory: 'Movies/Entertainment', secondaryCategory: null };
  }
  if (matchWords(['police', 'arrest', 'court', 'crime', 'kill', 'assault', 'theft', 'scam', 'murder', 'accused', 'syndicate', 'raid', 'busted'])) {
    return { primaryCategory: 'Crime', secondaryCategory: null };
  }
  if (matchWords(['school', 'student', 'neet', 'education', 'exam', 'college', 'teacher', 'scholarship', 'classroom'])) {
    return { primaryCategory: 'Education', secondaryCategory: null };
  }
  if (matchWords(['china', 'us', 'un', 'global', 'iran', 'houthi', 'international', 'world', 'pentagon', 'border', 'clashes', 'naval'])) {
    return { primaryCategory: 'World News', secondaryCategory: null };
  }
  if (matchWords(['weather', 'rain', 'flood', 'storm', 'temperature', 'monsoon', 'forecast'])) {
    return { primaryCategory: 'Weather', secondaryCategory: null };
  }
  if (matchWords(['job', 'career', 'hire', 'hiring', 'employ', 'employment', 'workforce', 'salary', 'recruit', 'recruitment', 'layoff', 'resume', 'interview', 'staff', 'vocational', 'placement'])) {
    return { primaryCategory: 'Jobs & Career', secondaryCategory: null };
  }

  // Fallback to source category if it's one of the valid ones
  if (CATEGORIES.includes(sourceCategory)) {
    return { primaryCategory: sourceCategory, secondaryCategory: null };
  }

  // Default fallback
  return { primaryCategory: 'National News', secondaryCategory: null };
}

interface ClusterResult {
  title: string;
  summary: string;
  primaryCategory: string;
  secondaryCategory: string | null;
  claims: {
    claimText: string;
    status: 'CORROBORATED' | 'SINGLE_SOURCE';
    associatedArticles: string[]; // URLs of articles supporting it
  }[];
  disputedClaims: string[];
  credibilityScore: 'VERIFIED' | 'UNVERIFIED' | 'DISPUTED';
}

export class AiPipelineService {
  private embeddingApiFailed = false;
  private analysisApiFailed = false;

  /**
   * Safe check for Gemini initialization
   */
  private checkGenAI(): boolean {
    if (!genAI) {
      console.warn('[AI Pipeline] GEMINI_API_KEY is not configured. Running in mock/bypass mode.');
      return false;
    }
    return true;
  }

  /**
   * Fetch embedding from Gemini API
   */
  async getEmbedding(text: string): Promise<number[]> {
    if (!this.checkGenAI() || this.embeddingApiFailed) {
      // Return a dummy embedding (random normalized vector)
      const mockVector = Array.from({ length: 768 }, () => Math.random() - 0.5);
      const mag = Math.sqrt(mockVector.reduce((sum, v) => sum + v * v, 0));
      return mockVector.map(v => v / mag);
    }

    try {
      const model = genAI!.getGenerativeModel({ model: 'text-embedding-004' });
      // Truncate text if it's too long
      const truncatedText = text.slice(0, 4000);

      // Enforce a 1.5s timeout to trigger fast fallback mode on rate limit blocks
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Gemini API call timed out')), 1500)
      );

      const result = await Promise.race([
        model.embedContent(truncatedText),
        timeoutPromise
      ]) as any;

      return result.embedding.values;
    } catch (error: any) {
      console.error('[AI Pipeline] Error generating embedding:', error.message);
      this.embeddingApiFailed = true; // Set flag to bypass future failing API calls
      // Fallback to random normalized vector to avoid zero-vectors
      const mockVector = Array.from({ length: 768 }, () => Math.random() - 0.5);
      const mag = Math.sqrt(mockVector.reduce((sum, v) => sum + v * v, 0));
      return mockVector.map(v => v / mag);
    }
  }

  /**
   * Dot product of two vectors (since Gemini embeddings are normalized, dot product = cosine similarity)
   */
  cosineSimilarity(vecA: number[], vecB: number[]): number {
    if (vecA.length !== vecB.length || vecA.length === 0) return 0;
    let dotProduct = 0;
    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
    }
    return dotProduct;
  }

  /**
   * In-Memory Clustering of Articles using Cosine Similarity
   */
  clusterArticles(articles: any[], similarityThreshold = 0.87): any[][] {
    const n = articles.length;
    if (n === 0) return [];
    if (n === 1) return [[articles[0]]];

    interface Cluster {
      centroid: number[];
      items: any[];
    }

    const clusters: Cluster[] = [];

    for (const article of articles) {
      let bestCluster: Cluster | null = null;
      let bestSim = -1;
      const stateA = getArticleState(article);

      for (const cluster of clusters) {
        const stateC = getArticleState(cluster.items[0]);
        if (stateA !== stateC) {
          continue; // Mismatched states, do not cluster together
        }

        const sim = this.cosineSimilarity(article.embedding, cluster.centroid);
        if (sim > bestSim) {
          bestSim = sim;
          bestCluster = cluster;
        }
      }

      if (bestSim >= similarityThreshold && bestCluster) {
        // Add item to cluster
        bestCluster.items.push(article);

        // Update centroid (average & normalize)
        const d = article.embedding.length;
        const newCentroid = Array.from({ length: d }, () => 0);
        for (const item of bestCluster.items) {
          for (let k = 0; k < d; k++) {
            newCentroid[k] += item.embedding[k];
          }
        }
        let mag = 0;
        for (let k = 0; k < d; k++) {
          newCentroid[k] /= bestCluster.items.length;
          mag += newCentroid[k] * newCentroid[k];
        }
        mag = Math.sqrt(mag);
        if (mag > 0) {
          bestCluster.centroid = newCentroid.map(v => v / mag);
        } else {
          bestCluster.centroid = newCentroid;
        }
      } else {
        // Create a new cluster
        clusters.push({
          centroid: [...article.embedding],
          items: [article]
        });
      }
    }

    return clusters.map(c => c.items);
  }

  cleanFallbackSummary(description: string | null, content: string | null, title: string): string {
    let text = description || content || '';
    
    // Clean Hacker News style URL block
    if (text.includes('Article URL:')) {
      return `Discussion and comments on the article "${title}".`;
    }
    
    // Remove HTML tags if present
    text = text.replace(/<[^>]*>/g, '').trim();
    
    if (!text || text === 'Summary unavailable.') {
      return `Reported news about "${title}".`;
    }
    
    // Cut down to 250 characters if too long
    if (text.length > 250) {
      return text.slice(0, 250) + '...';
    }
    return text;
  }

  /**
   * Query LLM to summarize, classify, and extract claims from a cluster of articles
   */
  async analyzeCluster(cluster: any[]): Promise<ClusterResult> {
    if (cluster.length === 1 || !this.checkGenAI() || this.analysisApiFailed) {
      // Mock/Fast cluster processing response for single source articles or API fail fallbacks
      let title = cluster[0].title.split(' - ')[0] || 'Aggregated News Story';
      if (title.length > 0) {
        title = title.charAt(0).toUpperCase() + title.slice(1);
      }
      const isMultiSource = cluster.length > 1;
      const sourceCategory = cluster[0].source?.category || 'General';
      const classification = mockClassify(cluster[0].title, cluster[0].description || '', sourceCategory);
      let summary = this.cleanFallbackSummary(cluster[0].description, cluster[0].content, title);
      if (summary.length > 0) {
        summary = summary.charAt(0).toUpperCase() + summary.slice(1);
      }



      return {
        title: `${title}`,
        summary,
        primaryCategory: classification.primaryCategory,
        secondaryCategory: null,
        claims: cluster.map((art, idx) => ({
          claimText: `Factual statement extracted from source ${idx + 1}: ${title.slice(0, 60)}`,
          status: isMultiSource ? 'CORROBORATED' : 'SINGLE_SOURCE',
          associatedArticles: [art.url],
        })),
        disputedClaims: [],
        credibilityScore: isMultiSource ? 'VERIFIED' : 'UNVERIFIED',
      };
    }

    const articlesData = cluster.map((art, index) => ({
      index,
      title: art.title,
      description: art.description || '',
      content: art.content || '',
      source: art.sourceName || 'Unknown',
      url: art.url,
    }));

    const prompt = `You are a professional fact-checker and editor. Analyze the following articles that have been clustered together as talking about the same news event.
Your tasks are:
1. Provide a neutral, objective title summarizing the story. The title MUST be written in English, even if the input articles are in another language (like Hindi, Telugu, Tamil, Marathi, Kannada, Bengali, etc.).
2. Provide a clean, neutral 3-4 sentence summary of the story in English. Do NOT copy full text. Make sure to attribute facts neutrally.
3. Classify this story into a single Category from this strict list (returned in primaryCategory, and secondaryCategory should be null):
   ${JSON.stringify(CATEGORIES)}
4. Extract key factual claims. For each claim, check which source articles (by index) support it. If a claim is supported by more than 1 article, set status to "CORROBORATED". If only supported by 1 article, set status to "SINGLE_SOURCE".
5. Identify any contradictory, conflicting, or disputed claims between different sources (e.g. different death tolls, conflicting timelines, different claims of responsibility). List them in "disputedClaims".
6. Assign a "credibilityScore" based on these rules:
   - "VERIFIED": If there are 2 or more independent sources corroborating the major claims, and no critical disputed claims.
   - "UNVERIFIED": If the story is reported by only 1 source.
   - "DISPUTED": If there are conflicting statements between the sources.

Articles:
${JSON.stringify(articlesData, null, 2)}

Return your analysis in valid JSON matching this schema:
{
  "title": "string",
  "summary": "string",
  "primaryCategory": "string (must match list)",
  "secondaryCategory": null,
  "claims": [
    {
      "claimText": "string",
      "status": "CORROBORATED | SINGLE_SOURCE",
      "associatedArticles": ["string (urls matching the article urls)"]
    }
  ],
  "disputedClaims": ["string"],
  "credibilityScore": "VERIFIED | UNVERIFIED | DISPUTED"
}
`;

    try {
      const model = genAI!.getGenerativeModel({
        model: 'gemini-flash-latest',
        generationConfig: {
          responseMimeType: 'application/json',
        },
      });

      const response = await model.generateContent(prompt);
      const jsonText = response.response.text();
      return JSON.parse(jsonText) as ClusterResult;
    } catch (error: any) {
      console.error('[AI Pipeline] Error analyzing cluster with Gemini:', error.message);
      this.analysisApiFailed = true; // Set flag to bypass future failing API calls
      // Fallback
      const sourceCategory = cluster[0].source?.category || 'General';
      const classification = mockClassify(cluster[0].title, cluster[0].description || '', sourceCategory);
      let cleanSummary = this.cleanFallbackSummary(cluster[0].description, cluster[0].content, cluster[0].title);
      if (cleanSummary && cleanSummary.length > 0) {
        cleanSummary = cleanSummary.charAt(0).toUpperCase() + cleanSummary.slice(1);
      }
      let title = cluster[0].title;
      if (title && title.length > 0) {
        title = title.charAt(0).toUpperCase() + title.slice(1);
      }


      return {
        title,
        summary: cleanSummary,
        primaryCategory: classification.primaryCategory,
        secondaryCategory: null,
        claims: [{ claimText: title, status: 'SINGLE_SOURCE', associatedArticles: [cluster[0].url] }],
        disputedClaims: [],
        credibilityScore: 'UNVERIFIED',
      };
    }
  }

  async findDevelopingStoryMatch(clusterEmbedding: number[], clusterState: string | null, threshold = 0.88): Promise<any | null> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 3); // 72 hours

    // Find stories updated in the last 72 hours
    const recentStories = await prisma.story.findMany({
      where: {
        updatedAt: {
          gte: cutoffDate,
        },
      },
      include: {
        articles: {
          include: {
            source: true,
          },
        },
      },
    });

    let bestMatch: any | null = null;
    let maxSim = -1;

    for (const story of recentStories) {
      const storyState = story.articles.length > 0 ? getArticleState(story.articles[0]) : null;
      if (clusterState !== storyState) {
        continue; // Mismatched states, do not merge into same developing story
      }

      if (story.embedding) {
        try {
          const storyEmbed = JSON.parse(story.embedding) as number[];
          const sim = this.cosineSimilarity(clusterEmbedding, storyEmbed);
          if (sim > maxSim) {
            maxSim = sim;
            bestMatch = story;
          }
        } catch (e) {
          // ignore parsing error
        }
      }
    }

    if (maxSim >= threshold) {
      console.log(`[AI Pipeline] Matched story cluster to existing developing story: "${bestMatch.title}" (similarity: ${maxSim.toFixed(3)})`);
      return bestMatch;
    }

    return null;
  }

  /**
   * Use Gemini to generate a Story Lineage update and "What's Changed" StoryDiff since yesterday
   */
  async generateStoryDiffAndTimeline(
    story: any,
    newCluster: any[]
  ): Promise<{ diffContent: string; timelineTitle: string; timelineDesc: string }> {
    if (!this.checkGenAI() || this.analysisApiFailed) {
      return {
        diffContent: `Mock update: ${newCluster.length} new reports added to the timeline.`,
        timelineTitle: 'Story Updated',
        timelineDesc: 'New reports ingested and merged.',
      };
    }

    const newArticlesDesc = newCluster.map(art => `- ${art.title} (Source: ${art.sourceName})`).join('\n');

    const prompt = `You are a news editor updating an ongoing developing story.
Existing Story Title: ${story.title}
Existing Story Summary: ${story.summary}

We have received new reports today:
${newArticlesDesc}

Your tasks are:
1. Write a short 1-2 sentence update ("What's changed since yesterday") summarizing the key development. Do not repeat the entire background.
2. Provide a single headline for this new timeline event (e.g. "Death Toll Rises to 15", "Company Announces New CEO").
3. Provide a brief 1-2 sentence description for this timeline event.

Return your response in valid JSON matching this schema:
{
  "diffContent": "string (the update text)",
  "timelineTitle": "string (short event headline)",
  "timelineDesc": "string (event description)"
}
`;

    try {
      const model = genAI!.getGenerativeModel({
        model: 'gemini-flash-latest',
        generationConfig: {
          responseMimeType: 'application/json',
        },
      });

      const response = await model.generateContent(prompt);
      const data = JSON.parse(response.response.text());
      return {
        diffContent: data.diffContent || 'Updates added.',
        timelineTitle: data.timelineTitle || 'New Development',
        timelineDesc: data.timelineDesc || 'New reports incorporated.',
      };
    } catch (err: any) {
      console.error('[AI Pipeline] Error generating story diff:', err.message);
      this.analysisApiFailed = true; // Set flag to bypass future failing API calls
      return {
        diffContent: 'New reports added.',
        timelineTitle: 'Latest Updates',
        timelineDesc: 'New sources added to the story cluster.',
      };
    }
  }

  /**
   * Run the AI Clustering and Story Processing Pipeline
   */
  async run(): Promise<void> {
    console.log('[AI Pipeline] Running AI clustering & processing pipeline...');

    // 1. Fetch all raw articles ingested in the last 36 hours that are not yet clustered into a story
    const cutoffDate = new Date();
    cutoffDate.setHours(cutoffDate.getHours() - 36);

    const unclusteredArticles = await prisma.article.findMany({
      where: {
        storyId: null,
        publishedAt: {
          gte: cutoffDate,
        },
      },
      include: {
        source: true,
      },
    });

    if (unclusteredArticles.length === 0) {
      console.log('[AI Pipeline] No unclustered articles found. Pipeline complete.');
      return;
    }

    console.log(`[AI Pipeline] Found ${unclusteredArticles.length} unclustered articles. Generating embeddings...`);

    // 2. Generate embeddings for each article in parallel chunks to avoid rate limits
    const articlesWithEmbeddings = [];
    const chunkSize = 10;
    for (let i = 0; i < unclusteredArticles.length; i += chunkSize) {
      const chunk = unclusteredArticles.slice(i, i + chunkSize);
      console.log(`[AI Pipeline] Embedding chunk ${Math.floor(i / chunkSize) + 1}/${Math.ceil(unclusteredArticles.length / chunkSize)}...`);
      const chunkResults = await Promise.all(
        chunk.map(async (art) => {
          const embedText = `${art.title}\n${art.description || ''}`;
          const embedding = await this.getEmbedding(embedText);
          return {
            ...art,
            sourceName: art.source?.name || 'Unknown Source',
            embedding,
          };
        })
      );
      articlesWithEmbeddings.push(...chunkResults);
      if (i + chunkSize < unclusteredArticles.length) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }

    // 3. Cluster articles in memory
    const clusters = this.clusterArticles(articlesWithEmbeddings);
    console.log(`[AI Pipeline] Grouped articles into ${clusters.length} clusters.`);

    // 4. Process each cluster
    for (const cluster of clusters) {
      try {
        // A. Calculate average embedding of the cluster
        const d = cluster[0].embedding.length;
        const avgEmbedding = Array.from({ length: d }, () => 0);
        for (const art of cluster) {
          for (let k = 0; k < d; k++) {
            avgEmbedding[k] += art.embedding[k];
          }
        }
        for (let k = 0; k < d; k++) {
          avgEmbedding[k] /= cluster.length;
        }

        // B. Check if this cluster matches an existing active story from the past 72 hrs
        const clusterState = getArticleState(cluster[0]);
        const matchedStory = await this.findDevelopingStoryMatch(avgEmbedding, clusterState);

        if (matchedStory) {
          // DEVELOPING STORY PATH
          const updateData = await this.generateStoryDiffAndTimeline(matchedStory, cluster);

          // Update Story fields
          await prisma.story.update({
            where: { id: matchedStory.id },
            data: {
              isDeveloping: true,
              embedding: JSON.stringify(avgEmbedding), // Update average embedding
            },
          });

          // Add Timeline Event
          await prisma.storyTimeline.create({
            data: {
              storyId: matchedStory.id,
              eventTime: cluster[0].publishedAt,
              eventTitle: updateData.timelineTitle,
              eventDescription: updateData.timelineDesc,
              sourceUrl: cluster[0].url,
            },
          });

          // Add Daily Story Diff (What's changed)
          const istOffset = 5.5 * 60 * 60 * 1000;
          const istDate = new Date(Date.now() + istOffset);
          const diffDate = istDate.toISOString().split('T')[0];

          await prisma.storyDiff.create({
            data: {
              storyId: matchedStory.id,
              diffDate,
              diffContent: updateData.diffContent,
            },
          });

          // Link new articles to the story
          for (const art of cluster) {
            await prisma.article.update({
              where: { id: art.id },
              data: { storyId: matchedStory.id },
            });
          }

          console.log(`[AI Pipeline] Updated developing story "${matchedStory.title}" with ${cluster.length} new articles.`);
        } else {
          // NEW STORY PATH
          const analysis = await this.analyzeCluster(cluster);

          // Double check if there are disputed claims or if rating is disputed
          let finalCredibility = analysis.credibilityScore;
          if (analysis.disputedClaims && analysis.disputedClaims.length > 0) {
            finalCredibility = 'DISPUTED';
          }

          // Create the Story
          const createdStory = await prisma.story.create({
            data: {
              title: analysis.title,
              summary: analysis.summary,
              credibilityScore: finalCredibility,
              primaryCategory: analysis.primaryCategory,
              secondaryCategory: null,
              embedding: JSON.stringify(avgEmbedding),
            },
          });

          // Link cluster articles to story
          for (const art of cluster) {
            await prisma.article.update({
              where: { id: art.id },
              data: { storyId: createdStory.id },
            });
          }

          // Insert Claims
          for (const claim of analysis.claims) {
            await prisma.claim.create({
              data: {
                storyId: createdStory.id,
                claimText: claim.claimText,
                status: claim.status,
                sourcesCount: claim.associatedArticles.length,
              },
            });
          }

          // If disputed claims are found, insert them as claims too
          if (analysis.disputedClaims && analysis.disputedClaims.length > 0) {
            for (const disp of analysis.disputedClaims) {
              await prisma.claim.create({
                data: {
                  storyId: createdStory.id,
                  claimText: disp,
                  status: 'DISPUTED',
                  sourcesCount: cluster.length,
                },
              });
            }
          }

          // Add initial timeline event
          await prisma.storyTimeline.create({
            data: {
              storyId: createdStory.id,
              eventTime: cluster[0].publishedAt,
              eventTitle: 'Story Reported',
              eventDescription: `Story initially reported by ${cluster[0].sourceName}${cluster.length > 1 ? ` and ${cluster.length - 1} other source(s)` : ''}.`,
              sourceUrl: cluster[0].url,
            },
          });

          console.log(`[AI Pipeline] Created new story "${analysis.title}" with ${cluster.length} articles.`);
        }
      } catch (err: any) {
        console.error('[AI Pipeline] Failed to process cluster:', err.message);
      }
    }

    // Flush cache so that the homepage/feeds update immediately
    await cache.flush();
    console.log('[AI Pipeline] AI pipeline run complete. Cache flushed.');
  }
}

export const aiPipeline = new AiPipelineService();
