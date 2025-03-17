import { DataTypes } from 'sequelize'; 
import { sequelize } from '../config/db.js'; 

const Doctor = sequelize.define("Doctor", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  username: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true,
    },
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  phone: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  specialization: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  yearsOfExperience: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  room_number: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  status: {
    type: DataTypes.STRING,
    defaultValue: "active", // Can be 'active', 'on leave'
  },
  isFirstLogin: {
    type: DataTypes.STRING,
  },
});

export default Doctor;