// Custom Cypress commands for SideBuilds marketplace testing
// Enhanced commands for high-value transaction testing

// ============================================================================
// AUTHENTICATION COMMANDS
// ============================================================================

Cypress.Commands.add('login', (email, password) => {
  cy.session([email, password], () => {
    cy.visit('/login');
    cy.get('[data-cy=email-input]').type(email);
    cy.get('[data-cy=password-input]').type(password);
    cy.get('[data-cy=login-submit]').click();
    
    // Wait for authentication to complete
    cy.url().should('not.include', '/login');
    cy.window().its('localStorage.token').should('exist');
  });
  
  // Visit home page after session restore
  cy.visit('/');
});

Cypress.Commands.add('logout', () => {
  cy.window().then((win) => {
    win.localStorage.removeItem('token');
    win.localStorage.removeItem('user');
  });
  cy.visit('/login');
});

// ============================================================================
// NAVIGATION COMMANDS
// ============================================================================

Cypress.Commands.add('navigateToProject', (projectId) => {
  cy.visit(`/projects/${projectId}`);
  cy.get('[data-cy=project-header]').should('be.visible');
});

Cypress.Commands.add('navigateToMarketplace', () => {
  cy.visit('/marketplace');
  cy.get('[data-cy=marketplace-header]').should('be.visible');
});

// ============================================================================
// PURCHASE WORKFLOW COMMANDS
// ============================================================================

Cypress.Commands.add('expressInterest', (options = {}) => {
  const {
    businessPlan = 'Standard business plan for project acquisition',
    commitments = ['development', 'marketing'],
    timeline = '6-12 months',
    fundingSource = 'venture_capital'
  } = options;

  cy.get('[data-cy=express-interest-btn]').should('be.enabled').click();
  
  cy.get('[data-cy=interest-modal]').should('be.visible').within(() => {
    // Select commitments
    commitments.forEach(commitment => {
      cy.get(`[data-cy=commitment-${commitment}]`).check();
    });
    
    // Set timeline
    cy.get('[data-cy=commitment-timeline]').select(timeline);
    
    // Enter business plan
    cy.get('[data-cy=business-plan]').type(businessPlan);
    
    // Financial verification
    cy.get('[data-cy=financial-capability]').check();
    cy.get('[data-cy=funding-source]').select(fundingSource);
    
    cy.get('[data-cy=submit-interest]').click();
  });
  
  // Verify success
  cy.get('[data-cy=success-toast]').should('be.visible');
  cy.get('[data-cy=interest-status]').should('contain', 'Interest Submitted');
});

Cypress.Commands.add('acceptTerms', () => {
  cy.get('[data-cy=terms-notification]').should('be.visible');
  cy.get('[data-cy=view-terms]').click();
  
  cy.get('[data-cy=terms-modal]').should('be.visible').within(() => {
    // Review terms
    cy.get('[data-cy=price-term]').should('be.visible');
    cy.get('[data-cy=escrow-term]').should('be.visible');
    
    // Accept terms
    cy.get('[data-cy=accept-terms]').click();
  });
  
  cy.get('[data-cy=terms-status]').should('contain', 'Terms Accepted');
});

Cypress.Commands.add('completePayment', (paymentMethod = 'stripe') => {
  cy.get('[data-cy=proceed-payment]').should('be.enabled').click();
  
  cy.get('[data-cy=payment-modal]').should('be.visible').within(() => {
    cy.get('[data-cy=payment-amount]').should('be.visible');
    cy.get(`[data-cy=payment-${paymentMethod}]`).click();
    cy.get('[data-cy=proceed-checkout]').click();
  });
});

// ============================================================================
// STRIPE PAYMENT COMMANDS
// ============================================================================

