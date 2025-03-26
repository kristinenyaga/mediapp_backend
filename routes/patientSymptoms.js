import express from 'express'
import { getPatientSymptoms, submitSymptoms, updateSymptoms } from '../controllers/patientSymptomsController.js'
import { Auth } from '../middleware/auth.js'

const router = express.Router()

router.get("/",getPatientSymptoms)
router.post('/submit-symptoms', submitSymptoms)
router.patch('/:id',updateSymptoms)

export default router