const nodemailer = require('nodemailer');

const requiredSmtpVars = ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASS'];

const getEmailStatus = () => {
  const missing = requiredSmtpVars.filter((key) => !process.env[key]);
  const configured = missing.length === 0;

  return {
    provider: 'smtp',
    configured,
    missing,
    from: process.env.SMTP_FROM || 'SideBuilds <noreply@sidebuilds.online>',
    host: process.env.SMTP_HOST || null,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === 'true',
    mode: process.env.NODE_ENV === 'production' ? 'production' : 'development'
  };
};

// Create a transporter based on environment
const createTransporter = () => {
  const status = getEmailStatus();

  if (process.env.NODE_ENV === 'production' && !status.configured) {
    return {
      sendMail: async () => {
        throw new Error(`SMTP is not configured. Missing: ${status.missing.join(', ')}`);
      },
      verify: async () => {
        throw new Error(`SMTP is not configured. Missing: ${status.missing.join(', ')}`);
      }
    };
  }

  if (status.configured) {
    // Production configuration
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: status.port,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  } else {
    // Development configuration - log to console
    return {
      sendMail: async (mailOptions) => {
        console.log('[DEV EMAIL] Would send email:');
        console.log('To:', mailOptions.to);
        console.log('Subject:', mailOptions.subject);
        console.log('Text:', mailOptions.text);
        if (mailOptions.html) {
          console.log('HTML preview available');
        }
        return { messageId: 'dev-' + Date.now() };
      }
    };
  }
};

const transporter = createTransporter();

// Email templates
const emailTemplates = {
  // When a buyer expresses interest
  newInterest: (data) => ({
    subject: `New Interest in Your Project: ${data.projectName}`,
    text: `Hi ${data.sellerName},\n\nGreat news! ${data.buyerName} has expressed interest in purchasing your project "${data.projectName}".\n\nTheir message:\n"${data.introMessage}"\n\nLog in to your dashboard to view the details and respond.\n\nBest regards,\nSideBuilds Team`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #6366f1;">New Interest in Your Project!</h2>
        <p>Hi ${data.sellerName},</p>
        <p>Great news! <strong>${data.buyerName}</strong> has expressed interest in purchasing your project <strong>"${data.projectName}"</strong>.</p>
        <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Their message:</strong></p>
          <p style="font-style: italic;">"${data.introMessage}"</p>
        </div>
        <p>
          <a href="${process.env.CLIENT_URL}/dashboard?tab=offers" style="display: inline-block; background: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">View in Dashboard</a>
        </p>
        <p style="color: #6b7280; font-size: 14px;">Best regards,<br>SideBuilds Team</p>
      </div>
    `
  }),

  // When seller proposes terms
  termsProposed: (data) => ({
    subject: `Terms Proposed for ${data.projectName}`,
    text: `Hi ${data.buyerName},\n\n${data.sellerName} has proposed terms for the sale of "${data.projectName}".\n\nProposed price: ${data.price}\n\nLog in to review the terms and proceed.\n\nBest regards,\nSideBuilds Team`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #6366f1;">Terms Proposed!</h2>
        <p>Hi ${data.buyerName},</p>
        <p><strong>${data.sellerName}</strong> has proposed terms for the sale of <strong>"${data.projectName}"</strong>.</p>
        <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Proposed Price:</strong> ${data.price}</p>
          <p><strong>Included Assets:</strong></p>
          <ul>
            ${data.assets.map(asset => `<li>${asset}</li>`).join('')}
          </ul>
        </div>
        <p>
          <a href="${process.env.CLIENT_URL}/dashboard?tab=purchases" style="display: inline-block; background: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Review Terms</a>
        </p>
        <p style="color: #6b7280; font-size: 14px;">Best regards,<br>SideBuilds Team</p>
      </div>
    `
  }),

  // When payment is successful
  paymentSuccess: (data) => ({
    subject: `Payment Received for ${data.projectName}`,
    text: `Hi ${data.sellerName},\n\nGood news! Payment has been received for "${data.projectName}".\n\nAmount: ${data.amount}\n\nPlease proceed with transferring the project assets to the buyer.\n\nBest regards,\nSideBuilds Team`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #10b981;">Payment Received!</h2>
        <p>Hi ${data.sellerName},</p>
        <p>Good news! Payment has been successfully received for <strong>"${data.projectName}"</strong>.</p>
        <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Amount Received:</strong> ${data.amount}</p>
          <p><strong>Buyer:</strong> ${data.buyerName}</p>
          <p><strong>Next Step:</strong> Transfer the agreed project assets</p>
        </div>
        <p>
          <a href="${process.env.CLIENT_URL}/dashboard?tab=offers" style="display: inline-block; background: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">View in Dashboard</a>
        </p>
        <p style="color: #6b7280; font-size: 14px;">Best regards,<br>SideBuilds Team</p>
      </div>
    `
  }),

  // When buyer confirms transfer
  transferConfirmed: (data) => ({
    subject: `Sale Completed for ${data.projectName}!`,
    text: `Hi ${data.sellerName},\n\nCongratulations! The sale of "${data.projectName}" has been completed.\n\nThe buyer has confirmed receipt of all assets. Your payout will be processed according to Stripe's schedule.\n\nThank you for using SideBuilds!\n\nBest regards,\nSideBuilds Team`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #10b981;">🎉 Sale Completed!</h2>
        <p>Hi ${data.sellerName},</p>
        <p>Congratulations! The sale of <strong>"${data.projectName}"</strong> has been successfully completed.</p>
        <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p>✅ Buyer confirmed receipt of assets</p>
          <p>✅ Transaction marked as complete</p>
          <p>💰 Your payout will be processed according to Stripe's schedule</p>
        </div>
        <p>Thank you for using SideBuilds!</p>
        <p style="color: #6b7280; font-size: 14px;">Best regards,<br>SideBuilds Team</p>
      </div>
    `
  }),

  // New message notification
  newMessage: (data) => ({
    subject: `New message regarding ${data.projectName}`,
    text: `Hi ${data.recipientName},\n\nYou have a new message from ${data.senderName} regarding "${data.projectName}".\n\nMessage: "${data.messagePreview}"\n\nLog in to view and respond.\n\nBest regards,\nSideBuilds Team`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #6366f1;">New Message</h2>
        <p>Hi ${data.recipientName},</p>
        <p>You have a new message from <strong>${data.senderName}</strong> regarding <strong>"${data.projectName}"</strong>.</p>
        <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p style="font-style: italic;">"${data.messagePreview}"</p>
        </div>
        <p>
          <a href="${process.env.CLIENT_URL}/dashboard?tab=messages&requestId=${data.requestId}" style="display: inline-block; background: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">View Conversation</a>
        </p>
        <p style="color: #6b7280; font-size: 14px;">Best regards,<br>SideBuilds Team</p>
      </div>
    `
  })
};