Cypress.Commands.add('completeStripePayment', (cardDetails = {}) => {
  const {
    card = '4242424242424242',
    expiry = '1225',
    cvc = '123',
    name = 'Test Buyer',
    email = 'buyer@test.com'
  } = cardDetails;

  cy.origin('https://checkout.stripe.com', { args: { card, expiry, cvc, name, email } }, 
    ({ card, expiry, cvc, name, email }) => {
      // Fill payment form
      cy.get('#cardNumber').type(card);
      cy.get('#cardExpiry').type(expiry);
      cy.get('#cardCvc').type(cvc);
      cy.get('#billingName').type(name);
      
      // Verify payment amount for high-value transactions
      cy.get('[data-testid=payment-amount]').should('be.visible');
      
      // Submit payment
      cy.get('[data-testid=hosted-payment-submit-button]').click();
    }
  );
  
  // Verify redirect back to success page
  cy.url().should('include', '/purchase/success');
});

Cypress.Commands.add('mockStripeFailure', (errorType = 'card_declined') => {
  cy.intercept('POST', '/api/payments/stripe/checkout', {
    statusCode: 400,
    body: { 
      error: errorType, 
      message: `Payment failed: ${errorType}` 
    }
  }).as('stripeFailure');
});

// ============================================================================
// REAL-TIME MESSAGING COMMANDS
// ============================================================================

Cypress.Commands.add('openMessaging', () => {
  cy.get('[data-cy=message-seller-btn]').click();
  cy.get('[data-cy=messaging-panel]').should('be.visible');
  cy.get('[data-cy=connection-status]').should('contain', 'Connected');
});

Cypress.Commands.add('sendMessage', (message) => {
  cy.get('[data-cy=message-input]').type(message);
  cy.get('[data-cy=send-message]').click();
  
  // Verify message appears in chat
  cy.get('[data-cy=message-list]').should('contain', message);
  cy.get('[data-cy=delivery-status]').should('contain', 'Delivered');
});

Cypress.Commands.add('verifyMessageDelivery', (messageText, timeout = 5000) => {
  cy.get('[data-cy=message-list]', { timeout }).should('contain', messageText);
  cy.get('[data-cy=delivery-status]').should('contain', 'Delivered');
});

// ============================================================================
// NETWORK SIMULATION COMMANDS
// ============================================================================

Cypress.Commands.add('mockNetworkDisconnection', () => {
  cy.window().then((win) => {
    // Simulate network disconnection
    win.navigator.onLine = false;
    win.dispatchEvent(new Event('offline'));
    
    // Mock socket disconnection
    if (win.socketForceDisconnect) {
      win.socketForceDisconnect();
    }
  });
});

Cypress.Commands.add('mockNetworkReconnection', () => {
  cy.window().then((win) => {
    // Simulate network reconnection
    win.navigator.onLine = true;
    win.dispatchEvent(new Event('online'));
    
    // Mock socket reconnection
    if (win.socketForceReconnect) {
      win.socketForceReconnect();
    }
  });
});

Cypress.Commands.add('throttleNetwork', (networkType = '3G') => {
  const networkConditions = {
    '3G': { downloadThroughput: 1.5 * 1024 * 1024 / 8, uploadThroughput: 750 * 1024 / 8, latency: 100 },
    '4G': { downloadThroughput: 4 * 1024 * 1024 / 8, uploadThroughput: 3 * 1024 * 1024 / 8, latency: 20 },
    'slow-3g': { downloadThroughput: 500 * 1024 / 8, uploadThroughput: 500 * 1024 / 8, latency: 400 }
  };
  
  cy.task('throttleNetwork', networkConditions[networkType]);
});

Cypress.Commands.add('goOffline', () => {
  cy.task('setNetworkConditions', { offline: true });
  cy.mockNetworkDisconnection();
});

Cypress.Commands.add('goOnline', () => {
  cy.task('setNetworkConditions', { offline: false });
  cy.mockNetworkReconnection();
});

// ============================================================================
// MOBILE TESTING COMMANDS
// ============================================================================

Cypress.Commands.add('swipeRight', { prevSubject: 'element' }, (subject) => {
  const element = subject[0];
  const rect = element.getBoundingClientRect();
  
  cy.wrap(subject)
    .trigger('touchstart', { 
      touches: [{ clientX: rect.left + 10, clientY: rect.top + rect.height / 2 }] 
    })
    .trigger('touchmove', { 
      touches: [{ clientX: rect.right - 10, clientY: rect.top + rect.height / 2 }] 
    })
    .trigger('touchend');
});

