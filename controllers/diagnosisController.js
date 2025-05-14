import Appointment from "../models/Appointment.js";
import Diagnosis from "../models/Diagnosis.js";
import PatientSymptom from "../models/PatientSymptoms.js";
import Symptom from "../models/Symptom.js";

export const getDiagnosisByAppointment = async (req, res) => {
  const { appointmentId } = req.params;

  try {
    if (!appointmentId) {
      return res.status(400).json({ message: "Appointment ID is required." });
    }

    const diagnosis = await Diagnosis.findOne({ where: { appointmentId } });

    if (!diagnosis) {
      return res
        .status(404)
        .json({ message: "No diagnosis found for this appointment." });
    }

    res.status(200).json(diagnosis);
  } catch (error) {
    console.error("Error fetching diagnosis:", error);
    res.status(500).json({ message: "Internal server error." });
  }
};

/**
 * Approve the predicted diagnosis
 */
export const approveDiagnosis = async (req, res) => {
  const { appointmentId } = req.params;

  try {
    const diagnosis = await Diagnosis.findOne({ where: { appointmentId } });

    if (!diagnosis) {
      return res
        .status(404)
        .json({ message: "Diagnosis not found for this appointment." });
    }

    diagnosis.finalDiagnosis = diagnosis.predictedDiagnosis;
    diagnosis.isApproved = true;
    await diagnosis.save();

    res
      .status(200)
      .json({ message: "Diagnosis approved successfully.", diagnosis });
  } catch (error) {
    console.error("Error approving diagnosis:", error);
    res.status(500).json({ message: "Internal server error." });
  }
};

/**
 * Provide a new diagnosis if the prediction was inaccurate
 */
export const updateDiagnosis = async (req, res) => {
  const { appointmentId } = req.params;
  const { finalDiagnosis } = req.body;

  try {
    const diagnosis = await Diagnosis.findOne({ where: { appointmentId } });

    if (!diagnosis) {
      return res
        .status(404)
        .json({ message: "Diagnosis not found for this appointment." });
    }

    diagnosis.finalDiagnosis = finalDiagnosis;
    diagnosis.isApproved = false;
    await diagnosis.save();

    res
      .status(200)
      .json({ message: "Diagnosis updated successfully.", diagnosis });
  } catch (error) {
    console.error("Error updating diagnosis:", error);
    res.status(500).json({ message: "Internal server error." });
  }
};


export const getAllDiagnoses = async (req, res) => {
  try {
    // Fetch all symptoms from the database
    const allSymptoms = await Symptom.findAll({
      attributes: ["id", "name"],
    });

    // Create a mapping of symptom ID -> Name
    const symptomMap = {};
    allSymptoms.forEach((symptom) => {
      symptomMap[symptom.id] = symptom.name;
    });

    // Fetch diagnoses with related data
    const diagnoses = await Diagnosis.findAll({
      include: [
        {
          model: Appointment,
          as: "appointment",
          attributes: ["date"],
          include: [
            {
              model: PatientSymptom,
              as: "patientSymptom",
              attributes: ["additionalInfo", "symptoms"],
            },
          ],
        },
      ],
    });
    // console.log(diagnoses)
const uniqueDiagnoses = [];
const seenAppointments = new Set();

for (const diag of diagnoses) {
  if (!seenAppointments.has(diag.appointmentId)) {
    seenAppointments.add(diag.appointmentId);
    uniqueDiagnoses.push(diag);
  }
}

    // Transform response: Convert symptom IDs to names
    const diagnosesWithSymptoms = uniqueDiagnoses.map((diagnosis) => {
      if (diagnosis.appointment && diagnosis.appointment.patientSymptom) {
        const symptomIds = diagnosis.appointment.patientSymptom.symptoms || [];

        // Convert IDs to names
        const symptomNames = symptomIds.map(
          (id) => symptomMap[id] || "Unknown Symptom"
        );

        // Attach the mapped symptom names
        diagnosis.appointment.patientSymptom.symptomDetails = symptomNames;
      }
      return diagnosis;
    });

    res.status(200).json({
      success: true,
      count: diagnosesWithSymptoms.length,
      data: diagnosesWithSymptoms,
    });
  } catch (error) {
    console.error("Error fetching diagnoses:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};




