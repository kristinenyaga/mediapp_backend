import jwt from 'jsonwebtoken'
import dotenv from 'dotenv'
dotenv.config()
export const Auth = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'No or invalid token provided' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET); 
    req.user = decoded; 
    next(); 
  } catch (error) {
    return res.status(401).json({ message: 'Token expired or invalid' });
  }
};



export function localVariables(req, res, next) {
  req.app.locals = {
    OTP: null,
    resetSession:false
  }
  next()
}