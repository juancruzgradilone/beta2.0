import { getConfig } from './config.js';

const API_URL = 'https://api.airtable.com/v0';

function getHeaders() {
  const { AIRTABLE_PAT } = getConfig();
  if (!AIRTABLE_PAT) {
    throw new Error('Falta AIRTABLE_PAT en configuración.');
  }

  return {
    Authorization: `Bearer ${AIRTABLE_PAT}`,
    'Content-Type': 'application/json',
  };
}

function getBaseUrl(tableName) {
  const { AIRTABLE_BASE_ID } = getConfig();
  if (!AIRTABLE_BASE_ID) {
    throw new Error('Falta AIRTABLE_BASE_ID en configuración.');
  }

  return `${API_URL}/${AIRTABLE_BASE_ID}/${encodeURIComponent(tableName)}`;
}

async function fetchAllRecords(tableName, params = {}) {
  let offset = null;
  const records = [];

  do {
    const search = new URLSearchParams({ pageSize: '100' });
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        search.set(key, String(value));
      }
    });
    if (offset) search.set('offset', offset);

    const response = await fetch(`${getBaseUrl(tableName)}?${search.toString()}`, {
      headers: getHeaders(),
    });

    if (!response.ok) {
      const detail = await safeJson(response);
      throw new Error(detail?.error?.message || `Error Airtable ${response.status}`);
    }

    const data = await response.json();
    records.push(...(data.records || []));
    offset = data.offset;
  } while (offset);

  return records;
}

export async function listRecords(tableName, options = {}) {
  const params = {
    sort: options.sort ? undefined : undefined,
  };

  if (options.view) params.view = options.view;
  if (options.filterByFormula) params.filterByFormula = options.filterByFormula;

  if (Array.isArray(options.sort)) {
    options.sort.forEach((sortItem, index) => {
      params[`sort[${index}][field]`] = sortItem.field;
      params[`sort[${index}][direction]`] = sortItem.direction || 'asc';
    });
  }

  return fetchAllRecords(tableName, params);
}

export async function getRecord(tableName, recordId) {
  const response = await fetch(`${getBaseUrl(tableName)}/${recordId}`, {
    headers: getHeaders(),
  });

  if (!response.ok) {
    const detail = await safeJson(response);
    throw new Error(detail?.error?.message || `Error Airtable ${response.status}`);
  }

  return response.json();
}

export async function createRecord(tableName, fields) {
  const response = await fetch(getBaseUrl(tableName), {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ fields, typecast: true }),
  });

  if (!response.ok) {
    const detail = await safeJson(response);
    throw new Error(detail?.error?.message || `Error creando registro`);
  }

  return response.json();
}

export async function updateRecord(tableName, recordId, fields) {
  const response = await fetch(`${getBaseUrl(tableName)}/${recordId}`, {
    method: 'PATCH',
    headers: getHeaders(),
    body: JSON.stringify({ fields, typecast: true }),
  });

  if (!response.ok) {
    const detail = await safeJson(response);
    throw new Error(detail?.error?.message || `Error actualizando registro`);
  }

  return response.json();
}

export async function deleteRecord(tableName, recordId) {
  const response = await fetch(`${getBaseUrl(tableName)}/${recordId}`, {
    method: 'DELETE',
    headers: getHeaders(),
  });

  if (!response.ok) {
    const detail = await safeJson(response);
    throw new Error(detail?.error?.message || `Error eliminando registro`);
  }

  return response.json();
}

async function safeJson(response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}
