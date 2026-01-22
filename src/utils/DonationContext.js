import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useWallet } from './WalletContext';
import databaseService from './DatabaseService';
import blockchainListenerService from './BlockchainListenerService';

// Helper function to calculate points (example: 1 point per USD)
const calculatePoints = (usdValue) => {
  // Adjust this logic as per your project's requirements
  // For example, 1 point per USD donated, rounded down.
  return Math.floor(usdValue);
};

// Create a context for donation tracking
export const DonationContext = createContext();

// How often to refresh the leaderboard display
const LEADERBOARD_REFRESH_INTERVAL = 15000; // Refresh every 15 seconds for quicker updates during testing

export const DonationProvider = ({ children }) => {
  const { isConnected, walletAddress } = useWallet(); // Removed unused walletType
  const [donations, setDonations] = useState([]);
  const [userStats, setUserStats] = useState({ points: 0, totalDonated: 0, donationCount: 0 });
  const [isLoading, setIsLoading] = useState(false);
  const [leaderboard, setLeaderboard] = useState([]);
  const [isListenerActive, setIsListenerActive] = useState(false); // Track listener state
  const isDev = process.env.NODE_ENV === 'development';

  // Callback to load leaderboard data
  const loadLeaderboard = useCallback(async () => {
    console.log('[Context] Loading leaderboard...');
    setIsLoading(true); // Indicate loading for leaderboard fetch
    try {
      const leaderboardData = await databaseService.getLeaderboard();
      setLeaderboard(leaderboardData);
      console.log('[Context] Leaderboard loaded.');
    } catch (error) {
      console.error('[Context] Error loading leaderboard:', error);
    } finally {
       setIsLoading(false); // Finish loading indicator
    }
  }, []); // No dependencies needed for leaderboard fetch itself

  // Callback to load user-specific data
  const loadUserData = useCallback(async () => {
    if (!isConnected || !walletAddress) {
        console.log('[Context] Wallet not connected, clearing user data.');
        setDonations([]);
        setUserStats({ points: 0, totalDonated: 0, donationCount: 0 });
        return;
    }

    console.log(`[Context] Loading user data for ${walletAddress}...`);
    setIsLoading(true);
    try {
        const [userDonations, fetchedUserStats] = await Promise.all([
            databaseService.getDonationsByWallet(walletAddress),
            databaseService.getUserStats(walletAddress)
        ]);
        setDonations(userDonations);
        setUserStats(fetchedUserStats);
        console.log(`[Context] User data loaded for ${walletAddress}. Stats:`, fetchedUserStats);
    } catch (error) {
        console.error('[Context] Error loading user data:', error);
    } finally {
        setIsLoading(false);
    }
  }, [isConnected, walletAddress]); // Depend on connection status and address

  // Start listeners on mount
  useEffect(() => {
    let isActive = true; // Prevent state updates if component unmounts during async ops
    console.log('[Context] Initializing blockchain listener...');
    if (isDev) {
      loadLeaderboard();
      return () => {
        isActive = false;
        setIsListenerActive(false);
      };
    }
    blockchainListenerService.startListening()
        .then(() => {
            if (isActive) {
                console.log('[Context] Blockchain listener started successfully.');
                setIsListenerActive(true);
                 // Initial load of leaderboard after listener starts
                loadLeaderboard();
            }
        })
        .catch(error => {
            console.error('[Context] Failed to start blockchain listener:', error);
            if (isActive) setIsListenerActive(false);
        });

    return () => {
      isActive = false;
      console.log('[Context] Cleaning up: Stopping blockchain listener...');
      blockchainListenerService.stopListening();
      setIsListenerActive(false);
    };
  }, [loadLeaderboard]); // Include loadLeaderboard in dependency array

  // Refresh leaderboard periodically
  useEffect(() => {
    console.log(`[Context] Setting up leaderboard refresh interval (${LEADERBOARD_REFRESH_INTERVAL}ms)`);
    const intervalId = setInterval(loadLeaderboard, LEADERBOARD_REFRESH_INTERVAL);
    return () => {
        console.log('[Context] Clearing leaderboard refresh interval.');
        clearInterval(intervalId);
    };
  }, [loadLeaderboard]); // Depend only on the memoized loadLeaderboard function

  // Load user data when wallet connects/changes
  useEffect(() => {
    loadUserData();
  }, [loadUserData]); // Depend on the memoized loadUserData function

  // Function to manually record a donation (mostly for testing/fallback)
  const recordDonation = async (amount, currency) => {
    if (!isConnected || !walletAddress) throw new Error('Wallet not connected');

    // Validate amount: Ensure it's a non-negative number
    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount < 0) {
        console.error('[Context] Invalid amount for manual donation. Amount must be a non-negative number. Received:', amount);
        throw new Error('Invalid donation amount: Must be a non-negative number.');
    }

    // Validate currency: Ensure it's a non-empty string
    if (!currency || typeof currency !== 'string' || currency.trim() === '') {
        console.error('[Context] Invalid currency for manual donation. Currency must be a non-empty string. Received:', currency);
        throw new Error('Invalid currency: Must be a non-empty string.');
    }

    setIsLoading(true);
    try {
        // NOTE: This uses hardcoded rates, ONLY for manual entry. Real donations rely on listeners.
        const fallbackRates = { btc: 60000, eth: 3000, sol: 150, usdc: 1, usdt: 1, dai: 1 };
        const lowerCurrency = currency.toLowerCase().trim(); // Trim whitespace
        const rate = fallbackRates[lowerCurrency] || 0;

        let usdValue = numericAmount * rate;
        // Safeguard against NaN for usdValue (though less likely with prior numericAmount validation)
        if (isNaN(usdValue)) {
            console.warn(`[Context] Calculated usdValue is NaN (Amount: ${numericAmount}, Rate: ${rate}). Defaulting to 0.`);
            usdValue = 0;
        }

        let points = calculatePoints(usdValue);
        // Safeguard against NaN for points (calculatePoints(NaN) is NaN)
        if (isNaN(points)) {
            console.warn(`[Context] Calculated points is NaN (USD Value: ${usdValue}). Defaulting to 0.`);
            points = 0;
        }

        // Ensure wallet address is normalized (lowercase)
        const normalizedWalletAddress = walletAddress.toLowerCase();

        const donation = {
            id: `manual-${Date.now()}`,
            timestamp: Date.now(),
            walletAddress: normalizedWalletAddress, // Use normalized wallet address
            amount: numericAmount, // Use validated numeric amount
            currency: currency.toUpperCase(),
            usdValue, // Use potentially corrected usdValue
            points,   // Use potentially corrected points
            txHash: `manual_${Date.now().toString(16)}`,
            chain: 'MANUAL',
        };
        console.log('[Context] Recording manual donation:', donation);

        // Step 1: Add the donation to the database
        const added = await databaseService.addDonation(donation);

        // Step 2: Directly update the leaderboard
        const leaderboardUpdated = await databaseService.directUpdateLeaderboard(
            normalizedWalletAddress,
            points,
            usdValue
        );

        if (added && leaderboardUpdated) {
            console.log('[Context] Donation added and leaderboard updated successfully, reloading data...');
            // Reload user stats and leaderboard after adding the donation
            await loadUserData(); // Reload user stats after manual add
            await loadLeaderboard(); // Force leaderboard refresh
            return added; // Or a more meaningful success object
        } else {
            // Log which part failed if possible
            if (!added) console.error('[Context] Failed to add donation to database.');
            if (!leaderboardUpdated) console.error('[Context] Failed to update leaderboard.');
            throw new Error("Failed to add manual donation to database or update leaderboard.");
        }
    } catch (error) {
        console.error('[Context] Error recording manual donation:', error);
        // Re-throw the error so the caller can handle it, or return a specific error structure
        throw error;
    } finally {
        setIsLoading(false);
    }
  };

  // Function to verify a donation transaction
  const verifyDonation = async (txHash, currency) => {
    console.log(`[Context] Verifying donation Tx: ${txHash}, Currency: ${currency}`);
    setIsLoading(true);
    try {
      const result = await blockchainListenerService.verifyTransaction(txHash, currency);

      if (result.verified && result.donation) {
        // If verification was successful, directly update the leaderboard
        const leaderboardUpdated = await databaseService.directUpdateLeaderboard(
          walletAddress.toLowerCase(),
          result.donation.points,
          result.donation.usdValue
        );

        if (leaderboardUpdated) {
          console.log('[Context] Leaderboard updated successfully after verification');
        } else {
          console.error('[Context] Failed to update leaderboard after verification');
        }

        console.log('[Context] Verification successful, reloading data.');
        await loadUserData(); // Reload user stats
        await loadLeaderboard(); // Force leaderboard refresh
      } else {
        console.warn('[Context] Verification failed:', result.message);
      }
      return result; // Return the whole result object
    } catch (error) {
      console.error('[Context] Error verifying donation:', error);
      return { verified: false, message: `Verification error: ${error.message}` };
    } finally {
      setIsLoading(false);
    }
  };

  // Function to get user rank (no need to store rank in state, compute on demand)
  const getUserRank = useCallback(async () => {
     if (!isConnected || !walletAddress) return null;
     // Directly use the current leaderboard state if fresh enough, or fetch
     // For simplicity, let DB handle fetching the latest sorted list
     return await databaseService.getUserRank(walletAddress);
  }, [isConnected, walletAddress]);


  // Function to clear the database
  const clearDatabase = async () => {
    console.log('[Context] Clearing database...');
    setIsLoading(true);
    try {
      const result = await databaseService.clearDatabase();
      if (result) {
        console.log('[Context] Database cleared successfully');
        // Reload data after clearing
        await loadLeaderboard();
        await loadUserData();
      } else {
        console.error('[Context] Failed to clear database');
      }
      return result;
    } catch (error) {
      console.error('[Context] Error clearing database:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <DonationContext.Provider
      value={{
        donations, // User's donations
        userStats, // User's aggregated points, totalDonated, count
        isLoading,
        isListenerActive,
        leaderboard,
        recordDonation, // Manual record
        verifyDonation, // Manual verification
        getUserRank,    // Get current user's rank
        refreshLeaderboard: loadLeaderboard, // Expose manual refresh
        loadLeaderboard, // Expose loadLeaderboard directly
        loadUserData,    // Expose loadUserData directly
        clearDatabase // Expose database clearing function
      }}
    >
      {children}
    </DonationContext.Provider>
  );
};

// Custom hook to use the donation context
export const useDonation = () => useContext(DonationContext);
