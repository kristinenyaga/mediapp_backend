import express from "express";
import { getNotifications } from "../controllers/notificationController.js";
import { Auth } from "../middleware/auth.js";

const router = express.Router()

router.get('/',Auth, getNotifications)

export default router