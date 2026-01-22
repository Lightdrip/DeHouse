import React, { useState, useEffect } from 'react';
import styled, { keyframes } from 'styled-components';
import { Container, Section, Heading, Text, Button, Flex, Card, Input, Divider, Badge } from '../styles/StyledComponents';
import WalletConnectButton from '../components/WalletConnectButton';
import AdminControls from '../components/AdminControls';
import { useWallet } from '../utils/WalletContext';
import { useDonation } from '../utils/DonationContext';
import { useNavigate } from 'react-router-dom';

import databaseService from '../utils/DatabaseService';

// Animation for the gradient background
const gradientAnimation = keyframes`
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
`;

// Reusable styled component for animated gradient text
const AnimatedGradientText = styled.span`
  background: linear-gradient(90deg, #3f87a6, #ebf8e1, #f69d3c, #561423, #3f87a6);
  background-size: 300% 100%;
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  text-shadow: 0 1px 5px rgba(63, 135, 166, 0.3);
  animation: ${gradientAnimation} 6s linear infinite;
  transform: translateZ(0); /* Hardware acceleration */
  font-weight: 700;
`;

// Admin section styling
const AdminSection = styled(Card)`
  margin-top: 32px;
  background-color: rgba(255, 0, 0, 0.05);
  border: 1px solid rgba(255, 0, 0, 0.2);
`;

const AdminButton = styled(Button)`
  background-color: #d32f2f;
  &:hover {
    background-color: #b71c1c;
  }
`;

const LeaderboardSection = styled(Section)`
  background-color: var(--background);
  position: relative;
  z-index: 1; /* Lower z-index than header */
`;

// Main content container
const LeaderboardContent = styled.div`
  position: relative;
  z-index: 1; /* Lower z-index than header */
`;


const LeaderboardCard = styled(Card)`
  margin-bottom: 32px;
  position: relative;
  z-index: 1; /* Lower z-index than header */
`;

const LeaderboardHeader = styled(Flex)`
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
`;

const LeaderboardTable = styled.div`
  width: 100%;
`;

const TableHeader = styled(Flex)`
  padding: 16px;
  background-color: rgba(15, 22, 36, 0.5);
  border-radius: 8px;
  margin-bottom: 16px;
  font-weight: 600;
`;

const TableRow = styled(Flex)`
  padding: 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  transition: all 0.3s ease;

  &:hover {
    background-color: rgba(108, 92, 231, 0.05);
  }

  &:last-child {
    border-bottom: none;
  }
`;

const RankCell = styled.div`
  width: 80px;
  font-weight: 600;
  color: ${props => {
    if (props.rank === 1) return 'gold';
    if (props.rank === 2) return 'silver';
    if (props.rank === 3) return '#cd7f32'; // bronze
    return 'var(--text-primary)';
  }};
`;

const AddressCell = styled.div`
  flex: 1;
`;

const PointsCell = styled.div`
  width: 120px;
  text-align: right;
  font-weight: 700;
  background: linear-gradient(90deg, #3f87a6, #ebf8e1, #f69d3c, #561423, #3f87a6);
  background-size: 300% 100%;
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  text-shadow: 0 1px 5px rgba(63, 135, 166, 0.3);
  animation: ${gradientAnimation} 6s linear infinite;
  transform: translateZ(0); /* Hardware acceleration */
`;

const DonationsCell = styled.div`
  width: 120px;
  text-align: right;
`;

const FilterContainer = styled(Flex)`
  margin-bottom: 24px;
  position: relative;
  z-index: 1; /* Lower z-index than header */
`;


const SearchContainer = styled.div`
  position: relative;
  flex: 1;
  max-width: 400px;
  /* Keep position: relative here as it's needed for the SearchIcon positioning */
  z-index: 1; /* Lower z-index than header */
`;


const SearchIcon = styled.span`
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: rgba(255, 255, 255, 0.4);
`;

const SearchInput = styled(Input)`
  padding-left: 40px;
`;

const Pagination = styled(Flex)`
  margin-top: 32px;
`;

const PageButton = styled.button`
  background-color: ${props => props.active === 'true' ? 'var(--primary)' : 'var(--card-bg)'};
  color: var(--text-primary);
  border: none;
  border-radius: 8px;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s ease;

  &:hover {
    background-color: ${props => props.active === 'true' ? 'var(--primary)' : 'var(--primary-dark)'};
  }
`;

