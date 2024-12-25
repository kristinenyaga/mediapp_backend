import { Sequelize } from "sequelize";
import dotenv from 'dotenv'
dotenv.config()
const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'mysql',
  logging: true
})

const connectDB = async () => {
  try {
    await sequelize.authenticate();
    console.log('Connection has been established successfully.');
  } catch (error) {
    console.error('Unable to connect to the database:', error);
  }
}

export { connectDB, sequelize };