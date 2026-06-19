// Mock Database with Persistence
const DEFAULT_STUDENTS = {
    "ES24AD131": {
        name: "Ruthran",
        advisorEmail: "advisor.ruthran@college.edu",
        busNo: "Bus 15",
        startPoint: "Sector 14, City Center",
        endPoint: "College Campus Main Gate",
        stops: ["Sector 14", "Mall Road", "Kalyan Chowk", "Public Park", "University Circle", "College Campus"]
    },
    "ES24AD134": {
        name: "Sailesh",
        advisorEmail: "advisor.sailesh@college.edu",
        busNo: "Bus 03",
        startPoint: "Old Town Square",
        endPoint: "College Campus Main Gate",
        stops: ["Old Town", "Market Street", "Railway Station", "Bridge View", "College Campus"]
    },
    "ES24AD138": {
        name: "Sanjay",
        advisorEmail: "advisor.sanjay@college.edu",
        busNo: "Bus 21",
        startPoint: "Highway Junction",
        endPoint: "College Campus Main Gate",
        stops: ["Highway Jct", "City Mall", "Tech Park", "Green Valley", "College Campus"]
    },
    "ES24AD141": {
        name: "Santhosh",
        advisorEmail: "advisor.santhosh@college.edu",
        busNo: "Bus 15",
        startPoint: "Sector 14, City Center",
        endPoint: "College Campus Main Gate",
        stops: ["Sector 14", "Mall Road", "Kalyan Chowk", "Public Park", "University Circle", "College Campus"]
    },
    "ES24AD132": {
        name: "Priya Patel",
        advisorEmail: "advisor.priya@college.edu",
        busNo: "Bus 05",
        startPoint: "Old Town Square",
        endPoint: "College Campus Main Gate",
        stops: ["Old Town", "Market Street", "Railway Station", "Bridge View", "College Campus"]
    }
};

const API_BASE = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') ? `http://${window.location.hostname}:3000` : '';
let students = {};
let routeMap = {};

async function loadDataFromServer() {
    const statusValue = document.querySelector('.status-value');
    const statusDot = document.querySelector('.status-dot');

    try {
        const res = await fetch(`${API_BASE}/api/data`);
        const data = await res.json();
        students = data.students || DEFAULT_STUDENTS;
        mockDrivers = data.drivers || DEFAULT_DRIVERS;
        mockNotices = data.notices || DEFAULT_NOTICES;
        mockNews = data.news || [];
        mockFeedback = data.feedback || [];
        mockEvents = data.events || [];
        routeMap = data.routeMap || {};
        
        if (statusValue) statusValue.textContent = "All Buses on Route • Online";
        if (statusDot) statusDot.className = "status-dot pulse-success";
        
        // Load Lost & Found from localStorage as it's not in Excel yet
        lostFoundItems = JSON.parse(localStorage.getItem('bus_lost_found')) || [];
        console.log("Data loaded from Excel backend");
    } catch (err) {
        console.warn("Backend not reached, using local fallback");
        students = JSON.parse(localStorage.getItem('bus_students')) || DEFAULT_STUDENTS;
        mockDrivers = JSON.parse(localStorage.getItem('bus_drivers')) || DEFAULT_DRIVERS;
        mockNotices = JSON.parse(localStorage.getItem('bus_notices')) || DEFAULT_NOTICES;
        mockFeedback = [
            { text: '"Always on time, makes my commute so much easier!"', author: "- Ruthran, Final Year" },
            { text: '"The live ETA is super accurate. No more waiting in the rain!"', author: "- Priya Patel, Junior" }
        ];
        lostFoundItems = JSON.parse(localStorage.getItem('bus_lost_found')) || [];
        
        if (statusValue) statusValue.textContent = "Offline • Ensure Server is Running";
        if (statusDot) statusDot.className = "status-dot pulse-warning";
    }
}

async function saveDataToServer() {
    try {
        await fetch(`${API_BASE}/api/save`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ students, drivers: mockDrivers, notices: mockNotices })
        });
        localStorage.setItem('bus_students', JSON.stringify(students));
        localStorage.setItem('bus_drivers', JSON.stringify(mockDrivers));
        localStorage.setItem('bus_notices', JSON.stringify(mockNotices));
        console.log("Synced to Excel");
    } catch (err) {
        console.error("Sync failed", err);
    }
}

function saveStudents() { saveDataToServer(); }

const DEFAULT_DRIVERS = {
    "Bus 12": { name: "James Wilson", phone: "+91 98765 43210" },
    "Bus 05": { name: "Sarah Miller", phone: "+91 98765 43211" },
    "Bus 15": { name: "Robert Fox", phone: "+91 98765 43212" },
    "Bus 03": { name: "David Chen", phone: "+91 98765 43213" },
    "Bus 21": { name: "Michael Ross", phone: "+91 98765 43214" }
};

let mockDrivers = {};
function saveDrivers() { saveDataToServer(); }

const DEFAULT_NOTICES = [
    "Final exam schedule is out.",
    "Bus route 12 detour today.",
    "College fest preparations began!",
    "Library open 24/7 this week.",
    "Health camp on Wednesday."
];

let mockNotices = [];
function saveNotices() { saveDataToServer(); }

