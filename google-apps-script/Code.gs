/**
 * ZYANIX Digital Media Marketing Hub — registration backend
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
  'Team Leader / Name',
  'Team Member 1',
  'Team Member 2',
  'Department',
  'Section',
  'Year',
  'Phone Number',
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

      const duplicateError = checkDuplicates_(sheet, data.email, data.teamName);
      if (duplicateError) {
        return json_({
          ok: false,
          code: duplicateError.code,
          message: duplicateError.message
        });
      }

      const registrationId = 'ZYN-' + Utilities.getUuid().slice(0, 8).toUpperCase();
      sheet.appendRow([
        new Date(),
        registrationId,
        data.event,
        data.teamName || '—',
        data.participantName,
        data.member1 || '—',
        data.member2 || '—',
        data.department,
        data.section,
        data.year,
        data.phone || '—',
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

function checkDuplicates_(sheet, email, teamName) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return null;

  const emailCol = HEADERS.indexOf('Email');
  const teamCol = HEADERS.indexOf('Team Name');

  // Single batch read of all existing rows: 1 RPC call instead of multiple, keeping execution ultra-fast
  const values = sheet.getRange(2, 1, lastRow - 1, HEADERS.length).getValues();

  const targetEmail = String(email || '').trim().toLowerCase();
  const targetTeam = teamName ? String(teamName).trim().toLowerCase() : '';

  for (let i = 0; i < values.length; i++) {
    const rowEmail = String(values[i][emailCol] || '').trim().toLowerCase();
    if (rowEmail === targetEmail) {
      return {
        code: 'duplicate_email',
        message: 'This email address has already been used to register.'
      };
    }

    if (targetTeam) {
      const rowTeam = String(values[i][teamCol] || '').trim().toLowerCase();
      if (rowTeam && rowTeam !== '—' && rowTeam !== '-' && rowTeam === targetTeam) {
        return {
          code: 'duplicate_team_name',
          message: 'This Team Name is already taken. Please choose a different team name.'
        };
      }
    }
  }

  return null;
}

function validateAndNormalise_(payload) {
  const permittedEvents = ['Inauguration Pass', 'Video Editing', 'Poster Designing'];
  const event = clean_(payload.event) || 'Inauguration Pass';
  const email = clean_(payload.email).toLowerCase();
  const data = {
    event: event,
    teamName: clean_(payload.teamName),
    participantName: clean_(payload.participantName || payload.name),
    member1: clean_(payload.member1),
    member2: clean_(payload.member2),
    department: clean_(payload.department),
    section: clean_(payload.section),
    year: clean_(payload.year),
    phone: clean_(payload.phone),
    email: email
  };

  if (!permittedEvents.includes(data.event)) {
    throw new Error('Please choose a valid registration option.');
  }

  if (!data.participantName || !data.department || !data.section || !data.year || !data.email) {
    throw new Error('Please complete every required field.');
  }

  const isChallenge = data.event === 'Video Editing' || data.event === 'Poster Designing';
  if (isChallenge) {
    if (!data.teamName) {
      throw new Error('Team Name is required for challenge registrations.');
    }
    if (!data.member1) {
      throw new Error('Team Member name is required for challenge registrations.');
    }
    if (!data.phone) {
      throw new Error('Phone Number is required for challenge registrations.');
    }
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
