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

  // Set caching headers:
  // - s-maxage=300: Cache in Vercel Edge Network for 5 minutes
  // - stale-while-revalidate=600: Serve stale content for up to 10 more minutes while updating in background
  response.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');

  const balances = {
    btc: 0,
    eth: 0,
    sol: 0,
    timestamp: new Date().toISOString()
  };

  const prices = {
    btc: 0,
    eth: 0,
    sol: 0
  };

  try {
    // 1. Fetch Prices (CoinGecko)
    try {
      const priceRes = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana&vs_currencies=usd');
      if (priceRes.ok) {
        const data = await priceRes.json();
        prices.btc = data.bitcoin?.usd || 0;
        prices.eth = data.ethereum?.usd || 0;
        prices.sol = data.solana?.usd || 0;
      }
    } catch (e) {
      console.error('Price fetch failed:', e);
    }

    // 2. Fetch BTC Balance
    // Addresses
    const BTC_ADDRESSES = [
      '1Kr3GkJnBZeeQZZoiYjHoxhZjDsSby9d4p', // Legacy
      'bc1pl6sq6srs5vuczd7ard896cc57gg4h3mdnvjsg4zp5zs2rawqmtgsp4hh08', // Taproot
      'bc1qu7suxfua5x46e59e7a56vd8wuj3a8qj06qr42j' // Segwit
    ];
    
    let totalSats = 0;
    for (const address of BTC_ADDRESSES) {
      try {
        const res = await fetch(`https://blockstream.info/api/address/${address}`);
        if (res.ok) {
          const data = await res.json();
          totalSats += (data.chain_stats.funded_txo_sum - data.chain_stats.spent_txo_sum);
        } else {
            // Fallback to blockchain.info
            const fallbackRes = await fetch(`https://blockchain.info/rawaddr/${address}`);
            if (fallbackRes.ok) {
                const data = await fallbackRes.json();
                totalSats += data.final_balance;
            }
        }
      } catch (e) {
        console.error(`BTC fetch failed for ${address}:`, e);
      }
    }
    balances.btc = totalSats / 100000000;

    // 3. Fetch ETH Balance
    const ETH_ADDRESS = '0x8262ab131e3f52315d700308152e166909ecfa47';
    // Use Cloudflare RPC for reliability
    try {
      const ethRes = await fetch('https://cloudflare-eth.com', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'eth_getBalance',
          params: [ETH_ADDRESS, 'latest']
        })
      });
      
      if (ethRes.ok) {
        const data = await ethRes.json();
        if (data.result) {
            balances.eth = Number(BigInt(data.result)) / 1e18;
        }
      }
    } catch (e) {
        console.error('ETH fetch failed:', e);
    }

    // 4. Fetch SOL Balance
    const SOL_ADDRESS = '2n8etcRuK49GUMXWi2QRtQ8YwS6nTDEUjfX7LcvKFyiV';
    try {
        const solRes = await fetch('https://api.mainnet-beta.solana.com', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                jsonrpc: '2.0',
                id: 1,
                method: 'getBalance',
                params: [SOL_ADDRESS]
            })
        });

        if (solRes.ok) {
            const data = await solRes.json();
            if (data.result && data.result.value !== undefined) {
                balances.sol = Number(data.result.value) / 1000000000;
            } else {
                throw new Error('Invalid RPC response format');
            }
        } else {
            throw new Error(`RPC status ${solRes.status}`);
        }
    } catch (e) {
        console.error('SOL RPC fetch failed:', e);
        // Fallback to Shyft
        if (process.env.SHYFT_API_KEY) {
            try {
                console.log('Attempting SOL fetch via Shyft fallback...');
                const shyftRes = await fetch(`https://api.shyft.to/sol/v1/wallet/balance?network=mainnet-beta&wallet=${SOL_ADDRESS}`, {
                    headers: { 'x-api-key': process.env.SHYFT_API_KEY }
                });
                if (shyftRes.ok) {
                    const data = await shyftRes.json();
                    if (data.result && data.result.balance) {
                        balances.sol = data.result.balance;
                    }
                }
            } catch (shyftError) {
                console.error('Shyft fallback failed:', shyftError);
            }
        }
    }

    response.status(200).json({
      balances,
      prices,
      source: 'server-cache'
    });
  } catch (error) {
    console.error('Serverless function error:', error);
    response.status(500).json({ error: 'Failed to fetch treasury data' });
  }
}
