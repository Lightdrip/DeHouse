const { Connection, PublicKey } = require('@solana/web3.js');

async function checkBalance() {
  const address = '2n8etcRuK49GUMXWi2QRtQ8YwS6nTDEUjfX7LcvKFyiV';
  const connection = new Connection('https://api.mainnet-beta.solana.com');
  
  try {
    const publicKey = new PublicKey(address);
    const balance = await connection.getBalance(publicKey);
    console.log(`Balance for ${address}: ${balance / 1e9} SOL`);
  } catch (error) {
    console.error('Error:', error);
  }
}

checkBalance();
