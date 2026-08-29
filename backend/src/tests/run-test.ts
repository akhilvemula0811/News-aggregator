import { ingestion } from '../services/ingestion';
import { aiPipeline } from '../services/ai-pipeline';
import { prisma } from '../config/db';
import dotenv from 'dotenv';

dotenv.config();

async function runTest() {
  console.log('==================================================');
  console.log('🧪 Starting AI News Aggregator Pipeline Test...');
  console.log('==================================================');

  // Verify Environment Variables
  const geminiKey = process.env.GEMINI_API_KEY;
  const newsApiKey = process.env.NEWS_API_KEY;
  const currentsApiKey = process.env.CURRENTS_API_KEY;

  console.log('Environment Check:');
  console.log(`- GEMINI_API_KEY:  ${geminiKey ? '✅ Configured' : '❌ Missing (Pipeline will run in mock mode)'}`);
  console.log(`- NEWS_API_KEY:    ${newsApiKey ? '✅ Configured' : '⚠️ Missing (Will skip NewsAPI source)'}`);
  console.log(`- CURRENTS_API_KEY: ${currentsApiKey ? '✅ Configured' : '⚠️ Missing (Will skip Currents API source)'}`);
  console.log('');

  try {
    // 1. Seed some initial source data if none exist
    const sourceCount = await prisma.source.count();
    console.log(`Current Source Records in Database: ${sourceCount}`);

    // 2. Run Ingestion
    console.log('\n[Step 1/3] Running Ingestion...');
    const insertedCount = await ingestion.run();
    console.log(`[Step 1/3] Complete. Ingested & saved ${insertedCount} new articles.`);

    // If no articles were fetched (e.g. offline or no keys), seed mock articles for clustering test
    const articleCount = await prisma.article.count();
    if (articleCount === 0) {
      console.log('\n⚠️ No articles found in database. Seeding mock articles to test AI clustering...');
      
      const testSource = await prisma.source.create({
        data: {
          name: 'Test Tech News',
          url: 'https://testtechnews.com',
          type: 'RSS',
          category: 'AI & Tech Deep Dives',
        }
      });

      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];

      await prisma.article.createMany({
        data: [
          {
            title: 'OpenAI announces GPT-5 with reasoning capabilities',
            description: 'OpenAI has officially launched GPT-5, their latest model with advanced multi-step reasoning capabilities.',
            content: 'OpenAI has officially launched GPT-5, their latest model with advanced multi-step reasoning capabilities. It is designed to think before responding.',
            url: 'https://testtechnews.com/gpt5-announce',
            publishedAt: today,
            publishedIstDate: todayStr,
            sourceId: testSource.id,
          },
          {
            title: 'GPT-5 released by OpenAI featuring advanced reasoning',
            description: 'OpenAI unveiled its highly anticipated model GPT-5 today, emphasizing deep reasoning and logical deduction.',
            content: 'OpenAI unveiled its highly anticipated model GPT-5 today, emphasizing deep reasoning and logical deduction. The model represents a significant leap forward.',
            url: 'https://testtechnews.com/gpt5-release',
            publishedAt: new Date(today.getTime() - 10 * 60 * 1000),
            publishedIstDate: todayStr,
            sourceId: testSource.id,
          },
          {
            title: 'Indian Space Research Organisation launches new lunar orbiter',
            description: 'ISRO successfully launched its latest satellite mission to study the lunar surface in high detail.',
            content: 'ISRO successfully launched its latest satellite mission to study the lunar surface in high detail. The launch took place from Sriharikota.',
            url: 'https://testtechnews.com/isro-launch',
            publishedAt: today,
            publishedIstDate: todayStr,
            sourceId: testSource.id,
          }
        ]
      });

      console.log('Seeded 3 mock articles (2 about OpenAI, 1 about ISRO).');
    }

    // 3. Run AI Processing
    console.log('\n[Step 2/3] Running AI Processing (Embeddings & Clustering)...');
    await aiPipeline.run();
    console.log('[Step 2/3] Complete.');

    // 4. Verify Database Results
    console.log('\n[Step 3/3] Inspecting DB Results...');
    const stories = await prisma.story.findMany({
      include: {
        articles: true,
        claims: true,
        timelines: true,
      }
    });

    console.log(`\nFound ${stories.length} Story Clusters in Database:`);
    stories.forEach((story, idx) => {
      console.log(`\nStory #${idx + 1}: "${story.title}"`);
      console.log(`- Category: ${story.primaryCategory} (Secondary: ${story.secondaryCategory})`);
      console.log(`- Credibility: ${story.credibilityScore}`);
      console.log(`- Articles Linked: ${story.articles.length} (${story.articles.map(a => a.title.slice(0, 30) + '...').join(' | ')})`);
      console.log(`- Claims Extracted: ${story.claims.length}`);
      story.claims.forEach(c => {
        console.log(`  * [${c.status}] ${c.claimText}`);
      });
      console.log(`- Timeline Events: ${story.timelines.length}`);
    });

    console.log('\n==================================================');
    console.log('✅ Pipeline Test Run Completed Successfully!');
    console.log('==================================================');
  } catch (error) {
    console.error('\n❌ Pipeline Test Run Failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

runTest();
