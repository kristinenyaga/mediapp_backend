import express from 'express'
import { getSymptoms } from '../controllers/SymptomsController.js'
import { Auth } from "../middleware/auth.js";

const router = express.Router()

router.get('/',Auth, getSymptoms)

export default router