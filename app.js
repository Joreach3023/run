// --- Variables globales ---
let userData = {
  currentPace: "4:36",
  targetPace: "4:00",
  eventDate: "2025-06-07",
  plan: [],
  runs: []
};

let activeRun = null;
let runTimer = null;
let runSeconds = 0;
let runDistance = 0;
let runLocations = [];
let gpsWatcher = null;
let map = null;
let path = null;
let startMarker = null;
let endMarker = null;

// --- Fonctions utilitaires ---
function paceToSeconds(pace) {
  const [min, sec] = pace.split(":").map(Number);
  return min * 60 + sec;
}

function secondsToPace(seconds) {
  const min = Math.floor(seconds / 60);
  const sec = Math.floor(seconds % 60);
  return `${min}:${sec.toString().padStart(2, "0")}`;
}

function formatTime(seconds) {
  const min = Math.floor(seconds / 60);
  const sec = Math.floor(seconds % 60);
  return `${min.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
}

// --- Navigation ---
document.querySelectorAll("nav button").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll("nav button").forEach(b => b.classList.remove("active"));
    document.querySelectorAll("main .section").forEach(s => s.classList.remove("active"));
    btn.classList.add("active");
    document.getElementById(btn.id.replace("nav-", "") + "-section").classList.add("active");
  });
});

// --- Générer le plan d'entraînement ---
function generatePlan() {
  const today = new Date();
  const event = new Date(userData.eventDate);
  let day = new Date(today);

  const trainingDays = [2, 4, 0]; // Mardi, Jeudi, Dimanche
  const plan = [];

  while (day <= event) {
    if (trainingDays.includes(day.getDay())) {
      const type = ["Facile", "Intervalles", "Longue sortie", "Tempo"][Math.floor(Math.random() * 4)];
      const distance = type === "Longue sortie" ? 10 : 5;
      const pace = userData.currentPace;
      plan.push({
        date: day.toISOString().split('T')[0],
        type,
        distance,
        pace
      });
    }
    day.setDate(day.getDate() + 1);
  }

  userData.plan = plan;
  localStorage.setItem("runpacer-data", JSON.stringify(userData));
  renderPlan();
}

function renderPlan() {
  const body = document.getElementById("plan-body");
  body.innerHTML = "";
  userData.plan.forEach((session, index) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${session.date}</td>
      <td>${session.type}</td>
      <td>${session.distance} km</td>
      <td>${session.pace}</td>
      <td><button onclick="startRun(${index})">Commencer</button></td>
    `;
    body.appendChild(tr);
  });
}

// --- Démarrer une course ---
function startRun(index) {
  activeRun = userData.plan[index];
  runSeconds = 0;
  runDistance = 0;
  runLocations = [];

  document.getElementById("run-time").textContent = "00:00";
  document.getElementById("run-distance").textContent = "0.00";
  document.getElementById("run-pace").textContent = "--:--";
  document.getElementById("stop-run-btn").disabled = false;

  if (map) map.remove();
  map = L.map("map").setView([0, 0], 15);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OpenStreetMap' }).addTo(map);
  path = L.polyline([], { color: 'red' }).addTo(map);

  gpsWatcher = navigator.geolocation.watchPosition(trackLocation, handleError, {
    enableHighAccuracy: true,
    maximumAge: 1000
  });

  runTimer = setInterval(updateRunDisplay, 1000);
  document.getElementById("nav-run").click();
}

function trackLocation(position) {
  const { latitude, longitude } = position.coords;
  if (runLocations.length > 0) {
    const prev = runLocations[runLocations.length - 1];
    const dist = calculateDistance(prev.lat, prev.lon, latitude, longitude);
    runDistance += dist;
  }
  runLocations.push({ lat: latitude, lon: longitude });

  if (map && path) {
    path.addLatLng([latitude, longitude]);
    map.setView([latitude, longitude], 15);
  }
  if (!startMarker && map) {
    startMarker = L.marker([latitude, longitude]).addTo(map).bindPopup("Départ").openPopup();
  }
}

function handleError(error) {
  console.error("Erreur GPS:", error);
}

function updateRunDisplay() {
  runSeconds++;
  document.getElementById("run-time").textContent = formatTime(runSeconds);
  document.getElementById("run-distance").textContent = (runDistance / 1000).toFixed(2);
  if (runDistance > 0) {
    const pace = secondsToPace(runSeconds / (runDistance / 1000));
    document.getElementById("run-pace").textContent = pace;
  }
}

function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const toRad = angle => angle * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat/2)**2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

// --- Terminer une course ---
document.getElementById("stop-run-btn").addEventListener("click", () => {
  clearInterval(runTimer);
  if (gpsWatcher !== null) {
    navigator.geolocation.clearWatch(gpsWatcher);
  }
  const { lat, lon } = runLocations[runLocations.length - 1];
  if (map) {
    endMarker = L.marker([lat, lon]).addTo(map).bindPopup("Arrivée").openPopup();
  }

  const newRun = {
    date: new Date().toISOString().split('T')[0],
    type: activeRun.type,
    distance: (runDistance / 1000).toFixed(2),
    duration: formatTime(runSeconds),
    pace: secondsToPace(runSeconds / (runDistance / 1000)),
    locations: runLocations
  };

  userData.runs.unshift(newRun);
  localStorage.setItem("runpacer-data", JSON.stringify(userData));
  renderHistory();
  document.getElementById("stop-run-btn").disabled = true;
  alert("Course sauvegardée avec succès !");
  document.getElementById("nav-stats").click();
});

// --- Afficher l'historique ---
function renderHistory() {
  const list = document.getElementById("history-list");
  list.innerHTML = "";
  userData.runs.forEach((run, index) => {
    const li = document.createElement("li");
    li.innerHTML = `<button onclick="viewRun(${index})">${run.date} - ${run.type} - ${run.distance} km - ${run.pace}</button>`;
    list.appendChild(li);
  });
}

// --- Voir un ancien run ---
function viewRun(index) {
  const run = userData.runs[index];
  if (map) map.remove();
  map = L.map("map").setView([run.locations[0].lat, run.locations[0].lon], 15);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OpenStreetMap' }).addTo(map);
  const pastPath = L.polyline(run.locations.map(p => [p.lat, p.lon]), { color: 'red' }).addTo(map);
  L.marker([run.locations[0].lat, run.locations[0].lon]).addTo(map).bindPopup("Départ").openPopup();
  L.marker([run.locations[run.locations.length -1].lat, run.locations[run.locations.length -1].lon]).addTo(map).bindPopup("Arrivée");
  document.getElementById("nav-run").click();
}

// --- Initialisation ---
window.addEventListener("DOMContentLoaded", () => {
  const saved = localStorage.getItem("runpacer-data");
  if (saved) {
    userData = JSON.parse(saved);
  }
  renderPlan();
  renderHistory();
});
