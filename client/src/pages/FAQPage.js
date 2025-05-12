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
      question: 'What is the commission fee for selling a project?',
      answer: 'SideBuilds.space charges a platform commission of 5% on the final sale price of a project. This means if you sell your project for $100, you will receive $95, and the platform retains $5.'
    },
    {
      question: 'How do I receive payments for my sold projects?',
      answer: 'Sellers are required to connect their Stripe account. When a project is sold, the payment (minus the platform commission) is transferred directly to your connected Stripe account. Payouts from Stripe to your bank account are then handled according to Stripe\'s payout schedule.'
    },
    {
      question: 'Is it secure to connect my Stripe account?',
      answer: 'Yes, it is very secure. SideBuilds.space uses Stripe Connect, which means your sensitive financial details are handled directly by Stripe, a PCI Level 1 certified payment processor. We do not store your bank account or full credit card details on our servers.'
    },
    {
      question: 'What happens after I purchase a project?',
      answer: 'Once your payment is confirmed, the project ownership will be transferred to your account. You will gain access to the project\'s assets as described by the seller (e.g., codebase, domain, social media accounts). The seller is expected to facilitate this transfer. The project will also be removed from public marketplace listings.'
    },
    {
        question: 'What if there is an issue with a purchased project?',
        answer: 'We encourage buyers and sellers to communicate directly to resolve any issues. If a dispute arises, please contact our support team. We also recommend reviewing the project details and asking the seller questions before making a purchase.'
    },
    {
        question: 'Can I get a refund?',
        answer: 'Refund policies may vary depending on the nature of the project and the agreement between the buyer and seller. Please review our Terms and Conditions for more details on disputes and refunds. Generally, all sales are final unless the project was significantly misrepresented.'
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