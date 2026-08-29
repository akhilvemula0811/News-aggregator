import axios from 'axios';

async function test() {
  const languages = ['hi', 'ta', 'te', 'bn', 'mr', 'kn', 'ml'];
  for (const lang of languages) {
    try {
      console.log(`\n--- Fetching stories for Maharashtra in language: ${lang.toUpperCase()} ---`);
      const res = await axios.get(`http://localhost:5000/api/stories?state=Maharashtra&language=${lang}`);
      const stories = res.data.stories || [];
      console.log(`Found ${stories.length} stories.`);
      if (stories.length > 0) {
        console.log(`First story:`);
        console.log(`- Title: ${stories[0].title}`);
        console.log(`- Summary: ${stories[0].summary}`);
      }
    } catch (err: any) {
      console.error(`Error for ${lang}:`, err.message);
    }
  }
}

test();
