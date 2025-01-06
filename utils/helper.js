import { Op } from 'sequelize';
import Doctor from '../models/Doctor.js';
import Appointment from '../models/Appointment.js';
import Notification from '../models/Notification.js';
import { sendEmail } from './emailService.js';

// Function to assign a doctor to the appointment
export const assignDoctorToAppointment = async (date, time, t) => {
  const availableDoctor = await Doctor.findOne({
    where: {
      status: 'active', 
      working_hours_start: {
        [Op.lte]: time, 
      },
      working_hours_end: {
        [Op.gte]: time, 
      },
    },
    include: [{
      model: Appointment,
      as:'appointments',
      required: false, 
      where: {
        date,
        time,
      },
    }],
    transaction: t,
  });

  if (!availableDoctor) {
    return null;
  }

  return availableDoctor;
};

export const handleAppointmentNotification = async (appointment, doctor, patientEmail, date, time) => {
  try {
    const notification = await Notification.create({
      type: 'appointment_confirmation',
      recipient_email: patientEmail,
      message: `Your appointment with Dr. ${doctor.username} on ${date} at ${time} has been confirmed.`,
      status: 'pending',
      appointment_id: appointment.id,
    });

    const emailSent = await sendEmail(
      notification.recipient_email,
      'Appointment Confirmation',
      notification.message
    );

    // Update notification status
    if (emailSent) {
      notification.status = 'sent';
    } else {
      notification.status = 'failed';
    }
    await notification.save();
  } catch (error) {
    console.error('Error sending appointment notification:', error);
  }
};