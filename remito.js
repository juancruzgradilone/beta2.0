import { formatCurrency, escapeHtml } from './utils.js';

function formatOnlyDate(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat('es-AR').format(date);
}

export function buildWeeklySheetHtml(rows, options = {}) {
  const titleRange = options.from || options.to
    ? `Entrega: ${escapeHtml(options.from || '')}${options.to ? ' al ' + escapeHtml(options.to) : ''}`
    : 'Planilla de reparto';

  // Agrupar por ciudad — Rosario primero, luego resto alfabético
  const cityKey = (city) => {
    const c = (city || '').toLowerCase().trim();
    if (c === 'rosario') return '0_rosario';
    return '1_' + c;
  };
  const grouped = {};
  rows.forEach((row) => {
    const city = (row.city || 'Sin localidad').trim();
    if (!grouped[city]) grouped[city] = [];
    grouped[city].push(row);
  });
  const sortedCities = Object.keys(grouped).sort((a, b) => cityKey(a).localeCompare(cityKey(b)));

  // Armar filas con separadores de localidad
  const allRows = [];
  sortedCities.forEach((city) => {
    allRows.push({ isHeader: true, city });
    grouped[city].forEach((row) => allRows.push({ isHeader: false, ...row }));
  });

  // Paginar ~18 filas por página
  const ROWS_PER_PAGE = 18;
  const pages = [];
  for (let i = 0; i < allRows.length; i += ROWS_PER_PAGE) {
    pages.push(allRows.slice(i, i + ROWS_PER_PAGE));
  }

  const renderRow = (row) => {
    if (row.isHeader) {
      return `<tr class="city-header"><td colspan="7">▶ ${escapeHtml(row.city).toUpperCase()}</td></tr>`;
    }
    return `<tr>
      <td class="td-num">${escapeHtml(String(row.remitoNumber || '-'))}</td>
      <td><strong>${escapeHtml(row.tradeName || '-')}</strong>${row.contactName ? '<br><span class="meta">' + escapeHtml(row.contactName) + '</span>' : ''}</td>
      <td>${escapeHtml(row.address || '-')}</td>
      <td class="td-num money">${formatCurrency(row.total || 0)}</td>
      <td class="td-check">&#x25A1; S&#xED; &nbsp; &#x25A1; NO</td>
      <td class="td-check">&#x25A1; Ef &nbsp; &#x25A1; Tf</td>
      <td class="td-obs">___________________________</td>
    </tr>`;
  };

  const pagesHtml = pages.map((pageRows, pi) => `
    <section class="sheet">
      <header class="wh">
        <div>
          <span class="wh-brand">Distribuidora Onda Crocante</span>
          <span class="wh-sep"> &mdash; </span>
          <span class="wh-title">Planilla de reparto</span>
          <span class="wh-sep"> &mdash; </span>
          <span class="wh-range">${titleRange}</span>
        </div>
        <div class="wh-page">Pág. ${pi + 1}/${pages.length}</div>
      </header>
      <table class="wt">
        <thead><tr>
          <th class="th-num">Rem.</th>
          <th>Comercio / Contacto</th>
          <th>Dirección</th>
          <th class="th-money">Total $</th>
          <th class="th-check">Pagó</th>
          <th class="th-check">Forma</th>
          <th class="th-obs">Comentario</th>
        </tr></thead>
        <tbody>${pageRows.map(renderRow).join('')}</tbody>
      </table>
    </section>
  `).join('<div class="pb"></div>');

  return `<html><head><meta charset="UTF-8"/><title>Planilla</title><style>
    @page{size:A4;margin:9mm}
    *{box-sizing:border-box}
    body{font-family:Arial,Helvetica,sans-serif;margin:0;color:#111;font-size:9.5px}
    .sheet{padding:0}
    .wh{display:flex;justify-content:space-between;align-items:center;border-bottom:2px solid #111;padding-bottom:4px;margin-bottom:5px}
    .wh-brand{font-size:12px;font-weight:700}
    .wh-title{font-size:11px;font-weight:600}
    .wh-range{font-size:10px;color:#333}
    .wh-sep{color:#888;margin:0 2px}
    .wh-page{font-size:9px;color:#666;white-space:nowrap}
    .wt{width:100%;border-collapse:collapse;font-size:9.5px}
    .wt th,.wt td{border:1px solid #999;padding:3.5px 4px;vertical-align:middle}
    .wt th{background:#e0e0e0;font-size:8.5px;text-transform:uppercase;letter-spacing:.3px}
    .city-header td{background:#222;color:#fff;font-weight:700;font-size:9px;padding:3px 5px;border-color:#222;letter-spacing:.6px}
    .meta{color:#555;font-size:8.5px}
    .td-num{text-align:center;white-space:nowrap;font-size:8.5px;color:#444}
    .money{text-align:right;font-weight:700;white-space:nowrap}
    .td-check{text-align:center;font-size:11px;white-space:nowrap}
    .td-obs{color:#bbb;font-size:8px}
    .th-num{width:6%}
    .th-money{width:10%;text-align:right}
    .th-check{width:9%;text-align:center}
    .th-obs{width:20%}
    .pb{page-break-after:always}
    @media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
  </style></head><body>${pagesHtml}</body></html>`;
}


