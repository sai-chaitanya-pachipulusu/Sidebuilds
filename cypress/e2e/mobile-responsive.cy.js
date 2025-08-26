// Mobile Responsive Testing for SideBuilds Marketplace
// Comprehensive mobile testing covering multiple devices and interaction patterns

describe('Mobile Responsiveness & Touch Interactions', () => {
  const testUser = {
    email: 'buyer@sidebuilds.com',
    password: 'SecurePass123!'
  };

  const testProject = {
    id: 1,
    name: 'Mobile-Optimized React App',
    price: 35000,
    monthlyRevenue: 6000
  };

  // Device configurations for comprehensive testing
  const devices = [
    { name: 'iPhone SE', width: 375, height: 667, userAgent: 'iPhone' },
    { name: 'iPhone 12', width: 390, height: 844, userAgent: 'iPhone' },
    { name: 'iPhone 12 Pro Max', width: 428, height: 926, userAgent: 'iPhone' },
    { name: 'Samsung Galaxy S21', width: 384, height: 854, userAgent: 'Android' },
    { name: 'iPad', width: 768, height: 1024, userAgent: 'iPad' },
    { name: 'iPad Pro', width: 1024, height: 1366, userAgent: 'iPad' }
  ];

  beforeEach(() => {
    cy.task('db:reset');
    cy.task('db:seed', { 
      projects: [testProject],
      users: [testUser]
    });
    
    cy.clearCookies();
    cy.clearLocalStorage();
  });

  describe('Cross-Device Responsive Design', () => {
    devices.forEach(({ name, width, height, userAgent }) => {
      describe(`${name} (${width}x${height})`, () => {
        beforeEach(() => {
          cy.viewport(width, height);
          cy.setUserAgent(userAgent);
        });

        it('should render marketplace with proper responsive layout', () => {
          cy.log(`Testing ${name} marketplace layout`);
          
          cy.visit('/marketplace');
          
          // Verify responsive header
          if (width < 768) {
            // Mobile layout
            cy.get('[data-cy=mobile-header]').should('be.visible');
            cy.get('[data-cy=mobile-menu-toggle]').should('be.visible');
            cy.get('[data-cy=desktop-nav]').should('not.be.visible');
          } else {
            // Tablet/Desktop layout
            cy.get('[data-cy=desktop-nav]').should('be.visible');
            cy.get('[data-cy=mobile-menu-toggle]').should('not.be.visible');
          }
          
          // Verify responsive grid
          cy.get('[data-cy=project-grid]').should('be.visible');
          
          if (width < 640) {
            // Single column on small mobile
            cy.get('[data-cy=project-card]').should('have.css', 'width').then((width) => {
              expect(parseInt(width)).to.be.greaterThan(300);
            });
          } else if (width < 1024) {
            // Two columns on larger mobile/tablet
            cy.get('[data-cy=project-grid]').should('have.class', 'grid-cols-2');
          }
          
          // Verify touch targets meet minimum requirements
          cy.verifyTouchTargetSize('[data-cy=interactive-element]', 44);
        });

        it('should handle ProjectCard responsive behavior', () => {
          cy.log(`Testing ${name} ProjectCard responsiveness`);
          
          cy.visit('/marketplace');
          
          cy.get('[data-cy=project-card]').first().within(() => {
            // Verify card scales properly
            cy.root().should('be.visible').and(($card) => {
              const cardWidth = $card.width();
              expect(cardWidth).to.be.at.least(280); // Minimum card width
              expect(cardWidth).to.be.at.most(width - 40); // Max width with margins
            });
            
            // Verify touch targets
            cy.get('[data-cy=view-details]').shouldHaveMinHeight(44);
            
            if (width < 768) {
              // Mobile-specific elements
              cy.get('[data-cy=mobile-price-display]').should('be.visible');
              cy.get('[data-cy=mobile-action-buttons]').should('be.visible');
            }
            
            // Test card interaction
            cy.get('[data-cy=view-details]').click();
          });
          
          // Verify navigation worked
          cy.url().should('include', `/projects/${testProject.id}`);
        });

        it('should provide proper mobile navigation', () => {
          cy.log(`Testing ${name} mobile navigation`);
          
          cy.visit('/');
          
          if (width < 768) {
            // Test mobile menu
            cy.get('[data-cy=mobile-menu-toggle]').click();
            cy.get('[data-cy=mobile-menu]').should('be.visible').within(() => {
              // Verify all navigation items
              cy.get('[data-cy=mobile-marketplace]').should('be.visible');
              cy.get('[data-cy=mobile-dashboard]').should('be.visible');
              cy.get('[data-cy=mobile-login]').should('be.visible');
              
              // Test navigation
              cy.get('[data-cy=mobile-marketplace]').click();
            });
            
            // Verify menu closes after navigation
            cy.get('[data-cy=mobile-menu]').should('not.be.visible');
            cy.url().should('include', '/marketplace');
          }
        });

        it('should handle form inputs responsively', () => {
          cy.log(`Testing ${name} form responsiveness`);
          
          cy.visit('/login');
          
          // Verify form layout
          cy.get('[data-cy=login-form]').within(() => {
            cy.get('[data-cy=email-input]').should('be.visible').and(($input) => {
              const inputWidth = $input.width();
              expect(inputWidth).to.be.at.least(200);
              expect(inputWidth).to.be.at.most(width - 80);
            });
            
            // Verify input focus behavior on mobile
            cy.get('[data-cy=email-input]').focus();
            
            if (userAgent.includes('iPhone') || userAgent.includes('Android')) {
              // Mobile keyboards should not break layout
              cy.get('[data-cy=login-form]').should('be.visible');
            }
            
            // Test form submission
            cy.get('[data-cy=email-input]').type('test@example.com');
            cy.get('[data-cy=password-input]').type('password123');
            cy.get('[data-cy=login-submit]').shouldHaveMinHeight(44).click();
          });
        });
      });
    });
  });

  describe('Touch Gesture Interactions', () => {
    beforeEach(() => {
      cy.viewport('iphone-12');
      cy.login(testUser.email, testUser.password);
    });

    it('should handle swipe gestures on project cards', () => {
      cy.log('Testing Swipe Gestures');
      
      cy.visit('/marketplace');
      
      cy.get('[data-cy=project-card]').first().as('projectCard');
      
      // Test swipe right for quick actions
      cy.get('@projectCard').swipeRight();
      cy.get('[data-cy=quick-actions-panel]').should('be.visible').within(() => {
        cy.get('[data-cy=quick-interest]').should('be.visible');
        cy.get('[data-cy=quick-bookmark]').should('be.visible');
        cy.get('[data-cy=quick-share]').should('be.visible');
      });
      
      // Test swipe left to close
      cy.get('@projectCard').swipeLeft();
      cy.get('[data-cy=quick-actions-panel]').should('not.be.visible');
      
      // Test swipe up for details preview
      cy.get('@projectCard').within(() => {
        cy.trigger('touchstart', { touches: [{ clientX: 200, clientY: 400 }] });
        cy.trigger('touchmove', { touches: [{ clientX: 200, clientY: 200 }] });
        cy.trigger('touchend');
      });
      
      cy.get('[data-cy=project-preview-modal]').should('be.visible');
      cy.get('[data-cy=preview-details]').should('be.visible');
    });

    it('should handle pinch-to-zoom on project images', () => {
      cy.log('Testing Pinch-to-Zoom');
      
      cy.navigateToProject(testProject.id);
      
      cy.get('[data-cy=project-gallery]').within(() => {
        cy.get('[data-cy=project-image]').first().as('projectImage');
        
        // Test pinch to zoom
        cy.get('@projectImage').pinchZoom(2);
        
        // Verify zoom functionality
        cy.get('[data-cy=image-zoom-overlay]').should('be.visible');
        cy.get('[data-cy=zoom-controls]').should('be.visible');
        cy.get('[data-cy=zoom-level]').should('contain', '200%');
        
        // Test zoom out
        cy.get('@projectImage').pinchZoom(0.5);
        cy.get('[data-cy=zoom-level]').should('contain', '100%');
        
        // Test double-tap to zoom
        cy.get('@projectImage').dblclick();
        cy.get('[data-cy=zoom-level]').should('contain', '200%');
        
        // Close zoom overlay
        cy.get('[data-cy=close-zoom]').click();
        cy.get('[data-cy=image-zoom-overlay]').should('not.be.visible');
      });
    });

    it('should handle pull-to-refresh gesture', () => {
      cy.log('Testing Pull-to-Refresh');
      
      cy.visit('/marketplace');
      
      // Verify initial content
      cy.get('[data-cy=project-card]').should('have.length.greaterThan', 0);
      
      // Perform pull-to-refresh
      cy.pullToRefresh();
      
      // Verify refresh indicators
      cy.get('[data-cy=refresh-indicator]').should('be.visible');
      cy.get('[data-cy=refreshing-message]').should('contain', 'Refreshing marketplace');
      
      // Wait for refresh completion
      cy.get('[data-cy=refresh-complete]', { timeout: 5000 }).should('be.visible');
      cy.get('[data-cy=updated-timestamp]').should('be.visible');
      
      // Verify content is still present
      cy.get('[data-cy=project-card]').should('have.length.greaterThan', 0);
    });

    it('should handle long press interactions', () => {
      cy.log('Testing Long Press Actions');
      
      cy.visit('/marketplace');
      
      cy.get('[data-cy=project-card]').first().as('projectCard');
      
      // Perform long press
      cy.get('@projectCard').trigger('touchstart', { touches: [{ clientX: 200, clientY: 300 }] });
      cy.wait(1000); // Hold for 1 second
      cy.get('@projectCard').trigger('touchend');
      
      // Verify context menu appears
      cy.get('[data-cy=context-menu]').should('be.visible').within(() => {
        cy.get('[data-cy=context-bookmark]').should('be.visible');
        cy.get('[data-cy=context-share]').should('be.visible');
        cy.get('[data-cy=context-report]').should('be.visible');
        cy.get('[data-cy=context-view-seller]').should('be.visible');
      });
      
      // Test context menu action
      cy.get('[data-cy=context-bookmark]').click();
      cy.get('[data-cy=bookmark-success]').should('be.visible');
      cy.get('[data-cy=context-menu]').should('not.be.visible');
    });

    it('should handle multi-touch gestures', () => {
      cy.log('Testing Multi-Touch Interactions');
      
      cy.navigateToProject(testProject.id);
      
      // Test two-finger scroll on content
      cy.get('[data-cy=project-content]').within(() => {
        cy.trigger('touchstart', {
          touches: [
            { clientX: 100, clientY: 200 },
            { clientX: 200, clientY: 200 }
          ]
        });
        
        cy.trigger('touchmove', {
          touches: [
            { clientX: 100, clientY: 150 },
            { clientX: 200, clientY: 150 }
          ]
        });
        
        cy.trigger('touchend');
      });
      
      // Verify smooth scrolling occurred
      cy.window().its('scrollY').should('be.greaterThan', 0);
    });
  });

  describe('Mobile Purchase Flow', () => {
    beforeEach(() => {
      cy.viewport('iphone-12');
      cy.login(testUser.email, testUser.password);
    });

    it('should complete mobile purchase workflow', () => {
      cy.log('Testing Mobile Purchase Workflow');
      
      cy.navigateToProject(testProject.id);
      
      // Verify mobile project layout
      cy.get('[data-cy=mobile-project-header]').should('be.visible');
      cy.get('[data-cy=mobile-price-banner]').should('be.visible');
      cy.get('[data-cy=mobile-action-sheet]').should('be.visible');
      
      // Express interest via mobile interface
      cy.get('[data-cy=mobile-express-interest]').click();
      
      // Mobile bottom sheet modal
      cy.get('[data-cy=mobile-interest-modal]').should('be.visible').and(($modal) => {
        // Verify modal takes up appropriate screen space
        const modalHeight = $modal.height();
        expect(modalHeight).to.be.at.least(400);
        expect(modalHeight).to.be.at.most(700);
      }).within(() => {
        // Mobile form interactions
        cy.get('[data-cy=mobile-commitments]').should('be.visible');
        
        // Use mobile-optimized toggles
        cy.get('[data-cy=commitment-development]').click();
        cy.get('[data-cy=commitment-marketing]').click();
        
        // Mobile text input
        cy.get('[data-cy=mobile-business-plan]').type('Mobile business plan input test');
        
        // Mobile submit button
        cy.get('[data-cy=mobile-submit-interest]').shouldHaveMinHeight(44).click();
      });
      
      // Verify mobile success feedback
      cy.get('[data-cy=mobile-success-toast]').should('be.visible');
      cy.get('[data-cy=mobile-next-steps]').should('be.visible');
    });

    it('should handle mobile payment interface', () => {
      cy.log('Testing Mobile Payment Interface');
      
      cy.navigateToProject(testProject.id);
      cy.expressInterest();
      cy.mockSellerAcceptance();
      
      // Mobile payment flow
      cy.get('[data-cy=mobile-proceed-payment]').click();
      
      cy.get('[data-cy=mobile-payment-modal]').should('be.visible').within(() => {
        // Verify mobile payment layout
        cy.get('[data-cy=payment-amount-large]').should('be.visible');
        cy.get('[data-cy=mobile-payment-methods]').should('be.visible');
        
        // Test mobile payment method selection
        cy.get('[data-cy=mobile-payment-stripe]').click();
        
        // Verify mobile checkout button
        cy.get('[data-cy=mobile-proceed-checkout]').shouldHaveMinHeight(48).click();
      });
      
      // Mobile Stripe checkout simulation
      cy.origin('https://checkout.stripe.com', () => {
        // Verify mobile payment form
        cy.get('[data-testid=mobile-payment-form]').should('be.visible');
        
        // Mobile-optimized input fields
        cy.get('#cardNumber').should('have.attr', 'inputmode', 'numeric');
        cy.get('#cardExpiry').should('have.attr', 'inputmode', 'numeric');
        cy.get('#cardCvc').should('have.attr', 'inputmode', 'numeric');
        
        // Complete mobile payment
        cy.get('#cardNumber').type('4242424242424242');
        cy.get('#cardExpiry').type('1225');
        cy.get('#cardCvc').type('123');
        
        cy.get('[data-testid=mobile-payment-submit]').click();
      });
      
      // Mobile success page
      cy.url().should('include', '/purchase/success');
      cy.get('[data-cy=mobile-success-header]').should('be.visible');
      cy.get('[data-cy=mobile-transaction-summary]').should('be.visible');
    });

    it('should handle mobile messaging interface', () => {
      cy.log('Testing Mobile Messaging');
      
      cy.navigateToProject(testProject.id);
      
      // Open mobile messaging
      cy.get('[data-cy=mobile-message-seller]').click();
      
      cy.get('[data-cy=mobile-messaging-modal]').should('be.visible').within(() => {
        // Verify mobile chat layout
        cy.get('[data-cy=mobile-chat-header]').should('be.visible');
        cy.get('[data-cy=mobile-message-list]').should('be.visible');
        cy.get('[data-cy=mobile-message-input]').should('be.visible');
        
        // Test mobile message input
        cy.get('[data-cy=mobile-message-input]').type('Hello from mobile device!');
        cy.get('[data-cy=mobile-send-button]').shouldHaveMinHeight(44).click();
        
        // Verify message appears
        cy.get('[data-cy=mobile-message-bubble]').should('contain', 'Hello from mobile device!');
        
        // Test mobile attachment features
        cy.get('[data-cy=mobile-attach-button]').click();
        cy.get('[data-cy=mobile-attachment-options]').should('be.visible');
      });
    });
  });

  describe('Mobile Performance & Optimization', () => {
    beforeEach(() => {
      cy.viewport('iphone-12');
    });

    it('should maintain performance on mobile networks', () => {
      cy.log('Testing Mobile Network Performance');
      
      // Simulate mobile network conditions
      cy.throttleNetwork('3G');
      
      const startTime = Date.now();
      cy.visit('/marketplace');
      
      // Measure loading performance
      cy.get('[data-cy=project-card]', { timeout: 10000 }).should('be.visible').then(() => {
        const loadTime = Date.now() - startTime;
        expect(loadTime).to.be.lessThan(8000); // 8 seconds max on 3G
      });
      
      // Verify progressive loading
      cy.get('[data-cy=mobile-skeleton]').should('not.exist');
      cy.get('[data-cy=project-card]').should('have.length.greaterThan', 0);
      
      // Test image lazy loading
      cy.scrollTo('bottom');
      cy.get('[data-cy=lazy-image]').should('have.attr', 'src').and('not.be.empty');
    });

    it('should optimize mobile battery usage', () => {
      cy.log('Testing Mobile Battery Optimization');
      
      cy.visit('/marketplace');
      
      // Verify reduced animation on mobile
      cy.window().then((win) => {
        const prefersReducedMotion = win.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (prefersReducedMotion) {
          cy.get('[data-cy=animated-element]').should('have.css', 'animation-duration', '0s');
        }
      });
      
      // Test background tab behavior
      cy.window().then((win) => {
        // Simulate tab going to background
        Object.defineProperty(win.document, 'hidden', { value: true });
        win.document.dispatchEvent(new Event('visibilitychange'));
      });
      
      // Verify reduced activity
      cy.get('[data-cy=background-mode-indicator]').should('be.visible');
      
      // Bring back to foreground
      cy.window().then((win) => {
        Object.defineProperty(win.document, 'hidden', { value: false });
        win.document.dispatchEvent(new Event('visibilitychange'));
      });
      
      cy.get('[data-cy=background-mode-indicator]').should('not.exist');
    });

    it('should handle mobile memory constraints', () => {
      cy.log('Testing Mobile Memory Management');
      
      // Load marketplace with many items
      cy.visit('/marketplace');
      
      // Scroll through multiple pages to test memory usage
      for (let i = 0; i < 5; i++) {
        cy.scrollTo('bottom');
        cy.get('[data-cy=load-more]').click();
        cy.wait(1000);
      }
      
      // Verify no memory warnings
      cy.get('[data-cy=memory-warning]').should('not.exist');
      
      // Test memory cleanup on navigation
      cy.visit('/dashboard');
      cy.visit('/marketplace');
      
      // Should still be responsive
      cy.get('[data-cy=project-card]').should('be.visible');
    });

    it('should provide mobile offline functionality', () => {
      cy.log('Testing Mobile Offline Capabilities');
      
      cy.login(testUser.email, testUser.password);
      cy.visit('/marketplace');
      
      // Cache content
      cy.get('[data-cy=project-card]').should('be.visible');
      
      // Go offline
      cy.goOffline();
      
      // Verify offline mode
      cy.get('[data-cy=mobile-offline-banner]').should('be.visible');
      cy.get('[data-cy=cached-content]').should('be.visible');
      
      // Test offline navigation
      cy.get('[data-cy=project-card]').first().click();
      cy.get('[data-cy=offline-project-view]').should('be.visible');
      
      // Test offline actions
      cy.get('[data-cy=offline-bookmark]').click();
      cy.get('[data-cy=offline-action-queued]').should('be.visible');
      
      // Come back online
      cy.goOnline();
      
      // Verify sync
      cy.get('[data-cy=mobile-syncing-banner]').should('be.visible');
      cy.get('[data-cy=sync-complete]', { timeout: 5000 }).should('be.visible');
    });
  });

  describe('Mobile Accessibility', () => {
    beforeEach(() => {
      cy.viewport('iphone-12');
    });

    it('should support mobile screen readers', () => {
      cy.log('Testing Mobile Screen Reader Support');
      
      cy.visit('/marketplace');
      
      // Verify ARIA labels
      cy.get('[data-cy=project-card]').first().within(() => {
        cy.get('[data-cy=project-title]').should('have.attr', 'aria-label');
        cy.get('[data-cy=project-price]').should('have.attr', 'aria-label');
        cy.get('[data-cy=view-details]').should('have.attr', 'aria-describedby');
      });
      
      // Test focus management
      cy.get('[data-cy=project-card]').first().focus();
      cy.get('[data-cy=view-details]').should('have.focus');
      
      // Test keyboard navigation
      cy.tab();
      cy.get('[data-cy=project-card]').eq(1).find('[data-cy=view-details]').should('have.focus');
    });

    it('should support mobile zoom and text scaling', () => {
      cy.log('Testing Mobile Zoom Support');
      
      cy.visit('/marketplace');
      
      // Simulate text scaling
      cy.get('html').invoke('css', 'font-size', '20px'); // Increase base font size
      
      // Verify layout adapts
      cy.get('[data-cy=project-card]').should('be.visible');
      cy.get('[data-cy=mobile-layout]').should('not.have.css', 'overflow', 'hidden');
      
      // Test pinch zoom simulation
      cy.get('body').trigger('wheel', { deltaY: -120, ctrlKey: true });
      
      // Verify content remains accessible
      cy.get('[data-cy=project-title]').should('be.visible');
      cy.get('[data-cy=navigation-elements]').should('be.visible');
    });

    it('should support high contrast mode', () => {
      cy.log('Testing High Contrast Support');
      
      // Simulate high contrast mode
      cy.window().then((win) => {
        win.matchMedia = cy.stub().returns({
          matches: true,
          media: '(prefers-contrast: high)',
          addEventListener: cy.stub(),
          removeEventListener: cy.stub()
        });
      });
      
      cy.visit('/marketplace');
      
      // Verify high contrast styles
      cy.get('[data-cy=project-card]').should('have.css', 'border-width').and('not.equal', '0px');
      cy.get('[data-cy=interactive-element]').should(($el) => {
        const contrast = window.getComputedStyle($el[0]);
        // Verify sufficient color contrast
        expect(contrast.color).to.not.equal(contrast.backgroundColor);
      });
    });

    it('should handle mobile keyboard inputs', () => {
      cy.log('Testing Mobile Keyboard Support');
      
      cy.visit('/marketplace');
      
      // Test search input
      cy.get('[data-cy=mobile-search]').click();
      cy.get('[data-cy=search-input]').should('be.focused').and('have.attr', 'inputmode', 'search');
      
      // Test numeric inputs
      cy.navigateToProject(testProject.id);
      cy.expressInterest();
      
      cy.get('[data-cy=interest-modal]').within(() => {
        cy.get('[data-cy=budget-input]').click();
        cy.get('[data-cy=budget-input]').should('have.attr', 'inputmode', 'numeric');
      });
    });
  });

  describe('Mobile Error Handling', () => {
    beforeEach(() => {
      cy.viewport('iphone-12');
    });

    it('should handle mobile orientation changes', () => {
      cy.log('Testing Orientation Change Handling');
      
      cy.login(testUser.email, testUser.password);
      cy.visit('/marketplace');
      
      // Portrait mode
      cy.get('[data-cy=project-grid]').should('have.class', 'grid-cols-1');
      
      // Landscape mode
      cy.viewport(844, 390); // iPhone 12 landscape
      
      cy.get('[data-cy=project-grid]').should('have.class', 'grid-cols-2');
      cy.get('[data-cy=landscape-layout]').should('be.visible');
      
      // Verify all elements are still accessible
      cy.get('[data-cy=project-card]').should('be.visible');
      cy.get('[data-cy=navigation-elements]').should('be.visible');
    });

    it('should handle mobile browser zoom', () => {
      cy.log('Testing Mobile Browser Zoom');
      
      cy.visit('/marketplace');
      
      // Simulate browser zoom
      cy.window().then((win) => {
        win.document.documentElement.style.zoom = '150%';
      });
      
      // Verify layout remains functional
      cy.get('[data-cy=project-card]').should('be.visible');
      cy.get('[data-cy=touch-targets]').each(($el) => {
        cy.wrap($el).shouldHaveMinHeight(44);
      });
      
      // Reset zoom
      cy.window().then((win) => {
        win.document.documentElement.style.zoom = '100%';
      });
    });

    it('should handle mobile app switching', () => {
      cy.log('Testing Mobile App Switching');
      
      cy.login(testUser.email, testUser.password);
      cy.navigateToProject(testProject.id);
      
      // Simulate app switching (page visibility change)
      cy.window().then((win) => {
        Object.defineProperty(win.document, 'hidden', { value: true });
        win.document.dispatchEvent(new Event('visibilitychange'));
      });
      
      // Wait for background processing
      cy.wait(3000);
      
      // Return to app
      cy.window().then((win) => {
        Object.defineProperty(win.document, 'hidden', { value: false });
        win.document.dispatchEvent(new Event('visibilitychange'));
      });
      
      // Verify state is preserved
      cy.get('[data-cy=project-details]').should('be.visible');
      cy.get('[data-cy=user-session]').should('be.valid');
    });
  });
});