// ==UserScript==
// @name         Ebay-Kleinanzeigen-Map-Viewer
// @namespace    http://tampermonkey.net/
// @version      0.6
// @description  Show addresses, titles, images, prices, descriptions, and links of search entries on a Leaflet map
// @author       You
// @match        https://www.kleinanzeigen.de/s-*
// @grant        none
// @require      https://unpkg.com/leaflet@1.7.1/dist/leaflet.js
// @require      https://unpkg.com/leaflet-control-geocoder/dist/Control.Geocoder.js
// @resource     leafletCSS https://unpkg.com/leaflet@1.7.1/dist/leaflet.css
// ==/UserScript==

(function() {
    'use strict';

    // Append Leaflet CSS
    var cssLink = document.createElement("link");
    cssLink.href = "https://unpkg.com/leaflet@1.7.1/dist/leaflet.css";
    cssLink.rel = "stylesheet";
    document.head.appendChild(cssLink);

    // Function to parse CSV
    function parseCSV(text) {
        let lines = text.trim().split("\n");
        let result = {};
        lines.forEach((line, index) => {
            // Skip the header (first row)
            if (index === 0) return;
            let [zip, lat, lng] = line.split(",");
            result[zip] = { lat: parseFloat(lat), lng: parseFloat(lng) };
        });
        return result;
    }


    // Load the CSV file and parse it
    // Load the CSV file and parse it
    let zipCoordMap = {};
    fetch('https://raw.githubusercontent.com/WZBSocialScienceCenter/plz_geocoord/master/plz_geocoord.csv')
        .then(response => response.text())
        .then(csvText => {
        zipCoordMap = parseCSV(csvText);

        // Now proceed with processing entries
        processEntries();
    });


    function processEntries() {
        let entries = document.querySelectorAll("article");
        let data = [];

        entries.forEach(entry => {
            let addressElement = entry.querySelector("div:nth-child(2) > div:nth-child(1) > div:nth-child(1)");
            let titleElement = entry.querySelector("h2 > a");
            let imageElement = entry.querySelector(".aditem-image img");
            let priceElement = entry.querySelector(".aditem-main--middle--price-shipping--price");
            let descriptionElement = entry.querySelector(".aditem-main--middle--description");
            let linkElement = entry.querySelector("h2 > a");

            if (addressElement && titleElement && imageElement && priceElement && descriptionElement && linkElement) {
                let addressText = addressElement.textContent.trim();
                let zipCode = addressText.match(/\b\d{5}\b/);
                zipCode = zipCode ? zipCode[0] : null;

                if (zipCode && zipCoordMap[zipCode]) {
                    let titleText = titleElement.textContent.trim();
                    let imageUrl = imageElement.src;
                    let priceText = priceElement.textContent.trim();
                    let descriptionText = descriptionElement.textContent.trim();
                    let detailLink = linkElement.href;

                    data.push({
                        zipCode: zipCode,
                        title: titleText,
                        imageUrl: imageUrl,
                        price: priceText,
                        description: descriptionText,
                        link: detailLink,
                        latLng: zipCoordMap[zipCode]
                    });
                }
            }
        });

        // Create and display the map
        createMap(data);
    }

    function createMap(data) {
        let mapContainer = document.createElement("div");
        mapContainer.id = "mapContainer";
        mapContainer.style.position = "fixed";
        mapContainer.style.top = "0";
        mapContainer.style.left = "0";
        mapContainer.style.width = "100%";
        mapContainer.style.height = "100%";
        mapContainer.style.backgroundColor = "white";
        mapContainer.style.zIndex = "9999";
        mapContainer.style.display = "none"; // Hidden initially

        let closeButton = document.createElement("button");
        closeButton.innerHTML = "X";
        closeButton.style.position = "absolute";
        closeButton.style.top = "10px";
        closeButton.style.right = "10px";
        closeButton.style.zIndex = "1001";
        closeButton.onclick = function() {
            mapContainer.style.display = "none";
        };
        mapContainer.appendChild(closeButton);

        let mapDiv = document.createElement("div");
        mapDiv.id = "leafletMap";
        mapDiv.style.width = "100%";
        mapDiv.style.height = "100%";
        mapContainer.appendChild(mapDiv);
        document.body.appendChild(mapContainer);

        let mapButton = document.createElement("button");
        mapButton.innerHTML = "Show on Map";
        mapButton.style.position = "fixed";
        mapButton.style.top = "10px";
        mapButton.style.left = "10px";
        mapButton.style.zIndex = "1000";
        mapButton.onclick = function() {
    mapContainer.style.display = "block";

    // Create the map, but don't set an initial view
    let map = L.map('leafletMap');

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    let markerGroup = L.featureGroup(); // Create a group to hold markers

    data.forEach(item => {
        let latLng = item.latLng;
        if (latLng) {
            let popupContent = `
                <div>
                    <strong>${item.title}</strong><br>
                    <img src="${item.imageUrl}" style="width: 100px;"><br>
                    <strong>Price:</strong> ${item.price}<br>
                    <strong>Description:</strong> ${item.description}<br>
                    <a href="${item.link}" target="_blank">Details</a>
                </div>
            `;
            let marker = L.marker([latLng.lat, latLng.lng]).bindPopup(popupContent);
            markerGroup.addLayer(marker); // Add the marker to the group
        }
    });

    if (markerGroup.getLayers().length > 0) {
        // Add the group to the map and fit the bounds to show all markers
        markerGroup.addTo(map);
        map.fitBounds(markerGroup.getBounds());
    } else {
        // If no markers, center the map on a default view (Hamburg in this case)
        map.setView([53.5511, 9.9937], 10);
    }
};

        document.body.appendChild(mapButton);
    }
})();
