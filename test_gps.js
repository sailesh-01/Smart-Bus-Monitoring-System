const http = require('http');

const PORT = 3000;
const busNo = "Bus-Test-99";

const postData = JSON.stringify({
    busNo,
    lat: "11.0168",
    lng: "76.9558",
    speed: "45.5"
});

const postOptions = {
    hostname: 'localhost',
    port: PORT,
    path: '/api/location',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json'
    }
};

const getOptions = {
    hostname: 'localhost',
    port: PORT,
    path: `/api/location/${busNo}`,
    method: 'GET'
};

async function test() {
    console.log("Testing POST /api/location...");
    await new Promise((resolve, reject) => {
        const req = http.request(postOptions, (res) => {
            console.log(`POST Response status: ${res.statusCode}`);
            res.on('data', d => console.log(`POST response: ${d}`));
            resolve();
        });
        req.on('error', reject);
        req.write(postData);
        req.end();
    });

    console.log("\nTesting GET /api/location/:busNo...");
    await new Promise((resolve, reject) => {
        const req = http.request(getOptions, (res) => {
            console.log(`GET Response status: ${res.statusCode}`);
            let data = '';
            res.on('data', d => data += d);
            res.on('end', () => {
                console.log(`GET response: ${data}`);
                const parsed = JSON.parse(data);
                if (parsed.active && parsed.lat === "11.0168") {
                    console.log("\n✅ SUCCESS: Location stored and retrieved correctly!");
                } else {
                    console.error("\n❌ FAILED: Data mismatch or inactive.");
                }
                resolve();
            });
        });
        req.on('error', reject);
        req.end();
    });
}

test().catch(console.error);
