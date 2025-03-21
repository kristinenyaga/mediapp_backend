import express from 'express'
import { approveDiagnosis, getAllDiagnoses, getDiagnosisByAppointment, updateDiagnosis } from '../controllers/diagnosisController.js'

const router = express.Router()

router.get("/",getAllDiagnoses)
router.get('/:appointmentId', getDiagnosisByAppointment)
router.patch("/approve/:appointmentId", approveDiagnosis);
router.patch("/disapprove/:appointmentId", updateDiagnosis);


export default router