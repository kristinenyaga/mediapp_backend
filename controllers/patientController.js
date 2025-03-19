import Patient from '../models/Patient.js';
import Doctor from "../models/Doctor.js";
import Admin from "../models/Admin.js";
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import otpGenerator from "otp-generator";
import nodemailer from 'nodemailer'
import dotenv from 'dotenv'
import EmergencyContact from '../models/EmergencyContact.js';
import MedicalInformation from '../models/MedicalInformation.js';
import Appointment from '../models/Appointment.js';
dotenv.config()
const JWT_SECRET = process.env.JWT_SECRET

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

const generateToken = (id, username, email) => {
  const accessToken = jwt.sign(
    { id, username, email },
    JWT_SECRET,
    { expiresIn: "1h" }
  );

  const refreshToken = jwt.sign(
    { id,username, email, },
    JWT_SECRET,
    { expiresIn: "7d" }
  );
  return { accessToken, refreshToken }
  
}
export const refreshToken = async (req, res) => {
  const { token } = req.body;

  if (!token) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    // Decode the token synchronously
    const decoded = jwt.verify(token, JWT_SECRET);

    // Generate a new access token
    const { accessToken } = generateToken(
      decoded.id,
      decoded.username,
      decoded.email
    );

    // Respond with the new access token
    res.json({ accessToken });
  } catch (err) {
    // Handle invalid or expired token
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({ message: "Token expired" });
    }
    res.status(403).json({ message: "Forbidden" });
  }
};

export const generateOtp = async (req, res) => {
  try {
    const { email,userType } = req.body
    
    let user;
    if (userType === 'patient') {
      user = await Patient.findOne({ where: { email } })
    }
    else if (userType === 'doctor') {
      user = await Doctor.findOne({where:{email}})
    }
    else {
      user = Admin.findOne({ where: { email } });
    }

    if (!user) {
      return res.status(404).json({ message: "User not found." })
    }

    req.app.locals.OTP = null;
    const otp = otpGenerator.generate(6, {
      digits: true,
      upperCaseAlphabets: false,
      specialChars: false,
    });
    req.app.locals.OTP = {
      value: otp,
      expiresAt: Date.now() + 5 * 60 * 1000,
      attempts: 0,
    };

    await transporter.sendMail({
      from: process.env.EMAIL,
      to: user.email, 
      subject: "Your One-Time Password",
      html: `
        <html>
          <body>
            <h2>Hello ${user.username},</h2>
            <p>Your one-time password (OTP) is:</p>
            <h3>${otp}</h3>
            <p>This OTP will expire in 5 minutes.</p>
          </body>
        </html>
      `,
    });
    res.json({ message: "OTP sent successfully." });
  } catch (error) {
     res.status(500).json({ message: "Error sending OTP", error });
  }
}

export const resetPassword = async (req, res) => {
  try {
    const { email, newPassword, userType } = req.body;

    let user;
    if (userType === "patient") {
      user = await Patient.findOne({ where: { email } });
    } else if (userType === "doctor") {
      user = await Doctor.findOne({ where: { email } });
    } else {
      user = await Admin.findOne({ where: { email } });
    }

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    const hashedPassword = await bcrypt.hash(newPassword.toString(), 10);
    await user.update({ password: hashedPassword });

    res.json({ message: "Password reset successful. You can now log in." });
  } catch (error) {
    res.status(500).json({ message: "Error resetting password", error });
  }
};

export const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const patient = await Patient.findOne({ where: { email } });
    if (!patient) {
      return res.status(404).json({ message: 'Patient not found' });
    }

    const isMatch = await bcrypt.compare(password.toString(), patient.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const { accessToken, refreshToken } = generateToken(patient.id, patient.username, patient.email);
    

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true, 
      secure: process.env.NODE_ENV === 'production', 
      sameSite: 'None', 
      path: '/',
    });

    // Clear old OTP and generate new one
    req.app.locals.OTP = null;
    const otp = otpGenerator.generate(6, { digits: true, upperCaseAlphabets: false, specialChars: false });
    req.app.locals.OTP = { value: otp, expiresAt: Date.now() + 5 * 60 * 1000, attempts: 0 };

    await transporter.sendMail({
      from: process.env.EMAIL,
      to: patient.email,
      subject: 'Your One-Time Password for Login',
      html: `
        <html>
          <body>
            <h2>Hello ${patient.username},</h2>
            <p>Your one-time password (OTP) is:</p>
            <h3>${otp}</h3>
            <p>Please use this OTP to log in. It will expire in 5 minutes.</p>
          </body>
        </html>
      `,
    });


    res.status(200).json({
      message: 'Login successful. OTP sent to email.',
      accessToken,
      refreshToken,
      patient: { id: patient.id, username: patient.username, email: patient.email },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Error during login', error });
  }
};

export async function verifyOTP(req, res) {
  try {
    const { code } = req.body;
    const OTP = req.app.locals.OTP;

    if (!OTP || Date.now() > OTP.expiresAt) {
      req.app.locals.OTP = null;
      return res.status(400).send({ error: "OTP has expired. Please request a new one." });
    }

    // Compare OTP as strings
    if (code === OTP.value) {
      req.app.locals.OTP = null;
      req.app.locals.resetSession = false;
      return res.status(200).send({ msg: "OTP Verified Successfully!" });
    }

    OTP.attempts += 1;
    if (OTP.attempts > 3) {
      req.app.locals.OTP = null;
      return res.status(400).send({ error: "Too many failed attempts. Please request a new OTP." });
    }

    return res.status(400).send({ error: "Invalid OTP" });
  } catch (error) {
    console.error("Error during OTP verification:", error);
    return res.status(500).send({ error: "Server error during OTP verification" });
  }
}

