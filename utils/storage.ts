
import { AppData } from '../types';
import { INITIAL_DATA } from '../constants';

const STORAGE_KEY = 'water_mgmt_data_v2';

export const loadData = (): AppData => {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return INITIAL_DATA;
  try {
    return JSON.parse(stored);
  } catch (e) {
    return INITIAL_DATA;
  }
};

export const saveData = (data: AppData) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
};

export const calculateTranches = (consumption: number, tranches: any[], fixedCharges: number) => {
  let remaining = consumption;
  const details = [];
  let totalConsumptionCost = 0;

  // Sorted tranches
  const sorted = [...tranches].sort((a, b) => a.min - b.min);

  for (let i = 0; i < sorted.length; i++) {
    const t = sorted[i];
    const range = t.max !== null ? (t.max - t.min) : Infinity;

    if (remaining > 0) {
      const consumedInThisTranche = Math.min(remaining, range);
      const cost = consumedInThisTranche * t.pricePerM3;

      details.push({
        trancheLabel: `الشطر ${i + 1} (${t.min} - ${t.max ?? 'ما فوق'})`,
        quantity: consumedInThisTranche,
        pricePerUnit: t.pricePerM3,
        total: cost
      });

      totalConsumptionCost += cost;
      remaining -= consumedInThisTranche;
    }
  }

  return {
    details,
    total: totalConsumptionCost + fixedCharges
  };
};
