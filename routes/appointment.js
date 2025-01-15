import express from "express";
import { bookAppointment, calculateAvailableSlots } from "../controllers/appointmentController.js";

const router = express.Router()

router.post('/book', bookAppointment)
router.post('/available-slots',calculateAvailableSlots)

export default router