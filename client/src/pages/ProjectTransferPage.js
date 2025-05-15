import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useLocation, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import apiClient from '../services/api'; // Changed to default import
import {
    Box, Container, Heading, Text, Spinner, Alert, AlertIcon, Button,
    VStack, HStack, Tag, Textarea, useToast
} from '@chakra-ui/react';

// Helper function to format status (can be copied from DashboardPage or moved to a shared utils file)
const formatStatus = (status) => {
    if (!status) return 'N/A';
    return status.replace(/_/g, ' ').split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
};

function ProjectTransferPage() {
    const { projectId } = useParams(); // Project ID from route
    const location = useLocation();
    const navigate = useNavigate();
    const toast = useToast();
    const { user, isAuthenticated } = useAuth();

    const queryParams = new URLSearchParams(location.search);
    const requestId = queryParams.get('request_id');

    const [purchaseRequest, setPurchaseRequest] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [sellerMessage, setSellerMessage] = useState(''); // For seller to update transfer notes
    const [isSubmitting, setIsSubmitting] = useState(false);

    const fetchPurchaseRequestDetails = useCallback(async () => {
        if (!requestId) {
            setError('Purchase Request ID is missing.');
            setLoading(false);
            return;
        }
        setLoading(true);
        try {
            // Assuming an endpoint like GET /api/purchase-requests/:requestId exists
            // This endpoint might need to be created if not already present in purchaseRequests.js router
            const response = await apiClient.get(`/purchase-requests/${requestId}`);
            setPurchaseRequest(response.data);
        } catch (err) {
            console.error("Error fetching purchase request details:", err);
            setError(err.response?.data?.error || err.message || 'Failed to load purchase request details.');
        } finally {
            setLoading(false);
        }
    }, [requestId]);

    useEffect(() => {
        if (isAuthenticated) { // Ensure user is loaded before fetching
            fetchPurchaseRequestDetails();
        } else if (isAuthenticated === false) { // Explicitly check for false to handle initial null state of isAuthenticated
            navigate('/login', { state: { returnTo: location.pathname + location.search } });
        }
    }, [isAuthenticated, fetchPurchaseRequestDetails, navigate, location]);

    const handleSellerUpdateTransferStatus = async (newStatus) => {
        if (!purchaseRequest) return;
        setIsSubmitting(true);
        try {
            // Endpoint: PUT /api/purchase-requests/:requestId/transfer-status
            // Body: { status: newStatus, message: sellerMessage (optional) }
            await apiClient.put(`/purchase-requests/${requestId}/transfer-status`, {
                status: newStatus,
                message: sellerMessage
            });
            toast({
                title: 'Transfer Status Updated',
                description: `Successfully updated transfer status to ${formatStatus(newStatus)}. Message: ${sellerMessage}`,
                status: 'success',
                duration: 5000,
                isClosable: true,
            });
            fetchPurchaseRequestDetails(); // Refresh details
            setSellerMessage('');
        } catch (err) {
            toast({
                title: 'Update Failed',
                description: err.response?.data?.error || err.message || 'Could not update transfer status.',
                status: 'error',
                duration: 5000,
                isClosable: true,
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleBuyerConfirmReceipt = async () => {
        if (!purchaseRequest) return;
        setIsSubmitting(true);
        try {
            // Endpoint: POST /api/purchase-requests/:requestId/confirm-transfer (same as dashboard)
            await apiClient.post(`/purchase-requests/${requestId}/confirm-transfer`);
            toast({
                title: 'Assets Receipt Confirmed',
                description: 'Thank you for confirming. The transaction will now be marked as complete.',
                status: 'success',
                duration: 5000,
                isClosable: true,
            });
            fetchPurchaseRequestDetails(); // Refresh details
        } catch (err) {
            toast({
                title: 'Confirmation Failed',
                description: err.response?.data?.error || err.message || 'Could not confirm receipt.',
                status: 'error',
                duration: 5000,
                isClosable: true,
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isAuthenticated && isAuthenticated !== null) { // Don't render if auth state is definitively false and not initial null
        return null; // Or a redirect, handled by useEffect
    }

    if (loading) {
        return <Container centerContent p={5}><Spinner size="xl" /><Text mt={4}>Loading Transfer Details...</Text></Container>;
    }

    if (error) {
        return <Container p={5}><Alert status="error"><AlertIcon />{error}</Alert></Container>;
    }

    if (!purchaseRequest) {
        return <Container p={5}><Text>Purchase request not found.</Text></Container>;
    }

    const isUserSeller = user && purchaseRequest && user.id === purchaseRequest.seller_id;
    const isUserBuyer = user && purchaseRequest && user.id === purchaseRequest.buyer_id;

    return (
        <Container maxW="container.lg" py={8}>
            <VStack spacing={6} align="stretch">
                <Box p={5} shadow="md" borderWidth="1px" borderRadius="lg">
                    <HStack justifyContent="space-between" mb={4}>
                        <Heading size="lg">Project Transfer: {purchaseRequest.project_name}</Heading>
                        <Tag colorScheme="blue" size="lg">Status: {formatStatus(purchaseRequest.status)}</Tag>
                    </HStack>
                    <Text><strong>Project ID:</strong> {purchaseRequest.project_id}</Text>
                    <Text><strong>Request ID:</strong> {purchaseRequest.request_id}</Text>
                    <Text><strong>Seller:</strong> {purchaseRequest.seller_username}</Text>
                    <Text><strong>Buyer:</strong> {purchaseRequest.buyer_username}</Text>
                    <Text><strong>Agreed Price:</strong> ${parseFloat(purchaseRequest.accepted_price).toFixed(2)}</Text>
                    <Text><strong>Last Updated:</strong> {new Date(purchaseRequest.status_last_updated).toLocaleString()}</Text>
                    {purchaseRequest.transfer_notes && (
                        <Box mt={3} p={3} bg="gray.50" borderRadius="md">
                            <Text fontWeight="bold">Transfer Notes/Updates:</Text>
                            <Text whiteSpace="pre-wrap">{purchaseRequest.transfer_notes}</Text>
                        </Box>
                    )}
                </Box>

                {/* Seller Actions */}
                {isUserSeller && (
                    <Box p={5} shadow="md" borderWidth="1px" borderRadius="lg">
                        <Heading size="md" mb={3}>Seller Actions</Heading>
                        {/* Seller can update status to indicate assets sent, etc. */}
                        { (purchaseRequest.status === 'payment_completed_pending_transfer' || purchaseRequest.status === 'transfer_in_progress') && (
                             <VStack spacing={3} align="stretch">
                                <Textarea 
                                    placeholder="Provide an update or instructions for the buyer regarding asset transfer..."
                                    value={sellerMessage}
                                    onChange={(e) => setSellerMessage(e.target.value)}
                                />
                                <Button 
                                    colorScheme="purple" 
                                    onClick={() => handleSellerUpdateTransferStatus('assets_transferred_pending_buyer_confirmation')} 
                                    isLoading={isSubmitting}
                                >
                                    Mark Assets as Transferred (Notifies Buyer)
                                </Button>
                                <Button 
                                    colorScheme="orange" 
                                    onClick={() => handleSellerUpdateTransferStatus('transfer_in_progress')} 
                                    isLoading={isSubmitting} 
                                    variant="outline"
                                >
                                    Update Transfer Notes / Mark as In Progress
                                </Button>
                            </VStack>
                        )}
                        {purchaseRequest.status === 'assets_transferred_pending_buyer_confirmation' && (
                             <Text color="green.500">Waiting for buyer to confirm receipt.</Text>
                        )}
                         {purchaseRequest.status === 'completed' && (
                             <Text color="green.500">Transfer completed and confirmed by buyer.</Text>
                        )}
                    </Box>
                )}

                {/* Buyer Actions */}
                {isUserBuyer && (
                    <Box p={5} shadow="md" borderWidth="1px" borderRadius="lg">
                        <Heading size="md" mb={3}>Buyer Actions</Heading>
                        {purchaseRequest.status === 'assets_transferred_pending_buyer_confirmation' && (
                            <Button 
                                colorScheme="green" 
                                onClick={handleBuyerConfirmReceipt} 
                                isLoading={isSubmitting}
                            >
                                I Have Received the Assets & Confirm Completion
                            </Button>
                        )}
                        {(purchaseRequest.status === 'payment_completed_pending_transfer' || purchaseRequest.status === 'transfer_in_progress') && (
                             <Text color="blue.500">Seller is preparing/transferring assets. Check notes for updates.</Text>
                        )}
                        {purchaseRequest.status === 'completed' && (
                             <Text color="green.500">You have confirmed receipt of the assets. This transaction is complete.</Text>
                        )}
                    </Box>
                )}
                
                <Box textAlign="center" mt={4}>
                    <Link to="/dashboard">
                        <Button variant="link">Back to Dashboard</Button>
                    </Link>
                </Box>
            </VStack>
        </Container>
    );
}

export default ProjectTransferPage; 