import express from 'express'
import { Login, profile, resendOTP } from '../controllers/adminController.js'
import { Auth } from '../middleware/auth.js'


const router = express.Router()

router.post('/login', Login)
router.post('/resendotp', resendOTP)
router.get('/profile',Auth,profile)

export default router