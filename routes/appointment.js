import express from "express";
import { bookAppointment, calculateAvailableSlots, getAppointment, getAppointments, getPatientAppointments } from "../controllers/appointmentController.js";
import { Auth } from "../middleware/auth.js";

const router = express.Router()

router.get('/patient-appointments',Auth,getPatientAppointments)
router.post('/book',Auth, bookAppointment)
router.post('/available-slots', Auth, calculateAvailableSlots)
router.get('/', getAppointments)
router.get('/:id', Auth, getAppointment)

export default router