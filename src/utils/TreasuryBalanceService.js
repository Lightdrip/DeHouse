/**
 * Service for fetching treasury wallet balances and calculating total funds raised
 */

// Constants for treasury wallet addresses
const BTC_ADDRESSES = {
  legacy: '1Kr3GkJnBZeeQZZoiYjHoxhZjDsSby9d4p',
  taproot: 'bc1pl6sq6srs5vuczd7ard896cc57gg4h3mdnvjsg4zp5zs2rawqmtgsp4hh08',
  segwit: 'bc1qu7suxfua5x46e59e7a56vd8wuj3a8qj06qr42j'
};

const ETH_ADDRESS = '0x8262ab131e3f52315d700308152e166909ecfa47';
const SOL_ADDRESS = '2n8etcRuK49GUMXWi2QRtQ8YwS6nTDEUjfX7LcvKFyiV';

// API endpoints
const BLOCKSTREAM_API = 'https://blockstream.info/api';
const BLOCKCHAIN_INFO_API = 'https://blockchain.info';

// Ethereum APIs - multiple reliable sources
const ETHERSCAN_API = 'https://api.etherscan.io/api';
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY || 'NSZCD6S4TKVJ3WVF2K27DCCH41EV5NKBFY'; // Using a valid API key or env var
const BLOCKCHAIR_ETH_API = 'https://api.blockchair.com/ethereum';
const ETHPLORER_API = 'https://api.ethplorer.io';
const ALCHEMY_ETH_API = 'https://eth-mainnet.g.alchemy.com/v2';
const ALCHEMY_API_KEY = process.env.ALCHEMY_ETH_API_KEY || 'demo'; // Using demo key or env var

// Solana APIs - multiple reliable sources with fallbacks
const SOLANA_RPC_ENDPOINTS = [
  '/solana-rpc',                                   // Local proxy to bypass CORS
  'https://api.mainnet-beta.solana.com',           // Official Solana RPC
  `https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY || '97f12880-f1a4-4ed7-bb19-00e61b9de290'}`, // Helius
  `https://solana-mainnet.core.chainstack.com/${process.env.QUICKNODE_API_ID || '15319106-f1a1-4a5a-9c38-863bb1f2e247'}`, // QuickNode/Chainstack
  'https://solana-mainnet.rpc.extrnode.com',      // ExtrNode RPC
  'https://solana.api.chainstack.com/primary',    // Chainstack RPC
  'https://mainnet.solana-rpc.com',               // Community RPC
  'https://solana-api.projectserum.com',          // Project Serum RPC
  'https://ssc-dao.genesysgo.net',                // GenesysGo RPC
  'https://rpc.ankr.com/solana',                  // Ankr RPC
  'https://solana-mainnet.g.alchemy.com/v2/demo', // Alchemy RPC (demo)
  'https://solana.getblock.io/mainnet/',          // GetBlock RPC
  'https://solana.blockdaemon.com/rpc/v1'         // Blockdaemon RPC
];

// Third-party API services for Solana
const SOLSCAN_API = 'https://public-api.solscan.io';
const SOLFLARE_API = 'https://api.solflare.com';
const SHYFT_API = 'https://api.shyft.to/sol/v1';
const SHYFT_API_KEY = process.env.SHYFT_API_KEY || '';
const HELIUS_API_KEY = process.env.HELIUS_API_KEY || '97f12880-f1a4-4ed7-bb19-00e61b9de290';
const QUICKNODE_API_ID = process.env.QUICKNODE_API_ID || '';

const TRITON_API = 'https://triton.api.metaplex.com/';
// Using proxy to avoid CORS issues
const SOLANAFM_API = '/solana-fm-api';

const COINGECKO_API = 'https://api.coingecko.com/api/v3';
const IS_DEV = process.env.NODE_ENV === 'development';
const STORAGE_KEY_PREFIX = 'treasury_balance_';

export class TreasuryBalanceService {
  constructor() {
    this.prices = {
      btc: 0,
      eth: 0,
      sol: 0
    };
    this.balances = {
      btc: 0,
      eth: 0,
      sol: 0
    };

    // Add SPL tokens structure
    this.splTokens = [];

    this.lastUpdated = null;
    this.isFromCache = false;

    // Cache duration in milliseconds (5 minutes)
    this.cacheDuration = 5 * 60 * 1000;

    // API request timeout in milliseconds (30 seconds)
    this.requestTimeout = 30000;

    // Flag to track if a fetch is in progress
    this.isFetching = false;

    // Background refresh interval ID
    this.refreshIntervalId = null;

    // Pub-sub subscribers
    this.subscribers = new Set();

    // Load cached data if available
    this.loadFromCache();
    
    // Start silent background refresh (only if not in test environment)
    if (process.env.NODE_ENV !== 'test') {
      this.startBackgroundRefresh();
    }
  }

  /**
   * Start a silent background refresh of all balances every 5 minutes
   */
  async startBackgroundRefresh() {
    if (this.refreshIntervalId) {
      clearInterval(this.refreshIntervalId);
    }

    console.log('[TreasuryBalanceService] Starting background refresh cycle (5 min interval)');
    
    // Initial fetch
    try {
      await this.fetchAllBalances(true);
      console.log('[TreasuryBalanceService] Initial background refresh completed');
    } catch (error) {
      console.error('[TreasuryBalanceService] Initial background refresh failed:', error);
    }

    // Set up 5-minute interval
    this.refreshIntervalId = setInterval(async () => {
      console.log('[TreasuryBalanceService] Scheduled background refresh starting...');
      try {
        await this.fetchAllBalances(true);
        console.log('[TreasuryBalanceService] Scheduled background refresh completed');
      } catch (error) {
        console.error('[TreasuryBalanceService] Scheduled background refresh failed:', error);
      }
    }, 5 * 60 * 1000);
  }

  /**
   * Stop the background refresh cycle
   */
  stopBackgroundRefresh() {
    if (this.refreshIntervalId) {
      clearInterval(this.refreshIntervalId);
      this.refreshIntervalId = null;
      console.log('[TreasuryBalanceService] Background refresh stopped');
    }
  }

  // --- Helper Methods ---
  
