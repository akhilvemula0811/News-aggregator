import { GoogleGenerativeAI } from '@google/generative-ai';
import { prisma } from '../config/db';
import dotenv from 'dotenv';

dotenv.config();

const apiKey = process.env.GEMINI_API_KEY || '';
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

async function translateToEnglish(text: string): Promise<string> {
  if (!genAI) return text;
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' });
    const prompt = `Translate the following text into plain, natural English. Do not include any notes, explanations, or quotes. Text: "${text}"`;
    const result = await model.generateContent(prompt);
    return result.response.text().trim();
  } catch (e: any) {
    console.error(`Failed to translate text: ${text.slice(0, 20)}...`, e.message);
    return text;
  }
}

function isNonEnglish(text: string): boolean {
  for (let i = 0; i < text.length; i++) {
    if (text.charCodeAt(i) > 127) {
      return true;
    }
  }
  return false;
}

async function main() {
  console.log('🔄 Checking database stories for non-English content...');
  const stories = await prisma.story.findMany();
  let count = 0;

  for (const story of stories) {
    if (isNonEnglish(story.title) || isNonEnglish(story.summary)) {
      console.log(`Translating non-English story: "${story.title.slice(0, 40)}"`);
      const newTitle = isNonEnglish(story.title) ? await translateToEnglish(story.title) : story.title;
      const newSummary = isNonEnglish(story.summary) ? await translateToEnglish(story.summary) : story.summary;

      await prisma.story.update({
        where: { id: story.id },
        data: {
          title: newTitle,
          summary: newSummary
        }
      });
      count++;
    }
  }
  console.log(`✅ Completed translating ${count} stories to English.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
