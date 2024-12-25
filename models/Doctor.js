// import { DataTypes } from 'sequelize'; 
// import {sequelize} from '../config/db.js'; 

// const Doctor = sequelize.define('Doctor', {
//   id: {
//     type: DataTypes.INTEGER,
//     autoIncrement: true,
//     primaryKey: true,
//   },
//   username: {
//     type: DataTypes.STRING,
//     allowNull: false,
//   },
//   email: {
//     type: DataTypes.STRING,
//     allowNull: false,
//     unique: true,
//     validate: {
//       isEmail: true, 
//     },
//   },
//   password: {
//     type: DataTypes.STRING,
//     allowNull: false,
//   },
//   specialization: {
//     type: DataTypes.STRING,
//     allowNull: false,
//   },
//   availability: {
//     type: DataTypes.BOOLEAN,
//     defaultValue: true,
//   },
//   room_number: {
//     type: DataTypes.INTEGER,
//     allowNull: false,
//   },

// });

// export default Doctor;