// State management
let currentUser = null;
let simulationInterval = null;
let pinnedStopIndex = null;
let currentTheme = 'dark';
let lostFoundItems = [];
let mockNews = [];
let mockFeedback = [];
let mockEvents = [];
let gpsInterval = null;
let isBroadcasting = false;

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
document.addEventListener('DOMContentLoaded', async () => {
    checkAuth();
    await loadDataFromServer();
    
    if (document.body.classList.contains('auth-page')) {
        setupLoginPage();
        
        // Login Page Widgets Logic
        setInterval(() => {
            const now = new Date();
            const timeEl = document.getElementById('live-time');
            const dateEl = document.getElementById('live-date');
            if (timeEl) timeEl.textContent = now.toLocaleTimeString();
            if (dateEl) dateEl.textContent = now.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        }, 1000);

        const noticeText = document.getElementById('notice-text');
        const eventContainer = document.getElementById('dynamic-events-container');

        const loadCampusInfo = () => {
            if (noticeText && mockNews.length > 0) {
                noticeText.textContent = mockNews.join(" • ");
            } else if (noticeText && mockNotices.length > 0) {
                noticeText.textContent = mockNotices.join(" • "); // Fallback if news is empty
            }
            
            if (eventContainer && mockEvents.length > 0) {
                eventContainer.innerHTML = mockEvents.map(ev => `
                    <div class="event-item">
                        <span class="event-date">${ev.date || ev.Date || '...'}</span>
                        <span class="event-name">${ev.name || ev.Name || 'Event'}</span>
                    </div>
                `).join('');
            } else if (eventContainer) {
                eventContainer.innerHTML = '<p style="font-size: 0.8rem; color: var(--text-dim);">No upcoming events</p>';
            }
        };

        loadCampusInfo();

        const searchInput = document.getElementById('minimal-route-search');
        const suggestionsBox = document.getElementById('search-suggestions');
        const searchBtn = document.getElementById('search-go');

        if (searchInput && suggestionsBox) {
            searchInput.addEventListener('input', () => {
                const val = searchInput.value.toLowerCase().trim();
                if (!val) {
                    suggestionsBox.classList.add('hidden');
                    return;
                }

                const matches = [];
                Object.entries(routeMap).forEach(([bus, stops]) => {
                    const busMatch = bus.toLowerCase().includes(val);
                    const stopMatches = stops.filter(s => s.toLowerCase().includes(val));
                    
                    if (busMatch) matches.push({ text: bus, type: 'Route', icon: '🚌' });
                    stopMatches.forEach(s => matches.push({ text: s, type: 'Stop', icon: '📍', bus }));
                });

                if (matches.length > 0) {
                    suggestionsBox.innerHTML = matches.slice(0, 6).map(m => `
                        <div class="suggestion-item" onclick="window.location.href='routes.html?query=${encodeURIComponent(m.bus || m.text)}'">
                            <span class="suggestion-icon">${m.icon}</span>
                            <span class="suggestion-text">${m.text}${m.bus ? ` (via ${m.bus})` : ''}</span>
                            <span class="suggestion-type">${m.type}</span>
                        </div>
                    `).join('');
                    suggestionsBox.classList.remove('hidden');
                } else {
                    suggestionsBox.innerHTML = '<div style="padding: 15px; color: var(--text-dim); text-align: center; font-size: 0.85rem;">No matches found</div>';
                    suggestionsBox.classList.remove('hidden');
                    // Live Weather Logic (Dynamic)
        async function updateWeather(lat = 11.41, lon = 77.67) { // Default ESEC Erode
            try {
                const response = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`);
                const data = await response.json();
                
                if (data && data.current_weather) {
                    const temp = Math.round(data.current_weather.temperature);
                    const code = data.current_weather.weathercode;
                    
                    // Simple Weather Mapping
                    const weatherMap = {
                        0: "Clear Sky", 1: "Mainly Clear", 2: "Partly Cloudy", 3: "Overcast",
                        45: "Foggy", 48: "Depositing Rime Fog",
                        51: "Light Drizzle", 53: "Moderate Drizzle", 55: "Dense Drizzle",
                        61: "Slight Rain", 63: "Moderate Rain", 65: "Heavy Rain",
                        71: "Slight Snow", 73: "Moderate Snow", 75: "Heavy Snow",
                        80: "Slight Showers", 81: "Moderate Showers", 82: "Violent Showers",
                        95: "Thunderstorm", 96: "Thunderstorm with Hail", 99: "Thunderstorm with Hail"
                    };

                    const desc = weatherMap[code] || "Clear";
                    
                    const tempEl = document.getElementById('weather-temp');
                    const descEl = document.getElementById('weather-desc');
                    
                    if (tempEl) tempEl.textContent = `${temp}°C`;
                    if (descEl) descEl.textContent = desc;
                }
            } catch (err) {
                console.error("Weather fetch failed:", err);
            }
        }

        // Get Location & Init Weather
        if ("geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition(
                (pos) => updateWeather(pos.coords.latitude, pos.coords.longitude),
                () => updateWeather() // Fallback to campus
            );
        } else {
            updateWeather();
        }
    }
            });

            document.addEventListener('click', (e) => {
                if (!searchInput.contains(e.target) && !suggestionsBox.contains(e.target)) {
                    suggestionsBox.classList.add('hidden');
                }
            });
        }

        if (searchBtn) {
            searchBtn.addEventListener('click', () => {
                const query = searchInput.value;
                if (query) window.location.href = 'routes.html?query=' + encodeURIComponent(query);
            });
        }

        // Student Quote Rotation (Dynamic from Excel)
        let quoteIndex = 0;
        const getQuotes = () => {
            if (mockFeedback && mockFeedback.length > 0) return mockFeedback;
            return [
                { text: '"Always on time, makes my commute so much easier!"', author: "- Ruthran, Final Year" },
                { text: '"The live ETA is super accurate. No more waiting in the rain!"', author: "- Priya Patel, Junior" },
                { text: '"Love the new campus map. Very intuitive design."', author: "- Sanjay, Sophomore" },
                { text: '"Best bus tracking app I have used so far!"', author: "- Sailesh, 3rd Year" }
            ];
        };
        
        setInterval(() => {
            const quoteEl = document.getElementById('student-quote');
            const authorEl = document.getElementById('quote-author');
            const activeQuotes = getQuotes();
            
            if (quoteEl && authorEl && activeQuotes.length > 0) {
                quoteEl.style.transition = "opacity 0.5s ease";
                authorEl.style.transition = "opacity 0.5s ease";
                quoteEl.style.opacity = 0;
                authorEl.style.opacity = 0;
                setTimeout(() => {
                    quoteIndex = (quoteIndex + 1) % activeQuotes.length;
                    quoteEl.textContent = activeQuotes[quoteIndex].text;
                    authorEl.textContent = activeQuotes[quoteIndex].author;
                    quoteEl.style.opacity = 1;
                    authorEl.style.opacity = 1;
                }, 500);
            }
        }, 8000);



        // Quick Access Widget Status Logic (Randomized for Login Page)
        function updateCampusStatus() {
            const statusText = document.getElementById('campus-status-text');
            const statusPulse = document.querySelector('.status-pulse');
            if (!statusText || !statusPulse) return;

            const statuses = [
                { text: "Campus Status: Normal", class: "green" },
                { text: "Campus Status: Normal", class: "green" },
                { text: "Campus Status: Minor Delay", class: "yellow" },
                { text: "Campus Status: Heavy Traffic", class: "yellow" }
            ];

            const current = statuses[Math.floor(Math.random() * statuses.length)];
            statusText.textContent = current.text;
            statusPulse.className = `status-pulse ${current.class}`;

            const libStatus = document.getElementById('lib-status');
            if (libStatus) {
                const seats = 20 + Math.floor(Math.random() * 60);
                libStatus.textContent = `${seats} Seats`;
            }
        }
        updateCampusStatus();
        setInterval(updateCampusStatus, 20000);

        // Toggle Quick Support Widget
        const supportToggle = document.getElementById('quick-support-toggle');
        const supportWidget = document.getElementById('quick-support-widget');
        
        if (supportToggle && supportWidget) {
            supportToggle.addEventListener('click', (e) => {
                e.stopPropagation();
                supportWidget.classList.toggle('hidden');
            });

            document.addEventListener('click', (e) => {
                if (!supportWidget.contains(e.target) && !supportToggle.contains(e.target)) {
                    supportWidget.classList.add('hidden');
                }
            });
        }
    }
    
    if (document.getElementById('student-name')) {
        setupDashboardPage();
    }

    // Always try to bind logout if present
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            localStorage.removeItem('bus_session');
            window.location.href = 'login.html';
        });
    }
});

// LOGIN PAGE LOGIC
function setupLoginPage() {
    const studentFields = document.getElementById('student-fields');
    const staffFields = document.getElementById('staff-fields');
    const selStudent = document.getElementById('sel-student');
    const selStaff = document.getElementById('sel-staff');
    const submitBtn = document.getElementById('login-submit-btn');
    
    const rollInput = document.getElementById('roll-number');
    const staffUserInput = document.getElementById('staff-user');
    const staffPassInput = document.getElementById('staff-pass');
    const loginError = document.getElementById('login-error');

    let activeRole = 'student';

    function switchRole(role) {
        activeRole = role;
        if (role === 'student') {
            selStudent.classList.add('active');
            selStaff.classList.remove('active');
            studentFields.classList.remove('hidden');
            staffFields.classList.add('hidden');
        } else {
            selStudent.classList.remove('active');
            selStaff.classList.add('active');
            studentFields.classList.add('hidden');
            staffFields.classList.remove('hidden');
        }
    }

    if (selStudent) selStudent.addEventListener('click', () => switchRole('student'));
    if (selStaff) selStaff.addEventListener('click', () => switchRole('staff'));

    function showLoginError() {
        loginError.classList.remove('hidden');
        setTimeout(() => loginError.classList.add('hidden'), 3000);
    }

    function performLogin() {
        if (activeRole === 'student') {
            const roll = rollInput.value.trim().toUpperCase();
            if (students[roll]) {
                localStorage.setItem('bus_session', JSON.stringify({ ...students[roll], role: 'student' }));
                window.location.href = 'dashboard.html';
            } else {
                showLoginError();
            }
        } else {
            const user = staffUserInput.value.trim();
            const pass = staffPassInput.value.trim();
            if (user === 'admin' && pass === 'admin123') {
                localStorage.setItem('bus_session', JSON.stringify({ name: 'Admin Staff', role: 'staff', busNo: 'Management' }));
                window.location.href = 'dashboard.html';
            } else {
                showLoginError();
            }
        }
    }

    if (submitBtn) submitBtn.addEventListener('click', performLogin);

    [rollInput, staffUserInput, staffPassInput].forEach(input => {
        if (input) {
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') performLogin();
            });
        }
    });
}

// DASHBOARD PAGE LOGIC
function setupDashboardPage() {
    if (!currentUser) return;

    // Elements
    const studentNameEl = document.getElementById('student-name');
    const busNoEl = document.getElementById('bus-no');
    const trackingSection = document.getElementById('tracking-section');
    const adminPanel = document.getElementById('admin-panel');
    const driverInfo = document.querySelector('.driver-info');
    const widgets = document.querySelector('.widget-section');
    const emergencyActions = document.querySelector('.emergency-strip');
    
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
    const themeToggle = document.getElementById('theme-toggle');
    const shareBtn = document.getElementById('share-ride-btn');
    const reportLostBtn = document.getElementById('report-lost-btn');


    // Theme Toggle
    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
            document.body.classList.toggle('light-mode', currentTheme === 'light');
            themeToggle.textContent = currentTheme === 'dark' ? '🌓' : '☀️';
        });
    }

    // Share Ride
    if (shareBtn) {
        shareBtn.addEventListener('click', () => {
            const loc = document.getElementById('current-location').textContent;
            const eta = document.getElementById('eta').textContent;
            const bus = currentUser.busNo;
            const text = `🚌 *Smart Bus Tracking Update* \nI'm on *${bus}*.\n📍 Current: ${loc}\n🕒 ETA: ${eta}\n\nTrack me live: [College Bus Dashboard]`;
            
            // Open WhatsApp
            const waUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
            window.open(waUrl, '_blank');
            
            // Still copy to clipboard as fallback
            navigator.clipboard.writeText(text).then(() => {
                console.log("Status also copied to clipboard.");
            });
        });
    }

    // Lost & Found
    if (reportLostBtn) {
        reportLostBtn.addEventListener('click', () => {
            const item = prompt("What did you find/lose?");
            if (item) {
                lostFoundItems.unshift({
                    id: Date.now(),
                    user: currentUser.name,
                    text: item
                });
                localStorage.setItem('bus_lost_found', JSON.stringify(lostFoundItems));
                renderLostFoundList(document.getElementById('lost-found-list'));
            }
        });
    }

    function renderLostFoundList(container) {
        if (!container) return;
        container.innerHTML = '';
        if (lostFoundItems.length === 0) {
            container.innerHTML = '<div class="notice-item" style="font-style: italic; opacity: 0.6;">No items reported today.</div>';
            return;
        }
        
        lostFoundItems.forEach(item => {
            const div = document.createElement('div');
            div.className = 'notice-item';
            div.style.display = 'flex';
            div.style.justifyContent = 'space-between';
            div.style.alignItems = 'center';
            div.innerHTML = `
                <span><strong>${item.user}:</strong> ${item.text}</span>
                <button class="remove-lost-btn" data-id="${item.id}" style="background:transparent; border:none; color:var(--error); cursor:pointer; font-size:1.1rem; padding:0 5px;">×</button>
            `;
            
            div.querySelector('.remove-lost-btn').addEventListener('click', (e) => {
                const id = parseInt(e.target.getAttribute('data-id'));
                lostFoundItems = lostFoundItems.filter(i => i.id !== id);
                localStorage.setItem('bus_lost_found', JSON.stringify(lostFoundItems));
                renderLostFoundList(container);
            });
            
            container.appendChild(div);
        });
    }


    // Role-based UI visibility
    if (currentUser.role === 'staff') {
        if (trackingSection) trackingSection.classList.add('hidden');
        if (adminPanel) adminPanel.classList.remove('hidden');
        if (driverInfo) driverInfo.classList.add('hidden');
        if (widgets) widgets.style.marginTop = '0';
        if (emergencyActions) emergencyActions.classList.add('hidden');
        
        renderStudentList();
        setupAdminModal();
        setupAddModal();
        renderNoticeManager();
        setupNoticeManager();
    } else {
        const mapContainer = document.getElementById('campus-map-container');
        if (mapContainer) mapContainer.classList.remove('hidden');

        // Fill Student Tracking Info
        studentNameEl.textContent = currentUser.name;
        busNoEl.textContent = currentUser.busNo;
        endPointEl.textContent = currentUser.endPoint;
        if (document.getElementById('my-stop')) {
            document.getElementById('my-stop').textContent = currentUser.startPoint || 'Not assigned';
        }
        
        const driver = mockDrivers[currentUser.busNo] || { name: "Unassigned", phone: "" };
        driverNameEl.textContent = driver.name;
        driverInitialsEl.textContent = driver.name.split(' ').map(n=>n[0]).join('');
        
        // Update Call Button
        const callBtn = document.getElementById('call-driver-btn');
        if (callBtn) {
            if (driver.phone) {
                callBtn.href = `tel:${driver.phone.replace(/[\s+]/g, '')}`;
                callBtn.style.opacity = '1';
                callBtn.style.pointerEvents = 'auto';
            } else {
                callBtn.href = '#';
                callBtn.style.opacity = '0.5';
                callBtn.style.pointerEvents = 'none';
            }
        }
        
        // Setup Tracking
        renderTrackStops(trackStopsEl, currentUser.stops);
        renderMapPoints(currentUser.stops);
        startTracking(progressLine, busPointer, currentLocationEl, nextStopEl, busSpeedEl, busOccupancyEl, etaEl, currentUser.stops);
        startGpsPolling(currentUser.busNo);
    }
    
    updateWeather(weatherInfoEl);
    updateNotices(noticeListEl);
    renderLostFoundList(document.getElementById('lost-found-list'));
    
    // Modal logic (SOS, Report)
    setupModals();

    // Vote buttons logic
    document.querySelectorAll('.vote-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const status = btn.getAttribute('data-status');
            const occ = document.getElementById('bus-occupancy');
            if (occ) occ.textContent = status + " (Verified)";
            alert(`Thanks! You reported crowd as ${status}.`);
        });
    });

    // New Features: Boarding Pass
    setupBoardingPass();


}

// Admin Logic
function renderStudentList() {
    const listBody = document.getElementById('student-list-body');
    if (!listBody) return;
    listBody.innerHTML = '';
    
    Object.keys(students).sort().forEach(roll => {
        const student = students[roll];
        const tr = document.createElement('tr');
        tr.setAttribute('data-roll', roll);
        tr.innerHTML = `
            <td>${roll}</td>
            <td>${student.name}</td>
            <td>${student.busNo}</td>
            <td>${student.stops ? student.stops[0] + ' → ' + student.stops[student.stops.length-1] : 'N/A'}</td>
            <td>
                <button class="edit-btn" data-roll="${roll}">Edit</button>
                <button class="delete-btn" data-roll="${roll}">Delete</button>
            </td>
        `;

        // Handle Row Selection
        tr.addEventListener('click', (e) => {
            if (e.target.tagName !== 'BUTTON') {
                selectStudent(roll);
            }
        });

        listBody.appendChild(tr);
    });

    // Add click listeners to buttons
    listBody.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            openEditModal(btn.getAttribute('data-roll'));
        });
    });

    listBody.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            deleteStudent(btn.getAttribute('data-roll'));
        });
    });
}