export function buildRemitoHtml(order, client, lines, options = {}) {
  const totalBoxes = lines.reduce((sum, line) => sum + (Number(line.quantity) || 0), 0);
  const totalPrice = lines.reduce((sum, line) => sum + (Number(line.subtotal) || 0), 0);
  const basePath = `${window.location.origin}${window.location.pathname.replace(/[^/]*$/, '')}`;
  const logoUrl = `${basePath}logo-remito.png`;
  const remitoLabel = order.remitoNumber ? `Remito ${escapeHtml(order.remitoNumber)}` : 'Remito';
  const title = options.documentTitle || remitoLabel;

  return `
    <html>
      <head>
        <title>${title}</title>
        <meta charset="UTF-8" />
        <style>
          @page { size: A4; margin: 14mm; }
          * { box-sizing: border-box; }
          body {
            font-family: Arial, Helvetica, sans-serif;
            color: #111111;
            background: #ffffff;
            margin: 0;
          }
          .sheet {
            width: 100%;
            min-height: calc(297mm - 28mm);
            border: 1px solid #d7d7d7;
            padding: 10mm 9mm 8mm;
          }
          .header {
            display: grid;
            grid-template-columns: 105px 1fr 140px;
            align-items: center;
            gap: 12px;
            padding-bottom: 8px;
            border-bottom: 1px solid #222;
          }
          .logo-wrap { text-align: center; }
          .logo { max-width: 82px; max-height: 82px; object-fit: contain; display: inline-block; }
          .brand-center { text-align: center; }
          .brand-title { margin: 0; font-size: 20px; font-weight: 700; letter-spacing: 0.3px; }
          .remito-title { margin: 3px 0 0; font-size: 15px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.7px; }
          .doc-note { margin-top: 2px; font-size: 10px; color: #444; }
          .doc-side { text-align: right; font-size: 12px; }
          .doc-date { margin-bottom: 12px; }
          .doc-remito { font-size: 12px; font-weight: 700; }
          .doc-remito strong { font-size: 20px; margin-left: 8px; letter-spacing: 0.5px; }
          .client-row {
            display: grid;
            grid-template-columns: 100px 1fr;
            gap: 8px;
            align-items: center;
            margin-top: 13px;
            margin-bottom: 12px;
            font-size: 13px;
          }
          .client-row label { font-weight: 700; font-size: 16px; }
          .client-name {
            background: #f2f2f2;
            border: 1px solid #d8d8d8;
            min-height: 30px;
            display: flex;
            align-items: center;
            padding: 0 10px;
            font-size: 15px;
            font-weight: 700;
          }
          .meta-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 12px; }
          .meta-box { border: 1px solid #d5d5d5; padding: 7px 8px; }
          .meta-label { font-size: 9px; text-transform: uppercase; color: #555; letter-spacing: 0.3px; margin-bottom: 2px; }
          .meta-value { font-size: 12px; font-weight: 700; min-height: 16px; }
          table { width: 100%; border-collapse: collapse; font-size: 11px; }
          thead th { background: #f3f3f3; color: #111; border: 1px solid #cfcfcf; padding: 6px 5px; text-align: left; }
          tbody td { border: 1px solid #d8d8d8; padding: 6px 5px; vertical-align: top; }
          .num { text-align: right; white-space: nowrap; }
          .code { width: 76px; }
          .brand { width: 95px; }
          .qty { width: 60px; text-align: center !important; }
          .price { width: 84px; }
          .subtotal { width: 96px; }
          .totals { margin-top: 10px; margin-left: auto; width: 240px; border: 1px solid #cfcfcf; }
          .totals-row { display: flex; justify-content: space-between; padding: 7px 9px; border-bottom: 1px solid #dcdcdc; font-size: 12px; }
          .totals-row:last-child { border-bottom: 0; font-size: 14px; font-weight: 800; }
          .footer-note { margin-top: 12px; font-size: 10px; color: #555; }
          @media print {
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            .logo { filter: grayscale(100%) contrast(115%); }
            thead th { background: #efefef !important; }
          }
        </style>
      </head>
      <body>
        <section class="sheet">
          <div class="header">
            <div class="logo-wrap">
              <img class="logo" src="${logoUrl}" alt="Onda Crocante" />
            </div>
            <div class="brand-center">
              <p class="brand-title">Distribuidora Onda Crocante</p>
              <p class="remito-title">REMITO X</p>
              <div class="doc-note">No válido como factura</div>
            </div>
            <div class="doc-side">
              <div class="doc-date">${escapeHtml(formatOnlyDate(order.createdAtRaw || order.createdAt || ''))}</div>
              <div class="doc-remito">N° de Remito <strong>${escapeHtml(order.remitoNumber || '-')}</strong></div>
            </div>
          </div>

          <div class="client-row">
            <label>Señor/a:</label>
            <div class="client-name">${escapeHtml(client.tradeName || client.contactName || '-')}</div>
          </div>

          <div class="meta-grid">
            <div class="meta-box">
              <div class="meta-label">Contacto</div>
              <div class="meta-value">${escapeHtml(client.contactName || '-')}</div>
            </div>
            <div class="meta-box">
              <div class="meta-label">Dirección</div>
              <div class="meta-value">${escapeHtml(client.address || '-')}</div>
            </div>
            <div class="meta-box">
              <div class="meta-label">Ciudad / Horario</div>
              <div class="meta-value">${escapeHtml([client.city, client.schedule].filter(Boolean).join(' · ') || '-')}</div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th class="code">Código</th>
                <th class="qty" style="text-align:center">Bultos</th>
                <th>Producto</th>
                <th class="brand">Marca</th>
                <th class="price num">P. unitario</th>
                <th class="subtotal num">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              ${lines.map((line) => `
                <tr>
                  <td class="code">${escapeHtml(line.code || '-')}</td>
                  <td style="text-align:center;vertical-align:middle"><strong style="font-size:14px">${escapeHtml(String(line.quantity || 0))}</strong></td>
                  <td>${escapeHtml(line.productName || '-')}</td>
                  <td>${escapeHtml(line.brand || '-')}</td>
                  <td class="num">${escapeHtml(formatCurrency(line.unitPrice))}</td>
                  <td class="num">${escapeHtml(formatCurrency(line.subtotal))}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="totals">
            <div class="totals-row"><span>Total bultos</span><strong>${escapeHtml(totalBoxes)}</strong></div>
            <div class="totals-row"><span>Total</span><strong>${escapeHtml(formatCurrency(totalPrice))}</strong></div>
          </div>

          ${order.observations ? `<div class="footer-note"><strong>Observaciones:</strong> ${escapeHtml(order.observations)}</div>` : ''}
        </section>
      </body>
    </html>
  `;
}

export function printOrder(order, client, lines) {
  const content = buildRemitoHtml(order, client, lines);
  const win = window.open('', '_blank', 'width=980,height=700');
  if (!win) return;
  win.document.open();
  win.document.write(content);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 350);
}
