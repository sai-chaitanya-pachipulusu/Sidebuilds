describe('Marketplace Workflow E2E Tests', () => {
  beforeEach(() => {
    cy.task('db:seed');
    cy.clearCookies();
    cy.clearLocalStorage();
  });

  describe('Buyer Workflow', () => {
    it('should complete full purchase flow', () => {
      // Login as buyer
      cy.login('buyer1@test.com', 'password123');
      
      // Browse marketplace
      cy.visit('/marketplace');
      cy.get('[data-cy=project-card]').should('have.length.greaterThan', 0);
      
      // Apply filters
      cy.get('[data-cy=price-filter]').select('$1000-$5000');
      cy.get('[data-cy=tech-filter]').click();
      cy.get('[data-cy=tech-react]').check();
      cy.get('[data-cy=apply-filters]').click();
      
      // Express interest
      cy.get('[data-cy=project-card]').first().click();
      cy.get('[data-cy=show-interest-btn]').click();
      
      // Fill interest form
      cy.get('[data-cy=interest-modal]').within(() => {
        cy.get('[data-cy=commitment-1]').check();
        cy.get('[data-cy=commitment-2]').check();
        cy.get('[data-cy=commitment-3]').check();
        cy.get('[data-cy=intro-message]').type('I am very interested in this project...');
        cy.get('[data-cy=submit-interest]').click();
      });
      
      // Verify success
      cy.get('[data-cy=toast-success]').should('contain', 'Interest submitted successfully');
      cy.get('[data-cy=show-interest-btn]').should('be.disabled');
      
      // Check dashboard
      cy.visit('/dashboard?tab=purchases');
      cy.get('[data-cy=purchase-request]').first().should('contain', 'Interest Expressed');
    });

    it('should handle payment flow correctly', () => {
      cy.login('buyer1@test.com', 'password123');
      cy.visit('/dashboard?tab=purchases');
      
      // Find request with accepted terms
      cy.get('[data-cy=purchase-request]')
        .contains('Terms Accepted')
        .parent()
        .find('[data-cy=proceed-payment]')
        .click();
      
      // Stripe checkout
      cy.origin('https://checkout.stripe.com', () => {
        cy.get('#cardNumber').type('4242424242424242');
        cy.get('#cardExpiry').type('1225');
        cy.get('#cardCvc').type('123');
        cy.get('#billingName').type('Test Buyer');
        cy.get('[data-testid=hosted-payment-submit-button]').click();
      });
      
      // Verify redirect and status update
      cy.url().should('include', '/purchase/success');
      cy.get('[data-cy=success-message]').should('be.visible');
    });
  });

  describe('Security Tests', () => {
    it('should prevent unauthorized access', () => {
      cy.request({
        method: 'GET',
        url: '/api/purchase-requests/12345',
        failOnStatusCode: false
      }).then((response) => {
        expect(response.status).to.eq(401);
      });
    });

    it('should enforce rate limiting', () => {
      const requests = Array(6).fill(null).map(() => 
        cy.request({
          method: 'POST',
          url: '/api/auth/login',
          body: { email: 'test@test.com', password: 'wrong' },
          failOnStatusCode: false
        })
      );
      
      cy.wrap(Promise.all(requests)).then((responses) => {
        const rateLimited = responses.some(r => r.status === 429);
        expect(rateLimited).to.be.true;
      });
    });
  });
}); 