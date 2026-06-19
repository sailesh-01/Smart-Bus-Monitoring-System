const express = require('express');
const xlsx = require('xlsx');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;
const FILE_PATH = path.join(__dirname, 'database.xlsx');
const ROUTES_PATH = path.join(__dirname, 'routes.xlsx');

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// In-memory store for live bus locations
let liveBusLocations = {};

// Helper: Initialize Main Database
function initExcel() {
    if (!fs.existsSync(FILE_PATH)) {
        console.log("Creating new database.xlsx...");
        const wb = xlsx.utils.book_new();
        
        const students = [
            { roll: "ES24AD131", name: "Ruthran", advisorEmail: "advisor.ruthran@college.edu", busNo: "Bus 15", startPoint: "Sector 14, City Center", endPoint: "College Campus Main Gate" },
            { roll: "ES24AD134", name: "Sailesh", advisorEmail: "advisor.sailesh@college.edu", busNo: "Bus 03", startPoint: "Old Town Square", endPoint: "College Campus Main Gate" },
            { roll: "ES24AD138", name: "Sanjay", advisorEmail: "advisor.sanjay@college.edu", busNo: "Bus 21", startPoint: "Highway Junction", endPoint: "College Campus Main Gate" },
            { roll: "ES24AD141", name: "Santhosh", advisorEmail: "advisor.santhosh@college.edu", busNo: "Bus 15", startPoint: "Sector 14, City Center", endPoint: "College Campus Main Gate" },
            { roll: "ES24AD132", name: "Priya Patel", advisorEmail: "advisor.priya@college.edu", busNo: "Bus 05", startPoint: "Old Town Square", endPoint: "College Campus Main Gate" }
        ];
        xlsx.utils.book_append_sheet(wb, xlsx.utils.json_to_sheet(students), "Students");

        const drivers = [
            { bus: "Bus 12", name: "James Wilson", phone: "+91 98765 43210" },
            { bus: "Bus 05", name: "Sarah Miller", phone: "+91 98765 43211" },
            { bus: "Bus 15", name: "Robert Fox", phone: "+91 98765 43212" },
            { bus: "Bus 03", name: "David Chen", phone: "+91 98765 43213" },
            { bus: "Bus 21", name: "Michael Ross", phone: "+91 98765 43214" }
        ];
        xlsx.utils.book_append_sheet(wb, xlsx.utils.json_to_sheet(drivers), "Drivers");

        const news = [
            { text: "Welcome to our new tracking system!" },
            { text: "Safety first, tracking always!" }
        ];
        xlsx.utils.book_append_sheet(wb, xlsx.utils.json_to_sheet(news), "News");

        const feedback = [
            { text: "The bus transit system is a lifesaver for early classes! 🚌", user: "Priya S." },
            { text: "Love the real-time tracking! Never miss a ride now. ⭐", user: "Rahul K." },
            { text: "Great interface, super easy to use on my phone. 📱", user: "Ananya M." }
        ];
        xlsx.utils.book_append_sheet(wb, xlsx.utils.json_to_sheet(feedback), "Feedback");

        xlsx.writeFile(wb, FILE_PATH);
    } else {
        // Migration: Add missing sheets to existing file
        const wb = xlsx.readFile(FILE_PATH);
        let changed = false;

        if (!wb.SheetNames.includes("News")) {
            const newsData = wb.SheetNames.includes("Notices") 
                ? xlsx.utils.sheet_to_json(wb.Sheets["Notices"]) 
                : [{ text: "Welcome back!" }];
            xlsx.utils.book_append_sheet(wb, xlsx.utils.json_to_sheet(newsData), "News");
            changed = true;
        }

        if (!wb.SheetNames.includes("Feedback")) {
            xlsx.utils.book_append_sheet(wb, xlsx.utils.json_to_sheet([
                { text: "The system is great!", user: "Student" }
            ]), "Feedback");
            changed = true;
        }

        if (changed) {
            xlsx.writeFile(wb, FILE_PATH);
            console.log("Modernized database.xlsx with News/Events/Feedback sheets");
        }
    }
}

// Helper: Initialize Routes Database
function initRoutesExcel() {
    if (!fs.existsSync(ROUTES_PATH)) {
        console.log("Initializing routes.xlsx...");
        const wb = xlsx.utils.book_new();
        const routes = [
            { bus: "Bus 15", stops: "Sector 14, Mall Road, Kalyan Chowk, Public Park, University Circle, College Campus" },
            { bus: "Bus 03", stops: "Old Town, Market Street, Railway Station, Bridge View, College Campus" },
            { bus: "Bus 21", stops: "Highway Jct, City Mall, Tech Park, Green Valley, College Campus" },
            { bus: "Bus 05", stops: "Sunset Point, North Gate, Library Square, Admin Block, College Campus" },
            { bus: "Bus 12", stops: "West Ridge, Metro Station, Food Court, Sports Complex, College Campus" }
        ];
        xlsx.utils.book_append_sheet(wb, xlsx.utils.json_to_sheet(routes), "Routes");
        xlsx.writeFile(wb, ROUTES_PATH);
    }
}

initExcel();
initRoutesExcel();

