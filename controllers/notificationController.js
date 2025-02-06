import Notification from "../models/Notification.js";

export const getNotifications = async (req, res) => {
  const { email } = req.user
  
  try {
    const notifications = await Notification.findAll(
      {where: { recipient_email:email }} 
    )
    res.status(200).json({notifications})
  } catch (error) {
   console.error("Error getting all doctors:", error);
   return res
     .status(500)
     .json({ message: "Server error getting all doctors", error }); 
  }
}