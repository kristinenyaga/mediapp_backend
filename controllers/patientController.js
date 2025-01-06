import Patient from '../models/Patient.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import otpGenerator from "otp-generator";
import nodemailer from 'nodemailer'
import dotenv from 'dotenv'
dotenv.config()
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  auth: {
    user: "nyagakristine@gmail.com",
    pass: "kmdc fohd edtx dgbl",
  },
});

// Login
export const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    // Validate inputs
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    // Check if the patient exists
    const patient = await Patient.findOne({ where: { email } });
    if (!patient) {
      return res.status(404).json({ message: 'Patient not found' });
    }

    // Compare the provided password with the hashed password
    const isMatch = await bcrypt.compare(password.toString(), patient.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Generate a JWT
    const token = jwt.sign({ id: patient.id, email: patient.email }, JWT_SECRET, {
      expiresIn: '1h', // Token expires in 1 hour
    });

    // Generate OTP 
    const otp = otpGenerator.generate(6, { digits: true, upperCaseAlphabets: false, specialChars: false });
    req.app.locals.OTP = otp;  
    req.app.locals.resetSession = false; 

    // Send OTP to email
    console.log('otp', otp)
    const mailOptions = {
      from: process.env.EMAIL,
      to: patient.email,
      subject: 'Your One-Time Password for Login',
      text: `Hello ${patient.username},\n\nYour one-time password (OTP) is: ${otp}\nPlease use this OTP to log in.`,
      html: `
    <html>
      <body>
        <h2>Hello ${patient.username},</h2>
        <p>Your one-time password (OTP) is:</p>
        <h3 style="font-size:'20px';font-weight:'medium'">${otp}</h3>
        <p>Please use this OTP to log in.</p>
      </body>
    </html>
  `,
    };

    await transporter.sendMail(mailOptions);
    res.cookie('authToken', token, {
      httpOnly: true,
      secure: false,
      maxAge: 3600000, 
      sameSite: 'strict', 
      
    })
    res.status(200).json({
      message: 'Login successful',
      token,
      patient: { id: patient.id, username: patient.username, email: patient.email },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Error during login', error });
  }
};
export async function verifyOTP(req, res) {
  const { code } = req.query
  console.log(code,req.app.locals.OTP)
  if (parseInt(code) === parseInt(req.app.locals.OTP)) {
    req.app.locals.OTP = null 
    req.app.locals.resetSession = false 
    return res.status(201).send({ msg: "OTP Verified Successsfully!" });
  }
  return res.status(400).send({ error: "Invalid OTP" });
}

// Signup
export const signUp = async (req, res) => {
  const { username, email, password, phone } = req.body;

  try {
    // Check if the email is already in use
    const existingPatient = await Patient.findOne({ where: { email } });
    if (existingPatient) {
      return res.status(400).json({ message: 'Email already in use' });
    }

    // Ensure the password is a string and hash it
    const hashedPassword = await bcrypt.hash(password.toString(), 10);

    // Create a new patient record
    const newPatient = await Patient.create({
      username,
      email,
      password: hashedPassword,
      phone,
    });

    res.status(201).json({ message: 'Signup successful', patient: newPatient });
  } catch (error) {
    console.error('Signup error:', error); // Log the error for debugging
    res.status(500).json({ message: 'Server error during signup', error });
  }
};

// update patient
export const updatePatient = async (req, res) => {
  const { id } = req.params;
  const { username, email, phone } = req.body;

  try {
    // Find the patient by ID
    const patient = await Patient.findByPk(id);

    // Check if the patient exists
    if (!patient) {
      return res.status(404).json({ message: 'Patient not found' });
    }

    // Update patient details
    patient.username = username || patient.username;
    patient.email = email || patient.email;
    patient.phone = phone || patient.phone;

    await patient.save(); // Save changes to the database

    res.status(200).json({ message: 'Patient updated successfully', patient });
  } catch (error) {
    console.error('Error updating patient:', error);
    res.status(500).json({ message: 'Error updating patient details', error });
  }
};

// Get Patient by ID
export const getPatient = async (req, res) => {
  const { id } = req.params;

  try {
    // Find the patient by ID
    const patient = await Patient.findByPk(id);

    // Check if the patient exists
    if (!patient) {
      return res.status(404).json({ message: 'Patient not found' });
    }

    res.status(200).json(patient);
  } catch (error) {
    console.error('Error fetching patient:', error);
    res.status(500).json({ message: 'Error fetching patient details', error });
  }
};

