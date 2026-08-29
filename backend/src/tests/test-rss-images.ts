import Parser from 'rss-parser';
import axios from 'axios';

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
      ['media:text', 'mediaText']
    ],
  },
});

const sources = [
  { name: 'ABP Majha', url: 'https://marathi.abplive.com/feed' },
  { name: 'TV9 Kannada', url: 'https://kannada.tv9kannada.com/feed' },
  { name: 'TV9 Telugu', url: 'https://tv9telugu.com/feed' },
  { name: 'Zee Uttar Pradesh Uttarakhand', url: 'https://zeeuttar.com/feed' }
];

async function test() {
  for (const src of sources) {
    try {
      console.log(`\n=================== Fetching ${src.name} ===================`);
      const response = await axios.get(src.url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
        timeout: 8000
      });
      const xml = response.data;
      console.log(`XML length: ${xml.length}`);
      
      const feed = await parser.parseString(xml);
      console.log(`Feed Title: ${feed.title}`);
      console.log(`Items count: ${feed.items.length}`);
      
      if (feed.items.length > 0) {
        // Print the raw XML text of the first item
        const firstItemXml = xml.match(/<item>([\s\S]*?)<\/item>/);
        if (firstItemXml) {
          console.log(`\n--- Raw XML of first <item> ---`);
          console.log(firstItemXml[1]);
        }
        for (let i = 0; i < Math.min(3, feed.items.length); i++) {
          const item = feed.items[i];
          console.log(`\n--- Item ${i+1}: ${item.title} ---`);
          console.log(`keys:`, Object.keys(item));
        }
      }
    } catch (e: any) {
      console.error(`Error for ${src.name}:`, e.message);
    }
  }
}

test();