// Main email sending function
const sendEmail = async (to, templateName, data) => {
  try {
    const template = emailTemplates[templateName];
    if (!template) {
      throw new Error(`Email template '${templateName}' not found`);
    }

    const mailOptions = {
      from: process.env.SMTP_FROM || 'SideBuilds <noreply@sidebuilds.online>',
      to,
      ...template(data)
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`Email sent successfully: ${templateName} to ${to}`);
    return info;
  } catch (error) {
    console.error(`Failed to send email: ${templateName} to ${to}`, error);
    throw error;
  }
};

// Notification functions
const emailService = {
  // Send new interest notification to seller
  notifyNewInterest: async (sellerEmail, data) => {
    return sendEmail(sellerEmail, 'newInterest', data);
  },

  // Send terms proposed notification to buyer
  notifyTermsProposed: async (buyerEmail, data) => {
    return sendEmail(buyerEmail, 'termsProposed', data);
  },

  // Send payment success notification to seller
  notifyPaymentSuccess: async (sellerEmail, data) => {
    return sendEmail(sellerEmail, 'paymentSuccess', data);
  },

  // Send transfer confirmed notification to seller
  notifyTransferConfirmed: async (sellerEmail, data) => {
    return sendEmail(sellerEmail, 'transferConfirmed', data);
  },

  // Send new message notification
  notifyNewMessage: async (recipientEmail, data) => {
    return sendEmail(recipientEmail, 'newMessage', data);
  },

  // Generic send function for custom emails
  sendCustomEmail: async (to, subject, text, html) => {
    const mailOptions = {
      from: process.env.SMTP_FROM || 'SideBuilds <noreply@sidebuilds.online>',
      to,
      subject,
      text,
      html
    };
    return transporter.sendMail(mailOptions);
  },

  getEmailStatus,

  verifyConnection: async () => {
    await transporter.verify();
    return getEmailStatus();
  }
};

module.exports = emailService; 