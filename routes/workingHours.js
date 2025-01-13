import express from 'express'
import { addWorkingHours, deleteWorkingHours, getDoctorWorkingHours, updateWorkingHours } from '../controllers/workingHoursController.js'

const router = express.Router()

router.get('/:doctorId', getDoctorWorkingHours)
router.post('/', addWorkingHours)
router.patch('/:id', updateWorkingHours)
router.delete('/:id', deleteWorkingHours)

export default router