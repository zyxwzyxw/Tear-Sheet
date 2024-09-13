// Import packages
import dotenv from 'dotenv';
import express from 'express';

// const axios = require('axios');
const pandas = require('pandas-js');
// const tbapy = require('tbajs');
const moment = require('moment');

// Set .env config
// require('dotenv').config();
dotenv.config();

// API Key for TBA
const apiKey = process.env.API_KEY;

// Variables
const frcEvent = '2024ohcl';

// Get listing of teams competing in event
tba.eventTeams(frcEvent).then(frcEventTeamsAPI => {
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

    tearSheet.forEach(team => {
        tba.teamEvents(team.key).then(teamInfo => {
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
        });
    });

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

    compList.forEach(e => {
        console.log(e);
        tba.eventRankings(e).then(eventInfo => {
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
        });
    });
});
