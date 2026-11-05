const express = require('express');
const router = express.Router();
const prisma = require('../prisma');
const requireAdmin = require('../middleware/requireAdmin');
const { createSubmitLimiter } = require('../middleware/rateLimit');
const { toText, parsePagination } = require('../utils/request');

const submitLimiter = createSubmitLimiter();

const ALLOWED_BUSINESS_TYPES = [
  'cafe',
  'restaurant',
  'salon',
  'clinic',
  'hotel',
  'realestate',
  'other',
];

const ALLOWED_STATUSES = ['new', 'contacted', 'closed'];

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ============================================================
// CREATE A NEW CONTACT INQUIRY  (public)
// POST /api/contacts
// ============================================================
router.post('/', submitLimiter, async (req, res) => {
  const body = req.body || {};

  const name = toText(body.name, { maxLength: 200 });
  const phoneNumber = toText(body.phoneNumber, { maxLength: 50 });
  const businessType = toText(body.businessType, { maxLength: 50 });
  const city = toText(body.city, { maxLength: 200 });
  const email = toText(body.email, { maxLength: 254 });
  const message = toText(body.message);

  // Only whitelisted columns reach Prisma. 'status', 'id' and the timestamp
  // fields used to be client-settable through req.body.
  const contactData = { name, phoneNumber, businessType, city, email, message };

  const requiredFields = { name, phoneNumber, businessType, city };

  const missingFields = Object.entries(requiredFields)
    .filter(([, value]) => !value)
    .map(([key]) => key);

  if (email && !EMAIL_PATTERN.test(email)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid email address.',
    });
  }

  if (missingFields.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Please fill all required fields.',
      missingFields,
    });
  }

  if (!ALLOWED_BUSINESS_TYPES.includes(businessType)) {
    return res.status(400).json({
      success: false,
      message: 'Unknown businessType.',
      allowed: ALLOWED_BUSINESS_TYPES,
    });
  }

  try {
    const contact = await prisma.contact.create({ data: contactData });

    return res.status(201).json({
      success: true,
      message: 'Contact inquiry submitted successfully.',
      data: contact,
    });
  } catch (error) {
    console.error('❌ CONTACT CREATION FAILED', {
      name: error.name,
      code: error.code,
      message: error.message,
    });

    return res.status(500).json({
      success: false,
      message: 'Error submitting contact inquiry.',
    });
  }
});


// ============================================================
// GET ALL CONTACTS  (admin)
// GET /api/contacts
// ============================================================
router.get('/', requireAdmin, async (req, res) => {
  const { page, limit } = parsePagination(req.query);

  const status = toText(req.query.status, { maxLength: 50 });
  const businessType = toText(req.query.businessType, { maxLength: 50 });

  const filter = {};

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

  if (req.query.businessType) {
    if (!ALLOWED_BUSINESS_TYPES.includes(businessType)) {
      return res.status(400).json({
        success: false,
        message: 'Unknown businessType.',
        allowed: ALLOWED_BUSINESS_TYPES,
      });
    }

    filter.businessType = businessType;
  }

  try {
    const [contacts, total] = await Promise.all([
      prisma.contact.findMany({
        where: filter,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: (page - 1) * limit,
      }),
      prisma.contact.count({ where: filter }),
    ]);

    return res.json({
      success: true,
      data: contacts,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total,
    });
  } catch (error) {
    console.error('❌ Error fetching contacts:', error.message);

    return res.status(500).json({
      success: false,
      message: 'Error fetching contacts.',
    });
  }
});


// ============================================================
// UPDATE CONTACT STATUS  (admin)
// PATCH /api/contacts/:id/status
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
    const contact = await prisma.contact.update({
      where: { id: req.params.id },
      data: { status },
    });

    return res.json({
      success: true,
      message: 'Contact status updated.',
      data: contact,
    });
  } catch (error) {
    console.error('❌ Error updating contact:', error.message);

    return res.status(500).json({
      success: false,
      message: 'Error updating contact.',
    });
  }
});

module.exports = router;
