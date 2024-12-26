import moment from 'moment'
import Doctor from '../models/Doctor.js';
import Appointment from '../models/Appointment.js';
export const bookAppointment = async (req, res) => {
  const { patient_id, doctor_id, date, time } = req.body
  try {
    // Step 1: Check if the appointment time is within valid working hours (9 AM - 5 PM)
    const appointmentTime = moment(`${date} ${time}`, 'YYYY-MM-DD HH:mm:ss').toDate();

    // Define working hours as local times
    const startOfDay = moment(`${date} 09:00:00`, 'YYYY-MM-DD HH:mm:ss').toDate();
    const endOfDay = moment(`${date} 17:00:00`, 'YYYY-MM-DD HH:mm:ss').toDate();

    console.log('appointmentTime', appointmentTime);
    console.log('startOfDay', startOfDay);
    console.log('endOfDay', endOfDay);

    if (appointmentTime < startOfDay || appointmentTime > endOfDay) {
      return res.status(400).json({
        message: 'Appointment time must be within working hours (9 AM - 5 PM).',
      });
    }

    // Step 2: Check if the doctor is available at the requested time
    const existingAppointmenDoctor = Appointment.findOne({
      where: {
        doctor_id,
        date,
        time
      },
      transaction:t
    })
    if (existingAppointmenDoctor) {
      res.status(400).json({message:'The doctor is already booked for this time slot.'})
    }

    // Step 3: Check if the patient already has an appointment with the same doctor on the same day
    const existingAppointmentPatient = await Appointment.findOne({
      where: {
        patient_id,
        doctor_id,
        date: date,
      },
      transaction:t
    });

    if (existingAppointmentPatient) {
      return res.status(400).json({
        message: 'You already have an appointment with this doctor on the same day.',
      });
    }
    // Step 4: Create the appointment if all checks pass
    const appointment = await Appointment.create({
      patient_id,
      doctor_id,
      date,
      time,
      status: 'pending',
    }, { transaction: t });
    
    await t.commit()
    return res.status(201).json(appointment);
  }
  catch (error) {
    // Rollback the transaction if something goes wrong
    await t.rollback();
    console.error(error);
    return res.status(500).json({
      message: 'An error occurred while booking the appointment.',
    });
  }
}