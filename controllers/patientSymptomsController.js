import PatientSymptom from "../models/PatientSymptoms.js"
import Symptom from "../models/Symptom.js";
import Diagnosis from "../models/Diagnosis.js";
import axios from "axios";

export const submitSymptoms = async (req, res) => {
  try {
    const { appointmentId, symptoms, additionalInfo } = req.body;

    const patientSymptom = await PatientSymptom.create({
      appointmentId,
      symptoms,
      additionalInfo,
    });

    // Predict diagnosis
    const predictedDiagnosis = await predictDiagnosis(symptoms);

    // Store prediction in the Diagnosis model
    const diagnosis = await Diagnosis.create({
      appointmentId,
      predictedDiagnosis,
    });

    res.status(200).json({
      message: "Symptoms submitted and diagnosis predicted successfully",
    });
  } catch (error) {
    console.error("Error submitting symptoms:", error);
    res
      .status(500)
      .json({ error: "An error occurred while submitting symptoms." });
  }
};

export const updateSymptoms = async (req, res) => {
  try{
    const { id } = req.params;
    const symptom = await PatientSymptom.findByPk(id);
    const { symptoms, additionalInfo,appointmentId } = req.body;

    if (!symptom) {
      return res.status(404).json({ message: "symptom not found" });
    }

    await symptom.update({
      symptoms,
      additionalInfo,
    });

    const predictedDiagnosis = await predictDiagnosis(symptoms);
    let diagnosis = await Diagnosis.findOne({ where: { appointmentId } });

    if (diagnosis) {
      await diagnosis.update({ predictedDiagnosis });
      
    }
    else {
      await Diagnosis.create({
        appointmentId,
        predictedDiagnosis,
      });
    }
    
    const updatedSymptoms = await PatientSymptom.findByPk(id);
    return res.status(200).json(updatedSymptoms);
  } catch (error) {
    return res
      .status(500)
      .json({
        message: "An error occurred while updating symptoms.",
        error: error.message,
      });
  }  
}

const predictDiagnosis = async (symptoms) => {
  const allSymptoms = await Symptom.findAll({
    attributes: ['id', 'name'],
    order:[['id','ASC']]
  })
  const symptomVector = new Array(131).fill(0)

  symptoms.forEach(id => {
    console.log('id',id)
    symptomVector[id-1] = 1
  });
  const symptom_names = allSymptoms.map((symptom) => symptom.name);

  console.log('symptom_names',symptom_names)
  console.log("symptom_vector",symptomVector);

  

  const modelResponse = await axios.post("http://127.0.0.1:8080/predict", {
    symptoms: symptomVector,
    symptom_names, 
  });

  
  const { predicted_disease, probabilities } = modelResponse.data;

  return predicted_disease
  
}

export const reviewDiagnosis = async (req, res) => {
  try {
    const { id } = req.params; // Diagnosis ID
    const { isApproved, finalDiagnosis } = req.body;

    const diagnosis = await Diagnosis.findByPk(id);
    if (!diagnosis) {
      return res.status(404).json({ message: "Diagnosis not found" });
    }

    // If doctor overrides, store the new diagnosis
    if (finalDiagnosis) {
      await diagnosis.update({
        finalDiagnosis,
        isApproved: false, // Since prediction is overridden, it's not "approved"
      });
    } else {
      await diagnosis.update({ isApproved });
    }

    res.status(200).json({
      message: "Diagnosis reviewed successfully",
      diagnosis,
    });
  } catch (error) {
    console.error("Error reviewing diagnosis:", error);
    res
      .status(500)
      .json({ error: "An error occurred while reviewing the diagnosis." });
  }
};


export const getPatientSymptoms = async (req, res) => {
  try {
    const patientSymptoms = await PatientSymptom.findAll();

    // Map over the results and replace symptom IDs with their actual names
    const transformedData = await Promise.all(
      patientSymptoms.map(async (record) => {
        // If symptoms exist, fetch their names
        let symptomNames = [];
        if (record.symptoms.length > 0) {
          const symptoms = await Symptom.findAll({
            where: { id: record.symptoms }, // Match against symptom IDs
            attributes: ["name"],
          });
          symptomNames = symptoms.map((s) => s.name); // Extract names
        }

        return {
          id: record.id,
          additionalInfo: record.additionalInfo,
          appointmentId: record.appointmentId,
          symptoms: symptomNames, // Use names instead of IDs
          createdAt: record.createdAt,
          updatedAt: record.updatedAt,
        };
      })
    );

    res.status(200).json({
      success: true,
      count: transformedData.length,
      data: transformedData,
    });
  } catch (error) {
    console.error("Error fetching patient symptoms:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};