// ===============================
// NORMALIZAR ITEMS (ANTI DUPLICADOS)
// ===============================
export function normalizeItems(items) {
  return items.map(item => ({
    id_producto: item.id_producto,
    nombre: item.nombre,
    cantidad: Number(item.cantidad) || 0,
    precio: Number(item.precio) || 0,
    costo: Number(item.costo) || 0
  }));
}

// ===============================
// GENERAR HTML REMITO (PDF)
// ===============================
export function buildRemitoHtml(remito, items, cliente) {
  const filas = items.map(item => `
    <tr>
      <td><strong>${item.cantidad}x</strong></td>
      <td>${item.nombre}</td>
      <td>$${item.precio}</td>
      <td>$${item.cantidad * item.precio}</td>
    </tr>
  `).join("");

  return `
    <html>
    <head>
      <style>
        body { font-family: Arial; padding: 20px; }
        h1 { margin-bottom: 5px; }
        .info { margin-bottom: 20px; }
        table { width: 100%; border-collapse: collapse; }
        th, td { border-bottom: 1px solid #ccc; padding: 8px; text-align: left; }
        th { background: #f5f5f5; }
        .total { font-size: 18px; font-weight: bold; margin-top: 20px; }
      </style>
    </head>
    <body>
      <h1>Remito</h1>

      <div class="info">
        <div><strong>Cliente:</strong> ${cliente.nombre}</div>
        <div><strong>Dirección:</strong> ${cliente.direccion}</div>
        <div><strong>Fecha:</strong> ${remito.fecha}</div>
      </div>

      <table>
        <thead>
          <tr>
            <th>Cant</th>
            <th>Producto</th>
            <th>Precio</th>
            <th>Subtotal</th>
          </tr>
        </thead>
        <tbody>
          ${filas}
        </tbody>
      </table>

      <div class="total">
        TOTAL: $${remito.total}
      </div>
    </body>
    </html>
  `;
}

// ===============================
// PLANILLA SEMANAL (ORDENADA)
// ===============================
export function buildWeeklySheetHtml(pedidos) {

  // ordenar por ciudad
  const ordenCiudades = ["Rosario", "Roldán"];
  
  pedidos.sort((a, b) => {
    const ia = ordenCiudades.indexOf(a.ciudad);
    const ib = ordenCiudades.indexOf(b.ciudad);

    if (ia === -1 && ib === -1) return a.ciudad.localeCompare(b.ciudad);
    if (ia === -1) return 1;
    if (ib === -1) return -1;
    return ia - ib;
  });

  const bloques = pedidos.map(p => `
    <div class="card">
      <div class="header">
        <div class="cliente">${p.cliente}</div>
        <div class="estado ${p.pagado ? 'pago' : 'nopago'}">
          ${p.pagado ? 'PAGO' : 'NO PAGO'}
        </div>
      </div>

      <div class="direccion">${p.direccion}</div>

      <div class="info">
        <div>Total: <strong>$${p.total}</strong></div>
        <div>${p.metodo || ''}</div>
      </div>

      <div class="nota">${p.nota || ''}</div>
    </div>
  `).join("");

  return `
    <html>
    <head>
      <style>
        body { font-family: Arial; padding: 20px; }
        h1 { margin-bottom: 20px; }

        .card {
          border: 1px solid #ddd;
          border-radius: 10px;
          padding: 15px;
          margin-bottom: 15px;
        }

        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .cliente {
          font-size: 18px;
          font-weight: bold;
        }

        .estado {
          padding: 5px 10px;
          border-radius: 6px;
          font-weight: bold;
        }

        .pago {
          background: #d4edda;
          color: #155724;
        }

        .nopago {
          background: #f8d7da;
          color: #721c24;
        }

        .direccion {
          margin: 5px 0;
        }

        .info {
          margin-top: 10px;
        }

        .nota {
          margin-top: 10px;
          font-style: italic;
          color: #555;
        }

      </style>
    </head>
    <body>
      <h1>Planilla Semanal</h1>
      ${bloques}
    </body>
    </html>
  `;
}

// ===============================
// CALCULAR TOTAL
// ===============================
export function calcularTotal(items) {
  return items.reduce((acc, item) => {
    return acc + (item.cantidad * item.precio);
  }, 0);
}

// ===============================
// CALCULAR GANANCIA
// ===============================
export function calcularGanancia(items) {
  return items.reduce((acc, item) => {
    return acc + (item.cantidad * (item.precio - item.costo));
  }, 0);
}
