import express from "express";
import { bookAppointment } from "../controllers/appointmentController.js";

const router = express.Router()

router.post('/book', bookAppointment)

export default router