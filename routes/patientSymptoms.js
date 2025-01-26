import express from 'express'
import { submitSymptoms } from '../controllers/patientSymptomsController.js'

const router = express.Router()

router.post('/submit-symptoms', submitSymptoms)

export default router