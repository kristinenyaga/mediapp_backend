import Patient from "../models/Patient.js";
import Appointment from "../models/Appointment.js";
import Doctor from "../models/Doctor.js";
import Notification from "../models/Notification.js";
import EmergencyContact from "../models/EmergencyContact.js";
import MedicalInformation from "../models/MedicalInformation.js";
import WorkingHours from "../models/WorkingHours.js";
const defineAssociations = () => {
  Patient.hasMany(Appointment, {
    foreignKey: 'patientId', 
    as: 'appointments', 
  });
  Appointment.belongsTo(Patient, {
    foreignKey: 'patientId', 
    as: 'patient',
  });
  
  Doctor.hasMany(Appointment, {
    foreignKey: 'doctorId',
    as: 'appointments', 
  });

  Appointment.belongsTo(Doctor, {
    foreignKey: 'doctorId',
    as: 'doctor',
  });

  Appointment.hasMany(Notification, {
    foreignKey: 'appointment_id',
    as: 'notifications', 
  });

  Notification.belongsTo(Appointment, {
    foreignKey: 'appointment_id',
    as: 'appointment',
  });
  Doctor.hasMany(WorkingHours, {
    foreignKey: 'doctorId',
    as:'workinghours'
  })
  WorkingHours.belongsTo(Doctor, {
    foreignKey: 'doctorId',
    as:'doctor'
  })
  Patient.hasOne(EmergencyContact, {
    foreignKey: 'patientId',
    as:'emergencycontact'
  })
  EmergencyContact.belongsTo(Patient, {
    foreignKey: 'patientId',
    as:'patient'
  })
  MedicalInformation.belongsTo(Patient, {
    foreignKey: 'patientId',
    as: 'patient'
  })
  Patient.hasOne(MedicalInformation, {
    foreignKey: 'patientId',
    as:'medicalinformation'
  })
};

export default defineAssociations;