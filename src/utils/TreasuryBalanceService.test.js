import { TreasuryBalanceService } from './TreasuryBalanceService';

// Mock fetch
global.fetch = jest.fn();

// Mock Solana libraries
jest.mock('@solana/web3.js', () => ({
  Connection: jest.fn().mockImplementation(() => ({
    getBalance: jest.fn().mockResolvedValue(1000000000), // 1 SOL
    getParsedTokenAccountsByOwner: jest.fn().mockResolvedValue({ value: [] })
  })),
  PublicKey: jest.fn().mockImplementation(() => ({}))
}));

jest.mock('@solana/spl-token', () => ({
  TOKEN_PROGRAM_ID: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'
}));

describe('TreasuryBalanceService', () => {
  let service;

  beforeEach(() => {
    // Clear mocks and storage
    fetch.mockClear();
    localStorage.clear();
    
    // Create new instance for each test
    service = new TreasuryBalanceService();
  });

  afterEach(() => {
    // Cleanup
  });

  describe('fetchPrices', () => {
    it('should fetch prices successfully from CoinGecko', async () => {
      const mockPrices = {
        bitcoin: { usd: 50000 },
        ethereum: { usd: 3000 },
        solana: { usd: 100 }
      };

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockPrices
      });

      const prices = await service.fetchPrices();

      expect(prices.btc).toBe(50000);
      expect(prices.eth).toBe(3000);
      expect(prices.sol).toBe(100);
      expect(fetch).toHaveBeenCalledWith(expect.stringContaining('coingecko.com'), expect.any(Object));
    });

    it('should handle API errors and return cached prices if available', async () => {
      // Setup cached prices
      service.prices = { btc: 40000, eth: 2000, sol: 50 };

      fetch.mockResolvedValueOnce({
        ok: false,
        status: 429
      });

      const prices = await service.fetchPrices();

      expect(prices.btc).toBe(40000);
      expect(prices.eth).toBe(2000);
      expect(prices.sol).toBe(50);
    });
  });

  describe('fetchBitcoinBalance', () => {
    it('should fetch balance from Blockstream API', async () => {
      const mockResponse = {
        chain_stats: {
          funded_txo_sum: 200000000,
          spent_txo_sum: 100000000
        }
      };

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const balance = await service.fetchBitcoinBalance('test-address');

      expect(balance).toBe(100000000); // 1 BTC in sats
      expect(fetch).toHaveBeenCalledWith(expect.stringContaining('blockstream.info'));
    });

    it('should fallback to Blockchain.info if Blockstream fails', async () => {
      // First call fails
      fetch.mockRejectedValueOnce(new Error('Network error'));

      // Second call succeeds
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          'test-address': { final_balance: 50000000 }
        })
      });

      const balance = await service.fetchBitcoinBalance('test-address');

      expect(balance).toBe(50000000);
      expect(fetch).toHaveBeenCalledTimes(2);
      expect(fetch).toHaveBeenCalledWith(expect.stringContaining('blockchain.info'));
    });
  });

  describe('fetchEthereumBalance', () => {
    it('should fetch balance from Etherscan API', async () => {
      const mockResponse = {
        status: '1',
        result: '1000000000000000000' // 1 ETH in Wei
      };

      // Mock Etherscan balance response
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      // Mock Etherscan token response
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: '1', result: '1000000' }) // 1 USDC
      });

      const balance = await service.fetchEthereumBalance();

      expect(balance).toBe(1);
      expect(service.balances.eth).toBe(1);
    });

    it('should fallback to Alchemy if Etherscan fails', async () => {
      // Etherscan fails
      fetch.mockRejectedValueOnce(new Error('Network error'));

      // Alchemy succeeds
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ result: '0xde0b6b3a7640000' }) // 1 ETH in hex
      });

      const balance = await service.fetchEthereumBalance();

      expect(balance).toBe(1);
      expect(fetch).toHaveBeenCalledWith(expect.stringContaining('alchemy.com'), expect.any(Object));
    });
  });

  describe('fetchSolanaBalance', () => {
    it('should handle successful RPC response', async () => {
      // Mock the method that uses dynamic imports to avoid Jest issues
      service.fetchAllTokenBalancesFromRPC = jest.fn().mockResolvedValue({ solBalance: null, tokens: [] });

      // Mock fetch to return appropriate structure based on URL
      fetch.mockImplementation((url) => {
        if (typeof url !== 'string') return Promise.resolve({ ok: false });
        
        // Default RPC response
        if (url.includes('solana') || url.includes('rpc') || url.includes('alchemy') || url.includes('quicknode') || url.includes('genesysgo')) {
          return Promise.resolve({ 
            ok: true, 
            json: async () => ({ result: { value: 1000000000 } }) // 1 SOL
          });
        }
        
        // Shyft
        if (url.includes('shyft')) {
          if (url.includes('all_tokens')) {
            return Promise.resolve({ 
              ok: true, 
              json: async () => ({ result: [] }) 
            });
          }
          return Promise.resolve({ 
            ok: true, 
            json: async () => ({ result: { balance: 1 } }) 
          });
        }
        
        // Solscan
        if (url.includes('solscan')) {
          return Promise.resolve({ 
            ok: true, 
            json: async () => ({ lamports: 1000000000 }) 
          });
        }
        
        // Solflare
        if (url.includes('solflare')) {
          return Promise.resolve({ 
            ok: true, 
            json: async () => ({ balance: 1 }) 
          });
        }
        
        // Solana.fm
        if (url.includes('solana.fm')) {
          return Promise.resolve({ 
            ok: true, 
            json: async () => ({ result: [] }) 
          });
        }

        // Default failure for others
        return Promise.resolve({ ok: false, status: 404 });
      });

      const balance = await service.fetchSolanaBalance();

      // Since we mock all calls returning 1 SOL, the median should be 1
      expect(balance).toBe(1);
      expect(service.balances.sol).toBe(1);
    }, 10000); // Increase timeout to 10s

    it('should calculate statistical median from multiple sources', async () => {
      // Mock the method that uses dynamic imports to avoid Jest issues
      service.fetchAllTokenBalancesFromRPC = jest.fn().mockResolvedValue({ solBalance: null, tokens: [] });

      // Reset default mock
      fetch.mockReset();

      // We need to carefully mock the parallel calls in fetchSolanaBalance
      // The order is: RPCs (10), Shyft, Solscan, Solflare, ShyftAllTokens, SolanaFm, RPC fallback
      
      // We'll just mock fetch to return different values based on URL
      fetch.mockImplementation((url) => {
        if (typeof url !== 'string') return Promise.resolve({ ok: false });
        
        if (url.includes('solana') || url.includes('rpc')) return Promise.resolve({ ok: true, json: async () => ({ result: { value: 1000000000 } }) }); // 1 SOL
        if (url.includes('shyft.to') && !url.includes('all_tokens')) return Promise.resolve({ ok: true, json: async () => ({ result: { balance: 1.1 } }) }); // 1.1 SOL
        if (url.includes('solscan.io')) return Promise.resolve({ ok: true, json: async () => ({ lamports: 1000000000 }) }); // 1 SOL
        if (url.includes('solflare.com')) return Promise.resolve({ ok: true, json: async () => ({ balance: 0.9 }) }); // 0.9 SOL
        
        return Promise.resolve({ ok: false });
      });

      const balance = await service.fetchSolanaBalance();

      // Expected values: 1, 1, 1.1, 0.9, ...
      // Median should be close to 1
      expect(balance).toBeCloseTo(1, 1);
    }, 10000);

    it('should filter out zero balances to avoid skewing the median', async () => {
      // Mock the method that uses dynamic imports to avoid Jest issues
      service.fetchAllTokenBalancesFromRPC = jest.fn().mockResolvedValue({ solBalance: null, tokens: [] });

      fetch.mockReset();

      // Mock some sources to return 0 and some to return the correct balance
      fetch.mockImplementation((url) => {
        if (typeof url !== 'string') return Promise.resolve({ ok: false });
        
        // Some RPCs return 0 (failed or address not found by that specific RPC)
        if (url.includes('solana') || url.includes('rpc')) {
          const endpoints = service.getSolanaRPCEndpoints();
          const index = endpoints.indexOf(url);
          // Make half of them return 0
          if (index % 2 === 0) {
            return Promise.resolve({ ok: true, json: async () => ({ result: { value: 0 } }) });
          }
          return Promise.resolve({ ok: true, json: async () => ({ result: { value: 113070042 } }) }); // 0.11307 SOL
        }
        
        // Other APIs return correct balance
        if (url.includes('shyft.to')) return Promise.resolve({ ok: true, json: async () => ({ result: { balance: 0.113070042 } }) });
        if (url.includes('solscan.io')) return Promise.resolve({ ok: true, json: async () => ({ lamports: 113070042 } ) });
        
        return Promise.resolve({ ok: false });
      });

      const balance = await service.fetchSolanaBalance();

      // The median should be 0.113070042, NOT 0 or something skewed by zeros
      expect(balance).toBe(0.113070042);
      expect(service.balances.sol).toBe(0.113070042);
    }, 10000);
  });

  describe('caching', () => {
    it('should save and load from cache', () => {
      service.balances = { btc: 1, eth: 10, sol: 100 };
      service.prices = { btc: 50000, eth: 3000, sol: 100 };
      service.lastUpdated = new Date();
      
      service.saveToCache();
      
      // Create new service instance
      const newService = new TreasuryBalanceService();
      const loaded = newService.loadFromCache();
      
      expect(loaded).toBe(true);
      expect(newService.balances.btc).toBe(1);
      expect(newService.balances.eth).toBe(10);
      expect(newService.balances.sol).toBe(100);
    });

    it('should expire cache after duration', () => {
      service.balances = { btc: 1, eth: 10, sol: 100 };
      service.lastUpdated = new Date(Date.now() - 6 * 60 * 1000); // 6 mins ago
      
      // Manually save stale data to localStorage
      const cacheData = {
        balances: service.balances,
        prices: service.prices,
        lastUpdated: service.lastUpdated,
        timestamp: service.lastUpdated.toISOString()
      };
      localStorage.setItem('treasuryBalanceData', JSON.stringify(cacheData));
      
      const newService = new TreasuryBalanceService();
      const loaded = newService.loadFromCache();
      
      expect(loaded).toBe(false);
    });
  });
});
