import express from 'express'
import { signUp, login, updatePatient, getPatient } from '../controllers/patientController.js'

const router = express.Router()

router.post('/signup', signUp)
router.post('/login', login)
router.put('/:id', updatePatient)
router.get('/:id',getPatient)

export default router