// API: Get all data
app.get('/api/data', (req, res) => {
    try {
        const wbMain = xlsx.readFile(FILE_PATH);
        const wbRoutes = xlsx.readFile(ROUTES_PATH);
        
        const studentsRaw = xlsx.utils.sheet_to_json(wbMain.Sheets["Students"] || {});
        const driversRaw = xlsx.utils.sheet_to_json(wbMain.Sheets["Drivers"] || {});
        const newsRaw = wbMain.Sheets["News"] ? xlsx.utils.sheet_to_json(wbMain.Sheets["News"]) : [];
        const noticesRaw = wbMain.Sheets["Notices"] ? xlsx.utils.sheet_to_json(wbMain.Sheets["Notices"]) : [];
        const eventsRaw = wbMain.Sheets["Events"] ? xlsx.utils.sheet_to_json(wbMain.Sheets["Events"]) : [];
        const feedbackRaw = wbMain.Sheets["Feedback"] ? xlsx.utils.sheet_to_json(wbMain.Sheets["Feedback"]) : [];
        const routesRaw = wbMain.Sheets["Routes"] ? xlsx.utils.sheet_to_json(wbMain.Sheets["Routes"]) : (wbRoutes.Sheets["Routes"] ? xlsx.utils.sheet_to_json(wbRoutes.Sheets["Routes"]) : []);

        // Map routes by bus number
        const routeMap = {};
        routesRaw.forEach(r => {
            routeMap[r.bus] = r.stops.split(',').map(s => s.trim());
        });

        const students = {};
        studentsRaw.forEach(s => {
            students[s.roll] = {
                name: s.name,
                advisorEmail: s.advisorEmail,
                busNo: s.busNo,
                startPoint: s.startPoint,
                endPoint: s.endPoint,
                stops: routeMap[s.busNo] || ["Start", "College Campus"]
            };
        });

        const drivers = {};
        driversRaw.forEach(d => {
            drivers[d.bus] = { name: d.name, phone: d.phone };
        });

        const news = newsRaw.map(n => n.text || n.Text || n.content || "");
        const notices = noticesRaw.map(n => n.text || n.Text || n.content || "");
        const feedback = feedbackRaw.map(f => ({ 
            text: f.text || f.Quote || f.text || "", 
            author: f.user || f.Author || f.author || "- Anonymous" 
        }));
        const events = eventsRaw;

        res.json({ students, drivers, news, notices, feedback, events, routeMap });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// API: Save data
app.post('/api/save', (req, res) => {
    try {
        const { students, drivers, notices, news, events } = req.body;
        
        const wb = xlsx.utils.book_new();

        // Flatten students
        const studentList = Object.keys(students).map(roll => ({
            roll,
            ...students[roll]
        }));
        // Remove 'stops' as it's complex for Excel (could JSON.stringify, but let's keep it simple)
        studentList.forEach(s => delete s.stops);
        
        const ws_students = xlsx.utils.json_to_sheet(studentList);
        xlsx.utils.book_append_sheet(wb, ws_students, "Students");

        // Flatten drivers
        const driverList = Object.keys(drivers).map(bus => ({
            bus,
            name: drivers[bus].name,
            phone: drivers[bus].phone
        }));
        const ws_drivers = xlsx.utils.json_to_sheet(driverList);
        xlsx.utils.book_append_sheet(wb, ws_drivers, "Drivers");

        // Notices
        if (notices) {
            xlsx.utils.book_append_sheet(wb, xlsx.utils.json_to_sheet(notices.map(text => ({ text }))), "Notices");
        }
        
        // News
        if (news) {
            xlsx.utils.book_append_sheet(wb, xlsx.utils.json_to_sheet(news.map(text => ({ text }))), "News");
        } else {
            // Preserve News from file if not sent
            try {
                const cur = xlsx.readFile(FILE_PATH);
                if (cur.Sheets["News"]) xlsx.utils.book_append_sheet(wb, cur.Sheets["News"], "News");
            } catch(e){}
        }

        // Events
        if (events) {
            xlsx.utils.book_append_sheet(wb, xlsx.utils.json_to_sheet(events), "Events");
        } else {
            // Preserve Events from file if not sent
            try {
                const cur = xlsx.readFile(FILE_PATH);
                if (cur.Sheets["Events"]) xlsx.utils.book_append_sheet(wb, cur.Sheets["Events"], "Events");
            } catch(e){}
        }

        xlsx.writeFile(wb, FILE_PATH);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// API: Update Live Location
app.post('/api/location', (req, res) => {
    const { busNo, lat, lng, speed } = req.body;
    if (!busNo) return res.status(400).json({ error: "Bus number required" });
    
    liveBusLocations[busNo] = {
        lat,
        lng,
        speed,
        lastUpdated: new Date().toISOString()
    };
    
    res.json({ success: true });
});

// API: Get Live Location
app.get('/api/location/:busNo', (req, res) => {
    const busNo = req.params.busNo;
    const location = liveBusLocations[busNo];
    
    if (!location || !location.lastUpdated) {
        return res.json({ active: false });
    }
    
    const lastUpdated = new Date(location.lastUpdated);
    const now = new Date();
    const isStale = (now - lastUpdated) > 30000; // 30 seconds
    
    res.json({ 
        active: !isStale,
        ...location 
    });
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
