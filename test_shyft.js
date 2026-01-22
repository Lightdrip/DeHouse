const fetch = require('node-fetch');

async function testShyft() {
  const apiKey = '7rVeSXle8oRlKWe';
  const address = '2n8etcRuK49GUMXWi2QRtQ8YwS6nTDEUjfX7LcvKFyiV';
  const url = `https://api.shyft.to/sol/v1/wallet/balance?network=mainnet-beta&wallet=${address}`;

  try {
    const response = await fetch(url, {
      headers: { 'x-api-key': apiKey }
    });
    const data = await response.json();
    console.log('Shyft response:', JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Shyft error:', error);
  }
}

testShyft();
