import Redis from 'ioredis';

// Initialize Redis client outside of the handler to reuse connection
let redis;

if (process.env.REDIS_URL) {
  redis = new Redis(process.env.REDIS_URL, {
    // Retry strategy: retry 3 times, then fail
    retryStrategy: (times) => {
      if (times > 3) {
        return null;
      }
      return Math.min(times * 50, 2000);
    },
    // Don't crash on error
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

  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email, name } = request.body;

    if (!email) {
      return response.status(400).json({ error: 'Email is required' });
    }

    const timestamp = new Date().toISOString();
    const submission = { email, name: name || 'N/A', timestamp };

    // Log for debugging/fallback
    console.log(`[Waitlist Signup] ${JSON.stringify(submission)}`);

    // Try to save to Redis if available
    try {
      if (redis) {
        // Add to a list called 'waitlist' (serialize object to string)
        await redis.lpush('waitlist', JSON.stringify(submission));
        console.log('Saved to Redis');
      } else {
        console.warn('REDIS_URL not found, skipping Redis storage');
      }
    } catch (redisError) {
      console.error('Error saving to Redis:', redisError);
      // Don't fail the request if Redis fails, just log it
    }

    // Simulate network delay for better UX feel
    await new Promise(resolve => setTimeout(resolve, 500));

    return response.status(200).json({ 
      success: true, 
      message: 'Successfully joined waitlist',
      bonusPoints: 100 
    });
  } catch (error) {
    console.error('Waitlist API error:', error);
    return response.status(500).json({ error: 'Internal server error' });
  }
}
