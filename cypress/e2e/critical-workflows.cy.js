// Critical Business Workflows - E2E Tests for SideBuilds Marketplace
// High-value transaction testing ($10K-$100K) with bulletproof reliability

describe('Critical Business Workflows - High-Value Transactions', () => {
  const testUser = {
    buyer: {
      email: 'buyer@sidebuilds.com',
      password: 'SecurePass123!',
      name: 'Test Buyer'
    },
    seller: {
      email: 'seller@sidebuilds.com', 
      password: 'SecurePass456!',
      name: 'Test Seller'
    }
  };

  const highValueProject = {
    id: 1,
    name: 'Enterprise React Dashboard',
    price: 75000,
    monthlyRevenue: 12000,
    description: 'High-value enterprise dashboard with proven revenue'
  };

  beforeEach(() => {
    // Clear state and prepare test environment
    cy.task('db:reset');
    cy.task('db:seed', { 
      projects: [highValueProject],
      users: [testUser.buyer, testUser.seller]
    });
    
    cy.clearCookies();
    cy.clearLocalStorage();
    cy.viewport(1280, 720); // Desktop view for critical workflows
  });

  describe('Complete High-Value Purchase Workflow ($75K)', () => {
    it('should complete end-to-end buyer journey with all verification steps', () => {
      // Phase 1: User Authentication & Setup
      cy.log('Phase 1: Buyer Authentication');
      cy.visit('/');
      cy.get('[data-cy=login-btn]').click();
      
      cy.get('[data-cy=email-input]').type(testUser.buyer.email);
      cy.get('[data-cy=password-input]').type(testUser.buyer.password);
      cy.get('[data-cy=login-submit]').click();
      
      cy.url().should('include', '/dashboard');
      cy.get('[data-cy=user-name]').should('contain', testUser.buyer.name);
      
      // Phase 2: Marketplace Discovery & Filtering
      cy.log('Phase 2: High-Value Project Discovery');
      cy.get('[data-cy=marketplace-nav]').click();
      cy.url().should('include', '/marketplace');
      
      // Apply high-value filters
      cy.get('[data-cy=price-filter]').select('$50K-$100K');
      cy.get('[data-cy=revenue-filter]').check();
      cy.get('[data-cy=verified-only]').check();
      cy.get('[data-cy=apply-filters]').click();
      
      // Verify project appears in results
      cy.get('[data-cy=project-card]').should('have.length.greaterThan', 0);
      cy.get('[data-cy=project-card]').first().within(() => {
        cy.contains(highValueProject.name);
        cy.contains('$75,000');
        cy.contains('$12,000/mo');
        
        // Verify trust indicators for high-value project
        cy.get('[data-cy=trust-score]').should('be.visible');
        cy.get('[data-cy=verified-badge]').should('be.visible');
        
        cy.get('[data-cy=view-details]').click();
      });
      
      // Phase 3: Project Due Diligence
      cy.log('Phase 3: Project Evaluation & Due Diligence');
      cy.url().should('include', `/projects/${highValueProject.id}`);
      
      // Comprehensive project review
      cy.get('[data-cy=project-metrics]').should('be.visible');
      cy.get('[data-cy=revenue-chart]').should('be.visible');
      cy.get('[data-cy=tech-stack]').should('be.visible');
      cy.get('[data-cy=code-quality]').should('be.visible');
      
      // Verify high-value project requirements
      cy.get('[data-cy=due-diligence-section]').within(() => {
        cy.get('[data-cy=revenue-verification]').should('contain', 'Verified');
        cy.get('[data-cy=code-audit]').should('contain', 'Completed');
        cy.get('[data-cy=legal-documents]').should('be.visible');
      });
      
      // Phase 4: Express Interest with Commitments
      cy.log('Phase 4: Express Purchase Interest');
      cy.get('[data-cy=express-interest-btn]').should('be.enabled').click();
      
      cy.get('[data-cy=interest-modal]').should('be.visible').within(() => {
        // High-value purchase commitments
        cy.get('[data-cy=commitment-development]').check();
        cy.get('[data-cy=commitment-marketing]').check();
        cy.get('[data-cy=commitment-scaling]').check();
        cy.get('[data-cy=commitment-timeline]').select('6-12 months');
        
        // Detailed business plan
        cy.get('[data-cy=business-plan]').type(
          'Comprehensive growth strategy for enterprise dashboard:\n\n' +
          '1. Immediate: Optimize current codebase and infrastructure\n' +
          '2. Short-term: Expand feature set for enterprise clients\n' +
          '3. Long-term: Scale to 10x current user base\n\n' +
          'Investment allocation:\n' +
          '- Development: 40%\n' +
          '- Marketing: 35%\n' +
          '- Operations: 25%\n\n' +
          'Expected ROI: 300% within 18 months'
        );
        
        // Financial verification
        cy.get('[data-cy=financial-capability]').check();
        cy.get('[data-cy=funding-source]').select('venture_capital');
        
        cy.get('[data-cy=submit-interest]').click();
      });
      
      // Verify interest submission
      cy.get('[data-cy=success-toast]').should('contain', 'Interest submitted successfully');
      cy.get('[data-cy=express-interest-btn]').should('be.disabled');
      cy.get('[data-cy=interest-status]').should('contain', 'Interest Submitted');
      
      // Phase 5: Real-Time Communication Setup
      cy.log('Phase 5: Real-Time Messaging Integration');
      cy.get('[data-cy=message-seller-btn]').click();
      
      cy.get('[data-cy=messaging-panel]').should('be.visible').within(() => {
        cy.get('[data-cy=connection-status]').should('contain', 'Connected');
        
        cy.get('[data-cy=message-input]').type(
          'Hello! I\'m very interested in acquiring your enterprise dashboard. ' +
          'I\'ve submitted a detailed business plan. When would be a good time for a call to discuss terms?'
        );
        
        cy.get('[data-cy=send-message]').click();
        
        // Verify real-time message delivery
        cy.get('[data-cy=message-list]').within(() => {
          cy.get('[data-cy=sent-message]').should('be.visible');
          cy.get('[data-cy=message-timestamp]').should('be.visible');
          cy.get('[data-cy=delivery-status]').should('contain', 'Delivered');
        });
      });
      
      // Phase 6: Terms Negotiation (Simulated Seller Response)
      cy.log('Phase 6: Terms Negotiation');
      
      // Simulate seller response via API
      cy.mockSellerResponse({
        type: 'terms_proposal',
        terms: {
          price: 75000,
          escrowPeriod: '30 days',
          assetTransferTimeline: '7 business days',
          supportPeriod: '90 days',
          additionalTerms: [
            'Non-compete clause: 2 years',
            'Customer list included',
            'Transition support included'
          ]
        }
      });
      
      // Review proposed terms
      cy.get('[data-cy=terms-notification]').should('be.visible');
      cy.get('[data-cy=view-terms]').click();
      
      cy.get('[data-cy=terms-modal]').should('be.visible').within(() => {
        cy.get('[data-cy=price-term]').should('contain', '$75,000');
        cy.get('[data-cy=escrow-term]').should('contain', '30 days');
        cy.get('[data-cy=support-term]').should('contain', '90 days');
        
        // Accept terms after review
        cy.get('[data-cy=accept-terms]').click();
      });
      
      cy.get('[data-cy=terms-status]').should('contain', 'Terms Accepted');
      
      // Phase 7: Payment Processing
      cy.log('Phase 7: Secure Payment Processing');
      cy.get('[data-cy=proceed-payment]').should('be.enabled').click();
      
      // Payment method selection
      cy.get('[data-cy=payment-modal]').should('be.visible').within(() => {
        cy.get('[data-cy=payment-amount]').should('contain', '$75,000');
        cy.get('[data-cy=escrow-notice]').should('be.visible');
        
        // Select payment method
        cy.get('[data-cy=payment-stripe]').click();
        cy.get('[data-cy=proceed-checkout]').click();
      });
      
      // Stripe checkout simulation
      cy.origin('https://checkout.stripe.com', () => {
        cy.get('#cardNumber').type('4242424242424242');
        cy.get('#cardExpiry').type('1225');
        cy.get('#cardCvc').type('123');
        cy.get('#billingName').type('Test Buyer');
        cy.get('#billingEmail').type('buyer@sidebuilds.com');
        
        // High-value transaction verification
        cy.get('[data-testid=payment-amount]').should('contain', '$75,000');
        cy.get('[data-testid=merchant-name]').should('contain', 'SideBuilds');
        
        cy.get('[data-testid=hosted-payment-submit-button]').click();
      });
      
      // Phase 8: Payment Confirmation & Asset Transfer
      cy.log('Phase 8: Transaction Completion');
      
      // Verify redirect to success page
      cy.url().should('include', '/purchase/success');
      cy.get('[data-cy=purchase-success]').should('be.visible').within(() => {
        cy.get('[data-cy=transaction-id]').should('be.visible');
        cy.get('[data-cy=amount-paid]').should('contain', '$75,000');
        cy.get('[data-cy=project-name]').should('contain', highValueProject.name);
        
        // Escrow information
        cy.get('[data-cy=escrow-status]').should('contain', 'Funds in Escrow');
        cy.get('[data-cy=release-timeline]').should('contain', '30 days');
      });
      
      // Verify asset transfer initiation
      cy.get('[data-cy=asset-transfer-section]').within(() => {
        cy.get('[data-cy=transfer-status]').should('contain', 'Initiated');
        cy.get('[data-cy=expected-completion]').should('be.visible');
        
        // Access credentials should be provided
        cy.get('[data-cy=access-details]').should('be.visible');
        cy.get('[data-cy=transition-contact]').should('be.visible');
      });
      
      // Phase 9: Purchase Verification
      cy.log('Phase 9: Purchase Verification & Dashboard Update');
      
      // Navigate to purchase dashboard
      cy.get('[data-cy=view-purchase-dashboard]').click();
      cy.url().should('include', '/dashboard');
      cy.get('[data-cy=purchases-tab]').click();
      
      cy.get('[data-cy=purchase-list]').within(() => {
        cy.get('[data-cy=purchase-item]').first().within(() => {
          cy.get('[data-cy=project-name]').should('contain', highValueProject.name);
          cy.get('[data-cy=purchase-amount]').should('contain', '$75,000');
          cy.get('[data-cy=purchase-status]').should('contain', 'Completed');
          cy.get('[data-cy=purchase-date]').should('be.visible');
        });
      });
      
      // Verify real-time status updates
      cy.get('[data-cy=real-time-status]').should('contain', 'Live');
      cy.get('[data-cy=socket-connection]').should('contain', 'Connected');
    });

    it('should handle payment failures with graceful recovery', () => {
      cy.log('Testing Payment Failure Recovery');
      
      // Set up for payment failure scenario
      cy.login(testUser.buyer.email, testUser.buyer.password);
      cy.navigateToProject(highValueProject.id);
      cy.expressInterest();
      cy.acceptTerms();
      
      // Proceed to payment
      cy.get('[data-cy=proceed-payment]').click();
      cy.get('[data-cy=payment-stripe]').click();
      cy.get('[data-cy=proceed-checkout]').click();
      
      // Simulate payment failure
      cy.intercept('POST', '/api/payments/stripe/checkout', {
        statusCode: 400,
        body: { error: 'card_declined', message: 'Your card was declined' }
      }).as('paymentFailure');
      
      // Verify error handling
      cy.wait('@paymentFailure');
      cy.get('[data-cy=payment-error]').should('be.visible');
      cy.get('[data-cy=error-message]').should('contain', 'card was declined');
      
      // Verify fallback options
      cy.get('[data-cy=try-different-card]').should('be.visible');
      cy.get('[data-cy=try-paypal]').should('be.visible');
      cy.get('[data-cy=contact-support]').should('be.visible');
      
      // Test retry functionality
      cy.get('[data-cy=try-different-card]').click();
      
      // Should return to payment form
      cy.get('[data-cy=payment-modal]').should('be.visible');
      cy.get('[data-cy=payment-stripe]').should('be.enabled');
    });

    it('should handle concurrent purchase attempts', () => {
      cy.log('Testing Race Condition Prevention');
      
      // Simulate another buyer attempting purchase simultaneously
      cy.intercept('GET', `/api/projects/${highValueProject.id}/availability`, {
        statusCode: 400,
        body: { 
          available: false, 
          reason: 'Project is currently being purchased by another buyer' 
        }
      }).as('projectUnavailable');
      
      cy.login(testUser.buyer.email, testUser.buyer.password);
      cy.navigateToProject(highValueProject.id);
      
      // Attempt to express interest
      cy.get('[data-cy=express-interest-btn]').click();
      
      cy.wait('@projectUnavailable');
      
      // Verify appropriate messaging
      cy.get('[data-cy=unavailable-modal]').should('be.visible').within(() => {
        cy.get('[data-cy=unavailable-message]').should('contain', 'currently being purchased');
        cy.get('[data-cy=notify-if-available]').should('be.visible');
        cy.get('[data-cy=browse-similar]').should('be.visible');
      });
    });
  });

  describe('Real-Time Communication Reliability', () => {
    beforeEach(() => {
      cy.login(testUser.buyer.email, testUser.buyer.password);
    });

    it('should maintain message delivery across network interruptions', () => {
      cy.log('Testing Network Resilience');
      
      cy.navigateToProject(highValueProject.id);
      cy.get('[data-cy=message-seller-btn]').click();
      
      // Verify initial connection
      cy.get('[data-cy=connection-status]').should('contain', 'Connected');
      
      // Send initial message
      cy.get('[data-cy=message-input]').type('Initial message before network issue');
      cy.get('[data-cy=send-message]').click();
      
      // Simulate network disconnection
      cy.mockNetworkDisconnection();
      
      // Verify offline indicator
      cy.get('[data-cy=connection-status]').should('contain', 'Reconnecting');
      
      // Attempt to send message while offline
      cy.get('[data-cy=message-input]').type('Message sent while offline');
      cy.get('[data-cy=send-message]').click();
      
      // Verify message is queued
      cy.get('[data-cy=queued-message]').should('be.visible');
      cy.get('[data-cy=queue-indicator]').should('contain', '1 message queued');
      
      // Restore network connection
      cy.mockNetworkReconnection();
      
      // Verify reconnection and message delivery
      cy.get('[data-cy=connection-status]').should('contain', 'Connected');
      cy.get('[data-cy=queued-message]').should('not.exist');
      cy.get('[data-cy=sent-message]').should('have.length', 2);
    });

    it('should handle WebSocket reconnection seamlessly', () => {
      cy.log('Testing WebSocket Reconnection');
      
      cy.navigateToProject(highValueProject.id);
      cy.get('[data-cy=message-seller-btn]').click();
      
      // Monitor connection metrics
      cy.get('[data-cy=connection-metrics]').click();
      cy.get('[data-cy=latency-display]').should('be.visible');
      cy.get('[data-cy=connection-quality]').should('contain', 'Excellent');
      
      // Force WebSocket disconnection
      cy.window().then((win) => {
        win.socketForceDisconnect();
      });
      
      // Verify automatic reconnection
      cy.get('[data-cy=connection-status]', { timeout: 10000 })
        .should('contain', 'Connected');
      
      // Verify functionality after reconnection
      cy.get('[data-cy=message-input]').type('Message after reconnection');
      cy.get('[data-cy=send-message]').click();
      
      cy.get('[data-cy=sent-message]').should('be.visible');
      cy.get('[data-cy=delivery-status]').should('contain', 'Delivered');
    });

    it('should synchronize across multiple browser tabs', () => {
      cy.log('Testing Multi-Tab Synchronization');
      
      // Open messaging in first tab
      cy.navigateToProject(highValueProject.id);
      cy.get('[data-cy=message-seller-btn]').click();
      
      // Send message in first tab
      cy.get('[data-cy=message-input]').type('Message from tab 1');
      cy.get('[data-cy=send-message]').click();
      
      // Open second tab
      cy.window().then((win) => {
        win.open('/dashboard', '_blank');
      });
      
      // Switch to second tab and verify message synchronization
      cy.switchToTab(1);
      cy.get('[data-cy=notifications-panel]').click();
      cy.get('[data-cy=new-message-notification]').should('be.visible');
      
      // Navigate to conversation in second tab
      cy.get('[data-cy=view-conversation]').click();
      cy.get('[data-cy=message-list]').should('contain', 'Message from tab 1');
      
      // Send message from second tab
      cy.get('[data-cy=message-input]').type('Reply from tab 2');
      cy.get('[data-cy=send-message]').click();
      
      // Switch back to first tab and verify synchronization
      cy.switchToTab(0);
      cy.get('[data-cy=message-list]').should('contain', 'Reply from tab 2');
    });
  });

  describe('Mobile Purchase Experience', () => {
    beforeEach(() => {
      cy.viewport('iphone-12');
    });

    it('should complete purchase flow on mobile device', () => {
      cy.log('Testing Mobile Purchase Workflow');
      
      // Mobile login
      cy.visit('/');
      cy.get('[data-cy=mobile-menu-toggle]').click();
      cy.get('[data-cy=mobile-login]').click();
      
      cy.get('[data-cy=email-input]').type(testUser.buyer.email);
      cy.get('[data-cy=password-input]').type(testUser.buyer.password);
      cy.get('[data-cy=login-submit]').click();
      
      // Navigate to marketplace
      cy.get('[data-cy=mobile-menu-toggle]').click();
      cy.get('[data-cy=mobile-marketplace]').click();
      
      // Use mobile-optimized filters
      cy.get('[data-cy=mobile-filter-toggle]').click();
      cy.get('[data-cy=mobile-filter-modal]').should('be.visible').within(() => {
        cy.get('[data-cy=price-range-slider]').setSliderValue([50000, 100000]);
        cy.get('[data-cy=verified-toggle]').click();
        cy.get('[data-cy=apply-mobile-filters]').click();
      });
      
      // Verify mobile touch targets
      cy.get('[data-cy=project-card]').first().within(() => {
        cy.get('[data-cy=view-details]').should('have.css', 'min-height', '48px');
        cy.get('[data-cy=view-details]').click();
      });
      
      // Mobile project details
      cy.get('[data-cy=mobile-project-header]').should('be.visible');
      cy.get('[data-cy=mobile-action-sheet]').should('be.visible');
      
      // Express interest on mobile
      cy.get('[data-cy=mobile-express-interest]').click();
      
      // Mobile bottom sheet modal
      cy.get('[data-cy=mobile-interest-modal]').should('be.visible').within(() => {
        cy.get('[data-cy=mobile-commitments]').should('be.visible');
        cy.get('[data-cy=commitment-development]').click();
        cy.get('[data-cy=commitment-marketing]').click();
        
        cy.get('[data-cy=mobile-business-plan]').type('Mobile business plan input');
        cy.get('[data-cy=mobile-submit-interest]').click();
      });
      
      // Mobile payment flow
      cy.mockSellerAcceptance();
      cy.get('[data-cy=mobile-proceed-payment]').click();
      
      cy.get('[data-cy=mobile-payment-modal]').should('be.visible').within(() => {
        cy.get('[data-cy=payment-amount]').should('be.visible');
        cy.get('[data-cy=mobile-payment-stripe]').click();
        cy.get('[data-cy=mobile-proceed-checkout]').click();
      });
      
      // Mobile Stripe checkout
      cy.origin('https://checkout.stripe.com', () => {
        // Verify mobile-optimized payment form
        cy.get('[data-testid=mobile-payment-form]').should('be.visible');
        cy.get('#cardNumber').type('4242424242424242');
        cy.get('#cardExpiry').type('1225');
        cy.get('#cardCvc').type('123');
        
        cy.get('[data-testid=mobile-payment-submit]').click();
      });
      
      // Mobile success page
      cy.url().should('include', '/purchase/success');
      cy.get('[data-cy=mobile-success-header]').should('be.visible');
      cy.get('[data-cy=mobile-next-steps]').should('be.visible');
    });

    it('should handle touch gestures and mobile interactions', () => {
      cy.log('Testing Mobile Touch Interactions');
      
      cy.login(testUser.buyer.email, testUser.buyer.password);
      cy.visit('/marketplace');
      
      // Test swipe gestures on project cards
      cy.get('[data-cy=project-card]').first().within(() => {
        // Swipe right to quick action
        cy.swipeRight();
        cy.get('[data-cy=quick-interest]').should('be.visible');
        
        // Swipe left to bookmark
        cy.swipeLeft();
        cy.get('[data-cy=quick-bookmark]').should('be.visible');
      });
      
      // Test pinch-to-zoom on project images
      cy.get('[data-cy=project-card]').first().click();
      cy.get('[data-cy=project-gallery]').within(() => {
        cy.get('[data-cy=project-image]').first().pinchZoom(2);
        cy.get('[data-cy=image-zoom-overlay]').should('be.visible');
      });
      
      // Test pull-to-refresh
      cy.pullToRefresh();
      cy.get('[data-cy=refresh-indicator]').should('be.visible');
      cy.get('[data-cy=updated-timestamp]').should('be.visible');
    });

    it('should maintain performance on mobile networks', () => {
      cy.log('Testing Mobile Network Performance');
      
      // Simulate 3G network
      cy.throttleNetwork('3G');
      
      cy.visit('/marketplace');
      
      // Measure page load time
      cy.measurePageLoad().then((loadTime) => {
        expect(loadTime).to.be.lessThan(5000); // 5 seconds max on 3G
      });
      
      // Test progressive loading
      cy.get('[data-cy=project-skeleton]').should('be.visible');
      cy.get('[data-cy=project-card]', { timeout: 10000 }).should('be.visible');
      
      // Verify image lazy loading
      cy.scrollTo('bottom');
      cy.get('[data-cy=lazy-image]').should('have.attr', 'src').and('not.be.empty');
      
      // Test offline functionality
      cy.goOffline();
      cy.get('[data-cy=offline-indicator]').should('be.visible');
      cy.get('[data-cy=cached-content]').should('be.visible');
      
      cy.goOnline();
      cy.get('[data-cy=online-indicator]').should('be.visible');
    });
  });

  describe('Error Recovery & Edge Cases', () => {
    it('should handle server maintenance gracefully', () => {
      cy.log('Testing Server Maintenance Handling');
      
      // Simulate server maintenance mode
      cy.intercept('GET', '/api/**', {
        statusCode: 503,
        body: { 
          error: 'Service temporarily unavailable',
          maintenanceUntil: new Date(Date.now() + 3600000).toISOString()
        }
      }).as('maintenanceMode');
      
      cy.visit('/marketplace');
      
      // Verify maintenance page
      cy.get('[data-cy=maintenance-notice]').should('be.visible');
      cy.get('[data-cy=estimated-restore-time]').should('be.visible');
      cy.get('[data-cy=retry-button]').should('be.visible');
      
      // Test retry functionality
      cy.intercept('GET', '/api/**').as('serviceRestored');
      cy.get('[data-cy=retry-button]').click();
      
      cy.wait('@serviceRestored');
      cy.get('[data-cy=marketplace-content]').should('be.visible');
    });

    it('should handle authentication token expiry during purchase', () => {
      cy.log('Testing Token Expiry During Purchase');
      
      cy.login(testUser.buyer.email, testUser.buyer.password);
      cy.navigateToProject(highValueProject.id);
      cy.expressInterest();
      
      // Simulate token expiry during payment
      cy.intercept('POST', '/api/purchase-requests', {
        statusCode: 401,
        body: { error: 'Token expired' }
      }).as('tokenExpired');
      
      cy.get('[data-cy=proceed-payment]').click();
      
      cy.wait('@tokenExpired');
      
      // Verify automatic token refresh
      cy.get('[data-cy=auth-refresh-modal]').should('be.visible');
      cy.get('[data-cy=continue-session]').click();
      
      // Should continue with purchase flow
      cy.get('[data-cy=payment-modal]').should('be.visible');
    });

    it('should handle project sold during checkout process', () => {
      cy.log('Testing Project Sold During Checkout');
      
      cy.login(testUser.buyer.email, testUser.buyer.password);
      cy.navigateToProject(highValueProject.id);
      cy.expressInterest();
      cy.acceptTerms();
      
      // Simulate project sold by another buyer
      cy.intercept('POST', '/api/payments/stripe/checkout', {
        statusCode: 409,
        body: { 
          error: 'Project no longer available',
          reason: 'Purchased by another buyer',
          timestamp: new Date().toISOString()
        }
      }).as('projectSold');
      
      cy.get('[data-cy=proceed-payment]').click();
      cy.get('[data-cy=payment-stripe]').click();
      cy.get('[data-cy=proceed-checkout]').click();
      
      cy.wait('@projectSold');
      
      // Verify conflict resolution
      cy.get('[data-cy=conflict-modal]').should('be.visible').within(() => {
        cy.get('[data-cy=conflict-message]').should('contain', 'no longer available');
        cy.get('[data-cy=find-similar]').should('be.visible');
        cy.get('[data-cy=notify-next-time]').should('be.visible');
        cy.get('[data-cy=refund-info]').should('be.visible');
      });
    });
  });

  describe('Security & Fraud Prevention', () => {
    it('should prevent unauthorized purchase attempts', () => {
      cy.log('Testing Security Measures');
      
      // Attempt purchase without authentication
      cy.visit(`/projects/${highValueProject.id}`);
      cy.get('[data-cy=express-interest-btn]').click();
      
      // Should redirect to login
      cy.url().should('include', '/login');
      cy.get('[data-cy=login-required-notice]').should('be.visible');
    });

    it('should validate high-value transaction authenticity', () => {
      cy.log('Testing Transaction Validation');
      
      cy.login(testUser.buyer.email, testUser.buyer.password);
      cy.navigateToProject(highValueProject.id);
      
      // Should require additional verification for high-value
      cy.get('[data-cy=express-interest-btn]').click();
      
      cy.get('[data-cy=verification-modal]').should('be.visible').within(() => {
        cy.get('[data-cy=identity-verification]').should('be.visible');
        cy.get('[data-cy=financial-verification]').should('be.visible');
        cy.get('[data-cy=proceed-verification]').click();
      });
    });

    it('should handle suspicious activity detection', () => {
      cy.log('Testing Fraud Detection');
      
      // Simulate multiple rapid purchase attempts
      cy.login(testUser.buyer.email, testUser.buyer.password);
      
      for (let i = 0; i < 5; i++) {
        cy.navigateToProject(highValueProject.id);
        cy.get('[data-cy=express-interest-btn]').click();
        cy.get('[data-cy=interest-modal]').within(() => {
          cy.get('[data-cy=cancel-interest]').click();
        });
      }
      
      // Should trigger fraud detection
      cy.get('[data-cy=express-interest-btn]').click();
      cy.get('[data-cy=security-check-modal]').should('be.visible');
      cy.get('[data-cy=additional-verification]').should('be.visible');
    });
  });
});