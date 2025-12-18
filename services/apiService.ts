
import { MasterShipment } from '../types';

const LOCAL_STORAGE_KEY = 'aburayhan_erp_state_v2';
const API_BASE = '/api';

export type SyncStatus = 'Live' | 'Offline' | 'Error';

export const apiService = {
  /**
   * Loads the authoritative state. 
   * Priority: Cloud -> Local Storage -> Empty Array
   */
  getShipments: async (): Promise<{ data: MasterShipment[], status: SyncStatus }> => {
    try {
      const response = await fetch(`${API_BASE}/shipments`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data)) {
          // Sync successful: Update local cache
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
          return { data, status: 'Live' };
        }
      }
      console.warn("API returned non-OK status. Falling back to local.");
    } catch (e) {
      console.warn("Cloud unreachable. Entering Local Mode.");
    }

    // Fallback to local storage
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    const data = saved ? JSON.parse(saved) : [];
    return { data, status: 'Offline' };
  },

  /**
   * Persists state locally first, then attempts background cloud sync.
   */
  saveShipments: async (shipments: MasterShipment[]): Promise<SyncStatus> => {
    // 1. Immediate local persistence (Safety First)
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(shipments));

    // 2. Attempt Cloud Sync
    try {
      const response = await fetch(`${API_BASE}/shipments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(shipments)
      });
      
      if (response.ok) {
        return 'Live';
      }
      return 'Error';
    } catch (e) {
      return 'Offline';
    }
  },

  checkConnection: async (): Promise<boolean> => {
    try {
      const res = await fetch(`${API_BASE}/health`, { method: 'GET' });
      return res.ok;
    } catch (e) {
      return false;
    }
  }
};
