import Diagnosis from "../models/Diagnosis.js";

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
