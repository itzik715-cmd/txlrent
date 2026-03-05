require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const express = require('express');
const cors = require('cors');
const authMiddleware = require('./middleware/auth');
const scheduler = require('./services/scheduler');

const authRoutes = require('./routes/auth');
const dashboardRoutes = require('./routes/dashboard');
const computerRoutes = require('./routes/computers');
const clientRoutes = require('./routes/clients');
const rentalRoutes = require('./routes/rentals');
const billingRoutes = require('./routes/billing');
const importRoutes = require('./routes/import');
const issueRoutes = require('./routes/issues');
const settingsRoutes = require('./routes/settings');
const whatsappRoutes = require('./routes/whatsapp');
const responsesRoutes = require('./routes/responses');

const app = express();

app.use(cors());
app.use(express.json());

// Public routes
app.use('/api/auth', authRoutes);
app.use('/api/responses', responsesRoutes);

// Protected routes
app.use('/api/dashboard', authMiddleware, dashboardRoutes);
app.use('/api/computers', authMiddleware, computerRoutes);
app.use('/api/clients', authMiddleware, clientRoutes);
app.use('/api/rentals', authMiddleware, rentalRoutes);
app.use('/api/billing', authMiddleware, billingRoutes);
app.use('/api/billings', authMiddleware, billingRoutes);
app.use('/api/payments', authMiddleware, billingRoutes);
app.use('/api/import', authMiddleware, importRoutes);
app.use('/api/issues', authMiddleware, issueRoutes);
app.use('/api/settings', authMiddleware, settingsRoutes);
app.use('/api/whatsapp', authMiddleware, whatsappRoutes);

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'שגיאת שרת פנימית', details: err.message });
});

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`LapTrack server running on port ${PORT}`);
  scheduler.start();
});
