import React, { createContext, useState, useContext, useEffect } from 'react';

const WaitlistContext = createContext();

export const useWaitlist = () => useContext(WaitlistContext);

export const WaitlistProvider = ({ children }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const openWaitlist = () => setIsModalOpen(true);
  const closeWaitlist = () => setIsModalOpen(false);

  // Automatic trigger logic
  useEffect(() => {
    const hasJoined = localStorage.getItem('waitlist_joined');
    const hasDismissed = sessionStorage.getItem('waitlist_dismissed');

    if (!hasJoined && !hasDismissed) {
      const timer = setTimeout(() => {
        setIsModalOpen(true);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, []);

  return (
    <WaitlistContext.Provider value={{ isModalOpen, openWaitlist, closeWaitlist }}>
      {children}
    </WaitlistContext.Provider>
  );
};