function selectStudent(roll) {
    const s = students[roll];
    if (!s) return;

    // Update UI elements
    const nameEl = document.getElementById('student-name');
    const busEl = document.getElementById('bus-no');
    const endPointEl = document.getElementById('end-point');
    const myStpEl = document.getElementById('my-stop');
    const driverNameEl = document.getElementById('driver-name');
    const driverInitialsEl = document.getElementById('driver-initials');
    const callBtn = document.getElementById('call-driver-btn');

    if (nameEl) nameEl.textContent = s.name;
    if (busEl) busEl.textContent = s.busNo;
    if (endPointEl) endPointEl.textContent = s.endPoint;
    if (myStpEl) myStpEl.textContent = s.startPoint || 'N/A';

    const driver = mockDrivers[s.busNo] || { name: "Not Assigned", phone: "" };
    if (driverNameEl) driverNameEl.textContent = driver.name;
    if (driverInitialsEl) driverInitialsEl.textContent = driver.name.split(' ').map(n=>n[0]).join('');

    // Update Call Button
    if (callBtn) {
        if (driver.phone) {
            callBtn.href = `tel:${driver.phone.replace(/[\s+]/g, '')}`;
            callBtn.style.opacity = '1';
            callBtn.style.pointerEvents = 'auto';
        } else {
            callBtn.href = '#';
            callBtn.style.opacity = '0.5';
            callBtn.style.pointerEvents = 'none';
        }
    }

    // Highlight row
    document.querySelectorAll('#student-list-body tr').forEach(tr => {
        tr.classList.remove('selected-row');
        if (tr.getAttribute('data-roll') === roll) {
            tr.classList.add('selected-row');
        }
    });

    console.log(`Selected student: ${s.name} (${roll})`);
}

