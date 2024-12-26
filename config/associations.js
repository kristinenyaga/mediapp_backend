import Patient from "../models/Patient.js";
import Appointment from "../models/Appointment.js";
import Doctor from "../models/Doctor.js";

const defineAssociations = () => {
  Patient.hasMany(Appointment, { foreignKey: 'patient_id' });
  Doctor.hasMany(Appointment, { foreignKey: 'doctor_id' });
  Appointment.belongsTo(Patient, { foreignKey: 'patient_id' });
  Appointment.belongsTo(Doctor, { foreignKey: 'doctor_id' });
};

export default defineAssociations;