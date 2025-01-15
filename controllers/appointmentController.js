import moment from 'moment';
import Doctor from '../models/Doctor.js';
import Appointment from '../models/Appointment.js';
import Patient from '../models/Patient.js'
import Notification from '../models/Notification.js'
import { assignDoctorToAppointment, handleAppointmentNotification } from '../utils/helper.js';
import { sequelize } from '../config/db.js';
import WorkingHours from '../models/WorkingHours.js';
import { Op } from 'sequelize';
import * as tz from 'date-fns-tz';
import { format } from 'date-fns';


export const bookAppointment = async (req, res) => {
  const { doctorId, startTime, date, patientId } = req.body;
  const appointmentDuration = 30;
  try {
    if (!date || !startTime || !patientId) {
      return res.status(400).json({ message: "Date, startTime, and patient ID are required" });
    }

    const patient = await Patient.findByPk(patientId);
    if (!patient) {
      return res.status(404).json({ message: "Patient not found" });
    }

    const patientEmail = patient.email;
    const appointmentDate = new Date(date);
    const requestedTime = `${startTime}:00`; 
    const endTime = new Date(`${date}T${startTime}:00`); 
    endTime.setMinutes(endTime.getMinutes() + appointmentDuration);
    let selectedDoctor;

    if (doctorId) {
      selectedDoctor = await Doctor.findByPk(doctorId, {
        include: {
          model: WorkingHours,
          as: 'workinghours',
          where: {
            dayOfWeek: appointmentDate.toLocaleString("en-us", { weekday: "long" }),
            startTime: { [Op.lte]: requestedTime },
            endTime: { [Op.gte]: endTime.toISOString().split('T')[1] },
          },
        },
      });

      if (!selectedDoctor) {
        return res.status(404).json({ message: "Doctor not available at the requested startTime." });
      }

      const conflict = await Appointment.findOne({
        where: {
          doctorId: selectedDoctor.id,
          date: appointmentDate,
          [Op.or]: [
            {
              startTime: { [Op.between]: [requestedTime, endTime.toISOString().split('T')[1]] },
            },
            {
              endTime: { [Op.between]: [requestedTime, endTime.toISOString().split('T')[1]] },
            },
          ],
        },
      });

      if (conflict) {
        return res.status(400).json({ message: "Requested startTime slot is already booked." });
      }
    } else {
      const availableDoctor = await Doctor.findOne({
        include: [
          {
            model: WorkingHours,
            as: 'workinghours',
            where: {
              dayOfWeek: appointmentDate.toLocaleString("en-us", { weekday: "long" }),
              startTime: { [Op.lte]: requestedTime },
              endTime: { [Op.gte]: endTime.toISOString().split('T')[1] },
            },
          },
          {
            model: Appointment,
            as: 'appointments',
            required: false,
            where: {
              date: appointmentDate,
              [Op.or]: [
                {
                  startTime: { [Op.between]: [requestedTime, endTime.toISOString().split('T')[1]] },
                },
                {
                  endTime: { [Op.between]: [requestedTime, endTime.toISOString().split('T')[1]] },
                },
              ],
            },
          },
        ],
      });

      if (!availableDoctor) {
        return res.status(404).json({ message: "No doctors are available at the requested startTime." });
      }

      selectedDoctor = availableDoctor;
    }

    const newAppointment = await Appointment.create({
      doctorId: selectedDoctor.id,
      startTime: requestedTime,
      endTime: endTime.toISOString().split('T')[1], 
      appointmentDuration,
      date: appointmentDate,
      patientId,
    });

    res.status(201).json({
      message: "Appointment booked successfully.",
      appointment: newAppointment,
    });

    handleAppointmentNotification(newAppointment, selectedDoctor, patientEmail, appointmentDate, requestedTime);
  } catch (error) {
    console.error("Error booking appointment:", error);
    return res.status(500).json({ message: "Internal server error." });
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


export const calculateAvailableSlots = async (req, res) => {
  const { doctorId, date, appointmentDuration = 30 } = req.body;

  try {
    if (!date) {
      return res.status(400).json({ message: "Date is required to calculate available slots." });
    }

    const appointmentDate = new Date(date);
    const dayOfWeek = appointmentDate.toLocaleString("en-us", { weekday: "long" });

    // Fetch working hours for the doctor(s)
    let workingHoursQuery = {
      where: { dayOfWeek },
    };

    if (doctorId) {
      workingHoursQuery.where.doctorId = doctorId;
    }

    const workingHours = await WorkingHours.findAll(workingHoursQuery);

    if (!workingHours.length) {
      return res.status(404).json({ message: "No working hours found for the given doctor(s) on this day." });
    }

    // Fetch existing appointments for the doctor(s) on the given date
    let appointmentsQuery = {
      where: { date: appointmentDate },
    };

    if (doctorId) {
      appointmentsQuery.where.doctorId = doctorId;
    }

    const existingAppointments = await Appointment.findAll(appointmentsQuery);

    // Helper function to check if a time slot overlaps with existing appointments
    const isSlotAvailable = (slotStart, slotEnd) => {
      for (const appointment of existingAppointments) {
        const appointmentStart = new Date(`${date}T${appointment.time}`);
        const appointmentEnd = new Date(`${date}T${appointment.endTime}`);
        if (
          (slotStart >= appointmentStart && slotStart < appointmentEnd) || // Slot starts during an appointment
          (slotEnd > appointmentStart && slotEnd <= appointmentEnd) || // Slot ends during an appointment
          (slotStart <= appointmentStart && slotEnd >= appointmentEnd) // Slot fully overlaps with an appointment
        ) {
          return false;
        }
      }
      return true;
    };

    // Calculate available slots
    const availableSlots = [];
    const timeZone = "Africa/Nairobi";
    for (const hours of workingHours) {
      const startTime = new Date(`${date}T${hours.startTime}`);
      const endTime = new Date(`${date}T${hours.endTime}`);

      const formattedStartTime = tz.format(startTime, 'yyyy-MM-dd HH:mm:ssXXX', { timeZone });
      const formattedEndTime = tz.format(endTime, 'yyyy-MM-dd HH:mm:ssXXX', { timeZone });

      // Log the formatted times
      console.log('Formatted startTime:', formattedStartTime);
      console.log('Formatted endTime:', formattedEndTime);

      let currentSlotStart = new Date(startTime);
      while (currentSlotStart < endTime) {
        const currentSlotEnd = new Date(currentSlotStart);
        currentSlotEnd.setMinutes(currentSlotEnd.getMinutes() + appointmentDuration);

        if (currentSlotEnd <= endTime && isSlotAvailable(currentSlotStart, currentSlotEnd)) {
          availableSlots.push({
            startTime: tz.format(currentSlotStart, 'HH:mm'),
            endTime: tz.format(currentSlotEnd, 'HH:mm'),

          });
        }

        currentSlotStart.setMinutes(currentSlotStart.getMinutes() + appointmentDuration);
      }
    }

    res.status(200).json({
      message: "Available slots retrieved successfully.",
      slots: availableSlots,
    });
  } catch (error) {
    console.error("Error calculating available slots:", error);
    res.status(500).json({ message: "Internal server error." });
  }
};

