document.addEventListener("DOMContentLoaded", () => {
  const mapDiv = document.getElementById("map");
  if (!mapDiv) return;

  const lat = parseFloat(mapDiv.dataset.lat) || 20;
  const lng = parseFloat(mapDiv.dataset.lng) || 0;
  const title = mapDiv.dataset.title || "Listing";

  // Initialize map
  const map = L.map("map").setView([lat, lng], 13);

  // Add OpenStreetMap tiles
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "© OpenStreetMap contributors",
  }).addTo(map);

  // 🔴 Red Location Icon (default)
  const redLocationIcon = L.divIcon({
    className: "custom-div-icon",
    html: `<i class="fa-solid fa-location-dot" style="color:red; font-size:30px;"></i>`,
    iconSize: [30, 42],
    iconAnchor: [15, 42],
    popupAnchor: [0, -40],
  });

  // 🏠 Red Home Icon (on hover)
  const redHomeIcon = L.divIcon({
    className: "custom-div-icon",
    html: `<i class="fa-solid fa-house" style="color:red; font-size:28px;"></i>`,
    iconSize: [30, 42],
    iconAnchor: [15, 42],
    popupAnchor: [0, -40],
  });

  // Add marker
  const marker = L.marker([lat, lng], { icon: redLocationIcon }).addTo(map);

  marker.bindPopup(`<b>${title}</b><br>Exact location provided after booking`);

  // 🔄 Change icon on hover
  marker.on("mouseover", () => {
    marker.setIcon(redHomeIcon);
  });

  marker.on("mouseout", () => {
    marker.setIcon(redLocationIcon);
  });
});
