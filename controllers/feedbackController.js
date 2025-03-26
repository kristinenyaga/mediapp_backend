import Feedback from "../models/Feedback.js";
import Appointment from "../models/Appointment.js";
import Doctor from "../models/Doctor.js";

/**
 * Patient declines to provide feedback
 */
export const declineFeedback = async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const patientId = req.user.id; 
    
    const appointment = await Appointment.findByPk(appointmentId, {
      include: [
        {
          model: Doctor,
          as:'doctor'
        }
      ]
    });
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
    console.log(req.params)
    const { rating, comment } = req.body;
    const patientId = req.user.id; 

    const appointment = await Appointment.findByPk(appointmentId,{
      include: [
        {
          model: Doctor,
          as:'doctor'
        }
      ]
    });
    if (!appointment) {
      return res.status(404).json({ message: "Appointment not found." });
    }

    if (appointment.feedbackStatus !== "prompted") {
      return res
        .status(400)
        .json({ message: "Feedback not required at this stage." });
    }

    console.log(appointment)
    // Save feedback
    await Feedback.create({
      doctorId: appointment.doctor.id,
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
    console.log(error)
    return res.status(500).json({
      message: "An error occurred while submitting feedback.",
      error: error.message,
    });
  }
};

export const getAllFeedback = async (req, res) => {
  try {
    // Fetch all feedback from the database
    const feedback = await Feedback.findAll();

    res.status(200).json({
      success: true,
      count: feedback.length,
      data: feedback,
    });
  } catch (error) {
    console.error("Error fetching feedback:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

export const fetchDoctorFeedbacks = async (req, res) => {
  try {
    const { id } = req.user;

    // Fetch all feedback related to the doctor
    const feedback = await Feedback.findAll({
      where: { doctorId:id },
      attributes: ["rating", "comment", "createdAt"],
      order: [["createdAt", "DESC"]], // Order by latest feedback
    });

    if (!feedback.length) {
      return res.json({
        averageRating: null,
        totalReviews: 0,
        feedbacks: [],
      });
    }

    // Calculate the average rating
    const averageRating =
      feedback.reduce((sum, f) => sum + f.rating, 0) / feedback.length;

    res.json({
      averageRating: averageRating.toFixed(1),
      totalReviews: feedback.length,
      feedbacks: feedback, // Include all feedback
    });

  } catch (error) {
    console.error("Error fetching doctor feedback:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}