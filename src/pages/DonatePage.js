import React, { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import { Container, Section, Heading, Text, Button, Flex, Card, Input, Divider } from '../styles/StyledComponents';
import WalletConnectButton from '../components/WalletConnectButton';
import { useWallet } from '../utils/WalletContext';
import { useDonation } from '../utils/DonationContext';
import { QRCodeSVG } from 'qrcode.react';
import { useNavigate, useLocation } from 'react-router-dom';

// Import crypto icons
import btcIcon from '../assets/btc.svg';
import ethIcon from '../assets/eth.svg';
import solIcon from '../assets/sol.svg';
import usdcIcon from '../assets/usdc.svg';

const DonateSection = styled(Section)`
  background-color: var(--background);
`;

const CryptoCard = styled(Card)`
  margin-bottom: 48px;
  scroll-margin-top: 220px; /* Increased space for fixed header + nav + buffer */
`;

const CryptoHeader = styled(Flex)`
  margin-bottom: 24px;
`;

const CryptoIcon = styled.img`
  width: 48px;
  height: 48px;
  margin-right: 16px;
`;

const AddressContainer = styled.div`
  background-color: rgba(15, 22, 36, 0.5);
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 24px;
  position: relative;
`;

const AddressText = styled.code`
  color: var(--text-secondary);
  font-size: 14px;
  word-break: break-all;
`;

const CopyButton = styled.button`
  position: absolute;
  top: 12px;
  right: 12px;
  background-color: rgba(108, 92, 231, 0.2);
  color: var(--primary);
  border: none;
  border-radius: 4px;
  padding: 4px 8px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.3s ease;

  &:hover {
    background-color: rgba(108, 92, 231, 0.3);
  }
`;

const QRCodeContainer = styled.div`
  background-color: white;
  padding: 16px;
  border-radius: 8px;
  display: inline-block;
  margin-bottom: 24px;
  text-align: center;
`;

const QRCodeLabel = styled.div`
  margin-top: 8px;
  font-size: 12px;
  color: #333;
`;

const AmountInput = styled(Flex)`
  margin-bottom: 24px;
`;

const SuccessMessage = styled.div`
  background-color: rgba(0, 184, 148, 0.1);
  border: 1px solid var(--success);
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 24px;
  text-align: center;
`;

const JumpLinkContainer = styled(Flex)`
  position: sticky;
  top: 80px; /* Below header */
  z-index: 99;
  padding: 16px 24px;
  margin-bottom: 40px;
  background: rgba(15, 22, 36, 0.85);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.05);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
  transition: all 0.3s ease;

  @media (max-width: 768px) {
    top: 70px;
    padding: 12px 16px;
    overflow-x: auto;
    justify-content: flex-start;
    flex-wrap: nowrap;
    
    /* Hide scrollbar for cleaner look */
    &::-webkit-scrollbar {
      display: none;
    }
    -ms-overflow-style: none;
    scrollbar-width: none;
    
    button {
      flex-shrink: 0;
      white-space: nowrap;
    }
  }
`;

const CryptoDonationCard = ({ 
  cryptoId, 
  cryptoInfo, 
  cryptoAddresses, 
  exchangeRates, 
  lastUpdated, 
  isLoadingPrices, 
  fetchCryptoPrices 
}) => {
  const { isConnected } = useWallet();
  const { verifyDonation, loadUserData, loadLeaderboard, isLoading } = useDonation();
  const navigate = useNavigate();

  const [btcAddressType, setBtcAddressType] = useState('legacy');
  const [stablecoinNetwork, setStablecoinNetwork] = useState('eth');
  const [donationAmount, setDonationAmount] = useState('');
  const [usdValue, setUsdValue] = useState(0);
  const [pointsEarned, setPointsEarned] = useState(0);
  const [donationSuccess, setDonationSuccess] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState('');

  const getCurrentAddress = () => {
    if (cryptoId === 'btc') {
      return cryptoAddresses.btc[btcAddressType];
    }
    if (cryptoId === 'usdc') {
      return cryptoAddresses.usdc[stablecoinNetwork];
    }
    return cryptoAddresses[cryptoId];
  };

  const handleAmountChange = (e) => {
    const amount = e.target.value;
    setDonationAmount(amount);
    
    if (amount && !isNaN(amount)) {
      const usd = amount * exchangeRates[cryptoId];
      setUsdValue(usd);
      setPointsEarned(Math.floor(usd * 100));
    } else {
      setUsdValue(0);
      setPointsEarned(0);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    alert('Address copied to clipboard!');
  };

  const handleVerifyDonation = async () => {
    if (!isConnected) {
      alert('Please connect your wallet first');
      return;
    }

    if (!donationAmount || donationAmount <= 0) {
      alert('Please enter a valid donation amount');
      return;
    }

    setVerificationStatus('verifying');

    try {
      const txHash = prompt(`Please enter the transaction hash of your ${cryptoInfo.name} donation:`);
      
      if (!txHash || txHash.trim() === '') {
        alert('Transaction hash is required to verify your donation');
        setVerificationStatus('');
        return;
      }
      
      const result = await verifyDonation(txHash, cryptoId);
      
      if (result.verified) {
        await loadUserData();
        await loadLeaderboard();
        setDonationSuccess(true);
        setVerificationStatus('success');
      } else {
        alert(`Verification failed: ${result.message || 'Could not verify transaction'}`);
        setVerificationStatus('failed');
      }
    } catch (error) {
      console.error('Error processing donation:', error);
      setVerificationStatus('failed');
    }
  };

  return (
    <CryptoCard id={`${cryptoId}-section`}>
      <CryptoHeader align="center">
        <CryptoIcon src={cryptoInfo.icon} alt={cryptoInfo.name} />
        <div>
          <Heading level={3}>{cryptoInfo.name} Donation</Heading>
          <Text>Send {cryptoInfo.symbol} to the address below</Text>
        </div>
      </CryptoHeader>

      {donationSuccess ? (
        <SuccessMessage>
          <Heading level={4}>Donation Verified Successfully!</Heading>
          <Text mb="8px">Thank you for your donation. Your points have been added to your account.</Text>
          <Text mb="0">You earned <strong>{pointsEarned} points</strong> for your donation of {donationAmount} {cryptoInfo.symbol.split('/')[0]}.</Text>
          <Button style={{ marginTop: '16px' }} onClick={() => navigate('/leaderboard')}>
            View Leaderboard
          </Button>
        </SuccessMessage>
      ) : (
        <>
          {cryptoId === 'btc' && (
            <>
              <Heading level={4}>Choose Bitcoin Address Type</Heading>
              <Flex gap="16px" style={{ marginBottom: '24px' }}>
                {['legacy', 'taproot', 'segwit'].map(type => (
                  <Button 
                    key={type}
                    secondary={(btcAddressType !== type).toString()}
                    onClick={() => setBtcAddressType(type)}
                  >
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </Button>
                ))}
              </Flex>
            </>
          )}

          {cryptoId === 'usdc' && (
            <>
              <Heading level={4}>Choose Network for Stablecoins</Heading>
              <Flex gap="16px" style={{ marginBottom: '24px' }}>
                <Button 
                  secondary={(stablecoinNetwork !== 'eth').toString()}
                  onClick={() => setStablecoinNetwork('eth')}
                >
                  Ethereum (ERC-20)
                </Button>
                <Button 
                  secondary={(stablecoinNetwork !== 'sol').toString()}
                  onClick={() => setStablecoinNetwork('sol')}
                >
                  Solana (SPL)
                </Button>
              </Flex>
            </>
          )}

          <AddressContainer>
            <AddressText>{getCurrentAddress()}</AddressText>
            <CopyButton onClick={() => copyToClipboard(getCurrentAddress())}>Copy</CopyButton>
          </AddressContainer>

          <Flex justify="center" style={{ marginBottom: '24px' }}>
            <QRCodeContainer>
              <QRCodeSVG
                value={getCurrentAddress()}
                size={180}
                bgColor={"#ffffff"}
                fgColor={"#000000"}
                level={"L"}
                includeMargin={false}
              />
              <QRCodeLabel>Scan to send {cryptoInfo.symbol.split('/')[0]}</QRCodeLabel>
            </QRCodeContainer>
          </Flex>

          <Divider />

          <Heading level={4}>Donation Amount</Heading>
          <Text mb="16px">Enter the amount you plan to donate to calculate your points</Text>

          <Flex justify="center" align="center" style={{ marginBottom: '16px' }}>
            <Text size="14px" mb="0" style={{ color: 'var(--text-secondary)' }}>
              Current {cryptoInfo.name} Price: ${exchangeRates[cryptoId].toLocaleString()} USD
              {lastUpdated && <span> · Updated {lastUpdated.toLocaleTimeString()}</span>}
              {isLoadingPrices && <span> · Refreshing...</span>}
            </Text>
            <Button
              style={{
                marginLeft: '8px',
                padding: '4px 8px',
                fontSize: '12px',
                backgroundColor: 'transparent',
                border: '1px solid var(--primary)'
              }}
              onClick={fetchCryptoPrices}
              disabled={isLoadingPrices}
            >
              Refresh
            </Button>
          </Flex>

          <AmountInput align="center" gap="16px" wrap="wrap">
            <Input
              type="number"
              placeholder="0.00"
              style={{ maxWidth: '150px' }}
              value={donationAmount}
              onChange={handleAmountChange}
            />
            <Text size="18px" mb="0">{cryptoInfo.symbol.split('/')[0]}</Text>
            <Text size="18px" mb="0">≈ ${usdValue.toFixed(2)} USD</Text>
            <Text size="18px" mb="0" style={{ color: 'var(--primary)' }}>{pointsEarned} Points</Text>
          </AmountInput>

          <Text>After sending your donation, connect your wallet to verify the transaction and claim your points.</Text>

          <Flex justify="center" style={{ marginTop: '32px' }}>
            {!isConnected ? (
              <WalletConnectButton />
            ) : (
              <Button
                onClick={handleVerifyDonation}
                disabled={isLoading || verificationStatus === 'verifying'}
              >
                {verificationStatus === 'verifying' ? 'Verifying...' : 'Verify Donation'}
              </Button>
            )}
          </Flex>
        </>
      )}
    </CryptoCard>
  );
};

const DonatePage = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [exchangeRates, setExchangeRates] = useState({
    btc: 60000,
    eth: 3000,
    sol: 150,
    usdc: 1
  });
  const [lastUpdated, setLastUpdated] = useState(null);
  const [isLoadingPrices, setIsLoadingPrices] = useState(false);
  const [priceError, setPriceError] = useState(null);

  const cryptoAddresses = {
    btc: {
      legacy: '1Kr3GkJnBZeeQZZoiYjHoxhZjDsSby9d4p',
      taproot: 'bc1pl6sq6srs5vuczd7ard896cc57gg4h3mdnvjsg4zp5zs2rawqmtgsp4hh08',
      segwit: 'bc1qu7suxfua5x46e59e7a56vd8wuj3a8qj06qr42j'
    },
    eth: '0x8262ab131e3f52315d700308152e166909ecfa47',
    sol: '2n8etcRuK49GUMXWi2QRtQ8YwS6nTDEUjfX7LcvKFyiV',
    usdc: {
      eth: '0x8262ab131e3f52315d700308152e166909ecfa47',
      sol: '2n8etcRuK49GUMXWi2QRtQ8YwS6nTDEUjfX7LcvKFyiV'
    }
  };

  const cryptoInfo = {
    btc: { name: 'Bitcoin', symbol: 'BTC', icon: btcIcon },
    eth: { name: 'Ethereum', symbol: 'ETH', icon: ethIcon },
    sol: { name: 'Solana', symbol: 'SOL', icon: solIcon },
    usdc: { name: 'Stablecoins', symbol: 'USDC/USDT/DAI', icon: usdcIcon }
  };

  const fetchCryptoPrices = async () => {
    setIsLoadingPrices(true);
    setPriceError(null);
    try {
      const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana&vs_currencies=usd');
      if (response.ok) {
        const data = await response.json();
        setExchangeRates({
          btc: data.bitcoin?.usd || exchangeRates.btc,
          eth: data.ethereum?.usd || exchangeRates.eth,
          sol: data.solana?.usd || exchangeRates.sol,
          usdc: 1
        });
        setLastUpdated(new Date());
      } else {
        throw new Error('Failed to fetch prices');
      }
    } catch (error) {
      console.error('Error fetching crypto prices:', error);
      setPriceError('Failed to fetch current prices. Using estimated values.');
    } finally {
      setIsLoadingPrices(false);
    }
  };

  const scrollToSection = useCallback((cryptoId) => {
    const sectionId = `${cryptoId}-section`;
    const element = document.getElementById(sectionId);
    
    if (element) {
      // Calculate offset based on screen size
      // Mobile header is smaller, but we still have sticky nav
      const isMobile = window.innerWidth <= 768;
      const headerOffset = isMobile ? 70 : 90;
      const navOffset = isMobile ? 60 : 80;
      const buffer = 20; // Extra space ("millimeters")
      
      const totalOffset = headerOffset + navOffset + buffer;
      
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - totalOffset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    } else {
      console.error(`Target section "${sectionId}" not found for scrolling.`);
      // Fallback: scroll to top of donation section
      const mainSection = document.getElementById('donation-section');
      if (mainSection) {
        const offset = 150;
        const elementPosition = mainSection.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.pageYOffset - offset;
        
        window.scrollTo({
          top: offsetPosition,
          behavior: 'smooth'
        });
      }
    }
  }, []);

  useEffect(() => {
    fetchCryptoPrices();
    const intervalId = setInterval(fetchCryptoPrices, 60000);
    return () => clearInterval(intervalId);
  }, []);

  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const cryptoParam = urlParams.get('crypto');
    const scrollParam = urlParams.get('scroll');
    
    if (cryptoParam && cryptoInfo[cryptoParam] && scrollParam === 'true') {
      // Delay slightly to ensure elements are rendered
      const timer = setTimeout(() => {
        scrollToSection(cryptoParam);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [location.search, scrollToSection]);

  return (
    <DonateSection id="donation-section">
      <Container>
        <Heading level={1}>Donate to the deHouse DAO Treasury</Heading>
        <Text size="18px" mb="40px">
          Support our mission by donating to the treasury. Every $1 worth of crypto donated earns you 100 points on our leaderboard.
        </Text>

        <JumpLinkContainer gap="24px" wrap="wrap" justify="center">
          {Object.keys(cryptoInfo).map(crypto => (
            <Button
              key={crypto}
              secondary="true"
              onClick={() => scrollToSection(crypto)}
              aria-label={`Scroll to ${cryptoInfo[crypto].name} section`}
            >
              {cryptoInfo[crypto].name}
            </Button>
          ))}
        </JumpLinkContainer>

        {priceError && (
          <Text size="14px" mb="16px" style={{ color: 'var(--warning)', textAlign: 'center' }}>
            {priceError}
          </Text>
        )}

        <Flex direction="column" gap="48px">
          {Object.keys(cryptoInfo).map(cryptoId => (
            <CryptoDonationCard
              key={cryptoId}
              cryptoId={cryptoId}
              cryptoInfo={cryptoInfo[cryptoId]}
              cryptoAddresses={cryptoAddresses}
              exchangeRates={exchangeRates}
              lastUpdated={lastUpdated}
              isLoadingPrices={isLoadingPrices}
              fetchCryptoPrices={fetchCryptoPrices}
            />
          ))}
        </Flex>
      </Container>
    </DonateSection>
  );
};

export default DonatePage;
