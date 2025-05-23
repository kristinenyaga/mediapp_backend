import Patient from "../models/Patient.js";
import Appointment from "../models/Appointment.js";
import Doctor from "../models/Doctor.js";
import Notification from "../models/Notification.js";
import EmergencyContact from "../models/EmergencyContact.js";
import MedicalInformation from "../models/MedicalInformation.js";
import WorkingHours from "../models/WorkingHours.js";
import PatientSymptom from '../models/PatientSymptoms.js'
import Feedback from "../models/Feedback.js";
import Diagnosis from "../models/Diagnosis.js";
import Symptom from "../models/Symptom.js";
import PatientSymptomSymptom from "../models/PatientSymptomSymptom.js";
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
  Appointment.hasOne(PatientSymptom, {
    foreignKey: 'appointmentId',
    as: 'patientSymptom',
    onDelete:'CASCADE'
  })
  PatientSymptom.belongsTo(Appointment, {
    foreignKey: 'appointmentId',
    as:'appointment'
  })

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

    Appointment.hasOne(Feedback, {
      foreignKey: "appointmentId",
      as: "feedback",
    });

    Feedback.belongsTo(Appointment, {
      foreignKey: "appointmentId",
      as: "appointment",
    });
  
  Doctor.hasMany(Feedback,
    {
      foreignKey: "doctorId",
      as: "feedbacks"
    });
  Feedback.belongsTo(Doctor, {
    foreignKey: "doctorId", as: "doctor"
  });

    // Diagnosis relationship
    Appointment.hasOne(Diagnosis, {
      foreignKey: "appointmentId",
      as: "diagnosis",
    });

    Diagnosis.belongsTo(Appointment, {
      foreignKey: "appointmentId",
      as: "appointment",
    });
  
PatientSymptom.belongsToMany(Symptom, {
  through: "PatientSymptomSymptom", // Junction table
  as: "symptomDetails",
  foreignKey: "patientSymptomId", // Correct foreign key
});

Symptom.belongsToMany(PatientSymptom, {
  through: "PatientSymptomSymptom",
  as: "patientSymptoms",
  foreignKey: "symptomId", // Correct foreign key
});


};

export default defineAssociations;