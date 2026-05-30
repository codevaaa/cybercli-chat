import nodemailer from 'nodemailer'

const getTransporter = () => {
  const host = process.env.SMTP_HOST || 'smtp.gmail.com'
  const port = parseInt(process.env.SMTP_PORT || '587', 10)
  const user = process.env.SMTP_USER || 'cybermindcli@cybermindcli.com'
  const pass = process.env.SMTP_PASS

  if (!pass) {
    return null
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: {
      user,
      pass
    }
  })
}

/**
 * Sends a referral invitation email to a friend.
 * @param {string} inviterName 
 * @param {string} inviteeEmail 
 * @param {string} inviteCode 
 */
export const sendInviteEmail = async (inviterName, inviteeEmail, inviteCode) => {
  const senderEmail = process.env.SMTP_USER || 'cybermindcli@cybermindcli.com'
  const frontendUrl = process.env.FRONTEND_URL || 'https://cybermindcli.info'
  const inviteLink = `${frontendUrl}/auth/signup?invite=${inviteCode}`
  const transporter = getTransporter()

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>You're Invited to Codeva</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif; background-color: #0A0A0F; color: #ECECEC; margin: 0; padding: 40px 20px; }
          .container { max-width: 560px; margin: 0 auto; background-color: #14141A; border: 1px solid rgba(255, 255, 255, 0.06); border-radius: 16px; overflow: hidden; box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3); }
          .header { background: linear-gradient(135deg, #7C3AED, #5B21B6); padding: 32px; text-align: center; }
          .logo { font-size: 24px; font-weight: 700; color: #FFFFFF; letter-spacing: -0.5px; }
          .content { padding: 40px 32px; }
          h1 { color: #FFFFFF; font-size: 22px; font-weight: 600; margin-top: 0; margin-bottom: 16px; }
          p { font-size: 15px; color: #A0A0A0; line-height: 1.6; margin-top: 0; margin-bottom: 24px; }
          .btn-container { text-align: center; margin: 32px 0; }
          .btn { display: inline-block; padding: 14px 28px; background-color: #7C3AED; color: #FFFFFF !important; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px; text-align: center; box-shadow: 0 4px 12px rgba(124, 58, 237, 0.25); }
          .btn:hover { background-color: #6D28D9; }
          .code-box { text-align: center; margin: 24px 0; }
          .invite-code { display: inline-block; font-family: monospace; font-size: 20px; font-weight: bold; letter-spacing: 2px; padding: 10px 20px; background-color: #1A1A22; border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; color: #7C3AED; }
          .footer { background-color: #0E0E14; padding: 24px 32px; text-align: center; border-top: 1px solid rgba(255, 255, 255, 0.04); font-size: 12px; color: #707070; line-height: 1.5; }
          .divider { height: 1px; background-color: rgba(255,255,255,0.06); margin: 32px 0; }
          .link-text { font-size: 12px; color: #707070; word-break: break-all; }
          .link-text a { color: #7C3AED; text-decoration: none; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">Codeva</div>
          </div>
          <div class="content">
            <h1>You've been invited!</h1>
            <p>Hello,</p>
            <p>Your friend <strong>${inviterName}</strong> has invited you to join them on <strong>Codeva</strong> — the premium multi-model AI chat platform.</p>
            <p>Access 50+ free AI models (GPT-4o, Gemini 2.5, Llama 3, DeepSeek, and more) with features like Council Mode, interactive voice chat, and a local developer CLI daemon.</p>
            
            <div class="code-box">
              <div style="font-size: 11px; text-transform: uppercase; color: #707070; margin-bottom: 6px; font-weight: bold;">Your Invite Code</div>
              <span class="invite-code">${inviteCode}</span>
            </div>

            <div class="btn-container">
              <a href="${inviteLink}" class="btn" style="color: #ffffff;">Accept Invitation & Sign Up</a>
            </div>
            
            <div class="divider"></div>
            
            <p class="link-text">If the button doesn't work, copy and paste this URL into your browser:<br>
              <a href="${inviteLink}">${inviteLink}</a>
            </p>
          </div>
          <div class="footer">
            &copy; 2026 Codeva. All rights reserved.<br>
            This invitation was sent on behalf of ${inviterName}.
          </div>
        </div>
      </body>
    </html>
  `

  if (!transporter) {
    console.log(`[MOCK EMAIL] Sending referral invite from ${inviterName} to ${inviteeEmail} with code: ${inviteCode}`)
    return { success: true, mock: true }
  }

  try {
    await transporter.sendMail({
      from: `"${inviterName} via Codeva" <${senderEmail}>`,
      to: inviteeEmail,
      subject: `${inviterName} invited you to join Codeva`,
      text: `Hello,\n\n${inviterName} has invited you to join Codeva.\n\nAccess 50+ free AI models. Sign up here:\n${inviteLink}\n\nYour Invite Code: ${inviteCode}`,
      html: htmlContent
    })
    return { success: true }
  } catch (error) {
    console.error('Failed to send invite email via SMTP:', error)
    throw error
  }
}
