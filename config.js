const STORAGE_KEY = 'remitos-sheets-config-v1';

const defaultConfig = {
  SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbyRfi0PVkQvdZYhffGSzp3cEX4a439oQwnMPL2foKguXPUAiPkbb4jC6-krX4ur6Fz89g/exec',
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
