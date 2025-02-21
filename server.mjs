import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import mysql from 'mysql2/promise';

// Get the current directory name
const __dirname = path.dirname( fileURLToPath(import.meta.url) );

dotenv.config();

const app = express();
const PORT = 3001;

app.use(express.static(path.join(__dirname, 'public')));

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
    
    //check if need to update our db
    const results = await connection.execute('SELECT * FROM compName');
    const compKey='2024ohcl'
    console.log(results[0][0])
    if (results[0][0].compName!==compKey){
      console.log("updating database")
      updateDB()
    }else console.log("database already updated")
    
    //pull data from db into server
    const ageListTable = await connection.execute('SELECT * FROM ageList');
    let ageList = {
      rookie: [],
      new: [],
      young: [],
      experienced: [],
      old: [],
    };
    const tearSheetTable = await connection.execute('SELECT * FROM tearSheet');
    let tearSheet = tearSheetTable.map(row => ({ ...row }));
    let events=tearSheetTable.map(row => ({ ...row }));
    let combinedEventInfo=[]
    
    //array of:
    /*
Regional
District
Global
Offseason
Preseason
Total
events
: 
Array(5)
0
: 
{eventKey: '2024ohcl', name: 'Buckeye Regional', event_type: 'B: Regional', rank: 46, wins: 3, …}
1
: 
{eventKey: '2024ohsc', name: 'Ohio State Championship', event_type: 'E: Offseason', rank: null, wins: 0, …}
2
: 
{eventKey: '2025ohcl', name: 'Buckeye Regional', event_type: 'B: Regional', rank: 0, wins: 0, …}
3
: 
{eventKey: '2025ohmv', name: 'Miami Valley Regional', event_type: 'B: Regional', rank: 0, wins: 0, …}
4
: 
{eventKey: '2025paca', name: 'Greater Pittsburgh Regional', event_type: 'B: Regional', rank: 0, wins: 0, …}
length
: 
5
[[Prototype]]
: 
Array(0)


     */



    // Populate ageList object using map
    ageListTable.rows.forEach(row => {
      ageList.rookie.push(row["Rookie Teams"]);
      ageList.new.push(row["2-3 years"]);
      ageList.young.push(row["3-5 years"]);
      ageList.experienced.push(row["5-10 years"]);
      ageList.old.push(row["10+ years"]);
    });
    
    app.get('/data', (req, res) => {
      res.json({tearSheet: tearSheet, combinedEventInfo: combinedEventInfo, ageList: ageList });
    });
    
  
  // const combinedEventInfo = [];
  // 
    

    console.log(results)
  //  const combinedteaminfo = results.map(row => row.team);




    // console.log('Query results:', results);
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


function updateDB(){
      
}



app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  performQuery();
});