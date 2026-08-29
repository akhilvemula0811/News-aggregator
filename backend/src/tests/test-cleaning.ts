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

async function test() {
  console.log("=== Testing cleanHtmlText ===");
  const rawDesc = `<img border="0" hspace="10" align="left" style="margin-top:3px;margin-right:5px;" src="https://timesofindia.indiatimes.com/photo/13359246.cms" />Some actual news story text describing the event.`;
  const cleaned = cleanHtmlText(rawDesc);
  console.log("Raw:", rawDesc);
  console.log("Cleaned:", cleaned);
  
  if (cleaned === "Some actual news story text describing the event.") {
    console.log("SUCCESS: HTML tags stripped correctly!");
  } else {
    console.log("FAILURE: Strip logic failed!");
  }

  const emptyHtml = `<img src="url" />`;
  console.log("Empty HTML cleaned:", cleanHtmlText(emptyHtml)); // Expect null
  
  // Let's verify DB story updates
  console.log("\n=== Checking DB stories for HTML summary ===");
  const stories = await prisma.story.findMany({
    take: 50
  });
  
  let dirtyCount = 0;
  for (const s of stories) {
    if (s.summary && (s.summary.includes('<img') || s.summary.includes('<a') || /<[^>]*>/.test(s.summary))) {
      dirtyCount++;
      console.log(`Story found with dirty HTML summary: "${s.title}"`);
      console.log(`Summary before cleaning: ${s.summary}`);
      const cleanSummary = s.summary.replace(/<[^>]*>/g, '').trim();
      console.log(`Summary after cleaning: ${cleanSummary}`);
    }
  }
  console.log(`Total dirty stories found in current database: ${dirtyCount}`);
}

test().catch(console.error).finally(() => prisma.$disconnect());
