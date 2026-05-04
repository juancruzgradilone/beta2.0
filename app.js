import { getConfig, saveConfig, clearConfig } from './config.js';
import { listRecords, createRecord, updateRecord, deleteRecord, getRecord, createFullOrder, updateFullOrder } from './sheets-api.js';
import { formatCurrency, debounce, normalize, escapeHtml } from './utils.js';
import { printOrder, buildRemitoHtml, buildWeeklySheetHtml } from './remito.js';

const state = {
  clients: [],
  products: [],
  orders: [],
  orderLines: [],
  editingOrderId: null,
};

function normalizeCity(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  const key = normalize(raw);
  const allowed = {
    rosario: 'Rosario',
    roldan: 'Roldán',
    'roldán': 'Roldán',
    funes: 'Funes',
    correa: 'Correa',
    carcarana: 'Carcarañá',
    'carcaraña': 'Carcarañá',
    'carcarañá': 'Carcarañá',
    'san jeronimo sud': 'San Jeronimo Sud',
  };
  return allowed[key] || raw;
}

const els = {
  tabButtons: document.querySelectorAll('.tab-btn'),
  tabPanels: document.querySelectorAll('.tab-panel'),
  refreshAppBtn: document.getElementById('refreshAppBtn'),
  toast: document.getElementById('toast'),
  clientSearch: document.getElementById('clientSearch'),
  clientSearchResults: document.getElementById('clientSearchResults'),
  selectedClientId: document.getElementById('selectedClientId'),
  selectedClientCard: document.getElementById('selectedClientCard'),
  estadoPedido: document.getElementById('estadoPedido'),
  observacionesPedido: document.getElementById('observacionesPedido'),
  productSearch: document.getElementById('productSearch'),
  productSearchResults: document.getElementById('productSearchResults'),
  orderLinesBody: document.getElementById('orderLinesBody'),
  emptyLinesState: document.getElementById('emptyLinesState'),
  totalBoxes: document.getElementById('totalBoxes'),
  totalPrice: document.getElementById('totalPrice'),
  orderForm: document.getElementById('orderForm'),
  resetOrderBtn: document.getElementById('resetOrderBtn'),
  saveOrderBtn: document.getElementById('saveOrderBtn'),
  orderModeBadge: document.getElementById('orderModeBadge'),
  clientForm: document.getElementById('clientForm'),
  ordersList: document.getElementById('ordersList'),
  ordersSearch: document.getElementById('ordersSearch'),
  ordersStatusFilter: document.getElementById('ordersStatusFilter'),
  ordersDateFrom: document.getElementById('ordersDateFrom'),
  ordersDateTo: document.getElementById('ordersDateTo'),
  clearDateFiltersBtn: document.getElementById('clearDateFiltersBtn'),
  printFilteredBtn: document.getElementById('printFilteredBtn'),
  weeklySheetBtn: document.getElementById('weeklySheetBtn'),
  fechaEntregaPedido: document.getElementById('fechaEntregaPedido'),
  compraProveedor: document.getElementById('compraProveedor'),
  compraFecha: document.getElementById('compraFecha'),
  compraObservaciones: document.getElementById('compraObservaciones'),
  compraLinesList: document.getElementById('compraLinesList'),
  addCompraLineBtn: document.getElementById('addCompraLineBtn'),
  saveCompraBtn: document.getElementById('saveCompraBtn'),
  configPat: document.getElementById('configPat'),
  configBaseId: document.getElementById('configBaseId'),
  saveConfigBtn: document.getElementById('saveConfigBtn'),
  clearConfigBtn: document.getElementById('clearConfigBtn'),
};

init();

async function init() {
  bindEvents();
  loadConfigInputs();

  if (hasConfig()) {
    await loadInitialData();
  } else {
    showToast('Primero guardá la URL del Apps Script en Configuración.');
    switchTab('configuracion');
  }
}

