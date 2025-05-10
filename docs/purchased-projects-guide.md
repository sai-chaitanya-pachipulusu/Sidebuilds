# Purchased Projects & Seller Certificates Guide

This document describes how the SideBuilds platform handles purchased projects, seller certificates, and the transfer process.

## Overview

The platform now includes the following features:

1. **Project Source Tracking**: Projects now have a `source` field that indicates whether a project was created by the owner or purchased from another user.
2. **Visual Distinction**: Built vs. bought projects are visually distinguished in project listings with clear badges.
3. **Seller Certificates**: When a project is sold, a digital certificate is generated for the seller as proof of the transaction.
4. **Certificate Verification**: Anyone can verify the authenticity of a seller certificate using its verification code.

## Implementation Status

These features have been fully implemented in the platform:

- Database schema changes ✅ 
- Backend API endpoints ✅
- Frontend components and pages ✅
- Certificate generation ✅
- Verification system ✅

## Database Schema Changes

The following changes were made to the database schema:

### Projects Table

New fields added to track project source and ownership history:

- `source`: VARCHAR(20) DEFAULT 'created' - Indicates if a project was created by the user or purchased
- `previous_owner_id`: UUID - Reference to the previous owner (for purchased projects)
- `purchased_at`: TIMESTAMP - When the project was purchased
- `transfer_date`: TIMESTAMP - When ownership was transferred

### Project Transfers Table

Added certificate-related fields:

- `certificate_id`: UUID - Unique identifier for the certificate
- `certificate_generated`: BOOLEAN - Flag indicating if a certificate was generated
- `certificate_url`: TEXT - URL to the certificate (if externally hosted)
- `certificate_generated_at`: TIMESTAMP - When the certificate was generated

### New Table: Seller Certificates

A new table to store and manage seller certificates:

- `certificate_id`: UUID (PK) - Unique certificate identifier
- `seller_id`: UUID - Reference to the seller
- `project_id`: UUID - Reference to the project that was sold
- `transaction_id`: UUID - Reference to the transaction
- `buyer_id`: UUID - Reference to the buyer
- `sale_amount`: DECIMAL - Amount the project sold for
- `sale_date`: TIMESTAMP - Date of the sale
- `certificate_url`: TEXT - URL to the certificate (if externally hosted)
- `verification_code`: VARCHAR(50) - Unique code for certificate verification
- `verified_at`: TIMESTAMP - When the certificate was last verified
- `created_at`: TIMESTAMP - When the certificate was created

## User Interface

### Project Listings

Projects are now displayed with source badges:

- **Created** (Green): Projects created by the user
- **Purchased** (Purple): Projects purchased from another user

### Certificate View

Sellers can view and share certificates for projects they've sold. Each certificate includes:

- Project name
- Seller and buyer usernames
- Sale amount
- Sale date
- Unique verification code
- Digital seal

### Certificate Verification

Anyone can verify a certificate by:

1. Visiting `/verify` 
2. Entering the verification code
3. Viewing the certificate details if valid

## Technical Implementation

### API Endpoints

New endpoints for certificate management:

- `GET /api/certificates/:certificateId` - Fetch a specific certificate (protected, seller only)
- `GET /api/certificates/verify/:verificationCode` - Verify a certificate (public)
- `GET /api/certificates/seller/:userId` - Get all certificates for a seller (protected)

### Frontend Components

New components created:

- `SourceBadge` - Visual indicator for project source
- `SellerCertificate` - Certificate display component
- `CertificatePage` - Page for viewing a specific certificate
- `VerifyPage` - Page for verifying certificates

## Usage Examples

### Viewing Purchased Projects

In the dashboard, projects are now displayed with a "Source" column indicating whether they are created or purchased. The source badge will show:
- Green "Created" badge for projects you built yourself
- Purple "Purchased" badge for projects you bought from another user

### Accessing Certificates

After selling a project, sellers can access their certificates from:
- The transaction history page
- The "Certificates" section of their profile
- Direct links sent in email notifications (if configured)

Each certificate has a unique verification code that can be shared with potential buyers as proof of successful transactions.

### Verifying a Certificate

To verify a certificate:
1. Go to `https://sidebuilds.space/verify`
2. Enter the verification code
3. View the certificate details and verification status

Verification is a public process that doesn't require authentication, making it easy for anyone to validate a certificate's authenticity.

## Security Considerations

- Certificate verification codes are randomly generated using a cryptographically secure process
- Only sellers can access their own certificates
- Verification attempts are logged
- Certificates cannot be modified after creation

## Future Enhancements

Potential enhancements for future versions:

- PDF export for certificates
- Blockchain-based certificate verification
- Integration with social media for sharing achievements
- Analytics dashboard for sellers with certificate metrics

## Project Transfer Process

When a project is purchased, a semi-automated transfer process begins to ensure smooth handover of all project assets from seller to buyer.

### Transfer Process Overview

1. **Immediate Ownership Update**: When a purchase is completed, the project ownership is immediately updated in the database and appears in the buyer's dashboard marked as "Purchased".

2. **Semi-Manual Transfer Coordination**: The actual transfer of code, domain, and other assets follows a coordinated process between buyer and seller, facilitated by the platform.

3. **Transfer Status Tracking**: Both buyer and seller can track the status of transfers in their dashboards, with clear indicators for what has been transferred and what is pending.

### Asset Transfer Details

#### Code Transfer

The code transfer process typically includes:

- **GitHub Repository Transfer**: If the project is on GitHub, the seller transfers repository ownership to the buyer.
- **Private Repository Access**: The seller adds the buyer as a collaborator to any private repositories.
- **Code Archive Download**: For projects not on GitHub, the seller provides a full archive of the codebase.
- **Deployment Instructions**: Documentation on how to deploy and run the project.

#### Domain Transfer

Domain transfers follow standard domain registrar processes:

1. Seller initiates the domain transfer from their registrar account.
2. Seller provides the authorization/EPP code to the buyer.
3. Buyer initiates the transfer at their chosen registrar.
4. Both parties confirm the transfer through their respective registrars.
5. DNS settings are configured by the buyer to point to their hosting.

#### Additional Assets

Other assets that may be transferred include:

- Design files (Figma, Sketch, PSD, etc.)
- Documentation and user guides
- Configuration files and credentials
- Third-party service accounts (when applicable)
- Analytics and SEO data

### Verification Period

After all assets are transferred:

1. The buyer has a 7-day verification period to test the project and ensure everything works as advertised.
2. During this period, the seller should be available to provide basic support and answer questions.
3. If significant issues are found that don't match the project description, the buyer may be eligible for a refund.

### Transfer Timeline

Typical timelines for the transfer process:

- **Initial Contact**: Within 24 hours of purchase
- **Code Transfer**: 1-3 days
- **Domain Transfer**: 5-7 days (depends on registrar policies)
- **Additional Assets**: 1-2 days
- **Verification Period**: 7 days after all transfers complete

### Best Practices for Buyers

- Keep all communication with the seller documented through the platform.
- Create a checklist of all expected assets before the transfer begins.
- Test the project functionality as soon as transfers are complete.
- Follow provided documentation to set up the project correctly.
- Ask questions if anything is unclear during the transfer process.

### Best Practices for Sellers

- Prepare all project assets before listing the project for sale.
- Respond promptly to buyer inquiries after purchase.
- Provide clear instructions for each transfer step.
- Create thorough documentation about the project setup and features.
- Be available during the verification period to provide support.

## Related Documentation

- [Deployment Guide](./deployment-guide.md)
- [Stripe Integration Guide](./stripe-integration-guide.md) 