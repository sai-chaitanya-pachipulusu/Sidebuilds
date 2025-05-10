import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Box, Container, Heading, Text, Button, Flex, Divider } from '@chakra-ui/react';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { getProjectById } from '../services/api';
import TransferStatus from '../components/TransferStatus';
import './ProjectTransferPage.css';

const MotionBox = motion(Box);

const BackIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="19" y1="12" x2="5" y2="12"></line>
    <polyline points="12 19 5 12 12 5"></polyline>
  </svg>
);

const ProjectTransferPage = () => {
  const { projectId } = useParams();
  const { user } = useAuth();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchProject = async () => {
      try {
        setLoading(true);
        const data = await getProjectById(projectId);
        setProject(data);
      } catch (err) {
        console.error('Error fetching project:', err);
        setError('Failed to load project details');
      } finally {
        setLoading(false);
      }
    };

    if (projectId) {
      fetchProject();
    }
  }, [projectId]);

  // Determine if the current user is the seller based on previous_owner_id
  const isSeller = user?.id === project?.previous_owner_id;

  if (loading) {
    return (
      <Container maxW="900px" pt="80px" px={6}>
        <div className="loading-spinner">Loading project transfer details...</div>
      </Container>
    );
  }

  if (error || !project) {
    return (
      <Container maxW="900px" pt="80px" px={6}>
        <div className="error-message">
          {error || 'Project not found'}
          <Link to="/dashboard" className="back-link">Return to Dashboard</Link>
        </div>
      </Container>
    );
  }

  return (
    <Container maxW="900px" pt="80px" px={6}>
      <MotionBox
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Flex align="center" mb={2}>
          <Button 
            as={Link} 
            to="/dashboard" 
            variant="link" 
            colorScheme="blue" 
            leftIcon={<BackIcon />}
            size="sm"
            fontWeight="normal"
            mb={2}
          >
            Back to Dashboard
          </Button>
        </Flex>

        <Heading as="h1" size="lg" mb={2}>{project.name}</Heading>
        
        <Flex gap={2} mb={6} align="center">
          <Text color="gray.500" fontSize="sm">Transfer Details</Text>
          <div className={`source-badge source-purchased`}>Purchased</div>
        </Flex>

        <TransferStatus projectId={projectId} isSeller={isSeller} />

        <Divider my={8} />

        <Box className="project-info">
          <Heading as="h3" size="md" mb={4}>Project Information</Heading>
          <div className="info-grid">
            <div className="info-item">
              <div className="info-label">Description</div>
              <div className="info-value">{project.description || 'No description provided'}</div>
            </div>
            
            <div className="info-item">
              <div className="info-label">Domain</div>
              <div className="info-value">
                {project.domain ? (
                  <a href={`http://${project.domain}`} target="_blank" rel="noopener noreferrer" className="domain-link">
                    {project.domain}
                  </a>
                ) : (
                  'No domain'
                )}
              </div>
            </div>
            
            <div className="info-item">
              <div className="info-label">Purchase Date</div>
              <div className="info-value">
                {project.purchased_at ? new Date(project.purchased_at).toLocaleDateString() : 'Unknown'}
              </div>
            </div>
          </div>
        </Box>

        <Box className="contact-section" mt={8}>
          <Heading as="h3" size="md" mb={4}>Contact Information</Heading>
          <Text mb={4}>
            If you have any questions about the transfer process, contact the seller directly.
          </Text>
          <Box className="contact-methods">
            {project.contact_email && (
              <Link 
                to={`mailto:${project.contact_email}`} 
                className="contact-button email"
              >
                Contact via Email
              </Link>
            )}
            {project.contact_phone && (
              <Link 
                to={`tel:${project.contact_phone}`} 
                className="contact-button phone"
              >
                Contact via Phone
              </Link>
            )}
          </Box>
        </Box>
      </MotionBox>
    </Container>
  );
};

export default ProjectTransferPage; 