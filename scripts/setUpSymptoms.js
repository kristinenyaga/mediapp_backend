import { sequelize } from "../config/db.js";
import { extractColumnsFromCsv } from "../utils/extractsColumnsFromCsv.js";
import { DataTypes } from "sequelize";
(async () => {
  const filepath = "/home/kristine/Downloads/symbipredict_2022.csv";

  try {
    const columns = await extractColumnsFromCsv(filepath);

    const Symptom = sequelize.define("Symptom", {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
      },
    });

    await sequelize.sync();

    await Symptom.bulkCreate(
      columns.map((col) => ({ name: col })),
      {
        ignoreDuplicates: true,
      }
    );

    console.log("Symptoms successfully saved to the database.");
    
  } catch (error) {
    console.log("error writing to db",error);
    
  }
})();
