import React, { useState, useEffect } from 'react';
import { Link as RouterLink, useNavigate, useLocation } from 'react-router-dom';
import { 
  Box, Flex, Heading, Text, Button, Alert, AlertIcon,
  Container, useToast, Badge, Link
} from '@chakra-ui/react';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { getProjects, deleteProject } from '../services/api';
import { checkAndProcessPendingPurchase } from '../utils/stripe-helper';
import apiClient from '../services/api';
import axios from 'axios';
import ProjectTable from '../components/ProjectTable';
import StripeConnectModal from '../components/StripeConnectModal';

const MotionBox = motion(Box);

function DashboardPage() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const toast = useToast();
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [deleteError, setDeleteError] = useState('');
    const [refreshCounter, setRefreshCounter] = useState(0);
    // eslint-disable-next-line no-unused-vars
    const [deletingId, setDeletingId] = useState(null);
    const [showPurchased, setShowPurchased] = useState(false);
    const [showDashboardRefreshToast, setShowDashboardRefreshToast] = useState(false);
    const [lastPurchasedProjectId, setLastPurchasedProjectId] = useState(null);
    const [showStripeModal, setShowStripeModal] = useState(false);
    const [stripeAccountStatus, setStripeAccountStatus] = useState({
        hasStripeAccount: false,
        isOnboardingComplete: false,
        accountDetails: null
    });

    // Check for recent purchase parameter in URL
    const queryParams = new URLSearchParams(location.search);
    const purchaseSuccess = queryParams.get('purchase') === 'success';
    const sessionId = queryParams.get('session_id');
    const projectId = queryParams.get('project_id');

    useEffect(() => {
        // If we just completed a purchase, increment the counter to trigger a refresh
        // and remove purchase parameters from URL
        if (purchaseSuccess && sessionId && projectId) {
            setLastPurchasedProjectId(projectId);
            
            // Try to process the purchase and update UI
            checkAndProcessPendingPurchase(sessionId, projectId, apiClient)
                .then(() => {
                    toast({
                        title: "Processing Purchase",
                        description: "Your purchase is being processed. The project will appear in your dashboard shortly.",
                        status: "info",
                        duration: 5000,
                        isClosable: true,
                    });
                    
                    // Force only one additional refresh after 2 seconds
                    setTimeout(() => {
                        setRefreshCounter(prev => prev + 1);
                        setShowDashboardRefreshToast(true);
                    }, 2000);
                })
                .catch(err => {
                    console.error("Failed to process purchase:", err);
                    toast({
                        title: "Purchase Processing Delayed",
                        description: "Your purchase is being processed. It may take a moment to appear in your dashboard.",
                        status: "warning",
                        duration: 7000,
                        isClosable: true,
                    });
                });
                
            // Clean up the URL
            const newUrl = window.location.pathname;
            window.history.replaceState({}, document.title, newUrl);
        }
    }, [purchaseSuccess, sessionId, projectId, toast]);

    // Fetch projects from API
    useEffect(() => {
        const fetchProjects = async () => {
            try {
                setLoading(true);
                const data = await getProjects();
                setProjects(data);
                
                // If showing toast for refresh, check if purchased project is now visible
                if (showDashboardRefreshToast && lastPurchasedProjectId) {
                    const purchasedFound = data.some(p => 
                        p.project_id === lastPurchasedProjectId && p.source === 'purchased'
                    );
                    
                    if (purchasedFound) {
                        toast({
                            title: "Purchase Complete",
                            description: "Your purchased project is now available in your dashboard.",
                            status: "success",
                            duration: 5000,
                            isClosable: true,
                        });
                        setShowDashboardRefreshToast(false);
                        setLastPurchasedProjectId(null);
                    } else {
                        toast({
                            title: "Purchase Processing",
                            description: "Your purchase is still being processed. Please check back in a moment.",
                            status: "info",
                            duration: 5000,
                            isClosable: true,
                        });
                        setShowDashboardRefreshToast(false);
                    }
                }
            } catch (err) {
                console.error("Error fetching projects:", err);
                setError("Failed to load your projects. Please try again later.");
                
                // Handle authentication errors
                if (err.message && err.message.includes('401')) {
                    toast({
                        title: "Session Expired",
                        description: "Your session has expired. Please log in again.",
                        status: "error",
                        duration: 5000,
                        isClosable: true,
                    });
                    logout();
                    navigate('/login');
                }
            } finally {
                setLoading(false);
            }
        };

        fetchProjects();
    }, [logout, navigate, purchaseSuccess, refreshCounter, toast, showDashboardRefreshToast, lastPurchasedProjectId]);

    useEffect(() => {
        checkStripeConnectStatus();
    }, []);

    const checkStripeConnectStatus = async () => {
        try {
            const response = await axios.get('/api/payments/connect/status');
            setStripeAccountStatus({
                hasStripeAccount: response.data.has_account,
                isOnboardingComplete: response.data.onboarding_complete,
                accountDetails: response.data.account_details
            });
        } catch (err) {
            console.error('Failed to check Stripe status:', err);
            // Don't show a toast here, just log it
        }
    };
    
    const handleStripeModalClose = () => {
        setShowStripeModal(false);
    };
    
    const handleStripeConnectSuccess = async () => {
        // Refresh the status after connecting
        setTimeout(async () => {
            await checkStripeConnectStatus();
            setShowStripeModal(false);
            
            toast({
                title: "Stripe Connected",
                description: "Your Stripe account has been successfully connected.",
                status: "success",
                duration: 5000,
                isClosable: true,
            });
        }, 2000);
    };

    const handleDelete = async (projectId) => {
        if (!projectId) return;
        
        try {
            setDeletingId(projectId);
            await deleteProject(projectId);
            
            // Remove deleted project from state
            setProjects(prevProjects => prevProjects.filter(p => p.project_id !== projectId));
            
            toast({
                title: "Project Deleted",
                description: "Your project has been successfully deleted.",
                status: "success",
                duration: 5000,
                isClosable: true,
            });
        } catch (err) {
            console.error("Error deleting project:", err);
            toast({
                title: "Delete Failed",
                description: "Failed to delete project. Please try again.",
                status: "error",
                duration: 5000,
                isClosable: true,
            });
        } finally {
            setDeletingId(null);
        }
    };

    // Filter projects based on current view
    const displayedProjects = showPurchased
        ? projects.filter(p => p.source === 'purchased')
        : projects.filter(p => p.source !== 'purchased');

    const purchasedProjects = projects.filter(p => p.source === 'purchased');
    const hasRecentPurchase = purchasedProjects.length > 0 && purchaseSuccess;

    if (loading) return (
        <Container maxW="container.xl" p={5}>
            <Text>Loading your dashboard...</Text>
        </Container>
    );

    return (
        <Container maxW="container.xl" p={5}>
            <Flex justifyContent="space-between" alignItems="center" mb={6}>
                <Heading size="lg">Your Dashboard</Heading>
                <Flex gap={4}>
                    <Button colorScheme="blue" onClick={() => navigate('/project/new')}>
                        Add New Project
                    </Button>
                    <Button variant="outline" onClick={logout}>
                        Logout
                    </Button>
                </Flex>
            </Flex>

            {error && (
                <Alert status="error" mb={6} borderRadius="md">
                    <AlertIcon />
                    {error}
                </Alert>
            )}

            {/* Stripe Connect Status */}
            <Box 
                p={5} 
                bg="gray.700" 
                borderRadius="md" 
                mb={6}
                boxShadow="sm"
                borderWidth="1px"
                borderColor={stripeAccountStatus.hasStripeAccount ? "green.400" : "yellow.400"}
            >
                <Flex justifyContent="space-between" alignItems="center">
                    <Box>
                        <Heading size="md" mb={2}>
                            Stripe Connect Status
                            {stripeAccountStatus.hasStripeAccount && stripeAccountStatus.isOnboardingComplete ? (
                                <Badge colorScheme="green" ml={2}>Connected</Badge>
                            ) : stripeAccountStatus.hasStripeAccount ? (
                                <Badge colorScheme="yellow" ml={2}>Setup Incomplete</Badge>
                            ) : (
                                <Badge colorScheme="red" ml={2}>Not Connected</Badge>
                            )}
                        </Heading>
                        <Text fontSize="sm" color="gray.300">
                            {!stripeAccountStatus.hasStripeAccount ? (
                                "Connect your Stripe account to sell projects and receive payments directly to your bank account."
                            ) : !stripeAccountStatus.isOnboardingComplete ? (
                                "Please complete your Stripe account setup to start selling projects."
                            ) : (
                                "Your Stripe account is connected and ready to receive payments."
                            )}
                        </Text>
                    </Box>
                    <Button 
                        colorScheme={stripeAccountStatus.hasStripeAccount ? (stripeAccountStatus.isOnboardingComplete ? "green" : "yellow") : "blue"}
                        onClick={() => setShowStripeModal(true)}
                    >
                        {stripeAccountStatus.hasStripeAccount ? (
                            stripeAccountStatus.isOnboardingComplete ? "View Account" : "Complete Setup"
                        ) : (
                            "Connect Stripe"
                        )}
                    </Button>
                </Flex>
            </Box>

            {/* Toggle between all and purchased projects */}
            <Flex justifyContent="space-between" alignItems="center" mb={4}>
                <Heading as="h2" size="md">
                    {showPurchased ? 'Purchased Projects' : 'Your Projects'}
                </Heading>
                <Button 
                    size="sm" 
                    onClick={() => setShowPurchased(!showPurchased)}
                    variant="outline"
                >
                    Show {showPurchased ? 'Your Projects' : 'Purchased Projects'}
                </Button>
            </Flex>

            {/* Stripe Connect Modal */}
            <StripeConnectModal 
                isOpen={showStripeModal} 
                onClose={handleStripeModalClose} 
                onSuccess={handleStripeConnectSuccess} 
            />

            {hasRecentPurchase && (
                <Alert status="success" mb={5} borderRadius="md">
                    <AlertIcon />
                    <Box>
                        <Text fontWeight="bold">Purchase Successful!</Text>
                        <Text fontSize="sm">You can now access your newly purchased project.</Text>
                    </Box>
                </Alert>
            )}

            <ProjectTable 
                projects={displayedProjects} 
                onDelete={handleDelete}
                loading={loading}
                error={error}
                showSource={showPurchased}
                highlightId={lastPurchasedProjectId}
            />
        </Container>
    );
}

export default DashboardPage; 