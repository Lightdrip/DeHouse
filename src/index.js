import React, { useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import { UserProvider } from './utils/UserContext';
import GlobalStyle from './styles/GlobalStyle';
import Header from './components/Header';
import Footer from './components/Footer';
import HomePage from './pages/HomePage';
import DonatePage from './pages/DonatePage';
import LeaderboardPage from './pages/LeaderboardPage';
import AboutPage from './pages/AboutPage';
import ProfilePage from './pages/ProfilePage';
import { WalletProvider } from './utils/WalletContext';
import { DonationProvider } from './utils/DonationContext';
import { WaitlistProvider } from './utils/WaitlistContext';
import WaitlistModal from './components/WaitlistModal';

// Video background component
const VideoBackground = () => {
  useEffect(() => {
    const existingElement = document.getElementById('video-background');
    if (existingElement) {
      return;
    }
    // Create video element
    const videoElement = document.createElement('video');
    videoElement.id = 'video-background';
    videoElement.autoplay = true;
    videoElement.loop = true;
    videoElement.muted = true;
    videoElement.playsInline = true;
    videoElement.dataset.persist = 'true';

    // Set video source
    const source = document.createElement('source');
    source.src = 'https://ik.imagekit.io/kimji3uwr/globe%20backgrond.mp4?tr=orig&updatedAt=1747891630722';
    source.type = 'video/mp4';

    // Append source to video and video to body
    videoElement.appendChild(source);
    document.body.appendChild(videoElement);

    // Start playing the video
    videoElement.play().catch(error => {
      if (error?.name !== 'AbortError') {
        console.error('Error playing the video:', error);
      }
    });

    // Clean up on component unmount
    return () => {
      if (document.body.contains(videoElement) && videoElement.dataset.persist !== 'true') {
        document.body.removeChild(videoElement);
      }
    };
  }, []);

  return null; // This component doesn't render anything directly
};

const App = () => {
  return (
    <WalletProvider>
      <UserProvider>
      <DonationProvider>
        <WaitlistProvider>
          <Router>
            <GlobalStyle />
            <WaitlistModal />
            <VideoBackground />
            <div style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              zIndex: 99999
            }}>
              <Header />
            </div>
            <main style={{
              position: 'relative',
              zIndex: 1,
              marginTop: '80px' /* Add margin to accommodate fixed header */
            }}>
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/donate" element={<DonatePage />} />
                <Route path="/leaderboard" element={<LeaderboardPage />} />
                <Route path="/about" element={<AboutPage />} />
                <Route path="/profile" element={<ProfilePage />} />
              </Routes>
            </main>
            <Footer />
          </Router>
        </WaitlistProvider>
      </DonationProvider>
      </UserProvider>
    </WalletProvider>
  );
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
