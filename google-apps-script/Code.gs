/**
 * ZYANIX Digital Media Club — registration backend
 *
 * Create a blank Google Sheet, open Extensions > Apps Script, replace the
 * default file with this code, run setup() once, then deploy as a Web App.
 */

const SHEET_NAME = 'Registrations';
const HEADERS = [
  'Timestamp',
  'Registration ID',
  'Event',
  'Team Name',
  'Participant Name',
  'Register No.',
  'Department',
  'Section',
  'Email'
];

function setup() {
  const sheet = getRegistrationsSheet_();
  sheet.setFrozenRows(1);
  sheet.getRange(1, 1, 1, HEADERS.length)
    .setFontWeight('bold')
    .setBackground('#ff5a1f')
    .setFontColor('#ffffff');
  sheet.autoResizeColumns(1, HEADERS.length);
}

function doPost(event) {
  try {
    const payload = JSON.parse(event.postData.contents || '{}');
    const data = validateAndNormalise_(payload);
    const lock = LockService.getScriptLock();

    lock.waitLock(20000);
    try {
      const sheet = getRegistrationsSheet_();

      if (emailAlreadyRegistered_(sheet, data.email)) {
        return json_({
          ok: false,
          code: 'duplicate_email',
          message: 'This email address has already been used to register.'
        });
      }

      const registrationId = 'ZYN-' + Utilities.getUuid().slice(0, 8).toUpperCase();
      sheet.appendRow([
        new Date(),
        registrationId,
        data.event,
        data.teamName,
        data.participantName,
        data.registerNumber,
        data.department,
        data.section,
        data.email
      ]);

      return json_({
        ok: true,
        registrationId: registrationId,
        message: 'Registration confirmed.'
      });
    } finally {
      lock.releaseLock();
    }
  } catch (error) {
    return json_({
      ok: false,
      code: 'invalid_request',
      message: error.message || 'Unable to complete the registration.'
    });
  }
}

function getRegistrationsSheet_() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = spreadsheet.getSheetByName(SHEET_NAME);

  if (!sheet) {
    sheet = spreadsheet.insertSheet(SHEET_NAME);
  }

  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
  }

  return sheet;
}

function emailAlreadyRegistered_(sheet, email) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return false;

  const existingEmails = sheet
    .getRange(2, 9, lastRow - 1, 1)
    .getDisplayValues()
    .flat()
    .map(value => String(value).trim().toLowerCase());

  return existingEmails.includes(email);
}

function validateAndNormalise_(payload) {
  const permittedEvents = ['Inauguration Pass', 'Video Editing', 'Poster Designing'];
  const event = clean_(payload.event);
  const email = clean_(payload.email).toLowerCase();
  const data = {
    event: event,
    teamName: clean_(payload.teamName),
    participantName: clean_(payload.participantName),
    registerNumber: clean_(payload.registerNumber),
    department: clean_(payload.department),
    section: clean_(payload.section),
    email: email
  };

  if (!permittedEvents.includes(data.event)) {
    throw new Error('Please choose a valid registration option.');
  }

  if (!data.participantName || !data.registerNumber || !data.department || !data.section || !data.email) {
    throw new Error('Please complete every required field.');
  }

  if ((data.event === 'Video Editing' || data.event === 'Poster Designing') && !data.teamName) {
    throw new Error('Team Name is required for challenge registrations.');
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    throw new Error('Please provide a valid email address.');
  }

  return data;
}

function clean_(value) {
  return String(value || '').trim().replace(/\s+/g, ' ');
}

function json_(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}
