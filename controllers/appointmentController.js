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
import PatientSymptom from '../models/PatientSymptoms.js';
import Symptom from '../models/Symptom.js';

export const bookAppointment = async (req, res) => {
  const { doctorId, selectedTime, date } = req.body;
  const patientId = req.user.id
  const appointmentDuration = 30; // in minutes

  try {
    // Validate required fields
    if (!date || !selectedTime || !patientId) {
      return res.status(400).json({
        message: "Date, selectedTime, and patient ID are required.",
      });
    }

    // Parse `selectedTime` into startTime and endTime
    const [startTime, endTime] = selectedTime.split("-");
    if (!startTime || !endTime) {
      return res.status(400).json({
        message: "Invalid selectedTime format. Use 'HH:mm-HH:mm'.",
      });
    }

    // Check if the patient exists
    const patient = await Patient.findByPk(patientId);
    if (!patient) {
      return res.status(404).json({ message: "Patient not found." });
    }

    const patientEmail = patient.email;
    const appointmentDate = new Date(date);
    const requestedTime = `${startTime}:00`; // Ensure proper format
    const parsedEndTime = `${endTime}:00`;

    let selectedDoctor;

    if (doctorId) {
      // Fetch the selected doctor and check availability
      selectedDoctor = await Doctor.findByPk(doctorId, {
        include: {
          model: WorkingHours,
          as: "workinghours",
          where: {
            dayOfWeek: appointmentDate.toLocaleString("en-us", { weekday: "long" }),
            startTime: { [Op.lte]: requestedTime },
            endTime: { [Op.gte]: parsedEndTime },
          },
        },
      });

      if (!selectedDoctor) {
        return res.status(404).json({
          message: "Selected doctor is not available at the requested time.",
        });
      }

      // Check for scheduling conflicts
      const conflict = await Appointment.findOne({
        where: {
          doctorId: selectedDoctor.id,
          date: appointmentDate,
          [Op.or]: [
      {
        // New appointment starts during an existing appointment
        startTime: { [Op.lte]: requestedTime },
        endTime: { [Op.gt]: requestedTime },
      },
      {
        // New appointment ends during an existing appointment
        startTime: { [Op.lt]: parsedEndTime },
        endTime: { [Op.gte]: parsedEndTime },
      },
      {
        // New appointment fully overlaps an existing appointment
        startTime: { [Op.gte]: requestedTime },
        endTime: { [Op.lte]: parsedEndTime },
      },
      {
        // Existing appointment fully contained within the new appointment
        startTime: { [Op.lte]: requestedTime },
        endTime: { [Op.gte]: parsedEndTime },
      },
    ],
        },
      });

      if (conflict) {
        return res.status(400).json({
          message: "Selected time slot is already booked.",
        });
      }
    } else {
      // Assign a default available doctor
      const availableDoctor = await Doctor.findOne({
        include: [
          {
            model: WorkingHours,
            as: "workinghours",
            where: {
              dayOfWeek: appointmentDate.toLocaleString("en-us", { weekday: "long" }),
              startTime: { [Op.lte]: requestedTime },
              endTime: { [Op.gte]: parsedEndTime },
            },
          },
          {
            model: Appointment,
            as: "appointments",
            required: false,
            where: {
              date: appointmentDate,
              [Op.or]: [
                {
                  startTime: { [Op.between]: [requestedTime, parsedEndTime] },
                },
                {
                  endTime: { [Op.between]: [requestedTime, parsedEndTime] },
                },
              ],
            },
          },
        ],
      });

      if (!availableDoctor) {
        return res.status(404).json({
          message: "No doctors are available at the requested time.",
        });
      }

      selectedDoctor = availableDoctor;
    }

    // Create the appointment
    const newAppointment = await Appointment.create({
      doctorId: selectedDoctor.id,
      startTime: requestedTime,
      endTime: parsedEndTime,
      appointmentDuration,
      date: appointmentDate,
      patientId,
    });

    res.status(201).json({
      message: "Appointment booked successfully.",
      appointment: newAppointment,
      assignedDoctor: !doctorId ? selectedDoctor : undefined, // Include doctor info if auto-assigned
    });

    // Notify patient and doctor
    handleAppointmentNotification(newAppointment, selectedDoctor, patientEmail, appointmentDate, requestedTime);
  } catch (error) {
    console.error("Error booking appointment:", error);
    return res.status(500).json({
      message: "Internal server error.",
    });
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
  console.log(req.user)
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
        const appointmentStart = new Date(`${date}T${appointment.startTime}`);
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

export const getAppointments = async (req, res) => {
    try {
      const appointments = await Appointment.findAll({
        include: [
          {
            model: Patient,
            as: "patient",
          },
          {
            model: Doctor,
            as: "doctor",
          },
        ],
        attributes: { exclude: ['createdAt', 'updatedAt'] }
        
      });
      return res.status(200).json(appointments)

  } catch(error) {
    console.error("Error getting all appointments:", error);
    return res.status(500).json({ message: "Server error getting all appointments", error });
  }
}

export const getPatientAppointment = async (req, res) => {
  try {
    const { id } = req.params
    const patientId = req.user.id

    const appointment = await Appointment.findByPk(id, {
      include: [
        {
          model: Doctor,
          as: "doctor",
        },
        {
          model: PatientSymptom,
          as: "patientSymptom",
        },
      ],
      where: { patientId },
    });
    if (!appointment) {
      return res.status(404).json({ message: "appointment not found" });
    }
    
    

    if (appointment.patientSymptom?.symptoms) {
      let symptomIds = appointment.patientSymptom?.symptoms;

      const symptoms = await Symptom.findAll({
        where: {
          id: symptomIds,
        },
        attributes: ["name", "id"],
      });

      appointment.patientSymptom.symptoms = symptoms;
    }


    return res.status(200).json({ appointment })
    

  } catch (error) {
     console.error("Error getting all appointments:", error);
    return res.status(500).json({ message: "Server error getting appointment", error });
  }
}

export const getPatientAppointments = async (req, res) => {
  try {
    const patientId = req.user.id; 
    const appointments = await Appointment.findAll({
      where: { patientId },
      include: {
        model: Doctor,
        as: 'doctor'
      },
      attributes: { exclude: ['updatedAt', 'createdAt'], }
      
    });
    res.status(200).json({ appointments });
  } catch (error) {
    console.error('Error fetching appointments:', error);
    res.status(500).json({ message: 'An error occurred while fetching appointments.' });
  }
  
}

export const getDoctorAppointments = async (req,res)=>{
  try{
    const doctorId=req.user.id
    const doctorAppointments =await  Appointment.findAll({
      where:{doctorId},
      include:[
        {
          model:Patient,
          as: 'patient',
          include: {
            model: Appointment,
            as:'appointments'
          },
          attributes:{exclude:['password']}
        },
        {
          model:Doctor,
          as:'doctor',
          attributes:{exclude:['password']}
        },
        
      ]
    })

    res.status(200).json(doctorAppointments)

  }catch(error){
    console.error('Error fetching appointments:', error);
    res.status(500).json({ message: 'An error occurred while fetching appointments.' });

  }
}

export const updateAppointment = async (req, res) => {

  try {
    const { id } = req.params;
    const { date, selectedTime } = req.body;
    const appointment = await Appointment.findByPk(id);
    if (!appointment) {
      return res.status(404).json({ message: "Appointment not found." });
    }
    
    const [startTime, endTime] = selectedTime.split("-");

    if (!startTime || !endTime) {
      return res.status(400).json({
        message: "Invalid selectedTime format. Use 'HH:mm-HH:mm'.",
      });
    }
    
    await appointment.update({
      date,
      startTime,
      endTime
    });

    const updatedAppointment = await Appointment.findByPk(id)
    return res.status(200).json(updatedAppointment)

  } catch (error) {
    return res
      .status(500)
      .json({ message: "An error occurred while fetching appointments.","error":error.message });
  }
  
}

export const getAppointment = async (req, res) => {
  try {
    const { id } = req.params
    
    const appointment = await Appointment.findByPk(id, {
      include: [
        {
          model: Patient,
          as: "patient",
        },
        {
          model: PatientSymptom,
          as: "patientSymptom",
        },
        {
          model: Doctor,
          as:'doctor'
        }
      ],
      attributes:{exclude:['createdAt','updatedAt']}
    });
    return res.status(200).json(appointment)
  } catch (error) {
        return res
      .status(500)
      .json({ message: "An error occurred while fetching appointments.","error":error.message });
  
  }
}