Cypress.Commands.add('swipeLeft', { prevSubject: 'element' }, (subject) => {
  const element = subject[0];
  const rect = element.getBoundingClientRect();
  
  cy.wrap(subject)
    .trigger('touchstart', { 
      touches: [{ clientX: rect.right - 10, clientY: rect.top + rect.height / 2 }] 
    })
    .trigger('touchmove', { 
      touches: [{ clientX: rect.left + 10, clientY: rect.top + rect.height / 2 }] 
    })
    .trigger('touchend');
});

Cypress.Commands.add('pinchZoom', { prevSubject: 'element' }, (subject, scale = 2) => {
  const element = subject[0];
  const rect = element.getBoundingClientRect();
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;
  
  cy.wrap(subject)
    .trigger('touchstart', {
      touches: [
        { clientX: centerX - 50, clientY: centerY },
        { clientX: centerX + 50, clientY: centerY }
      ]
    })
    .trigger('touchmove', {
      touches: [
        { clientX: centerX - 50 * scale, clientY: centerY },
        { clientX: centerX + 50 * scale, clientY: centerY }
      ]
    })
    .trigger('touchend');
});

Cypress.Commands.add('pullToRefresh', () => {
  cy.get('body')
    .trigger('touchstart', { touches: [{ clientX: 200, clientY: 100 }] })
    .trigger('touchmove', { touches: [{ clientX: 200, clientY: 300 }] })
    .wait(1000)
    .trigger('touchend');
});

Cypress.Commands.add('setSliderValue', { prevSubject: 'element' }, (subject, values) => {
  cy.wrap(subject).as('slider');
  
  // For range sliders with min/max values
  if (Array.isArray(values)) {
    cy.get('@slider').invoke('val', values[0]).trigger('input');
    cy.get('@slider').next().invoke('val', values[1]).trigger('input');
  } else {
    cy.get('@slider').invoke('val', values).trigger('input');
  }
});

// ============================================================================
// PERFORMANCE MEASUREMENT COMMANDS
// ============================================================================

Cypress.Commands.add('measurePageLoad', () => {
  return cy.window().then((win) => {
    return new Promise((resolve) => {
      win.addEventListener('load', () => {
        setTimeout(() => {
          const timing = win.performance.timing;
          const loadTime = timing.loadEventEnd - timing.navigationStart;
          resolve(loadTime);
        }, 100);
      });
    });
  });
});

Cypress.Commands.add('measureSearchTime', () => {
  const startTime = Date.now();
  
  return cy.get('[data-cy=search-results]').then(() => {
    return Date.now() - startTime;
  });
});

Cypress.Commands.add('measureFilterTime', () => {
  const startTime = Date.now();
  
  return cy.get('[data-cy=filtered-results]').then(() => {
    return Date.now() - startTime;
  });
});

// ============================================================================
// MOCK DATA AND API COMMANDS
// ============================================================================

Cypress.Commands.add('mockSellerResponse', (responseType = 'terms_proposed') => {
  const responses = {
    terms_proposed: {
      type: 'terms_proposal',
      terms: {
        price: 75000,
        escrowPeriod: '30 days',
        assetTransferTimeline: '7 business days',
        supportPeriod: '90 days'
      }
    },
    terms_accepted: {
      type: 'terms_accepted',
      message: 'Terms have been accepted. Proceed to payment.'
    }
  };

  cy.intercept('GET', '/api/purchase-requests/*/messages', {
    statusCode: 200,
    body: {
      messages: [responses[responseType]]
    }
  }).as('sellerResponse');
  
  // Simulate real-time notification
  cy.window().then((win) => {
    if (win.mockSocketMessage) {
      win.mockSocketMessage('seller_response', responses[responseType]);
    }
  });
});

