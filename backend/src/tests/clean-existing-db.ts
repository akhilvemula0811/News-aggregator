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

async function main() {
  console.log("=== Starting Database Cleanup for HTML tags ===");
  
  // 1. Clean Articles
  const articles = await prisma.article.findMany();
  console.log(`Checking ${articles.length} articles...`);
  
  let cleanedArticlesCount = 0;
  for (const art of articles) {
    const hasHtmlDesc = art.description && (art.description.includes('<') || art.description.includes('>'));
    const hasHtmlContent = art.content && (art.content.includes('<') || art.content.includes('>'));
    
    if (hasHtmlDesc || hasHtmlContent) {
      const cleanDesc = cleanHtmlText(art.description);
      const cleanContent = cleanHtmlText(art.content);
      
      await prisma.article.update({
        where: { id: art.id },
        data: {
          description: cleanDesc,
          content: cleanContent
        }
      });
      cleanedArticlesCount++;
    }
  }
  console.log(`Cleaned HTML from ${cleanedArticlesCount} articles.`);

  // 2. Clean Stories
  const stories = await prisma.story.findMany();
  console.log(`Checking ${stories.length} stories...`);
  
  let cleanedStoriesCount = 0;
  for (const story of stories) {
    const hasHtmlSummary = story.summary && (story.summary.includes('<') || story.summary.includes('>'));
    
    if (hasHtmlSummary) {
      let cleanSummary = cleanHtmlText(story.summary);
      if (!cleanSummary) {
        cleanSummary = story.title || 'Summary unavailable.';
      }
      
      await prisma.story.update({
        where: { id: story.id },
        data: {
          summary: cleanSummary
        }
      });
      cleanedStoriesCount++;
    }
  }
  console.log(`Cleaned HTML from ${cleanedStoriesCount} stories.`);
  console.log("=== Database Cleanup Complete! ===");
}

main().catch(console.error).finally(() => prisma.$disconnect());
