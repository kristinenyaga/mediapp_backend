import express from 'express'
import { getAllDoctors, getDoctorById, login, profile, refreshToken, resendOTP, ResetPassword, signUp, updateDoctor, uploadProfileImage, verifyOTP } from '../controllers/doctorController.js'
import { Auth } from '../middleware/auth.js'
import upload from '../middleware/uploadMiddleware.js'

const router = express.Router()

router.post('/signup',signUp)
router.post('/login', login)
router.post('/resetpassword',ResetPassword)
router.post('/verifyotp',verifyOTP)
router.post('/resendotp', resendOTP)
router.post('refreshtoken',refreshToken)
router.get('/profile',Auth,profile)
router.get('/', getAllDoctors)
router.get('/:id', getDoctorById)
router.patch('/update',Auth,updateDoctor)
router.post(
  "/uploadprofile",
  upload.single("profileImage"),
  Auth,
  uploadProfileImage
);

export default router