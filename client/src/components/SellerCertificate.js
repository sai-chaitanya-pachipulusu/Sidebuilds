import React from 'react';
import './SellerCertificate.css';

/**
 * Certificate of sale for project sellers to show proof that they sold a project
 *
 * @param {Object} props
 * @param {Object} props.certificate - Certificate data
 * @param {boolean} props.isPrintable - If true, hides header/footer for printing
 */
const SellerCertificate = ({ certificate, isPrintable = false }) => {
  if (!certificate) {
    return <div className="certificate-error">Certificate data not available</div>;
  }

  const {
    certificate_id,
    project_name,
    seller_username,
    buyer_username,
    sale_amount,
    sale_date,
    verification_code
  } = certificate;

  const formattedDate = new Date(sale_date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const formattedAmount = parseFloat(sale_amount).toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD'
  });

  return (
    <div className={`seller-certificate ${isPrintable ? 'printable' : ''}`}>
      {!isPrintable && (
        <div className="certificate-actions">
          <button onClick={() => window.print()} className="print-button">
            Print Certificate
          </button>
        </div>
      )}
      
      <div className="certificate-content">
        <div className="certificate-header">
          <h1>Certificate of Sale</h1>
          <div className="certificate-logo">SideBuilds</div>
        </div>
        
        <div className="certificate-body">
          <p className="certificate-intro">
            This certifies that
          </p>
          
          <h2 className="seller-name">{seller_username}</h2>
          
          <p className="certificate-text">
            has successfully sold the project
          </p>
          
          <h3 className="project-name">{project_name}</h3>
          
          <p className="certificate-text">
            to {buyer_username} for {formattedAmount} on {formattedDate}
          </p>
          
          <div className="certificate-verification">
            <div className="verification-label">Verification Code</div>
            <div className="verification-code">{verification_code}</div>
            <div className="verification-note">
              Verify this certificate at <span className="verification-url">sidebuilds.space/verify</span>
            </div>
          </div>
        </div>
        
        <div className="certificate-footer">
          <div className="certificate-signature">
            <div className="signature-line"></div>
            <div className="signature-name">SideBuilds Platform</div>
          </div>
          
          <div className="certificate-seal">
            <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
              <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="2" />
              <path d="M50 5 L50 95 M5 50 L95 50" stroke="currentColor" strokeWidth="2" />
              <circle cx="50" cy="50" r="30" fill="none" stroke="currentColor" strokeWidth="2" />
            </svg>
          </div>
          
          <div className="certificate-id">
            ID: {certificate_id}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SellerCertificate; 