  /**
   * Helper to wrap a fetch function with retry logic
   */
  async withRetry(fetchFn, name, maxRetries = 2, delay = 1000) {
    let lastError = null;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          console.log(`[TreasuryBalanceService] Retrying ${name} (attempt ${attempt}/${maxRetries})...`);
          await new Promise(resolve => setTimeout(resolve, delay * attempt));
        }
        return await fetchFn();
      } catch (error) {
        lastError = error;
        console.warn(`[TreasuryBalanceService] ${name} attempt ${attempt} failed:`, error.message);
      }
    }
    throw lastError;
  }

  // --- Address and Data Validation ---
  validateAddress(address) {
    if (!address || typeof address !== 'string') return false;
    // Basic Solana address validation (base58, 32-44 chars)
    return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address);
  }

  validateBalance(balance) {
    return typeof balance === 'number' && isFinite(balance) && balance >= 0;
  }

  getStorageKey(address = SOL_ADDRESS) {
    return `${STORAGE_KEY_PREFIX}${address}`;
  }

  // Load data from localStorage cache
  loadFromCache() {
    try {
      // First, load global data (SOL address based)
      const solStorageKey = this.getStorageKey(SOL_ADDRESS);
      const solCachedData = localStorage.getItem(solStorageKey);
      
      if (solCachedData) {
        const parsedData = JSON.parse(solCachedData);
        if (parsedData.balances && parsedData.prices) {
          this.balances = { ...this.balances, ...parsedData.balances };
          this.prices = { ...this.prices, ...parsedData.prices };
          this.lastUpdated = new Date(parsedData.lastUpdated || parsedData.timestamp);
          this.isFromCache = true;
          if (parsedData.splTokens) this.splTokens = parsedData.splTokens;
          console.log(`Global cache loaded for ${SOL_ADDRESS}`);
        }
      }

      // Special check for ETH balance cache if it's missing or zero in global cache
      if (this.balances.eth === 0) {
        const ethStorageKey = this.getStorageKey(ETH_ADDRESS);
        const ethCachedData = localStorage.getItem(ethStorageKey);
        if (ethCachedData) {
          const parsedEthData = JSON.parse(ethCachedData);
          if (parsedEthData.balance > 0) {
            this.balances.eth = parsedEthData.balance;
            console.log(`Specific ETH cache found and loaded: ${this.balances.eth}`);
          }
        }
      }

      this.notifySubscribers();
      return true;
    } catch (error) {
      console.error('Error loading from cache:', error);
    }
    return false;
  }

  // Save data to localStorage cache
  saveToCache() {
    try {
      // Save global cache (SOL address based)
      const solCacheData = {
        balances: this.balances,
        prices: this.prices,
        splTokens: this.splTokens,
        lastUpdated: this.lastUpdated || new Date(),
        timestamp: new Date().toISOString(),
        address: SOL_ADDRESS
      };
      localStorage.setItem(this.getStorageKey(SOL_ADDRESS), JSON.stringify(solCacheData));

      // Also save a specific entry for ETH balance as a fallback
      if (this.balances.eth > 0) {
        const ethCacheData = {
          balance: this.balances.eth,
          timestamp: new Date().toISOString(),
          address: ETH_ADDRESS
        };
        localStorage.setItem(this.getStorageKey(ETH_ADDRESS), JSON.stringify(ethCacheData));
      }

      this.isFromCache = false;
      console.log('Data saved to cache');
      this.notifySubscribers();
    } catch (error) {
      console.error('Error saving to cache:', error);
    }
  }

  /**
   * Clear all outdated cache entries
   */
  clearOutdatedCache() {
    try {
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(STORAGE_KEY_PREFIX)) {
          try {
            const data = JSON.parse(localStorage.getItem(key));
            const timestamp = new Date(data.timestamp);
            const age = new Date() - timestamp;
            // Remove entries older than 24 hours
            if (age > 24 * 60 * 60 * 1000) {
              keysToRemove.push(key);
            }
          } catch (e) {
            // If data is corrupted, mark for removal
            keysToRemove.push(key);
          }
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));
      console.log(`Cleared ${keysToRemove.length} outdated cache entries`);
    } catch (error) {
      console.error('Error clearing outdated cache:', error);
    }
  }

  // Check if cache is valid
  isCacheValid() {
    try {
      const storageKey = this.getStorageKey();
      const cachedData = localStorage.getItem(storageKey);
      if (!cachedData) return false;

      const parsedData = JSON.parse(cachedData);
      const cacheTimestamp = new Date(parsedData.timestamp);
      const now = new Date();
      return (now - cacheTimestamp) < this.cacheDuration;
    } catch (error) {
      return false;
    }
  }

  // --- Pub-Sub Methods ---
  subscribe(callback) {
    this.subscribers.add(callback);
    console.log('Subscriber added. Total subscribers:', this.subscribers.size);
    // Immediately provide the latest data to the new subscriber
    callback(this.getBalances());
  }

  unsubscribe(callback) {
    this.subscribers.delete(callback);
    console.log('Subscriber removed. Total subscribers:', this.subscribers.size);
  }

  notifySubscribers() {
    const currentData = this.getBalances();
    console.log('Notifying subscribers with data:', currentData);
    this.subscribers.forEach(callback => {
      try {
        callback(currentData);
      } catch (error) {
        console.error('Error notifying a subscriber:', error);
      }
    });
  }

  // --- Balance Update Trigger ---
  triggerBalanceUpdate() {
    console.log('Balance update triggered externally.');
    // Force a refresh and then notify subscribers
    this.fetchAllBalances(true).then(() => {
      this.notifySubscribers();
    });
  }

  /**
   * Fetch current cryptocurrency prices from CoinGecko
   */
  async fetchPrices() {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.requestTimeout);

      const response = await fetch(
        `${COINGECKO_API}/simple/price?ids=bitcoin,ethereum,solana&vs_currencies=usd`,
        {
          signal: controller.signal,
          headers: {
            'Accept': 'application/json',
            'Cache-Control': 'no-cache'
          }
        }
      );

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`CoinGecko API error: ${response.status}`);
      }

      const data = await response.json();

      // Validate the data structure
      if (!data.bitcoin?.usd || !data.ethereum?.usd || !data.solana?.usd) {
        throw new Error('Invalid price data structure from CoinGecko');
      }

      this.prices = {
        btc: parseFloat(data.bitcoin.usd) || 0,
        eth: parseFloat(data.ethereum.usd) || 0,
        sol: parseFloat(data.solana.usd) || 0
      };

      // Validate the prices are reasonable
      if (Object.values(this.prices).some(price => price <= 0 || !isFinite(price))) {
        throw new Error('Invalid price values received from CoinGecko');
      }

      console.log('Fetched prices:', this.prices);
      return this.prices;
    } catch (error) {
      console.error('Error fetching cryptocurrency prices:', error);
      // If we have cached prices and they're not zero, use them
      if (Object.values(this.prices).some(price => price > 0)) {
        console.log('Using cached prices:', this.prices);
        return this.prices;
      }
      // Try to load from localStorage as last resort
      try {
        const storageKey = this.getStorageKey();
        const cachedData = localStorage.getItem(storageKey);
        if (cachedData) {
          const parsedData = JSON.parse(cachedData);
          if (parsedData.prices && Object.values(parsedData.prices).some(price => price > 0)) {
            this.prices = parsedData.prices;
            console.log('Using localStorage prices:', this.prices);
            return this.prices;
          }
        }
      } catch (cacheError) {
        console.error('Error accessing price cache:', cacheError);
      }
      return this.prices;
    }
  }

  /**
   * Fetch token prices for SPL tokens from CoinGecko
   * @param {Array} tokenIds - Array of CoinGecko token IDs
   * @returns {Object} - Object with token prices
   */
  async fetchTokenPrices(tokenIds) {
    if (!tokenIds || tokenIds.length === 0) {
      return {};
    }

    try {
      // Join token IDs with commas for the API request
      const idsParam = tokenIds.join(',');
      console.log('Fetching prices for tokens:', idsParam);

      const response = await fetch(
        `${COINGECKO_API}/simple/price?ids=${idsParam}&vs_currencies=usd`
      );

      if (!response.ok) {
        throw new Error(`CoinGecko API error: ${response.status}`);
      }

      const data = await response.json();
      console.log('Fetched token prices:', data);

      // Create a map of token ID to price
      const tokenPrices = {};
      for (const tokenId of tokenIds) {
        tokenPrices[tokenId] = data[tokenId]?.usd || 0;
      }

      return tokenPrices;
    } catch (error) {
      console.error('Error fetching token prices:', error);
      return {};
    }
  }

  /**
   * Fetch Bitcoin balance for a specific address
   */
  async fetchBitcoinBalance(address) {
    try {
      // Try primary API first (Blockstream)
      try {
        const response = await fetch(`${BLOCKSTREAM_API}/address/${address}`);

        if (response.ok) {
          const data = await response.json();
          // Convert from satoshis to BTC
          const balanceSats = data.chain_stats.funded_txo_sum - data.chain_stats.spent_txo_sum;
          console.log(`Blockstream API balance for ${address}: ${balanceSats} sats`);
          return balanceSats;
        }
      } catch (blockstreamError) {
        console.warn(`Blockstream API error for ${address}:`, blockstreamError);
        // Continue to fallback
      }

      // Fallback to blockchain.info API
      console.log(`Trying fallback API for ${address}...`);
      const fallbackResponse = await fetch(`${BLOCKCHAIN_INFO_API}/balance?active=${address}&cors=true`);

      if (!fallbackResponse.ok) {
        throw new Error(`Blockchain.info API error: ${fallbackResponse.status}`);
      }

      const fallbackData = await fallbackResponse.json();

      if (!fallbackData[address]) {
        throw new Error(`No data returned for address ${address}`);
      }

      const balanceSats = fallbackData[address].final_balance;
      console.log(`Blockchain.info API balance for ${address}: ${balanceSats} sats`);
      return balanceSats;
    } catch (error) {
      console.error(`Error fetching Bitcoin balance for ${address}:`, error);
      return 0;
    }
  }

  /**
   * Fetch total Bitcoin balance across all treasury addresses
   */
  async fetchTotalBitcoinBalance() {
    try {
      const balances = await Promise.all([
        this.fetchBitcoinBalance(BTC_ADDRESSES.legacy),
        this.fetchBitcoinBalance(BTC_ADDRESSES.taproot),
        this.fetchBitcoinBalance(BTC_ADDRESSES.segwit)
      ]);

      // Sum all balances and convert from satoshis to BTC
      const totalSatoshis = balances.reduce((sum, balance) => sum + balance, 0);
      const totalBTC = totalSatoshis / 100000000; // Convert satoshis to BTC

      this.balances.btc = totalBTC;
      console.log('Total BTC balance:', totalBTC);
      return totalBTC;
    } catch (error) {
      console.error('Error fetching total Bitcoin balance:', error);
      return 0;
    }
  }

  /**
   * Fetch Ethereum balance with multiple fallbacks and retries
   */
  async fetchEthereumBalance() {
    console.log('[TreasuryBalanceService] Fetching Ethereum balance for:', ETH_ADDRESS);

    // List of providers to try
    const providers = [
      {
        name: 'Cloudflare RPC',
        fn: async () => {
          const response = await fetch('https://cloudflare-eth.com', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              jsonrpc: '2.0',
              id: 1,
              method: 'eth_getBalance',
              params: [ETH_ADDRESS, 'latest']
            })
          });
          if (!response.ok) throw new Error(`Status ${response.status}`);
          const data = await response.json();
          if (!data.result) throw new Error('No result in response');
          return Number(BigInt(data.result)) / 1e18;
        }
      },
      {
        name: 'Ankr RPC',
        fn: async () => {
          const response = await fetch('https://rpc.ankr.com/eth', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              jsonrpc: '2.0',
              id: 1,
              method: 'eth_getBalance',
              params: [ETH_ADDRESS, 'latest']
            })
          });
          if (!response.ok) throw new Error(`Status ${response.status}`);
          const data = await response.json();
          if (!data.result) throw new Error('No result in response');
          return Number(BigInt(data.result)) / 1e18;
        }
      },
      {
        name: 'Etherscan',
        fn: async () => {
          const url = `${ETHERSCAN_API}?module=account&action=balance&address=${ETH_ADDRESS}&tag=latest&apikey=${ETHERSCAN_API_KEY}`;
          const response = await fetch(url);
          if (!response.ok) throw new Error(`Status ${response.status}`);
          const data = await response.json();
          if (data.status !== '1' || !data.result) throw new Error(data.message || 'Invalid response');
          return Number(BigInt(data.result)) / 1e18;
        }
      },
      {
        name: 'Alchemy',
        fn: async () => {
          const url = `${ALCHEMY_ETH_API}/${ALCHEMY_API_KEY}`;
          const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              jsonrpc: '2.0',
              id: 1,
              method: 'eth_getBalance',
              params: [ETH_ADDRESS, 'latest']
            })
          });
          if (!response.ok) throw new Error(`Status ${response.status}`);
          const data = await response.json();
          if (!data.result) throw new Error('No result in response');
          return Number(BigInt(data.result)) / 1e18;
        }
      },
      {
        name: 'Blockchair',
        fn: async () => {
          const url = `${BLOCKCHAIR_ETH_API}/dashboards/address/${ETH_ADDRESS}`;
          const response = await fetch(url);
          if (!response.ok) throw new Error(`Status ${response.status}`);
          const data = await response.json();
          if (!data.data || !data.data[ETH_ADDRESS]) throw new Error('Invalid response format');
          return Number(BigInt(data.data[ETH_ADDRESS].address.balance || '0')) / 1e18;
        }
      },
      {
        name: 'Ethplorer',
        fn: async () => {
          const url = `${ETHPLORER_API}/getAddressInfo/${ETH_ADDRESS}?apiKey=freekey`;
          const response = await fetch(url);
          if (!response.ok) throw new Error(`Status ${response.status}`);
          const data = await response.json();
          if (data.ETH === undefined) throw new Error('Invalid response format');
          return data.ETH.balance || 0;
        }
      }
    ];

    // Try each provider with retries
    for (const provider of providers) {
      try {
        const balance = await this.withRetry(provider.fn, provider.name);
        if (typeof balance === 'number' && balance >= 0) {
          console.log(`[TreasuryBalanceService] Successfully fetched ETH balance from ${provider.name}:`, balance);
          this.balances.eth = balance;
          return balance;
        }
      } catch (error) {
        console.warn(`[TreasuryBalanceService] Provider ${provider.name} failed after retries`);
      }
    }

    // If all providers fail, use the last known good balance from memory or cache
    console.error('[TreasuryBalanceService] All Ethereum balance providers failed');
    
    if (this.balances.eth > 0) {
      console.log('[TreasuryBalanceService] Using last known good ETH balance from memory:', this.balances.eth);
      return this.balances.eth;
    }

    // Last resort: try to load from specific ETH cache directly
    try {
      const ethStorageKey = this.getStorageKey(ETH_ADDRESS);
      const ethCachedData = localStorage.getItem(ethStorageKey);
      if (ethCachedData) {
        const parsedEthData = JSON.parse(ethCachedData);
        if (parsedEthData.balance > 0) {
          console.log('[TreasuryBalanceService] Recovered ETH balance from dedicated cache:', parsedEthData.balance);
          this.balances.eth = parsedEthData.balance;
          return parsedEthData.balance;
        }
      }
    } catch (e) {
      console.error('[TreasuryBalanceService] Failed to recover from dedicated ETH cache:', e);
    }

    return 0;
  }

  /**
   * Fetch Solana balance using RPC endpoint with retry mechanism
   * @param {string} rpcEndpoint - The Solana RPC endpoint URL
   * @returns {Promise<number|null>} - The balance in SOL or null if failed
   */
  async fetchSolanaBalanceFromRPC(rpcEndpoint) {
    const MAX_RETRIES = 2;
    const RETRY_DELAY = 2000; // 2 seconds

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        if (attempt > 0) {
          console.log(`Retry attempt ${attempt} for ${rpcEndpoint}...`);
          // Wait before retry
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
        }

        console.log(`Fetching SOL balance from RPC: ${rpcEndpoint}...`);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

        const response = await fetch(rpcEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: 1,
            method: 'getBalance',
            params: [SOL_ADDRESS]
          }),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          console.warn(`RPC response not OK: ${response.status} from ${rpcEndpoint}`);
          if (attempt < MAX_RETRIES) continue;
          return null;
        }

        const data = await response.json();

        // Validate the response data structure
        if (data.error) {
          console.warn(`RPC error from ${rpcEndpoint}:`, data.error);
          if (attempt < MAX_RETRIES) continue;
          return null;
        }

        // Check for different response formats
        let lamports;
        if (data.result && typeof data.result.value === 'number') {
          // Standard format
          lamports = data.result.value;
        } else if (data.result && typeof data.result === 'number') {
          // Some RPCs might return the value directly
          lamports = data.result;
        } else if (data.result && data.result.value && typeof data.result.value === 'string') {
          // Some RPCs might return the value as a string
          lamports = parseInt(data.result.value, 10);
          if (isNaN(lamports)) {
            console.warn(`Invalid string lamport value from ${rpcEndpoint}:`, data.result.value);
            if (attempt < MAX_RETRIES) continue;
            return null;
          }
        } else {
          console.warn(`Invalid data structure from ${rpcEndpoint}:`, data);
          if (attempt < MAX_RETRIES) continue;
          return null;
        }

        // Convert from lamports to SOL (1 SOL = 1,000,000,000 lamports)
        const balanceSOL = Number(lamports) / 1e9;
        console.log(`SOL balance from ${rpcEndpoint}: ${balanceSOL}`);
        return balanceSOL;
      } catch (error) {
        if (error.name === 'AbortError') {
          console.warn(`Timeout fetching from ${rpcEndpoint}`);
        } else {
          console.warn(`Error fetching from ${rpcEndpoint}:`, error);
        }

        if (attempt < MAX_RETRIES) continue;
        return null;
      }
    }

    return null; // Should not reach here, but just in case
  }

  /**
   * Fetch Solana balance from Shyft API with retry mechanism
   * @returns {Promise<number|null>} - The balance in SOL or null if failed
   */
  async fetchSolanaBalanceFromShyft() {
    const MAX_RETRIES = 2;
    const RETRY_DELAY = 2000; // 2 seconds

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        if (attempt > 0) {
          console.log(`Retry attempt ${attempt} for Shyft API...`);
          // Wait before retry
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
        }

        console.log('Fetching SOL balance from Shyft API...');
        const shyftUrl = `${SHYFT_API}/wallet/balance?network=mainnet-beta&wallet=${SOL_ADDRESS}&token=So11111111111111111111111111111111111111112`;

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

        const response = await fetch(shyftUrl, {
          method: 'GET',
          headers: {
            'x-api-key': SHYFT_API_KEY,
            'Content-Type': 'application/json'
          },
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          console.warn('Shyft API response not OK:', response.status);
          if (attempt < MAX_RETRIES) continue;
          return null;
        }

        const data = await response.json();

        // Check for different response formats
        let balanceSOL;

        if (data.result && typeof data.result.balance === 'string') {
          balanceSOL = parseFloat(data.result.balance);
          if (isNaN(balanceSOL)) {
            console.warn('Invalid balance value from Shyft API:', data.result.balance);
            if (attempt < MAX_RETRIES) continue;
            return null;
          }
        } else if (data.result && typeof data.result.balance === 'number') {
          balanceSOL = data.result.balance;
        } else {
          console.warn('Invalid Shyft API response format:', data);
          if (attempt < MAX_RETRIES) continue;
          return null;
        }

        console.log('SOL balance from Shyft API:', balanceSOL);
        return balanceSOL;
      } catch (error) {
        if (error.name === 'AbortError') {
          console.warn('Timeout fetching from Shyft API');
        } else {
          console.warn('Shyft API error:', error);
        }

        if (attempt < MAX_RETRIES) continue;
        return null;
      }
    }

    return null; // Should not reach here, but just in case
  }

  /**
   * Fetch Solana balance and SPL tokens from Shyft API's all_tokens endpoint
   * This is an alternative endpoint that can be more reliable for some wallets
   * @returns {Promise<{solBalance: number|null, tokens: Array}>} - The SOL balance and SPL tokens
   */
  async fetchSolanaBalanceFromShyftAllTokens() {
    const MAX_RETRIES = 3; // More retries for this fallback method
    const RETRY_DELAY = 2000; // 2 seconds

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        if (attempt > 0) {
          console.log(`Retry attempt ${attempt} for Shyft all_tokens API...`);
          // Wait before retry
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
        }

        console.log('Fetching SOL balance and SPL tokens from Shyft all_tokens API...');
        // Use the all_tokens endpoint which can be more reliable
        const shyftUrl = `${SHYFT_API}/wallet/all_tokens?network=mainnet-beta&wallet=${SOL_ADDRESS}`;

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 20000); // 20 second timeout (longer for this endpoint)

        const response = await fetch(shyftUrl, {
          method: 'GET',
          headers: {
            'x-api-key': SHYFT_API_KEY,
            'Content-Type': 'application/json'
          },
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          console.warn('Shyft all_tokens API response not OK:', response.status);
          if (attempt < MAX_RETRIES) continue;
          return { solBalance: null, tokens: [] };
        }

        const data = await response.json();
        console.log('Shyft all_tokens API response received');

        // Process all tokens in the response
        if (data.result && Array.isArray(data.result)) {
          console.log(`Found ${data.result.length} tokens in wallet`);

          let solBalance = null;
          const tokens = [];

          // Process each token
          for (const token of data.result) {
            try {
              // Skip tokens with zero balance
              let tokenBalance = 0;

              // Handle different response formats for balance
              if (typeof token.balance === 'string') {
                tokenBalance = parseFloat(token.balance);
              } else if (typeof token.balance === 'number') {
                tokenBalance = token.balance;
              } else if (typeof token.amount === 'string') {
                tokenBalance = parseFloat(token.amount);
              } else if (typeof token.amount === 'number') {
                tokenBalance = token.amount;
              } else if (typeof token.value === 'string') {
                tokenBalance = parseFloat(token.value);
              } else if (typeof token.value === 'number') {
                tokenBalance = token.value;
              }

              if (isNaN(tokenBalance) || tokenBalance <= 0) {
                continue; // Skip tokens with zero or invalid balance
              }

              // Check if this is the native SOL token
              const isSolToken =
                token.symbol === 'SOL' ||
                token.mint === 'So11111111111111111111111111111111111111112' ||
                token.address === 'So11111111111111111111111111111111111111112';

              if (isSolToken) {
                solBalance = tokenBalance;
                console.log('SOL balance from Shyft all_tokens API:', solBalance);
              } else {
                // This is an SPL token
                const tokenInfo = {
                  symbol: token.symbol || 'Unknown',
                  name: token.name || token.symbol || 'Unknown Token',
                  mint: token.mint || token.address,
                  balance: tokenBalance,
                  decimals: parseInt(token.decimals || '0', 10),
                  logoURI: token.logo || '',
                  coingeckoId: '', // Will be populated later if available
                  usdValue: 0 // Will be populated later
                };

                tokens.push(tokenInfo);
                console.log(`Found SPL token: ${tokenInfo.symbol}, balance: ${tokenInfo.balance}`);
              }
            } catch (tokenError) {
              console.warn('Error processing token:', tokenError, token);
              // Continue with other tokens
            }
          }

          return { solBalance, tokens };
        } else {
          console.warn('Invalid Shyft all_tokens API response format:', data);
        }

        if (attempt < MAX_RETRIES) continue;
        return { solBalance: null, tokens: [] };
      } catch (error) {
        if (error.name === 'AbortError') {
          console.warn('Timeout fetching from Shyft all_tokens API');
        } else {
          console.warn('Shyft all_tokens API error:', error);
        }

        if (attempt < MAX_RETRIES) continue;
        return { solBalance: null, tokens: [] };
      }
    }

    return { solBalance: null, tokens: [] }; // Should not reach here, but just in case
  }

  /**
   * Fetch Solana balance from Solscan API with retry mechanism
   * @returns {Promise<number|null>} - The balance in SOL or null if failed
   */
  async fetchSolanaBalanceFromSolscan() {
    const MAX_RETRIES = 2;
    const RETRY_DELAY = 2000; // 2 seconds

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        if (attempt > 0) {
          console.log(`Retry attempt ${attempt} for Solscan API...`);
          // Wait before retry
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
        }

        console.log('Fetching SOL balance from Solscan...');
        const solscanUrl = `${SOLSCAN_API}/account/${SOL_ADDRESS}`;

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

        const response = await fetch(solscanUrl, {
          headers: {
            'Accept': 'application/json'
          },
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          console.warn('Solscan API response not OK:', response.status);
          if (attempt < MAX_RETRIES) continue;
          return null;
        }

        const data = await response.json();

        // Check for different response formats
        let lamports;
        if (data && typeof data.lamports === 'number') {
          lamports = data.lamports;
        } else if (data && typeof data.lamports === 'string') {
          lamports = parseInt(data.lamports, 10);
          if (isNaN(lamports)) {
            console.warn('Invalid string lamport value from Solscan:', data.lamports);
            if (attempt < MAX_RETRIES) continue;
            return null;
          }
        } else if (data && data.data && typeof data.data.lamports === 'number') {
          // Alternative response format
          lamports = data.data.lamports;
        } else {
          console.warn('Invalid Solscan API response format:', data);
          if (attempt < MAX_RETRIES) continue;
          return null;
        }

        const balanceSOL = Number(lamports) / 1e9;
        console.log('SOL balance from Solscan:', balanceSOL);
        return balanceSOL;
      } catch (error) {
        if (error.name === 'AbortError') {
          console.warn('Timeout fetching from Solscan API');
        } else {
          console.warn('Solscan API error:', error);
        }

        if (attempt < MAX_RETRIES) continue;
        return null;
      }
    }

    return null; // Should not reach here, but just in case
  }

  /**
   * Fetch Solana account networth from Solana.fm API with retry mechanism
   * This provides the total account value including all SPL tokens
   * @returns {Promise<{netWorth: number|null, tokens: Array}>} - The total account networth and a NET_WORTH token
   */
  async fetchSolanaNetWorthFromSolanaFm() {
    const MAX_RETRIES = 3;
    const RETRY_DELAY = 2000; // 2 seconds

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        if (attempt > 0) {
          console.log(`Retry attempt ${attempt} for Solana.fm API...`);
          // Wait before retry
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
        }

        console.log('Fetching account networth from Solana.fm API...');
        // Try a different endpoint structure based on documentation
        const solanaFmUrl = `${SOLANAFM_API}/accounts/${SOL_ADDRESS}/tokens`;

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

        const response = await fetch(solanaFmUrl, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          },
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          console.warn('Solana.fm API response not OK:', response.status);
          if (attempt < MAX_RETRIES) continue;
          return { netWorth: null, tokens: [] };
        }

        const data = await response.json();
        console.log('Solana.fm API response received:', data);

        // Calculate total value from all tokens
        let totalValue = 0;
        let hasTokens = false;

        // Check different possible response formats
        if (data && data.result && Array.isArray(data.result)) {
          // Format 1: Array of tokens in result field
          hasTokens = data.result.length > 0;
          data.result.forEach(token => {
            if (token && typeof token.usdValue === 'number') {
              totalValue += token.usdValue;
            } else if (token && typeof token.value === 'number') {
              totalValue += token.value;
            }
          });
          console.log('Calculated total value from tokens array:', totalValue);
        } else if (data && data.data && typeof data.data.netWorth === 'number') {
          // Format 2: Direct netWorth field
          totalValue = data.data.netWorth;
          hasTokens = true;
          console.log('Using direct netWorth value:', totalValue);
        } else if (data && data.data && Array.isArray(data.data.tokens)) {
          // Format 3: Tokens array in data field
          hasTokens = data.data.tokens.length > 0;
          data.data.tokens.forEach(token => {
            if (token && typeof token.usdValue === 'number') {
              totalValue += token.usdValue;
            } else if (token && typeof token.value === 'number') {
              totalValue += token.value;
            }
          });
          console.log('Calculated total value from data.tokens array:', totalValue);
        } else if (data && typeof data.totalValue === 'number') {
          // Format 4: Direct totalValue field
          totalValue = data.totalValue;
          hasTokens = true;
          console.log('Using direct totalValue:', totalValue);
        }

        if (hasTokens && totalValue > 0) {
          console.log('Final account networth from Solana.fm:', totalValue);

          // Create a virtual NET_WORTH token to be used in the UI
          const tokens = [{
            symbol: 'NET_WORTH',
            name: 'Total Account Value (Solana.fm)',
            mint: 'NET_WORTH_TOKEN',
            balance: 1, // Just a placeholder
            decimals: 0,
            logoURI: '',
            coingeckoId: '',
            usdValue: totalValue // This is the important value
          }];

          return { netWorth: totalValue, tokens };
        } else {
          console.warn('No valid token data found in Solana.fm API response');
        }

        if (attempt < MAX_RETRIES) continue;
        return { netWorth: null, tokens: [] };
      } catch (error) {
        if (error.name === 'AbortError') {
          console.warn('Timeout fetching from Solana.fm API');
        } else {
          console.warn('Solana.fm API error:', error);
        }

        if (attempt < MAX_RETRIES) continue;
        return { netWorth: null, tokens: [] };
      }
    }

    return { netWorth: null, tokens: [] }; // Should not reach here, but just in case
  }

  /**
   * Fetch Solana balance from Solflare API with retry mechanism
   * @returns {Promise<number|null>} - The balance in SOL or null if failed
   */
  async fetchSolanaBalanceFromSolflare() {
    const MAX_RETRIES = 2;
    const RETRY_DELAY = 2000; // 2 seconds

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        if (attempt > 0) {
          console.log(`Retry attempt ${attempt} for Solflare API...`);
          // Wait before retry
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
        }

        console.log('Fetching SOL balance from Solflare...');
        const solflareUrl = `${SOLFLARE_API}/v0/account/${SOL_ADDRESS}`;

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

        const response = await fetch(solflareUrl, {
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          console.warn('Solflare API response not OK:', response.status);
          if (attempt < MAX_RETRIES) continue;
          return null;
        }

        const data = await response.json();

        // Check for different response formats
        let lamports;
        if (data && typeof data.lamports === 'number') {
          lamports = data.lamports;
        } else if (data && typeof data.lamports === 'string') {
          lamports = parseInt(data.lamports, 10);
          if (isNaN(lamports)) {
            console.warn('Invalid string lamport value from Solflare:', data.lamports);
            if (attempt < MAX_RETRIES) continue;
            return null;
          }
        } else if (data && data.balance && typeof data.balance === 'number') {
          // Some APIs might return balance directly in SOL
          return data.balance;
        } else if (data && data.balance && typeof data.balance === 'string') {
          // Some APIs might return balance as string in SOL
          const balance = parseFloat(data.balance);
          if (isNaN(balance)) {
            console.warn('Invalid string balance value from Solflare:', data.balance);
            if (attempt < MAX_RETRIES) continue;
            return null;
          }
          return balance;
        } else {
          console.warn('Invalid Solflare API response format:', data);
          if (attempt < MAX_RETRIES) continue;
          return null;
        }

        const balanceSOL = Number(lamports) / 1e9;
        console.log('SOL balance from Solflare:', balanceSOL);
        return balanceSOL;
      } catch (error) {
        if (error.name === 'AbortError') {
          console.warn('Timeout fetching from Solflare API');
        } else {
          console.warn('Solflare API error:', error);
        }

        if (attempt < MAX_RETRIES) continue;
        return null;
      }
    }

    return null; // Should not reach here, but just in case
  }

  /**
   * Fetch all token balances directly from Solana RPC
   * This is a fallback method when other APIs fail
   * @returns {Promise<{solBalance: number|null, tokens: Array}>} - The SOL balance and SPL tokens
   */
  async fetchAllTokenBalancesFromRPC() {
    // Try each RPC endpoint until one works
    for (let i = 0; i < SOLANA_RPC_ENDPOINTS.length; i++) {
      const rpcEndpoint = SOLANA_RPC_ENDPOINTS[i];
      console.log(`Fetching token balances directly from Solana RPC (${rpcEndpoint})...`);
      
      try {
        // Import required libraries
        const { Connection, PublicKey } = await import('@solana/web3.js');
        const { TOKEN_PROGRAM_ID } = await import('@solana/spl-token');
        
        // Create connection and public key
        const connection = new Connection(rpcEndpoint, 'confirmed');
        const publicKey = new PublicKey(SOL_ADDRESS);
        
        // Get SOL balance
        const solBalance = await connection.getBalance(publicKey) / 1e9;
        console.log(`SOL balance from RPC (${rpcEndpoint}):`, solBalance);
        
        // Get all token accounts
        const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
          publicKey,
          { programId: TOKEN_PROGRAM_ID }
        );
        
        console.log(`Found ${tokenAccounts.value.length} token accounts via ${rpcEndpoint}`);
        
        // Process token accounts
        const tokens = [];
        for (const account of tokenAccounts.value) {
          const tokenInfo = account.account.data.parsed.info;
          const mint = tokenInfo.mint;
          const balance = Number(tokenInfo.tokenAmount.amount);
          const decimals = tokenInfo.tokenAmount.decimals;
          
          if (balance <= 0) continue;
          
          // Try to get token metadata
          let symbol = 'Unknown';
          let name = 'Unknown Token';
          
          try {
            // For known tokens, we can use a lookup table
            if (mint === 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v') {
              symbol = 'USDC';
              name = 'USD Coin';
            } else if (mint === 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB') {
              symbol = 'USDT';
              name = 'Tether USD';
            } else {
              // For other tokens, use the mint address as symbol
              symbol = mint.slice(0, 6);
              name = `Token ${mint.slice(0, 10)}...`;
            }
          } catch (error) {
            console.warn('Error getting token metadata:', error);
          }
          
          tokens.push({
            symbol,
            name,
            mint,
            balance,
            decimals,
            usdValue: 0 // Will be calculated later
          });
        }
        
        console.log(`Processed ${tokens.length} tokens with non-zero balance`);
        return { solBalance, tokens, error: null };
      } catch (error) {
        console.warn(`Error fetching token balances from RPC ${rpcEndpoint}:`, error.message);
        // Continue to next endpoint
      }
    }
    
    console.error('All RPC token fetch attempts failed across all endpoints');
    return { solBalance: null, tokens: [], error: new Error('All RPC endpoints failed') };
  }
  
  /**
   * Map SPL token symbols to CoinGecko IDs
   * This is a helper function to map common token symbols to their CoinGecko IDs
   * @param {Array} tokens - Array of token objects with symbol property
   * @returns {Object} - Map of token mint addresses to CoinGecko IDs
   */
  mapTokensToCoinGeckoIds(tokens) {
    // Common token mappings (symbol to CoinGecko ID)
    const commonTokens = {
      'USDC': 'usd-coin',
      'USDT': 'tether',
      'BTC': 'bitcoin',
      'ETH': 'ethereum',
      'SOL': 'solana',
      'BONK': 'bonk',
      'RAY': 'raydium',
      'SRM': 'serum',
      'MNGO': 'mango-markets',
      'ORCA': 'orca',
      'SAMO': 'samoyedcoin',
      'ATLAS': 'star-atlas',
      'POLIS': 'star-atlas-dao',
      'COPE': 'cope',
      'FIDA': 'bonfida',
      'MAPS': 'maps',
      'STEP': 'step-finance',
      'SLND': 'solend',
      'STSOL': 'lido-staked-sol',
      'MSOL': 'marinade-staked-sol',
      'WSOL': 'wrapped-solana',
      'JTO': 'jito-governance',
      'PYTH': 'pyth-network',
      'RENDER': 'render-token',
      'BSOL': 'blazestake-staked-sol',
      'JSOL': 'jpool-solana',
      'USDR': 'tangible-usdr',
      'UXD': 'uxd-protocol',
      'DUST': 'dust-protocol',
      'MEAN': 'meanfi',
      'WBTC': 'wrapped-bitcoin',
      'WETH': 'weth',
      'HADES': 'hades-money',
      'JITOSOL': 'jito-staked-sol',
      'RATIO': 'ratio-finance',
      'RNDR': 'render-token',
      'SHDW': 'genesysgo-shadow',
      'USDR': 'real-usd',
      'WUSDC': 'wrapped-usdc',
      'WUSDT': 'wrapped-usdt'
    };

    const tokenMintToCoinGeckoId = {};

    for (const token of tokens) {
      // Try to find a match in our common tokens map
      const symbol = token.symbol.toUpperCase();
      if (commonTokens[symbol]) {
        tokenMintToCoinGeckoId[token.mint] = commonTokens[symbol];
        token.coingeckoId = commonTokens[symbol];
        console.log(`Mapped ${symbol} to CoinGecko ID: ${commonTokens[symbol]}`);
      }
    }

    return tokenMintToCoinGeckoId;
  }

  /**
   * Fetch Solana balance using simple JSON-RPC fetch (no web3.js dependency)
   * This is a lightweight fallback that works well in browsers
   */
  async fetchSolanaBalanceSimple() {
    // Try a few reliable endpoints, including authenticated ones if available
    const endpoints = [
      '/solana-rpc',
      'https://api.mainnet-beta.solana.com',
      `https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY || '15319106-f1a1-4a5a-9c38-863bb1f2e247'}`,
      `https://solana-mainnet.core.chainstack.com/${process.env.QUICKNODE_API_ID || '15319106-f1a1-4a5a-9c38-863bb1f2e247'}`,
      'https://solana-mainnet.g.alchemy.com/v2/demo',
      'https://rpc.ankr.com/solana',
      'https://solana-mainnet.rpc.extrnode.com'
    ];

    for (const endpoint of endpoints) {
      try {
        console.log(`Fetching SOL balance via simple JSON-RPC from ${endpoint}...`);
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: 1,
            method: 'getBalance',
            params: [SOL_ADDRESS]
          })
        });

        if (!response.ok) continue;

        const data = await response.json();
        if (data.result && data.result.value !== undefined) {
          const balance = data.result.value / 1e9;
          console.log(`Simple JSON-RPC success: ${balance} SOL`);
          return balance;
        }
      } catch (error) {
        console.warn(`Simple JSON-RPC failed for ${endpoint}:`, error.message);
      }
    }
    return null;
  }

  /**
   * Fetch Solana balance using all available methods
   * Tries multiple endpoints and APIs for maximum reliability
   * Also fetches SPL token balances
   */
  async fetchSolanaBalance() {
    try {
      console.log('Fetching Solana balance for address:', SOL_ADDRESS);

      // First try all RPC endpoints in parallel
      const rpcPromises = SOLANA_RPC_ENDPOINTS.map(endpoint =>
        this.fetchSolanaBalanceFromRPC(endpoint)
      );

      // Also try third-party APIs in parallel
      const apiPromises = [
        this.fetchSolanaBalanceFromShyft(),
        this.fetchSolanaBalanceFromSolscan(),
        this.fetchSolanaBalanceFromSolflare(),
        this.fetchSolanaBalanceSimple() // Add the simple fetch as a backup
      ];

      // Fetch SPL tokens in parallel
      const splTokensPromise = this.fetchSolanaBalanceFromShyftAllTokens();
      
      // Fetch account networth from Solana.fm
      const solanaFmPromise = this.fetchSolanaNetWorthFromSolanaFm();
      
      // Fetch all token balances directly from RPC as a fallback
      const rpcTokensPromise = this.fetchAllTokenBalancesFromRPC();

      // Wait for all requests to complete
      const [allResults, splTokensResult, solanaFmResult, rpcTokensResult] = await Promise.all([
        Promise.allSettled([...rpcPromises, ...apiPromises]),
        splTokensPromise,
        solanaFmPromise,
        rpcTokensPromise
      ]);
      
      // Log RPC tokens result for debugging
      console.log('RPC tokens result:', rpcTokensResult);

      // Process SPL tokens
      let allTokens = [];
      
      if (splTokensResult && splTokensResult.tokens && splTokensResult.tokens.length > 0) {
        console.log(`Found ${splTokensResult.tokens.length} SPL tokens`);
        allTokens = [...splTokensResult.tokens];

        // Map tokens to CoinGecko IDs
        this.mapTokensToCoinGeckoIds(allTokens);

        // Get list of CoinGecko IDs to fetch prices for
        const coinGeckoIds = allTokens
          .filter(token => token.coingeckoId)
          .map(token => token.coingeckoId);

        if (coinGeckoIds.length > 0) {
          // Fetch prices for tokens
          const tokenPrices = await this.fetchTokenPrices(coinGeckoIds);

          // Update token USD values
          for (const token of allTokens) {
            if (token.coingeckoId && tokenPrices[token.coingeckoId]) {
              const price = tokenPrices[token.coingeckoId];
              // Calculate USD value based on token decimals
              const divisor = Math.pow(10, token.decimals);
              const actualBalance = token.balance / divisor;
              token.usdValue = actualBalance * price;
              console.log(`${token.symbol} price: ${price}, USD value: ${token.usdValue}`);
            }
          }
        }
      } else {
        console.log('No SPL tokens found or error fetching tokens');
      }
      
      // Add Solana.fm NET_WORTH token if available
      if (solanaFmResult && solanaFmResult.tokens && solanaFmResult.tokens.length > 0) {
        console.log('Adding Solana.fm NET_WORTH token to SPL tokens list');
        // Add the NET_WORTH token to our tokens list
        allTokens = [...allTokens, ...solanaFmResult.tokens];
        console.log('NET_WORTH token added with USD value:', solanaFmResult.tokens[0].usdValue);
      }
      
      // If we have RPC tokens but no other tokens, use RPC tokens as fallback
      if (rpcTokensResult && rpcTokensResult.tokens && rpcTokensResult.tokens.length > 0 && allTokens.length === 0) {
        console.log(`Using RPC tokens as fallback: ${rpcTokensResult.tokens.length} tokens found`);
        allTokens = [...rpcTokensResult.tokens];
        
        // Map tokens to CoinGecko IDs
        this.mapTokensToCoinGeckoIds(allTokens);
        
        // Get list of CoinGecko IDs to fetch prices for
        const coinGeckoIds = allTokens
          .filter(token => token.coingeckoId)
          .map(token => token.coingeckoId);

        if (coinGeckoIds.length > 0) {
          // Fetch prices for tokens
          const tokenPrices = await this.fetchTokenPrices(coinGeckoIds);

          // Update token USD values
          for (const token of allTokens) {
            if (token.coingeckoId && tokenPrices[token.coingeckoId]) {
              const price = tokenPrices[token.coingeckoId];
              // Calculate USD value based on token decimals
              const divisor = Math.pow(10, token.decimals);
              const actualBalance = token.balance / divisor;
              token.usdValue = actualBalance * price;
              console.log(`${token.symbol} price: ${price}, USD value: ${token.usdValue}`);
            }
          }
        }
      }
      
      // Store all tokens including NET_WORTH if available
      this.splTokens = allTokens;
      console.log(`Total tokens stored: ${this.splTokens.length}`);
      
      // Calculate total USD value of SPL tokens (excluding NET_WORTH token)
      const regularSplTokens = this.splTokens.filter(token => token.symbol !== 'NET_WORTH');
      this.splTokensUsdValue = regularSplTokens.reduce((total, token) => total + (token.usdValue || 0), 0);
      console.log('Total SPL tokens USD value (excluding NET_WORTH):', this.splTokensUsdValue);
      
      // Log all tokens with USD value for debugging
      console.log('Tokens with USD value:');
      regularSplTokens
        .filter(token => token.usdValue > 0)
        .sort((a, b) => b.usdValue - a.usdValue)
        .forEach(token => {
          console.log(`${token.symbol}: ${token.usdValue.toFixed(2)} USD`);
        });

      // Log all results for detailed debugging
      allResults.forEach((result, index) => {
        const endpoint = index < rpcPromises.length 
          ? SOLANA_RPC_ENDPOINTS[index] 
          : ['Shyft', 'Solscan', 'Solflare', 'SimpleFetch'][index - rpcPromises.length];
        
        if (result.status === 'fulfilled') {
          console.log(`SOL Result from ${endpoint}:`, result.value);
        } else {
          console.warn(`SOL Result from ${endpoint} FAILED:`, result.reason);
        }
      });

      // Filter out failed requests and null results for SOL balance
      const validResults = allResults
        .filter(result => result.status === 'fulfilled' && result.value !== null)
        .map(result => result.value);

      console.log('All valid SOL balance results (including zeros):', validResults);

      // Filter out zero values to avoid skewing the median with failed attempts
      // Many APIs might return 0 if they fail or can't find the address
      const nonZeroResults = validResults.filter(val => val > 0);
      console.log('Non-zero SOL balance results:', nonZeroResults);

      // If we have a SOL balance from the SPL tokens result, add it to our valid results
      if (splTokensResult && splTokensResult.solBalance !== null && splTokensResult.solBalance > 0) {
        nonZeroResults.push(splTokensResult.solBalance);
        console.log('Added SOL balance from SPL tokens result:', splTokensResult.solBalance);
      }

      // If we have a SOL balance from the RPC tokens result, add it to our valid results
      if (rpcTokensResult && rpcTokensResult.solBalance !== null && rpcTokensResult.solBalance > 0) {
        nonZeroResults.push(rpcTokensResult.solBalance);
        console.log('Added SOL balance from RPC tokens result:', rpcTokensResult.solBalance);
      }

      // If we have no non-zero results, we might really have 0 balance, or everything failed
      if (nonZeroResults.length === 0) {
        // If we have some valid results (which are all 0), and we have more than 3 sources agreeing on 0,
        // it's possible the balance is actually 0.
        // We increase this threshold to be more conservative.
        if (validResults.length >= 5) {
             console.log('5+ sources returned 0, assuming balance is 0');
             this.balances.sol = 0;
             return 0;
        }

        console.warn('All SOL balance fetch attempts failed or returned 0. Results:', validResults);

        // Instead of resetting to 0, preserve the previous balance if it exists
        if (this.balances.sol > 0) {
          console.log('Preserving previous SOL balance:', this.balances.sol);
          return this.balances.sol;
        }
        
        // Try to get from cache as a last resort before returning 0
        try {
          const storageKey = this.getStorageKey();
          const cachedData = localStorage.getItem(storageKey);
          if (cachedData) {
            const parsedData = JSON.parse(cachedData);
            if (parsedData.balances && parsedData.balances.sol > 0) {
              console.log('Using cached SOL balance as last resort:', parsedData.balances.sol);
              this.balances.sol = parsedData.balances.sol;
              return parsedData.balances.sol;
            }
          }
        } catch (e) {}
        
        return 0;
      }

      // Use nonZeroResults for statistical analysis
      const resultsToAnalyze = nonZeroResults;

      // Enhanced statistical approach to determine the most accurate balance
      // First, check if we have enough results for statistical analysis
      if (resultsToAnalyze.length >= 3) {
        // Sort the results for analysis
        const sortedResults = [...resultsToAnalyze].sort((a, b) => a - b);
        console.log('Sorted non-zero SOL balance results:', sortedResults);

        // Calculate mean
        const sum = sortedResults.reduce((acc, val) => acc + val, 0);
        const mean = sum / sortedResults.length;

        // Calculate standard deviation
        const squaredDiffs = sortedResults.map(val => Math.pow(val - mean, 2));
        const avgSquaredDiff = squaredDiffs.reduce((acc, val) => acc + val, 0) / squaredDiffs.length;
        const stdDev = Math.sqrt(avgSquaredDiff);

        console.log(`SOL balance statistics - Mean: ${mean}, StdDev: ${stdDev}`);

        // Filter out outliers (values more than 2 standard deviations from the mean)
        // Only if we have enough data points and standard deviation is significant
        if (sortedResults.length > 4 && stdDev > 0.0001) {
          const filteredResults = sortedResults.filter(
            val => Math.abs(val - mean) <= 2 * stdDev
          );

          if (filteredResults.length > 0) {
            console.log('Filtered SOL balance results (outliers removed):', filteredResults);

            // Calculate median of filtered results
            const medianIndex = Math.floor(filteredResults.length / 2);
            const medianBalance = filteredResults.length % 2 === 0
              ? (filteredResults[medianIndex - 1] + filteredResults[medianIndex]) / 2
              : filteredResults[medianIndex];

            console.log('Final SOL balance (statistical median):', medianBalance);
            this.balances.sol = medianBalance;
            return medianBalance;
          }
        }
      }

      // Fallback to simple median of non-zero results
      const sortedResults = [...resultsToAnalyze].sort((a, b) => a - b);
      const medianIndex = Math.floor(sortedResults.length / 2);
      const medianBalance = sortedResults.length % 2 === 0
        ? (sortedResults[medianIndex - 1] + sortedResults[medianIndex]) / 2
        : sortedResults[medianIndex];

      console.log('Final SOL balance (simple median of non-zeros):', medianBalance);
      this.balances.sol = medianBalance;
      return medianBalance;
    } catch (error) {
      console.error('Error in fetchSolanaBalance:', error);

      // Instead of resetting to 0, preserve the previous balance if it exists
      if (this.balances.sol > 0) {
        console.log('Error occurred, but preserving previous SOL balance:', this.balances.sol);
        return this.balances.sol;
      }

      // Try to get the balance from cache as a last resort
      try {
        const storageKey = this.getStorageKey();
        const cachedData = localStorage.getItem(storageKey);
        if (cachedData) {
          const parsedData = JSON.parse(cachedData);
          if (parsedData.balances && parsedData.balances.sol > 0) {
            console.log('Using cached SOL balance as fallback:', parsedData.balances.sol);
            this.balances.sol = parsedData.balances.sol;
            return parsedData.balances.sol;
          }
        }
      } catch (cacheError) {
        console.error('Error accessing cache for SOL balance fallback:', cacheError);
      }

      // Only set to 0 if we have no other option
      this.balances.sol = 0;
      return 0;
    }
  }

  /**
   * Fetch all balances and calculate total in USD
   * @param {boolean} forceRefresh - Whether to force a refresh even if cache is valid
   * @returns {Promise<Object>} - The balance data
   */
  async fetchAllBalances(forceRefresh = false) {
    // If a fetch is already in progress, return the current data
    if (this.isFetching) {
      console.log('Fetch already in progress, returning current data');
      return this.getBalances();
    }

    // Check if we have valid cached data and forceRefresh is false
    if (!forceRefresh && this.isCacheValid()) {
      console.log('Using cached data (still valid)');
      return this.getBalances();
    }

    // Set fetching flag to prevent multiple simultaneous fetches
    this.isFetching = true;

    try {
      console.log('Fetching all treasury balances...');

      // Try fetching from server API first (server-side caching)
      try {
        console.log('Attempting to fetch from server API...');
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000); // 8s timeout
        
        const response = await fetch('/api/treasury', {
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (response.ok) {
          const data = await response.json();
          console.log('Server API response:', data);
          
          if (data) {
            console.log('Successfully fetched data from server API');
            
            // Update balances if present
            if (data.btc !== undefined) this.balances.btc = data.btc;
            if (data.eth !== undefined) this.balances.eth = data.eth;
            if (data.sol !== undefined) this.balances.sol = data.sol;
            
            // Update prices if present
            if (data.prices) {
              this.prices = {
                btc: data.prices.btc || this.prices.btc,
                eth: data.prices.eth || this.prices.eth,
                sol: data.prices.sol || this.prices.sol
              };
            }
            
            this.lastUpdated = new Date();
            this.saveToCache();
            this.isFetching = false;
            this.notifySubscribers();
            return this.getBalances();
          }
        }
      } catch (apiError) {
        console.warn('Server API fetch failed, falling back to client-side fetching:', apiError);
      }

      const startTime = performance.now();

      // First fetch current prices with a timeout
      const pricePromise = Promise.race([
        this.fetchPrices(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Price fetch timeout')), this.requestTimeout)
        )
      ]).catch(error => {
        console.warn('Price fetch failed or timed out:', error);
        // If prices fail, we'll use the cached prices or zeros
        return this.prices;
      });

      await pricePromise;
      console.log('Current prices:', this.prices);

      // Then fetch all balances in parallel with timeouts
      console.log('Fetching individual balances...');
      const balancePromises = [
        Promise.race([
          this.fetchTotalBitcoinBalance(),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('BTC fetch timeout')), this.requestTimeout * 1.5)
          )
        ]).catch(error => {
          console.warn('BTC fetch failed or timed out:', error);
          return this.balances.btc; // Use cached value on error
        }),

        Promise.race([
          this.fetchEthereumBalance(),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('ETH fetch timeout')), this.requestTimeout * 1.5)
          )
        ]).catch(error => {
          console.warn('ETH fetch failed or timed out:', error);
          return this.balances.eth; // Use cached value on error
        }),

        Promise.race([
          this.fetchSolanaBalance(),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('SOL fetch timeout')), this.requestTimeout * 2) // Longer timeout for SOL
          )
        ]).catch(error => {
          console.warn('SOL fetch failed or timed out:', error);

          // First try to use the current balance if it exists
          if (this.balances.sol > 0) {
            console.log('Using current SOL balance as fallback:', this.balances.sol);
            return this.balances.sol;
          }

          // Then try to get the balance from cache
          try {
            const storageKey = this.getStorageKey();
            const cachedData = localStorage.getItem(storageKey);
            if (cachedData) {
              const parsedData = JSON.parse(cachedData);
              if (parsedData.balances && parsedData.balances.sol > 0) {
                console.log('Using cached SOL balance as fallback:', parsedData.balances.sol);
                return parsedData.balances.sol;
              }
            }
          } catch (cacheError) {
            console.error('Error accessing cache for SOL balance fallback:', cacheError);
          }

          // As a last resort, try the Shyft all_tokens endpoint directly
          return this.fetchSolanaBalanceFromShyftAllTokens()
            .then(balance => {
              if (balance !== null && balance > 0) {
                console.log('Successfully retrieved SOL balance from Shyft all_tokens endpoint:', balance);
                return balance;
              }
              return this.balances.sol || 0; // Use current balance or 0 if all else fails
            })
            .catch(() => this.balances.sol || 0); // Use current balance or 0 if all else fails
        })
      ];

      const results = await Promise.allSettled(balancePromises);

      // Update lastUpdated timestamp
      this.lastUpdated = new Date();

      // Log results
      console.log('Balance fetch results:', results.map(r => r.status));
      results.forEach((result, index) => {
        const currency = ['BTC', 'ETH', 'SOL'][index];
        if (result.status === 'fulfilled') {
          console.log(`${currency} balance fetch successful:`, result.value);
        } else {
          console.error(`${currency} balance fetch failed:`, result.reason);
        }
      });

      // Calculate individual USD values with validation
      const usdValues = {
        btc: this.balances.btc && this.prices.btc ? parseFloat((this.balances.btc * this.prices.btc).toFixed(2)) : 0,
        eth: this.balances.eth && this.prices.eth ? parseFloat((this.balances.eth * this.prices.eth).toFixed(2)) : 0,
        sol: this.balances.sol && this.prices.sol ? parseFloat((this.balances.sol * this.prices.sol).toFixed(2)) : 0
      };

      // Validate USD values
      Object.entries(usdValues).forEach(([currency, value]) => {
        if (!isFinite(value) || value < 0) {
          console.error(`Invalid USD value for ${currency}:`, value);
          usdValues[currency] = 0;
        }
      });

      // Calculate initial total from main cryptocurrencies
      let totalUSD = parseFloat(Object.values(usdValues).reduce((sum, value) => sum + value, 0).toFixed(2));
      console.log('Initial total from main cryptocurrencies:', totalUSD, 'USD values:', usdValues);

      let splTokensUsdValue = 0;

      // Check if we have a NET_WORTH token from Solana.fm
      const netWorthToken = this.splTokens && Array.isArray(this.splTokens) ?
        this.splTokens.find(token => token.symbol === 'NET_WORTH') : null;
      
      if (netWorthToken && typeof netWorthToken.usdValue === 'number' && 
          isFinite(netWorthToken.usdValue) && netWorthToken.usdValue > 0) {
        // If we have a valid NET_WORTH token from Solana.fm, use it for the Solana value
        console.log('Using Solana.fm NET_WORTH token for Solana value:', netWorthToken.usdValue);
        
        // Subtract the current SOL value from the total and add the NET_WORTH value instead
        totalUSD = parseFloat((totalUSD - usdValues.sol + netWorthToken.usdValue).toFixed(2));
        
        // Update the SOL USD value to the NET_WORTH value
        usdValues.sol = netWorthToken.usdValue;
        
        console.log('Updated total using Solana.fm NET_WORTH:', totalUSD);
      } else {
        // Calculate total USD value from SPL tokens with validation
        splTokensUsdValue = 0;
        if (this.splTokens && Array.isArray(this.splTokens) && this.splTokens.length > 0) {
          // Filter and validate each token's USD value (excluding NET_WORTH token)
          const validTokens = this.splTokens.filter(token => {
            // Skip NET_WORTH token as it's handled separately
            if (token.symbol === 'NET_WORTH') return false;
            
            const isValid = token && 
              typeof token.usdValue === 'number' && 
              isFinite(token.usdValue) && 
              token.usdValue > 0 &&
              token.decimals >= 0;
            
            if (!isValid && token.usdValue !== 0) {
              console.warn(`Invalid token value detected:`, {
                symbol: token.symbol,
                usdValue: token.usdValue,
                decimals: token.decimals
              });
            }
            return isValid;
          });

          // Calculate total USD value from valid tokens
          splTokensUsdValue = parseFloat(
            validTokens.reduce((sum, token) => sum + token.usdValue, 0).toFixed(2)
          );
          console.log('SPL tokens USD value (excluding NET_WORTH):', splTokensUsdValue);

          // Log valid tokens with value for debugging
          const tokensWithValue = validTokens.map(token => ({
            symbol: token.symbol,
            balance: parseFloat((token.balance / Math.pow(10, token.decimals)).toFixed(token.decimals)),
            usdValue: parseFloat(token.usdValue.toFixed(2))
          }));
          console.log('Valid SPL tokens with value:', tokensWithValue);

          // Add SPL tokens value to total
          totalUSD = parseFloat((totalUSD + splTokensUsdValue).toFixed(2));
          console.log('New total including SPL tokens:', totalUSD);
        }
      }

      const endTime = performance.now();
      console.log(`Fetch completed in ${Math.round(endTime - startTime)}ms`);
      console.log('USD values:', usdValues);
      console.log('Total treasury value in USD (including SPL tokens):', totalUSD);
      console.log('Individual balances:', this.balances);

      // Save to cache AFTER calculating the total with SPL tokens
      this.saveToCache();

      // Notify subscribers with the new data
      this.notifySubscribers();

      // Reset fetching flag
      this.isFetching = false;

      return {
        balances: { ...this.balances },
        prices: { ...this.prices },
        usdValues, // Include the USD values for each cryptocurrency
        splTokens: [...this.splTokens], // Include SPL tokens
        splTokensUsdValue, // Total USD value of SPL tokens
        totalUSD,
        lastUpdated: this.lastUpdated
      };
    } catch (error) {
      console.error('Error fetching all balances:', error);

      // Calculate individual USD values even in case of error
      const usdValues = {
        btc: this.balances.btc * this.prices.btc,
        eth: this.balances.eth * this.prices.eth,
        sol: this.balances.sol * this.prices.sol
      };

      // Calculate initial total from main cryptocurrencies
      let totalUSD = Object.values(usdValues).reduce((sum, value) => sum + value, 0);
      console.log('Error case - Initial total from main cryptocurrencies:', totalUSD);

      // Check if we have a NET_WORTH token from Solana.fm even in error case
      const netWorthToken = this.splTokens && Array.isArray(this.splTokens) ?
        this.splTokens.find(token => token.symbol === 'NET_WORTH') : null;
      
      if (netWorthToken && typeof netWorthToken.usdValue === 'number' && 
          isFinite(netWorthToken.usdValue) && netWorthToken.usdValue > 0) {
        // If we have a valid NET_WORTH token from Solana.fm, use it for the Solana value
        console.log('Error case - Using Solana.fm NET_WORTH token for Solana value:', netWorthToken.usdValue);
        
        // Subtract the current SOL value from the total and add the NET_WORTH value instead
        totalUSD = totalUSD - usdValues.sol + netWorthToken.usdValue;
        
        // Update the SOL USD value to the NET_WORTH value
        usdValues.sol = netWorthToken.usdValue;
        
        console.log('Error case - Updated total using Solana.fm NET_WORTH:', totalUSD);
      } else {
        // Calculate total USD value from SPL tokens even in case of error
        let splTokensUsdValue = 0;
        if (this.splTokens && this.splTokens.length > 0) {
          // Filter out NET_WORTH token as it's handled separately
          const regularTokens = this.splTokens.filter(token => token.symbol !== 'NET_WORTH');
          splTokensUsdValue = regularTokens.reduce((sum, token) => sum + (token.usdValue || 0), 0);
          console.log('Error case - SPL tokens USD value (excluding NET_WORTH):', splTokensUsdValue);

          // Add SPL tokens value to total
          totalUSD += splTokensUsdValue;
          console.log('Error case - New total including SPL tokens:', totalUSD);
        }
      }

      // Reset fetching flag
      this.isFetching = false;

      // Notify subscribers even in case of an error
      this.notifySubscribers();

      return {
        balances: { ...this.balances },
        prices: { ...this.prices },
        usdValues, // Include the USD values for each cryptocurrency
        splTokens: [...this.splTokens], // Include SPL tokens
        splTokensUsdValue, // Total USD value of SPL tokens
        totalUSD,
        lastUpdated: this.lastUpdated || new Date()
      };
    }
  }

  // Get current balances and calculate total in USD with validation
  getBalances() {
    try {
      // Validate and calculate individual USD values for main cryptocurrencies
      const usdValues = {
        btc: this.balances.btc && this.prices.btc ? parseFloat((this.balances.btc * this.prices.btc).toFixed(2)) : 0,
        eth: this.balances.eth && this.prices.eth ? parseFloat((this.balances.eth * this.prices.eth).toFixed(2)) : 0,
        sol: this.balances.sol && this.prices.sol ? parseFloat((this.balances.sol * this.prices.sol).toFixed(2)) : 0
      };

      // Validate USD values
      Object.entries(usdValues).forEach(([currency, value]) => {
        if (!isFinite(value) || value < 0) {
          console.error(`Invalid USD value for ${currency} in getBalances:`, value);
          usdValues[currency] = 0;
        }
      });

      // Calculate total USD value from main cryptocurrencies
      let totalUSD = parseFloat(Object.values(usdValues).reduce((sum, value) => sum + value, 0).toFixed(2));

      // Calculate total USD value from SPL tokens with validation
      let splTokensUsdValue = 0;
      let validSplTokens = [];
      
      if (this.splTokens && Array.isArray(this.splTokens) && this.splTokens.length > 0) {
        // Filter and validate each token's USD value
        validSplTokens = this.splTokens.filter(token => {
          const isValid = token && 
            typeof token.usdValue === 'number' && 
            isFinite(token.usdValue) && 
            token.usdValue > 0 &&
            token.decimals >= 0;
          
          if (!isValid && token.usdValue !== 0) {
            console.warn(`Invalid token value detected in getBalances:`, {
              symbol: token.symbol,
              usdValue: token.usdValue,
              decimals: token.decimals
            });
          }
          return isValid;
        });

        // Calculate total USD value from valid tokens
        splTokensUsdValue = parseFloat(
          validSplTokens.reduce((sum, token) => sum + token.usdValue, 0).toFixed(2)
        );
        totalUSD = parseFloat((totalUSD + splTokensUsdValue).toFixed(2));
      }

      return {
        balances: { 
          btc: parseFloat(this.balances.btc.toFixed(8)),
          eth: parseFloat(this.balances.eth.toFixed(18)),
          sol: parseFloat(this.balances.sol.toFixed(9))
        },
        prices: { 
          btc: parseFloat(this.prices.btc.toFixed(2)),
          eth: parseFloat(this.prices.eth.toFixed(2)),
          sol: parseFloat(this.prices.sol.toFixed(2))
        },
        usdValues,
        splTokens: validSplTokens,
        splTokensUsdValue,
        totalUSD,
        lastUpdated: this.lastUpdated || new Date(),
        isFromCache: this.isFromCache,
        isFetching: this.isFetching
      };
    } catch (error) {
      console.error('Error in getBalances:', error);
      // Return safe default values
      return {
        balances: { btc: 0, eth: 0, sol: 0 },
        prices: { btc: 0, eth: 0, sol: 0 },
        usdValues: { btc: 0, eth: 0, sol: 0 },
        splTokens: [],
        splTokensUsdValue: 0,
        totalUSD: 0,
        lastUpdated: this.lastUpdated || new Date(),
        isFromCache: this.isFromCache,
        isFetching: this.isFetching
      };
    }
  }

  /**
   * Test function to verify Solana balance fetching
   * This is used for debugging and testing the Solana balance fetching
   */
  async testSolanaBalance() {
    console.log('Starting Solana balance test...');
    console.log('Current SOL balance:', this.balances.sol);

    try {
      // Try the Shyft all_tokens endpoint first
      console.log('Testing Shyft all_tokens endpoint...');
      const shyftAllTokensResult = await this.fetchSolanaBalanceFromShyftAllTokens();
      console.log('Shyft all_tokens result:', shyftAllTokensResult);

      // Process SPL tokens if available
      if (shyftAllTokensResult && shyftAllTokensResult.tokens && shyftAllTokensResult.tokens.length > 0) {
        console.log(`Found ${shyftAllTokensResult.tokens.length} SPL tokens`);

        // Map tokens to CoinGecko IDs
        this.mapTokensToCoinGeckoIds(shyftAllTokensResult.tokens);

        // Get list of CoinGecko IDs to fetch prices for
        const coinGeckoIds = shyftAllTokensResult.tokens
          .filter(token => token.coingeckoId)
          .map(token => token.coingeckoId);

        if (coinGeckoIds.length > 0) {
          // Fetch prices for tokens
          const tokenPrices = await this.fetchTokenPrices(coinGeckoIds);

          // Update token USD values
          for (const token of shyftAllTokensResult.tokens) {
            if (token.coingeckoId && tokenPrices[token.coingeckoId]) {
              const price = tokenPrices[token.coingeckoId];
              // Calculate USD value based on token decimals
              const divisor = Math.pow(10, token.decimals);
              const actualBalance = token.balance / divisor;
              token.usdValue = actualBalance * price;
              console.log(`${token.symbol} price: ${price}, USD value: ${token.usdValue}`);
            }
          }
        }

        // Store the tokens
        this.splTokens = shyftAllTokensResult.tokens;
      }

      // Try the regular Shyft endpoint
      console.log('Testing regular Shyft endpoint...');
      const shyftBalance = await this.fetchSolanaBalanceFromShyft();
      console.log('Regular Shyft result:', shyftBalance);

      // Try the Solscan endpoint
      console.log('Testing Solscan endpoint...');
      const solscanBalance = await this.fetchSolanaBalanceFromSolscan();
      console.log('Solscan result:', solscanBalance);

      // Try the Solflare endpoint
      console.log('Testing Solflare endpoint...');
      const solflareBalance = await this.fetchSolanaBalanceFromSolflare();
      console.log('Solflare result:', solflareBalance);

      // Try the first RPC endpoint
      console.log('Testing first RPC endpoint...');
      const rpcBalance = await this.fetchSolanaBalanceFromRPC(SOLANA_RPC_ENDPOINTS[0]);
      console.log('First RPC result:', rpcBalance);

      // Now try the full fetchSolanaBalance method
      console.log('Testing full fetchSolanaBalance method...');
      const fullBalance = await this.fetchSolanaBalance();
      console.log('Full balance result:', fullBalance);

      return {
        shyftAllTokensResult,
        shyftBalance,
        solscanBalance,
        solflareBalance,
        rpcBalance,
        fullBalance,
        currentBalance: this.balances.sol,
        splTokens: this.splTokens,
        splTokensCount: this.splTokens.length,
        splTokensWithValue: this.splTokens.filter(t => t.usdValue > 0).length,
        splTokensTotalValue: this.splTokens.reduce((sum, t) => sum + (t.usdValue || 0), 0)
      };
    } catch (error) {
      console.error('Error in testSolanaBalance:', error);
      return {
        error: error.message,
        currentBalance: this.balances.sol
      };
    }
  }
}

const service = new TreasuryBalanceService();

// Expose to window for debugging
if (typeof window !== 'undefined') {
  window.TreasuryBalanceService = service;
}

export default service;
