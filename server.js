import app from './app.js';  
import { connectDB } from './config/db.js'; 
import { sequelize } from './config/db.js';
import defineAssociations from './config/associations.js';
defineAssociations()
const PORT = 5000;

connectDB();  
sequelize.sync() 
  .then(() => {
    console.log('Database synced successfully');
  })
  .catch((error) => {
    console.error('Error syncing database:', error);
  });
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
