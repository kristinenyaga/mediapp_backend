import express from 'express'
import {  deleteWorkingHours, getDoctorWorkingHours, saveWorkingHours, updateWorkingHours } from '../controllers/workingHoursController.js'
import { Auth } from '../middleware/auth.js'

const router = express.Router()

router.get('/:doctorId', getDoctorWorkingHours)
router.post('/',Auth, saveWorkingHours)
router.patch('/:id', updateWorkingHours)
router.delete('/:id', deleteWorkingHours)

export default router