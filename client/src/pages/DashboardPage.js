import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  Box, Flex, Heading, Text, Button, Alert, AlertIcon,
  Container, useToast, Badge,
  Table, Thead, Tbody, Tr, Th, Td, IconButton,
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalFooter, ModalBody, ModalCloseButton, useDisclosure, Textarea,
  VStack, Spinner,
} from '@chakra-ui/react';
import { CheckIcon, CloseIcon } from '@chakra-ui/icons';
import { useAuth } from '../context/AuthContext';
import { getProjects, deleteProject, getSellerPurchaseRequests, acceptPurchaseRequest, rejectPurchaseRequest, getBuyerPurchaseRequests, createCheckoutSessionForPurchaseRequest } from '../services/api';
import { checkAndProcessPendingPurchase } from '../utils/stripe-helper';
import apiClient from '../services/api';
import axios from 'axios';
import ProjectTable from '../components/ProjectTable';
import StripeConnectModal from '../components/StripeConnectModal';

function DashboardPage() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const toast = useToast();
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [refreshCounter, setRefreshCounter] = useState(0);
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

    // State for Seller Purchase Requests
    const [sellerRequests, setSellerRequests] = useState([]);
    const [loadingSellerRequests, setLoadingSellerRequests] = useState(true);
    const [sellerRequestsError, setSellerRequestsError] = useState('');
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [rejectionReason, setRejectionReason] = useState('');

    // State for Buyer Purchase Requests
    const [buyerRequests, setBuyerRequests] = useState([]);
    const [loadingBuyerRequests, setLoadingBuyerRequests] = useState(true);
    const [buyerRequestsError, setBuyerRequestsError] = useState('');
    const [processingPaymentRequestId, setProcessingPaymentRequestId] = useState(null);
    const [confirmingTransferId, setConfirmingTransferId] = useState(null);

    const { isOpen: isAcceptModalOpen, onOpen: onAcceptModalOpen, onClose: onAcceptModalClose } = useDisclosure();
    const { isOpen: isRejectModalOpen, onOpen: onRejectModalOpen, onClose: onRejectModalClose } = useDisclosure();

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

    // Fetch Seller Purchase Requests
    const fetchSellerRequests = useCallback(async () => {
        setLoadingSellerRequests(true);
        setSellerRequestsError('');
        try {
            const requests = await getSellerPurchaseRequests();
            setSellerRequests(requests);
        } catch (err) {
            console.error("Error fetching seller purchase requests:", err);
            setSellerRequestsError("Failed to load purchase requests. " + (err.error || err.message));
        } finally {
            setLoadingSellerRequests(false);
        }
    }, []);

    const fetchBuyerRequests = useCallback(async () => {
        setLoadingBuyerRequests(true);
        setBuyerRequestsError('');
        try {
            const requests = await getBuyerPurchaseRequests();
            setBuyerRequests(requests);
        } catch (err) {
            console.error("Error fetching buyer purchase requests:", err);
            setBuyerRequestsError("Failed to load your purchase requests. " + (err.error || err.message));
        } finally {
            setLoadingBuyerRequests(false);
        }
    }, []);

    useEffect(() => {
        if (user) {
            fetchSellerRequests();
            fetchBuyerRequests();
            checkStripeConnectStatus();
        }
    }, [user, fetchSellerRequests, fetchBuyerRequests, refreshCounter]);

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

    const openAcceptConfirmation = (request) => {
        setSelectedRequest(request);
        onAcceptModalOpen();
    };

    const handleAcceptRequest = async () => {
        if (!selectedRequest) return;
        try {
            // TODO: Define how seller agrees to terms, for now using a placeholder version
            await acceptPurchaseRequest(selectedRequest.request_id, 'seller_agreed_1.0');
            toast({
                title: "Request Accepted",
                description: `You have accepted the purchase request for "${selectedRequest.project_name}". The buyer will be notified.`, 
                status: "success",
                duration: 5000,
                isClosable: true,
            });
            fetchSellerRequests(); // Refresh list
        } catch (err) {
            toast({
                title: "Acceptance Failed",
                description: err.error || err.message || "Could not accept the request.",
                status: "error",
                duration: 5000,
                isClosable: true,
            });
        } finally {
            onAcceptModalClose();
            setSelectedRequest(null);
        }
    };

    const openRejectConfirmation = (request) => {
        setSelectedRequest(request);
        setRejectionReason(''); // Clear previous reason
        onRejectModalOpen();
    };

    const handleRejectRequest = async () => {
        if (!selectedRequest) return;
        try {
            await rejectPurchaseRequest(selectedRequest.request_id, rejectionReason);
            toast({
                title: "Request Rejected",
                description: `You have rejected the purchase request for "${selectedRequest.project_name}".`, 
                status: "info",
                duration: 5000,
                isClosable: true,
            });
            fetchSellerRequests(); // Refresh list
        } catch (err) {
            toast({
                title: "Rejection Failed",
                description: err.error || err.message || "Could not reject the request.",
                status: "error",
                duration: 5000,
                isClosable: true,
            });
        } finally {
            onRejectModalClose();
            setSelectedRequest(null);
            setRejectionReason('');
        }
    };

    const handleProceedToPayment = async (purchaseRequestId) => {
        setProcessingPaymentRequestId(purchaseRequestId);
        try {
            const response = await createCheckoutSessionForPurchaseRequest(purchaseRequestId);
            if (response && response.url) {
                window.location.href = response.url; // Redirect to Stripe Checkout
            } else {
                throw new Error("Failed to get Stripe Checkout session URL.");
            }
        } catch (err) {
            toast({
                title: "Payment Error",
                description: err.error || err.message || "Could not initiate payment. Please try again.",
                status: "error",
                duration: 7000,
                isClosable: true,
            });
            setProcessingPaymentRequestId(null);
        }
    };
    
    const handleConfirmTransfer = async (purchaseRequestId) => {
        setConfirmingTransferId(purchaseRequestId);
        try {
            const response = await apiClient.post(`/purchase-requests/${purchaseRequestId}/confirm-transfer`);
            
            toast({
                title: "Transfer Confirmed",
                description: "You have successfully confirmed receipt of the project assets.",
                status: "success",
                duration: 5000,
                isClosable: true,
            });
            fetchBuyerRequests();
        } catch (err) {
            toast({
                title: "Confirmation Failed",
                description: err.response?.data?.error || err.message || "Could not confirm transfer. Please try again or contact support.",
                status: "error",
                duration: 7000,
                isClosable: true,
            });
        } finally {
            setConfirmingTransferId(null);
        }
    };

    if (loading && loadingSellerRequests && loadingBuyerRequests) return (
        <Container maxW="container.xl" p={5} centerContent>
            <Spinner size="xl" />
            <Text mt={4}>Loading your dashboard...</Text>
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

            {/* --- Seller Purchase Requests Section --- */}
            <Box mt={10} mb={6} p={5} borderWidth="1px" borderRadius="lg" shadow="md">
                <Heading size="md" mb={4}>Incoming Purchase Requests</Heading>
                {loadingSellerRequests && <Spinner />}
                {sellerRequestsError && <Alert status="error"><AlertIcon />{sellerRequestsError}</Alert>}
                {!loadingSellerRequests && !sellerRequestsError && sellerRequests.length === 0 && (
                    <Text>You have no pending purchase requests.</Text>
                )}
                {!loadingSellerRequests && !sellerRequestsError && sellerRequests.length > 0 && (
                    <Table variant="simple" size="sm">
                        <Thead>
                            <Tr>
                                <Th>Project Name</Th>
                                <Th>Buyer</Th>
                                <Th>Requested On</Th>
                                <Th isNumeric>Price</Th>
                                <Th>Actions</Th>
                            </Tr>
                        </Thead>
                        <Tbody>
                            {sellerRequests.map((req) => (
                                <Tr key={req.request_id}>
                                    <Td>{req.project_name}</Td>
                                    <Td>{req.buyer_username}</Td>
                                    <Td>{new Date(req.request_date).toLocaleDateString()}</Td>
                                    <Td isNumeric>${parseFloat(req.accepted_price).toFixed(2)}</Td>
                                    <Td>
                                        <IconButton icon={<CheckIcon />} colorScheme="green" aria-label="Accept Request" size="sm" mr={2} onClick={() => openAcceptConfirmation(req)} />
                                        <IconButton icon={<CloseIcon />} colorScheme="red" aria-label="Reject Request" size="sm" onClick={() => openRejectConfirmation(req)} />
                                    </Td>
                                </Tr>
                            ))}
                        </Tbody>
                    </Table>
                )}
            </Box>
            {/* --- End Seller Purchase Requests Section --- */}

            {/* --- Buyer Purchase Requests Section --- */}
            <Box mt={10} mb={6} p={5} borderWidth="1px" borderRadius="lg" shadow="md">
                <Heading size="md" mb={4}>My Purchase Requests</Heading>
                {loadingBuyerRequests && <Spinner />}
                {buyerRequestsError && <Alert status="error"><AlertIcon />{buyerRequestsError}</Alert>}
                {!loadingBuyerRequests && !buyerRequestsError && buyerRequests.length === 0 && (
                    <Text>You have not made any purchase requests yet.</Text>
                )}
                {!loadingBuyerRequests && !buyerRequestsError && buyerRequests.length > 0 && (
                    <Table variant="simple" size="sm">
                        <Thead>
                            <Tr>
                                <Th>Project Name</Th>
                                <Th>Seller</Th>
                                <Th>Requested On</Th>
                                <Th isNumeric>Price</Th>
                                <Th>Status</Th>
                                <Th>Actions</Th>
                            </Tr>
                        </Thead>
                        <Tbody>
                            {buyerRequests.map((req) => (
                                <Tr key={req.request_id}>
                                    <Td>{req.project_name}</Td>
                                    <Td>{req.seller_username}</Td>
                                    <Td>{new Date(req.request_date).toLocaleDateString()}</Td>
                                    <Td isNumeric>${req.accepted_price ? parseFloat(req.accepted_price).toFixed(2) : 'N/A'}</Td>
                                    <Td><Badge colorScheme={getStatusColorScheme(req.status)}>{formatStatus(req.status)}</Badge></Td>
                                    <Td>
                                        {req.status === 'seller_accepted_pending_payment' && (
                                            <Button 
                                                colorScheme="green" 
                                                size="xs" 
                                                onClick={() => handleProceedToPayment(req.request_id)}
                                                isLoading={processingPaymentRequestId === req.request_id}
                                                loadingText="Redirecting..."
                                            >
                                                Proceed to Payment
                                            </Button>
                                        )}
                                        {(req.status === 'payment_completed_pending_transfer' || req.status === 'transfer_in_progress' || req.status === 'assets_transferred_pending_buyer_confirmation') && (
                                            <Button colorScheme="blue" size="xs" onClick={() => navigate(`/projects/${req.project_id}/transfer?request_id=${req.request_id}`)}>
                                                Track Transfer
                                            </Button>
                                        )}
                                         {req.status === 'assets_transferred_pending_buyer_confirmation' && (
                                            <Button 
                                                ml={2} 
                                                colorScheme="teal" 
                                                size="xs" 
                                                onClick={() => handleConfirmTransfer(req.request_id)}
                                                isLoading={confirmingTransferId === req.request_id}
                                                loadingText="Confirming..."
                                            >
                                                 Confirm Received
                                            </Button>
                                        )}
                                        {/* Add more actions based on status if needed, e.g., cancel request if applicable */}
                                    </Td>
                                </Tr>
                            ))}
                        </Tbody>
                    </Table>
                )}
            </Box>
            {/* --- End Buyer Purchase Requests Section --- */}

            <Heading size="md" mb={4} mt={hasRecentPurchase && !showPurchased ? 6 : 0}>
                {showPurchased ? 'Purchased Projects' : 'My Projects'}
            </Heading>
            <ProjectTable 
                projects={displayedProjects} 
                type="dashboard" 
                onDelete={handleDelete}
                isLoading={loading}
                error={error}
                showSource={showPurchased}
                highlightId={lastPurchasedProjectId}
            />

            {/* Accept Request Modal */}
            <Modal isOpen={isAcceptModalOpen} onClose={onAcceptModalClose}>
                <ModalOverlay />
                <ModalContent>
                    <ModalHeader>Accept Purchase Request?</ModalHeader>
                    <ModalCloseButton />
                    <ModalBody>
                        <Text>Are you sure you want to accept the purchase request for project <strong>{selectedRequest?.project_name}</strong> from <strong>{selectedRequest?.buyer_username}</strong> for <strong>${selectedRequest?.accepted_price ? parseFloat(selectedRequest.accepted_price).toFixed(2) : '0.00'}</strong>?</Text>
                        <Text mt={2} fontSize="sm">The buyer will be notified and can proceed with payment.</Text>
                        {/* TODO: Add a checkbox or text for agreeing to platform terms for the sale */}
                    </ModalBody>
                    <ModalFooter>
                        <Button colorScheme="green" mr={3} onClick={handleAcceptRequest}>Accept</Button>
                        <Button variant="ghost" onClick={onAcceptModalClose}>Cancel</Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>

            {/* Reject Request Modal */}
            <Modal isOpen={isRejectModalOpen} onClose={onRejectModalClose}>
                <ModalOverlay />
                <ModalContent>
                    <ModalHeader>Reject Purchase Request?</ModalHeader>
                    <ModalCloseButton />
                    <ModalBody>
                        <Text>Are you sure you want to reject the purchase request for project <strong>{selectedRequest?.project_name}</strong>?</Text>
                        <Textarea 
                            mt={4} 
                            placeholder="Optional: Reason for rejection (will be shown to the buyer)" 
                            value={rejectionReason} 
                            onChange={(e) => setRejectionReason(e.target.value)} 
                        />
                    </ModalBody>
                    <ModalFooter>
                        <Button colorScheme="red" mr={3} onClick={handleRejectRequest}>Reject Request</Button>
                        <Button variant="ghost" onClick={onRejectModalClose}>Cancel</Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>
        </Container>
    );
}

// Helper function for status badge color (can be moved to a utils file)
const getStatusColorScheme = (status) => {
    if (status.includes('rejected') || status.includes('failed') || status.includes('error')) return 'red';
    if (status.includes('accepted') || status.includes('completed')) return 'green';
    if (status.includes('pending')) return 'yellow';
    if (status.includes('progress')) return 'blue';
    return 'gray';
};

// Helper function to format status (can be moved to a utils file)
const formatStatus = (status) => {
    return status.replace(/_/g, ' ').split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
};

export default DashboardPage; 