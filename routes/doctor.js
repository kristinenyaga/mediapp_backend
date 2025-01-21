import express from 'express'
import { getAllDoctors, getDoctorById, login, profile, resendOTP, signUp, updateDoctor, verifyOTP } from '../controllers/doctorController.js'
import { Auth } from '../middleware/auth.js'

const router = express.Router()

router.post('/signup',signUp)
router.post('/login', login)
router.post('/verifyotp',verifyOTP)
router.post('/resendotp', resendOTP)
router.get('/profile',Auth,profile)
router.get('/', getAllDoctors)
router.get('/:id', getDoctorById)
router.patch('/update',Auth,updateDoctor)


export default router