import express from 'express'
import {  addWorkingHours, deleteWorkingHours, getDoctorWorkingHours, saveWorkingHours, updateWorkingHours } from '../controllers/workingHoursController.js'
import { Auth } from '../middleware/auth.js'

const router = express.Router()

router.post("/:id",addWorkingHours );

router.get('/:doctorId', getDoctorWorkingHours)
router.post('/',Auth, saveWorkingHours)
router.patch('/:id', updateWorkingHours)
router.delete('/:id', deleteWorkingHours)

export default router