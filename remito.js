import { formatCurrency, escapeHtml } from './utils.js';

function formatOnlyDate(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat('es-AR').format(date);
}

function normalizeLineas(items) {
  return items.map(item => {
    const cantidad = Number(item.cantidad || item.Cantidad || 0);
    const precio = Number(item.precio || item['Precio final'] || 0);

    return {
      producto: item.producto || item['Nombre producto'] || '',
      cantidad,
      precio,
      subtotal: cantidad * precio
    };
  });
}

export function buildRemitoHtml(remito, items = []) {
  const lineas = normalizeLineas(items);
  const total = lineas.reduce((acc, l) => acc + l.subtotal, 0);

  return `
  <html>
    <body>
      <h2>Distribuidora Onda Crocante</h2>
      <p><strong>Remito ${remito.numero || ''}</strong></p>
      <p>Fecha: ${formatOnlyDate(remito.fecha)}</p>
      <hr/>
      ${lineas.map(l => `
        <div>
          <strong>${l.cantidad}x</strong> ${l.producto}<br/>
          $${l.precio} c/u<br/>
          Subtotal: ${formatCurrency(l.subtotal)}
        </div>
      `).join('')}
      <hr/>
      <h3>Total: ${formatCurrency(total)}</h3>
    </body>
  </html>
  `;
}

// ✅ FIX: función que faltaba (evita romper app.js)
export function buildWeeklySheetHtml(rows = []) {
  return `
    <html>
      <body>
        <h2>Planilla semanal</h2>
        ${rows.map(r => `
          <div>
            ${r.contactName || ''} - ${r.address || ''} - $${r.total || 0}
          </div>
        `).join('')}
      </body>
    </html>
  `;
}
