import React, { useState, useRef, useEffect } from 'react';
import styled, { keyframes, css } from 'styled-components';
import { Container, Section, Heading, Text, Button, Flex, Card, Grid } from '../styles/StyledComponents';
import WalletConnectButton from '../components/WalletConnectButton';
import TreasuryBalanceCounter from '../components/TreasuryBalanceCounter';
import { useNavigate } from 'react-router-dom';

// Import crypto icons
import btcIcon from '../assets/btc.svg';
import ethIcon from '../assets/eth.svg';
import solIcon from '../assets/sol.svg';
import usdcIcon from '../assets/usdc.svg';

const HeroSection = styled(Section)`
  min-height: 90vh;
  display: flex;
  align-items: center;
  background: linear-gradient(135deg, rgba(15, 22, 36, 0.5) 0%, rgba(26, 35, 50, 0.5) 100%);
  background-size: cover;
  position: relative;
  overflow: hidden;
  padding: 100px 0;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: radial-gradient(circle at 20% 30%, rgba(108, 92, 231, 0.15) 0%, transparent 50%);
  }
`;

const HeroContent = styled.div`
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  position: relative;
  z-index: 2;

  @media (max-width: 992px) {
    flex-direction: column;
    align-items: center;
  }
`;

const HeroLeftColumn = styled.div`
  max-width: 850px;
  flex: 1;

  @media (max-width: 1200px) {
    max-width: 750px;
  }

  @media (max-width: 992px) {
    max-width: 100%;
    margin-bottom: 40px;
    text-align: center;
  }
`;

const HeroRightColumn = styled.div`
  width: 350px;
  flex-shrink: 0;
  margin-left: 40px;

  @media (max-width: 992px) {
    width: 100%;
    max-width: 450px;
    margin-left: 0;
  }
`;

const HeroButtons = styled(Flex)`
  margin-top: 40px;

  @media (max-width: 992px) {
    justify-content: center;
  }

  @media (max-width: 480px) {
    flex-direction: column;
    width: 100%;
    gap: 16px;

    button {
      width: 100%;
    }
  }
`;

const SerifItalic = styled.span`
  font-family: 'Playfair Display', serif;
  font-style: italic;
  font-weight: 400;
  display: block;
  margin-top: 5px;
  font-size: 1.1em;
  letter-spacing: -1px;
`;

const rainbowGradientAnimation = keyframes`
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
`;

const HeroHouseSpan = styled.span`
  background: linear-gradient(90deg, #3f87a6, #ebf8e1, #f69d3c, #561423, #3f87a6);
  background-size: 300% 300%;
  animation: ${rainbowGradientAnimation} 6s linear infinite;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  color: transparent;
  
  /* Matching parent heading size (84px) while keeping gradient */
  font-size: 1em;
  font-weight: inherit;
  line-height: inherit;
  display: inline;
  margin: 0;
  padding: 0;
  
  &:hover {
    animation: ${rainbowGradientAnimation} 3s linear infinite;
  }
`;

const HeroHeading = styled(Heading)`
  font-size: 84px;
  line-height: 0.9;
  margin-bottom: 40px;
  letter-spacing: -2px;
  text-transform: none;
  
  @media (max-width: 1200px) {
    font-size: 72px;
  }
  
  @media (max-width: 992px) {
    font-size: 60px;
    text-align: center;
  }
  
  @media (max-width: 480px) {
    font-size: 42px;
  }
`;

const FeaturesSection = styled(Section)`
  background-color: var(--background);
`;

const FeatureCard = styled(Card)`
  text-align: left;
  padding: 24px;
  display: flex;
  flex-direction: column;
  width: 360px;
  min-height: 320px;
  transition: all 0.3s ease;
  transform: translateZ(0);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  border: 1px solid rgba(255, 255, 255, 0.08);
  position: relative;
  overflow: hidden;
  background: rgba(30, 39, 55, 0.7);
  backdrop-filter: blur(10px);

  @media (max-width: 1200px) {
    width: 340px;
  }

  @media (max-width: 768px) {
    width: 100%;
    max-width: 450px;
    min-height: auto;
  }

  &:hover {
    box-shadow: 0 8px 30px rgba(0, 0, 0, 0.25);
    border-color: var(--primary);
    transform: translateY(-5px);
  }

  svg {
    width: 32px;
    height: 32px;
    margin-bottom: 16px;
    color: var(--primary);
    flex-shrink: 0;
  }
`;

