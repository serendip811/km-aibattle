const fs = require('fs');

const supabaseUrl = 'https://zkjhurzhuhoujhyacerw.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpramh1cnpodWhvdWpoeWFjZXJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY4NDkyNzcsImV4cCI6MjA3MjQyNTI3N30.eQWsewQdLe9lbx5QEV7k6qemQvUbwJKGyFs8tVcKWYU';

async function fetchAllCharacters() {
    let allCharacters = [];
    let page = 0;
    const pageSize = 1000;
    let hasMore = true;

    console.log('Fetching characters from Supabase...');

    while (hasMore) {
        const from = page * pageSize;
        const to = from + pageSize - 1;

        console.log(`Fetching records ${from} to ${to}...`);

        try {
            const response = await fetch(
                `${supabaseUrl}/rest/v1/characters?select=user_id,id,nickname,element,power,rating&order=created_at.asc`,
                {
                    headers: {
                        'apikey': supabaseAnonKey,
                        'Authorization': `Bearer ${supabaseAnonKey}`,
                        'Range': `${from}-${to}`
                    }
                }
            );

            if (!response.ok) {
                throw new Error(`Error fetching data: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();

            if (data.length === 0) {
                hasMore = false;
            } else {
                allCharacters = allCharacters.concat(data);
                if (data.length < pageSize) {
                    hasMore = false;
                }
                page++;
            }
        } catch (error) {
            console.error('Error:', error);
            throw error;
        }
    }

    console.log(`Total characters fetched: ${allCharacters.length}`);
    return allCharacters;
}

function aggregateByUser(characters) {
    console.log('Aggregating characters by user...');

    const userMap = new Map();

    for (const char of characters) {
        if (!userMap.has(char.user_id)) {
            userMap.set(char.user_id, []);
        }
        userMap.get(char.user_id).push(char);
    }

    const userRankings = [];

    for (const [user_id, chars] of userMap.entries()) {
        const totalRating = chars.reduce((sum, char) => sum + (char.rating || 0), 0);

        userRankings.push({
            user_id,
            total_rating: totalRating,
            characters: chars.map(char => ({
                nickname: char.nickname,
                element: char.element,
                power: char.power,
                rating: char.rating
            }))
        });
    }

    // Sort by total rating (highest first)
    userRankings.sort((a, b) => b.total_rating - a.total_rating);

    console.log(`Total users: ${userRankings.length}`);
    return userRankings;
}

async function generateRankings() {
    try {
        const characters = await fetchAllCharacters();
        const rankings = aggregateByUser(characters);

        const output = {
            updated_at: new Date().toISOString(),
            total_users: rankings.length,
            rankings: rankings
        };

        const outputPath = './rankings.json';
        fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
        console.log(`Successfully generated rankings at ${outputPath}`);
        console.log(`Top 3 users:`);
        rankings.slice(0, 3).forEach((user, index) => {
            console.log(`  ${index + 1}. User ${user.user_id.substring(0, 8)}... - Total Rating: ${user.total_rating}`);
        });
    } catch (error) {
        console.error('Failed to generate rankings:', error);
        process.exit(1);
    }
}

generateRankings();
