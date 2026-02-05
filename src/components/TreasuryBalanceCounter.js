import React, { useState, useEffect } from 'react';
import styled, { keyframes } from 'styled-components';
import { Card, Heading, Text, Flex, Button } from '../styles/StyledComponents';
import treasuryBalanceService from '../utils/TreasuryBalanceService';
import QRCodeModal from './QRCodeModal';

// Import crypto icons
import btcIcon from '../assets/btc.svg';
import ethIcon from '../assets/eth.svg';
import solIcon from '../assets/sol.svg';

// Skeleton loading animation
const shimmer = keyframes`
  0% {
    background-position: -200px 0;
  }
  100% {
    background-position: 200px 0;
  }
`;

// Animation for the gradient background
const gradientAnimation = keyframes`
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
`;

const CounterCard = styled(Card)`
  position: relative;
  overflow: hidden;
  padding: 24px;
  margin-bottom: 24px;
  background: linear-gradient(135deg, rgba(26, 35, 50, 0.85) 0%, rgba(15, 22, 36, 0.9) 100%);
  border: 1px solid rgba(108, 92, 231, 0.3);
  backdrop-filter: blur(15px);
  -webkit-backdrop-filter: blur(15px);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
  height: 100%;
  min-height: 450px;
  display: flex;
  flex-direction: column;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: radial-gradient(circle at 90% 10%, rgba(108, 92, 231, 0.25) 0%, transparent 70%);
    z-index: 0;
  }

  @media (max-width: 992px) {
    margin-top: 20px;
  }

  @media (max-width: 480px) {
    padding: 16px;
    min-height: auto;
  }
`;

const CounterContent = styled.div`
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  height: 100%;
`;

const TotalAmount = styled.div`
  font-size: 42px;
  font-weight: 800;
  margin: 16px 0;
  background: linear-gradient(90deg, #3f87a6, #ebf8e1, #f69d3c, #561423, #3f87a6);
  background-size: 300% 100%;
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  text-shadow: 0 2px 10px rgba(63, 135, 166, 0.3);
  letter-spacing: -0.5px;
  animation: ${gradientAnimation} 6s linear infinite;
  transform: translateZ(0); /* Hardware acceleration */
  word-break: break-all;

  @media (max-width: 480px) {
    font-size: 32px;
  }
`;

const RefreshButton = styled(Button)`
  padding: 8px 16px;
  font-size: 14px;
  margin-top: auto;
  align-self: flex-start;
`;

const CryptoBreakdown = styled.div`
  margin-top: 16px;
  flex-grow: 1;
`;

const CryptoItem = styled(Flex)`
  margin-bottom: 12px;
  padding: 12px;
  background-color: rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  transition: all 0.3s ease;
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.05);
  cursor: pointer;
  position: relative;

  &:hover {
    background-color: rgba(255, 255, 255, 0.15);
    transform: translateY(-2px);
    box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
  }

  &::after {
    content: 'Click for QR';
    position: absolute;
    top: 50%;
    right: 12px;
    transform: translateY(-50%);
    font-size: 10px;
    color: rgba(255, 255, 255, 0.5);
    background-color: rgba(108, 92, 231, 0.2);
    padding: 2px 6px;
    border-radius: 4px;
    opacity: 0;
    transition: opacity 0.2s ease;
  }

  &:hover::after {
    opacity: 1;
  }

  @media (max-width: 768px) {
    &::after {
      content: 'Tap for QR';
    }
  }
`;

const CryptoIcon = styled.img`
  width: 24px;
  height: 24px;
  margin-right: 12px;
`;

const CryptoName = styled.div`
  font-weight: 600;
  color: var(--text-primary);
`;

const CryptoBalance = styled.div`
  font-weight: 500;
  color: var(--text-secondary);
`;

const CryptoValue = styled.div`
  font-weight: 600;
  background: linear-gradient(90deg, #3f87a6, #ebf8e1, #f69d3c, #561423, #3f87a6);
  background-size: 300% 100%;
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  text-shadow: 0 1px 5px rgba(63, 135, 166, 0.2);
  animation: ${gradientAnimation} 6s linear infinite;
  transform: translateZ(0); /* Hardware acceleration */
`;