function bindEvents() {
  els.tabButtons.forEach((button) => {
    button.addEventListener('click', () => switchTab(button.dataset.tab));
  });

  els.refreshAppBtn.addEventListener('click', async () => {
    await loadInitialData(true);
  });

  els.clientSearch.addEventListener('input', debounce(handleClientSearch, 150));
  els.productSearch.addEventListener('input', debounce(handleProductSearch, 120));

  els.orderForm.addEventListener('submit', handleOrderSubmit);
  els.resetOrderBtn.addEventListener('click', resetOrderForm);
  els.clientForm.addEventListener('submit', handleClientSubmit);
  els.ordersSearch.addEventListener('input', renderOrdersList);
  els.ordersStatusFilter.addEventListener('change', renderOrdersList);
  els.ordersDateFrom.addEventListener('change', renderOrdersList);
  els.ordersDateTo.addEventListener('change', renderOrdersList);
  els.clearDateFiltersBtn.addEventListener('click', () => { els.ordersDateFrom.value = ''; els.ordersDateTo.value = ''; renderOrdersList(); });
  els.printFilteredBtn.addEventListener('click', printFilteredOrders);
  els.weeklySheetBtn.addEventListener('click', printWeeklySheet);
  if (els.addCompraLineBtn) els.addCompraLineBtn.addEventListener('click', addCompraLine);
  if (els.saveCompraBtn) els.saveCompraBtn.addEventListener('click', saveCompra);
  // Fecha entrega por defecto: próximo miércoles
  if (els.fechaEntregaPedido) els.fechaEntregaPedido.value = nextWednesday();

  els.saveConfigBtn.addEventListener('click', async () => {
    saveConfig({
      SCRIPT_URL: els.configPat.value.trim(),
    });
    showToast('Configuración guardada en este dispositivo.');
    await loadInitialData(true);
  });

  els.clearConfigBtn.addEventListener('click', () => {
    clearConfig();
    els.configPat.value = '';
    els.configBaseId.value = '';
    showToast('Configuración borrada.');
  });
}

function loadConfigInputs() {
  const config = getConfig();
  els.configPat.value = config.SCRIPT_URL || '';
  els.configBaseId.value = '';
  els.configBaseId.closest('.field-group')?.classList.add('hidden');
}

function hasConfig() {
  const config = getConfig();
  return Boolean(config.SCRIPT_URL);
}

async function loadInitialData(showSuccessToast = false) {
  try {
    setLoading(true);
    const [clients, products, orders] = await Promise.all([
      listRecords('CLIENTES', { sort: [{ field: 'Nombre comercio', direction: 'asc' }] }),
      listRecords('PRODUCTOS', {
        sort: [
          { field: 'Marca', direction: 'asc' },
          { field: 'Nombre producto', direction: 'asc' },
          { field: 'Código', direction: 'asc' },
        ],
      }),
      listRecords('PEDIDOS', { sort: [{ field: 'Fecha creación', direction: 'desc' }] }),
    ]);

    state.clients = clients.map(mapClientRecord);
    state.products = products.map(mapProductRecord);
    state.orders = orders.map(mapOrderRecord);

    renderSelectedClient();
    renderOrderLines();
    renderOrdersList();

    if (showSuccessToast) showToast('Datos sincronizados.');
  } catch (error) {
    console.error(error);
    showToast(error.message || 'No se pudieron cargar los datos.');
    switchTab('configuracion');
  } finally {
    setLoading(false);
  }
}

function switchTab(tabId) {
  els.tabButtons.forEach((btn) => btn.classList.toggle('active', btn.dataset.tab === tabId));
  els.tabPanels.forEach((panel) => panel.classList.toggle('active', panel.id === tabId));
}

function handleClientSearch() {
  const query = normalize(els.clientSearch.value);
  els.clientSearchResults.innerHTML = '';

  if (!query) return;

  const results = state.clients
    .filter((client) => {
      const haystack = normalize(`${client.tradeName} ${client.contactName}`);
      return haystack.includes(query);
    })
    .slice(0, 10);

  if (!results.length) {
    els.clientSearchResults.innerHTML = '<div class="search-item"><div class="search-item-title">Sin resultados</div></div>';
    return;
  }

  results.forEach((client) => {
    const wrapper = document.createElement('div');
    wrapper.className = 'search-item';
    wrapper.innerHTML = `
      <button type="button">
        <div class="search-item-title">${escapeHtml(client.tradeName)}</div>
        <div class="search-item-subtitle">${escapeHtml(client.contactName)}</div>
      </button>
    `;
    wrapper.querySelector('button').addEventListener('click', () => selectClient(client.id));
    els.clientSearchResults.appendChild(wrapper);
  });
}

function selectClient(clientId) {
  els.selectedClientId.value = clientId;
  const client = state.clients.find((item) => item.id === clientId);
  els.clientSearch.value = client ? `${client.tradeName}` : '';
  els.clientSearchResults.innerHTML = '';
  renderSelectedClient();
}

function renderSelectedClient() {
  const client = state.clients.find((item) => item.id === els.selectedClientId.value);
  if (!client) {
    els.selectedClientCard.classList.add('hidden');
    els.selectedClientCard.innerHTML = '';
    return;
  }

  els.selectedClientCard.classList.remove('hidden');
  els.selectedClientCard.innerHTML = `
    <strong>${escapeHtml(client.tradeName)}</strong><br />
    <span class="muted">${escapeHtml(client.contactName)} · ${escapeHtml(client.city || '-')} · ${escapeHtml(client.address || '-')}</span>
  `;
}

