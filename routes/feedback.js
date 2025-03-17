import express from "express";
import {
  declineFeedback,
  submitFeedback,
} from "../controllers/feedbackController.js";
import { Auth } from "../middleware/auth.js";

const router = express.Router();

router.patch("/appointments/:appointmentId/decline",Auth, declineFeedback);

router.post("/appointments/:appointmentId/submit",Auth, submitFeedback);

export default router