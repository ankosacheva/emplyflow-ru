/**
 * EmplyFlow marketing site — приём заявок в Google Sheet + письмо.
 *
 * Та же схема, что у Competency Hub (docs/google-apps-script-leads.js).
 *
 * Установка:
 * 1. Создайте Google Sheet (или используйте существующий лист заявок).
 *    Лист назовите: Leads
 * 2. Расширения → Apps Script → вставьте этот файл целиком
 * 3. Проверьте NOTIFY_EMAIL ниже (по умолчанию headoffice@emplyflow.ru)
 * 4. Deploy → New deployment → Web app
 *    - Execute as: Me
 *    - Who has access: Anyone
 * 5. URL вида https://script.google.com/macros/s/.../exec
 *    положите в window.EMPLYFLOW_LEAD_ENDPOINT на сайте
 *    (см. page94832006.html и js/emplyflow-site-leads.js)
 *
 * Можно использовать ОДИН скрипт/таблицу и для Hub, и для сайта:
 * поле source будет site_demo_popup / site_demo / nav / case / …
 */

var SHEET_NAME = 'Leads';
var NOTIFY_EMAIL = 'headoffice@emplyflow.ru';

function doPost(e) {
  try {
    var raw = (e && e.postData && e.postData.contents) || '{}';
    var data = JSON.parse(raw);
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);

    if (sheet.getLastRow() === 0) {
      sheet.appendRow([
        'timestamp', 'name', 'company', 'email', 'phone', 'industry',
        'who', 'count', 'competency', 'case', 'comment', 'source', 'page',
        'visitor_id', 'session_id'
      ]);
    } else {
      ensureLeadHeaders_(sheet);
    }

    sheet.appendRow([
      data.ts || new Date().toISOString(),
      data.name || '',
      data.company || '',
      data.email || '',
      data.phone || '',
      data.industry || '',
      data.who || '',
      data.count || '',
      data.competencyTitle || data.competency || '',
      data.caseTitle || data.caseId || '',
      data.comment || '',
      data.source || '',
      data.page || '',
      data.visitor_id || '',
      data.session_id || ''
    ]);

    if (NOTIFY_EMAIL) {
      var subject = 'Заявка EmplyFlow: ' + (data.company || data.name || 'без названия');
      var body = [
        'Имя: ' + (data.name || ''),
        'Компания: ' + (data.company || ''),
        'Email: ' + (data.email || ''),
        'Телефон: ' + (data.phone || ''),
        'Как связаться / отрасль: ' + (data.industry || ''),
        'Источник: ' + (data.source || ''),
        'Комментарий: ' + (data.comment || ''),
        'Страница: ' + (data.page || ''),
        'Кого оценить: ' + (data.who || '') + ' · ' + (data.count || ''),
        'Компетенция: ' + (data.competencyTitle || data.competency || ''),
        'Кейс: ' + (data.caseTitle || data.caseId || '')
      ].join('\n');
      MailApp.sendEmail(NOTIFY_EMAIL, subject, body);
    }

    return ContentService
      .createTextOutput(JSON.stringify({ ok: true }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: String(err) }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function ensureLeadHeaders_(sheet) {
  var headers = sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), 1)).getValues()[0];
  var need = ['visitor_id', 'session_id'];
  need.forEach(function (h) {
    if (headers.indexOf(h) < 0) {
      sheet.getRange(1, sheet.getLastColumn() + 1).setValue(h);
      headers.push(h);
    }
  });
}

function doGet() {
  return ContentService
    .createTextOutput(JSON.stringify({ ok: true, service: 'emplyflow-site-leads' }))
    .setMimeType(ContentService.MimeType.JSON);
}
