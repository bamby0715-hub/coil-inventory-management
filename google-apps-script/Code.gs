const SHEETS = {
  "색상마스터": ["id", "제품구분", "제조사", "코드번호", "두께", "색상명", "색상HEX", "품절여부", "사용여부", "영구여부"],
  "기초재고": ["id", "색상ID", "기준일", "A", "B", "C", "총M", "수정일"],
  "입고내역": ["id", "등록일", "입고일", "색상ID", "제품구분", "제조사", "색상명", "코드번호", "두께", "매입처", "비고"],
  "코일목록": ["id", "코일번호", "입고일", "제품구분", "제조사", "색상명", "두께", "매입처", "현재M", "비고"],
  "출고내역": ["id", "등록일", "출고일", "거래처", "현장주소", "색상ID", "출고M", "담당자", "메모", "완료여부"],
  "예약내역": ["id", "등록일", "예약일", "도착일", "거래처", "현장주소", "색상ID", "예약M", "담당자", "메모", "완료여부"],
  "변경타임라인": ["id", "변경일시", "구분", "색상ID", "이전A", "이전B", "이전C", "변경A", "변경B", "변경C", "변경자"],
  "설정": ["key", "value"],
};

function doGet() {
  return jsonResponse({ ok: true, message: "HNMT COIL Sheets API" });
}

function doPost(e) {
  try {
    const body = JSON.parse((e.postData && e.postData.contents) || "{}");
    ensureAllSheets_();
    if (body.action === "read") return jsonResponse({ ok: true, data: readAll_() });
    if (body.action === "setup") return jsonResponse({ ok: true, data: readAll_() });
    if (body.action === "upsertAll") {
      upsertAll_(body.data || {});
      return jsonResponse({ ok: true, data: readAll_() });
    }
    if (body.action === "resetOperations") {
      resetOperations_();
      return jsonResponse({ ok: true, data: readAll_() });
    }
    return jsonResponse({ ok: false, error: "Unknown action: " + body.action });
  } catch (err) {
    return jsonResponse({ ok: false, error: err.message || String(err) });
  }
}

function jsonResponse(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}

function ss_() {
  return SpreadsheetApp.getActiveSpreadsheet();
}

function ensureAllSheets_() {
  Object.keys(SHEETS).forEach((name) => ensureSheet_(name, SHEETS[name]));
}

function ensureSheet_(name, requiredHeaders) {
  const ss = ss_();
  let sheet = ss.getSheetByName(name);
  if (!sheet) sheet = ss.insertSheet(name);
  const lastCol = Math.max(sheet.getLastColumn(), 1);
  const current = sheet.getRange(1, 1, 1, lastCol).getValues()[0].filter(String);
  const additions = requiredHeaders.filter((header) => !current.includes(header));
  const nextHeaders = current.length ? current.concat(additions) : requiredHeaders.slice();
  if (nextHeaders.length) sheet.getRange(1, 1, 1, nextHeaders.length).setValues([nextHeaders]);
  if (additions.length && name !== "변경타임라인") {
    appendTimelineLog_("schema", "", {}, {}, "자동 컬럼 추가: " + name + " / " + additions.join(", "));
  }
  return sheet;
}

function readSheet_(name) {
  const sheet = ensureSheet_(name, SHEETS[name]);
  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();
  if (lastRow < 2 || lastCol < 1) return [];
  const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  return sheet.getRange(2, 1, lastRow - 1, lastCol).getValues()
    .filter((row) => row.some((cell) => cell !== ""))
    .map((row) => Object.fromEntries(headers.map((header, index) => [header, row[index]])));
}

function readAll_() {
  const data = {};
  Object.keys(SHEETS).forEach((name) => data[name] = readSheet_(name));
  return data;
}

function upsertAll_(data) {
  Object.keys(SHEETS).forEach((name) => {
    if (!Array.isArray(data[name])) return;
    upsertRows_(name, data[name]);
  });
}

function upsertRows_(name, rows) {
  const sheet = ensureSheet_(name, SHEETS[name]);
  const headers = ensureColumns_(sheet, rows);
  const existing = readSheet_(name);
  const idColumn = name === "설정" ? "key" : "id";
  const byId = {};
  existing.forEach((row) => {
    const id = row[idColumn];
    if (id) byId[id] = row;
  });
  rows.forEach((row) => {
    const id = row[idColumn] || Utilities.getUuid();
    byId[id] = Object.assign({}, byId[id] || {}, row, { [idColumn]: id });
  });
  const values = Object.values(byId).map((row) => headers.map((header) => row[header] == null ? "" : row[header]));
  sheet.getRange(2, 1, Math.max(sheet.getMaxRows() - 1, 1), headers.length).clearContent();
  if (values.length) sheet.getRange(2, 1, values.length, headers.length).setValues(values);
}

function ensureColumns_(sheet, rows) {
  const lastCol = Math.max(sheet.getLastColumn(), 1);
  const current = sheet.getRange(1, 1, 1, lastCol).getValues()[0].filter(String);
  const fromRows = Array.from(new Set(rows.flatMap((row) => Object.keys(row))));
  const additions = fromRows.filter((header) => !current.includes(header));
  const nextHeaders = current.concat(additions);
  if (additions.length) {
    sheet.getRange(1, 1, 1, nextHeaders.length).setValues([nextHeaders]);
    appendTimelineLog_("schema", "", {}, {}, "자동 컬럼 추가: " + sheet.getName() + " / " + additions.join(", "));
  }
  return nextHeaders;
}

function resetOperations_() {
  ["기초재고", "입고내역", "코일목록", "출고내역", "예약내역", "변경타임라인"].forEach((name) => {
    const sheet = ensureSheet_(name, SHEETS[name]);
    if (sheet.getLastRow() > 1) {
      sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).clearContent();
    }
  });
}

function appendTimelineLog_(type, colorId, before, after, editor) {
  const sheet = ensureSheet_("변경타임라인", SHEETS["변경타임라인"]);
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const row = {
    id: Utilities.getUuid(),
    변경일시: new Date(),
    구분: type,
    색상ID: colorId,
    이전A: before.A || "",
    이전B: before.B || "",
    이전C: before.C || "",
    변경A: after.A || "",
    변경B: after.B || "",
    변경C: after.C || "",
    변경자: editor || "",
  };
  sheet.appendRow(headers.map((header) => row[header] == null ? "" : row[header]));
}
