const fetch = require('node-fetch');

async function testHelius() {
  const apiKey = '97f12880-f1a4-4ed7-bb19-00e61b9de290';
  const url = `https://mainnet.helius-rpc.com/?api-key=${apiKey}`;
  const address = '2n8etcRuK49GUMXWi2QRtQ8YwS6nTDEUjfX7LcvKFyiV';

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'getBalance',
        params: [address]
      })
    });
    const data = await response.json();
    console.log('Helius response:', JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Helius error:', error);
  }
}

testHelius();
