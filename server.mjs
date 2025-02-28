import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import mysql from 'mysql2/promise';
import axios from 'axios';

// Get the current directory name
const __dirname = path.dirname( fileURLToPath(import.meta.url) );

dotenv.config();

const app = express();
const PORT = 3001;

app.use(express.static(path.join(__dirname, 'public')));

let toexport={
  tearSheet : [],
  combinedEventInfo: []
}
const year = new Date().getFullYear();
const frcEvent='2024ohcl'
const compKey='ohcl'


//put this somewhere safe
let admin = false
let update = false




app.get('/db-info', async (req, res) => {
  if (admin && update) await updateDB()
  await getData();
  res.json({ toexport  });
});

let connection;
//try {
  connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USERNAME,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWD,
  });
  console.log('Connected to the database');
//} catch (error) {}


async function getData() {
    //to retrieve data
    const [tearSheetData] = await connection.execute('SELECT * FROM tear_sheet');
    const [eventsData] = await connection.execute('SELECT * FROM ts_events');
    //toexport.tearSheet = tearSheetData.map(row => ({ ...row }));
    toexport.tearSheet = tearSheetData.filter(
      a=>a.frc_season_master_sm_year===year&&a.competition_master_cm_event_code===compKey
    ).map(row => (
      {
        frc_season_master_sm_year: row.frc_season_master_sm_year,
        competition_master_cm_event_code: row.competition_master_cm_event_code,
        team_master_tm_number: row.team_master_tm_number,
        team_key: row.team_key,
        nickname: row.nickname,
        city: row.city,
        state_prov: row.state_prov,
        rookie_year: row.rookie_year,
        age: row.age
      }
    ));
    
  
    //let teamsCompeting= eve//this removes 
    toexport.combinedEventInfo = eventsData.map(row => (
      {
        frc_season_master_sm_year: row.frc_season_master_sm_year,
        competition_master_cm_event_code: row.competition_master_cm_event_code,
        team_master_tm_number: row.team_master_tm_number,
        team_key: row.team_key,
        event_name: row.event_name,
        event_type: row.event_type,
        rank: row.rank,
        wins: row.wins,
        losses: row.losses,
        ties:row.ties
      }
    ));
  
    //pull data from db into server
    
    //const ageListTable = await connection.execute('SELECT * FROM ageList');
    // Populate ageList object
    // ageListTable.rows.forEach(row => {
    //   ageList.rookie.push(row["Rookie Teams"]);
    //   ageList.new.push(row["2-3 years"]);
    //   ageList.young.push(row["3-5 years"]);
    //   ageList.experienced.push(row["5-10 years"]);
    //   ageList.old.push(row["10+ years"]);
    // });
    
    
    //let events=tearSheetTable.map(row => ({ ...row }));//need to pull form specific event only
    // for( let i of events){
    //   //if team object already exists good, if not, create new object
    //   if (combinedEventInfo[combinedEventInfo.length].team_key!==i.team_key){
    //     combinedEventInfo.push({
    //       team_key: team_key,
    //       events: [],
    //       Preseason: 0,
    //       Regional: 0,
    //       District: 0,
    //       Global: 0,
    //       Offseason: 0
    //     })
    //   }
    //   combinedEventInfo[combinedEventInfo.length].events.push({})
    //   combinedEventInfo[combinedEventInfo.length][i.event_type]++
    //   combinedEventInfo[combinedEventInfo.length]["Total"]++
    // }

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
  if (connection) {
    await connection.end();
    console.log('Connection closed');
  }
}