function deleteStudent(roll) {
    if (confirm(`Are you sure you want to delete student ${roll}?`)) {
        delete students[roll];
        saveStudents();
        renderStudentList();
    }
}

function populateBusDropdowns() {
    const addBus = document.getElementById('add-bus');
    const editBus = document.getElementById('edit-bus');
    const buses = Object.keys(routeMap).sort();
    
    [addBus, editBus].forEach(select => {
        if (!select) return;
        // Keep only first "Select" option
        select.innerHTML = '<option value="">Select a Bus</option>';
        buses.forEach(bus => {
            const opt = document.createElement('option');
            opt.value = bus;
            opt.textContent = bus;
            select.appendChild(opt);
        });
    });
}

function updateDriverPreview(bus, displayId, phoneId, previewId) {
    const disp = document.getElementById(displayId);
    const ph = document.getElementById(phoneId);
    const preview = document.getElementById(previewId);
    const driver = mockDrivers[bus];

    if (driver && bus) {
        if (disp) disp.textContent = driver.name;
        if (ph) ph.textContent = driver.phone;
        if (preview) preview.classList.remove('hidden');
    } else {
        if (preview) preview.classList.add('hidden');
    }
}

function openEditModal(roll) {
    const modal = document.getElementById('edit-modal');
    const student = students[roll];
    if (!student) return;

    populateBusDropdowns(); // Ensure latest routes

    document.getElementById('edit-roll').value = roll;
    document.getElementById('edit-name').value = student.name;
    document.getElementById('edit-bus').value = student.busNo;
    
    updateDriverPreview(student.busNo, 'edit-driver-display', 'edit-phone-display', 'edit-driver-preview');
    
    // Load Advisor Info
    document.getElementById('edit-advisor').value = student.advisorEmail || "";
    
    modal.classList.remove('hidden');
}

