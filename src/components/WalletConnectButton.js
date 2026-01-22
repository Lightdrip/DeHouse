import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { Button } from '../styles/StyledComponents';
import { useWallet } from '../utils/WalletContext';
import { useUser } from '../utils/UserContext';

const WalletButtonContainer = styled.div`
  position: relative;
`;

const WalletButton = styled(Button)`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const WalletIcon = styled.div`
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background-color: var(--secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  color: var(--background);
`;

const WalletAddress = styled.span`
  @media (max-width: 768px) {
    display: none;
  }
`;

const WalletDropdown = styled.div`
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: 8px;
  background-color: var(--card-bg);
  border-radius: 8px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
  width: 240px;
  z-index: 100;
  overflow: hidden;
  transition: all 0.3s ease;
`;

const ProfileSection = styled.div`
  padding: 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  text-align: center;
`;

const Username = styled.h3`
  margin: 8px 0 4px;
  font-size: 16px;
  font-weight: 600;
`;

const ProfileForm = styled.form`
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const FormInput = styled.input`
  padding: 8px 12px;
  border-radius: 4px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background-color: rgba(0, 0, 0, 0.2);
  color: var(--text);
  font-size: 14px;
  width: 100%;
  
  &:focus {
    outline: none;
    border-color: var(--primary);
  }
`;

const DropdownItem = styled.div`
  padding: 12px 16px;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 12px;
  
  &:hover {
    background-color: rgba(108, 92, 231, 0.1);
  }
  
  &:not(:last-child) {
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  }
`;

const WalletTypeSelector = styled.div`
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: 8px;
  background-color: var(--card-bg);
  border-radius: 8px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
  width: 240px;
  z-index: 100;
  overflow: hidden;
  padding: 8px;
`;

const WalletTypeButton = styled(Button)`
  width: 100%;
  margin-bottom: 8px;
  justify-content: flex-start;
  padding: 10px 16px;
  
  &:last-child {
    margin-bottom: 0;
  }
`;

const WalletConnectButton = () => {
  const { isConnected, walletAddress, walletType, connectWallet, disconnectWallet } = useWallet();
  const { currentUser, isLoggedIn, updateProfile } = useUser();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [walletSelectorOpen, setWalletSelectorOpen] = useState(false);
  const [showProfileEdit, setShowProfileEdit] = useState(false);
  const [username, setUsername] = useState('');
  
  // Update username state when user data loads
  useEffect(() => {
    if (currentUser && currentUser.username) {
      setUsername(currentUser.username);
    }
  }, [currentUser]);
  
  const handleConnectClick = () => {
    if (!isConnected) {
      setWalletSelectorOpen(true);
    } else {
      setDropdownOpen(!dropdownOpen);
      setShowProfileEdit(false); // Close profile edit when toggling dropdown
    }
  };
  
  const handleWalletSelect = async (type) => {
    setWalletSelectorOpen(false);
    const success = await connectWallet(type);
    if (success) {
      // Connection successful
    }
  };
  
  const handleDisconnect = () => {
    disconnectWallet();
    setDropdownOpen(false);
    setShowProfileEdit(false);
  };
  
  const handleProfileClick = () => {
    setShowProfileEdit(true);
  };
  
  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    
    const result = await updateProfile({ username });
    
    if (result.success) {
      setShowProfileEdit(false);
    }
  };
  
  const copyToClipboard = () => {
    navigator.clipboard.writeText(walletAddress)
      .then(() => {
        alert('Address copied to clipboard!');
        setDropdownOpen(false);
      })
      .catch(err => {
        console.error('Failed to copy: ', err);
      });
  };
  
  const viewOnExplorer = () => {
    let explorerUrl = '';
    
    if (walletType === 'ethereum') {
      explorerUrl = `https://etherscan.io/address/${walletAddress}`;
    } else if (walletType === 'solana') {
      explorerUrl = `https://explorer.solana.com/address/${walletAddress}`;
    }
    
    if (explorerUrl) {
      window.open(explorerUrl, '_blank');
      setDropdownOpen(false);
    }
  };
  
  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.wallet-container')) {
        setDropdownOpen(false);
        setWalletSelectorOpen(false);
      }
    };
  
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  const truncateAddress = (address) => {
    if (!address) return '';
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };
  
  return (
    <WalletButtonContainer className="wallet-container">
      {isConnected ? (
        <>
          <WalletButton onClick={handleConnectClick}>
            <WalletIcon>{walletType === 'ethereum' ? 'E' : walletType === 'solana' ? 'S' : 'W'}</WalletIcon>
            <WalletAddress>
              {currentUser?.username || `${walletAddress.substring(0, 6)}...${walletAddress.substring(walletAddress.length - 4)}`}
            </WalletAddress>
          </WalletButton>
          
          {dropdownOpen && (
            <WalletDropdown>
              {showProfileEdit ? (
                <ProfileForm onSubmit={handleProfileSubmit}>
                  <h3>Edit Profile</h3>
                  <FormInput 
                    type="text" 
                    placeholder="Username" 
                    value={username} 
                    onChange={(e) => setUsername(e.target.value)}
                    required
                  />
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <WalletTypeButton type="submit">Save</WalletTypeButton>
                    <WalletTypeButton type="button" onClick={() => setShowProfileEdit(false)}>Cancel</WalletTypeButton>
                  </div>
                </ProfileForm>
              ) : (
                <>
                  <ProfileSection>
                    <WalletIcon style={{ margin: '0 auto', width: '40px', height: '40px', fontSize: '20px' }}>
                      {walletType === 'ethereum' ? 'E' : walletType === 'solana' ? 'S' : 'W'}
                    </WalletIcon>
                    <Username>{currentUser?.username || 'User'}</Username>
                    <span style={{ fontSize: '12px', opacity: '0.7' }}>
                      {walletAddress.substring(0, 6)}...{walletAddress.substring(walletAddress.length - 4)}
                    </span>
                  </ProfileSection>
                  <DropdownItem onClick={handleProfileClick}>
                    Edit Profile
                  </DropdownItem>
                  <DropdownItem onClick={handleDisconnect}>
                    Disconnect Wallet
                  </DropdownItem>
                </>
              )}
            </WalletDropdown>
          )}
        </>
      ) : (
        <>
          <WalletButton onClick={handleConnectClick}>
            Connect Wallet
          </WalletButton>
          
          {walletSelectorOpen && (
            <WalletTypeSelector>
              <WalletTypeButton onClick={() => handleWalletSelect('ethereum')}>
                Connect Ethereum Wallet
              </WalletTypeButton>
              <WalletTypeButton onClick={() => handleWalletSelect('solana')}>
                Connect Solana Wallet
              </WalletTypeButton>
            </WalletTypeSelector>
          )}
        </>
      )}
    </WalletButtonContainer>
  );
};

export default WalletConnectButton;
