import Patient from "../models/Patient.js";
import Appointment from "../models/Appointment.js";
import Doctor from "../models/Doctor.js";

const defineAssociations = () => {
  Patient.hasMany(Appointment, {
    foreignKey: 'patient_id', 
    as: 'appointments', 
  });
  Appointment.belongsTo(Patient, {
    foreignKey: 'patient_id', 
    as: 'patient',
  });
  
  Doctor.hasMany(Appointment, {
    foreignKey: 'doctor_id',
    as: 'appointments', 
  });

  Appointment.belongsTo(Doctor, {
    foreignKey: 'doctor_id',
    as: 'doctor',
  });
};

export default defineAssociations;