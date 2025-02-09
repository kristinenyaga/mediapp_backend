import PatientSymptom from "../models/PatientSymptoms.js"
import Symptom from "../models/Symptom.js";
import axios from 'axios'

export const submitSymptoms = async (req, res) => {

  try {
  const { appointmentId, symptoms, additionalInfo } = req.body;

    await PatientSymptom.create({
      appointmentId,
      symptoms,
      additionalInfo
    });

    res.status(200).json({ message: 'symptoms submitted successfully' })
    predictDiagnosis(symptoms)
  } catch (error) {
    console.log('error submitting symptoms', error)
    res
      .status(500)
      .json({ error: "An error occurred while submitting symptoms." });
  }
}

export const updateSymptoms = async (req, res) => {
  try{
    const { id } = req.params;
    const symptom = await PatientSymptom.findByPk(id);
    const { symptoms, additionalInfo } = req.body;

    if (!symptom) {
      return res.status(404).json({ message: "symptom not found" });
    }

    await symptom.update({
      symptoms,
      additionalInfo,
    });

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
    symptomVector[id-1] = 1
  });
  const symptom_names = allSymptoms.map((symptom) => symptom.name);
  

  const modelResponse = await axios.post("http://127.0.0.1:8080/predict", {
    symptoms: symptomVector,
    symptom_names, 
  });

  
  const { prediction, probabilities } = modelResponse.data;
  console.log("Predicted Diagnosis:", prediction);
  console.log("Probabilities:", probabilities);
  
}