import app from './app.js';  
import { connectDB } from './config/db.js'; 
import { sequelize } from './config/db.js';
import Doctor from './models/doctor.js';
const PORT = 5000;

connectDB();  
sequelize.sync({ alter: true }) 
  .then(() => {
    console.log('Database synced successfully');
  })
  .catch((error) => {
    console.error('Error syncing database:', error);
  });
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
