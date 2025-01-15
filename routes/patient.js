import express from 'express'
import { signUp, login, updatePatient, getPatient, verifyOTP, resendOTP, profile } from '../controllers/patientController.js'
import { Auth } from '../middleware/auth.js'
const router = express.Router()

router.post('/signup', signUp)
router.post('/login', login)
router.get('/profile',Auth,profile)
router.patch('/:id', updatePatient)
router.get('/:id',getPatient)
router.post('/verifyotp', verifyOTP)
router.post('/resendotp', resendOTP)

export default router