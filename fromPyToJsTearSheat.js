// Import packages
import dotenv from 'dotenv';
import express from 'express';
import axios from 'axios';
import pandas from 'pandas-js';
import moment from 'moment';

// Set .env config
dotenv.config();

// API Key for TBA
const apiKey = process.env.API_KEY;

// Variables
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
            rookie_year: team.rookie_year
        }));

        // Start final dataset
        let combinedTeamInfo = [];
        let x = true;

        for (const team of tearSheet) {
            const teamInfo = await getTeamEvents(team.key);
            teamInfo.forEach(event => {
                event.team_key = team.key;
            });

            if (x) {
                combinedTeamInfo = teamInfo;
                x = false;
            } else {
                combinedTeamInfo = combinedTeamInfo.concat(teamInfo);
            }
            console.log(team.key + ' Done');
        }

        // Remove remote events
        combinedTeamInfo = combinedTeamInfo.filter(event => event.event_type_string !== 'Remote');

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

        combinedTeamInfo.forEach(event => {
            event.event_type = event_type_grp(event.event_type_string);
        });

        // Pivot table
        const pvt = pandas.DataFrame(combinedTeamInfo.filter(event => event.year >= 2019))
            .pivotTable({
                values: ['first_event_code'],
                index: ['team_key', 'year'],
                columns: ['event_type'],
                aggfunc: 'count',
                fill_value: 0,
                margins: true,
                margins_name: 'Total'
            });
        console.log(pvt);

        // Yearly competition
        const yr_comp = pandas.DataFrame(combinedTeamInfo)
            .groupby(['team_key'])
            .agg({
                year: pandas.Series.nunique,
                key: pandas.Series.nunique
            });

        // Get rankings data
        const compList = [...new Set(combinedTeamInfo.filter(event => event.year >= 2022).map(event => event.key))].sort();

        let combinedEventInfo = [];
        x = true;

        for (const e of compList) {
            console.log(e);
            const eventInfo = await getEventRankings(e);
            if (eventInfo.rankings.length !== 0) {
                eventInfo.rankings.forEach(ranking => {
                    ranking.event_key = e;
                });
                eventInfo.rankings = eventInfo.rankings.map(ranking => {
                    delete ranking.extra_stats;
                    delete ranking.qual_average;
                    delete ranking.sort_orders;
                    return ranking;
                });

                if (x) {
                    combinedEventInfo = eventInfo.rankings;
                    x = false;
                } else {
                    combinedEventInfo = combinedEventInfo.concat(eventInfo.rankings);
                }
            }
            console.log(e + ' Done');
        }
    } catch (error) {
        console.error('Error processing data:', error);
    }
}

// Run the main function
processData();