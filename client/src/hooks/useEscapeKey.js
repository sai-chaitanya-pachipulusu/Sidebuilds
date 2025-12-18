import { useEffect } from 'react';

/**
 * Custom hook to handle ESC key press
 * @param {Function} callback - Function to call when ESC is pressed
 * @param {boolean} isActive - Whether the hook should be active (e.g., modal is open)
 */
export const useEscapeKey = (callback, isActive = true) => {
  useEffect(() => {
    if (!isActive) return;

    const handleEscKey = (event) => {
      if (event.key === 'Escape') {
        console.log('ESC key pressed');
        callback();
      }
    };

    window.addEventListener('keydown', handleEscKey);
    
    return () => {
      window.removeEventListener('keydown', handleEscKey);
    };
  }, [callback, isActive]);
};

export default useEscapeKey;

