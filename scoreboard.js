// KLR Game scoreboard: scores go to the "Scores" tab of the organiser's Google Sheet
// through the Apps Script web app in apps-script/Code.gs.
(function () {
    const SCORE_ENDPOINT = 'https://script.google.com/macros/s/AKfycbzbD7B78oXdwdIOsNEOHGW9LzH8nTgdEUrBBUY341rZIaUkmpun8_WjHCju5uMbPaMyPQ/exec';
    const NAME_KEY = 'klrPlayerName';
    const BEST_KEY = 'klrGameBest';          // written by game.js
    const SAVED_KEY = 'klrBestSaved';        // best score already on the scoreboard
    const REFRESH_MS = 60000;

    const canvas = document.getElementById('game');
    const nameInput = document.getElementById('playerName');
    const saveButton = document.getElementById('saveScore');
    const status = document.getElementById('scoreStatus');
    const list = document.getElementById('scoreList');
    const empty = document.getElementById('scoreEmpty');

    let pendingScore = null;
    let saving = false;

    try { nameInput.value = localStorage.getItem(NAME_KEY) || ''; } catch (e) { /* private mode */ }

    nameInput.addEventListener('input', () => {
        try { localStorage.setItem(NAME_KEY, nameInput.value.trim()); } catch (e) { /* private mode */ }
    });
    nameInput.addEventListener('keydown', e => {
        if (e.key === 'Enter') {
            e.preventDefault();
            nameInput.blur();
            if (pendingScore) submit();
        }
    });
    saveButton.addEventListener('click', submit);

    canvas.addEventListener('klr-gameover', e => {
        if (!(e.detail.score > 0)) return;
        pendingScore = e.detail.score;
        if (playerName()) {
            submit();
        } else {
            saveButton.hidden = false;
            setStatus(`Type your name and tap Save to put ${pendingScore} on the scoreboard.`);
        }
    });

    function playerName() {
        return nameInput.value.trim();
    }

    function setStatus(text, ok) {
        status.textContent = text;
        status.classList.toggle('ok', !!ok);
    }

    async function submit() {
        const name = playerName();
        if (!pendingScore || saving) return;
        if (!name) {
            nameInput.focus();
            setStatus('Type your name first.');
            return;
        }
        saving = true;
        saveButton.hidden = true;
        const score = pendingScore;
        setStatus(`Saving ${score}…`);
        try {
            // Plain-text body keeps this a "simple" request (no CORS preflight)
            const response = await fetch(SCORE_ENDPOINT, {
                method: 'POST',
                body: JSON.stringify({ type: 'score', name, score })
            });
            const result = await response.json();
            if (!result.ok) throw new Error(result.error);
            if (pendingScore === score) pendingScore = null;
            if (score > readNumber(SAVED_KEY)) writeNumber(SAVED_KEY, score);
            setStatus(`✓ ${score} saved for ${name}`, true);
            render(result.scores);
        } catch (err) {
            saveButton.hidden = false;
            setStatus(`Couldn't save ${score}. Tap Save to try again.`);
        } finally {
            saving = false;
        }
    }

    async function load() {
        try {
            const response = await fetch(`${SCORE_ENDPOINT}?type=scores`);
            const result = await response.json();
            if (!Array.isArray(result.scores)) {
                empty.textContent = 'The scoreboard opens soon.';
                return;
            }
            render(result.scores);
            submitUnsavedBest();
        } catch (err) {
            if (!list.children.length) empty.textContent = "Couldn't load the scoreboard right now.";
        }
    }

    // A best score that never reached the scoreboard (offline, or before it opened)
    // is sent once the scoreboard is reachable and the player has a name
    function submitUnsavedBest() {
        const best = readNumber(BEST_KEY);
        if (pendingScore || saving || !playerName() || best <= readNumber(SAVED_KEY)) return;
        pendingScore = best;
        submit();
    }

    function readNumber(key) {
        try { return parseInt(localStorage.getItem(key), 10) || 0; } catch (e) { return 0; }
    }

    function writeNumber(key, value) {
        try { localStorage.setItem(key, String(value)); } catch (e) { /* private mode */ }
    }

    function render(scores) {
        const me = playerName().toLowerCase();
        list.innerHTML = scores.map((s, i) => `
            <li class="${i === 0 ? 'leader' : ''} ${s.name.toLowerCase() === me ? 'me' : ''}">
                <span class="rank">${i + 1}</span>
                <span class="who">${escapeHtml(s.name)}${i === 0 ? ' <span class="beer">🍺 free beer</span>' : ''}</span>
                <span class="pts">${s.score}</span>
            </li>
        `).join('');
        empty.textContent = scores.length ? '' : 'No scores yet. Be the first!';
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    load();
    setInterval(load, REFRESH_MS);
})();
