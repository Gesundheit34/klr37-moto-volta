// Route map: stops come from the <li data-lat/data-lng> list in index.html
(function () {
    const mapEl = document.getElementById('routeMap');
    if (!mapEl || typeof L === 'undefined') return;

    const stops = [...document.querySelectorAll('.route-stops li')].map(li => ({
        name: li.querySelector('strong').textContent,
        latLng: [parseFloat(li.dataset.lat), parseFloat(li.dataset.lng)]
    }));

    const map = L.map(mapEl, { scrollWheelZoom: false });
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 19
    }).addTo(map);

    stops.forEach((stop, i) => {
        const icon = L.divIcon({
            className: 'stop-marker' + (i === 0 ? ' stop-start' : '') + (i === stops.length - 1 ? ' stop-end' : ''),
            html: String(i + 1),
            iconSize: [28, 28]
        });
        L.marker(stop.latLng, { icon, title: stop.name }).addTo(map).bindPopup(`<strong>${i + 1}. ${stop.name}</strong>`);
    });

    map.fitBounds(L.latLngBounds(stops.map(s => s.latLng)), { padding: [30, 30] });

    // Straight lines until (or unless) the road route loads
    const fallbackLine = L.polyline(stops.map(s => s.latLng), {
        color: '#5fd13a', weight: 3, dashArray: '6 8', opacity: 0.8
    }).addTo(map);

    const coords = stops.map(s => `${s.latLng[1]},${s.latLng[0]}`).join(';');
    fetch(`https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`)
        .then(res => res.ok ? res.json() : Promise.reject(res.status))
        .then(data => {
            const route = data.routes && data.routes[0];
            if (!route) return;
            const line = route.geometry.coordinates.map(([lng, lat]) => [lat, lng]);
            map.removeLayer(fallbackLine);
            L.polyline(line, { color: '#1f6fe0', weight: 9, opacity: 0.45 }).addTo(map);
            L.polyline(line, { color: '#5fd13a', weight: 4 }).addTo(map);

            const km = (route.distance / 1000).toFixed(1);
            document.querySelectorAll('.route-distance').forEach(el => { el.textContent = `${km} km`; });
            const mins = Math.round(route.duration / 60);
            document.getElementById('routeDuration').textContent = `· ~${mins} min riding`;
        })
        .catch(() => { /* keep the dashed line and the approximate distance */ });
})();
