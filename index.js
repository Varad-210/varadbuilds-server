const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Import Routes
const bookingRoutes = require('./routes/bookings');
const contactRoutes = require('./routes/contacts');

// Use Routes
app.use('/api/bookings', bookingRoutes);
app.use('/api/contacts', contactRoutes);

// Health Check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
