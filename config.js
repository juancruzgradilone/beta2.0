const STORAGE_KEY = 'remitos-config-v1';

const defaultConfig = {
  AIRTABLE_PAT: '',
  AIRTABLE_BASE_ID: '',
  TABLES: {
    CLIENTES: 'CLIENTES',
    PRODUCTOS: 'PRODUCTOS',
    PEDIDOS: 'PEDIDOS',
    LINEAS: 'LÍNEAS DE PEDIDO',
  },
};

export function getConfig() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return { ...defaultConfig };

  try {
    return { ...defaultConfig, ...JSON.parse(stored) };
  } catch {
    return { ...defaultConfig };
  }
}

export function saveConfig(config) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...defaultConfig, ...config }));
}

export function clearConfig() {
  localStorage.removeItem(STORAGE_KEY);
}
