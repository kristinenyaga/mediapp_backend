import cron from "node-cron";
import { Op } from "sequelize";
import Appointment from "../models/Appointment.js";
import { sendEmail } from "../utils/emailService.js";
import Patient from "../models/Patient.js"

const sendAppointmentReminders = async () => {
  const now = new Date();
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0); // Start of the day
  const endOfDay = new Date(now);
  endOfDay.setHours(23, 59, 59, 999); // End of the day

  // Find today's appointments that are still pending
  const upcomingAppointments = await Appointment.findAll({
    where: {
      date: { [Op.between]: [startOfDay, endOfDay] }, // Only today's appointments
      status: "pending",
    },
    include: [{ model: Patient, as: "patient" }],
  });

  upcomingAppointments.forEach(async (appointment) => {
    const appointmentTime = new Date(
      `${appointment.date} ${appointment.startTime}`
    );
    const timeDiff = (appointmentTime - now) / (1000 * 60); // Convert to minutes

    if (timeDiff > 0 && timeDiff <= 30) {
      // Check if it's within the next 30 minutes
      await sendEmail(
        appointment.patient.email,
        "Appointment Reminder",
        `Hello ${appointment.patient.username}, you have an appointment scheduled for today at ${appointment.startTime}. Please be on time.`
      );
      console.log(
        `Reminder sent to ${appointment.patient.email} for appointment at ${appointment.startTime}`
      );
    }
  });
};

// Run the job every 15 minutes
cron.schedule("*/30 * * * *", sendAppointmentReminders); // Runs every 15 minutes

  
// const markMissedAppointments = async () => {
//   const now = new Date();

//   try {
//     const missedAppointments = await Appointment.findAll({
//       where: {
//         date: { [Op.lt]: now }, // Past dates only
//         status: "pending", // Only pending appointments
//       },
//     });

//     if (missedAppointments.length === 0) {
//       console.log("No missed appointments to mark.");
//       return;
//     }

//     await Appointment.update(
//       { status: "missed" },
//       {
//         where: {
//           id: missedAppointments.map((appt) => appt.id), // Update all found appointments
//         },
//       }
//     );

//     console.log(`${missedAppointments.length} appointments marked as missed.`);
//   } catch (error) {
//     console.error("Error marking missed appointments:", error);
//   }
// };

// For testing: Runs every hour
// cron.schedule("0 * * * *", markMissedAppointments);

// export { sendAppointmentReminders };
