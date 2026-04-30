
// =========================
// FIX PRINCIPAL: líneas independientes
// =========================

function generarLineas(items) {
  const lineas = [];

  items.forEach(item => {
    lineas.push({
      producto: item.producto,
      cantidad: item.cantidad,
      precio: item.precio,
      subtotal: item.cantidad * item.precio
    });
  });

  return lineas;
}

// =========================
// REMITO MEJORADO (UX)
// =========================

function formatearLineaPDF(linea) {
  return `
  ${linea.cantidad}x - ${linea.producto}
  $${linea.precio} c/u
  Subtotal: $${linea.subtotal}
  `;
}

// =========================
// LISTA DE PRECIOS
// =========================

function generarListaPrecios(productos) {
  return productos.map(p => `
-------------------------------------
${p.nombre}

$${p.precioKg} x KG
$${p.precioCaja} x CAJA
-------------------------------------
`).join("\n");
}

// =========================
// PLANILLA SEMANAL
// =========================

function ordenarClientes(clientes) {
  const orden = ["Rosario", "Roldán"];
  return clientes.sort((a, b) => {
    const ia = orden.indexOf(a.ciudad);
    const ib = orden.indexOf(b.ciudad);
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
  });
}

function generarPlanilla(clientes) {
  const ordenados = ordenarClientes(clientes);

  return ordenados.map(c => `
-----------------------------------------
CLIENTE: ${c.nombre}
DIRECCIÓN: ${c.direccion}
LOCALIDAD: ${c.ciudad}

TOTAL: $${c.total}

[ ] PAGO     [ ] NO PAGO

FORMA:
[ ] EFECTIVO
[ ] TRANSFERENCIA

OBS: ___________________________

-----------------------------------------
`).join("\n");
}
