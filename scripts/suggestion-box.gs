/**
 * Kelma's suggestion box: the Google Apps Script that writes word suggestions from /dizzjunarju
 * into a Google Sheet. It is not part of the site build; it lives in the sheet.
 *
 * Setting it up (once):
 *  1. Make a new Google Sheet, e.g. "Kelma – suggested words".
 *  2. Extensions → Apps Script. Delete what's there, paste this whole file, save.
 *  3. Deploy → New deployment → type "Web app".
 *       Execute as: Me.  Who has access: Anyone.
 *     Authorise it when asked (it only needs this spreadsheet).
 *  4. Copy the web app URL (https://script.google.com/macros/s/…/exec) into SUGGEST_URL in
 *     lib/site.ts.
 * After editing this script, publish the change with Deploy → Manage deployments → edit (pencil)
 * → Version: New version. That keeps the same URL; "New deployment" would make a new one.
 *
 * Each word gets one row. Suggesting a word that's already on the sheet adds 1 to "Times
 * suggested" and appends any new description, so popular words rise to the top when you sort.
 * Suggestions are anonymous: nothing about the sender is stored (Apps Script can't see it anyway).
 */

const SHEET_NAME = "Suggestions";
const HEADERS = ["Word", "Description", "Times suggested", "First suggested", "Last suggested", "Site language", "Status"];
const MAX_WORD = 60;
const MAX_DESCRIPTION = 500;
/** All senders together: at most this many suggestions per 10 minutes, to stop a script flooding the sheet. */
const MAX_PER_10_MIN = 60;

function doPost(e) {
  const p = (e && e.parameter) || {};
  // A hidden field people never see; bots that fill in every field give themselves away.
  if (p.website) return reply({ ok: true });

  const word = clean(p.word, MAX_WORD);
  const description = clean(p.description, MAX_DESCRIPTION);
  const lang = p.lang === "en" ? "en" : "mt";
  if (!word) return reply({ ok: false, error: "empty" });

  const cache = CacheService.getScriptCache();
  const count = Number(cache.get("count") || 0);
  if (count >= MAX_PER_10_MIN) return reply({ ok: false, error: "busy" });
  cache.put("count", String(count + 1), 600);

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const sheet = getSheet();
    const now = new Date();
    const key = word.toLowerCase();
    const last = sheet.getLastRow();
    const words = last > 1 ? sheet.getRange(2, 1, last - 1, 1).getValues() : [];
    const at = words.findIndex((r) => String(r[0]).toLowerCase() === key);
    if (at === -1) {
      sheet.appendRow([safe(word), safe(description), 1, now, now, lang, "New"]);
    } else {
      const row = at + 2;
      const cells = sheet.getRange(row, 2, 1, 4);
      const [desc, times, first] = cells.getValues()[0];
      const descs = String(desc || "");
      const nextDesc = description && !descs.includes(description) ? (descs ? `${descs} | ${description}` : description) : descs;
      cells.setValues([[safe(nextDesc), Number(times || 1) + 1, first, now]]);
    }
  } finally {
    lock.releaseLock();
  }
  return reply({ ok: true });
}

/** Opening the URL in a browser: a sign that the deployment works. */
function doGet() {
  return reply({ ok: true, service: "kelma-suggestions" });
}

function getSheet() {
  const book = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = book.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = book.insertSheet(SHEET_NAME, 0);
    sheet.appendRow(HEADERS);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight("bold");
    sheet.setColumnWidth(1, 180);
    sheet.setColumnWidth(2, 420);
  }
  return sheet;
}

/** One line, no control characters, trimmed to a length. */
function clean(value, max) {
  return String(value || "")
    .replace(/[\u0000-\u001f\u007f]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

/** Text that starts like a formula (=, +, -, @) is stored as plain text, never run as one. */
function safe(text) {
  return /^[=+\-@]/.test(text) ? `'${text}` : text;
}

function reply(body) {
  return ContentService.createTextOutput(JSON.stringify(body)).setMimeType(ContentService.MimeType.JSON);
}
