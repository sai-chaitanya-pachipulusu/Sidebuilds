import React, { useState, useEffect } from 'react';
import { Link as RouterLink, useLocation } from 'react-router-dom';
import { 
  Box, Flex, HStack, Button, IconButton, Text, 
  useColorModeValue, useDisclosure, 
  Link,
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalCloseButton
} from '@chakra-ui/react';
import { motion } from 'framer-motion';
import ThemeToggle from './ThemeToggle';
import { useAuth } from '../context/AuthContext';
import './NavBar.css';

// Icons
// const HomeIcon = () => (
//   <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
//     <path d="M3 9L12 2L21 9V20C21 20.5304 20.7893 21.0391 20.4142 21.4142C20.0391 21.7893 19.5304 22 19 22H5C4.46957 22 3.96086 21.7893 3.58579 21.4142C3.21071 21.0391 3 20.5304 3 20V9Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
//     <path d="M9 22V12H15V22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
//   </svg>
// );

const MarketplaceIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M9 22V12H15V22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M19.31 15.75L22.05 15.75C22.05 15.75 20.19 20.09 12.01 20.09C3.83 20.09 1.97 15.75 1.97 15.75L4.71 15.75" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M7.51 6L12 4L16.5 6V10C16.5 10 16.5 12 12 14C7.5 12 7.5 10 7.5 10V6H7.51Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const ProjectsIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M6 2L3 6V20C3 20.5304 3.21071 21.0391 3.58579 21.4142C3.96086 21.7893 4.46957 22 5 22H19C19.5304 22 20.0391 21.7893 20.4142 21.4142C20.7893 21.0391 21 20.5304 21 20V6L18 2H6Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M16 10C16 11.0609 15.5786 12.0783 14.8284 12.8284C14.0783 13.5786 13.0609 14 12 14C10.9391 14 9.92172 13.5786 9.17157 12.8284C8.42143 12.0783 8 11.0609 8 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M3 6H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const DashboardIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M10 3H3V10H10V3Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M21 3H14V10H21V3Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M21 14H14V21H21V14Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M10 14H3V21H10V14Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const LoginIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M15 3H19C19.5304 3 20.0391 3.21071 20.4142 3.58579C20.7893 3.96086 21 4.46957 21 5V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M10 17L15 12L10 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M15 12H3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const RegisterIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M16 21V19C16 17.9391 15.5786 16.9217 14.8284 16.1716C14.0783 15.4214 13.0609 15 12 15H5C3.93913 15 2.92172 15.4214 2.17157 16.1716C1.42143 16.9217 1 17.9391 1 19V21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M8.5 11C10.7091 11 12.5 9.20914 12.5 7C12.5 4.79086 10.7091 3 8.5 3C6.29086 3 4.5 4.79086 4.5 7C4.5 9.20914 6.29086 11 8.5 11Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M20 8V14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M23 11H17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const LogoutIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M9 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M16 17L21 12L16 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M21 12H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