function setupAdminModal() {
    const saveBtn = document.getElementById('save-student-btn');
    const closeBtn = document.getElementById('close-edit');
    const modal = document.getElementById('edit-modal');
    const busSelect = document.getElementById('edit-bus');

    if (busSelect) {
        busSelect.addEventListener('change', (e) => {
            updateDriverPreview(e.target.value, 'edit-driver-display', 'edit-phone-display', 'edit-driver-preview');
        });
    }



    if (saveBtn) {
        saveBtn.addEventListener('click', () => {
            const roll = document.getElementById('edit-roll').value;
            const name = document.getElementById('edit-name').value.trim();
            const bus = document.getElementById('edit-bus').value;
            const advisorEmail = document.getElementById('edit-advisor').value.trim();
            
            if (!name || !bus || !advisorEmail) {
                alert('Please fill all fields');
                return;
            }

            if (students[roll]) {
                students[roll].name = name;
                students[roll].busNo = bus;
                students[roll].advisorEmail = advisorEmail;
                students[roll].stops = routeMap[bus] || ["Start", "College Campus"];
                
                saveStudents();
                renderStudentList();
                selectStudent(roll);
                
                modal.classList.add('hidden');
                alert('Student and Driver info updated!');
            }
        });
    }

    if (closeBtn) {
        closeBtn.addEventListener('click', () => modal.classList.add('hidden'));
    }
}

function setupAddModal() {
    const trigger = document.getElementById('add-student-trigger');
    const modal = document.getElementById('add-modal');
    const closeBtn = document.getElementById('close-add');
    const confirmBtn = document.getElementById('confirm-add-btn');
    const busSelect = document.getElementById('add-bus');

    if (busSelect) {
        busSelect.addEventListener('change', (e) => {
            updateDriverPreview(e.target.value, 'add-driver-display', 'add-phone-display', 'add-driver-preview');
        });
    }

    if (trigger) {
        trigger.addEventListener('click', () => {
            populateBusDropdowns();
            modal.classList.remove('hidden');
        });
    }

    if (closeBtn) closeBtn.addEventListener('click', () => modal.classList.add('hidden'));
    
    if (confirmBtn) {
        confirmBtn.addEventListener('click', () => {
            const roll = document.getElementById('add-roll').value.trim().toUpperCase();
            const name = document.getElementById('add-name').value.trim();
            const bus = document.getElementById('add-bus').value;
            const advisorEmail = document.getElementById('add-advisor').value.trim();

            if (!roll || !name || !bus || !advisorEmail) {
                alert('Please fill all fields');
                return;
            }

            if (students[roll]) {
                alert('Student with this roll number already exists!');
                return;
            }

            // Create new student
            students[roll] = {
                name: name,
                busNo: bus,
                advisorEmail: advisorEmail,
                startPoint: "Default Start",
                endPoint: "College Campus Main Gate",
                stops: routeMap[bus] || ["Start", "College Campus"]
            };

            saveStudents();
            renderStudentList();
            modal.classList.add('hidden');
            
            // Clear inputs
            document.getElementById('add-roll').value = '';
            document.getElementById('add-name').value = '';
            document.getElementById('add-bus').value = '';
            document.getElementById('add-driver-preview').classList.add('hidden');
            document.getElementById('add-advisor').value = '';
            
            alert('Student added successfully!');
        });
    }

    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.classList.add('hidden');
        });
    }
}

