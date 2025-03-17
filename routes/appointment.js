import express from "express";
import {
  bookAppointment,
  calculateAvailableSlots,
  getPatientAppointment,
  getAppointments,
  getPatientAppointments,
  getDoctorAppointments,
  updateAppointment,
  cancelAppointment,
  getAppointment,
  getAvailableDoctors,
  reassignAppointment,
  updateAppointmentStatus,
} from "../controllers/appointmentController.js";
import { Auth } from "../middleware/auth.js";

const router = express.Router()

router.get("/", getAppointments);
router.get('/patient-appointments',Auth,getPatientAppointments)
router.get('/doctor-appointments',Auth,getDoctorAppointments)
router.post('/book',Auth, bookAppointment)
router.post('/available-slots', Auth, calculateAvailableSlots)
router.post('/get-available-doctors',getAvailableDoctors)
router.get("/:id", getAppointment);
router.post("/:id/reassign", Auth, reassignAppointment)
router.post("/:id/status", Auth, updateAppointmentStatus)
router.post("/:id/cancel", cancelAppointment);
router.get("/:id", Auth, getPatientAppointment);
router.patch("/:id", Auth, updateAppointment);


export default router