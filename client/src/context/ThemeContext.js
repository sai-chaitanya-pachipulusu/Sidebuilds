import React, { createContext, useContext, useEffect } from 'react';

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  // Always use dark mode
  const isDarkMode = true;

  // Apply dark theme to document when component mounts
  useEffect(() => {
    // Apply dark theme to document
    document.documentElement.classList.add('dark-theme');
    document.documentElement.classList.remove('light-theme');
  }, []);

  return (
    <ThemeContext.Provider value={{ isDarkMode }}>
      {children}
    </ThemeContext.Provider>
  );
};

// Custom hook to use theme
export const useTheme = () => useContext(ThemeContext);

export default ThemeContext; 