// Skeleton loading components
const SkeletonBase = styled.div`
  background: linear-gradient(90deg, rgba(255, 255, 255, 0.05) 25%, rgba(255, 255, 255, 0.1) 50%, rgba(255, 255, 255, 0.05) 75%);
  background-size: 200px 100%;
  animation: ${shimmer} 1.5s infinite linear;
  border-radius: 4px;
  height: ${props => props.height || '20px'};
  width: ${props => props.width || '100%'};
  margin-bottom: ${props => props.mb || '8px'};
  opacity: ${props => props.isloading === 'true' ? '1' : '0'};
  transition: opacity 0.3s ease;
`;

const SkeletonTitle = styled(SkeletonBase)`
  height: 32px;
  width: 70%;
  margin-bottom: 24px;
`;

const SkeletonAmount = styled(SkeletonBase)`
  height: 48px;
  width: 60%;
  margin-bottom: 16px;
`;

const SkeletonText = styled(SkeletonBase)`
  height: 16px;
  width: ${props => props.width || '80%'};
`;

const SkeletonCryptoItem = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  background-color: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  margin-bottom: 12px;
`;

const SkeletonIcon = styled(SkeletonBase)`
  height: 24px;
  width: 24px;
  border-radius: 50%;
  margin-right: 12px;
`;

const LoadingOverlay = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(15, 22, 36, 0.8);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 2;
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  border-radius: 16px;
  opacity: ${props => props.initialload === 'true' ? '1' : '0'};
  pointer-events: ${props => props.initialload === 'true' ? 'auto' : 'none'};
  transition: opacity 0.3s ease;
`;

