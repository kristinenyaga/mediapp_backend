import Doctor from "../models/Doctor.js";
import WorkingHours from "../models/WorkingHours.js";

export const saveWorkingHours = async (req, res) => {
  try {
    const doctorId = req.user.id;
    const workingHours = req.body;

    const doctor = await Doctor.findByPk(doctorId);
    if (!doctor) {
      return res.status(404).json({ message: "Doctor not found" });
    }

    console.log(workingHours)
    const upsertPromises = workingHours.map(async ({ dayOfWeek, startTime, endTime }) => {
      await WorkingHours.upsert({
        doctorId,
        dayOfWeek,
        startTime,
        endTime,
      });
    });

    await Promise.all(upsertPromises);

    const updatedWorkingHours = await WorkingHours.findAll({
      where: { doctorId },
      attributes: ["dayOfWeek", "startTime", "endTime"],
    });

    return res.status(200).json(updatedWorkingHours);
  } catch (error) {
    console.error("Error saving working hours:", error);
    return res.status(500).json({ error: error.message });
  }
};
export const addWorkingHours = async (req, res) => {
  try {
    const doctorId = req.params.id;
    const workingHours = req.body;

    const doctor = await Doctor.findByPk(doctorId);
    if (!doctor) {
      return res.status(404).json({ message: "Doctor not found" });
    }

    console.log(workingHours);
    const upsertPromises = workingHours.map(
      async ({ dayOfWeek, startTime, endTime }) => {
        await WorkingHours.upsert({
          doctorId,
          dayOfWeek,
          startTime,
          endTime,
        });
      }
    );

    await Promise.all(upsertPromises);

    const updatedWorkingHours = await WorkingHours.findAll({
      where: { doctorId },
      attributes: ["dayOfWeek", "startTime", "endTime"],
    });

    return res.status(200).json(updatedWorkingHours);
  } catch (error) {
    console.error("Error saving working hours:", error);
    return res.status(500).json({ error: error.message });
  }
};

export const getDoctorWorkingHours = async (req, res) => {
  try {
    const doctorId = req.params.id
    const workingHours = await WorkingHours.findAll({
      where: { doctorId },
      attributes:['startTime','endTime','dayOfWeek']
    })
    res.status(200).json(workingHours)
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