async function updateDB(){
  console.log("updating database")

  // Function to get listing of teams competing in event
  async function getEventTeams(event) {
    const response = await axios.get(`https://www.thebluealliance.com/api/v3/event/${event}/teams`, {
        headers: { 'X-TBA-Auth-Key': process.env.API_KEY }
    });
    return response.data;
  }
  // Function to get events a team has played at
  async function getTeamEvents(teamKey) {
    const response = await axios.get(`https://www.thebluealliance.com/api/v3/team/${teamKey}/events`, {
        headers: { 'X-TBA-Auth-Key':  process.env.API_KEY }
    });
    return response.data;
  }
  // Function to get event rankings
  async function getEventRankings(eventKey) {
    const response = await axios.get(`https://www.thebluealliance.com/api/v3/event/${eventKey}/rankings`, {
        headers: { 'X-TBA-Auth-Key':  process.env.API_KEY }
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

  let tearSheet =[]
  //   {
  //       frc_season_master_sm_year:year,
  //       competition_master_cm_event_code: compKey,
  //       team_master_tm_number: 8243,
  //       team_key: 'frc8243',        
  //       nickname: 'AstroCircuits',
  //       city: 'Cleveland',
  //       state_prov: 'Ohio',
  //       rookie_year: 2020,
  //       age: 5
  //     },
  //     {
  //       frc_season_master_sm_year:year,
  //       competition_master_cm_event_code: compKey,
  //       team_master_tm_number: 8713,
  //       team_key: 'frc8713',
  //       nickname: 'Nordonia Knights',
  //       city: 'Macedonia',
  //       state_prov: 'Ohio',
  //       rookie_year: 2022,
  //       age: 3
  //  }
  
  const frcEventTeamsAPI = await getEventTeams(frcEvent);
  tearSheet = frcEventTeamsAPI.map(team => ({
    frc_season_master_sm_year:year,
    competition_master_cm_event_code: compKey,
    team_master_tm_number: team.team_number,
    team_key: team.key,
    nickname: team.nickname,
    city: team.city,
    state_prov: team.state_prov,
    rookie_year: team.rookie_year,
    age: (year - team.rookie_year) || 'rookie year'
  }));
  
  //delete old data (fix this to not needing to delete)
  await connection.execute('DELETE FROM tear_sheet');
  //insert new data
  const insertQuery = `
  INSERT INTO tear_sheet (
    frc_season_master_sm_year,
    competition_master_cm_event_code,
    team_master_tm_number,
    team_key,
    nickname,
    city,
    state_prov,
    rookie_year,
    age
  ) VALUES ?`;
  const tearSheetValues = tearSheet.map(team => [
    team.frc_season_master_sm_year,
    team.competition_master_cm_event_code,
    team.team_master_tm_number,
    team.team_key,
    team.nickname,
    team.city,
    team.state_prov,
    team.rookie_year,
    team.age
  ]);
  await connection.query(insertQuery, [tearSheetValues]);

  // complete dataset in smaller batches
  const BATCH_SIZE = 10;

  await connection.execute('DELETE FROM ts_events');

  for (let i = 0; i < tearSheet.length; i += BATCH_SIZE) {
      const batch = tearSheet.slice(i, i + BATCH_SIZE);
      let batchTeamInfo = await Promise.all(batch.map(async (team) => {
          const teamEvents = await getTeamEvents(team.team_key);
          const teamInfoWithRankings = await Promise.all(teamEvents.map(async (event) => {
              if (event.event_type_string === 'Remote') return null;
              const eventYear = event.start_date
              const eventInfo = {
                frc_season_master_sm_year: eventYear.substring(0, 4),
                competition_master_cm_event_code: event.key.substring(4),
                team_master_tm_number: team.team_master_tm_number,
                team_key: team.team_key,
                event_name: event.name,
                event_type: event_type_grp(event.event_type_string),
                rank: 0,
                wins: 0,
                losses: 0,
                ties: 0
              };
              

              const rankings = await getEventRankings(event.key);
              if (rankings && rankings.rankings) {
                  const teamStats = rankings.rankings.find(a => a.team_key === team.team_key);
                  eventInfo.rank = teamStats ? teamStats.rank : null;
                  if (teamStats && teamStats.record) {
                      eventInfo.wins = teamStats.record.wins;
                      eventInfo.ties = teamStats.record.ties;
                      eventInfo.losses = teamStats.record.losses;
                  }
              }
              eventInfo.team_key = team.team_key;
              return eventInfo;
          }));
          return teamInfoWithRankings.filter(event => event !== null);
      }));

      // Flatten the array of arrays into a single array
  const flatTeamInfo = batchTeamInfo.flat();

  // Transform batchTeamInfo data into an array of arrays for insertion
  const eventValues = flatTeamInfo.map(event =>
  [
    event.frc_season_master_sm_year,
    event.competition_master_cm_event_code,
    event.team_master_tm_number,
    event.team_key,
    event.event_name,
    event.event_type,
    event.rank,
    event.wins,
    event.losses,
    event.ties
  ]);
  // SQL query for inserting new data
  eventValues.forEach(event => {
    console.log(event[1]);
  });

  const insertQuery = `
    INSERT INTO ts_events (
      frc_season_master_sm_year,
      competition_master_cm_event_code,
      team_master_tm_number,
      team_key,
      event_name,
      event_type,
       \`rank\`,
      wins,
      losses,
      ties
    ) VALUES ?`;

  // Execute the insertion query with the event values
  await connection.query(insertQuery, [eventValues]);
  }
}

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});