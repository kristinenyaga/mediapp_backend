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
    const type = 'appointment_confirmation'
    const emailTitle = 'Appointment Confirmation'
    const message = `Your appointment with Dr. ${selectedDoctor.username} on ${newAppointment.date} at ${newAppointment.startTime} has been confirmed.`;
    // Notify patient and doctor
    handleAppointmentNotification(newAppointment,type, emailTitle,message,selectedDoctor, patientEmail, appointmentDate, requestedTime);
  } catch (error) {
    console.error("Error booking appointment:", error);
    return res.status(500).json({
      message: "Internal server error.",
    });
  }
};

export const cancelAppointment = async (req, res) => {
  try {
    const { id } = req.params;  
    const appointment = await Appointment.findByPk(id);

    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    appointment.status = 'cancelled'; 
    await appointment.save();

    const cancelledAppointment = await Appointment.findByPk(id, {
      include: [
        {
          model: Doctor,
          as: "doctor",
        },
        {
          model: Patient,
          as: "patient",
        },
      ],
    });

        const type = "appointment_cancellation";
        const emailTitle = "Appointment Cancellation";
        const message = `Your appointment on ${cancelledAppointment.date} at ${cancelledAppointment.startTime} has been cancelled`;

        handleAppointmentNotification(
          cancelledAppointment,
          type,
          emailTitle,
          message,
        );

    res.status(200).json(cancelledAppointment);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error canceling appointment' });
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
      where: {
        date: {
          [Op.eq]: date,
        },
        status: { [Op.ne]: "cancelled" },
      },
    };
    console.log("appointmentsQuery", appointmentsQuery);
    
    if (doctorId) {
      appointmentsQuery.where.doctorId = doctorId;
    }

    const existingAppointments = await Appointment.findAll(appointmentsQuery);

    console.log("existingAppointments", existingAppointments);

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

    console.log("triggered");

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
    
    const getTimeslot = (startTime) => {
      console.log('start time',startTime)
      const hour = parseInt(startTime.split(":")[0], 10);
      return hour < 12 ? "morning" : "afternoon";
    }
    // Add timeslot field to the response
    const appointmentData = {
      ...appointment.toJSON(),
      timeSlot: getTimeslot(appointment.startTime),
    };
    

    if (appointment.patientSymptom?.symptoms) {
      let symptomIds = appointment.patientSymptom?.symptoms;

      const symptoms = await Symptom.findAll({
        where: {
          id: symptomIds,
        },
        attributes: ["name", "id"],
      });

      appointmentData.patientSymptom.symptoms = symptoms;
    }


    return res.status(200).json({ appointmentData })
    

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
export const updateAppointmentStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const appointment = await Appointment.findByPk(id, {
      include: [
        {
          model: Patient,
          as: "patient",
        },
      ],
    });
    if (!appointment) {
      return res.status(404).json({ message: "Appointment not found." });
    }

    if (!status) {
      return res.status(400).json({ message: "Status is required." });
    }

    const feedbackStatus =
      status.toLowerCase() === "completed"
        ? "prompted"
        : appointment.feedbackStatus;

    await appointment.update({ status, feedbackStatus });

    res.status(200).json(appointment);

    if (status === 'completed') {
      const type = "appointment_update";
      const emailTitle = "Appointment Update";
      const message = `Your appointment has been completed`
      const patientEmail = appointment.patient.email;
      
      handleAppointmentNotification(
        appointment,
        type,
        emailTitle,
        message,
        patientEmail
      );
    }
    else if (status === 'cancelled') {
      const type = "appointment_update";
      const emailTitle = "Appointment Cancellation";
      const message = `Your appointment has been cancelled`;
      const patientEmail = appointment.patient.emai
      handleAppointmentNotification(
        appointment,
        type,
        emailTitle,
        message,
        patientEmail
      );
    }
    else {
      const type = "appointment_update";
      const emailTitle = "Appointment Restored";
      const message = `Your appointment has been restored at ${appointment.startTime}`;
      const patientEmail = appointment.patient.emai;
      handleAppointmentNotification(
        appointment,
        type,
        emailTitle,
        message,
        patientEmail
      );
    }
  } catch (error) {
    return res.status(500).json({
      message: "An error occurred while updating the appointment status.",
      error: error.message,
    });
  }
};

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

    const getTimeslot = (startTime) => {
      console.log("start time", startTime);
      const hour = parseInt(startTime.split(":")[0], 10);
      return hour < 12 ? "morning" : "afternoon";
    };
        // Add timeslot field to the response
        const appointmentData = {
          ...appointment.toJSON(),
          timeSlot: getTimeslot(appointment.startTime),
        };
        if (appointment.patientSymptom?.symptoms) {
          let symptomIds = appointment.patientSymptom?.symptoms;

          const symptoms = await Symptom.findAll({
            where: {
              id: symptomIds,
            },
            attributes: ["name", "id"],
          });

          appointmentData.patientSymptom.symptoms = symptoms;
        }
    return res.status(200).json(appointmentData)
  } catch (error) {
        return res
      .status(500)
      .json({ message: "An error occurred while fetching appointments.","error":error.message });
  
  }
}

export const getAvailableDoctors = async (req, res) => {
  
  try {
    const { date, startTime, endTime } = req.body;

    if (!date || !startTime || !endTime) {
      return res
        .status(400)
        .json({ message: "Date, startTime, and endTime are required." });
    }
    const doctors = await Doctor.findAll()

    const busyDoctors = await Appointment.findAll({
      where: { date, startTime, endTime },
      attributes:['doctorId']
    })

    const availableDoctors = doctors.filter(doctor => !busyDoctors.includes(doctor.id))
    
    res.status(200).json(availableDoctors)
    
  } catch (error) {
    console.error("Error fetching available doctors:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export const reassignAppointment = async (req, res) => {
  try {
    const patientId = req.user.id;
    const { id } = req.params;
    const { doctorId } = req.body;


    const patient = await Patient.findByPk(patientId)
    if (!patient) {
      return res.status(404).json({ message: "Appointment not found" });
    }

    const appointment = await Appointment.findByPk(id);

    if (!appointment) {
      return res.status(404).json({ message: "Appointment not found" });
    }

    await appointment.update({
      doctorId,
    });

    const updatedAppointment = await Appointment.findByPk(id, {
      include: [
        {
          model: Doctor,
          as: "doctor",
        },
        {
          model: Patient,
          as: "patient",
        },
      ],
    });
    res.status(200).json(updatedAppointment)

    const type = "appointment_update";
    const emailTitle = "Appointment Update";
    const message = `Your appointment has been reassigned to Dr. ${updatedAppointment.doctor.username} on ${updatedAppointment.date} at ${updatedAppointment.startTime}. (The time and date remain unchanged.)`;
    
    const patientEmail = patient.email

    handleAppointmentNotification(
      updatedAppointment,
      type,
      emailTitle,
      message,
      patientEmail,
    );
  }
  catch (error) {
    console.error("Error reassigning a doctor", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
  
}