function NavBar() {
  const location = useLocation();
  const { isAuthenticated, logout } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const { isOpen, onOpen, onClose } = useDisclosure();
  
  // Determine active link
  const isActive = (path) => {
    return location.pathname === path;
  };

  const handleLogout = (e) => {
    e.preventDefault();
    logout();
    onClose();
  };
  
  // Handle scroll for navbar style changes
  useEffect(() => {
    const handleScroll = () => {
      const offset = window.scrollY;
      if (offset > 50) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);
  
  // Close mobile menu when route changes
  useEffect(() => {
    onClose();
  }, [location.pathname, onClose]);

  const MotionBox = motion(Box);

  return (
    <Box 
      as="header"
      position="fixed"
      top="0"
      left="0"
      right="0"
      zIndex="1000"
      bg={scrolled ? 'rgba(0, 0, 0, 0.8)' : 'black'}
      borderBottom={scrolled ? '1px' : 'none'}
      borderColor="whiteAlpha.100"
      backdropFilter={scrolled ? 'blur(10px)' : 'none'}
      transition="all 0.3s ease"
      boxShadow={scrolled ? '0 4px 20px rgba(0, 0, 0, 0.2)' : 'none'}
    >
      <Flex
        maxW="1200px"
        mx="auto"
        py={3}
        px={4}
        align="center"
        justify="space-between"
      >
        <MotionBox
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Link 
            as={RouterLink} 
            to="/"
            _hover={{ textDecoration: 'none' }}
          >
            <Text
              fontSize="2xl"
              fontWeight="bold"
              letterSpacing="wider"
            >
              SIDEBUILDS.
            </Text>
          </Link>
        </MotionBox>

        {/* Desktop Navigation */}
        <HStack spacing={8} display={{ base: 'none', md: 'flex' }}>
          <NavItem to="/public-projects" icon={<ProjectsIcon />} isActive={isActive('/public-projects')}>
            Projects
          </NavItem>
          <NavItem to="/marketplace" icon={<MarketplaceIcon />} isActive={isActive('/marketplace')}>
            Marketplace
          </NavItem>
          
          {isAuthenticated ? (
            <>
              <NavItem to="/dashboard" icon={<DashboardIcon />} isActive={isActive('/dashboard')}>
                Dashboard
              </NavItem>
              <IconButton
                aria-label="Logout"
                variant="ghost"
                icon={<LogoutIcon />}
                onClick={handleLogout}
                _hover={{ transform: 'translateY(-2px)', color: 'red.400' }}
              />
            </>
          ) : (
            <>
              <Button 
                as={RouterLink} 
                to="/login"
                variant="ghost"
                leftIcon={<LoginIcon />}
                fontWeight="normal"
              >
                Login
              </Button>
              <Button 
                as={RouterLink} 
                to="/register"
                colorScheme="blue"
                leftIcon={<RegisterIcon />}
              >
                Register
              </Button>
            </>
          )}
          <ThemeToggle />
        </HStack>

        {/* Mobile hamburger */}
        <IconButton
          display={{ base: 'flex', md: 'none' }}
          onClick={onOpen}
          variant="ghost"
          fontSize="20px"
          aria-label="Open menu"
          icon={
            <Box>
              <Box as="span" display="block" w="24px" h="2px" bg="white" mb="4px" />
              <Box as="span" display="block" w="24px" h="2px" bg="white" mb="4px" />
              <Box as="span" display="block" w="24px" h="2px" bg="white" />
            </Box>
          }
        />

        {/* Mobile drawer - replaced with Modal for compatibility */}
        <Modal isOpen={isOpen} onClose={onClose} placement="right" size="full">
          <ModalOverlay />
          <ModalContent bg="gray.900" m={0} ml="auto" h="100vh" maxW="300px" borderRadius="0">
            <ModalCloseButton color="white" />
            <ModalHeader borderBottomWidth="1px" borderColor="whiteAlpha.200">
              Menu
            </ModalHeader>
            <ModalBody p={0}>
              <Flex direction="column" mt={4} spacing={4} p={4}>
                <MobileNavItem to="/public-projects" icon={<ProjectsIcon />} isActive={isActive('/public-projects')}>
                  Projects
                </MobileNavItem>
                <MobileNavItem to="/marketplace" icon={<MarketplaceIcon />} isActive={isActive('/marketplace')}>
                  Marketplace
                </MobileNavItem>
                
                {isAuthenticated ? (
                  <>
                    <MobileNavItem to="/dashboard" icon={<DashboardIcon />} isActive={isActive('/dashboard')}>
                      Dashboard
                    </MobileNavItem>
                    <Button 
                      leftIcon={<LogoutIcon />} 
                      colorScheme="red" 
                      variant="ghost" 
                      justifyContent="flex-start" 
                      mt={2}
                      onClick={handleLogout}
                    >
                      Logout
                    </Button>
                  </>
                ) : (
                  <>
                    <Button 
                      as={RouterLink}
                      to="/login"
                      leftIcon={<LoginIcon />}
                      variant="ghost"
                      justifyContent="flex-start" 
                      mt={2}
                    >
                      Login
                    </Button>
                    <Button 
                      as={RouterLink}
                      to="/register"
                      leftIcon={<RegisterIcon />}
                      colorScheme="blue"
                      justifyContent="flex-start"
                      mt={2}
                    >
                      Register
                    </Button>
                  </>
                )}
              </Flex>
            </ModalBody>
          </ModalContent>
        </Modal>
      </Flex>
    </Box>
  );
}

// Desktop Navigation Item
const NavItem = ({ icon, children, isActive, to }) => {
  const MotionLink = motion(Link);
  
  return (
    <MotionLink
      as={RouterLink}
      to={to}
      px={2}
      py={1}
      display="flex"
      alignItems="center"
      position="relative"
      _hover={{ textDecoration: 'none' }}
      whileHover={{ y: -2 }}
    >
      <HStack spacing={1}>
        {icon}
        <Text color={isActive ? 'brand.500' : 'gray.300'}>{children}</Text>
      </HStack>
      {isActive && (
        <Box
          position="absolute"
          bottom="-6px"
          left="50%"
          transform="translateX(-50%)"
          height="2px"
          width="20px"
          bg="brand.500"
          borderRadius="full"
        />
      )}
    </MotionLink>
  );
};

// Mobile Navigation Item
const MobileNavItem = ({ icon, children, isActive, to }) => {
  return (
    <Button
      as={RouterLink}
      to={to}
      variant="ghost"
      justifyContent="flex-start"
      leftIcon={icon}
      borderLeft={isActive ? '3px solid' : 'none'}
      borderColor={isActive ? 'brand.500' : 'transparent'}
      bg={isActive ? 'whiteAlpha.100' : 'transparent'}
      borderRadius="0"
      pl={isActive ? 3 : 0}
      py={4}
      mb={2}
      _hover={{ bg: 'whiteAlpha.100' }}
    >
      {children}
    </Button>
  );
};

export default NavBar; 