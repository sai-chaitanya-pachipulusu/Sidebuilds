const testWorkflows = {
  
  // CRITICAL PATH 1: Complete Purchase Flow
  buyerWorkflow: {
    testAccounts: ['buyer1@test.com', 'buyer2@test.com'],
    steps: [
      '1. Login as buyer',
      '2. Navigate to marketplace',
      '3. Express interest in project',
      '4. Verify dashboard shows "Interest Expressed"',
      '5. Send message to seller',
      '6. Accept terms when proposed',
      '7. Complete Stripe payment (test card: 4242 4242 4242 4242)',
      '8. Confirm asset transfer receipt',
      '9. Verify project appears in "Purchased Projects"'
    ],
    criticalChecks: [
      'Toast notifications appear',
      'Status updates correctly',
      'Payment processes without errors',
      'Project ownership transfers'
    ]
  },

  // CRITICAL PATH 2: Complete Sales Flow  
  sellerWorkflow: {
    testAccounts: ['testuser', 'seller1@test.com', 'seller2@test.com'],
    steps: [
      '1. Login as seller',
      '2. Check "Offers Received" tab',
      '3. Review interest request',
      '4. Send message to buyer', 
      '5. Propose terms with asset list',
      '6. Wait for buyer payment',
      '7. Mark assets as transferred',
      '8. Verify sale completion and payment'
    ],
    criticalChecks: [
      'Interest notifications received',
      'Terms proposal works',
      'Asset transfer marking',
      'Revenue tracking accurate'
    ]
  },

  // CRITICAL PATH 3: Error & Edge Cases
  edgeCases: [
    'Withdraw interest at different stages',
    'Decline interest with reason',
    'Submit forms with missing fields',
    'Network interruption during payment',
    'Browser refresh during workflows'
  ]
};

console.log('🎯 TESTING PRIORITY:');
console.log('1. Buyer workflow (generates revenue)');
console.log('2. Seller workflow (drives supply)'); 
console.log('3. Edge cases (prevents support issues)'); 