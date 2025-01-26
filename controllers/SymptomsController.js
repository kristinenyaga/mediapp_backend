import Symptom from "../models/Symptom.js"

export const getSymptoms = async (req, res) => {
  try {
    const symptoms = await Symptom.findAll()
    return res.status(200).json(symptoms)
  } catch (error) {
    console.log('error adding symptoms',error)
  }
}