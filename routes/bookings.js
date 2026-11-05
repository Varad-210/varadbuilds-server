const express = require('express');
const router = express.Router();
const prisma = require('../prisma');
const requireAdmin = require('../middleware/requireAdmin');
const { createSubmitLimiter } = require('../middleware/rateLimit');
const { toText, parsePagination } = require('../utils/request');

const submitLimiter = createSubmitLimiter();

// The public form only ever sends these values; anything else is rejected
// rather than written to the database.
const ALLOWED_SERVICE_TYPES = [
  'Website',
  'Custom Software',
  'Meta Ads',
  'Restaurant POS / QR Ordering',
  'Not sure yet',
];

const ALLOWED_STATUSES = ['pending', 'confirmed', 'completed', 'cancelled'];

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ============================================================
// CREATE NEW BOOKING  (public)
// POST /api/bookings
// ============================================================
router.post('/', submitLimiter, async (req, res) => {
  const body = req.body || {};

  const customerName = toText(body.customerName);
  const phoneNumber = toText(body.phoneNumber);
  const businessName = toText(body.businessName);
  const serviceType = toText(body.serviceType);
  const preferredTime = toText(body.preferredTime, { maxLength: 100 });
  const city = toText(body.city, { maxLength: 200 });
  const email = toText(body.email, { maxLength: 254 });
  const message = toText(body.message);

  const requiredFields = {
    customerName,
    phoneNumber,
    businessName,
    serviceType,
    preferredTime,
    city,
  };

  if (email && !EMAIL_PATTERN.test(email)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid email address.',
    });
  }

  const missingFields = Object.entries(requiredFields)
    .filter(([, value]) => !value)
    .map(([key]) => key);

  if (typeof body.preferredDate !== 'string' || !body.preferredDate) {
    missingFields.push('preferredDate');
  }

  if (missingFields.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Please fill all required fields.',
      missingFields,
    });
  }

  if (!ALLOWED_SERVICE_TYPES.includes(serviceType)) {
    return res.status(400).json({
      success: false,
      message: 'Unknown serviceType.',
      allowed: ALLOWED_SERVICE_TYPES,
    });
  }

  const parsedDate = new Date(body.preferredDate);

  if (Number.isNaN(parsedDate.getTime())) {
    return res.status(400).json({
      success: false,
      message: 'Invalid preferred date.',
    });
  }

  // 'status' and 'source' are intentionally not read from the request; the
  // database defaults them to 'pending' / 'website'.
  const bookingData = {
    customerName,
    phoneNumber,
    businessName,
    serviceType,
    preferredTime,
    city,
    email,
    message,
    preferredDate: parsedDate,
  };

  try {
    const booking = await prisma.booking.create({ data: bookingData });

    console.log('✅ Booking saved:', booking.id);

    return res.status(201).json({
      success: true,
      message: 'Booking created successfully.',
      data: booking,
    });
  } catch (error) {
    console.error('❌ BOOKING CREATION FAILED', {
      name: error.name,
      code: error.code,
      message: error.message,
    });

    return res.status(500).json({
      success: false,
      message: 'Unable to save booking.',
    });
  }
});


// ============================================================
// BOOKING STATISTICS  (admin)
// GET /api/bookings/stats/overview
// ============================================================
router.get('/stats/overview', requireAdmin, async (req, res) => {
  try {
    const [totalBookings, pendingBookings, confirmedBookings, completedBookings] =
      await Promise.all([
        prisma.booking.count(),
        prisma.booking.count({ where: { status: 'pending' } }),
        prisma.booking.count({ where: { status: 'confirmed' } }),
        prisma.booking.count({ where: { status: 'completed' } }),
      ]);

    const bookingsByServiceType = await prisma.booking.groupBy({
      by: ['serviceType'],
      _count: { serviceType: true },
    });

    return res.json({
      success: true,
      data: {
        total: totalBookings,
        pending: pendingBookings,
        confirmed: confirmedBookings,
        completed: completedBookings,
        byServiceType: bookingsByServiceType.map((item) => ({
          _id: item.serviceType,
          count: item._count.serviceType,
        })),
      },
    });
  } catch (error) {
    console.error('❌ Error fetching booking statistics:', error.message);

    return res.status(500).json({
      success: false,
      message: 'Error fetching booking statistics.',
    });
  }
});


// ============================================================
// GET ALL BOOKINGS  (admin)
// GET /api/bookings
// ============================================================
router.get('/', requireAdmin, async (req, res) => {
  const { page, limit } = parsePagination(req.query);

  const status = toText(req.query.status, { maxLength: 50 });
  const serviceType = toText(req.query.serviceType, { maxLength: 100 });

  const filter = {};

  // An empty query value means "no filter", matching the previous behaviour.
  if (req.query.status) {
    if (!ALLOWED_STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Unknown status.',
        allowed: ALLOWED_STATUSES,
      });
    }

    filter.status = status;
  }

  if (req.query.serviceType) {
    if (!serviceType) {
      return res.status(400).json({
        success: false,
        message: 'Invalid serviceType.',
      });
    }

    filter.serviceType = serviceType;
  }

  try {
    const [bookings, total] = await Promise.all([
      prisma.booking.findMany({
        where: filter,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: (page - 1) * limit,
      }),
      prisma.booking.count({ where: filter }),
    ]);

    return res.json({
      success: true,
      data: bookings,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total,
    });
  } catch (error) {
    console.error('❌ Error fetching bookings:', error.message);

    return res.status(500).json({
      success: false,
      message: 'Error fetching bookings.',
    });
  }
});


// ============================================================
// GET SINGLE BOOKING  (admin)
// GET /api/bookings/:id
// ============================================================
router.get('/:id', requireAdmin, async (req, res) => {
  try {
    const booking = await prisma.booking.findUnique({
      where: { id: req.params.id },
    });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found.',
      });
    }

    return res.json({ success: true, data: booking });
  } catch (error) {
    console.error('❌ Error fetching booking:', error.message);

    return res.status(500).json({
      success: false,
      message: 'Error fetching booking.',
    });
  }
});


// ============================================================
// UPDATE BOOKING STATUS  (admin)
// PATCH /api/bookings/:id/status
// ============================================================
router.patch('/:id/status', requireAdmin, async (req, res) => {
  const status = toText(req.body?.status, { maxLength: 50 });

  if (!ALLOWED_STATUSES.includes(status)) {
    return res.status(400).json({
      success: false,
      message: 'Unknown status.',
      allowed: ALLOWED_STATUSES,
    });
  }

  try {
    const booking = await prisma.booking.update({
      where: { id: req.params.id },
      data: { status },
    });

    return res.json({
      success: true,
      message: 'Booking status updated.',
      data: booking,
    });
  } catch (error) {
    console.error('❌ Error updating booking status:', error.message);

    return res.status(500).json({
      success: false,
      message: 'Error updating booking status.',
    });
  }
});


// ============================================================
// DELETE BOOKING  (admin)
// DELETE /api/bookings/:id
// ============================================================
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    await prisma.booking.delete({ where: { id: req.params.id } });

    return res.json({
      success: true,
      message: 'Booking deleted successfully.',
    });
  } catch (error) {
    console.error('❌ Error deleting booking:', error.message);

    return res.status(500).json({
      success: false,
      message: 'Error deleting booking.',
    });
  }
});


// ============================================================
// EXPORT ROUTER
// ============================================================
module.exports = router;
