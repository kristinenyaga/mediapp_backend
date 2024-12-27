import { DataTypes } from 'sequelize'; 
import {sequelize} from '../config/db.js'; 

const Doctor = sequelize.define('Doctor', {
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
  specialization: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  availability: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  room_number: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  working_hours_start: {
    type: DataTypes.TIME,
    allowNull: false,
  },
  working_hours_end: {
    type: DataTypes.TIME,
    allowNull: false,
  },
  status: {
    type: DataTypes.STRING,
    defaultValue: 'active', // Can be 'active', 'on leave'
  },

});

export default Doctor;