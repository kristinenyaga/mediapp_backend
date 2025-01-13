import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";

const WorkingHours = sequelize.define('WorkingHours', {
    id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  dayOfWeek: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      isIn: [['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']],
    }
  },
  startTime: {
    type: DataTypes.TIME,
    allowNull:false
  },
  endTime: {
    type: DataTypes.TIME,
    allowNull:false
  },
    doctorId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Doctors', 
      key: 'id',
    },
  },
    
},{
  timestamps: true 
})

export default WorkingHours