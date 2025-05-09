import React, { useState, useEffect } from 'react';
import { Link as RouterLink, useNavigate, useLocation } from 'react-router-dom';
import { 
  Box, Flex, Heading, Text, Button, Alert, AlertIcon,
  Container, useToast, Badge
} from '@chakra-ui/react';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { getProjects, deleteProject } from '../services/api';
import ProjectTable from '../components/ProjectTable';

const MotionBox = motion(Box);

function DashboardPage() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const toast = useToast();
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [deleteError, setDeleteError] = useState('');
    const [hasNewPurchase, setHasNewPurchase] = useState(false);
    // eslint-disable-next-line no-unused-vars
    const [deletingId, setDeletingId] = useState(null);

    // Check for recent purchase parameter in URL
    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const justPurchased = params.get('purchased') === 'true';
        
        if (justPurchased) {
            setHasNewPurchase(true);
            // Show toast notification
            toast({
                title: "Purchase Complete!",
                description: "Your newly purchased project is now available in your dashboard.",
                status: "success",
                duration: 5000,
                isClosable: true,
                position: "top"
            });
            
            // Clear the URL parameter
            navigate('/dashboard', { replace: true });
        }
    }, [location, navigate, toast]);

    useEffect(() => {
        const fetchProjects = async () => {
            try {
                setError('');
                setLoading(true);
                const userProjects = await getProjects();
                
                // Sort projects to show recently purchased ones first
                userProjects.sort((a, b) => {
                    // First, prioritize purchased projects
                    if (a.source === 'purchased' && b.source !== 'purchased') return -1;
                    if (a.source !== 'purchased' && b.source === 'purchased') return 1;
                    
                    // Then sort by purchase/update date
                    const aDate = a.purchased_at || a.updated_at;
                    const bDate = b.purchased_at || b.updated_at;
                    return new Date(bDate) - new Date(aDate);
                });
                
                setProjects(userProjects);
            } catch (err) {
                console.error("Failed to fetch projects:", err);
                setError(err.message || 'Failed to load projects.');
                if (err.message.includes('401') || err.message.includes('denied')) {
                    logout();
                    navigate('/login');
                }
            } finally {
                setLoading(false);
            }
        };

        fetchProjects();
    }, [logout, navigate, hasNewPurchase]); // Add hasNewPurchase dependency

    const handleDelete = async (projectId) => {
        if (!window.confirm('Are you sure you want to delete this project?')) {
            return;
        }
        setDeletingId(projectId);
        setDeleteError('');
        try {
            await deleteProject(projectId);
            setProjects(prevProjects => prevProjects.filter(p => p.project_id !== projectId));
            toast({
                title: "Project deleted",
                status: "success",
                duration: 3000,
                isClosable: true,
            });
        } catch (err) {
            console.error("Failed to delete project:", err);
            setDeleteError(`Failed to delete project: ${err.message || 'Server error'}`);
            toast({
                title: "Delete failed",
                description: err.message || 'Server error',
                status: "error",
                duration: 5000,
                isClosable: true,
            });
        } finally {
            setDeletingId(null);
        }
    };

    return (
        <Container maxW="1200px" pt="80px" px={6}>
            <MotionBox
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
            >
                <Flex 
                    justify="space-between" 
                    align="center" 
                    mb={8}
                    direction={{ base: 'column', md: 'row' }}
                    gap={{ base: 4, md: 0 }}
                >
                    <Box>
                        <Text 
                            fontSize="sm" 
                            letterSpacing="1px" 
                            textTransform="uppercase"
                            color="gray.400"
                            fontWeight="semibold"
                        >
                            DASHBOARD
                        </Text>
                        <Heading size="lg" mt={1} mb={1}>Your Projects</Heading>
                        {user && (
                            <Text color="gray.400">
                                Welcome back, <Text as="span" fontWeight="bold" color="white">{user.username}</Text>!
                            </Text>
                        )}
                    </Box>
                    <Button
                        as={RouterLink}
                        to="/projects/new"
                        size="md"
                        colorScheme="blue"
                        leftIcon={<Box as="span" fontSize="lg">+</Box>}
                        _hover={{
                            transform: 'translateY(-2px)',
                            boxShadow: 'lg'
                        }}
                    >
                        New Project
                    </Button>
                </Flex>

                {deleteError && (
                    <Alert status="error" mb={4} borderRadius="md">
                        <AlertIcon />
                        {deleteError}
                    </Alert>
                )}
                
                <ProjectTable 
                    projects={projects}
                    type="dashboard"
                    onDelete={handleDelete}
                    isLoading={loading}
                    error={error}
                />
            </MotionBox>
        </Container>
    );
}

export default DashboardPage; 