function handleProductSearch() {
  const rawQuery = els.productSearch.value;
  const query = normalize(rawQuery);
  els.productSearchResults.innerHTML = '';

  if (!query) return;

  const terms = query.split(/\s+/).filter(Boolean);
  const scoreProduct = (product) => {
    const fields = {
      code: normalize(product.code),
      name: normalize(product.name),
      brand: normalize(product.brand),
      category: normalize(product.category),
    };
    const haystack = `${fields.code} ${fields.name} ${fields.brand} ${fields.category}`;
    if (!terms.every((term) => haystack.includes(term))) return -1;

    let score = 0;
    terms.forEach((term) => {
      if (fields.code.includes(term)) score += 6;
      if (fields.name.includes(term)) score += 5;
      if (fields.brand.includes(term)) score += 3;
      if (fields.category.includes(term)) score += 1;
    });
    if (fields.name.startsWith(terms[0])) score += 2;
    return score;
  };

  const results = state.products
    .map((product) => ({ product, score: scoreProduct(product) }))
    .filter((item) => item.score >= 0)
    .sort((a, b) => {
      const brandCompare = (a.product.brand || '').localeCompare(b.product.brand || '', 'es', { sensitivity: 'base' });
      if (brandCompare !== 0) return brandCompare;
      if (b.score !== a.score) return b.score - a.score;
      return (a.product.name || '').localeCompare(b.product.name || '', 'es', { sensitivity: 'base' });
    })
    .slice(0, 36)
    .map((item) => item.product);

  if (!results.length) {
    els.productSearchResults.innerHTML = '<div class="search-item"><div class="search-item-title">Sin resultados</div></div>';
    return;
  }

  const grouped = results.reduce((acc, product) => {
    const brand = product.brand || 'Sin marca';
    if (!acc[brand]) acc[brand] = [];
    acc[brand].push(product);
    return acc;
  }, {});

  Object.entries(grouped).forEach(([brand, items]) => {
    const group = document.createElement('div');
    group.className = 'search-group';

    const title = document.createElement('div');
    title.className = 'search-group-title';
    title.textContent = brand;
    group.appendChild(title);

    items.forEach((product) => {
      const wrapper = document.createElement('div');
      wrapper.className = 'search-item';
      wrapper.innerHTML = `
        <button type="button">
          <div class="search-item-title">${escapeHtml(product.code || '-')} · ${escapeHtml(product.name)}</div>
          <div class="search-item-subtitle">${escapeHtml(product.brand || '-')} · ${formatCurrency(product.unitPrice)}</div>
        </button>
      `;
      wrapper.querySelector('button').addEventListener('click', () => addProductLine(product.id));
      group.appendChild(wrapper);
    });

    els.productSearchResults.appendChild(group);
  });
}

function addProductLine(productId) {
  const product = state.products.find((item) => item.id === productId);
  if (!product) return;

  const existingLine = state.orderLines.find((line) => line.productId === productId);
  if (existingLine) {
    existingLine.quantity += 1;
  } else {
    state.orderLines.push({
      lineRecordId: null,
      productId: product.id,
      code: product.code,
      productName: product.name,
      brand: product.brand,
      unitPrice: product.unitPrice,
      quantity: 1,
      desdeStock: false,
    });
  }

  els.productSearch.value = '';
  els.productSearchResults.innerHTML = '';
  renderOrderLines();
}