// Shared Modal Logic
function setupModals() {
    // SOS Logic
    const sosTrigger = document.getElementById('sos-trigger');
    const sosModal = document.getElementById('sos-modal');
    const closeSos = document.getElementById('close-sos');

    if (sosTrigger && sosModal && closeSos) {
        sosTrigger.addEventListener('click', () => sosModal.classList.remove('hidden'));
        closeSos.addEventListener('click', (e) => {
            e.preventDefault();
            sosModal.classList.add('hidden');
        });
        sosModal.addEventListener('click', (e) => {
            if (e.target === sosModal) sosModal.classList.add('hidden');
        });
    }

    // Report Issue Logic
    const reportTrigger = document.getElementById('report-trigger');
    const reportModal = document.getElementById('report-modal');
    const closeReport = document.getElementById('close-report');
    const reportOptions = document.querySelectorAll('.report-option');

    if (reportTrigger && reportModal && closeReport) {
        reportTrigger.addEventListener('click', () => reportModal.classList.remove('hidden'));
        closeReport.addEventListener('click', () => reportModal.classList.add('hidden'));
        reportModal.addEventListener('click', (e) => {
            if (e.target === reportModal) reportModal.classList.add('hidden');
        });
        reportOptions.forEach(option => {
            option.addEventListener('click', () => {
                const issue = option.getAttribute('data-issue');
                
                // Crowdsourced Occupancy Update (Simulated)
                if (issue === "Bus Overcrowded") {
                    const occ = document.getElementById('bus-occupancy');
                    if (occ) occ.textContent = "High (Reported)";
                }
                // Check if current user is a student and has an advisor email
                if (currentUser && currentUser.role === 'student' && currentUser.advisorEmail) {
                    const subject = encodeURIComponent(`Bus Tracking Issue: ${issue}`);
                    const body = encodeURIComponent(`Respected Class Advisor,\n\nI am reporting an issue regarding my college bus tracking:\n\nIssue: ${issue}\nStudent: ${currentUser.name}\nRoll Number: ${Object.keys(students).find(k => students[k].name === currentUser.name) || 'N/A'}\nBus Number: ${currentUser.busNo}\n\nPlease take the necessary action.\n\nThank you.`);
                    
                    window.location.href = `mailto:${currentUser.advisorEmail}?subject=${subject}&body=${body}`;
                    alert(`Opening email to report: ${issue} to your advisor.`);
                } else {
                    alert(`Report submitted: ${issue}. Thank you!`);
                }
                
                reportModal.classList.add('hidden');
            });
        });
    }
}

function updateWeather(el) {
    const temps = [22, 24, 26, 28];
    const states = ["⛅ Partly Cloudy", "☀️ Sunny", "☁️ Cloudy"];
    const temp = temps[Math.floor(Math.random() * temps.length)];
    const state = states[Math.floor(Math.random() * states.length)];
    el.textContent = `${state}, ${temp}°C`;
}

function updateNotices(el) {
    if (!el) return;
    el.innerHTML = '';
    // Show most recent 5 notices
    const selected = mockNotices.slice(0, 5);
    selected.forEach(note => {
        const div = document.createElement('div');
        div.className = 'notice-item';
        div.textContent = note;
        el.appendChild(div);
    });
}

// Notice Management Logic
function renderNoticeManager() {
    const listEl = document.getElementById('admin-notice-list');
    if (!listEl) return;
    listEl.innerHTML = `<h4>Dashboard Notices</h4><div id="notice-items-container"></div>
                        <h4 style="margin-top:20px;">Login Page News</h4><div id="news-items-container"></div>`;
    
    const noticeContainer = listEl.querySelector('#notice-items-container');
    const newsContainer = listEl.querySelector('#news-items-container');

    // Render Notices
    mockNotices.forEach((notice, index) => {
        const div = createAdminItem(notice, () => {
            if (confirm('Delete this notice?')) {
                mockNotices.splice(index, 1);
                saveNotices();
                renderNoticeManager();
            }
        });
        noticeContainer.appendChild(div);
    });

    // Render News
    mockNews.forEach((news, index) => {
        const div = createAdminItem(news, () => {
            if (confirm('Delete this news ticker item?')) {
                mockNews.splice(index, 1);
                saveNotices();
                renderNoticeManager();
            }
        });
        newsContainer.appendChild(div);
    });
}

function createAdminItem(text, onDelete) {
    const div = document.createElement('div');
    div.style.display = 'flex';
    div.style.justifyContent = 'space-between';
    div.style.alignItems = 'center';
    div.style.padding = '8px 12px';
    div.style.marginBottom = '5px';
    div.style.background = 'rgba(255,255,255,0.03)';
    div.style.borderRadius = '6px';
    div.style.border = '1px solid rgba(255,255,255,0.05)';
    
    const span = document.createElement('span');
    span.style.fontSize = '0.85rem';
    span.textContent = text;
    
    const btn = document.createElement('button');
    btn.className = 'delete-btn';
    btn.style.margin = '0';
    btn.style.padding = '4px 8px';
    btn.textContent = 'Remove';
    btn.addEventListener('click', onDelete);

    div.appendChild(span);
    div.appendChild(btn);
    return div;
}

