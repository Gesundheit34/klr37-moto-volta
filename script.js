// Handle form submission
document.getElementById('rsvpForm').addEventListener('submit', function(e) {
    e.preventDefault();

    // Get form data
    const formData = {
        name: document.getElementById('name').value,
        email: document.getElementById('email').value,
        motorcycle: document.getElementById('motorcycle').value,
        motorcycleModel: document.getElementById('motorcycleModel').value,
        attendance: document.querySelector('input[name="attendance"]:checked').value,
        message: document.getElementById('message').value,
        timestamp: new Date().toISOString()
    };

    // Get existing riders from localStorage
    let riders = JSON.parse(localStorage.getItem('klr36Riders')) || [];

    // Add new rider
    riders.push(formData);

    // Save to localStorage
    localStorage.setItem('klr36Riders', JSON.stringify(riders));

    // Show success message
    document.getElementById('rsvpForm').style.display = 'none';
    document.getElementById('successMessage').style.display = 'block';

    // Update riders list
    displayRiders();

    // Reset form after 2 seconds
    setTimeout(() => {
        document.getElementById('rsvpForm').reset();
        document.getElementById('rsvpForm').style.display = 'block';
        document.getElementById('successMessage').style.display = 'none';
    }, 2000);
});

// Display riders
function displayRiders() {
    const riders = JSON.parse(localStorage.getItem('klr36Riders')) || [];
    const ridersList = document.getElementById('ridersList');
    const ridersCount = document.getElementById('ridersCount');

    if (riders.length === 0) {
        ridersList.innerHTML = '';
        ridersCount.textContent = 'Be the first to RSVP!';
        return;
    }

    // Filter only confirmed attendees
    const confirmedRiders = riders.filter(r => r.attendance === 'yes');

    ridersList.innerHTML = confirmedRiders.map((rider, index) => {
        const bikeType = getBikeEmoji(rider.motorcycle);
        const statusText = rider.attendance === 'yes' ? '✓ Coming' : '? Maybe';
        const bikeDisplay = rider.motorcycleModel || rider.motorcycle;

        return `
            <div class="rider-card">
                <div class="rider-name">${escapeHtml(rider.name)}</div>
                <div class="rider-bike">${bikeType} ${escapeHtml(bikeDisplay)}</div>
                <span class="rider-status">${statusText}</span>
            </div>
        `;
    }).join('');

    ridersCount.textContent = `${confirmedRiders.length} rider${confirmedRiders.length !== 1 ? 's' : ''} coming!`;
}

// Get emoji for bike type
function getBikeEmoji(motorcycle) {
    const emojis = {
        'klr650': '🏍️',
        'klr250': '🏍️',
        'dual-sport': '🏍️',
        'adventure': '🏍️',
        'cruiser': '🏍️',
        'sport': '🏍️',
        'naked': '🏍️',
        'classic': '🏍️',
        'other': '🏍️'
    };
    return emojis[motorcycle] || '🏍️';
}

// Escape HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Load riders on page load
window.addEventListener('DOMContentLoaded', displayRiders);

// Auto-update riders list every 5 seconds
setInterval(displayRiders, 5000);
