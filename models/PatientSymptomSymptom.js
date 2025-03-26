import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";

const PatientSymptomSymptom = sequelize.define("PatientSymptomSymptom", {
  patientSymptomId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: "PatientSymptoms",
      key: "id",
    },
    onDelete: "CASCADE",
  },
  symptomId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: "Symptoms",
      key: "id",
    },
    onDelete: "CASCADE",
  },
});

export default PatientSymptomSymptom;
