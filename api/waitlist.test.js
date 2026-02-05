
import handler from './waitlist';

// Mock ioredis
const mockLpush = jest.fn();
const mockOn = jest.fn();

jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => ({
    lpush: mockLpush,
    on: mockOn,
  }));
});

describe('Waitlist API Handler', () => {
  let req, res;
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
    process.env.REDIS_URL = 'redis://fake-url';
    
    req = {
      method: 'POST',
      body: {
        email: 'test@example.com',
        name: 'Test User',
      },
    };
    
    res = {
      setHeader: jest.fn(),
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      end: jest.fn(),
    };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  test('returns 405 for non-POST requests', async () => {
    req.method = 'GET';
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(405);
    expect(res.json).toHaveBeenCalledWith({ error: 'Method not allowed' });
  });

  test('returns 400 if email is missing', async () => {
    req.body.email = '';
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Email is required' });
  });

  test('saves to Redis and returns 200 on success', async () => {
    mockLpush.mockResolvedValue(1); // Redis returns length of list
    
    // Re-import to trigger redis initialization with mocked process.env
    jest.isolateModules(async () => {
        const handlerIsolated = require('./waitlist').default;
        await handlerIsolated(req, res);
        
        expect(mockLpush).toHaveBeenCalledWith(
          'waitlist',
          expect.stringContaining('"email":"test@example.com"')
        );
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
          success: true,
          bonusPoints: 100
        }));
    });
  });

  test('handles Redis error gracefully (logs but succeeds)', async () => {
    mockLpush.mockRejectedValue(new Error('Redis Connection Error'));
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    
    // Re-import to ensure redis is initialized
    jest.isolateModules(async () => {
        const handlerIsolated = require('./waitlist').default;
        await handlerIsolated(req, res);
        
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
        expect(consoleSpy).toHaveBeenCalled();
        
        consoleSpy.mockRestore();
    });
  });
});
