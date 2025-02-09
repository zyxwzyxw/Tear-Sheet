import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();
const apiKey = process.env.API_KEY;





//make like: https://docs.google.com/spreadsheets/d/1E9wh4uT27pQWghBYoqZsYbgKTxJnvZMu/edit?pli=1&gid=1450279068#gid=1450279068


//combined team info-done
//tear sheet-done

//not done:
//age-list
//ranking box-plot

const year = new Date().getFullYear();
const frcEvent = '2024ohcl';

// Function to get listing of teams competing in event
async function getEventTeams(event) {
    const response = await axios.get(`https://www.thebluealliance.com/api/v3/event/${event}/teams`, {
        headers: { 'X-TBA-Auth-Key': apiKey }
    });
    return response.data;
}
// Function to get team events
async function getTeamEvents(teamKey) {
    const response = await axios.get(`https://www.thebluealliance.com/api/v3/team/${teamKey}/events`, {
        headers: { 'X-TBA-Auth-Key': apiKey }
    });
    return response.data;
}
// Function to get event rankings
async function getEventRankings(eventKey) {
    const response = await axios.get(`https://www.thebluealliance.com/api/v3/event/${eventKey}/rankings`, {
        headers: { 'X-TBA-Auth-Key': apiKey }
    });
    return response.data;
}
// Create lookup to event type
const event_type_grp = (et) => {
    switch (et) {
        case 'Championship Division':
        case 'Championship Finals':
            return 'D: Global';
        case 'District':
        case 'District Championship':
        case 'District Championship Division':
            return 'C: District';
        case 'Offseason':
            return 'E: Offseason';
        case 'Preseason':
            return 'A: Preseason';
        case 'Regional':
            return 'B: Regional';
        case 'Remote':
            return 'Z: Remote';
        default:
            return '';
    }
};

let tearSheet=[];
let ageList={
    rookie:[],
    new:[],
    young:[],
    experienced:[], 
    old:[], 
}
const combinedEventInfo=[];


// Main function to process data
async function processData() {
    try {
         const frcEventTeamsAPI = await getEventTeams(frcEvent);
         //[ {
        //     key: 'frc8243',
        //     team_number: 8243,
        //     nickname: 'AstroCircuits',
        //     city: 'Cleveland',
        //     state_prov: 'Ohio',
        //     rookie_year: 2020,
        //     age: 5
        //   },
        //   {
        //     key: 'frc8713',
        //     team_number: 8713,
        //     nickname: 'Nordonia Knights',
        //     city: 'Macedonia',
        //     state_prov: 'Ohio',
        //     rookie_year: 2022,
        //     age: 3
        //   }]
        tearSheet = frcEventTeamsAPI.map(team => ({
            key: team.key,
            team_number: team.team_number,
            nickname: team.nickname,
            city: team.city,
            state_prov: team.state_prov,
            rookie_year: team.rookie_year,
            age: (year-team.rookie_year)||'rookie year'
        }));
        
        //complete dataset
        let combinedTeamInfo = [];
        for (const team of tearSheet) {
            const teamInfo = await getTeamEvents(team.key);
            teamInfo.forEach(event => {
                // Remove remote events
                if(event.event_type_string == 'Remote')return;

                event.team_key = team.key;
                event.event_type = event_type_grp(event.event_type_string);

            });
            combinedTeamInfo.push(teamInfo)
            console.log(team.key + ' Done');
        }
        //Get rankings data
        //need to reduce the data to only last few years
        for(let i of combinedTeamInfo){
            const team={team_key: i[0].team_key, events: [], Preseason: 0, Regional: 0, District: 0, Global: 0, Offseason: 0}
            let j=0
            while(i[j]){
                if(i[j].name.includes("Cancelled")){++j;continue}
                const event = {eventKey: i[j].key, name: i[j].name, rank:0, wins:0, losses:0, ties:0}

                //team.events.push({eventKey: i[j].key, name: i[j].name, rank:0, wins:0, losses:0, ties:0})
                const type = i[j].event_type_string
                ++team[type];

                const eventInfo = await getEventRankings(i[j].key);
                
                if(eventInfo && eventInfo.rankings && eventInfo.rankings[0]){
                    const teamStats=eventInfo.rankings.find((a)=>a.team_key==i[0].team_key)
                    event.rank=teamStats.rank
                    event.wins=teamStats.record.wins
                    event.ties=teamStats.record.ties
                    event.losses=teamStats.record.losses
                }

                team.events.push(event)

                ++j
            }
            team.Total=team.Preseason+team.District+team.Regional+team.Global+team.Offseason

            combinedEventInfo.push(team)
        }
    } catch (error) {
        console.error('Error processing data:', error);
    }
    printOutAgeList();
}

// Run the main function
processData();

//frontend function
function printOutAgeList(){
    console.log(tearSheet)

    for(let i of tearSheet){
        if(i.age<1) ageList.rookie.push(i.team_number)//rookie
        else if(i.age<4) ageList['new'].push(i.team_number)//2-3 years
        else if(i.age<6) ageList.young.push(i.team_number)//3-5 years
        else if(i.age<11) ageList.experienced.push(i.team_number)//5-10 years
        else ageList.old.push(i.team_number)//11 years and more
    }
    console.log(ageList)
    console.log(JSON.stringify(combinedEventInfo))


    //console.log(combinedEventInfo[0].events[0])
}
