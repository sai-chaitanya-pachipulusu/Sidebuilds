import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container, Heading, VStack, Box, Text, Spinner, Button, Badge, useToast, HStack, IconButton, Flex, Tooltip
} from '@chakra-ui/react';
import { CheckIcon } from '@chakra-ui/icons'; // Or any other icons you might need
import { useAuth } from '../context/AuthContext';
import { getNotifications, markNotificationAsRead, markAllNotificationsAsRead } from '../services/api';

const NotificationsPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all'); // 'all', 'unread'

  const fetchUserNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getNotifications();
      setNotifications(data || []);
      setError(null);
    } catch (err) {
      console.error("Failed to fetch notifications:", err);
      setError("Could not load notifications. Please try again later.");
      toast({ title: "Error", description: err.message || "Failed to load notifications", status: "error", duration: 5000 });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (user) {
      fetchUserNotifications();
    }
  }, [user, fetchUserNotifications]);

  const handleMarkOneAsRead = async (notificationId) => {
    try {
      await markNotificationAsRead(notificationId);
      // Refresh or optimistically update
      setNotifications(prev => 
        prev.map(n => n.notification_id === notificationId ? { ...n, is_read: true } : n)
      );
      toast({ title: "Notification marked as read", status: "success", duration: 2000 });
    } catch (err) {
      console.error("Failed to mark notification as read:", err);
      toast({ title: "Error", description: "Could not mark notification as read", status: "error", duration: 3000 });
    }
  };

  const handleNotificationClick = async (notification) => {
    if (!notification.is_read) {
      await handleMarkOneAsRead(notification.notification_id);
    }
    if (notification.link) {
      navigate(notification.link);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      toast({ title: "All notifications marked as read", status: "success", duration: 2000 });
    } catch (err) {
      console.error("Failed to mark all notifications as read:", err);
      toast({ title: "Error", description: "Could not mark all as read", status: "error", duration: 3000 });
    }
  };

  const filteredNotifications = notifications.filter(n => {
    if (filter === 'unread') return !n.is_read;
    return true;
  }).sort((a, b) => new Date(b.created_at) - new Date(a.created_at)); // Show newest first

  if (loading) {
    return (
      <Container centerContent py={10}>
        <Spinner size="xl" />
        <Text mt={4}>Loading notifications...</Text>
      </Container>
    );
  }

  if (error) {
    return (
      <Container centerContent py={10}>
        <Text color="red.500">{error}</Text>
        <Button onClick={fetchUserNotifications} mt={4}>Try Again</Button>
      </Container>
    );
  }

  return (
    <Container maxW="container.lg" py={8}>
      <Flex justifyContent="space-between" alignItems="center" mb={6}>
        <Heading as="h1" size="xl">Notifications</Heading>
        <HStack>
          <Button 
            size="sm" 
            variant={filter === 'all' ? 'solid' : 'outline'} 
            onClick={() => setFilter('all')} 
            colorScheme={filter === 'all' ? 'blue' : 'gray'}
          >
            All
          </Button>
          <Button 
            size="sm" 
            variant={filter === 'unread' ? 'solid' : 'outline'} 
            onClick={() => setFilter('unread')} 
            colorScheme={filter === 'unread' ? 'blue' : 'gray'}
          >
            Unread ({notifications.filter(n => !n.is_read).length})
          </Button>
          <Button size="sm" onClick={handleMarkAllRead} disabled={notifications.filter(n => !n.is_read).length === 0}>
            Mark All Read
          </Button>
        </HStack>
      </Flex>

      {filteredNotifications.length === 0 ? (
        <Text textAlign="center" color="gray.500" mt={10}>
          {filter === 'unread' ? 'No unread notifications.' : 'You have no notifications yet.'}
        </Text>
      ) : (
        <VStack spacing={4} align="stretch">
          {filteredNotifications.map(notif => (
            <Box 
              key={notif.notification_id}
              p={4} 
              borderWidth="1px" 
              borderRadius="md" 
              shadow="sm"
              bg={notif.is_read ? 'white' : 'blue.50'}
              _hover={{ shadow: 'md', bg: notif.is_read ? 'gray.50' : 'blue.100' }}
              cursor={notif.link ? 'pointer' : 'default'}
              onClick={() => handleNotificationClick(notif)}
              position="relative"
            >
              {!notif.is_read && (
                <Badge colorScheme="blue" variant="solid" position="absolute" top="-8px" left="-8px" fontSize="0.7em">NEW</Badge>
              )}
              <HStack justifyContent="space-between" alignItems="flex-start">
                <VStack align="start" spacing={1} flex={1}>
                    <Text fontWeight={notif.is_read ? 'normal' : 'bold'} noOfLines={2}>{notif.message}</Text>
                    <Text fontSize="xs" color="gray.500">
                        {new Date(notif.created_at).toLocaleDateString()} - {new Date(notif.created_at).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}
                    </Text>
                </VStack>
                {!notif.is_read && (
                    <Tooltip label="Mark as read" placement="top">
                        <IconButton 
                            icon={<CheckIcon />}
                            size="sm"
                            variant="ghost"
                            colorScheme="green"
                            aria-label="Mark as read"
                            onClick={(e) => { 
                                e.stopPropagation(); // Prevent card click
                                handleMarkOneAsRead(notif.notification_id); 
                            }}
                        />
                    </Tooltip>
                )}
              </HStack>
              {notif.link && <Text fontSize="xs" color="blue.500" mt={2}>Click to view details</Text>}
            </Box>
          ))}
        </VStack>
      )}
    </Container>
  );
};

export default NotificationsPage; 