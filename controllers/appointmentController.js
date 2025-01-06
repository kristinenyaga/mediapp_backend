import moment from 'moment';
import Doctor from '../models/Doctor.js';
import Appointment from '../models/Appointment.js';
import Patient from '../models/Patient.js'
import Notification from '../models/Notification.js'
import { assignDoctorToAppointment, handleAppointmentNotification } from '../utils/helper.js';
import { sequelize } from '../config/db.js';

// Booking an appointment
export const bookAppointment = async (req, res) => {
  const { patient_id, date, time } = req.body;
  const patient = await Patient.findByPk(patient_id);
  
  if (!patient) {
    return res.status(404).json({ message: 'Patient not found.' });
  }

  // Extract patient email
  const patientEmail = patient.email;

  // Validate appointment time (ensure it's within working hours)
  const appointmentTime = new Date(`${date} ${time}`);
  const startOfDay = new Date(`${date} 09:00:00`); // Working hours start at 9 AM
  const endOfDay = new Date(`${date} 17:00:00`); // Working hours end at 5 PM

  // Ensure the appointment is within working hours
  if (appointmentTime < startOfDay || appointmentTime > endOfDay) {
    return res.status(400).json({
      message: 'Appointment time must be within working hours (9 AM - 5 PM).',
    });
  }

  // Start a transaction to ensure atomic operations
  const t = await sequelize.transaction();  // Use sequelize.transaction() here
  try {
    // Call the function to assign an available doctor to the appointment
    const availableDoctor = await assignDoctorToAppointment(date, time, t);

    if (!availableDoctor) {
      return res.status(400).json({
        message: 'No available doctor at this time. Please try a different time.',
      });
    }

    // Create the appointment and assign it to the available doctor
    const newAppointment = await Appointment.create(
      {
        patient_id,
        doctor_id: availableDoctor.id,
        date,
        time,
        status: 'pending', // Initial status
      },
      { transaction: t }
    );
    await t.commit();

    res.status(201).json({
      message: 'Appointment booked successfully!',
      appointment: newAppointment,
    });

    handleAppointmentNotification(newAppointment, availableDoctor, patientEmail, date, time);
  } catch (error) {
    // Rollback the transaction in case of error
    await t.rollback();
    console.error('Error booking appointment:', error);
    return res.status(500).json({ message: 'Error booking appointment.' });
  }
};

export const cancelAppointment = async (req, res) => {
  try {
    const { appointment_id } = req.body;  
    const appointment = await Appointment.findByPk(appointment_id);

    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    appointment.status = 'canceled'; 
    await appointment.save();

    res.status(200).json({ message: 'Appointment canceled successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error canceling appointment' });
  }
};

export const restoreAppointment = async (req, res) => {
  try {
    const { appointment_id } = req.body;  
    const appointment = await Appointment.findByPk(appointment_id);

    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    appointment.status = 'pending'; 
    await appointment.save();

    res.status(200).json({ message: 'Appointment restored successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error restoring appointment' });
  }
};