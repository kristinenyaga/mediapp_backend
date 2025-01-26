import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";

const Symptom = sequelize.define('Symptom', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement:true
  },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique:true
      
    }
  
})

export default Symptom