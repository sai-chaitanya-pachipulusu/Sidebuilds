import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation, Link as RouterLink } from 'react-router-dom';
import {
  Box, Flex, Heading, Text, Button, Alert, AlertIcon,
  Container, useToast, Badge, Link,
  Table, Thead, Tbody, Tr, Th, Td,
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalFooter, ModalBody, ModalCloseButton, useDisclosure, Textarea,
  Spinner, VStack, HStack, Input, Checkbox as ChakraCheckbox,
  Tabs, TabList, TabPanels, Tab, TabPanel, Avatar, Tooltip, IconButton, InputGroup, InputRightElement
} from '@chakra-ui/react';
import { ArrowUpIcon } from '@chakra-ui/icons';
import { useAuth } from '../context/AuthContext';
import {
  getProjects, deleteProject,
  getSellerPurchaseRequests,
  getBuyerPurchaseRequests, createCheckoutSessionForPurchaseRequest,
  sellerProposeTerms, buyerAcceptsTerms, buyerWithdrawInterest, sellerDeclineInterest,
  updateSellerTransferStatus,
  confirmTransferReceived,
  getPurchaseRequestMessages, sendPurchaseRequestMessage
} from '../services/api';
import { getSocket } from '../utils/socket';
import { checkAndProcessPendingPurchase } from '../utils/stripe-helper';
import apiClient from '../services/api';
import ProjectTable from '../components/ProjectTable';
import StripeConnectModal from '../components/StripeConnectModal';

// Helper function for status badge color
const getStatusColorScheme = (status) => {
    if (!status) return 'gray';
    const lowerStatus = status.toLowerCase();
    if (lowerStatus.includes('rejected') || lowerStatus.includes('failed') || lowerStatus.includes('error') || lowerStatus.includes('declined') || lowerStatus.includes('withdrew')) return 'red';
    if (lowerStatus.includes('accepted') || lowerStatus.includes('completed') || lowerStatus.includes('agreement_reached') || lowerStatus.includes('paid')) return 'green';
    if (lowerStatus.includes('pending') || lowerStatus.includes('expressed') || lowerStatus.includes('reviewing') || lowerStatus.includes('proposed') || lowerStatus.includes('ready_for_payment')) return 'yellow';
    if (lowerStatus.includes('progress') || lowerStatus.includes('transferred') || lowerStatus.includes('transfer_in_progress')) return 'blue';
    return 'gray';
};

// Helper function to format status
const formatStatus = (status) => {
    if (!status) return 'N/A';
    return status.replace(/_/g, ' ').split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
};


