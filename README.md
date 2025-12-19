# Sukta - Web Intelligence Platform

A full-stack chatbot application that allows users to ask questions about any website using AI. Built with Next.js, Express, BullMQ, Drizzle ORM, and PostgreSQL.

## Features

- 🌐 Submit any website URL to analyze
- 🤖 AI-powered answers using OpenRouter (GPT-3.5 Turbo)
- 💬 Chat-style interface - scrape once, ask unlimited questions
- 📊 Real-time status updates
- 🔄 Background job processing with BullMQ
- 💾 PostgreSQL database with Drizzle ORM
- 🎨 Modern dark UI with Next.js and Tailwind CSS
- 📱 Mobile responsive design
- 📝 Markdown rendering for AI responses

## Tech Stack

- **Frontend**: Next.js 15, React, TanStack Query, Tailwind CSS, React Markdown
- **Backend**: Express, BullMQ, Redis
- **Database**: PostgreSQL (Neon), Drizzle ORM
- **Scraping**: Playwright (dynamic content) / Cheerio (static)
- **AI**: OpenRouter API (configurable model)

## Prerequisites

- [Bun](https://bun.sh) (latest version)
- PostgreSQL database ([Neon](https://neon.tech) recommended - free tier)
- Redis server
- [OpenRouter](https://openrouter.ai) API key (free tier available)

## Setup Instructions

### 1. Clone and Install

```bash
git clone <repo-url>
cd sukta
bun install
```

### 2. Environment Variables

Create a `.env` file in the root:

```env
DATABASE_URL='your_neon_postgres_url'
REDIS_HOST=localhost
REDIS_PORT=6379
OPENROUTER_API_KEY=your_openrouter_api_key
OPENROUTER_MODEL=openai/gpt-3.5-turbo
```

Get a free OpenRouter API key at: https://openrouter.ai/keys

### 3. Database Setup

```bash
cd packages/db
bun run generate  # Generate migrations
bun run migrate   # Apply migrations
```

### 4. Start Redis

```bash
redis-server
```

Or use Docker:
```bash
docker run -d -p 6379:6379 redis
```

### 5. Run the Application

Open 3 terminals:

**Terminal 1 - API Server:**
```bash
cd apps/api
bun run dev
```

**Terminal 2 - Worker:**
```bash
cd apps/api
bun run worker
```

**Terminal 3 - Frontend:**
```bash
cd apps/web
bun run dev
```

### 6. Access the App

Open http://localhost:3000 in your browser

## Project Structure

```
sukta/
├── apps/
│   ├── api/                    # Express backend
│   │   └── src/
│   │       ├── routes/         # API routes (session.ts)
│   │       └── worker/         # BullMQ workers, scraper, AI
│   └── web/                    # Next.js frontend
│       ├── app/                # App router pages
│       └── components/         # React components (ChatArea, Sidebar)
├── packages/
│   └── db/                     # Shared database package
│       ├── schema.ts           # Drizzle schema
│       ├── drizzle.config.ts   # Drizzle config
│       └── migrations/         # SQL migrations
└── .env                        # Environment variables
```

## How It Works

1. **User enters a URL** → Creates a session → Worker scrapes website content
2. **Scraping completes** → Content stored in database → Session marked as "ready"
3. **User asks questions** → AI processes using stored content (no re-scraping)
4. **Multiple questions** → All use the same scraped content for fast responses

## API Endpoints

- `POST /api/session` - Create a new session (starts scraping)
- `GET /api/session/:id` - Get session status
- `POST /api/session/:id/question` - Ask a question about the website
- `GET /api/session/:id/question/:qid` - Get question/answer status

## Development

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:4000 |
| Redis | localhost:6379 |

## License

MIT


## Docker Deployment

### Local Docker Setup

1. **Build and run with Docker Compose:**

```bash
# Copy environment file
cp .env.example .env
# Edit .env with your values

# Build and start all services
docker-compose up --build
```

2. **Access the app:**
   - Frontend: http://localhost:3000
   - API: http://localhost:4000

### Production Deployment Options

#### Option 1: Railway (Recommended - Easiest)

[Railway](https://railway.app) supports monorepos and provides free Redis.

1. Create a Railway account
2. Create a new project from GitHub repo
3. Add services:
   - **Redis**: Add from Railway's template
   - **API**: Point to `apps/api/Dockerfile`
   - **Worker**: Point to `apps/api/Dockerfile.worker`
   - **Web**: Point to `apps/web/Dockerfile`
4. Set environment variables in each service
5. Railway auto-deploys on git push

#### Option 2: Render

1. Create services on [Render](https://render.com):
   - **Redis**: Use Render's managed Redis
   - **Web Service** for API (Docker, `apps/api/Dockerfile`)
   - **Background Worker** for worker (Docker, `apps/api/Dockerfile.worker`)
   - **Web Service** for frontend (Docker, `apps/web/Dockerfile`)
2. Set environment variables
3. Connect to your GitHub repo

#### Option 3: DigitalOcean App Platform

1. Create app on [DigitalOcean](https://www.digitalocean.com/products/app-platform)
2. Add components from your repo
3. Add managed Redis database
4. Configure environment variables

#### Option 4: VPS with Docker (Full Control)

```bash
# On your VPS (Ubuntu)
# Install Docker
curl -fsSL https://get.docker.com | sh

# Clone repo
git clone <your-repo> && cd sukta

# Create .env file
cp .env.example .env
nano .env  # Add your values

# Run with docker-compose
docker-compose up -d

# Setup reverse proxy (nginx)
sudo apt install nginx
```

Example nginx config (`/etc/nginx/sites-available/sukta`):
```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location /api {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
    }
}
```

### Environment Variables for Production

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string (Neon) |
| `REDIS_HOST` | Redis host (`redis` for docker-compose) |
| `REDIS_PORT` | Redis port (default: 6379) |
| `OPENROUTER_API_KEY` | Your OpenRouter API key |
| `OPENROUTER_MODEL` | AI model (default: `openai/gpt-3.5-turbo`) |
| `NEXT_PUBLIC_API_URL` | Public API URL for frontend |

### Database

The app uses [Neon](https://neon.tech) PostgreSQL (free tier available). Your database is already hosted - just use the connection string in `DATABASE_URL`.

Run migrations before first deployment:
```bash
cd packages/db
bun run migrate
```
