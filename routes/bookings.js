const express = require('express');
const router = express.Router();
const prisma = require('../prisma');

// ============================================================
// CREATE NEW BOOKING
// POST /api/bookings
// ============================================================
router.post('/', async (req, res) => {
  console.log('\n========================================');
  console.log('📥 NEW BOOKING REQUEST');
  console.log('========================================');
  console.log('Request body:', req.body);

  try {
    const {
      customerName,
      email,
      phoneNumber,
      businessType,
      serviceType,
      preferredDate,
      preferredTime,
      city,
      message,
    } = req.body;

    // --------------------------------------------------------
    // Validate required fields
    // --------------------------------------------------------
    const missingFields = [];

    if (!customerName) missingFields.push('customerName');
    if (!phoneNumber) missingFields.push('phoneNumber');
    if (!businessType) missingFields.push('businessType');
    if (!serviceType) missingFields.push('serviceType');
    if (!preferredDate) missingFields.push('preferredDate');
    if (!preferredTime) missingFields.push('preferredTime');
    if (!city) missingFields.push('city');

    if (missingFields.length > 0) {
      console.error('❌ Missing fields:', missingFields);

      return res.status(400).json({
        success: false,
        message: 'Please fill all required fields.',
        missingFields,
      });
    }

    // --------------------------------------------------------
    // Validate date
    // --------------------------------------------------------
    const parsedDate = new Date(preferredDate);

    if (Number.isNaN(parsedDate.getTime())) {
      console.error('❌ Invalid preferredDate:', preferredDate);

      return res.status(400).json({
        success: false,
        message: 'Invalid preferred date.',
      });
    }

    // --------------------------------------------------------
    // Prepare data for Prisma
    // --------------------------------------------------------
    const bookingData = {
      customerName: String(customerName).trim(),
      email: email ? String(email).trim() : null,
      phoneNumber: String(phoneNumber).trim(),
      businessType: String(businessType).trim(),
      serviceType: String(serviceType).trim(),
      preferredDate: parsedDate,
      preferredTime: String(preferredTime).trim(),
      city: String(city).trim(),
      message: message
        ? String(message).trim()
        : null,
    };

    console.log('📦 Data being sent to PostgreSQL:');
    console.log(bookingData);

    // --------------------------------------------------------
    // SAVE BOOKING TO POSTGRESQL
    // --------------------------------------------------------
    const booking = await prisma.booking.create({
      data: bookingData,
    });

    console.log('========================================');
    console.log('✅ BOOKING SAVED TO POSTGRESQL');
    console.log('Booking ID:', booking.id);
    console.log('========================================');

    // --------------------------------------------------------
    // SUCCESS RESPONSE
    // --------------------------------------------------------
    return res.status(201).json({
      success: true,
      message: 'Booking created successfully.',
      data: booking,
    });

  } catch (error) {
    // --------------------------------------------------------
    // DATABASE / PRISMA ERROR
    // --------------------------------------------------------
    console.error('\n========================================');
    console.error('❌ BOOKING CREATION FAILED');
    console.error('========================================');

    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Error code:', error.code || 'N/A');
    console.error('Full error:', error);

    return res.status(500).json({
      success: false,
      message: 'Unable to save booking.',
      error: error.message,
      code: error.code || null,
    });
  }
});


// ============================================================
// GET ALL BOOKINGS
// GET /api/bookings
// ============================================================
router.get('/', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      businessType,
    } = req.query;

    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const limitNum = Math.min(
      Math.max(parseInt(limit, 10) || 10, 1),
      100
    );

    const filter = {};

    if (status) {
      filter.status = status;
    }

    if (businessType) {
      filter.businessType = businessType;
    }

    const bookings = await prisma.booking.findMany({
      where: filter,
      orderBy: {
        createdAt: 'desc',
      },
      take: limitNum,
      skip: (pageNum - 1) * limitNum,
    });

    const total = await prisma.booking.count({
      where: filter,
    });

    return res.json({
      success: true,
      data: bookings,
      totalPages: Math.ceil(total / limitNum),
      currentPage: pageNum,
      total,
    });

  } catch (error) {
    console.error('❌ Error fetching bookings:', error);

    return res.status(500).json({
      success: false,
      message: 'Error fetching bookings.',
      error: error.message,
    });
  }
});


// ============================================================
// GET SINGLE BOOKING
// GET /api/bookings/:id
// ============================================================
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const booking = await prisma.booking.findUnique({
      where: {
        id,
      },
    });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found.',
      });
    }

    return res.json({
      success: true,
      data: booking,
    });

  } catch (error) {
    console.error('❌ Error fetching booking:', error);

    return res.status(500).json({
      success: false,
      message: 'Error fetching booking.',
      error: error.message,
    });
  }
});


// ============================================================
// UPDATE BOOKING STATUS
// PATCH /api/bookings/:id/status
// ============================================================
router.patch('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'Status is required.',
      });
    }

    const booking = await prisma.booking.update({
      where: {
        id,
      },
      data: {
        status,
      },
    });

    return res.json({
      success: true,
      message: 'Booking status updated.',
      data: booking,
    });

  } catch (error) {
    console.error('❌ Error updating booking status:', error);

    return res.status(500).json({
      success: false,
      message: 'Error updating booking status.',
      error: error.message,
    });
  }
});


// ============================================================
// DELETE BOOKING
// DELETE /api/bookings/:id
// ============================================================
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.booking.delete({
      where: {
        id,
      },
    });

    return res.json({
      success: true,
      message: 'Booking deleted successfully.',
    });

  } catch (error) {
    console.error('❌ Error deleting booking:', error);

    return res.status(500).json({
      success: false,
      message: 'Error deleting booking.',
      error: error.message,
    });
  }
});


// ============================================================
// BOOKING STATISTICS
// GET /api/bookings/stats/overview
// ============================================================
router.get('/stats/overview', async (req, res) => {
  try {
    const totalBookings = await prisma.booking.count();

    const pendingBookings = await prisma.booking.count({
      where: {
        status: 'pending',
      },
    });

    const confirmedBookings = await prisma.booking.count({
      where: {
        status: 'confirmed',
      },
    });

    const completedBookings = await prisma.booking.count({
      where: {
        status: 'completed',
      },
    });

    const bookingsByBusinessType =
      await prisma.booking.groupBy({
        by: ['businessType'],
        _count: {
          businessType: true,
        },
      });

    const formattedBusinessTypeStats =
      bookingsByBusinessType.map((item) => ({
        _id: item.businessType,
        count: item._count.businessType,
      }));

    return res.json({
      success: true,
      data: {
        total: totalBookings,
        pending: pendingBookings,
        confirmed: confirmedBookings,
        completed: completedBookings,
        byBusinessType: formattedBusinessTypeStats,
      },
    });

  } catch (error) {
    console.error('❌ Error fetching booking statistics:', error);

    return res.status(500).json({
      success: false,
      message: 'Error fetching booking statistics.',
      error: error.message,
    });
  }
});


// ============================================================
// EXPORT ROUTER
// ============================================================
module.exports = router;