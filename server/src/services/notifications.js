async function sendWhatsApp(phone, message) {
  const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_FROM } = process.env;

  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_WHATSAPP_FROM) {
    console.log(`[WhatsApp] Skipped (no credentials). To: ${phone}, Message: ${message}`);
    return { sent: false, reason: 'missing credentials' };
  }

  try {
    const twilio = require('twilio')(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
    const result = await twilio.messages.create({
      body: message,
      from: `whatsapp:${TWILIO_WHATSAPP_FROM}`,
      to: `whatsapp:${phone}`,
    });
    console.log(`[WhatsApp] Sent to ${phone}: ${result.sid}`);
    return { sent: true, sid: result.sid };
  } catch (err) {
    console.error(`[WhatsApp] Failed to send to ${phone}:`, err.message);
    return { sent: false, reason: err.message };
  }
}

async function sendEmail(to, subject, body) {
  const { SENDGRID_API_KEY, SENDGRID_FROM_EMAIL } = process.env;

  if (!SENDGRID_API_KEY || !SENDGRID_FROM_EMAIL) {
    console.log(`[Email] Skipped (no credentials). To: ${to}, Subject: ${subject}`);
    return { sent: false, reason: 'missing credentials' };
  }

  try {
    const sgMail = require('@sendgrid/mail');
    sgMail.setApiKey(SENDGRID_API_KEY);
    await sgMail.send({
      to,
      from: SENDGRID_FROM_EMAIL,
      subject,
      html: body,
    });
    console.log(`[Email] Sent to ${to}: ${subject}`);
    return { sent: true };
  } catch (err) {
    console.error(`[Email] Failed to send to ${to}:`, err.message);
    return { sent: false, reason: err.message };
  }
}

module.exports = { sendWhatsApp, sendEmail };
