import PatientSymptom from "../models/PatientSymptoms.js"

export const submitSymptoms = async (req, res) => {
  const { appointmentId, symptoms, additionalInfo } = req.body;
  try {
    await PatientSymptom.create({
      symptoms,
      additionalInfo,
      appointmentId,
    })
    res.status(200).json({ message: 'symptoms submitted successfully' })
    predictDiagnosis(symptoms)
  } catch (error) {
    console.log('error submitting symptoms', error)
    res
      .status(500)
      .json({ error: "An error occurred while submitting symptoms." });
  }
}

const predictDiagnosis = (symptoms) => {
  
}