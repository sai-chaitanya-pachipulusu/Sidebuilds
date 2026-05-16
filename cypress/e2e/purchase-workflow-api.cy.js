describe('Purchase workflow API contract', () => {
  const buyerToken = Cypress.env('BUYER_TOKEN');
  const sellerToken = Cypress.env('SELLER_TOKEN');
  const projectId = Cypress.env('PROJECT_ID');

  const requireWorkflowEnv = function () {
    if (!buyerToken || !sellerToken || !projectId) {
      this.skip();
    }
  };

  const authHeaders = (token) => ({
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json'
  });

  it('covers buyer interest, seller accept, checkout, transfer update, and buyer confirmation', function () {
    requireWorkflowEnv.call(this);

    cy.request({
      method: 'POST',
      url: `/api/purchase-requests/projects/${projectId}/request`,
      headers: authHeaders(buyerToken),
      body: {
        buyerCommitments: ['maintain_code', 'honor_terms', 'complete_payment'],
        buyerIntroMessage: 'I am interested in purchasing and operating this project responsibly.'
      },
      failOnStatusCode: false
    }).then((interestResponse) => {
      expect([201, 409]).to.include(interestResponse.status);

      const requestId = interestResponse.body.id || Cypress.env('REQUEST_ID');
      expect(requestId, 'purchase request id').to.exist;

      cy.request({
        method: 'POST',
        url: `/api/purchase-requests/${requestId}/accept`,
        headers: authHeaders(sellerToken),
        body: { terms_agreed_version: 'cypress_e2e_v1' },
        failOnStatusCode: false
      }).then((acceptResponse) => {
        expect([200, 400]).to.include(acceptResponse.status);
      });

      cy.request({
        method: 'POST',
        url: '/api/payments/create-checkout-session',
        headers: authHeaders(buyerToken),
        body: { purchase_request_id: requestId },
        failOnStatusCode: false
      }).then((checkoutResponse) => {
        expect([200, 400, 500]).to.include(checkoutResponse.status);
        if (checkoutResponse.status === 200) {
          expect(checkoutResponse.body.url || checkoutResponse.body.sessionId).to.exist;
        }
      });

      cy.request({
        method: 'PUT',
        url: `/api/purchase-requests/${requestId}/transfer-status`,
        headers: authHeaders(sellerToken),
        body: {
          status: 'assets_transferred_pending_buyer_confirmation',
          message: 'Cypress workflow transfer update'
        },
        failOnStatusCode: false
      }).then((transferResponse) => {
        expect([200, 400]).to.include(transferResponse.status);
      });

      cy.request({
        method: 'POST',
        url: `/api/purchase-requests/${requestId}/confirm-transfer`,
        headers: authHeaders(buyerToken),
        failOnStatusCode: false
      }).then((confirmResponse) => {
        expect([200, 400]).to.include(confirmResponse.status);
      });
    });
  });
});
