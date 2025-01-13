import express from 'express'
import { getAllDoctors, getDoctorById, login, resendOTP, signUp, updateDoctor, verifyOTP } from '../controllers/doctorController.js'

const router = express.Router()

router.post('/signup',signUp)
router.post('/login', login)
router.post('/verifyotp',verifyOTP)
router.post('/resendotp', resendOTP)
router.get('/', getAllDoctors)
router.get('/:id', getDoctorById)
router.patch('/:id',updateDoctor)


export default router