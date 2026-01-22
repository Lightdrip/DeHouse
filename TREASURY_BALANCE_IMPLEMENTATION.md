# Treasury Balance Counter Implementation

## Overview
The Treasury Balance Counter functionality has been enhanced to reliably fetch and display real-time balance information from Bitcoin, Ethereum, and Solana treasury addresses. The implementation includes robust error handling, caching, multiple API fallbacks, and statistical analysis for accuracy.

## Key Features

1. **Multi-Chain Support**:
   - **Bitcoin**: Fetches from Blockstream and Blockchain.info (Legacy, Segwit, Taproot addresses).
   - **Ethereum**: Fetches from Etherscan, Alchemy, Blockchair, Ethplorer, and Infura.
   - **Solana**: Fetches from multiple RPC endpoints (Official, ExtrNode, Ankr, etc.) and third-party APIs (Shyft, Solscan, Solflare, Solana.fm).

2. **Reliability & Accuracy**:
   - **Parallel Fetching**: Fetches data from multiple sources simultaneously to reduce latency.
   - **Statistical Analysis**: For Solana, it calculates the median of results from multiple sources to eliminate outliers and ensure accuracy.
   - **Fallbacks**: Automatically switches to alternative APIs if the primary source fails.
   - **Retry Logic**: Implements retry mechanisms with exponential backoff for failed requests.

3. **Performance & Caching**:
   - **Caching**: Caches balance data in `localStorage` for 5 minutes (configurable) to reduce API calls and improve load times.
   - **Background Updates**: Supports background updates and "stale-while-revalidate" patterns.
   - **Dev Mode Optimization**: Skips expensive RPC calls in development mode unless necessary.

4. **User Experience**:
   - **Real-time Updates**: Auto-refresh functionality with configurable intervals.
   - **Loading States**: Visual indicators during data fetching.
   - **Formatted Display**: Shows balances with appropriate currency symbols and USD conversion.
   - **QR Codes**: Integration with QR code modal for easy donations.

## Configuration

The service is configured in `src/utils/TreasuryBalanceService.js`. Key constants include:

```javascript
// Treasury Addresses
const BTC_ADDRESSES = { ... };
const ETH_ADDRESS = '...';
const SOL_ADDRESS = '...';
```

### Environment Variables
For security and flexibility, API keys can be configured via a `.env` file. A `.env.example` file is provided as a template.

```bash
# Ethereum API Keys
ETHERSCAN_API_KEY=your_key_here
ALCHEMY_ETH_API_KEY=your_key_here
INFURA_API_KEY=your_key_here

# Solana API Keys
SHYFT_API_KEY=your_key_here
HELIUS_API_KEY=your_key_here
QUICKNODE_API_ID=your_key_here
```

If environment variables are not provided, the service falls back to default (demo) keys, which may have lower rate limits.

## Testing

Unit tests are implemented using Jest in `src/utils/TreasuryBalanceService.test.js`.

### Running Tests
To run the tests, execute:
```bash
npm test src/utils/TreasuryBalanceService.test.js
```

### Test Coverage
- **fetchPrices**: Verifies CoinGecko integration and error handling.
- **fetchBitcoinBalance**: Tests Blockstream integration and fallbacks.
- **fetchEthereumBalance**: Tests Etherscan and Alchemy integration.
- **fetchSolanaBalance**: Verifies RPC handling, parallel fetching, and statistical median calculation.
- **Caching**: Tests cache storage, retrieval, and expiration logic.

## Usage

The `TreasuryBalanceCounter` component uses the `TreasuryBalanceService` to manage data.

```javascript
// Example usage in component
useEffect(() => {
  const loadBalances = async () => {
    const data = await balanceService.fetchAllBalances();
    setBalances(data);
  };
  
  loadBalances();
  
  // Subscribe to updates
  balanceService.subscribe(handleUpdate);
  return () => balanceService.unsubscribe(handleUpdate);
}, []);
```

## Architecture

1. **TreasuryBalanceService**: Singleton class managing all data fetching and state.
2. **TreasuryBalanceCounter**: React component for UI display.
3. **Pub/Sub Pattern**: The service notifies subscribers (components) when data changes.

## Dependencies
- `@solana/web3.js`: For Solana RPC interaction.
- `@solana/spl-token`: For SPL token parsing.
- `ethers`: (Optional) For Ethereum interaction.
- `qrcode.react`: For QR code generation.
