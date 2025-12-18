
import { MasterShipment } from '../types';

const LOCAL_STORAGE_KEY = 'aburayhan_erp_data';
// Base URL for Netlify Functions
const API_BASE = '/.netlify/functions/api';

export const apiService = {
  /**
   * Loads shipments from Neon DB via Netlify Functions.
   * Falls back to LocalStorage if the DB is unreachable.
   */
  getShipments: async (): Promise<MasterShipment[]> => {
    try {
      const response = await fetch(`${API_BASE}/shipments`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (response.ok) {
        const data = await response.json();
        // Update local backup whenever we successfully fetch from cloud
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
        return data;
      }
    } catch (e) {
      console.warn("Neon API unreachable. Loading from local backup.");
    }

    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  },

  /**
   * Atomically saves the current state to the Neon Database.
   */
  saveShipments: async (shipments: MasterShipment[]): Promise<boolean> => {
    // 1. Immediate local backup
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(shipments));

    // 2. Sync to Cloud
    try {
      const response = await fetch(`${API_BASE}/shipments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(shipments)
      });
      return response.ok;
    } catch (e) {
      console.error("Cloud sync failed. Data is currently saved locally.");
      return false;
    }
  },

  /**
   * Checks the health of the connection to the Neon Database.
   */
  checkConnection: async (): Promise<boolean> => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000); // 3s timeout
      
      const res = await fetch(`${API_BASE}/health`, { signal: controller.signal });
      clearTimeout(timeoutId);
      return res.ok;
    } catch {
      return false;
    }
  }
};