const FeatureContentWrapper = styled.div`
  overflow: hidden;
  transition: max-height 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  max-height: ${props => props.$isExpanded ? '1200px' : '140px'};
  position: relative;

  ${props => !props.$isExpanded && css`
    &::after {
      content: '';
      position: absolute;
      bottom: 0;
      left: 0;
      width: 100%;
      height: 60px;
      background: linear-gradient(transparent, rgba(30, 39, 55, 1));
      pointer-events: none;
    }
  `}
`;

const FeatureList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 12px 0 0;
`;

const FeatureItem = styled.li`
  position: relative;
  padding-left: 20px;
  margin-bottom: 8px;
  font-size: 14px;
  color: var(--text-secondary);
  line-height: 1.4;

  ${props => !props.$isExpanded && css`
    display: -webkit-box;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
    text-overflow: ellipsis;
  `}

  &::before {
    content: '•';
    position: absolute;
    left: 0;
    color: var(--primary);
    font-weight: bold;
  }

  strong {
    color: var(--text-primary);
    display: block;
    margin-bottom: 2px;
    font-size: 14px;
  }
`;

const ExpandButton = styled.button`
  background: transparent;
  border: none;
  color: var(--primary);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  padding: 8px 0;
  margin-top: auto;
  display: flex;
  align-items: center;
  gap: 4px;
  transition: color 0.2s ease;
  width: fit-content;

  &:hover {
    color: var(--secondary);
  }

  &:focus {
    outline: 2px solid var(--primary);
    outline-offset: 2px;
    border-radius: 4px;
  }
`;

const FeatureGrid = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  align-items: flex-start;
  gap: 24px;
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
`;

const ExpandableFeatureCard = ({ icon: Icon, title, items }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const contentRef = useRef(null);

  return (
    <FeatureCard 
      as="article" 
      role="region"
      aria-labelledby={`heading-${title.replace(/\s+/g, '-').toLowerCase()}`}
    >
      <Icon />
      <Heading 
        level={3} 
        id={`heading-${title.replace(/\s+/g, '-').toLowerCase()}`}
        style={{ fontSize: '20px', marginBottom: '12px' }}
      >
        {title}
      </Heading>
      
      <FeatureContentWrapper 
        id={`content-${title.replace(/\s+/g, '-').toLowerCase()}`}
        $isExpanded={isExpanded} 
        ref={contentRef}
      >
        <FeatureList>
          {items.map((item, idx) => (
            <FeatureItem key={idx} $isExpanded={isExpanded}>
              <strong>{item.title}</strong>
              {item.description}
            </FeatureItem>
          ))}
        </FeatureList>
      </FeatureContentWrapper>

      <ExpandButton 
        onClick={() => setIsExpanded(!isExpanded)}
        aria-expanded={isExpanded}
        aria-controls={`content-${title.replace(/\s+/g, '-').toLowerCase()}`}
      >
        {isExpanded ? (
          <>
            Collapse
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 15l-6-6-6 6" />
            </svg>
          </>
        ) : (
          <>
            Read More
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 9l6 6 6-6" />
            </svg>
          </>
        )}
      </ExpandButton>
    </FeatureCard>
  );
};

const GoalsSection = styled(Section)`
  background: linear-gradient(135deg, rgba(15, 22, 36, 0.4) 0%, rgba(26, 35, 50, 0.4) 100%);
  padding: 80px 0;

  @media (max-width: 768px) {
    padding: 60px 0;
  }
`;

