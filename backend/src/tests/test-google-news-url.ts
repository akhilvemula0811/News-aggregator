import axios from 'axios';

async function main() {
  const testUrl = "https://news.google.com/rss/articles/CBMiyAFBVV95cUxObFJOXy1yNXRRdWo5RTNudE1Oajl5TzVLN01KY1hkejQ5NUJaVlh4Rlh2UjFKbDJfYlhMeEJRSXhtTS1XZ2ZuZHlXSjJBVU9CblYxeVMtM3IxYnhQczUyTUpKNGxaWHZCcE0zN0hDRjk0ZGg2b3BRd01JaWg2dGVobkwxZ0pYam9LM3VGREJxX0ZYM3kxTzRXalFKYU5zSjNmQXZVNDVmTFRub25HZEsxMW5FYzBIRXlKLXVtMW5abm83TU1uS2MwM9IByAFBVV95cUxObFJOXy1yNXRRdWo5RTNudE1Oajl5TzVLN01KY1hkejQ5NUJaVlh4Rlh2UjFKbDJfYlhMeEJRSXhtTS1XZ2ZuZHlXSjJBVU9CblYxeVMtM3IxYnhQczUyTUpKNGxaWHZCcE0zN0hDRjk0ZGg2b3BRd01JaWg2dGVobkwxZ0pYam9LM3VGREJxX0ZYM3kxTzRXalFKYU5zSjNmQXZVNDVmTFRub25HZEsxMW5FYzBIRXlKLXVtMW5abm83TU1uS2MwMw?oc=5";
  try {
    const res = await axios.get(testUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      }
    });
    const html = res.data;
    
    // Look for noscript
    const noscriptMatch = html.match(/<noscript>([\s\S]*?)<\/noscript>/gi);
    console.log("Noscript match:", noscriptMatch);
    
    // Look for meta refresh
    const metaRefresh = html.match(/<meta[^>]*http-equiv=["']refresh["'][^>]*>/gi);
    console.log("Meta refresh:", metaRefresh);

    // Look for any links inside noscript
    if (noscriptMatch) {
      noscriptMatch.forEach((ns: string) => {
        const links = ns.match(/href="([^"]+)"/g);
        console.log("Links inside noscript:", links);
      });
    }
  } catch (err: any) {
    console.error("Error:", err.message);
  }
}

main();
