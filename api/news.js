const Parser = require('rss-parser');

const parser = new Parser({
  timeout: 10000,
  headers: {
    'User-Agent': 'Mozilla/5.0 (compatible; DailyDonald/1.0)'
  }
});

// RSS Feed sources
const RSS_FEEDS = [
  { name: 'Google News', url: 'https://news.google.com/rss/search?q=trump&hl=en-US&gl=US&ceid=US:en' },
  { name: 'The Guardian', url: 'https://www.theguardian.com/us-news/donaldtrump/rss' },
  { name: 'NPR Politics', url: 'https://feeds.npr.org/1014/rss.xml' },
  { name: 'Politico', url: 'https://rss.politico.com/politics-news.xml' },
  { name: 'BBC News', url: 'https://feeds.bbci.co.uk/news/world/us_and_canada/rss.xml' },
  { name: 'Reuters', url: 'https://www.reutersagency.com/feed/?taxonomy=best-topics&post_type=best' },
  { name: 'NY Times', url: 'https://rss.nytimes.com/services/xml/rss/nyt/Politics.xml' },
  { name: 'Washington Post', url: 'https://feeds.washingtonpost.com/rss/politics' },
  { name: 'CBS News', url: 'https://www.cbsnews.com/latest/rss/politics' },
  { name: 'ABC News', url: 'https://abcnews.go.com/abcnews/politicsheadlines' },
  { name: 'The Hill', url: 'https://thehill.com/feed/' },
  { name: 'Axios', url: 'https://api.axios.com/feed/politics/' },
];

// Keywords for rage level detection
const RAGE_KEYWORDS = {
  5: ['insurrection', 'impeach', '25th amendment', 'unhinged', 'unstable', 'crazy', 'bonkers', 
      'invasion', 'military action', 'locked and loaded', 'rot in hell', 'threat', 'attack',
      'chaos', 'crisis', 'emergency', 'unprecedented', 'shocking', 'explosive', 'furious'],
  4: ['tariff', 'slam', 'rage', 'demands', 'threatens', 'blast', 'rips', 'greenland', 
      'conflict', 'dispute', 'clash', 'warns', 'escalat', 'tensions', 'controversial'],
  3: ['claims', 'false', 'lie', 'misleading', 'controversial', 'dispute', 'criticism',
      'questions', 'concerns', 'debate'],
  2: ['says', 'announces', 'plans', 'considers', 'proposes', 'suggests'],
  1: ['meets', 'visits', 'speaks', 'signs', 'travels']
};

// Calculate rage level from text
function calculateRageLevel(title, description) {
  const text = `${title} ${description}`.toLowerCase();
  const originalText = `${title} ${description}`;
  
  // Check keywords (highest priority)
  for (let level = 5; level >= 1; level--) {
    if (RAGE_KEYWORDS[level].some(keyword => text.includes(keyword))) {
      return level;
    }
  }
  
  // Fallback: Analyze tone and style
  let score = 2; // Base score: ANNOYED
  
  // ALL CAPS words (shouting) - check original text
  const capsWords = originalText.match(/\b[A-Z]{3,}\b/g) || [];
  if (capsWords.length >= 3) score += 2;
  else if (capsWords.length >= 1) score += 1;
  
  // Exclamation marks (intensity)
  const exclamations = (originalText.match(/!/g) || []).length;
  if (exclamations >= 3) score += 2;
  else if (exclamations >= 1) score += 1;
  
  // Question marks in headlines often indicate controversy
  if (title.includes('?')) score += 1;
  
  // Negative/intense words not in main list
  const intenseWords = ['outrage', 'scandal', 'bombshell', 'shocking', 'stunned', 
    'slams', 'rips', 'destroys', 'blasts', 'fires back', 'doubles down',
    'defiant', 'refuses', 'denies', 'accuses', 'meltdown', 'tirade', 'rant'];
  if (intenseWords.some(word => text.includes(word))) score += 1;
  
  // Source-based adjustment (tabloid/opinion sources tend to be more dramatic)
  const dramaticSources = ['daily beast', 'daily mail', 'ny post', 'breitbart', 'huffpost'];
  if (dramaticSources.some(source => text.includes(source))) score += 1;
  
  // Quotes often indicate drama
  if (title.includes('"') || title.includes("'")) score += 1;
  
  // Cap at 5
  return Math.min(5, Math.max(1, score));
}

// Check if news is Trump-related
function isTrumpRelated(title, description) {
  const text = `${title} ${description}`.toLowerCase();
  const keywords = ['trump', 'donald', 'president', 'white house', 'oval office', 
                    'maga', 'mar-a-lago', 'truth social', 'greenland', 'tariff'];
  return keywords.some(kw => text.includes(kw));
}

