const express = require('express');
const router = express.Router();
const prisma = require('../prisma');

// Create a new contact inquiry
router.post('/', async (req, res) => {
  try {
    const contact = await prisma.contact.create({
      data: req.body
    });
    res.status(201).json({
      success: true,
      message: 'Contact inquiry submitted successfully',
      data: contact
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Error submitting contact inquiry',
      error: error.message
    });
  }
});

// Get all contacts (with pagination and filters)
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 10, status, businessType } = req.query;
    
    const filter = {};
    if (status) filter.status = status;
    if (businessType) filter.businessType = businessType;

    const limitNum = parseInt(limit);
    const pageNum = parseInt(page);

    const contacts = await prisma.contact.findMany({
      where: filter,
      orderBy: { createdAt: 'desc' },
      take: limitNum,
      skip: (pageNum - 1) * limitNum,
    });

    const count = await prisma.contact.count({ where: filter });

    res.json({
      success: true,
      data: contacts,
      totalPages: Math.ceil(count / limitNum),
      currentPage: pageNum,
      total: count
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching contacts',
      error: error.message
    });
  }
});

// Update contact status
router.patch('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const contact = await prisma.contact.update({
      where: { id: req.params.id },
      data: { status }
    });
    
    res.json({
      success: true,
      message: 'Contact status updated',
      data: contact
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Error updating contact',
      error: error.message
    });
  }
});

module.exports = router;
