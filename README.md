# AI-Powered Indian & Global News Aggregator

A production-ready, mobile-responsive fullstack news aggregation application with an AI-driven classification, summarization, dispute flagging, and personalized recommendation pipeline.

---

## 🌟 Key Features

1. **AI Processing Pipeline:** Uses Gemini to dynamically categorize, summarize (3-4 sentences), and extract core factual claims from ingested news clusters.
2. **Fact Check & Claim Corroboration:** Automatically groups articles on the same topic using text embeddings cosine similarity. Claims are marked as *Corroborated* (multiple sources), *Single-source* (unverified), or *Disputed* (conflicting publisher accounts).
3. **Story Lineage & Diffs:** For ongoing developing stories, the system maintains a vertical timeline of how the story progressed and generates a daily "What's Changed" summary diff.
4. **Regional Pulse:** Pre-integrated with major Indian RSS feeds (TOI, NDTV, The Hindu, PIB) with prominent dropdowns to filter by Indian State/City and Language.
5. **Tech & AI Deep Dives:** First-class vertical pulling directly from Hacker News, arXiv (`cs.AI`), and corporate research blogs (OpenAI, DeepMind, Anthropic).
6. **Interest-Decay Personalization:** Tracks user clicks on category tags and dynamically ranks their feed. Affinities decay exponentially (3-day half-life) to prevent engagement echo-chambers and introduce content freshness.
7. **No Login Wall:** Completely open browsing experience utilizing client-generated browser device tokens for personalization telemetry.

---

## ⚙️ Tech Stack

- **Frontend:** Next.js 15 (React 19, Tailwind CSS v4, TypeScript, App Router)
- **Backend:** Node.js Express (TypeScript, Node-cron, SQLite / PostgreSQL)
- **Database ORM:** Prisma ORM (defaults to SQLite `dev.db` for local ease-of-run)
- **Caching:** Redis Client (with NodeCache in-memory fallback for local development)
- **AI Model:** Google Gemini (`text-embedding-004` & `gemini-1.5-flash`)

---

## 🚀 Getting Started

### Prerequisites
- Node.js >= v20
- npm >= v10

### ⚙️ Quick Start (From Root Workspace Directory)
You can build and run both the frontend and backend servers together directly from the root workspace directory:

1. **Copy Env Template & Fill Keys:**
   ```bash
   cp backend/.env.example backend/.env
   ```
   Open `backend/.env` and add your `GEMINI_API_KEY`, `NEWS_API_KEY`, and `CURRENTS_API_KEY`.
2. **Install All Sub-Project Dependencies:**
   ```bash
   npm run install:all
   ```
3. **Push Prisma DB Tables locally (SQLite dev.db):**
   ```bash
   npm run db:push
   ```
4. **Start Dev Servers (Runs Backend & Frontend in parallel):**
   ```bash
   npm run dev
   ```
   Open `http://localhost:3000` in your web browser.

---

### 📂 Manual Sub-Project Commands (Alternative)

If you prefer to run or build components separately:

#### 1. Backend Setup
```bash
cd backend
npm install
npx prisma db push
npm run dev
```

#### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

---

## 🛠️ Developer Administration Guide

### How to Swap/Add News API Keys
All keys are managed via the backend `.env` file. To change keys, edit these values and restart the backend server:
```env
GEMINI_API_KEY=your_new_gemini_key
NEWS_API_KEY=your_new_newsapi_org_key
CURRENTS_API_KEY=your_new_currents_key
```

