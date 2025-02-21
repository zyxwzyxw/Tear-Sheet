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

let ageList = {
  rookie: [],
  new: [],
  young: [],
  experienced: [],
  old: [],
};
let tearSheet =[];
let combinedEventInfo=[]

app.get('/db-info', async (req, res) => {
  await performQuery();
  res.json({ tearSheet: tearSheet, ageList:ageList, combinedEventInfo:combinedEventInfo  });
});

// Function to perform a query
async function performQuery() {
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
    // Populate ageList object
    ageListTable.rows.forEach(row => {
      ageList.rookie.push(row["Rookie Teams"]);
      ageList.new.push(row["2-3 years"]);
      ageList.young.push(row["3-5 years"]);
      ageList.experienced.push(row["5-10 years"]);
      ageList.old.push(row["10+ years"]);
    });
    
    const tearSheetTable = await connection.execute('SELECT * FROM tearSheet');
    tearSheet = tearSheetTable.map(row => ({ ...row }));
    
    let events=tearSheetTable.map(row => ({ ...row }));
    for( let i of events){
      //if team object already exists good, if not, create new object
      if (combinedEventInfo[combinedEventInfo.length].team_key!==i.team_key){
        combinedEventInfo.push({
          team_key: team_key,
          events: [],
          Preseason: 0,
          Regional: 0,
          District: 0,
          Global: 0,
          Offseason: 0
        })
      }
      combinedEventInfo[combinedEventInfo.length].events.push({})
      combinedEventInfo[combinedEventInfo.length][i.event_type]++
      combinedEventInfo[combinedEventInfo.length]["Total"]++
    }

    //array of:
    /*
Regional
District
Global
Offseason
Preseason
Total
events: {eventKey: '2024ohcl', name: 'Buckeye Regional', event_type: 'B: Regional', rank: 46, wins: 3, …}
     */

    console.log(results)
 
  } catch (err) {
    console.error('Error performing query:', err);
  } finally {
    // Close the connection
    if (connection) {
      await connection.end();
      console.log('Connection closed');
    }
  }
}


function updateDB(){
  // Function to get listing of teams competing in event
  async function getEventTeams(event) {
    if (!apiKey) await fetchApiKey();
    const response = await axios.get(`https://www.thebluealliance.com/api/v3/event/${event}/teams`, {
        headers: { 'X-TBA-Auth-Key': apiKey }
    });
    return response.data;
  }
  // Function to get events a team has played at
  async function getTeamEvents(teamKey) {
    if (!apiKey) await fetchApiKey();
    const response = await axios.get(`https://www.thebluealliance.com/api/v3/team/${teamKey}/events`, {
        headers: { 'X-TBA-Auth-Key': apiKey }
    });
    return response.data;
  }
  // Function to get event rankings
  async function getEventRankings(eventKey) {
    if (!apiKey) await fetchApiKey();
    const response = await axios.get(`https://www.thebluealliance.com/api/v3/event/${eventKey}/rankings`, {
        headers: { 'X-TBA-Auth-Key': apiKey }
    });
    return response.data;
  }
  // Create lookup to event type
  const event_type_grp = (et) => {
    const eventTypes = {
        'Championship Division': 'D: Global',
        'Championship Finals': 'D: Global',
        'District': 'C: District',
        'District Championship': 'C: District',
        'District Championship Division': 'C: District',
        'Offseason': 'E: Offseason',
        'Preseason': 'A: Preseason',
        'Regional': 'B: Regional',
        'Remote': 'Z: Remote',
    };
    return eventTypes[et] || '';
  };

  const BATCH_SIZE = 10;

  const frcEventTeamsAPI = 
  // [ {
  //         key: 'frc8243',
  //         team_number: 8243,
  //         nickname: 'AstroCircuits',
  //         city: 'Cleveland',
  //         state_prov: 'Ohio',
  //         rookie_year: 2020,
  //         age: 5
  //       },
  //       {
  //         key: 'frc8713',
  //         team_number: 8713,
  //         nickname: 'Nordonia Knights',
  //         city: 'Macedonia',
  //         state_prov: 'Ohio',
  //         rookie_year: 2022,
  //         age: 3
  // }]
  await getEventTeams(frcEvent);
  tearSheet = frcEventTeamsAPI.map(team => ({
      key: team.key,
      team_number: team.team_number,
      nickname: team.nickname,
      city: team.city,
      state_prov: team.state_prov,
      rookie_year: team.rookie_year,
      age: (year - team.rookie_year) || 'rookie year'
  }));

  // complete dataset in smaller batches
  for (let i = 0; i < tearSheet.length; i += BATCH_SIZE) {
      console.log(i)
      const batch = tearSheet.slice(i, i + BATCH_SIZE);
      let batchTeamInfo = await Promise.all(batch.map(async (team) => {
          const teamEvents = await getTeamEvents(team.key);
          const teamInfoWithRankings = await Promise.all(teamEvents.map(async (event) => {
              if (event.event_type_string === 'Remote') return null;
              
              const eventInfo = {
                  team_key: team.key,
                  event_Key: event.key,
                  event_name: event.name,
                  event_type: event_type_grp(event.event_type_string),
                  rank: 0,
                  wins: 0,
                  losses: 0,
                  ties: 0
              };

              const rankings = await getEventRankings(event.key);
              if (rankings && rankings.rankings) {
                  const teamStats = rankings.rankings.find(a => a.team_key === team.key);
                  eventInfo.rank = teamStats ? teamStats.rank : null;
                  if (teamStats && teamStats.record) {
                      eventInfo.wins = teamStats.record.wins;
                      eventInfo.ties = teamStats.record.ties;
                      eventInfo.losses = teamStats.record.losses;
                  }
              }
              eventInfo.team_key = team.key;
              return eventInfo;
          }));
          return teamInfoWithRankings.filter(event => event !== null);
      }));

      for (const teamEvents of batchTeamInfo) {
          const team = {
              team_key: teamEvents[0].team_key,
              events: [],
              Preseason: 0,
              Regional: 0,
              District: 0,
              Global: 0,
              Offseason: 0
          };

          for (const event of teamEvents) {
              team[event.event_type]++;
              team.events.push(event);
          }

          team.Total = team.Preseason + team.District + team.Regional + team.Global + team.Offseason;
          combinedEventInfo.push(team);
      }
  }
}



app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});