import express from 'express'
import { signUp, login, updatePatient, getPatient, verifyOTP, resendOTP, profile, refreshToken, getAllPatients, generateOtp, resetPassword } from '../controllers/patientController.js'
import { Auth } from '../middleware/auth.js'
const router = express.Router()

router.get('/',getAllPatients)
router.post('/signup', signUp)
router.post('/login', login)
router.get('/profile', Auth, profile)
router.post('/refreshtoken',refreshToken)
router.patch('/:id', updatePatient)
router.get('/:id',getPatient)
router.post('/verifyotp', verifyOTP)
router.post('/resendotp', resendOTP)
router.post('/generateotp', generateOtp)
router.post('/resetpassword',resetPassword)

export default router