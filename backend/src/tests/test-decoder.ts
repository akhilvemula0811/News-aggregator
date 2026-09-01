import axios from 'axios';

async function main() {
  const targetUrl = "https://www.ndtv.com/india-news/3-year-old-boy-tied-to-chair-allegedly-assaulted-at-delhi-day-care-11980496";
  try {
    const response = await axios.get(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': 'https://www.google.com/',
      },
      timeout: 8000,
    });
    console.log("Status Code:", response.status);
    console.log("HTML length:", response.data.length);
  } catch (err: any) {
    console.error("Scraping error:", err.message);
  }
}

main();
