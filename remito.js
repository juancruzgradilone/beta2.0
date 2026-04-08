import { formatCurrency, escapeHtml } from './utils.js';

function formatOnlyDate(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat('es-AR').format(date);
}

export function buildWeeklySheetHtml(rows, options = {}) {
  const titleRange = options.from || options.to
    ? `Período: ${escapeHtml(options.from || 'inicio')} al ${escapeHtml(options.to || 'fin')}`
    : 'Todos los pedidos filtrados';

  const pages = [];
  for (let i = 0; i < rows.length; i += 16) {
    pages.push(rows.slice(i, i + 16));
  }

  const pagesHtml = pages.map((pageRows, pageIndex) => `
    <section class="sheet weekly-sheet">
      <header class="weekly-header">
        <div>
          <div class="weekly-brand">Distribuidora Onda Crocante</div>
          <div class="weekly-title">Planilla semanal de reparto</div>
          <div class="weekly-range">${titleRange}</div>
        </div>
        <div class="weekly-page">Página ${pageIndex + 1} / ${pages.length}</div>
      </header>

      <table class="weekly-table">
        <thead>
          <tr>
            <th>Cliente</th>
            <th>Comercio</th>
            <th>Dirección</th>
            <th>Total</th>
            <th class="checks">Entrega / Pago / Obs.</th>
          </tr>
        </thead>
        <tbody>
          ${pageRows.map((row) => `
            <tr>
              <td>${escapeHtml(row.contactName || '-')}</td>
              <td>
                <strong>${escapeHtml(row.tradeName || '-')}</strong><br>
                <span class="weekly-meta">${escapeHtml(row.city || '')} · Remito ${escapeHtml(row.remitoNumber || '-')}</span>
              </td>
              <td>${escapeHtml(row.address || '-')}</td>
              <td class="num">${formatCurrency(row.total || 0)}</td>
              <td>
                <div class="check-line">[ ] Entregado &nbsp;&nbsp; [ ] No entregado</div>
                <div class="check-line">[ ] Efectivo &nbsp;&nbsp; [ ] Transferencia &nbsp;&nbsp; [ ] Otro</div>
                <div class="obs-line">Obs: ____________________________________</div>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </section>
  `).join('<div class="page-break"></div>');

  return `
    <html>
      <head>
        <meta charset="UTF-8" />
        <title>Planilla semanal</title>
        <style>
          @page { size: A4; margin: 12mm; }
          * { box-sizing: border-box; }
          body { font-family: Arial, Helvetica, sans-serif; margin: 0; color: #111; }
          .sheet { min-height: calc(297mm - 24mm); padding: 1mm 1mm 0; }
          .weekly-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px; border-bottom: 1px solid #222; padding-bottom: 5px; }
          .weekly-brand { font-size: 16px; font-weight: 700; }
          .weekly-title { font-size: 13px; font-weight: 700; margin-top: 2px; }
          .weekly-range, .weekly-page { font-size: 10px; color: #444; }
          .weekly-table { width: 100%; border-collapse: collapse; font-size: 10px; }
          .weekly-table th, .weekly-table td { border: 1px solid #444; padding: 5px; vertical-align: top; }
          .weekly-table th { background: #f3f3f3; text-align: left; }
          .weekly-table td.num { white-space: nowrap; text-align: right; font-weight: 700; }
          .weekly-table th:nth-child(1) { width: 16%; }
          .weekly-table th:nth-child(2) { width: 23%; }
          .weekly-table th:nth-child(3) { width: 22%; }
          .weekly-table th:nth-child(4) { width: 10%; }
          .weekly-table th:nth-child(5) { width: 29%; }
          .weekly-meta { color: #555; font-size: 9px; }
          .check-line { margin-bottom: 4px; white-space: nowrap; }
          .obs-line { margin-top: 6px; white-space: nowrap; }
          .page-break { page-break-after: always; }
          @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
        </style>
      </head>
      <body>${pagesHtml}</body>
    </html>
  `;
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
          .qty { width: 64px; }
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
                <th>Producto</th>
                <th class="brand">Marca</th>
                <th class="qty">Bultos</th>
                <th class="price num">P. unitario</th>
                <th class="subtotal num">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              ${lines.map((line) => `
                <tr>
                  <td>${escapeHtml(line.code || '-')}</td>
                  <td>${escapeHtml(line.productName || '-')}</td>
                  <td>${escapeHtml(line.brand || '-')}</td>
                  <td class="num">${escapeHtml(line.quantity || 0)}</td>
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
