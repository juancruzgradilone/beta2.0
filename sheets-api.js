import { getConfig } from './config.js';

function getScriptUrl() {
  const { SCRIPT_URL } = getConfig();
  if (!SCRIPT_URL) throw new Error('Falta SCRIPT_URL en Configuración.');
  return SCRIPT_URL;
}

async function call(action, payload = {}) {
  const response = await fetch(getScriptUrl(), {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ action, ...payload }),
  });

  const text = await response.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`Respuesta inválida del Apps Script: ${text.slice(0, 160)}`);
  }

  if (!response.ok || data.ok === false) {
    throw new Error(data.error || `Error Apps Script ${response.status}`);
  }

  return data.result;
}

export async function listRecords(tableName, options = {}) {
  return call('listRecords', { tableName, options });
}

export async function getRecord(tableName, recordId) {
  return call('getRecord', { tableName, recordId });
}

export async function createRecord(tableName, fields) {
  return call('createRecord', { tableName, fields });
}

export async function updateRecord(tableName, recordId, fields) {
  return call('updateRecord', { tableName, recordId, fields });
}

export async function deleteRecord(tableName, recordId) {
  return call('deleteRecord', { tableName, recordId });
}
