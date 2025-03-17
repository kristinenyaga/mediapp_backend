import Feedback from "../models/Feedback.js";
import Appointment from "../models/Appointment.js";

/**
 * Patient declines to provide feedback
 */
export const declineFeedback = async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const patientId = req.user.id; 
    
    const appointment = await Appointment.findByPk(appointmentId);
    if (!appointment) {
      return res.status(404).json({ message: "Appointment not found." });
    }

    if (appointment.feedbackStatus !== "prompted") {
      return res
        .status(400)
        .json({ message: "Feedback not required at this stage." });
    }

    await appointment.update({ feedbackStatus: "declined" });

    return res.status(200).json({ message: "Feedback declined successfully." });
  } catch (error) {
    return res.status(500).json({
      message: "An error occurred while declining feedback.",
      error: error.message,
    });
  }
};

export const submitFeedback = async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const { rating, comment } = req.body;
    const patientId = req.user.id; 

    const appointment = await Appointment.findByPk(appointmentId);
    if (!appointment) {
      return res.status(404).json({ message: "Appointment not found." });
    }

    if (appointment.feedbackStatus !== "prompted") {
      return res
        .status(400)
        .json({ message: "Feedback not required at this stage." });
    }

    // Save feedback
    await Feedback.create({
      appointmentId,
      patientId,
      rating,
      comment,
    });

    // Update appointment feedback status
    await appointment.update({ feedbackStatus: "submitted" });

    return res
      .status(200)
      .json({ message: "Feedback submitted successfully." });
  } catch (error) {
    return res.status(500).json({
      message: "An error occurred while submitting feedback.",
      error: error.message,
    });
  }
};
