// Mock Database
const students = {
    "ES24AD131": {
        name: "Ruthran",
        busNo: "Bus 15",
        startPoint: "Sector 14, City Center",
        endPoint: "College Campus Main Gate",
        stops: ["Sector 14", "Mall Road", "Kalyan Chowk", "Public Park", "University Circle", "College Campus"]
    },
    "ES24AD134": {
        name: "Sailesh",
        busNo: "Bus 03",
        startPoint: "Old Town Square",
        endPoint: "College Campus Main Gate",
        stops: ["Old Town", "Market Street", "Railway Station", "Bridge View", "College Campus"]
    },
    "ES24AD138": {
        name: "Sanjay",
        busNo: "Bus 21",
        startPoint: "Highway Junction",
        endPoint: "College Campus Main Gate",
        stops: ["Highway Jct", "City Mall", "Tech Park", "Green Valley", "College Campus"]
    },
    "ES24AD141": {
        name: "Santhosh",
        busNo: "Bus 15",
        startPoint: "Sector 14, City Center",
        endPoint: "College Campus Main Gate",
        stops: ["Sector 14", "Mall Road", "Kalyan Chowk", "Public Park", "University Circle", "College Campus"]
    },
    "ES24AD132": {
        name: "Priya Patel",
        busNo: "Bus 05",
        startPoint: "Old Town Square",
        endPoint: "College Campus Main Gate",
        stops: ["Old Town", "Market Street", "Railway Station", "Bridge View", "College Campus"]
    }
};

const mockDrivers = {
    "Bus 12": { name: "James Wilson" },
    "Bus 05": { name: "Sarah Miller" },
    "Bus 15": { name: "Robert Fox" },
    "Bus 03": { name: "David Chen" },
    "Bus 21": { name: "Michael Ross" }
};

const mockNotices = [
    "Final exam schedule is out.",
    "Bus route 12 detour today.",
    "College fest preparations began!",
    "Library open 24/7 this week.",
    "Health camp on Wednesday."
];

// State management
let currentUser = null;
let simulationInterval = null;

// Auth Logic (Shared)
function checkAuth() {
    const session = localStorage.getItem('bus_session');
    const path = window.location.pathname;
    const isLoginPage = path.endsWith('login.html') || path.endsWith('index.html') || path === '/';
    const isDashboardPage = path.endsWith('dashboard.html');

    if (session) {
        currentUser = JSON.parse(session);
        if (isLoginPage) {
            window.location.href = 'dashboard.html';
        }
    } else {
        if (isDashboardPage) {
            window.location.href = 'login.html';
        }
    }
}

// Initialization based on page
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    
    if (document.getElementById('login-btn')) {
        setupLoginPage();
    }
    
    if (document.getElementById('student-name')) {
        setupDashboardPage();
    }
});

// LOGIN PAGE LOGIC
function setupLoginPage() {
    const loginBtn = document.getElementById('login-btn');
    const rollInput = document.getElementById('roll-number');
    const loginError = document.getElementById('login-error');

    function performLogin() {
        const roll = rollInput.value.trim().toUpperCase();
        if (students[roll]) {
            localStorage.setItem('bus_session', JSON.stringify(students[roll]));
            window.location.href = 'dashboard.html';
        } else {
            loginError.classList.remove('hidden');
            setTimeout(() => loginError.classList.add('hidden'), 3000);
        }
    }

    loginBtn.addEventListener('click', performLogin);
    rollInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') performLogin();
    });
}

