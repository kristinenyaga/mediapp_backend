import Admin from "../models/Admin.js"
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