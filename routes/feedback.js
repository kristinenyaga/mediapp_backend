import express from "express";
import {
  declineFeedback,
  fetchDoctorFeedbacks,
  getAllFeedback,
  submitFeedback,
} from "../controllers/feedbackController.js";
import { Auth } from "../middleware/auth.js";

const router = express.Router();

router.get("/",getAllFeedback)
router.patch("/appointments/:appointmentId/decline",Auth, declineFeedback);

router.post("/appointments/:appointmentId/submit", Auth, submitFeedback);
router.get("/doctorfeedbacks",Auth,fetchDoctorFeedbacks)

export default router