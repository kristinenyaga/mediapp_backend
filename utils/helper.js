import { Op } from 'sequelize';
import Doctor from '../models/Doctor.js';
import Appointment from '../models/Appointment.js';
// Function to assign a doctor to the appointment
export const assignDoctorToAppointment = async (date, time, t) => {
  // Find an available doctor who is active and has no appointments at the same time on that day
  const availableDoctor = await Doctor.findOne({
    where: {
      status: 'active', // Only active doctors
      working_hours_start: {
        [Op.lte]: time, // Ensure appointment is within doctor's working hours
      },
      working_hours_end: {
        [Op.gte]: time, // Ensure appointment is within doctor's working hours
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

  // If no available doctor is found, return null
  if (!availableDoctor) {
    return null;
  }

  return availableDoctor;
};
