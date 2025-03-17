import Admin from "../models/Admin.js"
import Doctor from "../models/Doctor.js"
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import otpGenerator from "otp-generator";
import nodemailer from "nodemailer";
import dotenv from "dotenv";
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
const generateToken = (id, name, email) => {
  const accessToken = jwt.sign(
    { id, name, email },
    JWT_SECRET,
    { expiresIn: "1h" }
  );

  const refreshToken = jwt.sign(
    { id,name, email, },
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
      decoded.name,
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
export const Login = async (req,res) => {
  const { email, password } = req.body
  
  try {
    const admin = await Admin.findOne({ where: { email } })
    if (!admin) {
      return res.status(401).json({message:'admin account not found'})
    }

    const isMatch = await bcrypt.compare(password.toString(), admin.password)
    console.log(isMatch);

    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }
    const { accessToken, refreshToken } = generateToken(admin.id, admin.name, admin.email);

    req.app.locals.OTP = null;
    const otp = otpGenerator.generate(6, { digits: true, upperCaseAlphabets: false, specialChars: false });
    req.app.locals.OTP = { value: otp, expiresAt: Date.now() + 5 * 60 * 1000, attempts: 0 };

    await transporter.sendMail({
      from: process.env.EMAIL,
      to: admin.email,
      subject: 'Your One-Time Password for Login',
      html: `
        <html>
          <body>
            <h2>Hello ${admin.name},</h2>
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
    });
  }
  catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Error during login", error });
  }
}

export const resendOTP = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email not found in token" });
    }

    // Find the admin
    const admin = await Admin.findOne({ where: { email } });
    if (!admin) {
      return res.status(404).json({ message: "Admin not found" });
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
    const otp = otpGenerator.generate(6, {
      digits: true,
      upperCaseAlphabets: false,
      specialChars: false,
    });
    req.app.locals.OTP = {
      value: otp,
      expiresAt: Date.now() + 5 * 60 * 1000,
      attempts: 0,
    }; // 5 minutes expiry

    // Send OTP via email
    console.log("Resent OTP:", otp);
    await transporter.sendMail({
      from: process.env.EMAIL,
      to: admin.email,
      subject: "Your Resent OTP for Login",
      html: `
        <html>
          <body>
            <h2>Hello ${admin.username},</h2>
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
    return res
      .status(500)
      .json({ message: "Server error during OTP resend", error });
  }
};

export const profile = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await Admin.findByPk(userId, {
      attributes: { exclude: ["password"] },
    });

    if (!user) {
      return res.status(404).json({ message: "user not found" });
    }

    res.status(200).json(user);
  } catch (error) {
    console.error("Error fetching user profile:", error);
    res.status(500).json({ message: "Server error" });
  }
};

const generatePassword = () => {
  return Math.random().toString(36).slice(-8)
}

export const addDoctor = async () => {
  try {
    const { doctors } = req.body;
    if (!Array.isArray(doctors) || doctors.length === 0) {
      return res.status(400).json({ message: "invalid doctor data" });
    }

    await Promise.all(
      doctors.map(async (doctor) => {
        const password = generatePassword();
        const hashedPassword = await bcrypt.hash(password, 10);

        await Doctor.create({
          username: doctors.username,
          email: doctor.email,
          phone: doctor.phone,
          specialization: doctor.specialization,
          experience: doctor.experience,
          roomNumber: doctor.roomNumber,
          password: hashedPassword,
          isFirstLogin: true,
        });

        await transporter.sendMail({
          from: process.env.EMAIL_USER,
          to: doctor.email,
          subject: "Your Doctor Account Details",
          text: `Hello ${doctor.username},\n\nYour account has been created.\nLogin details:\nEmail: ${doctor.email}\nPassword: ${password}\n\nPlease log in and change your password immediately.`,
        });
      })
    );
    res
      .status(201)
      .json({ message: "Doctors added successfully!" });
  } catch (error) {
    console.error("Error adding doctors:", error);
    res.status(500).json({ message: "Server error. Please try again later." });
  }
}