function renderOrderLines() {
  els.orderLinesBody.innerHTML = '';
  els.emptyLinesState.classList.toggle('hidden', state.orderLines.length > 0);

  state.orderLines.forEach((line, index) => {
    const subtotal = Number(line.unitPrice) * Number(line.quantity || 0);
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${escapeHtml(line.code || '-')}</td>
      <td>${escapeHtml(line.productName || '-')}</td>
      <td>${escapeHtml(line.brand || '-')}</td>
      <td>
        <input
          class="line-qty-input"
          type="number"
          min="1"
          step="1"
          inputmode="numeric"
          enterkeyhint="done"
          value="${line.quantity}"
        />
      </td>
      <td>${formatCurrency(line.unitPrice)}</td>
      <td class="line-subtotal-cell">${formatCurrency(subtotal)}</td>
      <td class="center-cell"><input class="line-stock-input" type="checkbox" ${line.desdeStock ? "checked" : ""} /></td>
      <td><button type="button" class="danger-btn">Quitar</button></td>
    `;

    const qtyInput = tr.querySelector('.line-qty-input');
    const stockInput = tr.querySelector('.line-stock-input');
    const subtotalCell = tr.querySelector('.line-subtotal-cell');

    stockInput.addEventListener('change', () => {
      state.orderLines[index].desdeStock = stockInput.checked;
    });

    qtyInput.addEventListener('focus', () => {
      qtyInput.select();
    });

    qtyInput.addEventListener('click', () => {
      qtyInput.select();
    });

    qtyInput.addEventListener('input', () => {
      const cleanValue = qtyInput.value.replace(/[^\d]/g, '');
      qtyInput.value = cleanValue;

      if (!cleanValue) {
        subtotalCell.textContent = formatCurrency(0);
        updateTotals();
        return;
      }

      const qty = Math.max(1, Number(cleanValue));
      state.orderLines[index].quantity = qty;
      subtotalCell.textContent = formatCurrency(qty * Number(line.unitPrice || 0));
      updateTotals();
    });

    qtyInput.addEventListener('blur', () => {
      const qty = Math.max(1, Number(qtyInput.value || 1));
      state.orderLines[index].quantity = qty;
      qtyInput.value = String(qty);
      subtotalCell.textContent = formatCurrency(qty * Number(line.unitPrice || 0));
      updateTotals();
    });

    qtyInput.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        qtyInput.blur();
      }
    });

    tr.querySelector('button').addEventListener('click', () => {
      state.orderLines.splice(index, 1);
      renderOrderLines();
    });

    els.orderLinesBody.appendChild(tr);
  });

  updateTotals();
}

function updateTotals() {
  const totalBoxes = state.orderLines.reduce((sum, line) => sum + Number(line.quantity || 0), 0);
  const totalPrice = state.orderLines.reduce((sum, line) => sum + Number(line.quantity || 0) * Number(line.unitPrice || 0), 0);

  els.totalBoxes.textContent = String(totalBoxes);
  els.totalPrice.textContent = formatCurrency(totalPrice);
}

async function handleOrderSubmit(event) {
  event.preventDefault();

  if (!els.selectedClientId.value) {
    showToast('Primero elegí un cliente.');
    return;
  }
  if (!state.orderLines.length) {
    showToast('Agregá al menos un producto.');
    return;
  }

  try {
    setLoading(true);

    const orderFields = {
      Cliente: [els.selectedClientId.value],
      Estado: els.estadoPedido.value,
      Observaciones: els.observacionesPedido.value.trim(),
      'Fecha entrega': els.fechaEntregaPedido?.value || '',
    };

    const linePayloads = state.orderLines.map((line) => ({
      lineRecordId: line.lineRecordId || null,
      Producto: [line.productId],
      'Cantidad de cajas': Number(line.quantity),
      'Desde stock': line.desdeStock ? 'SI' : 'NO',
    }));

    let newOrder;
    const wasEditing = Boolean(state.editingOrderId);

    if (wasEditing) {
      const orderId = state.editingOrderId;
      const existingLineIds = state.orderLines.map((l) => l.lineRecordId).filter(Boolean);
      const currentOrder = state.orders.find((o) => o.id === orderId);
      const deleteLineIds = (currentOrder?.lineIds || []).filter((id) => !existingLineIds.includes(id));
      const result = await updateFullOrder(orderId, orderFields, linePayloads, deleteLineIds);
      newOrder = result.order;
    } else {
      const result = await createFullOrder(orderFields, linePayloads);
      newOrder = result.order;
    }

    // Actualizar estado local sin recargar todo
    const mappedOrder = mapOrderRecord(newOrder);
    if (wasEditing) {
      const idx = state.orders.findIndex((o) => o.id === mappedOrder.id);
      if (idx >= 0) state.orders[idx] = mappedOrder;
    } else {
      state.orders.unshift(mappedOrder);
    }
    renderOrdersList();
    resetOrderForm();
    switchTab('pedidos');
    showToast(wasEditing ? 'Pedido actualizado.' : 'Pedido creado.');
  } catch (error) {
    console.error(error);
    showToast(error.message || 'No se pudo guardar el pedido.');
  } finally {
    setLoading(false);
  }
}

function resetOrderForm() {
  state.editingOrderId = null;
  if (els.fechaEntregaPedido) els.fechaEntregaPedido.value = nextWednesday();
  state.orderLines = [];
  els.selectedClientId.value = '';
  els.clientSearch.value = '';
  els.clientSearchResults.innerHTML = '';
  els.productSearch.value = '';
  els.productSearchResults.innerHTML = '';
  els.estadoPedido.value = 'Pedido';
  els.observacionesPedido.value = '';
  els.orderModeBadge.textContent = 'Creando';
  renderSelectedClient();
  renderOrderLines();
}

async function handleClientSubmit(event) {
  event.preventDefault();

  const fields = {
    'Nombre comercio': document.getElementById('nombreComercio').value.trim(),
    'Nombre contacto': document.getElementById('nombreContacto').value.trim(),
    Celular: document.getElementById('celularCliente').value.trim(),
    'Dirección': document.getElementById('direccionCliente').value.trim(),
    Ciudad: normalizeCity(document.getElementById('ciudadCliente').value),
    'Horario atención': document.getElementById('horarioCliente').value.trim(),
    CUIL: document.getElementById('cuilCliente').value.trim(),
  };

  try {
    setLoading(true);
    await createRecord('CLIENTES', fields);
    els.clientForm.reset();
    await loadInitialData(true);
    switchTab('nuevo-pedido');
    showToast('Cliente creado.');
  } catch (error) {
    console.error(error);
    showToast(error.message || 'No se pudo crear el cliente.');
  } finally {
    setLoading(false);
  }
}

function getFilteredOrders() {
  const query = normalize(els.ordersSearch.value);
  const status = els.ordersStatusFilter.value;
  const from = els.ordersDateFrom.value ? new Date(`${els.ordersDateFrom.value}T00:00:00`) : null;
  const to = els.ordersDateTo.value ? new Date(`${els.ordersDateTo.value}T23:59:59`) : null;

  return state.orders.filter((order) => {
    const client = state.clients.find((item) => item.id === order.clientId);
    const clientName = client ? `${client.tradeName} ${client.contactName}` : '';
    const matchesQuery = !query || normalize(`${order.remitoNumber} ${order.status} ${clientName}`).includes(query);
    const matchesStatus = !status || order.status === status;
    // Filtrar por fecha de ENTREGA (si tiene), si no por fecha creación
    const dateToFilter = order.deliveryDate ? new Date(order.deliveryDate) : (order.createdAtRaw ? new Date(order.createdAtRaw) : null);
    const matchesFrom = !from || (dateToFilter && dateToFilter >= from);
    const matchesTo = !to || (dateToFilter && dateToFilter <= to);
    return matchesQuery && matchesStatus && matchesFrom && matchesTo;
  });
}

function renderOrdersList() {
  const filtered = getFilteredOrders();

  if (!filtered.length) {
    els.ordersList.innerHTML = '<div class="empty-state">No hay remitos para mostrar.</div>';
    return;
  }

  els.ordersList.innerHTML = '';
  const template = document.getElementById('orderCardTemplate');

  filtered.forEach((order) => {
    const node = template.content.cloneNode(true);
    const client = state.clients.find((item) => item.id === order.clientId);
    node.querySelector('.order-card-id').textContent = `Remito ${order.remitoNumber || '-'}`;
    node.querySelector('.order-card-client').textContent = client?.tradeName || 'Cliente sin nombre';
    node.querySelector('.order-card-status').textContent = order.status || '-';
    node.querySelector('.order-card-meta').textContent = `${client?.contactName || '-'} · ${order.createdAt || '-'}`;
    node.querySelector('.order-card-total').textContent = `Total: ${formatCurrency(order.total)}`;

    node.querySelector('.edit-order-btn').addEventListener('click', () => loadOrderForEdit(order.id));
    node.querySelector('.print-order-btn').addEventListener('click', () => exportOrder(order.id));
    node.querySelector('.delete-order-btn').addEventListener('click', () => removeOrder(order.id));
    els.ordersList.appendChild(node);
  });
}

async function removeOrder(orderId) {
  const order = state.orders.find((item) => item.id === orderId);
  if (!order) return;
  const ok = window.confirm(`Vas a eliminar el remito ${order.remitoNumber || ''}. Esta acción no se puede deshacer.`);
  if (!ok) return;

  try {
    setLoading(true);
    await Promise.all((order.lineIds || []).map((lineId) => deleteRecord('LÍNEAS DE PEDIDO', lineId)));
    await deleteRecord('PEDIDOS', orderId);
    if (state.editingOrderId === orderId) {
      resetOrderForm();
    }
    await loadInitialData(true);
    showToast('Remito eliminado.');
  } catch (error) {
    console.error(error);
    showToast(error.message || 'No se pudo eliminar el remito.');
  } finally {
    setLoading(false);
  }
}

async function printFilteredOrders() {
  const filtered = getFilteredOrders();
  if (!filtered.length) {
    showToast('No hay remitos filtrados para imprimir.');
    return;
  }

  try {
    setLoading(true);
    const documents = [];

    for (const order of filtered) {
      const client = state.clients.find((item) => item.id === order.clientId);
      const lineRecords = await Promise.all((order.lineIds || []).map((lineId) => getRecord('LÍNEAS DE PEDIDO', lineId)));
      const lines = lineRecords.map((record) => {
        const f = record.fields || {};
        const linkedProductId = Array.isArray(f.Producto) ? f.Producto[0] : f.Producto;
        const product = state.products.find((item) => String(item.id) === String(linkedProductId));
        const quantity = Number(f['Cantidad de cajas'] || 0);
        const rawPrice = Array.isArray(f['Precio unitario']) ? f['Precio unitario'][0] : f['Precio unitario'];
        const unitPrice = Number(rawPrice || product?.unitPrice || 0);
        const subtotal = Number(f.Subtotal || quantity * unitPrice);
        return {
          code: product?.code || linkedProductId || '-',
          productName: product?.name || linkedProductId || '-',
          brand: product?.brand || '-',
          quantity,
          unitPrice,
          subtotal,
        };
      });
      documents.push(buildRemitoHtml(order, client || {}, lines, { documentTitle: `Remito ${order.remitoNumber || ''}` }));
    }

    const win = window.open('', '_blank', 'width=1100,height=800');
    if (!win) throw new Error('El navegador bloqueó la ventana de impresión.');
    const pages = documents.map((doc) => {
      const match = doc.match(/<body>[\s\S]*<\/body>/i);
      return match ? match[0].replace(/^<body>/i, '').replace(/<\/body>$/i, '') : doc;
    }).join('<div style="page-break-after:always"></div>');
    const first = documents[0];
    const headMatch = first.match(/<head>[\s\S]*<\/head>/i);
    const head = headMatch ? headMatch[0] : '<head><meta charset="UTF-8"></head>';
    win.document.open();
    win.document.write(`<html>${head}<body>${pages}</body></html>`);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 350);
  } catch (error) {
    console.error(error);
    showToast(error.message || 'No se pudieron imprimir los remitos filtrados.');
  } finally {
    setLoading(false);
  }
}


async function printWeeklySheet() {
  const filtered = getFilteredOrders();
  if (!filtered.length) {
    showToast('No hay pedidos filtrados para generar la planilla.');
    return;
  }

  try {
    setLoading(true);
    const rows = filtered
      .map((order) => {
        const client = state.clients.find((item) => item.id === order.clientId);
        const city = client?.city || '';
        return {
          city,
          tradeName: client?.tradeName || 'Cliente sin nombre',
          contactName: client?.contactName || '',
          address: client?.address || '-',
          total: Number(order.total || 0),
          remitoNumber: order.remitoNumber || '-',
        };
      })
      .sort((a, b) => {
        // Rosario siempre primero
        const aKey = (a.city || '').toLowerCase().trim() === 'rosario' ? '0' : '1_' + (a.city || '').toLowerCase();
        const bKey = (b.city || '').toLowerCase().trim() === 'rosario' ? '0' : '1_' + (b.city || '').toLowerCase();
        const cityCompare = aKey.localeCompare(bKey, 'es', { sensitivity: 'base' });
        if (cityCompare !== 0) return cityCompare;
        return (a.tradeName || '').localeCompare(b.tradeName || '', 'es', { sensitivity: 'base' });
      });

    const html = buildWeeklySheetHtml(rows, {
      from: els.ordersDateFrom.value || '',
      to: els.ordersDateTo.value || '',
    });

    const win = window.open('', '_blank', 'width=1100,height=800');
    if (!win) throw new Error('El navegador bloqueó la ventana de impresión.');
    win.document.open();
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 350);
  } catch (error) {
    console.error(error);
    showToast(error.message || 'No se pudo generar la planilla semanal.');
  } finally {
    setLoading(false);
  }
}

async function loadOrderForEdit(orderId) {
  try {
    setLoading(true);
    const order = state.orders.find((item) => item.id === orderId);
    if (!order) throw new Error('Pedido no encontrado.');

    const lineIds = order.lineIds || [];
    const lineRecords = await Promise.all(lineIds.map((lineId) => getRecord('LÍNEAS DE PEDIDO', lineId)));

    state.editingOrderId = order.id;
    els.selectedClientId.value = order.clientId;
    const client = state.clients.find((item) => item.id === order.clientId);
    els.clientSearch.value = client?.tradeName || '';
    els.estadoPedido.value = order.status || 'Pedido';
    els.observacionesPedido.value = order.observations || '';
    els.orderModeBadge.textContent = 'Editando';

    state.orderLines = lineRecords.map((lineRecord) => {
      const fields = lineRecord.fields || {};
      const linkedProductId = (fields.Producto || [])[0];
      const product = state.products.find((item) => item.id === linkedProductId);
      return {
        lineRecordId: lineRecord.id,
        productId: linkedProductId,
        code: product?.code || '',
        productName: product?.name || (fields['Producto']?.[0] || ''),
        brand: product?.brand || '',
        unitPrice: Number((fields['Precio unitario'] || [product?.unitPrice || 0])[0] || product?.unitPrice || 0),
        quantity: Number(fields['Cantidad de cajas'] || 1),
        desdeStock: String(fields['Desde stock'] || '').toUpperCase() === 'SI',
      };
    });

    renderSelectedClient();
    renderOrderLines();
    switchTab('nuevo-pedido');
  } catch (error) {
    console.error(error);
    showToast(error.message || 'No se pudo cargar el pedido.');
  } finally {
    setLoading(false);
  }
}

async function exportOrder(orderId) {
  try {
    setLoading(true);
    const order = state.orders.find((item) => item.id === orderId);
    if (!order) throw new Error('Pedido no encontrado.');

    const client = state.clients.find((item) => item.id === order.clientId);
    const lineRecords = await Promise.all((order.lineIds || []).map((lineId) => getRecord('LÍNEAS DE PEDIDO', lineId)));
    const lines = lineRecords.map((record) => {
      const f = record.fields || {};
      const linkedProductId = Array.isArray(f.Producto) ? f.Producto[0] : f.Producto;
      const product = state.products.find((item) => String(item.id) === String(linkedProductId));
      const quantity = Number(f['Cantidad de cajas'] || 0);
      const rawPrice = Array.isArray(f['Precio unitario']) ? f['Precio unitario'][0] : f['Precio unitario'];
      const unitPrice = Number(rawPrice || product?.unitPrice || 0);
      const subtotal = Number(f.Subtotal || quantity * unitPrice);
      return {
        code: product?.code || linkedProductId || '-',
        productName: product?.name || linkedProductId || '-',
        brand: product?.brand || '-',
        quantity,
        unitPrice,
        subtotal,
      };
    });

    printOrder(order, client || {}, lines);
  } catch (error) {
    console.error(error);
    showToast(error.message || 'No se pudo exportar el remito.');
  } finally {
    setLoading(false);
  }
}

function mapClientRecord(record) {
  const fields = record.fields || {};
  return {
    id: record.id,
    tradeName: fields['Nombre comercio'] || '',
    contactName: fields['Nombre contacto'] || '',
    phone: fields.Celular || '',
    address: fields['Dirección'] || '',
    city: fields.Ciudad || '',
    schedule: fields['Horario atención'] || '',
    cuil: fields.CUIL || '',
  };
}

function mapProductRecord(record) {
  const fields = record.fields || {};
  return {
    id: record.id,
    code: fields.ID || fields['Código'] || '',
    name: fields['Nombre producto'] || '',
    brand: fields.Marca || '',
    unitPrice: Number(fields['Precio por caja'] || fields['Precio final'] || 0),
    type: fields.Tipo || '',
    xCaja: Number(fields.XCaja || 0),
    category: fields['Categoría'] || '',
  };
}

function nextWednesday() {
  const today = new Date();
  const day = today.getDay(); // 0=dom,1=lun,...,3=mie
  const daysUntilWed = day <= 3 ? (3 - day) || 7 : 10 - day;
  const wed = new Date(today);
  wed.setDate(today.getDate() + daysUntilWed);
  return wed.toISOString().slice(0, 10);
}

function mapOrderRecord(record) {
  const fields = record.fields || {};
  return {
    id: record.id,
    remitoNumber: fields['N° Remito'] || '',
    clientId: (fields.Cliente || [])[0] || '',
    createdAt: formatDate(fields['Fecha creación']),
    createdAtRaw: fields['Fecha creación'] || '',
    deliveryDate: fields['Fecha entrega'] || '',
    deliveryDateFormatted: fields['Fecha entrega'] ? formatDate(fields['Fecha entrega']) : '',
    status: fields.Estado || '',
    total: Number(fields.Total || 0),
    observations: fields.Observaciones || '',
    lineIds: fields['LÍNEAS DE PEDIDO'] || [],
  };
}

function formatDate(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat('es-AR', {
    dateStyle: 'short',
  }).format(date);
}

function setLoading(isLoading) {
  els.saveOrderBtn.disabled = isLoading;
  els.refreshAppBtn.disabled = isLoading;
}

function showToast(message) {
  els.toast.textContent = message;
  els.toast.classList.remove('hidden');
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => {
    els.toast.classList.add('hidden');
  }, 2600);
}

// ── COMPRAS (Ingreso de stock) ────────────────────────────────────────────────
let compraLines = [];

function addCompraLine() {
  compraLines.push({ productId: '', productName: '', quantity: 1 });
  renderCompraLines();
}

function renderCompraLines() {
  if (!els.compraLinesList) return;
  els.compraLinesList.innerHTML = compraLines.map((line, idx) => `
    <div class="order-line-row compra-line-row" data-idx="${idx}">
      <div class="product-search-wrap" style="flex:1;position:relative">
        <input
          type="text"
          class="compra-search-input"
          data-idx="${idx}"
          placeholder="Buscar por código o nombre..."
          value="${escapeHtml(line.productName)}"
          autocomplete="off"
        />
        <div class="compra-suggestions" data-idx="${idx}" style="display:none;position:absolute;top:100%;left:0;right:0;background:#fff;border:1px solid #ccc;border-top:none;z-index:50;max-height:220px;overflow-y:auto;box-shadow:0 4px 12px rgba(0,0,0,.15)"></div>
      </div>
      <input type="number" class="compra-qty-input" data-idx="${idx}" value="${line.quantity}" min="1" style="width:72px;margin-left:8px" />
      <button class="ghost-btn remove-compra-line" data-idx="${idx}" type="button" style="margin-left:6px">✕</button>
    </div>
  `).join('');

  els.compraLinesList.querySelectorAll('.compra-search-input').forEach((inp) => {
    const idx = Number(inp.dataset.idx);
    const suggestEl = els.compraLinesList.querySelector(`.compra-suggestions[data-idx="${idx}"]`);

    inp.addEventListener('input', () => {
      const q = normalize(inp.value);
      if (!q) { suggestEl.style.display = 'none'; return; }
      const matches = state.products.filter((p) =>
        normalize(p.code + ' ' + p.name).includes(q)
      ).slice(0, 10);
      if (!matches.length) { suggestEl.style.display = 'none'; return; }
      suggestEl.innerHTML = matches.map((p) => `
        <div class="compra-suggest-item" data-id="${p.id}" data-name="${escapeHtml(p.code + ' · ' + p.name)}" style="padding:8px 10px;cursor:pointer;border-bottom:1px solid #eee;font-size:13px">
          <strong>${escapeHtml(p.code)}</strong> · ${escapeHtml(p.name)}
        </div>
      `).join('');
      suggestEl.style.display = 'block';
      suggestEl.querySelectorAll('.compra-suggest-item').forEach((item) => {
        item.addEventListener('mousedown', (e) => {
          e.preventDefault();
          compraLines[idx].productId = item.dataset.id;
          compraLines[idx].productName = item.dataset.name;
          inp.value = item.dataset.name;
          suggestEl.style.display = 'none';
        });
      });
    });

    inp.addEventListener('blur', () => setTimeout(() => { suggestEl.style.display = 'none'; }, 150));
    inp.addEventListener('focus', () => { if (inp.value) inp.dispatchEvent(new Event('input')); });
  });

  els.compraLinesList.querySelectorAll('.compra-qty-input').forEach((inp) => {
    inp.addEventListener('input', (e) => { compraLines[Number(e.target.dataset.idx)].quantity = Number(e.target.value) || 1; });
  });
  els.compraLinesList.querySelectorAll('.remove-compra-line').forEach((btn) => {
    btn.addEventListener('click', (e) => { compraLines.splice(Number(e.target.dataset.idx), 1); renderCompraLines(); });
  });
}

async function saveCompra() {
  if (!compraLines.length) { showToast('Agregá al menos un producto.'); return; }
  if (compraLines.some((l) => !l.productId)) { showToast('Seleccioná el producto en todas las líneas.'); return; }

  try {
    setLoading(true);
    for (const line of compraLines) {
      await callScript('addStock', { productId: line.productId, quantity: line.quantity });
    }
    showToast(`Stock actualizado: ${compraLines.length} producto(s) ingresado(s).`);
    compraLines = [];
    renderCompraLines();
  } catch (err) {
    showToast(err.message || 'No se pudo registrar el ingreso.');
  } finally {
    setLoading(false);
  }
}

async function callScript(action, payload) {
  const { getConfig } = await import('./config.js');
  const url = getConfig().SCRIPT_URL;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ action, ...payload }),
  });
  const data = await response.json();
  if (!data.ok) throw new Error(data.error || 'Error del servidor');
  return data.result;
}
