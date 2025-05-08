import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './HomePage.css';
import { Box, Flex, Heading, Text, Button } from '@chakra-ui/react';
import { Link as RouterLink } from 'react-router-dom';
import { motion } from 'framer-motion';

// Arrow icon for links
const ArrowIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M5 12H19M19 12L12 5M19 12L12 19" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

function HomePage() {
  const { isAuthenticated } = useAuth();
  
  return (
    <Box maxW="1200px" mx="auto" px={4}>
      <Flex
        as={motion.section}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        direction="column"
        align="center"
        justify="center"
        py={20}
        position="relative"
        overflow="hidden"
      >
        <Heading
          as="h1"
          size="4xl"
          textAlign="center"
          bgGradient="linear(to-r, blue.500, teal.500)"
          bgClip="text"
        >
          Space for Side Hustle
        </Heading>
        <Text fontSize="lg" color="gray.400" mt={2}>
          Less hassle, more hustle.
        </Text>
        <Button
          as={RouterLink}
          to={isAuthenticated ? '/dashboard' : '/register'}
          size="lg"
          variant="outline"
          colorScheme="blue"
          mt={6}
          _hover={{ transform: 'translateY(-2px)', bg: 'blue.500', color: 'white' }}
        >
          {isAuthenticated ? 'Go to Dashboard' : 'Get Started'}
        </Button>
      </Flex>

      <section className="about-section">
        <h2 className="section-title">About SideBuilds</h2>
        <div className="about-grid">
          <div className="about-card">
            <h3>Organize</h3>
            <p>Manage all your side projects in one place with progress tracking and milestones.</p>
          </div>
          <div className="about-card">
            <h3>Collaborate</h3>
            <p>Share projects with the community to get feedback and find collaborators.</p>
          </div>
          <div className="about-card">
            <h3>Monetize</h3>
            <p>Turn your unfinished projects into income through our marketplace.</p>
          </div>
        </div>
      </section>

      <section className="features-section">
        <h2 className="section-title">Key Features</h2>
        <div className="features-grid">
          <div className="feature-card">
            <h3>Project Dashboard</h3>
            <p>Track progress and set milestones for all your projects.</p>
            <Link to={isAuthenticated ? "/dashboard" : "/login"} className="feature-link">
              {isAuthenticated ? "View Dashboard" : "Try Now"} <ArrowIcon />
            </Link>
          </div>
          
          <div className="feature-card">
            <h3>Public Sharing</h3>
            <p>Share your projects with the community to get feedback or collaborators.</p>
            <Link to="/public-projects" className="arrow-link">
              Browse projects <ArrowIcon />
            </Link>
          </div>
          
          <div className="feature-card">
            <h3>Project Marketplace</h3>
            <p>Turn your side projects into income by selling them to interested buyers.</p>
            <Link to="/marketplace" className="arrow-link">
              Visit marketplace <ArrowIcon />
            </Link>
          </div>
        </div>
      </section>

    </Box>
  );
}

export default HomePage; 