const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Get all WhatsApp settings from DB
async function getWhatsAppSettings() {
  const keys = [
    'wa_provider', 'wa_instance_id', 'wa_api_token',
    'wa_sender_name', 'wa_enabled',
    'wa_template_expiring', 'wa_template_today', 'wa_template_overdue',
    'wa_alert_days_before', 'wa_auto_alerts',
    'wa_base_url',
  ];
  const settings = await prisma.setting.findMany({ where: { key: { in: keys } } });
  const map = {};
  for (const s of settings) map[s.key] = s.value;
  return map;
}

async function sendWhatsApp(phone, message) {
  const settings = await getWhatsAppSettings();

  if (settings.wa_enabled !== 'true') {
    console.log(`[WhatsApp] Disabled. To: ${phone}, Message: ${message}`);
    return { sent: false, reason: 'WhatsApp disabled' };
  }

  const provider = settings.wa_provider || 'greenapi';

  if (provider === 'greenapi') {
    return sendViaGreenAPI(phone, message, settings);
  } else if (provider === 'twilio') {
    return sendViaTwilio(phone, message);
  }

  return { sent: false, reason: 'Unknown provider' };
}

async function sendViaGreenAPI(phone, message, settings) {
  const instanceId = settings.wa_instance_id;
  const apiToken = settings.wa_api_token;
  const baseUrl = settings.wa_base_url || 'https://api.greenapi.com';

  if (!instanceId || !apiToken) {
    console.log(`[WhatsApp/GreenAPI] Missing credentials. To: ${phone}`);
    return { sent: false, reason: 'Missing Green API credentials' };
  }

  // Normalize phone: remove +, spaces, dashes
  let cleanPhone = phone.replace(/[\s\-\+\(\)]/g, '');
  // Add country code if missing (assume Israel)
  if (cleanPhone.startsWith('0')) cleanPhone = '972' + cleanPhone.slice(1);
  if (!cleanPhone.match(/^\d+$/)) {
    return { sent: false, reason: 'Invalid phone number' };
  }

  const chatId = cleanPhone + '@c.us';

  try {
    const url = `${baseUrl}/waInstance${instanceId}/sendMessage/${apiToken}`;
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chatId, message }),
    });
    const data = await resp.json();

    if (data.idMessage) {
      console.log(`[WhatsApp/GreenAPI] Sent to ${phone}: ${data.idMessage}`);
      return { sent: true, id: data.idMessage };
    } else {
      console.error(`[WhatsApp/GreenAPI] Failed:`, data);
      return { sent: false, reason: JSON.stringify(data) };
    }
  } catch (err) {
    console.error(`[WhatsApp/GreenAPI] Error:`, err.message);
    return { sent: false, reason: err.message };
  }
}

async function sendViaTwilio(phone, message) {
  const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_FROM } = process.env;

  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_WHATSAPP_FROM) {
    console.log(`[WhatsApp/Twilio] Skipped (no credentials). To: ${phone}`);
    return { sent: false, reason: 'missing Twilio credentials' };
  }

  try {
    const twilio = require('twilio')(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
    const result = await twilio.messages.create({
      body: message,
      from: `whatsapp:${TWILIO_WHATSAPP_FROM}`,
      to: `whatsapp:${phone}`,
    });
    console.log(`[WhatsApp/Twilio] Sent to ${phone}: ${result.sid}`);
    return { sent: true, sid: result.sid };
  } catch (err) {
    console.error(`[WhatsApp/Twilio] Failed to send to ${phone}:`, err.message);
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
    await sgMail.send({ to, from: SENDGRID_FROM_EMAIL, subject, html: body });
    console.log(`[Email] Sent to ${to}: ${subject}`);
    return { sent: true };
  } catch (err) {
    console.error(`[Email] Failed to send to ${to}:`, err.message);
    return { sent: false, reason: err.message };
  }
}

const RESPONSE_BASE_URL = 'https://rent.txlcomp.co.il';

function getResponseUrl(token) {
  return `${RESPONSE_BASE_URL}/r/${token}`;
}

module.exports = { sendWhatsApp, sendEmail, getWhatsAppSettings, getResponseUrl };
