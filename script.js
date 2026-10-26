// Shared RSVP storage: the Google Apps Script web app in apps-script/Code.gs keeps
// RSVPs in the organiser's Google Sheet. Paste its /exec URL here. While it is empty,
// RSVPs are only kept in this browser.
const RSVP_ENDPOINT = 'https://script.google.com/macros/s/AKfycbxiMRT_S8VUE5zfCaRkO-jJJ3eDAiuXlxyA6zmlnHL_P03GMagJERvLiFFW2ABdiCz5/exec';

const LOCAL_KEY = 'klr36Riders';
const REFRESH_MS = 30000;

const form = document.getElementById('rsvpForm');
const submitButton = form.querySelector('.btn-submit');
const errorMessage = document.getElementById('rsvpError');
const successMessage = document.getElementById('successMessage');

// Handle form submission
form.addEventListener('submit', async function(e) {
    e.preventDefault();

    const rsvp = {
        name: document.getElementById('name').value.trim(),
        motorcycle: document.getElementById('motorcycle').value.trim(),
        attendance: document.querySelector('input[name="attendance"]:checked').value,
        message: document.getElementById('message').value.trim(),
        timestamp: new Date().toISOString()
    };

    submitButton.disabled = true;
    errorMessage.hidden = true;
    try {
        await saveRsvp(rsvp);
    } catch (err) {
        errorMessage.hidden = false;
        submitButton.disabled = false;
        return;
    }

    form.style.display = 'none';
    successMessage.style.display = 'block';
    refreshRiders();

    setTimeout(() => {
        form.reset();
        form.style.display = 'block';
        successMessage.style.display = 'none';
        submitButton.disabled = false;
    }, 2000);
});

async function saveRsvp(rsvp) {
    if (!RSVP_ENDPOINT) {
        const riders = readLocalRiders();
        riders.push(rsvp);
        localStorage.setItem(LOCAL_KEY, JSON.stringify(riders));
        return;
    }
    // A plain-text body keeps this a "simple" request, so the browser skips the CORS preflight
    const response = await fetch(RSVP_ENDPOINT, { method: 'POST', body: JSON.stringify(rsvp) });
    const result = await response.json();
    if (!result.ok) throw new Error(result.error || 'RSVP not saved');
}

async function loadRiders() {
    if (!RSVP_ENDPOINT) return readLocalRiders();
    const response = await fetch(RSVP_ENDPOINT);
    const result = await response.json();
    if (!result.ok) throw new Error(result.error || 'Riders not loaded');
    return result.riders;
}

function readLocalRiders() {
    try {
        return JSON.parse(localStorage.getItem(LOCAL_KEY)) || [];
    } catch (err) {
        return [];
    }
}

let ridersLoaded = false;

async function refreshRiders() {
    try {
        displayRiders(await loadRiders());
        ridersLoaded = true;
    } catch (err) {
        // Keep showing the last list we had; only complain if we never got one
        if (!ridersLoaded) {
            document.getElementById('ridersCount').textContent = "Couldn't load the rider list right now.";
        }
    }
}

// Display riders
function displayRiders(riders) {
    const ridersList = document.getElementById('ridersList');
    const ridersCount = document.getElementById('ridersCount');

    // Filter only confirmed attendees
    const confirmedRiders = riders.filter(r => r.attendance === 'yes');

    if (confirmedRiders.length === 0) {
        ridersList.innerHTML = '';
        ridersCount.textContent = 'Be the first to RSVP!';
        return;
    }

    ridersList.innerHTML = confirmedRiders.map(rider => {
        // Older RSVPs stored the model separately from a bike-type code
        const bikeDisplay = rider.motorcycleModel || rider.motorcycle;

        return `
            <div class="rider-card">
                <div class="rider-name">${escapeHtml(rider.name)}</div>
                <div class="rider-bike">🏍️ ${escapeHtml(bikeDisplay)}</div>
                <span class="rider-status">✓ Coming</span>
            </div>
        `;
    }).join('');

    ridersCount.textContent = `${confirmedRiders.length} rider${confirmedRiders.length !== 1 ? 's' : ''} coming!`;
}

// Escape HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Load riders on page load, then keep the list fresh
window.addEventListener('DOMContentLoaded', refreshRiders);
setInterval(refreshRiders, REFRESH_MS);