const UserStatsCard = styled(Card)`
  background: linear-gradient(135deg, rgba(108, 92, 231, 0.1) 0%, rgba(0, 206, 201, 0.1) 100%);
  border: 1px solid rgba(108, 92, 231, 0.2);
`;

const StatBox = styled.div`
  text-align: center;
  padding: 16px;
  background-color: rgba(26, 35, 50, 0.5);
  border-radius: 8px;

  h3 {
    font-size: 32px;
    font-weight: 700;
    background: linear-gradient(90deg, #3f87a6, #ebf8e1, #f69d3c, #561423, #3f87a6);
    background-size: 300% 100%;
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
    text-shadow: 0 1px 5px rgba(63, 135, 166, 0.3);
    margin-bottom: 8px;
    animation: ${gradientAnimation} 6s linear infinite;
    transform: translateZ(0); /* Hardware acceleration */
  }

  p {
    color: var(--text-secondary);
    margin: 0;
  }
`;

const LeaderboardPage = () => {
  const navigate = useNavigate();
  const { isConnected, walletAddress } = useWallet();
  const { donations, userStats, isLoading, leaderboard, getUserRank, clearDatabase, loadLeaderboard, loadUserData } = useDonation();

  // Extract values from userStats with defaults
  const totalPoints = userStats?.points || 0;
  const totalDonated = userStats?.totalDonated || 0;

  const [timeFilter, setTimeFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredData, setFilteredData] = useState([]);
  const [userRank, setUserRank] = useState(null);
  const [loading, setLoading] = useState(true);

  // State for database clearing
  const [clearSuccess, setClearSuccess] = useState(null);
  const [isClearing, setIsClearing] = useState(false);

  // State for manual wallet addition
  const [manualWalletAddress, setManualWalletAddress] = useState('');
  const [manualPoints, setManualPoints] = useState('');
  const [manualUsdValue, setManualUsdValue] = useState('');
  const [isAddingWallet, setIsAddingWallet] = useState(false);
  const [addWalletSuccess, setAddWalletSuccess] = useState(null);

  // Format leaderboard data for display
  const formatLeaderboardData = (data) => {
    return data.map((item, index) => ({
      rank: index + 1,
      address: item.walletAddress || 'unknown', // Ensure we have a valid address - don't normalize here
      points: item.points || 0,
      donations: item.donationCount || 0,
      cryptos: item.cryptos || [] // Use actual cryptos from item
    }));
  };

  // Handle database clearing
  const handleClearDatabase = async () => {
    if (window.confirm('Are you sure you want to clear the entire database? This action cannot be undone.')) {
      setIsClearing(true);
      setClearSuccess(null);
      try {
        const result = await clearDatabase();
        setClearSuccess(result);
      } catch (error) {
        console.error('Error clearing database:', error);
        setClearSuccess(false);
      } finally {
        setIsClearing(false);
      }
    }
  };

  // Handle adding a wallet to the leaderboard
  const handleAddWalletToLeaderboard = async () => {
    if (!manualWalletAddress) {
      alert('Please enter a wallet address');
      return;
    }

    if (!manualPoints || isNaN(parseFloat(manualPoints)) || parseFloat(manualPoints) <= 0) {
      alert('Please enter a valid number of points');
      return;
    }

    if (!manualUsdValue || isNaN(parseFloat(manualUsdValue)) || parseFloat(manualUsdValue) <= 0) {
      alert('Please enter a valid USD value');
      return;
    }

    setIsAddingWallet(true);
    setAddWalletSuccess(null);

    try {
      // Normalize the wallet address
      const normalizedWallet = manualWalletAddress.toLowerCase();
      const points = parseInt(manualPoints, 10);
      const usdValue = parseFloat(manualUsdValue);

      console.log(`Adding wallet ${normalizedWallet} with ${points} points ($${usdValue} USD)`);

      // Generate a unique ID for this donation
      const donationId = `manual_${Date.now().toString(16)}_${Math.random().toString(16).substring(2, 8)}`;

      // 1. Directly add an entry to the leaderboard store
      const db = await databaseService.dbPromise;
      const tx = db.transaction(['leaderboard', 'donations'], 'readwrite');

      // Get existing leaderboard entry if any
      const leaderboardStore = tx.objectStore('leaderboard');
      const existingEntry = await leaderboardStore.get(normalizedWallet);

      // Create new or update existing entry
      const newEntry = {
        walletAddress: normalizedWallet,
        points: (existingEntry?.points || 0) + points,
        totalDonated: (existingEntry?.totalDonated || 0) + usdValue,
        donationCount: (existingEntry?.donationCount || 0) + 1,
        lastDonation: Date.now()
      };

      // Update the leaderboard
      await leaderboardStore.put(newEntry);

      // 2. Also add a donation record
      const donationStore = tx.objectStore('donations');
      const donationData = {
        id: donationId,
        timestamp: Date.now(),
        walletAddress: normalizedWallet,
        amount: 1, // Placeholder amount
        currency: 'MANUAL',
        usdValue: usdValue,
        points: points,
        txHash: `manual_${donationId}`,
        chain: 'MANUAL',
      };

      await donationStore.add(donationData);

      // Wait for transaction to complete
      await tx.done;

      console.log('Successfully added wallet to leaderboard and recorded donation');
      setAddWalletSuccess(true);

      // Reload data after adding
      await loadLeaderboard();
      await loadUserData();

      // Clear the form
      setManualWalletAddress('');
      setManualPoints('');
      setManualUsdValue('');
    } catch (error) {
      console.error('Error adding wallet to leaderboard:', error);
      setAddWalletSuccess(false);
    } finally {
      setIsAddingWallet(false);
    }
  };

  // Leaderboard data from context
  const leaderboardData = formatLeaderboardData(leaderboard);

  // Filter data based on search query and time filter
  useEffect(() => {
    setLoading(true);
    if (searchQuery.trim() === '') {
      setFilteredData(leaderboardData);
    } else {
      const filtered = leaderboardData.filter(item => {
        // Case-insensitive search for Ethereum addresses (lowercase)
        // Case-sensitive search for Solana addresses (preserve case)
        // Check if the address contains the search query in any case form
        const addressLower = item.address.toLowerCase();
        const queryLower = searchQuery.toLowerCase();

        // Try both case-sensitive and case-insensitive matching
        return addressLower.includes(queryLower) ||
               item.address.includes(searchQuery);
      });
      setFilteredData(filtered);
    }
    setLoading(false);
  }, [searchQuery, timeFilter, leaderboardData]);

  // Initialize filtered data
  useEffect(() => {
    setFilteredData(leaderboardData);
  }, [leaderboardData]);

  // Find user's rank when connected
  useEffect(() => {
    const fetchUserRank = async () => {
      if (isConnected && walletAddress) {
        // Use the getUserRank function from DonationContext
        const rank = await getUserRank();
        setUserRank(rank);
      } else {
        setUserRank(null);
      }
    };

    fetchUserRank();
  }, [isConnected, walletAddress, getUserRank, totalPoints]);

  const truncateAddress = (address) => {
    // More robust address handling to prevent glitches
    if (!address) return 'Unknown Address';
    if (typeof address !== 'string') return 'Invalid Address';

    // Trim whitespace but preserve case for Solana addresses
    // Solana addresses start with a capital letter and maintain case sensitivity
    const trimmedAddress = address.trim();

    // If it's too short or empty after trimming, return a placeholder
    if (!trimmedAddress || trimmedAddress.length < 5) return 'Invalid Address';

    // For short addresses, just return them as is
    if (trimmedAddress.length <= 15) return trimmedAddress;

    // For normal addresses, truncate with ellipsis while preserving case
    return `${trimmedAddress.substring(0, 8)}...${trimmedAddress.substring(trimmedAddress.length - 8)}`;
  };

  const handleSearch = (e) => {
    setSearchQuery(e.target.value);
  };

  const handleTimeFilterChange = (filter) => {
    setTimeFilter(filter);
    setCurrentPage(1);
    // In a real app, this would fetch different data based on the time filter
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
    // In a real app, this would fetch the appropriate page of data
  };

  const renderUserStats = () => {
    if (!isConnected) {
      return (
        <Card>
          <Heading level={3}>Your Contribution Status</Heading>
          <Text mb="24px">Connect your wallet to see your donation history and leaderboard position.</Text>

          <Flex justify="center">
            <WalletConnectButton />
          </Flex>
        </Card>
      );
    }

    return (
      <UserStatsCard>
        <Heading level={3}>Your Contribution Status</Heading>
        <Text mb="24px">
          {walletAddress && truncateAddress(walletAddress)}
        </Text>

        <Flex gap="24px" wrap="wrap">
          <StatBox style={{ flex: '1 1 200px' }}>
            <h3>{(totalPoints || 0).toLocaleString()}</h3>
            <p>Total Points</p>
          </StatBox>

          <StatBox style={{ flex: '1 1 200px' }}>
            <h3>${(totalDonated || 0).toFixed(2)}</h3>
            <p>Total Donated</p>
          </StatBox>

          <StatBox style={{ flex: '1 1 200px' }}>
            <h3>{userRank ? `#${userRank}` : '-'}</h3>
            <p>Current Rank</p>
          </StatBox>
        </Flex>

        {donations.length > 0 ? (
          <div style={{ marginTop: '24px' }}>
            <Heading level={4}>Recent Donations</Heading>
            <LeaderboardTable>
              <TableHeader>
                <div style={{ flex: '1' }}>Date</div>
                <div style={{ flex: '1' }}>Amount</div>
                <div style={{ flex: '1', textAlign: 'right' }}>Points</div>
              </TableHeader>

              {donations.map((donation, index) => (
                <TableRow key={index}>
                  <div style={{ flex: '1' }}>{donation.timestamp ? new Date(donation.timestamp).toLocaleDateString() : 'Unknown date'}</div>
                  <div style={{ flex: '1' }}>
                    {donation.amount || 0} {donation.currency ? donation.currency.toUpperCase() : ''}
                  </div>
                  <div style={{
                    flex: '1',
                    textAlign: 'right',
                    fontWeight: '700',
                    background: 'linear-gradient(90deg, #3f87a6, #ebf8e1, #f69d3c, #561423, #3f87a6)',
                    backgroundSize: '300% 100%',
                    WebkitBackgroundClip: 'text',
                    backgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    textShadow: '0 1px 5px rgba(63, 135, 166, 0.3)',
                    animation: `${gradientAnimation} 6s linear infinite`,
                    transform: 'translateZ(0)' /* Hardware acceleration */
                  }}>
                    {(donation.points || 0).toLocaleString()}
                  </div>
                </TableRow>
              ))}
            </LeaderboardTable>
          </div>
        ) : (
          <Text style={{ textAlign: 'center', marginTop: '24px' }}>
            No donations found. Make your first donation to earn points!
          </Text>
        )}

        <Flex justify="center" style={{ marginTop: '24px' }}>
          <Button onClick={() => navigate('/donate')}>Make a Donation</Button>
        </Flex>
      </UserStatsCard>
    );
  };

  return (
    <>
      {/* Navigation help message */}
      <div style={{
        textAlign: 'center',
        padding: '10px',
        backgroundColor: 'rgba(108, 92, 231, 0.2)',
        borderRadius: '8px',
        marginBottom: '20px',
        border: '1px solid var(--primary)'
      }}>
        <p style={{ color: 'white' }}>Contributors points are added to the leaderboard at the end of every week.</p>
      </div>

      <LeaderboardSection style={{ position: 'relative', zIndex: 1 }}>
        <Container>
          <LeaderboardContent style={{ position: 'relative', zIndex: 1 }}>
            <Heading level={1}>Donation Leaderboard</Heading>
            <Text size="18px" mb="10px">
              Ranking of the top contributors to the deHouse DAO Treasury.
            </Text>
            <Text size="18px" mb="10px">
              Every $0.10 donated earns 10 points.
            </Text>

            <LeaderboardCard>
              <LeaderboardHeader justify="space-between" align="center">
                <Heading level={3} style={{ marginBottom: 0 }}>Top Contributors</Heading>

                <FilterContainer gap="16px">
                  <Button
                    secondary={(timeFilter !== 'all').toString()}
                    onClick={() => handleTimeFilterChange('all')}
                  >
                    All Time
                  </Button>
                  <Button
                    secondary={(timeFilter !== 'month').toString()}
                    onClick={() => handleTimeFilterChange('month')}
                  >
                    This Month
                  </Button>
                  <Button
                    secondary={(timeFilter !== 'week').toString()}
                    onClick={() => handleTimeFilterChange('week')}
                  >
                    This Week
                  </Button>
                </FilterContainer>
              </LeaderboardHeader>

              <SearchContainer>
                <SearchIcon>🔍</SearchIcon>
                <SearchInput
                  placeholder="Search by wallet address"
                  value={searchQuery}
                  onChange={handleSearch}
                />
              </SearchContainer>

              <LeaderboardTable>
                <TableHeader>
                  <RankCell>Rank</RankCell>
                  <AddressCell>Wallet Address</AddressCell>
                  <DonationsCell>Donations</DonationsCell>
                  <PointsCell>Points</PointsCell>
                </TableHeader>

                {filteredData.length > 0 ? (
                  filteredData.map((item) => (
                    <TableRow key={item.rank}>
                      <RankCell rank={item.rank}>#{item.rank}</RankCell>
                      <AddressCell>
                        <Flex align="center">
                          <Text mb="0">{truncateAddress(item.address)}</Text>
                          <Flex gap="4px" style={{ marginLeft: '12px' }}>
                            {item.cryptos.map(crypto => (
                              <Badge key={crypto} type="primary" style={{ fontSize: '10px', padding: '2px 6px' }}>{crypto}</Badge>
                            ))}
                          </Flex>
                        </Flex>
                      </AddressCell>
                      <DonationsCell>{item.donations || 0}</DonationsCell>
                      <PointsCell>{(item.points || 0).toLocaleString()}</PointsCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <AddressCell style={{ textAlign: 'center' }}>
                      <Text mb="0">No results found</Text>
                    </AddressCell>
                  </TableRow>
                )}
              </LeaderboardTable>

              <Pagination justify="center" gap="8px">
                <PageButton onClick={() => handlePageChange(Math.max(1, currentPage - 1))}>&lt;</PageButton>
                <PageButton active={(currentPage === 1).toString()} onClick={() => handlePageChange(1)}>1</PageButton>
                <PageButton active={(currentPage === 2).toString()} onClick={() => handlePageChange(2)}>2</PageButton>
                <PageButton active={(currentPage === 3).toString()} onClick={() => handlePageChange(3)}>3</PageButton>
                <PageButton>...</PageButton>
                <PageButton onClick={() => handlePageChange(10)}>10</PageButton>
                <PageButton onClick={() => handlePageChange(Math.min(10, currentPage + 1))}>&gt;</PageButton>
              </Pagination>
            </LeaderboardCard>

            {renderUserStats()}

            {/* Admin Section - Only visible to admin users */}
            <AdminControls>
              <AdminSection>
                <Heading level={3}>Admin Controls</Heading>
                <Text mb="24px">
                  Warning: These actions are irreversible and will affect all users.
                </Text>

                <Flex gap="16px" direction="column">
                  {/* Add Wallet to Leaderboard Section */}
                  <Card style={{ padding: '16px', marginBottom: '24px' }}>
                    <Heading level={4} style={{ marginBottom: '16px' }}>Add Wallet to Leaderboard</Heading>
                    <Flex direction="column" gap="16px">
                      <Input
                        type="text"
                        placeholder="Wallet Address"
                        value={manualWalletAddress || ''}
                        onChange={(e) => setManualWalletAddress(e.target.value)}
                      />
                      <Input
                        type="number"
                        placeholder="Points"
                        value={manualPoints || ''}
                        onChange={(e) => setManualPoints(e.target.value)}
                      />
                      <Input
                        type="number"
                        placeholder="USD Value"
                        value={manualUsdValue || ''}
                        onChange={(e) => setManualUsdValue(e.target.value)}
                      />
                      <AdminButton
                        onClick={handleAddWalletToLeaderboard}
                        disabled={isAddingWallet}
                      >
                        {isAddingWallet ? 'Adding Wallet...' : 'Add Wallet to Leaderboard'}
                      </AdminButton>
                      {addWalletSuccess === true && (
                        <Text style={{ color: 'green' }}>Wallet added successfully!</Text>
                      )}
                      {addWalletSuccess === false && (
                        <Text style={{ color: 'red' }}>Failed to add wallet. Check console for errors.</Text>
                      )}
                    </Flex>
                  </Card>

                  {/* Clear Database Section */}
                  <AdminButton
                    onClick={handleClearDatabase}
                    disabled={isClearing}
                  >
                    {isClearing ? 'Clearing Database...' : 'Clear Database'}
                  </AdminButton>

                  {clearSuccess === true && (
                    <Text style={{ color: 'green' }}>Database cleared successfully!</Text>
                  )}

                  {clearSuccess === false && (
                    <Text style={{ color: 'red' }}>Failed to clear database. Check console for errors.</Text>
                  )}
                </Flex>
              </AdminSection>
            </AdminControls>
          </LeaderboardContent>
        </Container>
      </LeaderboardSection>
    </>
  );
};

export default LeaderboardPage;
