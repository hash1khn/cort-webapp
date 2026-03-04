import { useEffect, useState } from 'react';

export const useFuelPriceAlert = () => {
  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    // Load dismissed state from localStorage
    const dismissedKey = `fuelPriceAlert_${new Date().toDateString()}`;
    const wasDismissed = localStorage.getItem(dismissedKey) === 'true';
    setIsDismissed(wasDismissed);

    const checkFuelPriceAlert = () => {
      const today = new Date().getDate();
      
      if ((today === 1 || today === 16) && !wasDismissed) {
        const dayType = today === 1 ? 'beginning' : 'middle';
        setAlertMessage(
          `⚠️ Reminder: Please update fuel prices for the ${dayType} of the month.`
        );
        setShowAlert(true);
      } else {
        setShowAlert(false);
      }
    };

    checkFuelPriceAlert();
    
    // Check every hour if date changed
    const interval = setInterval(checkFuelPriceAlert, 3600000);
    
    return () => clearInterval(interval);
  }, []);

  const handleDismiss = () => {
    const dismissedKey = `fuelPriceAlert_${new Date().toDateString()}`;
    localStorage.setItem(dismissedKey, 'true');
    setIsDismissed(true);
    setShowAlert(false);
  };

  return { showAlert: showAlert && !isDismissed, alertMessage, handleDismiss };
};
