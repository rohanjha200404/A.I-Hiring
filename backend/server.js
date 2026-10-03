import dotenv from 'dotenv';
import { sequelize } from './src/core/db.js';
import app from './src/app.js';
import { initCrypto } from './src/utils/crypto.util.js';

dotenv.config();

const PORT = process.env.PORT || 5002;

const startServer = async () => {
  try {
    initCrypto(); // Generate RSA Keys

    await sequelize.authenticate();
    console.log('Database connected successfully.');
    // Sync models
    await sequelize.sync();
    
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Unable to connect to the database:', error);
  }
};

startServer();