### How to Add New RSS Sources
RSS feeds are configured in [ingestion.ts](file:///c:/ai-news/backend/src/services/ingestion.ts) under the `RSS_SOURCES` array. To add a new source (e.g. a local language regional paper or sub-niche blog), simply append a new object to the list:
```typescript
{
  name: 'Hindustan Times - Mumbai',
  url: 'https://www.hindustantimes.com/feeds/rss/mumbai-news/rssfeed.xml',
  sourceUrl: 'https://www.hindustantimes.com',
  category: 'Local + Regional Pulse', // Tags as regional news
  type: 'Mainstream',
}
```
The ingestion cron job will pick this up automatically in the next refresh cycle.

### Trigger Ingestion Manually
To test ingestion or clustering immediately without waiting for the 24h cron cycle (runs daily at 6:00 AM IST / 00:30 UTC), execute a POST request to:
`http://localhost:5000/api/admin/ingest`
- Include header: `x-admin-secret` matching `ADMIN_SECRET` in your backend `.env` (default is `super_secret_admin_token_123`).

---

## 🧠 AI Layer Details & Prompt Structures

The pipeline triggers are located in [ai-pipeline.ts](file:///c:/ai-news/backend/src/services/ai-pipeline.ts).

### 1. In-Memory Centroid Clustering
For performance portability (without relying on specialized PGVector extensions locally), clustering is calculated in-memory during daily ingestion runs using Cosine Similarity on embeddings produced by `text-embedding-004`. The algorithm operates at an $O(N \cdot K)$ complexity, where $N$ represents unclustered articles and $K$ represents active centroids.

### 2. Story Annotation & Claims Check
For each clustered story group, we query `gemini-1.5-flash` with a JSON-mode schema prompt to enforce neutral writing, extract primary and secondary categories, and cross-examine facts:
```
You are a professional fact-checker and editor. Analyze the following articles that have been clustered together as talking about the same news event.
Your tasks are:
1. Provide a neutral, objective title summarizing the story.
2. Provide a clean, neutral 3-4 sentence summary of the story. Do NOT copy full text.
3. Classify this story into a Primary Category and optionally a Secondary Category from this strict list: [...]
4. Extract key factual claims. Check which source articles support it. If supported by more than 1 article, status is "CORROBORATED". If supported by 1 article, status is "SINGLE_SOURCE".
5. Identify any contradictory or disputed claims between different sources (e.g. different death tolls, conflicting timelines). List them in "disputedClaims".
6. Assign a "credibilityScore" ("VERIFIED", "UNVERIFIED", or "DISPUTED").
```

### 3. Story Diffing Prompt
For developing updates matching past clusters within 72 hours, `gemini-1.5-flash` is queried to extract "What's changed" since the last timeline entry:
```
You are a news editor updating an ongoing developing story.
Existing Story Title: {story_title}
Existing Story Summary: {story_summary}
We have received new reports today: {new_articles}
Your tasks are:
1. Write a short 1-2 sentence update ("What's changed since yesterday") summarizing the key development.
2. Provide a single headline for this new timeline event.
3. Provide a brief 1-2 sentence description for this timeline event.
```

---

## 🚢 Deployment & Production Setup

This project is set up with multi-stage Docker configurations, dynamic database switching, and environment validation.

### 1. Dynamic Database Provider Switching (SQLite vs PostgreSQL)
The project automatically configures the Prisma database provider based on the `DB_PROVIDER` environment variable during builds or migrations.
- **SQLite (Default)**: Set `DB_PROVIDER=sqlite` and `DATABASE_URL="file:./dev.db"`.
- **PostgreSQL**: Set `DB_PROVIDER=postgresql` and `DATABASE_URL="postgresql://username:password@hostname:5432/dbname"`.

The build pipelines run the `prepare-db.js` helper script internally to switch the schema dynamically before generating Prisma client models.

---

### 2. Containerized Deployment (Docker Compose)
You can deploy both frontend and backend services simultaneously using Docker Compose:

1. **Configure Environment Variables**:
   Create a `.env` in the root workspace (or configure your hosting provider dashboard):
   ```env
   # Database & Secrets
   DB_PROVIDER=sqlite
   DATABASE_URL=file:./dev.db
   ADMIN_SECRET=your_production_secret

   # AI & Ingestion Keys
   GEMINI_API_KEY=your_gemini_api_key
   NEWS_API_KEY=your_newsapi_key
   CURRENTS_API_KEY=your_currents_key

   # API Routing
   NEXT_PUBLIC_API_URL=http://your-server-ip-or-domain:5000/api
   ```

2. **Build and Run Containers**:
   ```bash
   docker compose build --build-arg NEXT_PUBLIC_API_URL=http://your-server-ip-or-domain:5000/api
   docker compose up -d
   ```

The backend container will automatically run database sync (`prisma db push`) at startup.

---

### 3. Cloud Deployment (Render & Vercel)

We recommend deploying the backend Express API & PostgreSQL database to **Render**, and the frontend Next.js application to **Vercel**.

#### 🅰️ Backend & PostgreSQL Database (Render Blueprint)
We have configured a [`render.yaml`](file:///c:/ai-news/render.yaml) Blueprint. To deploy the backend infrastructure:

1. Push your repository to **GitHub** or **GitLab**.
2. Go to the **[Render Dashboard](https://dashboard.render.com)**.
3. Click **New +** and select **Blueprint**.
4. Connect your repository. Render will automatically detect the `render.yaml` configuration.
5. In the configuration page, fill in the required environment variables:
   - `GEMINI_API_KEY`: Your Google Gemini API Key.
   - `NEWS_API_KEY`: Your NewsAPI.org API Key.
   - `CURRENTS_API_KEY`: Your Currents API Key.
6. Click **Approve**. Render will provision:
   - A managed PostgreSQL instance (`ai-news-db`).
   - A Node Docker container running the Express API (`ai-news-backend`).
   - Database tables automatically synchronized on container boot via `prisma db push`.

#### 🅱️ Frontend Next.js App (Vercel)
Deploying the frontend Next.js app to Vercel is extremely straightforward:

1. Go to the **[Vercel Dashboard](https://vercel.com)**.
2. Click **Add New** and select **Project**.
3. Import your Git repository.
4. On the configuration screen:
   - Set **Framework Preset**: `Next.js`.
   - Set **Root Directory**: `frontend` (Important: do not deploy from the workspace root).
   - In the **Environment Variables** section, add:
     - `NEXT_PUBLIC_API_URL`: The URL of your deployed Render backend (e.g. `https://ai-news-backend.onrender.com/api`).
5. Click **Deploy**. Vercel will build, optimize, and serve your frontend.

> [!TIP]
> **Cron Scheduler in Serverless/Free Tiers**:
> If deploying the backend to serverless functions or container environments that sleep when idle (like Render free tier), the in-memory `node-cron` schedule will not trigger consistently.
> To ensure the 24h news refresh runs reliably, set up an external HTTP cron trigger (e.g. using Vercel Cron, GitHub Actions schedules, or Cron-Job.org) targeting:
> `POST https://your-backend-domain.com/api/admin/ingest` with the header `x-admin-secret` matching your configured `ADMIN_SECRET`.
