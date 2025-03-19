import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import patientRoutes from './routes/patient.js';
import appointmentRoutes from './routes/appointment.js';
import doctorRoutes from './routes/doctor.js'
import workingHoursRoutes from './routes/workingHours.js'
import symptomRoutes from './routes/symptoms.js'
import patientSymptomsRoutes from './routes/patientSymptoms.js'
import notificationRoutes from './routes/notification.js'
import adminRoutes from './routes/admin.js'
import feedbackRoutes from './routes/feedback.js'
import diagnosisRoutes from './routes/diagnosis.js'

dotenv.config();

const app = express();

// Middleware
app.use(cors({
  origin: 'http://localhost:3000', // Frontend URL
  credentials: true, // Allow cookies to be sent
}));

app.use(express.json({ limit: '10mb' }));
app.use(morgan('tiny'));
app.disable('x-powered-by'); // Hide "X-Powered-By" header
app.use(cookieParser());

// Routes
app.use('/api/patient', patientRoutes);
app.use('/api/appointment', appointmentRoutes);
app.use('/api/doctor/',doctorRoutes)
app.use('/api/workingHours', workingHoursRoutes)
app.use('/api/symptoms', symptomRoutes)
app.use("/api/patientsymptoms", patientSymptomsRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/admin", adminRoutes)
app.use("/api/feedback", feedbackRoutes);
app.use("/api/diagnosis", diagnosisRoutes);



app.get('/test-cookies', (req, res) => {
  console.log(req.cookies); 
  res.json(req.cookies);
});

// 404 Handler
app.use((req, res) => {
  res.status(404).send('Route not found');
});

export default app;