const LoadingSpinner = styled.div`
  border: 3px solid rgba(255, 255, 255, 0.1);
  border-top: 3px solid var(--primary);
  border-radius: 50%;
  width: 30px;
  height: 30px;
  animation: spin 1s linear infinite;

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

const TreasuryBalanceCounter = () => {
  const [balanceData, setBalanceData] = useState({
    balances: { btc: 0, eth: 0, sol: 0 },
    prices: { btc: 0, eth: 0, sol: 0 },
    usdValues: { btc: 0, eth: 0, sol: 0 },
    splTokens: [],
    splTokensUsdValue: 0,
    totalUSD: 0,
    lastUpdated: null
  });

  // Loading states
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);
  const [error, setError] = useState(null);
  const [debugMode, setDebugMode] = useState(false);
  const [solanaTestResults, setSolanaTestResults] = useState(null);

  // QR code modal states
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [selectedCrypto, setSelectedCrypto] = useState(null);

  // Function to fetch balances with progressive loading
  const fetchBalances = async (forceRefresh = false) => {
    console.log('%c[DEBUG-UI] Starting balance fetch...', 'background: #4b0082; color: #fff');
    console.log('%c[DEBUG-UI] Current timestamp:', 'background: #4b0082; color: #fff', new Date().toISOString());

    // If this is a manual refresh, show the refreshing state
    if (forceRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    setError(null);

    try {
      // First, try to get cached data immediately
      const cachedData = treasuryBalanceService.getBalances();

      // If we have cached data and this is the initial load, show it immediately
      if (initialLoad && cachedData.lastUpdated) {
        console.log('%c[DEBUG-UI] Using cached data for initial render', 'background: #4b0082; color: #fff');
        setBalanceData(validateData(cachedData));
        setInitialLoad(false);
        setIsLoading(false);
      }

      // Then fetch fresh data (or use cache if it's still valid)
      console.log('%c[DEBUG-UI] Calling treasuryBalanceService.fetchAllBalances()', 'background: #4b0082; color: #fff');
      console.time('UI-Balance-Fetch');
      const data = await treasuryBalanceService.fetchAllBalances(forceRefresh);
      console.timeEnd('UI-Balance-Fetch');
      console.log('%c[DEBUG-UI] Received data from service:', 'background: #4b0082; color: #fff', JSON.stringify(data));

      // Validate and set the data
      const validatedData = validateData(data);
      console.log('Validated balance data:', validatedData);
      setBalanceData(validatedData);
    } catch (err) {
      console.error('Error fetching treasury balances:', err);
      setError('Failed to fetch current balances. Please try again later.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
      setInitialLoad(false);
    }
  };

  // Helper function to validate data
  const validateData = (data) => {
    console.log('%c[DEBUG-UI] Validating data...', 'background: #4b0082; color: #fff');

    if (!data || typeof data !== 'object') {
      console.error('%c[DEBUG-UI] Invalid data format:', 'background: #f00; color: #fff', data);
      throw new Error('Invalid data returned from service');
    }

    // Parse all numeric values
    const btcValue = parseFloat(data.usdValues?.btc || 0);
    const ethValue = parseFloat(data.usdValues?.eth || 0);
    const solValue = parseFloat(data.usdValues?.sol || 0);
    const splTokensValue = parseFloat(data.splTokensUsdValue || 0);
    const totalFromService = parseFloat(data.totalUSD || 0);

    // Check if we have a NET_WORTH token (from Solana.fm)
    const hasNetWorthData = data.splTokens && data.splTokens.some(token => token.symbol === 'NET_WORTH');
    
    let finalSolValue;
    if (hasNetWorthData) {
      // If we have net worth data from Solana.fm, use it as the total Solana value
      const netWorthToken = data.splTokens.find(token => token.symbol === 'NET_WORTH');
      
      // Only use NET_WORTH if it's greater than 0
      if (netWorthToken && netWorthToken.usdValue > 0) {
        finalSolValue = netWorthToken.usdValue;
        console.log('Using Solana.fm net worth for SOL value:', finalSolValue);
      } else {
        // Fallback to calculated value if NET_WORTH is 0 or invalid
        finalSolValue = solValue + splTokensValue;
        console.log('Net Worth is 0 or invalid, using combined SOL + SPL tokens value:', finalSolValue);
      }
    } else {
      // Otherwise, combine native SOL + SPL tokens as before
      finalSolValue = solValue + splTokensValue;
      console.log('Using combined SOL + SPL tokens value:', finalSolValue);
    }

    // Calculate our own total to verify - ensure we include SPL tokens value
    const calculatedTotal = btcValue + ethValue + finalSolValue;

    // Log raw data for debugging
    console.log('%c[DEBUG-UI] Raw data from service:', 'background: #4b0082; color: #fff', {
      btc: data.balances?.btc,
      eth: data.balances?.eth,
      sol: data.balances?.sol,
      btcValue,
      ethValue,
      solValue,
      splTokensValue,
      finalSolValue,
      totalFromService,
      calculatedTotal,
      splTokensCount: data.splTokens?.length || 0,
      hasNetWorthData
    });

    // Ensure all required properties exist
    const validatedData = {
      balances: {
        btc: parseFloat(data.balances?.btc || 0),
        eth: parseFloat(data.balances?.eth || 0),
        sol: parseFloat(data.balances?.sol || 0)
      },
      prices: {
        btc: parseFloat(data.prices?.btc || 0),
        eth: parseFloat(data.prices?.eth || 0),
        sol: parseFloat(data.prices?.sol || 0)
      },
      usdValues: {
        btc: btcValue,
        eth: ethValue,
        sol: finalSolValue  // This includes SPL tokens value or NET_WORTH from Solana.fm
      },
      // Include SPL tokens data
      splTokens: Array.isArray(data.splTokens) ? data.splTokens : [],
      splTokensUsdValue: splTokensValue,
      // Use the calculated total to ensure it includes SPL tokens
      totalUSD: calculatedTotal,
      lastUpdated: data.lastUpdated || new Date()
    };

    // Check for zero balances
    if (validatedData.balances.eth === 0) {
      console.warn('%c[DEBUG-UI] WARNING: ETH balance is zero!', 'background: #f00; color: #fff');
    }

    if (validatedData.balances.sol === 0) {
      console.warn('%c[DEBUG-UI] WARNING: SOL balance is zero!', 'background: #f00; color: #fff');
    }

    return validatedData;
  };

  // Handle manual refresh
  const handleRefresh = () => {
    fetchBalances(true); // Force refresh
  };

  // Test Solana balance fetching
  const testSolanaBalance = async () => {
    try {
      setSolanaTestResults({ testing: true });
      const results = await treasuryBalanceService.testSolanaBalance();
      console.log('Solana balance test results:', results);
      setSolanaTestResults(results);
    } catch (error) {
      console.error('Error testing Solana balance:', error);
      setSolanaTestResults({ error: error.message });
    }
  };

  // Toggle debug mode with Ctrl+Shift+D
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        setDebugMode(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Initial fetch and subscription setup
  useEffect(() => {
    // Subscribe to balance updates from the service
    const handleBalanceUpdate = (newData) => {
      console.log('%c[TreasuryBalanceCounter] Received update from service:', 'color: #6c5ce7', newData);
      if (newData) {
        setBalanceData(validateData(newData));
        
        // Update loading states based on the data received
        if (newData.lastUpdated) {
          setInitialLoad(false);
          setIsLoading(false);
        }
      }
    };

    // Subscribe to the service - this will also trigger an immediate callback with current data
    treasuryBalanceService.subscribe(handleBalanceUpdate);

    // Only perform an initial fetch if we don't have valid data yet
    const currentData = treasuryBalanceService.getBalances();
    if (!currentData.lastUpdated || isDataStale()) {
      fetchBalances();
    } else {
      setBalanceData(validateData(currentData));
      setInitialLoad(false);
      setIsLoading(false);
    }

    // Clean up subscription on component unmount
    return () => {
      treasuryBalanceService.unsubscribe(handleBalanceUpdate);
    };
  }, []);

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  };

  const formatCrypto = (value, symbol) => {
    let precision = 6;
    if (symbol === 'BTC') precision = 8;
    if (symbol === 'SOL') precision = 9;
    return `${parseFloat(value).toFixed(precision)} ${symbol}`;
  };

  const cryptoData = [
    { id: 'btc', name: 'Bitcoin', symbol: 'BTC', icon: btcIcon },
    { id: 'eth', name: 'Ethereum', symbol: 'ETH', icon: ethIcon },
    { id: 'sol', name: 'Solana', symbol: 'SOL', icon: solIcon }
  ];

  const isDataStale = () => {
    if (!balanceData.lastUpdated) return false;
    const now = new Date();
    const lastUpdate = new Date(balanceData.lastUpdated);
    const ageInMinutes = (now - lastUpdate) / (1000 * 60);
    return ageInMinutes > 15; // Consider stale after 15 minutes
  };

  const handleForceRefresh = async () => {
    setIsRefreshing(true);
    try {
      // Use the service's method to trigger an update
      await treasuryBalanceService.fetchAllBalances(true);
    } catch (error) {
      console.error('Error during force refresh:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <CounterCard>
      {/* QR Code Modal */}
      {selectedCrypto && (
        <QRCodeModal
          isOpen={qrModalOpen}
          onClose={() => setQrModalOpen(false)}
          cryptoType={selectedCrypto.id}
          cryptoName={selectedCrypto.name}
          cryptoIcon={selectedCrypto.icon}
        />
      )}

      {/* Only show full overlay on initial load */}
      <LoadingOverlay initialload={initialLoad.toString()}>
        <LoadingSpinner />
      </LoadingOverlay>

      <CounterContent>
        <Flex justify="space-between" align="center">
          <Heading level={3} style={{
            color: 'white',
            WebkitBackgroundClip: 'unset',
            WebkitTextFillColor: 'white',
            backgroundImage: 'none',
            textShadow: '0 2px 10px rgba(0, 0, 0, 0.2)',
            margin: 0
          }}>
            Total Funds Raised
          </Heading>
          <Flex align="center" gap="10px">
            <button 
              onClick={handleForceRefresh}
              disabled={isRefreshing}
              style={{
                background: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                color: 'white',
                borderRadius: '4px',
                padding: '4px 8px',
                fontSize: '10px',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              {isRefreshing ? 'Refreshing...' : 'Force Refresh'}
            </button>
            {isRefreshing && <LoadingSpinner style={{ width: '16px', height: '16px', borderWidth: '2px' }} />}
          </Flex>
        </Flex>

        {/* Skeleton or actual amount */}
        {isLoading && !balanceData.lastUpdated ? (
          <SkeletonAmount isloading="true" />
        ) : (
          <TotalAmount>
            {formatCurrency(balanceData.totalUSD)}
          </TotalAmount>
        )}

        {/* Last updated text or skeleton */}
        {isLoading && !balanceData.lastUpdated ? (
          <SkeletonText isloading="true" width="60%" />
        ) : (
          <Flex direction="column">
            <Flex align="center" gap="8px" mb="4px">
              <Text size="14px" style={{ 
                color: isDataStale() ? 'var(--error)' : 'var(--text-secondary)',
                display: 'flex',
                alignItems: 'center'
              }}>
                {balanceData.lastUpdated
                  ? `Last updated: ${balanceData.lastUpdated.toLocaleString()}`
                  : 'Fetching latest balances...'}
              </Text>
              
              {balanceData.isFromCache && (
                <span style={{ 
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  color: 'rgba(255, 255, 255, 0.4)',
                  padding: '1px 6px',
                  borderRadius: '3px',
                  fontSize: '9px',
                  fontWeight: 'bold',
                  textTransform: 'uppercase'
                }}>
                  Cached
                </span>
              )}

              {isDataStale() && (
                <span style={{ 
                  color: 'var(--error)', 
                  fontSize: '11px', 
                  fontWeight: 'bold' 
                }}>
                  (Stale)
                </span>
              )}
              
              {(isRefreshing || balanceData.isFetching) && (
                <LoadingSpinner style={{ width: '12px', height: '12px', borderWidth: '1.5px' }} />
              )}
            </Flex>
          </Flex>
        )}

        {error && (
          <Text size="14px" mb="16px" style={{ color: 'var(--error)' }}>
            {error}
          </Text>
        )}

        <CryptoBreakdown>
          <Text size="16px" mb="16px" style={{
            fontWeight: 600,
            color: 'white',
            textShadow: '0 2px 10px rgba(0, 0, 0, 0.2)'
          }}>
            Treasury Balances
          </Text>

          {/* Skeleton or actual crypto items */}
          {isLoading && !balanceData.lastUpdated ? (
            // Skeleton loading state
            <>
              {[1, 2, 3].map(index => (
                <SkeletonCryptoItem key={index}>
                  <Flex align="center">
                    <SkeletonIcon isloading="true" />
                    <SkeletonText isloading="true" width="80px" />
                  </Flex>
                  <Flex direction="column" align="flex-end">
                    <SkeletonText isloading="true" width="100px" mb="4px" />
                    <SkeletonText isloading="true" width="70px" />
                  </Flex>
                </SkeletonCryptoItem>
              ))}
            </>
          ) : (
            // Actual data
            <>
              {/* Main cryptocurrencies */}
              {cryptoData.map(crypto => (
                <CryptoItem
                  key={crypto.id}
                  justify="space-between"
                  align="center"
                  onClick={() => {
                    setSelectedCrypto(crypto);
                    setQrModalOpen(true);
                  }}
                >
                  <Flex align="center">
                    <CryptoIcon src={crypto.icon} alt={crypto.name} />
                    <CryptoName>{crypto.name}</CryptoName>
                  </Flex>

                  <Flex direction="column" align="flex-end">
                    <CryptoBalance>
                      {formatCrypto(balanceData.balances[crypto.id], crypto.symbol)}
                    </CryptoBalance>
                    <CryptoValue>
                      {formatCurrency(balanceData.usdValues[crypto.id])}
                    </CryptoValue>
                  </Flex>
                </CryptoItem>
              ))}

              {/* SPL Tokens */}
              {balanceData.splTokens && balanceData.splTokens.length > 0 && (
                <>
                  <Text size="14px" mb="12px" mt="16px" style={{
                    fontWeight: 600,
                    color: 'white',
                    textShadow: '0 2px 10px rgba(0, 0, 0, 0.2)'
                  }}>
                    Solana SPL Tokens
                  </Text>

                  {balanceData.splTokens
                    .filter(token => token.usdValue > 0) // Only show tokens with value
                    .sort((a, b) => b.usdValue - a.usdValue) // Sort by value (highest first)
                    .map(token => (
                      <CryptoItem
                        key={token.mint}
                        justify="space-between"
                        align="center"
                      >
                        <Flex align="center">
                          {token.logoURI ? (
                            <CryptoIcon src={token.logoURI} alt={token.symbol} />
                          ) : (
                            <div style={{
                              width: '24px',
                              height: '24px',
                              borderRadius: '50%',
                              backgroundColor: 'rgba(255, 255, 255, 0.1)',
                              marginRight: '12px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '10px'
                            }}>
                              {token.symbol.substring(0, 2)}
                            </div>
                          )}
                          <CryptoName>{token.name || token.symbol}</CryptoName>
                        </Flex>

                        <Flex direction="column" align="flex-end">
                          <CryptoBalance>
                            {(token.balance / Math.pow(10, token.decimals)).toFixed(token.decimals > 6 ? 6 : token.decimals)} {token.symbol}
                          </CryptoBalance>
                          <CryptoValue>
                            {formatCurrency(token.usdValue)}
                          </CryptoValue>
                        </Flex>
                      </CryptoItem>
                    ))
                  }

                  {/* Total SPL Tokens Value */}
                  {balanceData.splTokensUsdValue > 0 && (
                    <div style={{
                      marginTop: '12px',
                      padding: '8px 12px',
                      backgroundColor: 'rgba(255, 255, 255, 0.05)',
                      borderRadius: '8px',
                      display: 'flex',
                      justifyContent: 'space-between'
                    }}>
                      <Text size="14px" style={{ fontWeight: 600, color: 'white' }}>
                        Total SPL Tokens Value
                      </Text>
                      <CryptoValue>
                        {formatCurrency(balanceData.splTokensUsdValue)}
                      </CryptoValue>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </CryptoBreakdown>

        {/* Debug information - press Ctrl+Shift+D to toggle */}
        {debugMode && (
          <div style={{
            marginTop: '20px',
            padding: '10px',
            backgroundColor: 'rgba(0,0,0,0.5)',
            borderRadius: '8px',
            fontSize: '12px'
          }}>
            <h4 style={{ color: 'yellow', marginBottom: '8px' }}>Debug Info</h4>
            <div style={{ marginBottom: '10px' }}>
              <button
                onClick={testSolanaBalance}
                style={{
                  backgroundColor: '#6c5ce7',
                  color: 'white',
                  border: 'none',
                  padding: '5px 10px',
                  borderRadius: '4px',
                  marginRight: '10px',
                  cursor: 'pointer'
                }}
              >
                Test Solana Balance
              </button>
              <span style={{ color: '#aaa', fontSize: '10px' }}>
                {solanaTestResults?.testing ? 'Testing...' : ''}
              </span>
            </div>

            <pre style={{
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-all',
              color: '#aaa',
              fontSize: '10px'
            }}>
              {JSON.stringify({
                balances: balanceData.balances,
                prices: balanceData.prices,
                usdValues: balanceData.usdValues,
                mainCryptoTotal: (
                  balanceData.usdValues.btc +
                  balanceData.usdValues.eth +
                  balanceData.usdValues.sol
                ).toFixed(2),
                splTokensCount: balanceData.splTokens?.length || 0,
                splTokensWithValue: balanceData.splTokens?.filter(t => t.usdValue > 0)?.length || 0,
                splTokensUsdValue: balanceData.splTokensUsdValue,
                splTokens: balanceData.splTokens
                  ?.filter(t => t.usdValue > 0)
                  ?.map(t => ({
                    symbol: t.symbol,
                    usdValue: t.usdValue
                  })) || [],
                totalUSD: balanceData.totalUSD,
                calculatedTotal: (
                  balanceData.usdValues.btc +
                  balanceData.usdValues.eth +
                  balanceData.usdValues.sol +
                  balanceData.splTokensUsdValue
                ).toFixed(2),
                isLoading,
                isRefreshing,
                initialLoad
              }, null, 2)}
            </pre>

            {solanaTestResults && !solanaTestResults.testing && (
              <div style={{ marginTop: '10px' }}>
                <h5 style={{ color: '#6c5ce7', marginBottom: '5px' }}>Solana Test Results:</h5>
                <pre style={{
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-all',
                  color: '#aaa',
                  fontSize: '10px',
                  maxHeight: '200px',
                  overflow: 'auto'
                }}>
                  {JSON.stringify(solanaTestResults, null, 2)}
                </pre>
              </div>
            )}

            <div style={{ marginTop: '8px', fontSize: '10px', color: '#aaa' }}>
              <p>BTC Addresses:</p>
              <ul style={{ marginLeft: '15px' }}>
                <li>Legacy: 1Kr3GkJnBZeeQZZoiYjHoxhZjDsSby9d4p</li>
                <li>Taproot: bc1pl6sq6srs5vuczd7ard896cc57gg4h3mdnvjsg4zp5zs2rawqmtgsp4hh08</li>
                <li>Segwit: bc1qu7suxfua5x46e59e7a56vd8wuj3a8qj06qr42j</li>
              </ul>
              <p>ETH Address: 0x8262ab131e3f52315d700308152e166909ecfa47</p>
              <p>SOL Address: 2n8etcRuK49GUMXWi2QRtQ8YwS6nTDEUjfX7LcvKFyiV</p>
            </div>
          </div>
        )}

        {/* Refresh button with loading indicator */}
        <RefreshButton
          secondary="true"
          onClick={handleRefresh}
          disabled={isLoading || isRefreshing}
        >
          {isRefreshing ? 'Refreshing...' : 'Refresh Balances'}
        </RefreshButton>
      </CounterContent>
    </CounterCard>
  );
};

export default TreasuryBalanceCounter;