// DASHBOARD PAGE LOGIC
function setupDashboardPage() {
    if (!currentUser) return;

    // Elements
    const studentNameEl = document.getElementById('student-name');
    const busNoEl = document.getElementById('bus-no');
    const currentLocationEl = document.getElementById('current-location');
    const nextStopEl = document.getElementById('next-stop');
    const endPointEl = document.getElementById('end-point');
    const etaEl = document.getElementById('eta');
    const busSpeedEl = document.getElementById('bus-speed');
    const busOccupancyEl = document.getElementById('bus-occupancy');
    const trackStopsEl = document.getElementById('track-stops');
    const progressLine = document.getElementById('progress-line');
    const busPointer = document.getElementById('bus-pointer');
    const driverNameEl = document.getElementById('driver-name');
    const driverInitialsEl = document.getElementById('driver-initials');
    const weatherInfoEl = document.getElementById('weather-info');
    const noticeListEl = document.getElementById('notice-list');
    const logoutBtn = document.getElementById('logout-btn');

    // Fill Basic Info
    studentNameEl.textContent = currentUser.name;
    busNoEl.textContent = currentUser.busNo;
    endPointEl.textContent = currentUser.endPoint;
    
    const driver = mockDrivers[currentUser.busNo] || { name: "Unassigned" };
    driverNameEl.textContent = driver.name;
    driverInitialsEl.textContent = driver.name.split(' ').map(n=>n[0]).join('');
    
    updateWeather(weatherInfoEl);
    updateNotices(noticeListEl);
    
    // Setup Tracking
    renderTrackStops(trackStopsEl, currentUser.stops);
    startTracking(progressLine, busPointer, currentLocationEl, nextStopEl, busSpeedEl, busOccupancyEl, etaEl, currentUser.stops);

    logoutBtn.addEventListener('click', () => {
        localStorage.removeItem('bus_session');
        window.location.href = 'login.html';
    });
}

function updateWeather(el) {
    const temps = [22, 24, 26, 28];
    const states = ["⛅ Partly Cloudy", "☀️ Sunny", "☁️ Cloudy"];
    const temp = temps[Math.floor(Math.random() * temps.length)];
    const state = states[Math.floor(Math.random() * states.length)];
    el.textContent = `${state}, ${temp}°C`;
}

function updateNotices(el) {
    el.innerHTML = '';
    const selected = mockNotices.sort(() => 0.5 - Math.random()).slice(0, 3);
    selected.forEach(note => {
        const div = document.createElement('div');
        div.className = 'notice-item';
        div.textContent = note;
        el.appendChild(div);
    });
}

function renderTrackStops(container, stops) {
    container.innerHTML = '';
    stops.forEach((stop, index) => {
        const left = (index / (stops.length - 1)) * 100;
        const stopDiv = document.createElement('div');
        stopDiv.className = 'track-stop';
        stopDiv.style.left = `${left}%`;
        stopDiv.innerHTML = `
            <div class="stop-dot" id="stop-${index}"></div>
            <span class="stop-label">${stop}</span>
        `;
        container.appendChild(stopDiv);
    });
}

function startTracking(line, ptr, loc, nxt, spd, occ, eta, stops) {
    let stopIndex = 0;
    
    const updateTracking = () => {
        // First set the data for the target stop
        const current = stops[stopIndex];
        const next = stops[stopIndex + 1] || "Arrived";
        
        loc.textContent = current;
        nxt.textContent = next;
        
        // Then calculate and set progress
        const progress = (stopIndex / (stops.length - 1)) * 100;
        
        line.style.width = `${progress}%`;
        ptr.style.left = `${progress}%`;
        
        // Update dots
        stops.forEach((_, i) => {
            const dot = document.getElementById(`stop-${i}`);
            if (dot) {
                dot.classList.remove('active', 'reached');
                if (i < stopIndex) dot.classList.add('reached');
                if (i === stopIndex) dot.classList.add('active');
            }
        });

        spd.textContent = `${Math.floor(Math.random() * 20) + 30} km/h`;
        occ.textContent = ["Low", "Moderate", "High"][Math.floor(Math.random() * 3)];
        
        const etaValue = (stops.length - 1 - stopIndex) * 5 + Math.floor(Math.random() * 3);
        eta.textContent = next === "Arrived" ? "0 mins" : `${etaValue} mins`;
        
        // Advance to next stop for the next interval
        stopIndex = (stopIndex + 1) % stops.length;
    };
    
    updateTracking();
    simulationInterval = setInterval(updateTracking, 3000);
}
