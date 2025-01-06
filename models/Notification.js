import { DataTypes } from 'sequelize';
import { sequelize } from '../config/db.js'; 

const Notification = sequelize.define('Notification', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  type: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  recipient_email: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      isEmail: true,
    },
  },
  message: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  status: {
    type: DataTypes.ENUM('pending', 'sent', 'failed'),
    defaultValue: 'pending',
  },
  appointment_id: {
    type: DataTypes.INTEGER,
    references: {
      model: 'Appointments',
      key: 'id',
    },
    allowNull: false,
  },
}, {
  timestamps: true,
});

export default Notification;
