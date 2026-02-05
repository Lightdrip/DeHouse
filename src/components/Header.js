import React, { useEffect, useState } from 'react';
import styled, { keyframes } from 'styled-components';
import { Container, Flex, Heading, Text } from '../styles/StyledComponents';
import WalletConnectButton from './WalletConnectButton';
import { useLocation } from 'react-router-dom';
import { useUser } from '../utils/UserContext';
import { useWaitlist } from '../utils/WaitlistContext';

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
  z-index: 10001;
  padding: 8px;

  @media (max-width: 768px) {
    display: block;
  }
`;

const MobileNavOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100vh;
  background-color: rgba(15, 22, 36, 0.98);
  backdrop-filter: blur(20px);
  z-index: 10000;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  opacity: ${props => props.isOpen ? '1' : '0'};
  visibility: ${props => props.isOpen ? 'visible' : 'hidden'};
  transition: all 0.3s ease-in-out;
`;

const MobileNavLinks = styled.div`
  display: flex;
  flex-direction: column;
  gap: 24px;
  align-items: center;
  width: 100%;
`;

const MobileNavLink = styled(NavButton)`
  font-size: 24px;
  width: 100%;
  text-align: center;
  padding: 16px;
  
  &::after {
    bottom: 10px;
  }
`;

const Header = () => {
  const location = useLocation();
  const { isLoggedIn } = useUser();
  const { openWaitlist } = useWaitlist();
  const [currentPath, setCurrentPath] = useState('/');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Update current path when location changes
  useEffect(() => {
    setCurrentPath(location.pathname);
    setIsMobileMenuOpen(false); // Close menu on route change
  }, [location]);

  // Lock body scroll when menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isMobileMenuOpen]);

  // Direct navigation function that forces a page reload when navigating from leaderboard
  const navigateTo = (path) => {
    setIsMobileMenuOpen(false);
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
            <NavButton onClick={() => navigateTo('/')} active={(currentPath === '/').toString()}>Home</NavButton>
            <NavButton onClick={() => navigateTo('/donate')} active={(currentPath === '/donate').toString()}>Donate</NavButton>
            <NavButton onClick={() => navigateTo('/leaderboard')} active={(currentPath === '/leaderboard').toString()}>Leaderboard</NavButton>
            <NavButton onClick={() => navigateTo('/about')} active={(currentPath === '/about').toString()}>About</NavButton>
            
            {/* Show Waitlist button if user is not logged in */}
            {!isLoggedIn && (
              <NavButton onClick={openWaitlist}>Join Waitlist</NavButton>
            )}
            
            <WalletConnectButton />
          </NavLinks>

          <MobileMenuButton onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} aria-label="Toggle menu">
            {isMobileMenuOpen ? '✕' : '☰'}
          </MobileMenuButton>
        </Flex>
      </Container>

      <MobileNavOverlay isOpen={isMobileMenuOpen}>
        <MobileNavLinks>
          <MobileNavLink onClick={() => navigateTo('/')} active={(currentPath === '/').toString()}>Home</MobileNavLink>
          <MobileNavLink onClick={() => navigateTo('/donate')} active={(currentPath === '/donate').toString()}>Donate</MobileNavLink>
          <MobileNavLink onClick={() => navigateTo('/leaderboard')} active={(currentPath === '/leaderboard').toString()}>Leaderboard</MobileNavLink>
          <MobileNavLink onClick={() => navigateTo('/about')} active={(currentPath === '/about').toString()}>About</MobileNavLink>
          
          {!isLoggedIn && (
            <MobileNavLink onClick={() => {
              setIsMobileMenuOpen(false);
              openWaitlist();
            }}>Join Waitlist</MobileNavLink>
          )}
          
          <div style={{ marginTop: '20px' }}>
            <WalletConnectButton />
          </div>
        </MobileNavLinks>
      </MobileNavOverlay>
    </HeaderContainer>
  );
};

export default Header;
