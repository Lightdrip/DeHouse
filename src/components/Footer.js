import React from 'react';
import styled, { keyframes } from 'styled-components';
import { Container, Flex, Text } from '../styles/StyledComponents';
import { Link } from 'react-router-dom';
import { FaXTwitter, FaDiscord, FaTelegram, FaGithub } from 'react-icons/fa6';

const FooterContainer = styled.footer`
  background-color: var(--card-bg);
  padding: 60px 0 30px;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
  position: relative;
  z-index: 1; /* Lower z-index than header */
`;

const rainbowGradientAnimation = keyframes`
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
`;

const FooterLogo = styled.div`
  font-size: 24px;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 16px;
  display: flex;
`;

const LogoPrefix = styled.span`
  color: var(--text-primary);
`;

const LogoGradient = styled.span`
  background: linear-gradient(90deg, #3f87a6, #ebf8e1, #f69d3c, #561423, #3f87a6);
  background-size: 300% 300%;
  animation: ${rainbowGradientAnimation} 6s linear infinite;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  color: transparent;

  &:hover {
    animation: ${rainbowGradientAnimation} 3s linear infinite;
  }
`;

const FooterSection = styled.div`
  margin-bottom: 30px;
`;

const FooterHeading = styled.h4`
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 20px;
`;

const FooterLink = styled(Link)`
  display: block;
  color: var(--text-secondary);
  margin-bottom: 12px;
  transition: all 0.3s ease;
  position: relative;
  z-index: 2;

  &:hover {
    color: var(--primary);
  }
`;

const SocialLinks = styled(Flex)`
  margin-top: 16px;
`;

const SocialIcon = styled.a`
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background-color: rgba(255, 255, 255, 0.05);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);
  transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  border: 1px solid rgba(255, 255, 255, 0.1);

  &:hover {
    background-color: var(--primary);
    color: white;
    transform: translateY(-5px);
    border-color: var(--primary);
    box-shadow: 0 10px 20px rgba(108, 92, 231, 0.2);
  }

  &:focus {
    outline: 2px solid var(--primary);
    outline-offset: 2px;
  }
`;

const Copyright = styled.div`
  text-align: center;
  padding-top: 30px;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
  color: var(--text-secondary);
  font-size: 14px;
`;

const Footer = () => {
  // Function to handle navigation
  const handleNavigation = (path) => {
    window.location.hash = path; // Force navigation using hash
  };

  return (
    <FooterContainer>
      <Container>
        <Flex justify="space-between" wrap="wrap">
          <FooterSection style={{ flex: '1 1 300px' }}>
            <FooterLogo><LogoPrefix>de</LogoPrefix><LogoGradient>House</LogoGradient></FooterLogo>
            <Text>
              Revolutionizing real estate through collective ownership, creating a global network of community-owned properties where members can live, connect, and shape the future of RWA co-ownership.
            </Text>

            <SocialLinks gap="20px">
              <SocialIcon 
                href="https://twitter.com/DeHouseDAO" 
                target="_blank" 
                rel="noopener noreferrer"
                aria-label="Follow us on X (Twitter)"
              >
                <FaXTwitter size={20} />
              </SocialIcon>
              <SocialIcon 
                href="https://discord.gg/zXKQ9YWa9E" 
                target="_blank" 
                rel="noopener noreferrer"
                aria-label="Join our Discord community"
              >
                <FaDiscord size={22} />
              </SocialIcon>
              
              <SocialIcon 
                href="https://github.com/Lightdrip/DeHouse" 
                target="_blank" 
                rel="noopener noreferrer"
                aria-label="View our GitHub repositories"
              >
                <FaGithub size={20} />
              </SocialIcon>
            </SocialLinks>
          </FooterSection>

          <FooterSection style={{ flex: '1 1 200px' }}>
            <FooterHeading>Quick Links</FooterHeading>
            <FooterLink to="/" onClick={(e) => { e.preventDefault(); handleNavigation('/'); }}>Home</FooterLink>
            <FooterLink to="/donate" onClick={(e) => { e.preventDefault(); handleNavigation('/donate'); }}>Donate</FooterLink>
            <FooterLink to="/leaderboard" onClick={(e) => { e.preventDefault(); handleNavigation('/leaderboard'); }}>Leaderboard</FooterLink>
            <FooterLink to="/about" onClick={(e) => { e.preventDefault(); handleNavigation('/about'); }}>About</FooterLink>
          </FooterSection>

          <FooterSection style={{ flex: '1 1 200px' }}>
            <FooterHeading>Supported Crypto</FooterHeading>
            <FooterLink to="/donate?crypto=btc" onClick={(e) => { e.preventDefault(); handleNavigation('/donate?crypto=btc'); }}>Bitcoin (BTC)</FooterLink>
            <FooterLink to="/donate?crypto=eth" onClick={(e) => { e.preventDefault(); handleNavigation('/donate?crypto=eth'); }}>Ethereum (ETH)</FooterLink>
            <FooterLink to="/donate?crypto=sol" onClick={(e) => { e.preventDefault(); handleNavigation('/donate?crypto=sol'); }}>Solana (SOL)</FooterLink>
            <FooterLink to="/donate?crypto=usdc" onClick={(e) => { e.preventDefault(); handleNavigation('/donate?crypto=usdc'); }}>Stablecoins</FooterLink>
          </FooterSection>

          <FooterSection style={{ flex: '1 1 200px' }}>
            <FooterHeading>Resources</FooterHeading>
            <FooterLink href="#">Documentation</FooterLink>
            <FooterLink href="#">FAQ</FooterLink>
            <FooterLink href="#">Privacy Policy</FooterLink>
            <FooterLink href="#">Terms of Service</FooterLink>
          </FooterSection>
        </Flex>

        <Copyright>
          © {new Date().getFullYear()} deHouse. All rights reserved.
        </Copyright>
      </Container>
    </FooterContainer>
  );
};

export default Footer;
