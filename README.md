# 🍊 The Daily Donald — Live Trump News Aggregator

A serverless news aggregator that fetches Trump-related news from 12+ RSS sources and displays them with a rage/chaos level system.

## Features

- 📡 **12+ RSS Sources**: Google News, Guardian, NPR, Politico, BBC, Reuters, NY Times, Washington Post, CBS, ABC, The Hill, Axios
- 🔄 **Auto-refresh**: Updates every 60 seconds
- 🌡️ **Rage Meter**: Each story gets a rage level (1-5) based on keyword analysis
- 📊 **Polymarket Odds**: Live betting odds display
- 📢 **Truth Social Feed**: Latest Trump posts
- 🔍 **Search & Filter**: Filter by rage level, breaking news, or search terms

## Quick Deploy to Vercel (5 minutes)

### Step 1: Install Vercel CLI
```bash
npm install -g vercel
```

### Step 2: Deploy
```bash
cd daily-donald-app
npm install
vercel
```

Follow the prompts:
- Set up and deploy? **Yes**
- Which scope? **Your account**
- Link to existing project? **No**
- Project name? **daily-donald** (or whatever you want)
- Directory? **./**
- Override settings? **No**

### Step 3: Done! 🎉
Your site is now live at `https://daily-donald-xxx.vercel.app`

## Local Development

```bash
npm install
vercel dev
```

Open http://localhost:3000

## Project Structure

```
daily-donald-app/
├── api/
│   └── news.js          # Serverless API endpoint
├── public/
│   └── index.html       # Frontend
├── package.json
├── vercel.json          # Vercel configuration
└── README.md
```

## API Endpoints

### GET /api/news

Fetches aggregated news from all RSS sources.

**Query Parameters:**
- `page` (default: 1) - Page number
- `limit` (default: 20) - Items per page
- `filter` - Filter type: `all`, `breaking`, `4`, `5`
- `search` - Search term

**Response:**
```json
{
  "success": true,
  "data": {
    "news": [...],
    "pagination": { "page": 1, "limit": 20, "total": 100, "totalPages": 5 },
    "stats": { "totalNews": 100, "avgRageLevel": 3.5, "breakingCount": 5 },
    "feeds": [{ "name": "Google News", "status": "ok", "count": 15 }],
    "lastUpdated": "2026-01-20T12:00:00Z"
  }
}
```

## Customization

### Add More RSS Feeds

Edit `api/news.js` and add to the `RSS_FEEDS` array:

```javascript
const RSS_FEEDS = [
  { name: 'Your Feed', url: 'https://example.com/rss' },
  // ... existing feeds
];
```

### Adjust Rage Keywords

Edit the `RAGE_KEYWORDS` object in `api/news.js`:

```javascript
const RAGE_KEYWORDS = {
  5: ['your', 'extreme', 'keywords'],
  4: ['medium', 'intensity'],
  // ...
};
```

## Environment Variables (Optional)

You can add these in Vercel Dashboard → Settings → Environment Variables:

- `NEWS_API_KEY` - If you want to add NewsAPI.io for even more sources

## Troubleshooting

### CORS Errors
The API automatically adds CORS headers. If you're having issues, check that you're using the correct API path.

### RSS Feed Timeouts
Some feeds may be slow or unavailable. The API has a 10-second timeout per feed and continues with available sources.

### Rate Limiting
Vercel's free tier has generous limits (100GB bandwidth, 100k function invocations/month). For heavy traffic, consider upgrading.

## License

MIT — Do whatever you want with it! 🍊

---

Made with 🧡 and chaos
