import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";

const PatientSymptom = sequelize.define("PatientSymptom", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  additionalInfo: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  appointmentId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: "Appointments",
      key: "id",
    },
  },
  symptoms: {
    type: DataTypes.JSON,
    allowNull: false,
    defaultValue: [],
  },
});

export default PatientSymptom