export const resendOTP = async (req, res) => {
  try {
    const { email } = req.body

    if (!email) {
      return res.status(400).json({ message: 'Email not found in token' });
    }

    // Find the patient
    const patient = await Patient.findOne({ where: { email } });
    if (!patient) {
      return res.status(404).json({ message: "Patient not found" });
    }

    // // Check rate limiting: Ensure the previous OTP is not resent too soon
    // const OTP = req.app.locals.OTP;
    // if (OTP && OTP.expiresAt > Date.now()) {
    //   const remainingTime = Math.ceil((OTP.expiresAt - Date.now()) / 1000);
    //   return res.status(429).json({
    //     message: `Please wait ${remainingTime} seconds before requesting a new OTP.`,
    //   });
    // }

    // Generate a new OTP
    req.app.locals.OTP = null;
    const otp = otpGenerator.generate(6, { digits: true, upperCaseAlphabets: false, specialChars: false });
    req.app.locals.OTP = { value: otp, expiresAt: Date.now() + 5 * 60 * 1000, attempts: 0 }; // 5 minutes expiry

    // Send OTP via email
    console.log('Resent OTP:', otp);
    await transporter.sendMail({
      from: process.env.EMAIL,
      to: patient.email,
      subject: "Your Resent OTP for Login",
      html: `
        <html>
          <body>
            <h2>Hello ${patient.username},</h2>
            <p>Your new one-time password (OTP) is:</p>
            <h3>${otp}</h3>
            <p>Please use this OTP to log in. It will expire in 5 minutes.</p>
          </body>
        </html>
      `,
    });

    return res.status(200).json({ message: "OTP resent successfully!" });
  } catch (error) {
    console.error("Error during OTP resend:", error);
    return res.status(500).json({ message: "Server error during OTP resend", error });
  }
};

// Signup
export const signUp = async (req, res) => {
  const { username, email, password, phone,dob,gender } = req.body;

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
      dob,
      gender
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

  try {
    // Find the patient by ID
    const patient = await Patient.findByPk(id, {
      include: [
        {
        model: EmergencyContact,
        as:'emergencycontact'
        },
        {
          model: MedicalInformation,
          as:'medicalinformation'

        }
      ]
    });

    // Check if the patient exists
    if (!patient) {
      return res.status(404).json({ message: 'Patient not found' });
    }

    await patient.update(req.body.patient)

    if (req.body.emergencyContact) {
      const existingEmergencyContact = await EmergencyContact.findOne({ where: { patientId: id } });
      
      if (existingEmergencyContact) {
        await existingEmergencyContact.update(req.body.emergencyContact);
      } else {
        await EmergencyContact.create({
          patientId: id,
          ...req.body.emergencyContact,
        });
      }
    }
    if (req.body.medicalInformation) {
      const existingmedicalInformation = await MedicalInformation.findOne({ where: { patientId: id } })
      if (existingmedicalInformation) {
        await MedicalInformation.update(req.body.medicalInformation,)
      }
      else {
        await MedicalInformation.create({
          patientId: id,
          ...req.body.emergencyContact
        })
      }

    }
    const updatedPatient = await Patient.findByPk(id, {
      include: [
        {
          model: EmergencyContact,
          as: 'emergencycontact'
        },
        {
          model: MedicalInformation,
          as: 'medicalinformation'
        }
      ]
    });

    res.status(200).json({
      message: 'Patient updated successfully',
      patient: updatedPatient
    });
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
    const patient = await Patient.findByPk(id, {
      include: [
        {
          model: EmergencyContact,
          as: "emergencycontact",
        },
        {
          model: MedicalInformation,
          as: "medicalinformation",
        },
        {
          model: Appointment,
          as: "appointments",
        },
      ],
      attributes:{exclude:['password','createdAt','updatedAt']}
    });

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

export const profile = async (req, res) => {
  try {
    const userId = req.user.id; 
    const user =  await Patient.findByPk(userId, {
      include: [
        {
        model: EmergencyContact,
        as:'emergencycontact'
        },
        {
          model: MedicalInformation,
          as:'medicalinformation'

        }
      ],
      attributes:{exclude:['password']}
    });

    if (!user) {
      return res.status(404).json({ message: 'user not found' });
    }

    res.status(200).json(user);
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ message: 'Server error' });
  }

}

export const getAllPatients = async (req, res) => {
  try {
    const patients = await Patient.findAll({
      include: [
        {
          model: Appointment,
          as: "appointments",
        },
        {
          model: EmergencyContact,
          as: "emergencycontact",
        },
        {
          model: MedicalInformation,
          as: "medicalinformation",
        },
      ],
      attributes: { exclude: ["password", "updatedAt"] },
    });

    return res.status(200).json(patients)
  } catch (error) {
      console.error("Error fetching user profile:", error);
      res.status(500).json({ message: "Server error" });
  }
}