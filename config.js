const STORAGE_KEY = 'remitos-sheets-config-v1';

const defaultConfig = {
  SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbwbyjMCUdpeWboQrb_Iot-LzeVtKHjapr7D9yclDoudKmGBS8E9hcY0TbR8UEccvoMXsw/exec',
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