function setupNoticeManager() {
    const addNoticeBtn = document.getElementById('add-notice-btn');
    const addNewsBtn = document.getElementById('add-news-btn');
    const input = document.getElementById('new-notice-input');

    if (addNoticeBtn && input) {
        addNoticeBtn.addEventListener('click', () => {
            const text = input.value.trim();
            if (!text) return;
            mockNotices.unshift(text);
            saveNotices();
            input.value = '';
            renderNoticeManager();
            
            const sidebarNoticeList = document.getElementById('notice-list');
            if (sidebarNoticeList) updateNotices(sidebarNoticeList);
            alert('Added to Dashboard Notice Board!');
        });
    }

    if (addNewsBtn && input) {
        addNewsBtn.addEventListener('click', () => {
            const text = input.value.trim();
            if (!text) return;
            mockNews.unshift(text);
            saveNotices();
            input.value = '';
            renderNoticeManager();
            alert('Added to Login Page News Ticker!');
        });
    }

    if (input) {
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') addNoticeBtn.click();
        });
    }
}

function renderMapPoints(stops) {
    const group = document.getElementById('map-points-group');
    const mapPath = document.querySelector('.map-path');
    if (!group || !mapPath || !stops) return;
    
    group.innerHTML = '';
    const length = mapPath.getTotalLength();
    
    stops.forEach((stop, index) => {
        const dist = (index / (stops.length - 1)) * length;
        const point = mapPath.getPointAtLength(dist);
        
        // Add Dot
        const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        circle.setAttribute("cx", point.x);
        circle.setAttribute("cy", point.y);
        circle.setAttribute("r", "6");
        circle.setAttribute("class", "map-point");
        circle.setAttribute("id", `map-stop-${index}`);
        circle.style.cursor = 'pointer';
        
        // Add Pin Listener
        circle.addEventListener('click', () => {
            pinnedStopIndex = index;
            document.getElementById('pinned-stop-container').classList.remove('hidden');
            alert(`Pinned stop to: ${stop}`);
            // Highlight pinned stop on map
            document.querySelectorAll('.map-point').forEach(p => p.style.stroke = 'var(--bg-dark)');
            circle.style.stroke = 'var(--accent)';
            // Sync linear dots highlight
            const trackStops = document.getElementById('track-stops');
            if (trackStops) {
                trackStops.querySelectorAll('.stop-dot').forEach(d => d.style.borderColor = 'var(--bg-dark)');
                const dot = document.getElementById(`stop-${index}`);
                if (dot) dot.style.borderColor = 'var(--accent)';
            }
        });

        group.appendChild(circle);
        
        // Add Landmark Label (With class for hover logic)
        const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
        text.setAttribute("x", point.x);
        text.setAttribute("y", point.y - 15);
        text.setAttribute("text-anchor", "middle");
        text.setAttribute("class", "map-label");
        text.setAttribute("id", `map-label-${index}`);
        text.textContent = stop.split(',')[0];
        group.appendChild(text);

        // Hover Logic
        circle.addEventListener('mouseenter', () => text.classList.add('visible'));
        circle.addEventListener('mouseleave', () => text.classList.remove('visible'));
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

function getSegmentDuration(index) {
    // Deterministic varying duration: 3, 6, 4, 5 minutes (Average 4.5)
    const base = [3, 6, 4, 5];
    return base[index % base.length];
}

function startTracking(line, ptr, loc, nxt, spd, occ, eta, stops) {
    if (!stops || stops.length < 2) return;
    
    let currentPos = 0; 
    const baseStep = 0.01; 
    let isWaiting = true; 

    const statusText = document.getElementById('status-text');
    const statusIndicator = document.querySelector('.status-indicator');
    const pulse = document.querySelector('.pulse');
    
    // Initial UI Setup for "In Stop"
    if (statusText) statusText.textContent = "In Stop";
    if (statusIndicator) statusIndicator.classList.add('stop');
    if (pulse) pulse.classList.add('stop');
    if (spd) spd.textContent = "0 km/h";
    if (occ) occ.textContent = "Low";

    // Fix: Initial Map and Track Setup
    const mapBus = document.getElementById('simulation-bus');
    const mapPath = document.querySelector('.map-path');
    if (mapBus && mapPath) {
        const length = mapPath.getTotalLength();
        const point = mapPath.getPointAtLength(0);
        mapBus.setAttribute('transform', `translate(${point.x}, ${point.y})`);
        mapBus.classList.remove('hidden');
    }
    if (line) line.style.width = `0%`;
    if (ptr) ptr.style.left = `0%`;

    // End initial delay after 10 seconds as per user request
    setTimeout(() => {
        isWaiting = false;
        if (statusText) statusText.textContent = "On Route";
        if (statusIndicator) statusIndicator.classList.remove('stop');
        if (pulse) pulse.classList.remove('stop');
        if (spd) spd.textContent = `${Math.floor(Math.random() * 10) + 35} km/h`;
    }, 10000);

    const updateTracking = () => {
        if (isWaiting) return;

        const stopIndex = Math.floor(currentPos);
        const segmentDur = getSegmentDuration(stopIndex);
        const adjustedStep = baseStep / (segmentDur * 2); 
        
        currentPos += adjustedStep;
        
        // Stop at end of route
        if (currentPos >= stops.length - 1) {
            currentPos = stops.length - 1;
            isWaiting = true;
            if (occ) occ.textContent = "Low";
            if (spd) spd.textContent = "0 km/h";
            if (statusText) statusText.textContent = "End of Rout";
            if (statusIndicator) {
                statusIndicator.classList.add('end');
                statusIndicator.classList.remove('stop');
            }
            if (pulse) {
                pulse.classList.add('end');
                pulse.classList.remove('stop');
            }
        }

        const activeStopIndex = Math.floor(currentPos);
        const currentFractional = currentPos - activeStopIndex;

        // Calculate Times
        let elapsedMins = 0;
        for (let i = 0; i < activeStopIndex; i++) {
            elapsedMins += getSegmentDuration(i);
        }
        elapsedMins += currentFractional * getSegmentDuration(activeStopIndex);

        const currentSegDur = getSegmentDuration(activeStopIndex);
        const minsToNext = Math.max(0, Math.ceil((1 - currentFractional) * currentSegDur));

        let totalRemaining = (1 - currentFractional) * currentSegDur;
        for (let i = activeStopIndex + 1; i < stops.length - 1; i++) {
            totalRemaining += getSegmentDuration(i);
        }

        // UI Updates
        const totalProgress = (currentPos / (stops.length - 1)) * 100;
        if (line) line.style.width = `${totalProgress}%`;
        if (ptr) {
            ptr.style.left = `${totalProgress}%`;
            const timeSpentEl = ptr.querySelector('#time-spent');
            if (timeSpentEl) {
                timeSpentEl.textContent = `${stops[activeStopIndex]} (${Math.floor(elapsedMins)} mins)`;
            }
        }

        if (mapBus && mapPath) {
            const length = mapPath.getTotalLength();
            const point = mapPath.getPointAtLength((totalProgress / 100) * length);
            mapBus.setAttribute('transform', `translate(${point.x}, ${point.y})`);
            
            stops.forEach((_, i) => {
                const pt = document.getElementById(`map-stop-${i}`);
                if (pt) pt.classList.toggle('active', i === activeStopIndex);
            });
        }

        // Pinned Stop Logic
        if (pinnedStopIndex !== null) {
            if (activeStopIndex < pinnedStopIndex) {
                let pinnedMins = (1 - currentFractional) * currentSegDur;
                for (let i = activeStopIndex + 1; i < pinnedStopIndex; i++) {
                    pinnedMins += getSegmentDuration(i);
                }
                document.getElementById('pinned-eta').textContent = `${Math.ceil(pinnedMins)} mins`;
            } else if (activeStopIndex === pinnedStopIndex) {
                 document.getElementById('pinned-eta').textContent = `Arriving!`;
            } else {
                 document.getElementById('pinned-eta').textContent = `Passed`;
            }
        }
        
        if (loc) loc.textContent = stops[activeStopIndex];
        if (nxt) {
            const nextStopIndex = Math.min(activeStopIndex + 1, stops.length - 1);
            nxt.textContent = currentPos >= stops.length - 1 ? "Arriving Soon" : `${stops[nextStopIndex]} (${minsToNext} mins)`;
        }
        
        stops.forEach((_, i) => {
            const dot = document.getElementById(`stop-${i}`);
            if (dot) {
                dot.classList.remove('active', 'reached');
                if (i < activeStopIndex) dot.classList.add('reached');
                if (i === activeStopIndex) dot.classList.add('active');
            }
        });

        if (!isWaiting && Math.random() > 0.98) {
            if (spd) spd.textContent = `${Math.floor(Math.random() * 15) + 35} km/h`;
            if (occ && Math.random() > 0.8) {
                const labels = ["Low", "Moderate", "High"];
                occ.textContent = labels[Math.floor(Math.random() * labels.length)];
            }
        }
        
        if (eta) {
            eta.textContent = currentPos >= stops.length - 1 ? "Arrived" : `${Math.ceil(totalRemaining)} mins`;
        }
    };
    
    simulationInterval = setInterval(updateTracking, 50);
}




function setupBoardingPass() {
    const trigger = document.getElementById('boarding-pass-trigger');
    const modal = document.getElementById('boarding-pass-modal');
    const close = document.getElementById('close-boarding-pass');
    
    if (trigger && modal && close) {
        trigger.addEventListener('click', () => {
            const qrContainer = document.getElementById('qr-code-container');
            const nameEl = document.getElementById('pass-student-name');
            const rollEl = document.getElementById('pass-student-roll');
            const busEl = document.getElementById('pass-bus-no');
            
            nameEl.textContent = currentUser.name;
            busEl.textContent = currentUser.busNo;
            
            // Find roll number
            const roll = Object.keys(students).find(k => students[k].name === currentUser.name) || 'ES24AD000';
            rollEl.textContent = roll;
            
            // Generate Scannable QR using API with full details
            const now = new Date();
            const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
            const dateStr = now.toLocaleDateString();
            const myStop = currentUser.startPoint || "Standard Stop";
            
            const qrData = `Pass: boarding\nName: ${currentUser.name}\nRoll: ${roll}\nBus: ${currentUser.busNo}\nStop: ${myStop}\nTime: ${timeStr}\nDate: ${dateStr}`;
            const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(qrData)}`;
            qrContainer.innerHTML = `<img src="${qrUrl}" alt="Boarding Pass QR" style="width:100%; height:100%;" />`;
            
            modal.classList.remove('hidden');
        });
        
        close.addEventListener('click', () => modal.classList.add('hidden'));
    }
}

async function saveStudents() {
    try {
        await fetch(`${API_BASE}/api/save`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ students, drivers: mockDrivers })
        });
    } catch (err) {
        console.warn("Could not save students to server", err);
    }
}

async function saveNotices() {
    try {
        await fetch(`${API_BASE}/api/save`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                students, 
                drivers: mockDrivers, 
                notices: mockNotices, 
                news: mockNews 
            })
        });
    } catch (err) {
        console.warn("Could not save notices to server", err);
    }
}

function startGpsPolling(busNo) {
    const coordsEl = document.getElementById('live-gps-coords');
    const mapsLink = document.getElementById('google-maps-link');

    const poll = async () => {
        try {
            const res = await fetch(`${API_BASE}/api/location/${encodeURIComponent(busNo)}`);
            const data = await res.json();

            if (data.active) {
                if (coordsEl) {
                    coordsEl.textContent = `${data.lat}, ${data.lng}`;
                    coordsEl.style.color = "var(--success)";
                }
                if (mapsLink) {
                    mapsLink.href = `https://www.google.com/maps?q=${data.lat},${data.lng}`;
                    mapsLink.classList.remove('hidden');
                }
            } else {
                if (coordsEl) {
                    coordsEl.textContent = "Not Active";
                    coordsEl.style.color = "var(--text-dim)";
                }
                if (mapsLink) mapsLink.classList.add('hidden');
            }
        } catch (err) {
            console.warn("GPS Polling failed", err);
        }
    };

    poll();
    setInterval(poll, 5000);
}
