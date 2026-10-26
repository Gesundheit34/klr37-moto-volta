/**
 * KLR becomes 36 – RSVP storage
 *
 * Stores the website's RSVPs in this Google Sheet so every visitor sees the same
 * "Who's Coming" list.
 *
 * Setup (once):
 *   1. Create a Google Sheet (sheets.new), then Extensions → Apps Script.
 *   2. Replace everything in Code.gs with this file and save.
 *   3. Deploy → New deployment → type "Web app".
 *      Execute as: Me.  Who has access: Anyone.  → Deploy, then authorise.
 *   4. Copy the Web app URL (ends in /exec) into RSVP_ENDPOINT in script.js.
 *
 * Anyone can see names and bikes on the website; messages stay in the sheet.
 * Delete a row in the sheet to remove an RSVP.
 */

const SHEET_NAME = 'RSVPs';
const HEADERS = ['Timestamp', 'Name', 'Motorcycle', 'Attendance', 'Message'];
const ATTENDANCE = ['yes', 'maybe', 'no'];

function doGet() {
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

function getSheet_() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = spreadsheet.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = spreadsheet.insertSheet(SHEET_NAME);
    sheet.appendRow(HEADERS);
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
