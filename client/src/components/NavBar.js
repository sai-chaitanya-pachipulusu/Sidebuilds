import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link as RouterLink, useLocation, useNavigate } from 'react-router-dom';
import { 
  Box, Flex, HStack, Button, IconButton, Text, 
  useDisclosure, Drawer, DrawerBody,
  DrawerHeader, DrawerOverlay, DrawerContent, DrawerCloseButton,
  Link,
  Popover, PopoverTrigger, PopoverContent, PopoverHeader, PopoverArrow, PopoverCloseButton, PopoverBody, PopoverFooter,
  Badge, VStack, Spinner, Tooltip, Icon, useToast,
} from '@chakra-ui/react';
import { BellIcon, CheckCircleIcon, InfoIcon } from '@chakra-ui/icons';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { getNotifications, markNotificationAsRead, markAllNotificationsAsRead } from '../services/api';
import { getSocket, subscribeToSocketStatus, getCurrentSocketStatus } from '../utils/socket';
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

const ProfileIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M20 21V19C20 16.7909 18.2091 15 16 15H8C5.79086 15 4 16.7909 4 19V21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M12 11C14.2091 11 16 9.20914 16 7C16 4.79086 14.2091 3 12 3C9.79086 3 8 4.79086 8 7C8 9.20914 9.79086 11 12 11Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const FAQIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M9.09 9C9.3251 8.33167 9.78915 7.76261 10.4056 7.37333C11.022 6.98405 11.7579 6.79901 12.5 6.80001C13.2421 6.79901 13.978 6.98405 14.5944 7.37333C15.2108 7.76261 15.6749 8.33167 15.91 9.00001" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M12 16V16.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M3 10C3 15 3 17 9.5 21C16 17 16 15 16 10C16 5.66667 13.2 3.16667 12 2.5C10.8 3.16667 8 5.66667 8 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
     <path d="M18 10C18 11.8856 18.4717 13.6826 19.3261 15.1906C20.1806 16.6985 21.3794 17.8562 22.8023 18.5293" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const TermsIcon = () => ( // Simple document icon for Terms
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M14 2V8H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M16 13H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M16 17H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M10 9H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

function NavBar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, logout, user } = useAuth();
  const toast = useToast();
  const [scrolled, setScrolled] = useState(false);
  const { isOpen: isMobileMenuOpen, onOpen: onMobileMenuOpen, onClose: onMobileMenuClose } = useDisclosure();
  const { isOpen: isNotifOpen, onOpen: onNotifOpen, onClose: onNotifClose } = useDisclosure();

  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(false);
  const [socketStatus, setSocketStatus] = useState(getCurrentSocketStatus());
  const lastToastIdRef = useRef(null); // To prevent multiple toasts for the same status

  useEffect(() => {
    const unsubscribe = subscribeToSocketStatus((status, details) => {
      setSocketStatus(status);
      // Handle toasts for specific statuses
      if (status === 'error' || (status === 'disconnected' && details !== 'User initiated logout')) {
        if (lastToastIdRef.current) toast.close(lastToastIdRef.current);
        lastToastIdRef.current = toast({
          title: "Connection Issue",
          description: status === 'error' ? details : "Disconnected. Trying to reconnect...",
          status: "warning",
          duration: status === 'error' ? 6000 : null, // Longer or indefinite for errors/disconnected
          isClosable: true,
          position: "top"
        });
      } else if (status === 'connected') {
        if (lastToastIdRef.current && toast.isActive(lastToastIdRef.current)) {
            // If a warning/error toast was active, replace it with a success message
            toast.update(lastToastIdRef.current, {
                title: "Connection Restored",
                description: "Successfully connected to the server.",
                status: "success",
                duration: 3000,
                isClosable: true,
            });
        } else if (details && details.startsWith('Reconnected')) { // Show toast for reconnection
             toast({
                title: "Reconnected!",
                description: details,
                status: "success",
                duration: 3000,
                isClosable: true,
                position: "top"
            });
        }
        // No new toast if it was just a normal initial connection without a prior warning toast
      }
    });
    return unsubscribe;
  }, [toast]);

  const fetchUserNotifications = useCallback(async (showToast = false) => {
    if (!isAuthenticated || !user) return;
    setIsLoadingNotifications(true);
    try {
      const data = await getNotifications();
      const newNotifications = data || [];
      setNotifications(newNotifications.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)));
      const newUnreadCount = newNotifications.filter(n => !n.is_read).length;
      setUnreadCount(newUnreadCount);
      if (showToast && newUnreadCount > unreadCount) {
        toast({
            title: "New Notification!",
            description: "You have new unread notifications.",
            status: "info",
            duration: 5000,
            isClosable: true,
            icon: <InfoIcon />
        });
      }
    } catch (error) {
      console.error("NavBar: Failed to fetch notifications:", error);
      // Avoid toast for fetch errors unless critical, as polling might recover
    } finally {
      setIsLoadingNotifications(false);
    }
  }, [isAuthenticated, user, toast, unreadCount]);

  useEffect(() => {
    if (isAuthenticated && user) {
      fetchUserNotifications(); // Initial fetch

      try {
        const socket = getSocket();

        const handleNewNotification = (newNotification) => {
          console.log('[Socket.IO] Received new_notification:', newNotification);
          setNotifications(prev => [newNotification, ...prev].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)));
          setUnreadCount(prev => prev + 1);
          toast({
            title: "New Notification!",
            description: newNotification.message.substring(0, 50) + (newNotification.message.length > 50 ? '...' : ''),
            status: "info",
            duration: 5000,
            isClosable: true,
            icon: <InfoIcon />,
            position: "top-right",
          });
        };

        socket.on('new_notification', handleNewNotification);
        // Also listen for messages if NavBar needs to show a general alert, though typically Dashboard handles this.
        // socket.on('new_message', handleNewMessageInNavBar); 

        return () => {
          console.log('[Socket.IO] Cleaning up NavBar listeners');
          socket.off('new_notification', handleNewNotification);
          // socket.off('new_message', handleNewMessageInNavBar);
        };
      } catch (error) {
          console.warn('[NavBar] Socket not available or error setting up listeners:', error.message);
          // Fallback to polling if socket setup fails
          const intervalId = setInterval(() => fetchUserNotifications(true), 60000);
          return () => clearInterval(intervalId);
      }
    } else {
        // Clear notifications if user logs out
        setNotifications([]);
        setUnreadCount(0);
    }
  }, [isAuthenticated, user, fetchUserNotifications, toast]);
  
  const handleMarkOneAsRead = async (notificationId) => {
    try {
      await markNotificationAsRead(notificationId);
      // Optimistically update UI or refetch
      setNotifications(prev => 
        prev.map(n => n.notification_id === notificationId ? { ...n, is_read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1)); // Ensure count doesn't go below 0
    } catch (error) {
      console.error("NavBar: Failed to mark notification as read:", error);
      toast({ title: "Error", description: "Could not mark notification as read.", status: "error"});
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
      onNotifClose(); // Close popover after action
      toast({ title: "Success", description: "All notifications marked as read.", status: "success", icon: <CheckCircleIcon /> });
    } catch (error) {
      console.error("NavBar: Failed to mark all notifications as read:", error);
      toast({ title: "Error", description: "Could not mark all as read.", status: "error"});
    }
  };

  const handleNotificationClick = (notification) => {
    if (!notification.is_read) {
        handleMarkOneAsRead(notification.notification_id); // Mark as read only if unread
    }
    if (notification.link) {
      navigate(notification.link);
    }
    onNotifClose(); // Close popover after click
  };
  
  const isActive = (path) => {
    return location.pathname === path;
  };

  const handleLogout = (e) => {
    e.preventDefault();
    logout();
    onMobileMenuClose(); // Ensure mobile menu closes
    onNotifClose(); // Ensure notification popover closes
  };
  
  useEffect(() => {
    const handleScroll = () => {
      const offset = window.scrollY;
      setScrolled(offset > 50);
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  
  useEffect(() => {
    // Close mobile menu on path change
    if(isMobileMenuOpen) onMobileMenuClose(); 
    // eslint-disable-next-line react-hooks/exhaustive-deps 
  }, [location.pathname]); // Only trigger on path change

  const MotionBox = motion(Box);

  // Determine correct disclosure handlers for mobile menu
  const { isOpen: finalIsMobileMenuOpen, onOpen: finalOnMobileMenuOpen, onClose: finalOnMobileMenuClose } = 
    { isOpen: isMobileMenuOpen, onOpen: onMobileMenuOpen, onClose: onMobileMenuClose };

  return (
    <Box 
      as="header"
      position="fixed"
      top="0"
      left="0"
      right="0"
      zIndex="1000"
      bg={scrolled ? 'var(--card-bg)' : 'transparent'}
      borderBottom={scrolled ? '1px' : 'none'}
      borderColor={scrolled ? 'var(--border-color)' : 'transparent'}
      backdropFilter={scrolled ? 'blur(10px)' : 'none'}
      transition="all 0.3s ease"
      boxShadow={scrolled ? 'var(--card-shadow)' : 'none'}
      py={2}
    >
      <Flex
        maxW="1200px"
        mx="auto"
        py={4}
        px={{ base: 4, md: 6 }} // Responsive padding
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
            <HStack alignItems="center">
              <Text
                fontSize={{ base: 'xl', md: '2xl' }} // Responsive font size
                fontWeight="bold"
                letterSpacing="wider"
                textTransform="lowercase"
                color="var(--text-color)"
              >
                sidebuilds.
              </Text>
              {/* Socket Status Indicator */}
              <Tooltip 
                label={socketStatus === 'connected' ? `Connected (${user?.username || ''})` : socketStatus === 'connecting' ? 'Connecting...' : socketStatus === 'error' ? 'Connection Error' : 'Disconnected'} 
                placement="bottom" 
                hasArrow
              >
                <Box 
                    ml={2} 
                    w="10px" 
                    h="10px" 
                    borderRadius="50%" 
                    bg={socketStatus === 'connected' ? 'green.500' : socketStatus === 'connecting' ? 'yellow.500' : 'red.500'}
                    transition="background-color 0.3s ease"
                />
              </Tooltip>
            </HStack>
          </Link>
        </MotionBox>

        {/* Desktop Navigation */}
        <HStack spacing={{ base: 2, md: 4}} display={{ base: 'none', md: 'flex' }} alignItems="center">
          {isAuthenticated && user && (
            <>
              <NavItem to="/public-projects" isActive={isActive('/public-projects')} icon={ProjectsIcon}>
                Projects
              </NavItem>
              <NavItem to="/marketplace" isActive={isActive('/marketplace')} icon={MarketplaceIcon}>
                Marketplace
              </NavItem>
              <NavItem to="/dashboard" isActive={isActive('/dashboard')} icon={DashboardIcon}>
                Dashboard
              </NavItem>
              <NavItem to="/profile-settings" isActive={isActive('/profile-settings')} icon={ProfileIcon}>
                Profile
              </NavItem>
            </>
          )}
          {!isAuthenticated && (
            <>
                <NavItem to="/public-projects" isActive={isActive('/public-projects')} icon={ProjectsIcon}>
                    Browse Projects
                </NavItem>
                <NavItem to="/faq" isActive={isActive('/faq')} icon={FAQIcon}>
                    FAQ
                </NavItem>
                <NavItem to="/terms" isActive={isActive('/terms')} icon={TermsIcon}>
                    Terms
                </NavItem>
            </>
          )}
        </HStack>

        {/* Auth Buttons & Notification Icon (Desktop and Mobile common right part) */}
        <HStack spacing={{ base: 2, md: 4 }} alignItems="center">
          {isAuthenticated && user && (
            <Popover 
                isOpen={isNotifOpen} 
                onOpen={onNotifOpen} 
                onClose={onNotifClose}
                placement="bottom-end"
                closeOnBlur={true}
            >
                <PopoverTrigger>
                    <Tooltip label="View notifications" placement="bottom" hasArrow>
                        <IconButton 
                            icon={<BellIcon />} 
                            variant="ghost" 
                            aria-label="Notifications" 
                            fontSize="xl"
                            position="relative"
                            color={unreadCount > 0 ? 'blue.400' : 'currentColor'}
                        >
                            {unreadCount > 0 && (
                                <Badge 
                                    colorScheme="blue" 
                                    variant="solid"
                                    borderRadius="full"
                                    boxSize="1.2em" 
                                    fontSize="0.7em"
                                    position="absolute"
                                    top="0px"
                                    right="0px"
                                    display="flex"
                                    alignItems="center"
                                    justifyContent="center"
                                >
                                    {unreadCount > 9 ? '9+' : unreadCount}
                                </Badge>
                            )}
                        </IconButton>
                    </Tooltip>
                </PopoverTrigger>
                <PopoverContent zIndex={1100} w={{ base: "calc(100vw - 30px)", sm: "380px" }} maxH="400px" overflowY="auto" borderColor="var(--border-color)" bg="var(--card-bg)">
                    <PopoverArrow bg="var(--card-bg)" />
                    <PopoverCloseButton />
                    <PopoverHeader fontWeight="semibold">Notifications</PopoverHeader>
                    <PopoverBody p={0}>
                        {isLoadingNotifications ? (
                            <VStack p={4}><Spinner size="md" /><Text>Loading...</Text></VStack>
                        ) : notifications.length === 0 ? (
                            <Text p={4} textAlign="center" color="gray.500">No new notifications.</Text>
                        ) : (
                            <VStack spacing={0} align="stretch">
                                {notifications.map(notif => (
                                    <Box 
                                        key={notif.notification_id} 
                                        p={3} 
                                        borderBottomWidth="1px" 
                                        borderColor="var(--border-color)"
                                        _hover={{ bg: 'var(--hover-bg)' }} 
                                        cursor="pointer"
                                        onClick={() => handleNotificationClick(notif)}
                                        bg={notif.is_read ? 'transparent' : 'blue.50'} // Use a subtle bg for unread
                                        // _dark={{ bg: notif.is_read ? 'transparent' : 'blue.800' }} // Dark mode consideration
                                    >
                                        <Text fontWeight={notif.is_read ? 'normal' : 'bold'} fontSize="sm" noOfLines={2}>{notif.message}</Text>
                                        <Text fontSize="xs" color="gray.500">
                                            {new Date(notif.created_at).toLocaleDateString()} - {new Date(notif.created_at).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}
                                        </Text>
                                    </Box>
                                ))}
                            </VStack>
                        )}
                    </PopoverBody>
                    {notifications.length > 0 && (
                         <PopoverFooter borderTopWidth="1px" borderColor="var(--border-color)" d="flex" justifyContent="flex-end" p={2}>
                            <Button size="xs" variant="ghost" onClick={handleMarkAllRead} disabled={unreadCount === 0}>
                                Mark All Read
                            </Button>
                        </PopoverFooter>
                    )}
                </PopoverContent>
            </Popover>
          )}

          {/* Auth buttons for desktop */}
          <HStack spacing={3} display={{ base: 'none', md: 'flex' }}>
            {isAuthenticated ? (
                <Button 
                    variant="ghost" 
                    onClick={handleLogout} 
                    size="sm" 
                    colorScheme="red"
                    leftIcon={<Icon as={LogoutIcon} />}
                >
                    Logout
                </Button>
            ) : (
              <>
                <Button as={RouterLink} to="/login" variant="outline" size="sm" leftIcon={<Icon as={LoginIcon} />}>Login</Button>
                <Button as={RouterLink} to="/register" variant="solid" colorScheme="blue" size="sm" leftIcon={<Icon as={RegisterIcon} />}>Sign Up</Button>
              </>
            )}
          </HStack>

          {/* Mobile Menu Trigger (Hamburger Icon) */}
          <IconButton 
            aria-label="Open Menu"
            icon={<HamburgerIcon />} 
            display={{ base: 'flex', md: 'none' }}
            onClick={finalOnMobileMenuOpen}
            variant="ghost"
          />
        </HStack>
      </Flex>

      {/* Mobile Drawer Menu */}
      <Drawer isOpen={finalIsMobileMenuOpen} placement="right" onClose={finalOnMobileMenuClose}>
        <DrawerOverlay />
        <DrawerContent bg="var(--card-bg)">
          <DrawerCloseButton />
          <DrawerHeader borderBottomWidth="1px" borderColor="var(--border-color)">
            <Text fontSize="lg" fontWeight="bold" textTransform="lowercase" color="var(--text-color)">sidebuilds.</Text>
          </DrawerHeader>
          <DrawerBody py={6}>
            <VStack spacing={5} align="stretch">
                <MobileNavItem to="/" icon={HomeIcon} isActive={isActive('/')} onClick={finalOnMobileMenuClose}>Home</MobileNavItem>
                {isAuthenticated && user && (
                    <>
                        <MobileNavItem to="/public-projects" icon={ProjectsIcon} isActive={isActive('/public-projects')} onClick={finalOnMobileMenuClose}>Projects</MobileNavItem>
                        <MobileNavItem to="/marketplace" icon={MarketplaceIcon} isActive={isActive('/marketplace')} onClick={finalOnMobileMenuClose}>Marketplace</MobileNavItem>
                        <MobileNavItem to="/dashboard" icon={DashboardIcon} isActive={isActive('/dashboard')} onClick={finalOnMobileMenuClose}>Dashboard</MobileNavItem>
                        <MobileNavItem to="/profile-settings" icon={ProfileIcon} isActive={isActive('/profile-settings')} onClick={finalOnMobileMenuClose}>Profile</MobileNavItem>
                    </>
                )}
                {!isAuthenticated && (
                    <>
                        <MobileNavItem to="/public-projects" icon={ProjectsIcon} isActive={isActive('/public-projects')} onClick={finalOnMobileMenuClose}>Browse Projects</MobileNavItem>
                        <MobileNavItem to="/faq" icon={FAQIcon} isActive={isActive('/faq')} onClick={finalOnMobileMenuClose}>FAQ</MobileNavItem>
                        <MobileNavItem to="/terms" icon={TermsIcon} isActive={isActive('/terms')} onClick={finalOnMobileMenuClose}>Terms</MobileNavItem>
                        <Button as={RouterLink} to="/login" variant="outline" w="full" leftIcon={<Icon as={LoginIcon} />} onClick={finalOnMobileMenuClose}>Login</Button>
                        <Button as={RouterLink} to="/register" variant="solid" colorScheme="blue" w="full" leftIcon={<Icon as={RegisterIcon} />} onClick={finalOnMobileMenuClose}>Sign Up</Button>
                    </>
                )}
                 {isAuthenticated && (
                    <Button 
                        variant="ghost" 
                        onClick={handleLogout} 
                        w="full" 
                        colorScheme="red" 
                        leftIcon={<Icon as={LogoutIcon} />}
                        mt={4}
                    >
                        Logout
                    </Button>
                )}
            </VStack>
          </DrawerBody>
        </DrawerContent>
      </Drawer>
    </Box>
  );
}

// Helper components for Nav items
// ... (NavItem and MobileNavItem definitions remain the same)
const HamburgerIcon = (props) => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path
      d="M3 12H21"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M3 6H21"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M3 18H21"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const HomeIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M3 9L12 2L21 9V20C21 20.5304 20.7893 21.0391 20.4142 21.4142C20.0391 21.7893 19.5304 22 19 22H5C4.46957 22 3.96086 21.7893 3.58579 21.4142C3.21071 21.0391 3 20.5304 3 20V9Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M9 22V12H15V22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const NavItem = ({ icon, children, isActive, to, ...rest }) => {
  const location = useLocation();
  const active = isActive !== undefined ? isActive : location.pathname === to;

  return (
    <Link 
      as={RouterLink} 
      to={to}
      px={3}
      py={2}
      rounded={'md'}
      fontWeight={active ? 'semibold' : 'normal'}
      color={active ? 'var(--accent-color)' : 'var(--text-color-secondary)'}
      borderBottom={active ? '2px solid var(--accent-color)' : '2px solid transparent'} // Underline for active link
      _hover={{
        textDecoration: 'none',
        color: 'var(--accent-color-hover)',
        // bg: 'var(--hover-bg)', // subtle background hover
        borderBottomColor: 'var(--accent-color-hover)' // Underline hover effect
      }}
      display="flex"
      alignItems="center"
      {...rest}
    >
      {icon && <Icon as={icon} mr={2} />}
      {children}
    </Link>
  );
};

const MobileNavItem = ({ icon, children, isActive, to, onClick, ...rest }) => {
    const location = useLocation();
    const active = isActive !== undefined ? isActive : location.pathname === to;
  return (
    <Link
      as={RouterLink}
      to={to}
      onClick={onClick} // Ensure mobile menu closes on navigation
      display="flex"
      alignItems="center"
      px={4}
      py={3}
      w="full"
      rounded="md"
      fontWeight={active ? 'bold' : 'normal'}
      color={active ? 'var(--accent-color)': 'var(--text-color)'}
      bg={active ? 'var(--active-bg)' : 'transparent'} 
      _hover={{
        textDecoration: 'none',
        bg: 'var(--hover-bg)',
        color: 'var(--accent-color-hover)'
      }}
      {...rest}
    >
      {icon && <Icon as={icon} mr={3} />}
      {children}
    </Link>
  );
};

export default NavBar; 