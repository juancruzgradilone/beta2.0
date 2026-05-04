// ===============================
// CONFIG API
// ===============================
const API_URL = "https://script.google.com/macros/s/AKfycbyRfi0PVkQvdZYhffGSzp3cEX4a439oQwnMPL2foKguXPUAiPkbb4jC6-krX4ur6Fz89g/exec";

// ===============================
// POST GENERICO
// ===============================
export async function postData(action, data = {}) {
  try {
    const res = await fetch(API_URL, {
      method: "POST",
      body: JSON.stringify({
        action,
        ...data
      })
    });

    const json = await res.json();
    return json;

  } catch (err) {
    console.error("Error API:", err);
    return { ok: false, error: err.message };
  }
}

// ===============================
// NORMALIZAR ITEMS (ANTI BUG)
// ===============================
export function normalizeItems(items) {
  return items.map(i => ({
    ...i,
    cantidad: Number(i.cantidad) || 0,
    precio: Number(i.precio) || 0,
    costo: Number(i.costo) || 0
  }));
}

// ===============================
// CREAR CLIENTE
// ===============================
export async function crearCliente(data) {
  return await postData("crear_cliente", data);
}

// ===============================
// CREAR PEDIDO
// ===============================
export async function crearPedido(data) {
  return await postData("crear_pedido", data);
}

// ===============================
// CREAR LINEAS
// ===============================
export async function crearLineas(data) {
  return await postData("crear_lineas", data);
}
