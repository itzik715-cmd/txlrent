const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const { TOTP, Secret } = require('otpauth');
const QRCode = require('qrcode');

const router = express.Router();
const prisma = new PrismaClient();

// POST /api/auth/login
router.post('/login', async (req, res, next) => {
  try {
    const { email, password, totpCode } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'נדרש אימייל וסיסמה' });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: 'אימייל או סיסמה שגויים' });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(401).json({ error: 'אימייל או סיסמה שגויים' });
    }

    // If MFA enabled, require TOTP code
    if (user.mfaEnabled && user.mfaSecret) {
      if (!totpCode) {
        return res.status(200).json({ mfaRequired: true });
      }

      const totp = new TOTP({
        secret: Secret.fromBase32(user.mfaSecret),
        algorithm: 'SHA1',
        digits: 6,
        period: 30,
      });

      const delta = totp.validate({ token: totpCode, window: 1 });
      if (delta === null) {
        return res.status(401).json({ error: 'קוד אימות שגוי' });
      }
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/mfa/setup — generate MFA secret + QR code (requires auth)
router.post('/mfa/setup', async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'אין הרשאה' });
    const decoded = jwt.verify(authHeader.split(' ')[1], process.env.JWT_SECRET);

    const secret = new Secret({ size: 20 });
    const totp = new TOTP({
      issuer: 'LapTrack',
      label: decoded.email,
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
      secret,
    });

    const uri = totp.toString();
    const qrDataUrl = await QRCode.toDataURL(uri);

    // Store secret temporarily (not enabled yet until verified)
    await prisma.user.update({
      where: { id: decoded.id },
      data: { mfaSecret: secret.base32 },
    });

    res.json({ qr: qrDataUrl, secret: secret.base32 });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/mfa/verify — verify TOTP and enable MFA
router.post('/mfa/verify', async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'אין הרשאה' });
    const decoded = jwt.verify(authHeader.split(' ')[1], process.env.JWT_SECRET);

    const { code } = req.body;
    if (!code) return res.status(400).json({ error: 'נדרש קוד אימות' });

    const user = await prisma.user.findUnique({ where: { id: decoded.id } });
    if (!user || !user.mfaSecret) {
      return res.status(400).json({ error: 'יש להגדיר MFA קודם' });
    }

    const totp = new TOTP({
      secret: Secret.fromBase32(user.mfaSecret),
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
    });

    const delta = totp.validate({ token: code, window: 1 });
    if (delta === null) {
      return res.status(400).json({ error: 'קוד שגוי, נסה שוב' });
    }

    await prisma.user.update({
      where: { id: decoded.id },
      data: { mfaEnabled: true },
    });

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/mfa/disable — disable MFA
router.post('/mfa/disable', async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'אין הרשאה' });
    const decoded = jwt.verify(authHeader.split(' ')[1], process.env.JWT_SECRET);

    await prisma.user.update({
      where: { id: decoded.id },
      data: { mfaEnabled: false, mfaSecret: null },
    });

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  res.json({ message: 'התנתקת בהצלחה' });
});

module.exports = router;
