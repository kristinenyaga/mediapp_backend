import Doctor from '../models/Doctor.js';
import Patient from '../models/Patient.js'
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import otpGenerator from "otp-generator";
import nodemailer from 'nodemailer'
import dotenv from 'dotenv'
import WorkingHours from '../models/WorkingHours.js';
import Appointment from '../models/Appointment.js';
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


export const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const doctor = await Doctor.findOne({ where: { email } });
    if (!doctor) {
      return res.status(404).json({ message: 'Doctor not found' });
    }

    const isMatch = await bcrypt.compare(password.toString(), doctor.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    const { accessToken, refreshToken } = generateToken(doctor.id, doctor.username, doctor.email);

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true, 
      secure: process.env.NODE_ENV === 'production', 
      sameSite: 'None', 
      path: '/',
    });

    // Clear old OTP and generate new one
    req.app.locals.OTP = null;
    const otp = otpGenerator.generate(6, { digits: true, upperCaseAlphabets: false, specialChars: false });
    req.app.locals.OTP = { value: otp, expiresAt: Date.now() + 10 * 60 * 1000, attempts: 0 };

    console.log('Generated OTP:', otp);
    await transporter.sendMail({
      from: process.env.EMAIL,
      to: doctor.email,
      subject: 'Your One-Time Password for Login',
      html: `
        <html>
          <body>
            <h2>Hello ${doctor.username},</h2>
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
      doctor: { id: doctor.id, username: doctor.username, email: doctor.email },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Error during login', error });
  }
};

export const signUp = async (req, res) => {
  const { username, email, password } = req.body;

  try {
    // Check if the email is already in use
    const existingPatient = await Doctor.findOne({ where: { email } });
    if (existingPatient) {
      return res.status(400).json({ message: 'Email already in use' });
    }

    // Ensure the password is a string and hash it
    const hashedPassword = await bcrypt.hash(password.toString(), 10);

    // Create a new doctor record
    const newDoctor = await Doctor.create({
      username,
      email,
      password: hashedPassword,
    });

    res.status(201).json({ message: 'Signup successful', doctor: newDoctor });
  } catch (error) {
    console.error('Signup error:', error); // Log the error for debugging
    res.status(500).json({ message: 'Server error during signup', error });
  }
};

export async function verifyOTP(req, res) {
  try {
    const { code } = req.body;
    const OTP = req.app.locals.OTP;
    console.log('sentOtp', code)
    console.log('localsOtp',OTP)
    

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

    // Find the doctor
    const doctor = await Doctor.findOne({ where: { email } });
    if (!doctor) {
      return res.status(404).json({ message: "Doctor not found" });
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
      to: doctor.email,
      subject: "Your Resent OTP for Login",
      html: `
        <html>
          <body>
            <h2>Hello Dr. ${doctor.username},</h2>
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


export const getAllDoctors = async (req, res)=> {
  try {
    const doctors = await Doctor.findAll({
      include: [
        {
          model: WorkingHours,
          as: "workinghours",
        },
        {
          model: Appointment,
          as: "appointments",
        },
      ],
      attributes: { exclude: ["password","createdAt","updatedAt"] },
    });
      return res.status(200).json(doctors)

  } catch(error) {
    console.error("Error getting all doctors:", error);
    return res.status(500).json({ message: "Server error getting all doctors", error });
  }
}

//get a doctor by id

export const getDoctorById = async (req, res) => {
  const id = req.params.id
  try {
    const doctor = await Doctor.findByPk(id, {
      include: [
        {
          model: WorkingHours,
          as: "workinghours",
        },
        {
          model: Appointment,
          as: "appointments",
          include: [
            {
              model: Patient,
              as: "patient",
            },
          ],
          attributes:{exclude:['patientId','createdAt','updatedAt']}
        },
      ],
      attributes: { exclude: ["password", "createdAt", "updatedAt"] },
    });
    if (!doctor) {
      return res.status(404).json({message:'Doctor not found'})
    }
    return res.status(200).json(doctor)
  } catch (error) {
    console.error("Error getting a doctor:", error);
    return res.status(500).json({ message: "Server error getting a doctor", error });
  }
}

//update doctor

export const updateDoctor = async (req, res) => {
  try {
    const { id } = req.user
  const { section, updatedValues } = req.body
  const doctor = await Doctor.findByPk(id)
  if (!doctor) {
    return res.status(404).json({message:'doctor not found'})
  }
  if (section === "Personal Information") {
    const { fullName, email, phone } = updatedValues
    await doctor.update({
      email: email || doctor.email,
      username: fullName || doctor.username,
      phone: phone || doctor.phone
      
    })
  }
  else if (section === "Proffesional Information") {
    const { specialization, yearsOfExperience, roomNumber } = updatedValues
    await doctor.update({
      specialization: specialization || doctor.specialization,
      room_number: roomNumber || doctor.room_number,
      yearsOfExperience: yearsOfExperience || doctor.yearsOfExperience
      
    })
  }
  else if (section === "Working Hours") {
    const { workingHours } = updatedValues
    await doctor.update({
      workingHours:JSON.stringify(workingHours)
    })
  }
  else {
      return res.status(400).json({ error: 'unable to update.' });
  }
    const updatedDoctor = await Doctor.findByPk(id);
    res.status(200).json(updatedDoctor);
    
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update profile. Please try again later.' });
  }
}
  
export const profile = async (req, res) => {
  try {
    const userId = req.user.id; 
    const doctor =  await Doctor.findByPk(userId, {
      attributes: {
        exclude: ['password'],
      },
      include: [
        {
          model: WorkingHours,
          as:'workinghours'
        }
      ]
    });

    if (!doctor) {
      return res.status(404).json({ message: 'doctor not found' });
    }

    res.status(200).json(doctor);
  } catch (error) {
    console.error('Error fetching doctor profile:', error);
    res.status(500).json({ message: 'Server error' });
  }

}