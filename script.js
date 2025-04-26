// Initialisation de la carte avec Leaflet
const map = L.map('map').setView([48.4284, -71.2176], 13);  // Position initiale (Québec)

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

// Initialisation des variables
let userMarker = null;
let polyline = L.polyline([], { color: 'blue' }).addTo(map);  // Ligne pour le parcours

// Fonction pour mettre à jour la position GPS de l'utilisateur
function updatePosition(position) {
    const lat = position.coords.latitude;
    const lon = position.coords.longitude;

    // Mise à jour des coordonnées GPS dans l'interface
    document.getElementById('latitude').textContent = lat.toFixed(5);
    document.getElementById('longitude').textContent = lon.toFixed(5);

    // Déplacer ou ajouter un marqueur sur la carte
    if (userMarker) {
        userMarker.setLatLng([lat, lon]);
    } else {
        userMarker = L.marker([lat, lon]).addTo(map);
        userMarker.bindPopup("Vous êtes ici").openPopup();
    }

    // Ajouter la nouvelle position à la ligne de parcours
    polyline.addLatLng([lat, lon]);

    // Centrer la carte sur la nouvelle position
    map.setView([lat, lon], 13);
}

// Vérifier si le navigateur supporte la géolocalisation
if (navigator.geolocation) {
    navigator.geolocation.watchPosition(updatePosition, function(error) {
        console.log(error);
        alert("Erreur lors de la récupération de la position GPS.");
    }, {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
    });
} else {
    alert("La géolocalisation n'est pas supportée par votre navigateur.");
}
