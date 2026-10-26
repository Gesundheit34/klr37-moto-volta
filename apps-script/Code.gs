/**
 * KLR becomes 36 – RSVP and game scoreboard storage
 *
 * Stores the website's RSVPs (tab "RSVPs") and KLR Game scores (tab "Scores")
 * in this Google Sheet so every visitor sees the same lists.
 *
 * Setup (once):
 *   1. Create a Google Sheet (sheets.new), then Extensions → Apps Script.
 *   2. Replace everything in Code.gs with this file and save.
 *   3. Deploy → New deployment → type "Web app".
 *      Execute as: Me.  Who has access: Anyone.  → Deploy, then authorise.
 *   4. Copy the Web app URL (ends in /exec) into RSVP_ENDPOINT in script.js
 *      and SCORE_ENDPOINT in scoreboard.js.
 *
 * Updating this code later: paste the new version, Save, then
 * Deploy → Manage deployments → ✏️ Edit → Version: New version → Deploy.
 * The /exec URL stays the same.
 *
 * Anyone can see names and bikes on the website; messages stay in the sheet.
 * Delete a row in the sheet to remove an RSVP or a score.
 */

const SHEET_NAME = 'RSVPs';
const HEADERS = ['Timestamp', 'Name', 'Motorcycle', 'Attendance', 'Message'];
const ATTENDANCE = ['yes', 'maybe', 'no'];
const SCORES_SHEET = 'Scores';
const SCORE_HEADERS = ['Timestamp', 'Name', 'Score'];
const TOP_SCORES = 10;
const MAX_SCORE = 1000000;

function doGet(e) {
  if (e && e.parameter && e.parameter.type === 'scores') return json_({ ok: true, scores: topScores_() });

  const rows = getSheet_().getDataRange().getValues().slice(1);
  const riders = rows
    .filter(row => row[1] !== '')
    .map(row => ({ name: String(row[1]), motorcycle: String(row[2]), attendance: String(row[3]) }));
  return json_({ ok: true, riders: riders });
}

function doPost(e) {
  let data;
  try {
    data = JSON.parse(e.postData.contents);
  } catch (err) {
    return json_({ ok: false, error: 'Invalid request' });
  }
  if (data.type === 'score') return saveScore_(data);

  const name = clean_(data.name, 80);
  const motorcycle = clean_(data.motorcycle, 80);
  const attendance = ATTENDANCE.indexOf(data.attendance) !== -1 ? data.attendance : '';
  const message = clean_(data.message, 500);
  if (!name || !motorcycle || !attendance) {
    return json_({ ok: false, error: 'Name, motorcycle and attendance are required' });
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    getSheet_().appendRow([new Date(), name, motorcycle, attendance, message]);
  } finally {
    lock.releaseLock();
  }
  return json_({ ok: true });
}

function saveScore_(data) {
  const name = clean_(data.name, 20);
  const score = Math.floor(Number(data.score));
  if (!name || !(score > 0 && score <= MAX_SCORE)) {
    return json_({ ok: false, error: 'Name and a valid score are required' });
  }
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    getSheet_(SCORES_SHEET, SCORE_HEADERS).appendRow([new Date(), name, score]);
  } finally {
    lock.releaseLock();
  }
  return json_({ ok: true, scores: topScores_() });
}

// Best score per rider name, highest first
function topScores_() {
  const rows = getSheet_(SCORES_SHEET, SCORE_HEADERS).getDataRange().getValues().slice(1);
  const best = {};
  rows.forEach(row => {
    const name = String(row[1]);
    const score = Number(row[2]) || 0;
    const key = name.toLowerCase();
    if (name && (!best[key] || score > best[key].score)) best[key] = { name: name, score: score };
  });
  return Object.keys(best).map(k => best[k])
    .sort((a, b) => b.score - a.score)
    .slice(0, TOP_SCORES);
}

function getSheet_(name, headers) {
  name = name || SHEET_NAME;
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = spreadsheet.getSheetByName(name);
  if (!sheet) {
    sheet = spreadsheet.insertSheet(name);
    sheet.appendRow(headers || HEADERS);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

// Trim, cap the length and stop the sheet from treating input as a formula
function clean_(value, maxLength) {
  const text = String(value == null ? '' : value).trim().slice(0, maxLength);
  return /^[=+\-@]/.test(text) ? "'" + text : text;
}

function json_(body) {
  return ContentService.createTextOutput(JSON.stringify(body))
    .setMimeType(ContentService.MimeType.JSON);
}
