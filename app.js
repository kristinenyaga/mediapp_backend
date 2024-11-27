import express from 'express'
import cors from 'cors'
import morgan from 'morgan'
import dotenv from 'dotenv'


dotenv.config();

const app = express();

app.use(cors())
app.use(express.json({ limit: "10mb" }))
app.use(morgan('tiny'));
app.disable('x-powered-by') 

app.use((req, res) => {
  res.status(404).send('Route not found');
});

export default app;