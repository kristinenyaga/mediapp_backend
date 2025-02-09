import express from 'express'
import { submitSymptoms, updateSymptoms } from '../controllers/patientSymptomsController.js'
import { Auth } from '../middleware/auth.js'

const router = express.Router()

router.post('/submit-symptoms', submitSymptoms)
router.patch('/:id',updateSymptoms)

export default router