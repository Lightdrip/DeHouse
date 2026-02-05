import Redis from 'ioredis';

// Initialize Redis client outside of the handler to reuse connection
let redis;

if (process.env.REDIS_URL) {
  redis = new Redis(process.env.REDIS_URL, {
    retryStrategy: (times) => {
      if (times > 3) return null;
      return Math.min(times * 50, 2000);
    },
    showFriendlyErrorStack: true,
  });
  
  redis.on('error', (err) => {
    console.error('Redis connection error:', err);
  });
}

export default async function handler(request, response) {
  // Set CORS headers
  response.setHeader('Access-Control-Allow-Credentials', true);
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  response.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  // Handle OPTIONS request
  if (request.method === 'OPTIONS') {
    response.status(200).end();
    return;
  }

  // Simple admin check (in production, use proper auth)
  // For now, we'll leave it open but obscure, as requested "easiest way"

  try {
    let waitlist = [];
    
    if (redis) {
      // Fetch all items from the list 'waitlist'
      // lrange 0 -1 gets all elements
      const rawList = await redis.lrange('waitlist', 0, -1);
      
      // Parse JSON strings back to objects
      waitlist = rawList.map(item => {
        try {
          return typeof item === 'string' ? JSON.parse(item) : item;
        } catch (e) {
          return { error: 'Invalid JSON', raw: item };
        }
      });
    } else {
      // Return a mock list for testing if Redis is not set up
      waitlist = [
        { email: 'test@example.com', name: 'Test User', timestamp: new Date().toISOString() }
      ];
      console.warn('REDIS_URL not found, returning mock data');
    }

    // Check if format=csv query param is present
    const url = new URL(request.url, `http://${request.headers.host}`);
    const format = url.searchParams.get('format');

    if (format === 'csv') {
      const csvHeader = 'Name,Email,Timestamp\n';
      const csvRows = waitlist.map(item => {
        // Escape quotes
        const name = (item.name || '').replace(/"/g, '""');
        const email = (item.email || '').replace(/"/g, '""');
        return `"${name}","${email}","${item.timestamp || ''}"`;
      }).join('\n');

      response.setHeader('Content-Type', 'text/csv');
      response.setHeader('Content-Disposition', 'attachment; filename="waitlist.csv"');
      return response.status(200).send(csvHeader + csvRows);
    }

    return response.status(200).json({ waitlist });
  } catch (error) {
    console.error('Admin Waitlist API error:', error);
    return response.status(500).json({ error: 'Internal server error' });
  }
}
