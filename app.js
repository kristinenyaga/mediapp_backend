import express from 'express'
import cors from 'cors'
import morgan from 'morgan'
import dotenv from 'dotenv'
import patientRoutes from './routes/patient.js'

dotenv.config();

const app = express();

//middleware
app.use(cors())
app.use(express.json({ limit: "10mb" }))
app.use(morgan('tiny'));
app.disable('x-powered-by') 

// routes
app.use('/api/patient',patientRoutes)



app.use((req, res) => {
  res.status(404).send('Route not found');
});
export default app;