Cypress.Commands.add('mockSellerAcceptance', () => {
  cy.mockSellerResponse('terms_accepted');
  cy.get('[data-cy=seller-response-notification]').should('be.visible');
  cy.get('[data-cy=proceed-payment]').should('be.enabled');
});

Cypress.Commands.add('mockPaymentSuccess', () => {
  cy.intercept('POST', '/api/payments/stripe/checkout', {
    statusCode: 200,
    body: {
      checkout_url: 'https://checkout.stripe.com/pay/test_session',
      session_id: 'cs_test_session_id'
    }
  }).as('paymentSuccess');
});

// ============================================================================
// VERIFICATION COMMANDS
// ============================================================================

Cypress.Commands.add('verifyTouchTargetSize', (selector, minSize = 44) => {
  cy.get(selector).each(($el) => {
    cy.wrap($el).then(($element) => {
      const rect = $element[0].getBoundingClientRect();
      const minDimension = Math.min(rect.width, rect.height);
      expect(minDimension).to.be.at.least(minSize);
    });
  });
});

Cypress.Commands.add('verifyLoadTime', (maxTime = 3000) => {
  cy.window().then((win) => {
    const loadTime = win.performance.timing.loadEventEnd - win.performance.timing.navigationStart;
    expect(loadTime).to.be.lessThan(maxTime);
  });
});

Cypress.Commands.add('verifyAccessibility', () => {
  cy.injectAxe();
  cy.checkA11y(null, {
    rules: {
      'color-contrast': { enabled: true },
      'keyboard-navigation': { enabled: true },
      'focus-management': { enabled: true }
    }
  });
});

// ============================================================================
// BROWSER TAB MANAGEMENT
// ============================================================================

Cypress.Commands.add('switchToTab', (tabIndex) => {
  cy.window().then((win) => {
    const tabs = Object.values(win.open.tabs || {});
    if (tabs[tabIndex]) {
      tabs[tabIndex].focus();
    }
  });
});

Cypress.Commands.add('openInNewTab', (url) => {
  cy.window().then((win) => {
    const newTab = win.open(url, '_blank');
    win.open.tabs = win.open.tabs || {};
    win.open.tabs[Object.keys(win.open.tabs).length] = newTab;
  });
});

// ============================================================================
// TEST DATA MANAGEMENT
// ============================================================================

Cypress.Commands.add('seedTestData', (dataType, data) => {
  return cy.task('seedDatabase', { type: dataType, data });
});

Cypress.Commands.add('cleanTestData', () => {
  return cy.task('cleanDatabase');
});

// ============================================================================
// DEBUGGING COMMANDS
// ============================================================================

Cypress.Commands.add('debugState', () => {
  cy.window().then((win) => {
    console.log('Current URL:', win.location.href);
    console.log('Local Storage:', win.localStorage);
    console.log('Socket Status:', win.getCurrentSocketStatus?.());
  });
});

Cypress.Commands.add('takeScreenshotOnFailure', () => {
  cy.on('fail', (err) => {
    cy.screenshot(`failure-${Date.now()}`);
    throw err;
  });
});

// ============================================================================
// CUSTOM ASSERTIONS
// ============================================================================

Cypress.Commands.add('shouldHaveMinHeight', { prevSubject: 'element' }, (subject, minHeight) => {
  cy.wrap(subject).should(($el) => {
    const height = $el[0].getBoundingClientRect().height;
    expect(height).to.be.at.least(minHeight);
  });
});

Cypress.Commands.add('shouldBeVisibleInViewport', { prevSubject: 'element' }, (subject) => {
  cy.wrap(subject).should(($el) => {
    const rect = $el[0].getBoundingClientRect();
    const viewport = {
      width: Cypress.config('viewportWidth'),
      height: Cypress.config('viewportHeight')
    };
    
    expect(rect.top).to.be.at.least(0);
    expect(rect.left).to.be.at.least(0);
    expect(rect.bottom).to.be.at.most(viewport.height);
    expect(rect.right).to.be.at.most(viewport.width);
  });
});