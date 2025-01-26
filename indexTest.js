// Import packages
//import express from 'express';
import axios from 'axios';
//import pandas from 'pandas-js';
//import moment from 'moment';

import dotenv from 'dotenv';
dotenv.config();
const apiKey = process.env.API_KEY;


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

// Main function to process data
async function processData() {
    try {
        const frcEventTeamsAPI = await getEventTeams(frcEvent);
        let tearSheet = frcEventTeamsAPI.map(team => ({
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
                
                //remove later years
                if(event.year>=2023)return;

                event.team_key = team.key;
                event.event_type = event_type_grp(event.event_type_string);

            });
            combinedTeamInfo.push(teamInfo)
            console.log(team.key + ' Done');
        }
       
        // Get rankings data
        console.log(complist)
        const compList=[];
            for(let i in combinedTeamInfo){
                compList.push({team:team.name})
            }
 
        // const compList = [...new Set(combinedTeamInfo.filter(event => {event.year >= 2023}).map(event => event.key= event.key))].sort();
        // let combinedEventInfo = [];
        // console.log(compList,compList[0])
        // for (const e of compList) {
        //     console.log(e);
        //     const eventInfo = await getEventRankings(e);
            
        //     if (eventInfo.rankings && eventInfo.rankings.length !== 0) {
        //         eventInfo.rankings.forEach(ranking => {
        //             ranking.event_key = e;
        //         });
        //         eventInfo.rankings = eventInfo.rankings.map(ranking => {
        //             delete ranking.extra_stats;
        //             delete ranking.qual_average;
        //             delete ranking.sort_orders;
        //             return ranking;
        //         });

        //         combinedEventInfo.push(eventInfo.rankings)
        //     }
        //     console.log(e + ' 1Done');
        // }

       // console.log(tearSheet[0])
    //console.log(2,combinedTeamInfo[0],2)
   // console.log(3,combinedEventInfo[0],3)
    } catch (error) {
        console.error('Error processing data:', error);
    }
}

// Run the main function
processData();





// //frontend function
// function printOutAgeList(combinedTeamInfo){
//     for(let i of combinedTeamInfo){
//         if(0){

//         }
//     }
//     console.log("Rookie teams")
// }