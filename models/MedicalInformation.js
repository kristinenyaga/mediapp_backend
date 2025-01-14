import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";

const MedicalInformation = sequelize.define('MedicalInformation', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey:true
  },
  patientId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Patients',
      key: 'id',
    },
  },
  allergies: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  medications: {
    type: DataTypes.STRING,
    allowNull: true,
  },
})

export default MedicalInformation