const GoalCard = styled(Card)`
  padding: 32px;
  text-align: center;
  max-width: 800px;
  margin: 0 auto;
  background: rgba(26, 35, 50, 0.5);
  backdrop-filter: blur(15px);
  -webkit-backdrop-filter: blur(15px);
  border: 1px solid rgba(108, 92, 231, 0.2);

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: radial-gradient(circle at center, rgba(108, 92, 231, 0.15) 0%, transparent 70%);
    z-index: 0;
  }
`;

const CryptoSection = styled(Section)`
  background-color: rgba(25, 32, 44, 0.06);
`;

const CryptoCard = styled(Card)`
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 32px 24px;

  img {
    width: 64px;
    height: 64px;
    margin-bottom: 16px;
  }
`;

const HomePage = () => {
  const navigate = useNavigate();

  const featureData = [
    {
      title: 'Financial Benefits',
      icon: () => (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      items: [
        { title: 'Property ownership without massive capital investment', description: 'Fractional ownership through tokenization allows you to own real estate with minimal upfront costs' },
        { title: 'Passive income potential', description: 'Earn rental yields from properties collectively owned by the DAO' },
        { title: 'Potential asset appreciation', description: 'Benefit from the potential value increase of the DAOs real estate holdings without being a traditional landlord' },
        { title: 'Transparent financial operations', description: 'All transactions and treasury movements visible on-chain' }
      ]
    },
    {
      title: 'Community & Lifestyle',
      icon: () => (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
      items: [
        { title: 'Live in deHouse properties', description: 'Access to fully furnished homes in prime locations as a community member' },
        { title: 'Build genuine connections', description: 'Share daily life experiences with like-minded individuals passionate about decentralized living' },
        { title: 'Collaborative environment', description: 'Co-work spaces and communal areas designed for interaction and creativity' },
        { title: 'Cultural exchange', description: 'Meet members from diverse backgrounds and expertise areas' },
        { title: 'Reduced living costs', description: 'Shared expenses and communal resources significantly lower your cost of living' },
        { title: 'Networking opportunities', description: 'Connect with crypto enthusiasts, real estate innovators, and digital nomads' }
      ]
    },
    {
      title: 'Governance & Influence',
      icon: () => (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      ),
      items: [
        { title: 'Direct decision-making power', description: 'Vote on property acquisitions, management policies, and strategic direction' },
        { title: 'Shape the future of housing', description: 'Participate in pioneering a new model of property ownership and management' },
        { title: 'Proposal rights', description: 'Submit initiatives for new locations, amenities, or community programs' },
        { title: 'Transparent governance', description: 'All proposals, discussions, and votes recorded on blockchain for full accountability' }
      ]
    },
    {
      title: 'Flexibility & Freedom',
      icon: () => (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      items: [
        { title: 'Global mobility', description: 'Access to deHouse properties in multiple locations worldwide' },
        { title: 'No long-term commitments', description: 'Flexible stay arrangements without traditional lease constraints' },
        { title: 'Work-life integration', description: 'Designed for remote workers and digital nomads seeking community' },
        { title: 'Lifestyle experimentation', description: 'Try different cities and living situations with minimal friction' }
      ]
    },
    {
      title: 'Additional Perks',
      icon: () => (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      ),
      items: [
        { title: 'Exclusive events', description: 'Access to member-only gatherings, workshops, and experiences' },
        { title: 'Shared resources', description: 'Common amenities like kitchens, workspaces, and entertainment areas' },
        { title: 'Reduced administrative burden', description: 'No dealing with traditional landlords, complex leases, or utility setup' },
        { title: 'Community support system', description: 'Built-in network for both personal and professional assistance' }
      ]
    }
  ];

  const cryptoData = [
    { id: 'btc', name: 'Bitcoin', symbol: 'BTC', icon: btcIcon },
    { id: 'eth', name: 'Ethereum', symbol: 'ETH', icon: ethIcon },
    { id: 'sol', name: 'Solana', symbol: 'SOL', icon: solIcon },
    { id: 'usdc', name: 'Stablecoins', symbol: 'USDC/USDT/DAI', icon: usdcIcon }
  ];

  return (
    <>
      <HeroSection>
        <Container>
          <HeroContent>
            <HeroLeftColumn>
              <HeroHeading level={1} color="white">
                 Join the de<HeroHouseSpan>House</HeroHouseSpan> DAO
                 <SerifItalic>Decentralizing RWA</SerifItalic>
                 <SerifItalic style={{ marginTop: '0' }}>Ownership</SerifItalic>
               </HeroHeading>
               <Text size="20px"> Donate Assets, Earn Points, Unlock Future Rewards!</Text>
               <Text size="20px"> Fuel and shape the future of the deHouse DAO. Every donation earns you governance points on our leaderboard and helps fund our mission of revolutionizing RWA fractionalized ownership.
              </Text>

              <HeroButtons gap="16px">
                <WalletConnectButton />
                <Button secondary="true" onClick={() => navigate('/leaderboard')}>View Leaderboard</Button>
              </HeroButtons>
            </HeroLeftColumn>

            <HeroRightColumn>
              <TreasuryBalanceCounter />
            </HeroRightColumn>
          </HeroContent>
        </Container>
      </HeroSection>

      <FeaturesSection>
        <Container>
          <Heading level={2} style={{ textAlign: 'center' }}>Why Donate to deHouse?</Heading>
          <Text size="18px" style={{ textAlign: 'center', maxWidth: '700px', margin: '0 auto 48px', color: '#FFFFFF' }}>
            Our DAO supports various initiatives and rewards contributors with a new form of RWA ownership and additional future perks. Donating to deHouse provides the necessary capital to acquire community-owned properties that directly fuels a tangible solution to the current housing affordability crisis. Your contribution isn't just a donation, it's your entry key into a revolutionary new model that replaces the traditional housing system with community ownership by creating new sustainable ecosystems where anyone can share a stake in the future of RWA ownership.
          </Text>

          <FeatureGrid gap="24px">
            {featureData.map((feature, index) => (
              <ExpandableFeatureCard 
                key={index}
                icon={feature.icon}
                title={feature.title}
                items={feature.items}
              />
            ))}
          </FeatureGrid>
        </Container>
      </FeaturesSection>

      <GoalsSection>
        <Container>
          <Heading level={2} style={{ textAlign: 'center', marginBottom: '32px' }}>Our Mission</Heading>
          <GoalCard>
            <div style={{ marginBottom: '24px', opacity: '0.8' }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: 'var(--primary)' }}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <Text size="20px" style={{ lineHeight: '1.6', position: 'relative', zIndex: '1' }}>
              "Our mission is to strategically build and manage a diverse portfolio of assets, properties and products, harnessing the collective strength of our DAO to create exceptional value and meaningful rewards for all our contributors.
We are dedicated to uniting our community’s resources together to acquire and grow our treasury's assets, ensuring that the prosperity generated by our DAO benefits each and every one of our members."
            </Text>
          </GoalCard>
        </Container>
      </GoalsSection>

      <CryptoSection id="supported-cryptocurrencies">
        <Container>
          <Heading level={2} style={{ textAlign: 'center' }}>Supported Cryptocurrencies</Heading>
          <Text size="18px" style={{ textAlign: 'center', maxWidth: '700px', margin: '0 auto 48px' }}>
            We accept donations in multiple cryptocurrencies across different blockchains.
          </Text>

          <Grid columns={4} gap="24px" style={{ justifyItems: 'center' }}>
            {cryptoData.map(crypto => (
              <CryptoCard key={crypto.id}>
                <img src={crypto.icon} alt={crypto.name} />
                <Heading level={4}>{crypto.name}</Heading>
                <Text mb="8px">{crypto.symbol}</Text>
                <Button 
                  secondary="true" 
                  onClick={() => {
                    const currentParams = new URLSearchParams(window.location.search);
                    currentParams.set('crypto', crypto.id);
                    currentParams.set('scroll', 'true');
                    navigate(`/donate?${currentParams.toString()}`);
                  }}
                  aria-label={`Donate using ${crypto.name}`}
                >
                  Donate {crypto.symbol.split('/')[0]}
                </Button>
              </CryptoCard>
            ))}
          </Grid>
        </Container>
      </CryptoSection>
    </>
  );
};

export default HomePage;
