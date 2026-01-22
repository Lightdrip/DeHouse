import React, { useEffect, useState } from 'react';
import styled, { keyframes } from 'styled-components';
import { Container, Flex, Heading, Text } from '../styles/StyledComponents';
import WalletConnectButton from './WalletConnectButton';
import { useLocation } from 'react-router-dom';
import { useUser } from '../utils/UserContext';

const HeaderContainer = styled.header`
  padding: 20px 0;
  position: sticky;
  top: 0;
  z-index: 9999; /* Ensure highest z-index */
  background-color: rgba(15, 22, 36, 0.95);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  pointer-events: auto; /* Ensure header elements can be clicked */
`;

const rainbowGradientAnimation = keyframes`
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
`;

const Logo = styled.div`
  font-size: 24px;
  font-weight: 700;
  color: var(--text-primary);
  display: flex;
  align-items: center;
  text-decoration: none;
  cursor: pointer;
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

const NavLinks = styled.nav`
  display: flex;
  gap: 32px;
  position: relative;
  z-index: 10000; /* Ensure highest z-index */
  pointer-events: auto; /* Ensure nav links can be clicked */

  @media (max-width: 768px) {
    display: none;
  }
`;

const NavButton = styled.button`
  color: ${props => props.active === 'true' ? 'var(--text-primary)' : 'var(--text-secondary)'};
  font-weight: 500;
  transition: all 0.3s ease;
  text-decoration: none;
  cursor: pointer;
  padding: 8px 12px;
  border-radius: 6px;
  position: relative;
  z-index: 10000; /* Ensure highest z-index for nav links */
  pointer-events: auto; /* Ensure nav links can be clicked */
  background: transparent;
  border: none;
  font-family: 'Inter', sans-serif;
  font-size: 16px;

  &:hover {
    color: var(--text-primary);
    background-color: rgba(255, 255, 255, 0.05);
  }

  ${props => props.active === 'true' && `
    color: var(--text-primary);
    background-color: rgba(255, 255, 255, 0.05);

    &::after {
      content: '';
      position: absolute;
      bottom: -2px;
      left: 50%;
      transform: translateX(-50%);
      width: 20px;
      height: 3px;
      background: linear-gradient(90deg, var(--primary) 0%, var(--secondary) 100%);
      border-radius: 3px;
    }
  `}
`;

const MobileMenuButton = styled.button`
  display: none;
  background: none;
  border: none;
  color: var(--text-primary);
  font-size: 24px;
  cursor: pointer;

  @media (max-width: 768px) {
    display: block;
  }
`;

const Header = () => {
  const location = useLocation();
  const { isLoggedIn } = useUser();
  const [currentPath, setCurrentPath] = useState('/');

  // Update current path when location changes
  useEffect(() => {
    setCurrentPath(location.pathname);
  }, [location]);

  // Direct navigation function that forces a page reload when navigating from leaderboard
  const navigateTo = (path) => {
    // If we're on the leaderboard page, use a more direct approach
    if (currentPath === '/leaderboard') {
      // Use direct window.location for more reliable navigation
      window.location.href = `#${path}`;
      // Force a reload to ensure clean state
      setTimeout(() => window.location.reload(), 50);
    } else {
      // For other pages, just update the hash
      window.location.hash = path;
    }
  };

  return (
    <HeaderContainer>
      <Container>
        <Flex justify="space-between" align="center">
          <Logo onClick={() => navigateTo('/')}>
            <LogoPrefix>de</LogoPrefix><LogoGradient>House</LogoGradient>
          </Logo>

          <NavLinks>
            <NavButton
              active={(currentPath === '/').toString()}
              onClick={() => navigateTo('/')}
            >
              Home
            </NavButton>
            <NavButton
              active={(currentPath === '/donate').toString()}
              onClick={() => navigateTo('/donate')}
            >
              Donate
            </NavButton>
            <NavButton
              active={(currentPath === '/leaderboard').toString()}
              onClick={() => navigateTo('/leaderboard')}
            >
              Leaderboard
            </NavButton>
            <NavButton
              active={(currentPath === '/about').toString()}
              onClick={() => navigateTo('/about')}
            >
              About
            </NavButton>
            {isLoggedIn && (
              <NavButton
                active={(currentPath === '/profile').toString()}
                onClick={() => navigateTo('/profile')}
              >
                Profile
              </NavButton>
            )}
          </NavLinks>

          <WalletConnectButton />

          <MobileMenuButton>☰</MobileMenuButton>
        </Flex>
      </Container>
    </HeaderContainer>
  );
};

export default Header;
