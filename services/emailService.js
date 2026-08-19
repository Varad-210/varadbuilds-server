const nodemailer = require('nodemailer');

const createTransporter = () => {
  return nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE || 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
};

const sendBookingEmails = async (bookingData) => {
  try {
    const transporter = createTransporter();

    // 1. Email to the Admin/Owner
    const adminMailOptions = {
      from: process.env.EMAIL_USER,
      to: process.env.ADMIN_EMAIL || process.env.EMAIL_USER,
      subject: 'New Strategy Call Booking! 🎉',
      html: `
        <h2>New Strategy Call Booking</h2>
        <p>A new strategy call has been booked. Here are the details:</p>
        <ul>
          <li><strong>Name:</strong> ${bookingData.customerName}</li>
          <li><strong>Email:</strong> ${bookingData.email || 'N/A'}</li>
          <li><strong>Phone:</strong> ${bookingData.phoneNumber}</li>
          <li><strong>Business Type:</strong> ${bookingData.businessType}</li>
          <li><strong>Service Type:</strong> ${bookingData.serviceType}</li>
          <li><strong>Preferred Date:</strong> ${new Date(bookingData.preferredDate).toLocaleDateString()}</li>
          <li><strong>Preferred Time:</strong> ${bookingData.preferredTime}</li>
          <li><strong>City:</strong> ${bookingData.city}</li>
          <li><strong>Message:</strong> ${bookingData.message || 'N/A'}</li>
        </ul>
      `,
    };

    // Send admin email
    await transporter.sendMail(adminMailOptions);

    // 2. Email to the User (Only if they provided an email)
    if (bookingData.email) {
      const userMailOptions = {
        from: process.env.EMAIL_USER,
        to: bookingData.email,
        subject: 'Your Strategy Call is Booked! 🚀',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaee; border-radius: 10px;">
            <h2 style="color: #4F46E5; text-align: center;">Booking Confirmed!</h2>
            <p>Hi ${bookingData.customerName},</p>
            <p>Thank you for booking a strategy call with us! We have successfully received your request and are thrilled to connect with you.</p>
            <p><strong>What's Next?</strong></p>
            <p>Our team will review your details and get back to you shortly to confirm your preferred time slot on ${new Date(bookingData.preferredDate).toLocaleDateString()} at ${bookingData.preferredTime}.</p>
            <br/>
            <p>If you have any immediate questions, feel free to reply directly to this email.</p>
            <br/>
            <p>Best regards,<br/><strong>VaradBuilds Team</strong></p>
          </div>
        `,
      };

      await transporter.sendMail(userMailOptions);
    }

    console.log('Booking emails sent successfully');
  } catch (error) {
    console.error('Error sending booking emails:', error);
    // Don't throw the error so it doesn't block the booking creation
  }
};

module.exports = {
  sendBookingEmails,
};
