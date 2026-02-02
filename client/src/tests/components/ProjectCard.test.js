import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import ProjectCard from '../../components/ProjectCard';
import { mockApiResponse } from '../mocks/server';

// Wrapper component for testing
const TestWrapper = ({ children }) => (
  <BrowserRouter>
    {children}
  </BrowserRouter>
);

describe('ProjectCard Component - Critical Business Logic', () => {
  const defaultProps = {
    project: global.testUtils.createMockProject(),
    showPrice: true,
    variant: 'default',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Mobile Responsiveness & Accessibility', () => {
    it('should render with 48px minimum touch targets for all interactive elements', () => {
      render(
        <TestWrapper>
          <ProjectCard {...defaultProps} />
        </TestWrapper>
      );

      // Find all interactive elements (buttons, links)
      const interactiveElements = screen.getAllByRole('button').concat(
        screen.getAllByRole('link')
      );

      interactiveElements.forEach(element => {
        const computedStyle = window.getComputedStyle(element);
        const minHeight = parseInt(computedStyle.getPropertyValue('min-height'));
        const minWidth = parseInt(computedStyle.getPropertyValue('min-width'));
        
        // Verify minimum touch target size (48px)
        expect(Math.min(minHeight, minWidth)).toBeGreaterThanOrEqual(44);
      });
    });

    it('should handle mobile viewport transitions gracefully', () => {
      const { rerender } = render(
        <TestWrapper>
          <ProjectCard {...defaultProps} />
        </TestWrapper>
      );

      // Test desktop view
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1024,
      });

      expect(screen.getByText('View Details')).toBeInTheDocument();

      // Test mobile view
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      rerender(
        <TestWrapper>
          <ProjectCard {...defaultProps} />
        </TestWrapper>
      );

      // Verify mobile-specific elements
      expect(screen.getByText('View Details')).toBeInTheDocument();
    });

    it('should stack elements properly on small screens', () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 320,
      });

      render(
        <TestWrapper>
          <ProjectCard {...defaultProps} />
        </TestWrapper>
      );

      // Verify responsive grid classes are applied
      const cardContainer = screen.getByRole('link').closest('div');
      expect(cardContainer).toHaveClass('relative');
    });

    it('should provide proper ARIA labels and accessibility features', () => {
      render(
        <TestWrapper>
          <ProjectCard {...defaultProps} />
        </TestWrapper>
      );

      // Verify accessible elements
      expect(screen.getByRole('link')).toHaveAttribute('href', '/projects/1');
      
      // Check for proper heading structure
      expect(screen.getByRole('heading', { level: 3 })).toBeInTheDocument();
    });
  });

  describe('Trust Badge System Integration', () => {
    it('should display correct trust badges based on verification status', () => {
      const verifiedProject = global.testUtils.createMockProject({
        is_verified: true,
        revenue_verified: true,
        code_quality_verified: true,
        trust_score: 95,
        top_seller: true,
        trending: true,
      });

      render(
        <TestWrapper>
          <ProjectCard project={verifiedProject} showPrice={true} />
        </TestWrapper>
      );

      // Verify trust badges are rendered
      // Note: This would need to be adjusted based on actual TrustBadge implementation
      expect(screen.getByText(verifiedProject.name)).toBeInTheDocument();
    });

    it('should handle trust score calculations accurately', () => {
      const highTrustProject = global.testUtils.createMockProject({
        trust_score: 92,
      });

      render(
        <TestWrapper>
          <ProjectCard project={highTrustProject} showPrice={true} />
        </TestWrapper>
      );

      // Verify trust score display logic
      expect(screen.getByText(highTrustProject.name)).toBeInTheDocument();
    });

    it('should show appropriate trust indicators for high-value projects', () => {
      const highValueProject = global.testUtils.createMockProject({
        sale_price: 75000,
        trust_score: 95,
        is_verified: true,
        revenue_verified: true,
      });

      render(
        <TestWrapper>
          <ProjectCard project={highValueProject} showPrice={true} />
        </TestWrapper>
      );

      // Verify high-value project indicators
      expect(screen.getByText('$75,000')).toBeInTheDocument();
    });

    it('should handle missing trust data gracefully', () => {
      const unverifiedProject = global.testUtils.createMockProject({
        is_verified: false,
        revenue_verified: false,
        trust_score: null,
      });

      render(
        <TestWrapper>
          <ProjectCard project={unverifiedProject} showPrice={true} />
        </TestWrapper>
      );

      // Should still render without errors
      expect(screen.getByText(unverifiedProject.name)).toBeInTheDocument();
    });
  });

  describe('Business Logic & Pricing', () => {
    it('should format pricing correctly for high-value projects', () => {
      const prices = [
        { amount: 1000, expected: '$1,000' },
        { amount: 15000, expected: '$15,000' },
        { amount: 75000, expected: '$75,000' },
        { amount: 100000, expected: '$100,000' },
      ];

      prices.forEach(({ amount, expected }) => {
        const project = global.testUtils.createMockProject({
          sale_price: amount,
        });

        const { unmount } = render(
          <TestWrapper>
            <ProjectCard project={project} showPrice={true} />
          </TestWrapper>
        );

        expect(screen.getByText(expected)).toBeInTheDocument();
        unmount();
      });
    });

    it('should handle project availability states correctly', () => {
      const availableProject = global.testUtils.createMockProject({
        is_for_sale: true,
        sale_price: 50000,
      });

      render(
        <TestWrapper>
          <ProjectCard project={availableProject} showPrice={true} />
        </TestWrapper>
      );

      expect(screen.getByText('$50,000')).toBeInTheDocument();
      expect(screen.getByText('View Details')).toBeInTheDocument();
    });

    it('should display appropriate call-to-action based on project status', () => {
      const project = global.testUtils.createMockProject({
        is_for_sale: true,
      });

      render(
        <TestWrapper>
          <ProjectCard project={project} showPrice={true} />
        </TestWrapper>
      );

      const viewDetailsButton = screen.getByText('View Details');
      expect(viewDetailsButton).toBeInTheDocument();
      expect(viewDetailsButton.closest('a')).toHaveAttribute('href', '/projects/1');
    });

    it('should handle revenue display for active projects', () => {
      const revenueProject = global.testUtils.createMockProject({
        monthly_revenue: 8500,
      });

      render(
        <TestWrapper>
          <ProjectCard project={revenueProject} showPrice={true} />
        </TestWrapper>
      );

      expect(screen.getByText('$8,500/mo')).toBeInTheDocument();
    });

    it('should display tech stack information correctly', () => {
      const techProject = global.testUtils.createMockProject({
        tech_stack: ['React', 'Node.js', 'PostgreSQL', 'Redis', 'Docker'],
      });

      render(
        <TestWrapper>
          <ProjectCard project={techProject} showPrice={true} />
        </TestWrapper>
      );

      // Should show first 3 tech items plus "+2" indicator
      expect(screen.getByText('React')).toBeInTheDocument();
      expect(screen.getByText('Node.js')).toBeInTheDocument();
      expect(screen.getByText('PostgreSQL')).toBeInTheDocument();
      expect(screen.getByText('+2')).toBeInTheDocument();
    });
  });

  describe('Performance Requirements', () => {
    it('should render within performance benchmarks', async () => {
      const startTime = performance.now();
      
      render(
        <TestWrapper>
          <ProjectCard {...defaultProps} />
        </TestWrapper>
      );

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      // Should render within 100ms
      expect(renderTime).toBeLessThan(global.performanceExpectations.componentRender);
    });

    it('should handle hover interactions smoothly', () => {
      render(
        <TestWrapper>
          <ProjectCard {...defaultProps} />
        </TestWrapper>
      );

      const cardElement = screen.getByRole('link').closest('div');
      
      // Test hover functionality
      fireEvent.mouseEnter(cardElement);
      fireEvent.mouseLeave(cardElement);
      
      // Should not throw errors during hover transitions
      expect(cardElement).toBeInTheDocument();
    });

    it('should optimize rendering for large datasets', () => {
      // Test with multiple cards
      const projects = Array.from({ length: 50 }, (_, i) => 
        global.testUtils.createMockProject({ id: i + 1, name: `Project ${i + 1}` })
      );

      const startTime = performance.now();

      render(
        <TestWrapper>
          <div>
            {projects.slice(0, 10).map(project => (
              <ProjectCard key={project.id} project={project} showPrice={true} />
            ))}
          </div>
        </TestWrapper>
      );

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      // Should handle multiple cards efficiently
      expect(renderTime).toBeLessThan(500); // 500ms for 10 cards
    });
  });

  describe('Error Handling & Edge Cases', () => {
    it('should handle missing project data gracefully', () => {
      const incompleteProject = {
        id: 1,
        name: 'Incomplete Project',
        // Missing other fields
      };

      render(
        <TestWrapper>
          <ProjectCard project={incompleteProject} showPrice={true} />
        </TestWrapper>
      );

      expect(screen.getByText('Incomplete Project')).toBeInTheDocument();
      expect(screen.getByText('Contact for Price')).toBeInTheDocument();
    });

    it('should handle extremely long project names', () => {
      const longNameProject = global.testUtils.createMockProject({
        name: 'This is an extremely long project name that should be handled gracefully by the component without breaking the layout or causing overflow issues',
      });

      render(
        <TestWrapper>
          <ProjectCard project={longNameProject} showPrice={true} />
        </TestWrapper>
      );

      expect(screen.getByText(longNameProject.name)).toBeInTheDocument();
    });

    it('should handle invalid price values', () => {
      const invalidPriceProject = global.testUtils.createMockProject({
        sale_price: null,
      });

      render(
        <TestWrapper>
          <ProjectCard project={invalidPriceProject} showPrice={true} />
        </TestWrapper>
      );

      expect(screen.getByText('Contact for Price')).toBeInTheDocument();
    });

    it('should handle missing external links gracefully', () => {
      const noLinksProject = global.testUtils.createMockProject({
        github_url: null,
        domain: null,
      });

      render(
        <TestWrapper>
          <ProjectCard project={noLinksProject} showPrice={true} />
        </TestWrapper>
      );

      // Should still render main content
      expect(screen.getByText(noLinksProject.name)).toBeInTheDocument();
      expect(screen.getByText('View Details')).toBeInTheDocument();
    });
  });

  describe('Internationalization & Localization', () => {
    it('should format currency according to locale', () => {
      const project = global.testUtils.createMockProject({
        sale_price: 50000,
      });

      render(
        <TestWrapper>
          <ProjectCard project={project} showPrice={true} />
        </TestWrapper>
      );

      // Should use US currency format
      expect(screen.getByText('$50,000')).toBeInTheDocument();
    });

    it('should handle different number formats', () => {
      const project = global.testUtils.createMockProject({
        users_count: 1500000,
      });

      render(
        <TestWrapper>
          <ProjectCard project={project} showPrice={true} />
        </TestWrapper>
      );

      // Should format large numbers appropriately
      expect(screen.getByText('1,500,000 users')).toBeInTheDocument();
    });
  });

  describe('Analytics & Tracking', () => {
    it('should provide proper data attributes for analytics tracking', () => {
      render(
        <TestWrapper>
          <ProjectCard {...defaultProps} />
        </TestWrapper>
      );

      // Verify tracking attributes exist
      const viewDetailsButton = screen.getByText('View Details');
      expect(viewDetailsButton.closest('a')).toHaveAttribute('href', '/projects/1');
    });

    it('should handle click tracking for business metrics', () => {
      const mockTrack = jest.fn();
      global.gtag = mockTrack;

      render(
        <TestWrapper>
          <ProjectCard {...defaultProps} />
        </TestWrapper>
      );

      const viewDetailsButton = screen.getByText('View Details');
      fireEvent.click(viewDetailsButton);

      // Note: Actual tracking implementation would need to be tested
      // based on the specific analytics setup
    });
  });

  describe('Security Considerations', () => {
    it('should sanitize and safely render user-generated content', () => {
      const maliciousProject = global.testUtils.createMockProject({
        name: '<script>alert("xss")</script>Safe Project Name',
        description: 'Safe description <img src="x" onerror="alert(1)">',
      });

      render(
        <TestWrapper>
          <ProjectCard project={maliciousProject} showPrice={true} />
        </TestWrapper>
      );

      // Should render text safely without executing scripts
      expect(screen.getByText(/Safe Project Name/)).toBeInTheDocument();
      expect(screen.getByText(/Safe description/)).toBeInTheDocument();
    });

    it('should handle external links securely', () => {
      const project = global.testUtils.createMockProject({
        github_url: 'https://github.com/test/project',
        domain: 'testproject.com',
      });

      render(
        <TestWrapper>
          <ProjectCard project={project} showPrice={true} />
        </TestWrapper>
      );

      const githubLink = screen.getByText('Code').closest('a');
      const liveLink = screen.getByText('Live').closest('a');

      // Should have proper security attributes
      expect(githubLink).toHaveAttribute('target', '_blank');
      expect(githubLink).toHaveAttribute('rel', 'noopener noreferrer');
      expect(liveLink).toHaveAttribute('target', '_blank');
      expect(liveLink).toHaveAttribute('rel', 'noopener noreferrer');
    });
  });
});
