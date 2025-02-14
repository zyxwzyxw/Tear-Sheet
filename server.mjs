import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import mysql from 'mysql2/promise';

// Get the current file's URL
const __filename = fileURLToPath(import.meta.url);
// Get the current directory name
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config();

///when start


const app = express();
const PORT = 3001;

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// Endpoint to get the API key
app.get('/api-key', (req, res) => {
  res.json({ apiKey: process.env.API_KEY });
});

// Function to perform a query
const performQuery = async () => {
  let connection;

  try {
    // Create the connection to the database
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USERNAME,
      database: process.env.DB_NAME,
      password: process.env.DB_PASSWD,
    });

    console.log('Connected to the database');

    // Perform the query
    const [results, fields] = await connection.execute('SELECT year FROM test');
    const year = new Date().getFullYear();

    if (results.year===year){
        //pull from api into db
    }
    //pull data from db into server

    
  } catch (err) {
    console.error('Error performing query:', err);
  } finally {
    // Close the connection
    if (connection) {
      await connection.end();
      console.log('Connection closed');
    }
  }
};

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  performQuery();
});
