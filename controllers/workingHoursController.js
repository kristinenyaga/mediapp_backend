import Doctor from "../models/Doctor.js";
import WorkingHours from "../models/WorkingHours.js";

export const addWorkingHours = async (req, res) => {
  try {
    const { doctorId, startTime, endTime,dayOfWeek } = req.body
    const doctor = Doctor.findByPk(doctorId)
    if (!doctor) {
      return res.status(404).json({ message: 'Doctor not found' })
    }
    const workingHour = await WorkingHours.create({ doctorId, startTime, endTime, dayOfWeek })
    res.status(201).json({workingHour})
    
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}

export const getDoctorWorkingHours = async (req, res) => {
  try {
    const doctorId = req.params.doctorId
    const workingHours = await WorkingHours.findAll({
      where:{doctorId}
    })
    res.json(workingHours)
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export const updateWorkingHours = async (req, res) => {
  try {
    const workingHourId = req.params.id;

    const workingHour = await WorkingHours.findByPk(workingHourId);
    if (!workingHour) {
      return res.status(404).json({ message: 'Working hour not found' });
    }

    const updatedWorkingHour = await workingHour.update(req.body);
    res.status(200).json(updatedWorkingHour);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Delete working hours
export const deleteWorkingHours = async (req, res) => {
  try {
    const workingHourId = req.params.id;

    const workingHour = await WorkingHours.findByPk(workingHourId);
    if (!workingHour) {
      return res.status(404).json({ message: 'Working hour not found' });
    }

    await workingHour.destroy();
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};