// Extract image from item
function extractImage(item) {
  // Try various common RSS image fields
  if (item.enclosure?.url) return item.enclosure.url;
  if (item['media:content']?.$.url) return item['media:content'].$.url;
  if (item['media:thumbnail']?.$.url) return item['media:thumbnail'].$.url;
  
  // Try to extract from content
  const content = item.content || item['content:encoded'] || '';
  const imgMatch = content.match(/<img[^>]+src="([^">]+)"/);
  if (imgMatch) return imgMatch[1];
  
  return null;
}

// Clean HTML from text
function cleanHtml(text) {
  if (!text) return '';
  return text
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim()
    .substring(0, 300);
}

// In-memory cache (will reset on cold starts, but that's fine)
let newsCache = {
  items: [],
  lastUpdated: null
};

// Fetch all feeds
async function fetchAllFeeds() {
  const allNews = [];
  const feedResults = [];
  
  const fetchPromises = RSS_FEEDS.map(async (feed) => {
    try {
      const result = await parser.parseURL(feed.url);
      let count = 0;
      
      for (const item of result.items || []) {
        const title = cleanHtml(item.title);
        const description = cleanHtml(item.contentSnippet || item.description || item.content);
        
        if (isTrumpRelated(title, description)) {
          const pubDate = item.pubDate ? new Date(item.pubDate) : new Date();
          const rageLevel = calculateRageLevel(title, description);
          const isBreaking = (Date.now() - pubDate.getTime()) < 3600000; // 1 hour
          
          allNews.push({
            id: Buffer.from(title).toString('base64').substring(0, 20),
            title,
            source: feed.name,
            excerpt: description.substring(0, 200),
            date: pubDate.toISOString(),
            rageLevel,
            breaking: isBreaking,
            link: item.link,
            image: extractImage(item)
          });
          count++;
        }
      }
      
      feedResults.push({ name: feed.name, status: 'ok', count });
    } catch (error) {
      console.error(`Error fetching ${feed.name}:`, error.message);
      feedResults.push({ name: feed.name, status: 'error', error: error.message });
    }
  });
  
  await Promise.allSettled(fetchPromises);
  
  // Deduplicate by title similarity
  const uniqueNews = [];
  const seenTitles = new Set();
  
  for (const item of allNews) {
    const normalizedTitle = item.title.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 50);
    if (!seenTitles.has(normalizedTitle)) {
      seenTitles.add(normalizedTitle);
      uniqueNews.push(item);
    }
  }
  
  // Sort by date
  uniqueNews.sort((a, b) => new Date(b.date) - new Date(a.date));
  
  return {
    news: uniqueNews,
    feeds: feedResults,
    totalCount: uniqueNews.length,
    updatedAt: new Date().toISOString()
  };
}

// Main handler
module.exports = async (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=120');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  try {
    // Check cache (refresh if older than 60 seconds)
    const cacheAge = newsCache.lastUpdated ? Date.now() - new Date(newsCache.lastUpdated).getTime() : Infinity;
    
    if (cacheAge > 60000 || newsCache.items.length === 0) {
      console.log('Fetching fresh news...');
      const result = await fetchAllFeeds();
      newsCache = {
        items: result.news,
        feeds: result.feeds,
        lastUpdated: result.updatedAt,
        totalCount: result.totalCount
      };
    }
    
    // Pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const filter = req.query.filter || 'all';
    const search = req.query.search || '';
    
    let filteredNews = [...newsCache.items];
    
    // Apply filters
    if (filter === 'breaking') {
      filteredNews = filteredNews.filter(n => n.breaking);
    } else if (filter === '5') {
      filteredNews = filteredNews.filter(n => n.rageLevel === 5);
    } else if (filter === '4') {
      filteredNews = filteredNews.filter(n => n.rageLevel >= 4);
    }
    
    // Apply search
    if (search) {
      const searchLower = search.toLowerCase();
      filteredNews = filteredNews.filter(n => 
        n.title.toLowerCase().includes(searchLower) || 
        n.excerpt.toLowerCase().includes(searchLower)
      );
    }
    
    // Paginate
    const start = (page - 1) * limit;
    const paginatedNews = filteredNews.slice(start, start + limit);
    
    // Calculate stats
    const avgRage = filteredNews.length > 0 
      ? (filteredNews.slice(0, 20).reduce((sum, n) => sum + n.rageLevel, 0) / Math.min(filteredNews.length, 20)).toFixed(1)
      : 0;
    
    res.status(200).json({
      success: true,
      data: {
        news: paginatedNews,
        pagination: {
          page,
          limit,
          total: filteredNews.length,
          totalPages: Math.ceil(filteredNews.length / limit)
        },
        stats: {
          totalNews: newsCache.totalCount,
          filteredCount: filteredNews.length,
          avgRageLevel: parseFloat(avgRage),
          breakingCount: newsCache.items.filter(n => n.breaking).length
        },
        feeds: newsCache.feeds,
        lastUpdated: newsCache.lastUpdated
      }
    });
    
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
