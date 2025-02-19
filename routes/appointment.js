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
} from "../controllers/appointmentController.js";
import { Auth } from "../middleware/auth.js";

const router = express.Router()

router.get('/patient-appointments',Auth,getPatientAppointments)
router.get('/doctor-appointments',Auth,getDoctorAppointments)
router.post('/book',Auth, bookAppointment)
router.post('/available-slots', Auth, calculateAvailableSlots)
router.get('/', getAppointments)
router.get("/:id", getAppointment);
router.delete("/:id", cancelAppointment);
router.get("/:id", Auth, getPatientAppointment);
router.patch("/:id", Auth, updateAppointment);


export default router