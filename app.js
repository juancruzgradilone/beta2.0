// FIX duplicación
export function normalizeItems(items){
  return items.map(i => ({...i}));
}
