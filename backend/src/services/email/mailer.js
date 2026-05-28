import nodemailer from 'nodemailer'

// Create Transporter
const getTransporter = () => {
  const host = process.env.SMTP_HOST || 'smtp.gmail.com'
  const port = parseInt(process.env.SMTP_PORT || '587', 10)
  const user = process.env.SMTP_USER || 'cybermindcli@cybermindcli.com'
  const pass = process.env.SMTP_PASS

  if (!pass) {
    console.warn('WARNING: SMTP_PASS is not configured. Email services will run in mock mode.')
    return null
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465, // true for 465, false for other ports
    auth: {
      user,
      pass
    }
  })
}

/**
 * Sends a notification to the administrator and an auto-reply to the user.
 * @param {string} name 
 * @param {string} email 
 * @param {string} subject 
 * @param {string} message 
 */
export const sendContactNotification = async (name, email, subject, message) => {
  const adminEmail = process.env.CONTACT_EMAIL || 'cybermindcli@cybermindcli.com'
  const senderEmail = process.env.SMTP_USER || 'cybermindcli@cybermindcli.com'
  const transporter = getTransporter()

  // 1. Admin Alert HTML
  const adminHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background-color: #0A0A0F; color: #ECECEC; margin: 0; padding: 40px 20px; }
          .container { max-width: 600px; margin: 0 auto; background-color: #14141A; border: 1px solid rgba(255, 255, 255, 0.06); border-radius: 16px; overflow: hidden; }
          .header { background: linear-gradient(135deg, #7C3AED, #5B21B6); padding: 30px; text-align: center; }
          .logo { font-size: 24px; font-weight: bold; color: #FFFFFF; letter-spacing: -0.5px; }
          .content { padding: 40px 30px; }
          h2 { color: #FFFFFF; font-size: 20px; margin-top: 0; font-weight: 600; }
          .field { margin-bottom: 24px; }
          .label { font-size: 11px; font-weight: bold; text-transform: uppercase; tracking-spacing: 1px; color: #7C3AED; margin-bottom: 6px; }
          .value { font-size: 15px; color: #ECECEC; line-height: 1.5; }
          .message-box { background-color: #1A1A22; border-radius: 8px; padding: 20px; border: 1px solid rgba(255, 255, 255, 0.04); font-style: italic; color: #A0A0A0; }
          .footer { background-color: #0E0E14; padding: 20px 30px; text-align: center; border-t: 1px solid rgba(255, 255, 255, 0.04); font-size: 12px; color: #707070; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">CyberMindCLI Admin Console</div>
          </div>
          <div class="content">
            <h2>New Contact Form Submission</h2>
            
            <div class="field">
              <div class="label">From</div>
              <div class="value"><strong>${name}</strong> (${email})</div>
            </div>
            
            <div class="field">
              <div class="label">Subject</div>
              <div class="value">${subject}</div>
            </div>
            
            <div class="field">
              <div class="label">Message</div>
              <div class="message-box">${message.replace(/\n/g, '<br>')}</div>
            </div>
          </div>
          <div class="footer">
            CyberMindCLI Audit Gateway Node &bull; Secured with TLS 1.3
          </div>
        </div>
      </body>
    </html>
  `

  // 2. User Auto-Reply HTML
  const userHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background-color: #0A0A0F; color: #ECECEC; margin: 0; padding: 40px 20px; }
          .container { max-width: 600px; margin: 0 auto; background-color: #14141A; border: 1px solid rgba(255, 255, 255, 0.06); border-radius: 16px; overflow: hidden; }
          .header { background: linear-gradient(135deg, #7C3AED, #5B21B6); padding: 30px; text-align: center; }
          .logo { font-size: 24px; font-weight: bold; color: #FFFFFF; letter-spacing: -0.5px; }
          .content { padding: 40px 30px; }
          h2 { color: #FFFFFF; font-size: 20px; margin-top: 0; font-weight: 600; }
          p { font-size: 15px; color: #A0A0A0; line-height: 1.6; margin-bottom: 24px; }
          .btn { display: inline-block; padding: 12px 24px; background-color: #7C3AED; color: #FFFFFF; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px; text-align: center; transition: background-color 0.2s; }
          .btn:hover { background-color: #6D28D9; }
          .footer { background-color: #0E0E14; padding: 20px 30px; text-align: center; border-t: 1px solid rgba(255, 255, 255, 0.04); font-size: 12px; color: #707070; }
          .divider { height: 1px; background-color: rgba(255,255,255,0.06); margin: 30px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">CyberMindCLI</div>
          </div>
          <div class="content">
            <h2>We have received your request</h2>
            <p>Hello ${name},</p>
            <p>Thank you for getting in touch with CyberMindCLI. This email confirms that we have successfully received your message regarding "<strong>${subject}</strong>".</p>
            <p>Our technical support and operations team is reviewing your query and will reply to you at this address within 24 hours.</p>
            
            <div class="divider"></div>
            
            <p>In the meantime, you can explore our documentation to see if your answer is already resolved.</p>
            <a href="https://cybermindcli.info/docs" class="btn" style="color: #ffffff;">Browse Documentation</a>
          </div>
          <div class="footer">
            &copy; 2026 CyberMindCLI. All rights reserved. &bull; cybermindcli@cybermindcli.com
          </div>
        </div>
      </body>
    </html>
  `

  if (!transporter) {
    console.log(`[MOCK EMAIL] Sending contact notification for ${name} to ${adminEmail}`)
    console.log(`[MOCK EMAIL] Sending confirmation auto-reply to ${email}`)
    return { success: true, mock: true }
  }

  try {
    // Send admin notification
    await transporter.sendMail({
      from: `"CyberMindCLI Contact Portal" <${senderEmail}>`,
      to: adminEmail,
      subject: `[Contact Form] ${subject} - From ${name}`,
      text: `New contact form submission:\n\nName: ${name}\nEmail: ${email}\nSubject: ${subject}\nMessage: ${message}`,
      html: adminHtml
    })

    // Send user confirmation
    await transporter.sendMail({
      from: `"CyberMindCLI Support" <${senderEmail}>`,
      to: email,
      subject: `We received your request: ${subject}`,
      text: `Hello ${name},\n\nThank you for getting in touch. We have received your message regarding "${subject}" and will respond within 24 hours.\n\nBest regards,\nCyberMindCLI Team`,
      html: userHtml
    })

    return { success: true }
  } catch (error) {
    console.error('Failed to send emails via SMTP:', error)
    throw error
  }
}
