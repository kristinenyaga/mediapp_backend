import moment from 'moment';
import Doctor from '../models/Doctor.js';
import Appointment from '../models/Appointment.js';
import { assignDoctorToAppointment } from '../utils/helper.js';
import { sequelize } from '../config/db.js';

// Booking an appointment
export const bookAppointment = async (req, res) => {
  const { patient_id, date, time } = req.body;
  console.log('patientID',patient_id)

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

    // Commit the transaction if everything is successful
    await t.commit();

    // Return the appointment details to the user
    return res.status(201).json({
      message: 'Appointment booked successfully!',
      appointment: newAppointment,
    });
  } catch (error) {
    // Rollback the transaction in case of error
    await t.rollback();
    console.error('Error booking appointment:', error);
    return res.status(500).json({ message: 'Error booking appointment.' });
  }
};
