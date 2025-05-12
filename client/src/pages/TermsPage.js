import React from 'react';
import './TermsPage.css';

function TermsPage() {
  return (
    <div className="terms-page-container">
      <div className="terms-header">
        <h1>Terms and Conditions</h1>
        <p>Last Updated: May 12, 2025</p>
      </div>
      <div className="terms-content">
        <section>
          <h2>1. Acceptance of Terms</h2>
          <p>
            By accessing or using SideBuilds.space (the "Platform"), you agree to be bound by these Terms and Conditions ("Terms") and our Privacy Policy. If you do not agree to all of these Terms, do not use this Platform.
          </p>
        </section>

        <section>
          <h2>2. Platform Services</h2>
          <p>
            SideBuilds.space provides a marketplace for users to list, discover, buy, and sell side projects ("Projects"). We facilitate connections between buyers and sellers but are not a party to any transaction between users.
          </p>
        </section>

        <section>
          <h2>3. User Accounts</h2>
          <p>
            To access certain features, you must register for an account. You agree to provide accurate, current, and complete information during registration and to update such information to keep it accurate. You are responsible for safeguarding your password and for all activities that occur under your account.
          </p>
        </section>

        <section>
          <h2>4. Project Listings and Sales</h2>
          <p>
            Sellers are responsible for the accuracy and legality of their Project listings. By listing a Project for sale, you represent that you have all necessary rights to sell the Project.
          </p>
          <p>
            Buyers agree to pay the listed price for Projects they purchase. All sales are processed through our third-party payment processor, Stripe.
          </p>
        </section>

        <section>
          <h2>5. Platform Commission</h2>
          <p>
            SideBuilds.space charges a commission fee of 5% on the final sale price of each Project sold through the Platform. This fee is automatically deducted from the sale proceeds before funds are transferred to the seller.
          </p>
        </section>
        
        <section>
          <h2>6. Stripe Connect for Sellers</h2>
          <p>
            Sellers must connect a valid Stripe account to list projects for sale and receive payouts. By connecting your Stripe account, you agree to Stripe's terms of service. SideBuilds.space is not responsible for any issues arising from your use of Stripe.
          </p>
        </section>

        <section>
          <h2>7. Project Transfers</h2>
          <p>
            Upon a successful sale, the seller is obligated to transfer all relevant Project assets to the buyer in a timely manner as described in the Project listing and our [Purchased Projects & Seller Certificates Guide](./purchased-projects-guide.md). Buyers have a verification period to ensure the Project matches the description.
          </p>
        </section>

        <section>
          <h2>8. User Conduct</h2>
          <p>
            You agree not to use the Platform for any unlawful purpose or in any way that could harm the Platform or its users. This includes, but is not limited to, posting misleading information, infringing on intellectual property rights, or engaging in fraudulent activities.
          </p>
        </section>

        <section>
          <h2>9. Intellectual Property</h2>
          <p>
            Sellers retain ownership of their Projects until a sale is completed. Buyers receive the rights to the Project as specified by the seller upon successful purchase. The Platform and its original content, features, and functionality are owned by SideBuilds.space and are protected by copyright and other intellectual property laws.
          </p>
        </section>

        <section>
          <h2>10. Disclaimers and Limitation of Liability</h2>
          <p>
            The Platform is provided "as is" without warranties of any kind. We do not guarantee the quality, safety, or legality of Projects listed. SideBuilds.space is not liable for any indirect, incidental, special, consequential, or punitive damages arising out of your use of the Platform.
          </p>
        </section>

        <section>
          <h2>11. Dispute Resolution</h2>
          <p>
            Disputes between buyers and sellers should first be attempted to be resolved directly. If a resolution cannot be reached, users may contact SideBuilds.space support for assistance, but we are not obligated to mediate disputes.
          </p>
        </section>

        <section>
          <h2>12. Modification of Terms</h2>
          <p>
            We reserve the right to modify these Terms at any time. We will notify users of any material changes. Your continued use of the Platform after such modifications constitutes your acceptance of the new Terms.
          </p>
        </section>

        <section>
          <h2>13. Governing Law</h2>
          <p>
            These Terms shall be governed by and construed in accordance with the laws of [Your Jurisdiction], without regard to its conflict of law provisions.
          </p>
        </section>

        <section>
          <h2>14. Contact Information</h2>
          <p>
            If you have any questions about these Terms, please contact us at support@sidebuilds.space.
          </p>
        </section>
      </div>
    </div>
  );
}

export default TermsPage;