function DashboardPage() {
    const { user, logout, fetchUserProfile, token } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const toast = useToast();
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [refreshCounter, setRefreshCounter] = useState(0);
    const [showStripeModal, setShowStripeModal] = useState(false);

    const [sellerRequests, setSellerRequests] = useState([]);
    const [loadingSellerRequests, setLoadingSellerRequests] = useState(true);
    const [sellerRequestsError, setSellerRequestsError] = useState('');
    const [selectedRequest, setSelectedRequest] = useState(null);

    const [buyerRequests, setBuyerRequests] = useState([]);
    const [loadingBuyerRequests, setLoadingBuyerRequests] = useState(true);
    const [buyerRequestsError, setBuyerRequestsError] = useState('');

    const [processingPaymentRequestId, setProcessingPaymentRequestId] = useState(null);
    const [confirmingTransferId, setConfirmingTransferId] = useState(null);
    const [markingAsTransferredId, setMarkingAsTransferredId] = useState(null);
    const [isSubmittingProposal, setIsSubmittingProposal] = useState(false);
    const [isSubmittingBuyerAction, setIsSubmittingBuyerAction] = useState(false);

    const [messages, setMessages] = useState([]);
    const [isLoadingMessages, setIsLoadingMessages] = useState(false);
    const [newMessageContent, setNewMessageContent] = useState("");
    const [currentMessagesRequestId, setCurrentMessagesRequestId] = useState(null);
    const messageInputRef = useRef(null);
    const messagesEndRef = useRef(null);
    const [activeTabIndex, setActiveTabIndex] = useState(0);

    // State for typing indicator
    const [isOpponentTyping, setIsOpponentTyping] = useState(false);
    const [opponentTypingUsername, setOpponentTypingUsername] = useState('');
    const typingTimeoutRef = useRef(null); // To manage the timeout for stopping typing event

    const { isOpen: isProposeTermsModalOpen, onOpen: onProposeTermsModalOpen, onClose: onProposeTermsModalClose } = useDisclosure();
    const { isOpen: isDeclineInterestModalOpen, onOpen: onDeclineInterestModalOpen, onClose: onDeclineInterestModalClose } = useDisclosure();
    const [declineReason, setDeclineReason] = useState('');
    const [sellerProposeFormData, setSellerProposeFormData] = useState({
        sellerCommitments: { legitimateOwner: false, goodFaithNegotiation: false, sellerAgreementAgreed: false },
        agreedTransferableAssets: [
            { id: 'source_code', name: 'Source Code (Frontend & Backend)', included: false, notes: '' },
            { id: 'domain_names', name: 'Domain Name(s)', included: false, notes: '' },
            { id: 'databases', name: 'Databases (Full Dump)', included: false, notes: '' },
            { id: 'social_media_accounts', name: 'Social Media Accounts', included: false, notes: '' },
            { id: 'customer_lists', name: 'Customer Lists / Email Subscribers', included: false, notes: '' },
            { id: 'documentation', name: 'Documentation (Setup, API, etc.)', included: false, notes: '' },
            { id: 'brand_assets', name: 'Brand Assets (Logos, Graphics)', included: false, notes: ''},
            { id: 'other_assets', name: 'Other (Specify)', included: false, notes: '' }
        ],
        sellerProposalMessage: ''
    });
    const { isOpen: isAcceptTermsModalOpen, onOpen: onAcceptTermsModalOpen, onClose: onAcceptTermsModalClose } = useDisclosure();
    const { isOpen: isWithdrawInterestModalOpen, onOpen: onWithdrawInterestModalOpen, onClose: onWithdrawInterestModalClose } = useDisclosure();
    const [buyerAcceptTermsFormData, setBuyerAcceptTermsFormData] = useState({
        assetsListAgreed: false, priceUnderstood: false, paymentBindingUnderstood: false, digitalSignature: ''
    });
    const [withdrawalReason, setWithdrawalReason] = useState('');

    const scrollToBottomMessages = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    const fetchAndDisplayMessages = useCallback(async (requestId, isInitialFetch = true) => {
        if (!requestId) return;
        if (isInitialFetch) {
            setIsLoadingMessages(true);
            setCurrentMessagesRequestId(requestId);
            setMessages([]);
        }
        try {
            const fetchedMessages = await getPurchaseRequestMessages(requestId);
            setMessages(fetchedMessages || []);
            if (isInitialFetch) scrollToBottomMessages();
        } catch (error) {
            console.error("Failed to fetch messages:", error);
            toast({ title: "Error", description: "Could not load messages.", status: "error", duration: 3000 });
        } finally {
            if (isInitialFetch) setIsLoadingMessages(false);
        }
    }, [toast]);

    useEffect(() => {
        if (!currentMessagesRequestId || !user || !token) return;

        let socket;
        try {
            socket = getSocket();
        } catch (error) {
            console.warn("[DashboardPage] Socket not readily available for messages:", error.message);
            return;
        }

        const handleNewMessage = (newMessage) => {
            console.log('[Socket.IO] Received new_message in Dashboard:', newMessage);
            if (newMessage.purchase_request_id === currentMessagesRequestId) {
                setMessages(prevMessages => {
                    if (prevMessages.find(m => m.message_id === newMessage.message_id)) {
                        return prevMessages;
                    }
                    return [...prevMessages, newMessage].sort((a,b) => new Date(a.created_at) - new Date(b.created_at));
                });
                scrollToBottomMessages();
            }
        };

        const handleOpponentTypingStarted = (data) => {
            if (data.purchase_request_id === currentMessagesRequestId && data.userId !== user.id) {
                setOpponentTypingUsername(data.username || 'Someone');
                setIsOpponentTyping(true);
            }
        };

        const handleOpponentTypingStopped = (data) => {
            if (data.purchase_request_id === currentMessagesRequestId && data.userId !== user.id) {
                setIsOpponentTyping(false);
                setOpponentTypingUsername('');
            }
        };

        console.log(`[Socket.IO] Dashboard subscribing to 'new_message' for request ID: ${currentMessagesRequestId}`);
        socket.on('new_message', handleNewMessage);
        socket.on('opponent_typing_started', handleOpponentTypingStarted);
        socket.on('opponent_typing_stopped', handleOpponentTypingStopped);

        // Join the specific purchase request room for typing indicators
        if (currentMessagesRequestId) {
            socket.emit('join_purchase_request_room', { purchase_request_id: currentMessagesRequestId });
            console.log(`[Socket.IO] Dashboard attempting to join room for typing: ${currentMessagesRequestId}`);
        }

        return () => {
            console.log(`[Socket.IO] Dashboard unsubscribing from events for request ID: ${currentMessagesRequestId}`);
            socket.off('new_message', handleNewMessage);
            socket.off('opponent_typing_started', handleOpponentTypingStarted);
            socket.off('opponent_typing_stopped', handleOpponentTypingStopped);
            // Optionally, emit typing_stopped if component unmounts while user was marked as typing
            if (typingTimeoutRef.current) {
                clearTimeout(typingTimeoutRef.current);
                 if (currentMessagesRequestId && user) { // Check if currentMessagesRequestId and user are defined
                    socket.emit('typing_stopped', { purchase_request_id: currentMessagesRequestId });
                }
            }
             // Leave the purchase request room when chat is closed or component unmounts
            if (currentMessagesRequestId) {
                socket.emit('leave_purchase_request_room', { purchase_request_id: currentMessagesRequestId });
                 console.log(`[Socket.IO] Dashboard attempting to leave room for typing: ${currentMessagesRequestId}`);
            }
        };
    }, [currentMessagesRequestId, user, token, toast]);

    const handleSendMessage = async () => {
        if (!currentMessagesRequestId || !newMessageContent.trim() || !user) return;
        const tempId = `temp-${Date.now()}`;
        const optimisticMessage = {
            message_id: tempId,
            purchase_request_id: currentMessagesRequestId,
            sender_id: user.id,
            receiver_id: null,
            content: newMessageContent,
            created_at: new Date().toISOString(),
            is_read: false,
            sender_username: user.username
        };

        setMessages(prev => [...prev, optimisticMessage]);
        setNewMessageContent("");
        scrollToBottomMessages();
        if (messageInputRef.current) {
            messageInputRef.current.focus();
        }

        try {
            const sentMessage = await sendPurchaseRequestMessage(currentMessagesRequestId, optimisticMessage.content);
            setMessages(prev => prev.map(m => m.message_id === tempId ? { ...sentMessage, sender_username: user.username } : m)
                                   .sort((a,b) => new Date(a.created_at) - new Date(b.created_at)));
        } catch (error) {
            console.error("Failed to send message:", error);
            toast({ title: "Error", description: "Could not send message. Please try again.", status: "error", duration: 3000 });
            setMessages(prev => prev.filter(m => m.message_id !== tempId));
        }
    };
    
    useEffect(() => {
        scrollToBottomMessages();
    }, [messages]);

    useEffect(() => {
        const queryParams = new URLSearchParams(location.search);
        const viewParam = queryParams.get('view');
        const requestIdParam = queryParams.get('requestId');

        let tabIndex = 0;
        if (viewParam === 'selling') tabIndex = 1;
        else if (viewParam === 'buying') tabIndex = 2;
        else if (viewParam === 'messages' && requestIdParam) {
            tabIndex = 3;
            if (requestIdParam !== currentMessagesRequestId) {
                fetchAndDisplayMessages(requestIdParam, true);
            }
        } else {
            if (currentMessagesRequestId) {
                 setCurrentMessagesRequestId(null);
                 setMessages([]);
            }
        }
        setActiveTabIndex(tabIndex);

        const purchaseSuccessParam = queryParams.get('purchase') === 'success';
        const sessionIdParam = queryParams.get('session_id');
        const projectIdParam = queryParams.get('project_id');

        if (purchaseSuccessParam && sessionIdParam && projectIdParam) {
            checkAndProcessPendingPurchase(sessionIdParam, projectIdParam, apiClient)
                .then(() => {
                    toast({ title: "Processing Purchase", description: "The project will appear shortly.", status: "info", duration: 5000, isClosable: true });
                    setTimeout(() => setRefreshCounter(prev => prev + 1), 2000);
                })
                .catch(err => {
                    console.error("Failed to process purchase:", err);
                    toast({ title: "Purchase Processing Delayed", description: "It may take a moment to appear.", status: "warning", duration: 7000, isClosable: true });
                });
            const newUrl = location.pathname;
            navigate(newUrl, { replace: true });
        }
    }, [location.search, toast, navigate, fetchAndDisplayMessages, currentMessagesRequestId, location.pathname]);


    useEffect(() => {
        const fetchAllProjects = async () => {
            setLoading(true);
            try {
                const data = await getProjects();
                setProjects(data);
            } catch (err) {
                console.error("Error fetching projects:", err);
                setError("Failed to load your projects.");
                if (err.response && err.response.status === 401) {
                    toast({ title: "Session Expired", status: "error", duration: 5000 });
                    logout(); navigate('/login');
                }
            } finally {
                setLoading(false);
            }
        };
        if(user) fetchAllProjects();
    }, [user, logout, navigate, refreshCounter, toast]);

    const fetchSellerRequestsCb = useCallback(async () => {
        if (!user) return;
        setLoadingSellerRequests(true);
        try {
            const requests = await getSellerPurchaseRequests();
            setSellerRequests(requests.sort((a,b) => new Date(b.created_at) - new Date(a.created_at)));
        } catch (err) {
            console.error("Error fetching seller purchase requests:", err);
            setSellerRequestsError("Failed to load offers. " + (err.message || err.error));
        } finally {
            setLoadingSellerRequests(false);
        }
    }, [user]);

    const fetchBuyerRequestsCb = useCallback(async () => {
        if (!user) return;
        setLoadingBuyerRequests(true);
        try {
            const requests = await getBuyerPurchaseRequests();
            setBuyerRequests(requests.sort((a,b) => new Date(b.created_at) - new Date(a.created_at)));
        } catch (err) {
            console.error("Error fetching buyer purchase requests:", err);
            setBuyerRequestsError("Failed to load your purchase items. " + (err.message || err.error));
        } finally {
            setLoadingBuyerRequests(false);
        }
    }, [user]);

    useEffect(() => {
        fetchSellerRequestsCb();
        fetchBuyerRequestsCb();
    }, [user, refreshCounter, fetchSellerRequestsCb, fetchBuyerRequestsCb]);
    
    useEffect(() => {
        if (user && !user.stripe_account_id) {
            fetchUserProfile();
        }
    }, [user, fetchUserProfile]);

    const openProposeTermsModal = (request) => {
        setSelectedRequest(request);
        setSellerProposeFormData({
            sellerCommitments: { legitimateOwner: false, goodFaithNegotiation: false, sellerAgreementAgreed: false },
            agreedTransferableAssets: [
                { id: 'source_code', name: 'Source Code (Frontend & Backend)', included: false, notes: '' },
                { id: 'domain_names', name: 'Domain Name(s)', included: false, notes: '' },
                { id: 'databases', name: 'Databases (Full Dump)', included: false, notes: '' },
                { id: 'social_media_accounts', name: 'Social Media Accounts', included: false, notes: '' },
                { id: 'customer_lists', name: 'Customer Lists / Email Subscribers', included: false, notes: '' },
                { id: 'documentation', name: 'Documentation (Setup, API, etc.)', included: false, notes: '' },
                { id: 'brand_assets', name: 'Brand Assets (Logos, Graphics)', included: false, notes: ''},
                { id: 'other_assets', name: 'Other (Specify)', included: false, notes: '' }
            ],
            sellerProposalMessage: ''
        });
        onProposeTermsModalOpen();
    };

    const handleSellerCommitmentChange = (e) => {
        const { name, checked } = e.target;
        setSellerProposeFormData(prev => ({ ...prev, sellerCommitments: { ...prev.sellerCommitments, [name]: checked }}));
    };
    const handleAssetChange = (index, field, value) => {
        setSellerProposeFormData(prev => {
            const newAssets = [...prev.agreedTransferableAssets];
            newAssets[index] = { ...newAssets[index], [field]: value };
            return { ...prev, agreedTransferableAssets: newAssets };
        });
    };

    const handleProposeTermsSubmit = async () => {
        if (!selectedRequest) return;
        setIsSubmittingProposal(true);
        try {
            const proposalData = {
                agreedPrice: selectedRequest.offer_price,
                agreedTransferableAssets: sellerProposeFormData.agreedTransferableAssets,
                sellerCommitments: sellerProposeFormData.sellerCommitments,
                sellerProposalMessage: sellerProposeFormData.sellerProposalMessage,
            };
            await sellerProposeTerms(selectedRequest.request_id, proposalData);
            toast({ title: "Terms Proposed", description: "The buyer has been notified.", status: "success" });
            onProposeTermsModalClose();
            setRefreshCounter(prev => prev + 1);
        } catch (error) {
            console.error("Error proposing terms:", error);
            toast({ title: "Proposal Failed", description: error.message || "Could not propose terms.", status: "error" });
        } finally {
            setIsSubmittingProposal(false);
        }
    };

    const openDeclineInterestModal = (request) => {
        setSelectedRequest(request);
        setDeclineReason('');
        onDeclineInterestModalOpen();
    };
    const handleDeclineInterestSubmit = async () => {
        if (!selectedRequest) return;
        setIsSubmittingProposal(true);
        try {
            await sellerDeclineInterest(selectedRequest.request_id, declineReason);
            toast({ title: "Interest Declined", description: "The buyer has been notified.", status: "info" });
            onDeclineInterestModalClose();
            setRefreshCounter(prev => prev + 1);
        } catch (error) {
            console.error("Error declining interest:", error);
            toast({ title: "Action Failed", description: error.message || "Could not decline interest.", status: "error" });
        } finally {
            setIsSubmittingProposal(false);
        }
    };

    const openAcceptTermsModal = (request) => {
        setSelectedRequest(request);
        setBuyerAcceptTermsFormData({
            assetsListAgreed: false, priceUnderstood: false, paymentBindingUnderstood: false, digitalSignature: user?.username || ''
        });
        onAcceptTermsModalOpen();
    };
    const handleBuyerAcceptFormChange = (e) => {
        const { name, value, type, checked } = e.target;
        setBuyerAcceptTermsFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    };

    const handleAcceptTermsSubmit = async () => {
        if (!selectedRequest || !buyerAcceptTermsFormData.digitalSignature) {
            toast({title: "Missing Signature", description: "Please type your name to digitally sign.", status: "warning"});
            return;
        }
        setIsSubmittingBuyerAction(true);
        try {
            await buyerAcceptsTerms(selectedRequest.request_id, { digitalSignature: buyerAcceptTermsFormData.digitalSignature });
            toast({ title: "Terms Accepted!", description: "You can now proceed to payment.", status: "success" });
            onAcceptTermsModalClose();
            setRefreshCounter(prev => prev + 1);
        } catch (error) {
            console.error("Error accepting terms:", error);
            toast({ title: "Acceptance Failed", description: error.message || "Could not accept terms.", status: "error" });
        } finally {
            setIsSubmittingBuyerAction(false);
        }
    };

    const openWithdrawInterestModal = (request) => {
        setSelectedRequest(request);
        setWithdrawalReason('');
        onWithdrawInterestModalOpen();
    };
    const handleWithdrawInterestSubmit = async () => {
        if (!selectedRequest) return;
        setIsSubmittingBuyerAction(true);
        try {
            await buyerWithdrawInterest(selectedRequest.request_id, withdrawalReason);
            toast({ title: "Interest Withdrawn", status: "info" });
            onWithdrawInterestModalClose();
            setRefreshCounter(prev => prev + 1);
        } catch (error) {
            console.error("Error withdrawing interest:", error);
            toast({ title: "Action Failed", description: error.message || "Could not withdraw interest.", status: "error" });
        } finally {
            setIsSubmittingBuyerAction(false);
        }
    };

    const handleProceedToPayment = async (purchaseRequestId) => {
        setProcessingPaymentRequestId(purchaseRequestId);
        try {
            const { sessionId } = await createCheckoutSessionForPurchaseRequest(purchaseRequestId);
            const stripe = window.Stripe(process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY);
            await stripe.redirectToCheckout({ sessionId });
        } catch (error) {
            console.error("Error creating Stripe checkout session:", error);
            toast({ title: "Payment Error", description: error.message || "Could not initiate payment.", status: "error" });
            setProcessingPaymentRequestId(null);
        }
    };

    const handleMarkAssetsTransferred = async (purchaseRequestId) => {
        setMarkingAsTransferredId(purchaseRequestId);
        try {
            await updateSellerTransferStatus(purchaseRequestId, 'assets_transferred_pending_confirmation');
            toast({ title: "Assets Marked as Transferred", description: "Buyer will be notified to confirm receipt.", status: "success" });
            setRefreshCounter(prev => prev + 1);
        } catch (error) {
            console.error("Error marking assets as transferred:", error);
            toast({ title: "Update Failed", description: error.message || "Could not update transfer status.", status: "error" });
        } finally {
            setMarkingAsTransferredId(null);
        }
    };

    const handleConfirmTransfer = async (purchaseRequestId) => {
        setConfirmingTransferId(purchaseRequestId);
        try {
            await confirmTransferReceived(purchaseRequestId);
            toast({ title: "Transfer Confirmed!", description: "The transaction is now complete.", status: "success" });
            setRefreshCounter(prev => prev + 1);
        } catch (error) {
            console.error("Error confirming transfer:", error);
            toast({ title: "Confirmation Failed", description: error.message || "Could not confirm transfer.", status: "error" });
        } finally {
            setConfirmingTransferId(null);
        }
    };

    const handleDeleteProject = async (projectId) => {
        if (window.confirm("Are you sure you want to delete this project? This action cannot be undone.")) {
            try {
                await deleteProject(projectId);
                toast({ title: 'Project Deleted', status: 'success', duration: 3000 });
                setRefreshCounter(prev => prev + 1);
            } catch (err) {
                console.error("Error deleting project:", err);
                toast({ title: 'Error Deleting Project', description: err.message, status: 'error', duration: 5000 });
            }
        }
    };

    const handleTabChange = (index) => {
        setActiveTabIndex(index);
        const params = new URLSearchParams(location.search);
        if (index === 0) params.delete('view'); params.delete('requestId');
        if (index === 1) { params.set('view', 'selling'); params.delete('requestId'); }
        if (index === 2) { params.set('view', 'buying'); params.delete('requestId'); }
        if (index !== 3 && currentMessagesRequestId) {
            setCurrentMessagesRequestId(null);
            setMessages([]);
        }
        navigate(`${location.pathname}?${params.toString()}`, { replace: true });
    };

    if (loading) return <Container centerContent py={10}><Spinner size="xl" /><Text mt={4}>Loading Dashboard...</Text></Container>;
    if (error) return <Container centerContent py={10}><Alert status="error"><AlertIcon />{error}</Alert></Container>;
    if (!user) return <Container centerContent py={10}><Text>Please login to view your dashboard.</Text></Container>;

    const ownedProjects = projects.filter(p => p.user_id === user.id && !p.is_purchased);
    const purchasedProjects = projects.filter(p => p.is_purchased && p.current_owner_id === user.id);

    return (
        <Container maxW="container.xl" py={8}>
            <Flex justifyContent="space-between" alignItems="center" mb={8}>
                <Heading as="h1" size="xl">Welcome, {user.username}</Heading>
                {!user.stripe_account_id && (
                    <Button colorScheme="purple" onClick={() => setShowStripeModal(true)}>
                        Connect Stripe Account
                    </Button>
                )}
            </Flex>

            <StripeConnectModal isOpen={showStripeModal} onClose={() => setShowStripeModal(false)} />

            <Tabs index={activeTabIndex} onChange={handleTabChange} variant="soft-rounded" colorScheme="blue">
                <TabList mb={6} overflowX="auto" pb={2}>
                    <Tab>My Projects ({ownedProjects.length})</Tab>
                    <Tab>Selling ({sellerRequests.filter(r => r.status !== 'completed' && r.status !== 'rejected_by_seller' && r.status !== 'withdrawn_by_buyer').length})</Tab>
                    <Tab>Buying ({buyerRequests.filter(r => r.status !== 'completed' && r.status !== 'rejected_by_seller' && r.status !== 'withdrawn_by_buyer').length})</Tab>
                    <Tab isDisabled={!currentMessagesRequestId}>Messages{currentMessagesRequestId ? ` (Request ${currentMessagesRequestId.substring(0,4)}...)` : ''}</Tab>
                </TabList>

                <TabPanels>
                    <TabPanel>
                        <ProjectTable 
                            projects={ownedProjects} 
                            title="My Side Projects" 
                            onDelete={handleDeleteProject} 
                            showPurchasedToggle={false}
                            isOwnerView={true}
                        />
                        <Button as={RouterLink} to="/projects/new" colorScheme="blue" mt={4}>Add New Project</Button>
                        <Heading as="h2" size="lg" mt={10} mb={4}>Purchased Projects</Heading>
                        <ProjectTable 
                            projects={purchasedProjects} 
                            title="My Purchased Projects" 
                            isOwnerView={false}
                            showPurchasedToggle={false}
                        />
                    </TabPanel>

                    <TabPanel>
                        <Heading as="h2" size="lg" mb={4}>Offers Received (Selling)</Heading>
                        {loadingSellerRequests && <Spinner />}
                        {sellerRequestsError && <Alert status="error"><AlertIcon />{sellerRequestsError}</Alert>}
                        {!loadingSellerRequests && sellerRequests.length === 0 && <Text>No offers received yet.</Text>}
                        {!loadingSellerRequests && sellerRequests.length > 0 && (
                            <Box overflowX="auto">
                            <Table variant="simple" size="sm">
                                <Thead>
                                    <Tr>
                                        <Th>Project</Th>
                                        <Th>Buyer</Th>
                                        <Th isNumeric>Offer Price</Th>
                                        <Th>Status</Th>
                                        <Th>Last Update</Th>
                                        <Th>Actions</Th>
                                    </Tr>
                                </Thead>
                                <Tbody>
                                    {sellerRequests.map(req => (
                                        <Tr key={req.request_id}>
                                            <Td>
                                                <Link as={RouterLink} to={`/projects/${req.project_id}`} color="blue.500" _hover={{ textDecoration: 'underline' }}>
                                                    {req.project_name}
                                                </Link>
                                            </Td>
                                            <Td>{req.buyer_username}</Td>
                                            <Td isNumeric>${parseFloat(req.offer_price).toFixed(2)}</Td>
                                            <Td><Badge colorScheme={getStatusColorScheme(req.status)}>{formatStatus(req.status)}</Badge></Td>
                                            <Td>{new Date(req.updated_at).toLocaleDateString()}</Td>
                                            <Td>
                                                <HStack spacing={2}>
                                                    <Button size="xs" variant="outline" onClick={() => { handleTabChange(3); navigate(`/dashboard?view=messages&requestId=${req.request_id}`); }}>
                                                        Messages ({req.unread_message_count_for_seller > 0 ? <Badge ml={1} colorScheme='red'>{req.unread_message_count_for_seller}</Badge> : '0'})
                                                    </Button>
                                                    {req.status === 'interest_expressed' && (
                                                        <>
                                                            <Button size="xs" colorScheme="green" onClick={() => openProposeTermsModal(req)}>Propose Terms</Button>
                                                            <Button size="xs" colorScheme="red" variant="outline" onClick={() => openDeclineInterestModal(req)}>Decline</Button>
                                                        </>
                                                    )}
                                                    {req.status === 'terms_proposed_by_seller' && <Text fontSize="xs" color="gray.500">Waiting for buyer</Text>}
                                                    {req.status === 'terms_accepted_by_buyer_pending_payment' && <Text fontSize="xs" color="orange.500">Pending Buyer Payment</Text>}
                                                    {req.status === 'payment_successful_pending_transfer' && (
                                                        <Button 
                                                            size="xs" 
                                                            colorScheme="blue" 
                                                            onClick={() => handleMarkAssetsTransferred(req.request_id)}
                                                            isLoading={markingAsTransferredId === req.request_id}
                                                            isDisabled={!user.stripe_account_id || !user.stripe_charges_enabled}
                                                        >
                                                            Mark Assets Transferred
                                                        </Button>
                                                    )}
                                                    {!user.stripe_account_id && req.status === 'payment_successful_pending_transfer' && 
                                                        <Tooltip label="Connect Stripe to enable payouts and mark as transferred" placement="top">
                                                            <Text fontSize="xs" color="red.500">(Stripe Required)</Text>
                                                        </Tooltip>
                                                    }
                                                    {req.status === 'assets_transferred_pending_confirmation' && <Text fontSize="xs" color="blue.500">Waiting for Buyer Confirmation</Text>}
                                                    {req.status === 'completed' && <Badge colorScheme="green">Sale Completed</Badge>}
                                                    {req.status === 'withdrawn_by_buyer' && <Badge colorScheme="red">Buyer Withdrew</Badge>}
                                                    {req.status === 'rejected_by_seller' && <Badge colorScheme="red">You Declined</Badge>}
                                                </HStack>
                                            </Td>
                                        </Tr>
                                    ))}
                                </Tbody>
                            </Table>
                            </Box>
                        )}
                    </TabPanel>

                    <TabPanel>
                        <Heading as="h2" size="lg" mb={4}>My Purchase Requests (Buying)</Heading>
                        {loadingBuyerRequests && <Spinner />}
                        {buyerRequestsError && <Alert status="error"><AlertIcon />{buyerRequestsError}</Alert>}
                        {!loadingBuyerRequests && buyerRequests.length === 0 && <Text>You haven't made any purchase requests yet.</Text>}
                        {!loadingBuyerRequests && buyerRequests.length > 0 && (
                            <Box overflowX="auto">
                            <Table variant="simple" size="sm">
                                <Thead>
                                    <Tr>
                                        <Th>Project</Th>
                                        <Th>Seller</Th>
                                        <Th isNumeric>My Offer</Th>
                                        <Th>Status</Th>
                                        <Th>Last Update</Th>
                                        <Th>Actions</Th>
                                    </Tr>
                                </Thead>
                                <Tbody>
                                    {buyerRequests.map(req => (
                                        <Tr key={req.request_id}>
                                            <Td>
                                                <Link as={RouterLink} to={`/projects/${req.project_id}`} color="blue.500" _hover={{ textDecoration: 'underline' }}>
                                                    {req.project_name}
                                                </Link>
                                            </Td>
                                            <Td>{req.seller_username}</Td>
                                            <Td isNumeric>${parseFloat(req.offer_price).toFixed(2)}</Td>
                                            <Td><Badge colorScheme={getStatusColorScheme(req.status)}>{formatStatus(req.status)}</Badge></Td>
                                            <Td>{new Date(req.updated_at).toLocaleDateString()}</Td>
                                            <Td>
                                                <HStack spacing={2}>
                                                     <Button size="xs" variant="outline" onClick={() => { handleTabChange(3); navigate(`/dashboard?view=messages&requestId=${req.request_id}`); }}>
                                                        Messages ({req.unread_message_count_for_buyer > 0 ? <Badge ml={1} colorScheme='red'>{req.unread_message_count_for_buyer}</Badge> : '0'})
                                                    </Button>
                                                    {req.status === 'interest_expressed' && (
                                                        <>
                                                            <Text fontSize="xs" color="gray.500">Waiting for seller response</Text>
                                                            <Button size="xs" colorScheme="orange" variant="outline" onClick={() => openWithdrawInterestModal(req)}>Withdraw Interest</Button>
                                                        </>
                                                    )}
                                                    {req.status === 'terms_proposed_by_seller' && (
                                                        <>
                                                            <Button size="xs" colorScheme="green" onClick={() => openAcceptTermsModal(req)}>Review & Accept Terms</Button>
                                                            <Button size="xs" colorScheme="orange" variant="outline" onClick={() => openWithdrawInterestModal(req)}>Withdraw Interest</Button>
                                                        </>
                                                    )}
                                                    {req.status === 'terms_accepted_by_buyer_pending_payment' && (
                                                        <Button 
                                                            size="xs" 
                                                            colorScheme="green" 
                                                            onClick={() => handleProceedToPayment(req.request_id)}
                                                            isLoading={processingPaymentRequestId === req.request_id}    
                                                        >
                                                            Proceed to Payment
                                                        </Button>
                                                    )}
                                                    {req.status === 'payment_successful_pending_transfer' && <Text fontSize="xs" color="blue.500">Waiting for Seller to Transfer Assets</Text>}
                                                    {req.status === 'assets_transferred_pending_confirmation' && (
                                                        <Button 
                                                            size="xs" 
                                                            colorScheme="green" 
                                                            onClick={() => handleConfirmTransfer(req.request_id)}
                                                            isLoading={confirmingTransferId === req.request_id}
                                                        >
                                                            Confirm Assets Received
                                                        </Button>
                                                    )}
                                                    {req.status === 'completed' && <Badge colorScheme="green">Purchase Completed</Badge>}
                                                    {req.status === 'withdrawn_by_buyer' && <Badge colorScheme="red">You Withdrew</Badge>}
                                                    {req.status === 'rejected_by_seller' && <Badge colorScheme="red">Seller Declined</Badge>}
                                                </HStack>
                                            </Td>
                                        </Tr>
                                    ))}
                                </Tbody>
                            </Table>
                            </Box>
                        )}
                    </TabPanel>
                    <TabPanel>
                        <Heading as="h2" size="lg" mb={4}>
                            {currentMessagesRequestId ? `Messages for Request (${currentMessagesRequestId.substring(0,8)}...)` : "Select a request to view messages"}
                        </Heading>
                        {!currentMessagesRequestId && (
                            <Text color="gray.500">Navigate to a selling or buying request and click "Messages" to load a conversation.</Text>
                        )}
                        {isLoadingMessages && currentMessagesRequestId && (
                            <Flex justify="center" align="center" h="200px"><Spinner size="xl" /><Text ml={4}>Loading messages...</Text></Flex>
                        )}
                        {!isLoadingMessages && currentMessagesRequestId && messages.length === 0 && (
                            <Text textAlign="center" color="gray.500" mt={10}>No messages in this conversation yet. Start by sending one below.</Text>
                        )}
                        {!isLoadingMessages && currentMessagesRequestId && messages.length > 0 && (
                            <VStack 
                                spacing={4} 
                                align="stretch" 
                                h="calc(100vh - 400px)"
                                overflowY="auto" 
                                p={4} 
                                borderWidth="1px" 
                                borderRadius="md"
                                bg="gray.50"
                                _dark={{bg: "gray.700"}}
                            >
                                {messages.map((msg, index) => (
                                    <Flex key={msg.message_id || `msg-${index}`} direction="column" alignSelf={msg.sender_id === user.id ? 'flex-end' : 'flex-start'}>
                                        <Box
                                            bg={msg.sender_id === user.id ? 'blue.500' : 'gray.200'}
                                            color={msg.sender_id === user.id ? 'white' : 'black'}
                                            px={4} py={2}
                                            borderRadius="lg"
                                            maxW="80%"
                                        >
                                            <HStack alignItems="center" mb={1}>
                                                <Avatar size="xs" name={msg.sender_username || (msg.sender_id === user.id ? user.username : 'Other User')} src={msg.sender_id === user.id ? user.avatar_url : msg.opponent_avatar_url /* Placeholder for opponent avatar if available */} />
                                                <Text fontWeight="bold" fontSize="sm">{msg.sender_username || (msg.sender_id === user.id ? user.username : 'Other User')}</Text>
                                            </HStack>
                                            <Text>{msg.content}</Text>
                                            <Text fontSize="xs" mt={1} textAlign="right" opacity={0.7}>
                                                {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </Text>
                                        </Box>
                                    </Flex>
                                ))}
                                <Box ref={messagesEndRef} />
                            </VStack>
                        )}
                        {currentMessagesRequestId && (
                            <Box mt={2} minH="20px">
                                {isOpponentTyping && opponentTypingUsername && (
                                    <Text fontSize="sm" color="gray.500" fontStyle="italic">
                                        {opponentTypingUsername} is typing...
                                    </Text>
                                )}
                            </Box>
                        )}
                        {currentMessagesRequestId && (
                            <Flex mt={isOpponentTyping ? 1 : 4} as="form" onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }}>
                                <InputGroup>
                                    <Textarea
                                        ref={messageInputRef}
                                        value={newMessageContent}
                                        onChange={(e) => {
                                            setNewMessageContent(e.target.value);
                                            if (!currentMessagesRequestId || !user) return;

                                            const socket = getSocket();
                                            if (!socket) return;

                                            if (typingTimeoutRef.current) {
                                                clearTimeout(typingTimeoutRef.current);
                                            } else {
                                                // Only emit typing_started if not already typing (i.e., timeout was not set)
                                                socket.emit('typing_started', { purchase_request_id: currentMessagesRequestId });
                                            }
                                            
                                            typingTimeoutRef.current = setTimeout(() => {
                                                socket.emit('typing_stopped', { purchase_request_id: currentMessagesRequestId });
                                                typingTimeoutRef.current = null; // Clear the ref after emitting
                                            }, 2000); // Adjust timeout as needed (e.g., 2 seconds)
                                        }}
                                        isDisabled={isLoadingMessages}
                                        resize="none"
                                        minH="40px"
                                        rows={1}
                                    />
                                    <InputRightElement width="4.5rem">
                                        <IconButton 
                                            aria-label="Send message"
                                            icon={<ArrowUpIcon />}
                                            h="1.75rem" 
                                            size="sm" 
                                            type="submit"
                                            colorScheme="blue"
                                            isDisabled={!newMessageContent.trim() || isLoadingMessages}
                                        />
                                    </InputRightElement>
                                </InputGroup>
                            </Flex>
                        )}
                    </TabPanel>
                </TabPanels>
            </Tabs>

            <Modal isOpen={isProposeTermsModalOpen} onClose={onProposeTermsModalClose} size="xl">
                <ModalOverlay />
                <ModalContent>
                    <ModalHeader>Propose Terms for "{selectedRequest?.project_name}"</ModalHeader>
                    <ModalCloseButton />
                    <ModalBody pb={6}>
                        <Text mb={2}><strong>Buyer:</strong> {selectedRequest?.buyer_username}</Text>
                        <Text mb={4}><strong>Offered Price:</strong> ${parseFloat(selectedRequest?.offer_price || 0).toFixed(2)} (This price is fixed by buyer's initial offer)</Text>
                        
                        <Heading size="sm" mb={2}>Seller Commitments:</Heading>
                        <VStack align="start" spacing={2} mb={4} p={3} borderWidth="1px" borderRadius="md">
                            <ChakraCheckbox name="legitimateOwner" isChecked={sellerProposeFormData.sellerCommitments.legitimateOwner} onChange={handleSellerCommitmentChange}>
                                I am the legitimate owner of all assets related to this project.
                            </ChakraCheckbox>
                            <ChakraCheckbox name="goodFaithNegotiation" isChecked={sellerProposeFormData.sellerCommitments.goodFaithNegotiation} onChange={handleSellerCommitmentChange}>
                                I will negotiate in good faith and provide accurate information.
                            </ChakraCheckbox>
                             <ChakraCheckbox name="sellerAgreementAgreed" isChecked={sellerProposeFormData.sellerCommitments.sellerAgreementAgreed} onChange={handleSellerCommitmentChange}>
                                I agree to the <Link as={RouterLink} to="/terms#seller-agreement" color="blue.500" isExternal>Seller Agreement</Link> outlined in the Terms of Service.
                            </ChakraCheckbox>
                        </VStack>

                        <Heading size="sm" mb={2}>Agreed Transferable Assets:</Heading>
                        <Text fontSize="xs" color="gray.500" mb={2}>Specify clearly what will be transferred upon sale. Add notes for clarification.</Text>
                        <VStack align="stretch" spacing={3} mb={4}>
                            {sellerProposeFormData.agreedTransferableAssets.map((asset, index) => (
                                <Box key={asset.id} p={3} borderWidth="1px" borderRadius="md">
                                    <HStack justifyContent="space-between">
                                        <ChakraCheckbox 
                                            isChecked={asset.included} 
                                            onChange={(e) => handleAssetChange(index, 'included', e.target.checked)}
                                        >
                                            {asset.name}
                                        </ChakraCheckbox>
                                    </HStack>
                                    {asset.included && (
                                        <Textarea 
                                            mt={2} 
                                            placeholder={asset.id === 'other_assets' ? "Specify other assets and any notes..." : "Add notes for this asset (e.g., specific accounts, versions)..."}
                                            value={asset.notes}
                                            onChange={(e) => handleAssetChange(index, 'notes', e.target.value)}
                                            size="sm"
                                        />
                                    )}
                                </Box>
                            ))}
                        </VStack>
                        
                        <Heading size="sm" mb={2}>Message to Buyer (Optional):</Heading>
                        <Textarea 
                            placeholder="You can add a message to the buyer with your proposal."
                            value={sellerProposeFormData.sellerProposalMessage}
                            onChange={(e) => setSellerProposeFormData(prev => ({...prev, sellerProposalMessage: e.target.value}))}
                            mb={4}
                        />

                    </ModalBody>
                    <ModalFooter>
                        <Button variant="ghost" mr={3} onClick={onProposeTermsModalClose}>Cancel</Button>
                        <Button 
                            colorScheme="blue" 
                            onClick={handleProposeTermsSubmit} 
                            isLoading={isSubmittingProposal}
                            isDisabled={!sellerProposeFormData.sellerCommitments.legitimateOwner || !sellerProposeFormData.sellerCommitments.goodFaithNegotiation || !sellerProposeFormData.sellerCommitments.sellerAgreementAgreed || !sellerProposeFormData.agreedTransferableAssets.some(a => a.included)}
                        >
                            Propose Terms to Buyer
                        </Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>

            <Modal isOpen={isDeclineInterestModalOpen} onClose={onDeclineInterestModalClose}>
                <ModalOverlay />
                <ModalContent>
                    <ModalHeader>Decline Interest in "{selectedRequest?.project_name}"</ModalHeader>
                    <ModalCloseButton />
                    <ModalBody>
                        <Textarea 
                            placeholder="Reason for declining (optional, will be shared with buyer)"
                            value={declineReason}
                            onChange={(e) => setDeclineReason(e.target.value)}
                        />
                    </ModalBody>
                    <ModalFooter>
                        <Button variant="ghost" mr={3} onClick={onDeclineInterestModalClose}>Cancel</Button>
                        <Button colorScheme="red" onClick={handleDeclineInterestSubmit} isLoading={isSubmittingProposal}>Confirm Decline</Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>

            <Modal isOpen={isAcceptTermsModalOpen} onClose={onAcceptTermsModalClose} size="lg">
                 <ModalOverlay />
                <ModalContent>
                    <ModalHeader>Accept Terms for "{selectedRequest?.project_name}"</ModalHeader>
                    <ModalCloseButton />
                    <ModalBody pb={6}>
                        <Text mb={2}><strong>Seller:</strong> {selectedRequest?.seller_username}</Text>
                        <Text mb={2}><strong>Agreed Price:</strong> ${parseFloat(selectedRequest?.agreed_price || 0).toFixed(2)}</Text>
                        
                        <Heading size="sm" mb={2} mt={4}>Transferable Assets (as proposed by seller):</Heading>
                        {selectedRequest?.agreed_transferable_assets && selectedRequest.agreed_transferable_assets.filter(a => a.included).length > 0 ? (
                            <VStack align="stretch" spacing={1} mb={4} p={3} borderWidth="1px" borderRadius="md">
                                {selectedRequest.agreed_transferable_assets.filter(a => a.included).map(asset => (
                                    <Box key={asset.id}>
                                        <Text>- <strong>{asset.name}</strong>{asset.notes ? `: ${asset.notes}` : ''}</Text>
                                    </Box>
                                ))}
                            </VStack>
                        ) : <Text color="gray.500" mb={4}>No specific assets listed by seller, or proposal details not loaded.</Text>}
                        
                        <Heading size="sm" mb={2} mt={4}>Buyer Commitments:</Heading>
                        <VStack align="start" spacing={2} mb={4} p={3} borderWidth="1px" borderRadius="md">
                            <ChakraCheckbox name="assetsListAgreed" isChecked={buyerAcceptTermsFormData.assetsListAgreed} onChange={handleBuyerAcceptFormChange}>
                                I have reviewed and agree to the list of transferable assets (or understand it will be standard assets if not detailed).
                            </ChakraCheckbox>
                            <ChakraCheckbox name="priceUnderstood" isChecked={buyerAcceptTermsFormData.priceUnderstood} onChange={handleBuyerAcceptFormChange}>
                                I understand and agree to the purchase price of ${parseFloat(selectedRequest?.agreed_price || 0).toFixed(2)}.
                            </ChakraCheckbox>
                            <ChakraCheckbox name="paymentBindingUnderstood" isChecked={buyerAcceptTermsFormData.paymentBindingUnderstood} onChange={handleBuyerAcceptFormChange}>
                                I understand that accepting these terms and proceeding to payment forms a binding agreement to purchase, as per the <Link as={RouterLink} to="/terms#buyer-agreement" color="blue.500" isExternal>Buyer Agreement</Link>.
                            </ChakraCheckbox>
                        </VStack>

                        <Heading size="sm" mb={2} mt={4}>Digital Signature:</Heading>
                        <Input 
                            name="digitalSignature"
                            placeholder="Type your full legal name to sign"
                            value={buyerAcceptTermsFormData.digitalSignature}
                            onChange={handleBuyerAcceptFormChange}
                            mb={4}
                        />
                    </ModalBody>
                    <ModalFooter>
                        <Button variant="ghost" mr={3} onClick={onAcceptTermsModalClose}>Cancel</Button>
                        <Button 
                            colorScheme="green" 
                            onClick={handleAcceptTermsSubmit} 
                            isLoading={isSubmittingBuyerAction}
                            isDisabled={!buyerAcceptTermsFormData.assetsListAgreed || !buyerAcceptTermsFormData.priceUnderstood || !buyerAcceptTermsFormData.paymentBindingUnderstood || !buyerAcceptTermsFormData.digitalSignature.trim()}
                        >
                            Accept Terms & Proceed to Payment Setup
                        </Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>

            <Modal isOpen={isWithdrawInterestModalOpen} onClose={onWithdrawInterestModalClose}>
                <ModalOverlay />
                <ModalContent>
                    <ModalHeader>Withdraw Interest in "{selectedRequest?.project_name}"</ModalHeader>
                    <ModalCloseButton />
                    <ModalBody>
                         <Textarea 
                            placeholder="Reason for withdrawing (optional, will be shared with seller)"
                            value={withdrawalReason}
                            onChange={(e) => setWithdrawalReason(e.target.value)}
                        />
                    </ModalBody>
                    <ModalFooter>
                        <Button variant="ghost" mr={3} onClick={onWithdrawInterestModalClose}>Cancel</Button>
                        <Button colorScheme="orange" onClick={handleWithdrawInterestSubmit} isLoading={isSubmittingBuyerAction}>Confirm Withdrawal</Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>

        </Container>
    );
}

export default DashboardPage;