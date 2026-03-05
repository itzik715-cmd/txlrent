const express = require('express');
const crypto = require('crypto');
const { PrismaClient } = require('@prisma/client');
const { sendWhatsApp, sendEmail, getWhatsAppSettings, getResponseUrl } = require('../services/notifications');

const router = express.Router();
const prisma = new PrismaClient();

// POST /api/whatsapp/test — test connection
router.post('/test', async (req, res, next) => {
  try {
    const settings = await getWhatsAppSettings();
    if (settings.wa_enabled !== 'true') {
      return res.json({ success: false, error: 'WhatsApp לא מופעל' });
    }

    const instanceId = settings.wa_instance_id;
    const apiToken = settings.wa_api_token;
    const baseUrl = settings.wa_base_url || 'https://api.greenapi.com';

    if (!instanceId || !apiToken) {
      return res.json({ success: false, error: 'חסרים פרטי חיבור' });
    }

    // Check account status
    const url = `${baseUrl}/waInstance${instanceId}/getStateInstance/${apiToken}`;
    const resp = await fetch(url);
    const data = await resp.json();

    res.json({
      success: data.stateInstance === 'authorized',
      state: data.stateInstance,
      details: data,
    });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// POST /api/whatsapp/send-test — send a test message
router.post('/send-test', async (req, res, next) => {
  try {
    const { phone, message } = req.body;
    if (!phone) return res.status(400).json({ error: 'חסר מספר טלפון' });

    const result = await sendWhatsApp(phone, message || 'הודעת בדיקה מ-LapTrack');
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// POST /api/whatsapp/prepare-alert/:rentalId — prepare alert message with shortened URL for preview
router.post('/prepare-alert/:rentalId', async (req, res, next) => {
  try {
    const rental = await prisma.rental.findUnique({
      where: { id: req.params.rentalId },
      include: { client: true, computer: true },
    });
    if (!rental) return res.status(404).json({ error: 'השכרה לא נמצאה' });

    const settings = await getWhatsAppSettings();
    const senderName = settings.wa_sender_name || 'LapTrack';

    let template = settings.wa_template_expiring || getDefaultTemplate();

    // Create response token
    const token = crypto.randomBytes(16).toString('hex');
    await prisma.rentalResponse.create({
      data: { token, rentalId: rental.id },
    });

    const responseUrl = getResponseUrl(token);

    const daysLeft = rental.expectedReturn
      ? Math.ceil((new Date(rental.expectedReturn) - new Date()) / (1000 * 60 * 60 * 24))
      : null;

    const message = template
      .replace(/\{clientName\}/g, rental.client.contactName || rental.client.name)
      .replace(/\{computerName\}/g, `${rental.computer.brand} ${rental.computer.model}`)
      .replace(/\{computerId\}/g, rental.computer.internalId)
      .replace(/\{daysLeft\}/g, daysLeft !== null ? String(daysLeft) : 'לא ידוע')
      .replace(/\{expectedReturn\}/g, rental.expectedReturn ? new Date(rental.expectedReturn).toLocaleDateString('he-IL') : 'חודשי')
      .replace(/\{senderName\}/g, senderName)
      .replace(/\{responseUrl\}/g, responseUrl);

    res.json({ message, phone: rental.client.phone, email: rental.client.email });
  } catch (err) {
    next(err);
  }
});

// POST /api/whatsapp/send-rental-alert/:rentalId — send expiring rental alert
router.post('/send-rental-alert/:rentalId', async (req, res, next) => {
  try {
    const rental = await prisma.rental.findUnique({
      where: { id: req.params.rentalId },
      include: { client: true, computer: true },
    });
    if (!rental) return res.status(404).json({ error: 'השכרה לא נמצאה' });

    const settings = await getWhatsAppSettings();
    const senderName = settings.wa_sender_name || 'LapTrack';

    let template = settings.wa_template_expiring || getDefaultTemplate();

    // Create response token
    const token = crypto.randomBytes(16).toString('hex');
    await prisma.rentalResponse.create({
      data: { token, rentalId: rental.id },
    });

    const responseUrl = getResponseUrl(token);

    const daysLeft = rental.expectedReturn
      ? Math.ceil((new Date(rental.expectedReturn) - new Date()) / (1000 * 60 * 60 * 24))
      : null;

    const message = template
      .replace(/\{clientName\}/g, rental.client.contactName || rental.client.name)
      .replace(/\{computerName\}/g, `${rental.computer.brand} ${rental.computer.model}`)
      .replace(/\{computerId\}/g, rental.computer.internalId)
      .replace(/\{daysLeft\}/g, daysLeft !== null ? String(daysLeft) : 'לא ידוע')
      .replace(/\{expectedReturn\}/g, rental.expectedReturn ? new Date(rental.expectedReturn).toLocaleDateString('he-IL') : 'חודשי')
      .replace(/\{senderName\}/g, senderName)
      .replace(/\{responseUrl\}/g, responseUrl);

    const result = await sendWhatsApp(rental.client.phone, message);

    await prisma.whatsAppLog.create({
      data: {
        rentalId: rental.id,
        clientId: rental.clientId,
        phone: rental.client.phone,
        message,
        status: result.sent ? 'SENT' : 'FAILED',
        response: result.sent ? null : (result.reason || null),
      },
    });

    res.json({ ...result, message });
  } catch (err) {
    next(err);
  }
});

// POST /api/whatsapp/send-custom — send custom message to a client
router.post('/send-custom', async (req, res, next) => {
  try {
    const { phone, message, clientId } = req.body;
    if (!phone || !message) {
      return res.status(400).json({ error: 'חסר מספר טלפון או הודעה' });
    }

    const result = await sendWhatsApp(phone, message);

    // Log
    await prisma.whatsAppLog.create({
      data: {
        clientId: clientId || null,
        phone,
        message,
        status: result.sent ? 'SENT' : 'FAILED',
        response: result.sent ? null : (result.reason || null),
      },
    });

    res.json(result);
  } catch (err) {
    next(err);
  }
});

// POST /api/whatsapp/send-email — send email to a client
router.post('/send-email', async (req, res, next) => {
  try {
    const { email, subject, message, clientId } = req.body;
    if (!email || !message) {
      return res.status(400).json({ error: 'חסר אימייל או הודעה' });
    }

    // Convert plain text to HTML (preserve line breaks)
    const html = message.replace(/\n/g, '<br>');
    const result = await sendEmail(email, subject || 'הודעה מ-LapTrack', html);

    // Log
    await prisma.whatsAppLog.create({
      data: {
        clientId: clientId || null,
        phone: email,
        message,
        status: result.sent ? 'SENT' : 'FAILED',
        response: result.sent ? null : (result.reason || null),
      },
    });

    res.json(result);
  } catch (err) {
    next(err);
  }
});

// GET /api/whatsapp/logs — sent messages log
router.get('/logs', async (req, res, next) => {
  try {
    const logs = await prisma.whatsAppLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: {
        rental: {
          include: { computer: true, client: true },
        },
      },
    });
    res.json(logs);
  } catch (err) {
    next(err);
  }
});

// GET /api/whatsapp/responses — client responses
router.get('/responses', async (req, res, next) => {
  try {
    const responses = await prisma.rentalResponse.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: {
        rental: {
          include: { computer: true, client: true },
        },
      },
    });
    res.json(responses);
  } catch (err) {
    next(err);
  }
});

function getDefaultTemplate() {
  return `היי {clientName}, כאן {senderName} ממחלקת התפעול
שמנו לב שבעוד {daysLeft} ימים ({expectedReturn}) מסתיימת לך תקופת השכרת המחשב {computerId}, אבל היי אל דאגה!

לבחירתך 3 אפשרויות:
1. נא חדשו עבורי לתקופה נוספת
2. ברצוני להחזיר לאחת מנקודות האיסוף
3. ברצוני להזמין שליח לאיסוף המחשב בעלות 50 ש"ח

לבחירה לחצו כאן: {responseUrl}`;
}

module.exports = router;
