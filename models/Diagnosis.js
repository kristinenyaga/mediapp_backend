import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";

const Diagnosis = sequelize.define("Diagnosis", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },

  appointmentId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: "Appointments",
      key: "id",
    },
  },
  predictedDiagnosis: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  finalDiagnosis: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  isApproved: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  confidence: {
    type: DataTypes.FLOAT,
    allowNull:true
  }
});

export default Diagnosis;
