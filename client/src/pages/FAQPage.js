import React from 'react';
import './FAQPage.css';

function FAQPage() {
  const faqs = [
    {
      question: 'What is SideBuilds.space?',
      answer: 'SideBuilds.space is a marketplace for buying and selling side projects. Whether you have a project you want to sell or are looking for a new venture to take over, SideBuilds.space connects buyers and sellers.'
    },
    {
      question: 'How do I list my project for sale?',
      answer: 'To list your project, navigate to your dashboard, click on the project you wish to sell (or create a new one), and edit its details. You will find an option to "List for Sale". You will need to connect your Stripe account to receive payments.'
    },
    {
      question: 'How does the new \'Request to Purchase\' process work?',
      answer: 'Instead of an immediate \"Buy Now\", you first \"Request to Purchase\" a project. The seller then reviews your request and can accept or reject it. If accepted, you will be notified and can then proceed to make the payment through Stripe to secure the project. This ensures both parties are ready to proceed before a transaction occurs.'
    },
    {
      question: 'What happens after I request to purchase a project?',
      answer: 'The seller will be notified of your request. They can review it and choose to accept or reject it via their dashboard. You will be notified of their decision. Check your dashboard for updates on your purchase requests.'
    },
    {
      question: 'How long does a seller have to respond to my purchase request?',
      answer: 'We encourage sellers to respond promptly. Currently, there isn\'t a strict system-enforced deadline for sellers to respond. If you don\'t hear back within a reasonable time, you might consider reaching out to the seller if contact information is available, or exploring other projects.'
    },
    {
      question: 'What happens if a seller rejects my purchase request?',
      answer: 'You will be notified if a seller rejects your request. This means the seller has decided not to proceed with the sale to you at this time. You are free to explore other projects on the marketplace.'
    },
    {
      question: 'Once a seller accepts my request, how long do I have to make the payment?',
      answer: 'While there isn\'t a strict countdown timer enforced by the system, prompt payment is highly recommended to secure the project. If payment is significantly delayed, the seller might choose to cancel the accepted request (if this feature is available to them) or accept other offers.'
    },
    {
      question: 'What is the commission fee for selling a project?',
      answer: 'SideBuilds.space charges a platform commission of 5% on the final sale price of a project. This fee is automatically deducted during the Stripe payment process. For example, if a project sells for $100, the seller receives $95.'
    },
    {
      question: 'How do I receive payments for my sold projects?',
      answer: 'Sellers are required to connect their Stripe account. When a project is sold and the buyer makes a payment, the funds (minus the platform commission) are processed through Stripe and directed to your connected Stripe Express account. Payouts from Stripe to your bank account are then handled according to Stripe\'s payout schedule.'
    },
    {
      question: 'Is it secure to connect my Stripe account?',
      answer: 'Yes, it is very secure. SideBuilds.space uses Stripe Connect, which means your sensitive financial details are handled directly by Stripe, a PCI Level 1 certified payment processor. We do not store your bank account or full credit card details on our servers.'
    },
    {
      question: 'What happens after I pay for a project?',
      answer: 'After your payment is confirmed via Stripe, the project purchase request status changes to \"Payment Completed - Pending Transfer\". You and the seller will then use a dedicated Project Transfer Page (accessible from your dashboards) to manage the handover of assets like code, domain details, and documentation. The seller will update the status on this page as they provide the assets, and you will confirm receipt once everything is delivered as agreed.'
    },
    {
      question: 'How is the transfer of assets managed?',
      answer: 'Asset transfer is managed through the Project Transfer Page. The seller will provide updates, instructions, and links to assets (e.g., GitHub repository access, code archives, domain transfer codes) on this page. You should monitor this page and communicate with the seller (using provided contact details if necessary) to ensure a smooth handover.'
    },
    {
      question: 'When does the project ownership officially transfer to me?',
      answer: 'Official ownership of the project in our system (including the project appearing as \"Purchased\" under your full control in your dashboard) transfers to you only AFTER you click the \"Confirm Assets Received and Complete Purchase\" button on the ProjectTransferPage. This signifies you have received and verified the project assets from the seller.'
    },
    {
        question: 'What if there is an issue with a purchased project or during the transfer?',
        answer: 'Open communication is key. Use the Project Transfer Page for updates. If direct contact details are available, use them respectfully. If there are significant discrepancies or issues, refer to our Terms & Conditions and contact our support team if you cannot resolve it directly with the seller. Remember, the 7-day verification period post-confirmation is for addressing immediate, unforeseen issues with assets as received.'
    },
    {
        question: 'Can I get a refund?',
        answer: 'Refund policies are outlined in our Terms and Conditions. Generally, sales are final once payment is made, especially for digital goods where assets are transferred. Refunds are typically only considered in cases of significant misrepresentation by the seller that cannot be resolved, or failure to deliver assets. The new request-approve-pay-transfer process is designed to minimize such issues by ensuring commitment before payment and a clear transfer process.'
    }
  ];

  return (
    <div className="faq-page-container">
      <div className="faq-header">
        <h1>Frequently Asked Questions</h1>
        <p>Find answers to common questions about using SideBuilds.space.</p>
      </div>
      <div className="faq-list">
        {faqs.map((faq, index) => (
          <div key={index} className="faq-item">
            <h3>{faq.question}</h3>
            <p>{faq.answer}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default FAQPage;