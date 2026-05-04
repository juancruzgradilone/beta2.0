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
    <head>
      <meta charset="UTF-8"/>
      <style>
        body { font-family: Arial; font-size: 12px; }
        .linea { margin-bottom: 8px; }
        .cantidad { font-weight: bold; font-size: 13px; }
        .producto { margin-left: 4px; }
        .subtotal { font-weight: bold; }
      </style>
    </head>
    <body>
      <h2>Distribuidora Onda Crocante</h2>
      <p><strong>Remito ${remito.numero || ''}</strong></p>
      <p>Fecha: ${formatOnlyDate(remito.fecha)}</p>

      <hr/>

      ${lineas.map(l => `
        <div class="linea">
          <span class="cantidad">${l.cantidad}x</span>
          <span class="producto">${l.producto}</span><br/>
          $${l.precio} c/u<br/>
          <span class="subtotal">Subtotal: ${formatCurrency(l.subtotal)}</span>
        </div>
      `).join('')}

      <hr/>

      <h3>Total: ${formatCurrency(total)}</h3>
    </body>
  </html>
  `;
}
