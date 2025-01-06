import cron from 'node-cron';
import { Op } from 'sequelize';
import Appointment from '../models/Appointment.js';
import Notification from '../models/Notification.js';
import { sendEmail } from './emailService.js';
import Patient from '../models/Patient.js';
import Doctor from '../models/Doctor.js';

export const sendAppointmentReminder = async () => {
  try {
    const now = new Date();
    const startOfDay = new Date(now.setHours(0, 0, 0, 0));
    const endOfDay = new Date(now.setHours(23, 59, 59, 999));

    // Fetch appointments for today
    const appointments = await Appointment.findAll({
      where: {
        date: {
          [Op.between]: [startOfDay, endOfDay],
        },
        status: 'pending',
      },
      include: [
        { model: Patient, as:'patient', attributes: ['email'] },
        { model: Doctor,as:'doctor', attributes: ['username'] },
      ],
    });

    const currentTime = new Date();

    for (const appointment of appointments) {
      // Combine date and time to calculate the appointment's DateTime
      const appointmentTime = new Date(
        `${appointment.date.toISOString().split('T')[0]}T${appointment.time}:00`
      );

      // Calculate the exact reminder time (45 minutes before appointment)
      const reminderTime = new Date(appointmentTime.getTime() - 45 * 60 * 1000);

      // Check if it's time to send the reminder
      if (
        currentTime >= reminderTime &&
        currentTime < appointmentTime &&
        appointment.status === 'pending'
      ) {
        const patientEmail = appointment.Patient.email;
        const doctorName = appointment.Doctor.username;

        // Create a notification
        const notification = await Notification.create({
          type: 'appointment_reminder',
          recipient_email: patientEmail,
          message: `Reminder: You have an appointment with Dr. ${doctorName} at ${appointment.time} today.`,
          status: 'pending',
          appointment_id: appointment.id,
        });

        // Send email reminder
        const emailSent = await sendEmail(
          notification.recipient_email,
          'Appointment Reminder',
          notification.message
        );

        // Update notification status
        notification.status = emailSent ? 'sent' : 'failed';
        await notification.save();

        console.log(`Reminder sent for appointment at ${appointment.time}`);
      }
    }
  } catch (error) {
    console.error('Error in appointment reminder scheduler:', error);
  }
};

// Schedule the job to run every minute
cron.schedule('* * * * *', sendAppointmentReminder); // Runs every minute
