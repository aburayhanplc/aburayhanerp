
# AbuRayhan Export ERP - Deployment & Integration Guide

This ERP system is built for production environments with a focus on **Offline-First Resilience** and **Cloud PostgreSQL Synchronization**. To make the app live and functional, follow these steps.

## 📦 1. Database Setup (Neon PostgreSQL)

The system uses Neon for serverless PostgreSQL.

1.  **Sign Up:** Go to [Neon.tech](https://neon.tech/) and create a free account.
2.  **Create Project:** Create a new project (e.g., `aburayhan-erp`).
3.  **Get Connection String:** Copy your **Database Connection String** (HTTP variant). It looks like this:
    `postgresql://[USER]:[PASSWORD]@[HOST]/neondb?sslmode=require`

## 🚀 2. Netlify Deployment

Netlify hosts the frontend and the bridge functions.

1.  **Connect Repo:** Link your GitHub repository to Netlify.
2.  **Environment Variables:** 
    - Go to **Site Settings > Environment Variables**.
    - Add a new variable: `DATABASE_URL`.
    - Paste your Neon connection string as the value.
3.  **Deploy Site:** Trigger a production deploy. Netlify will automatically detect the serverless functions in `netlify/functions/api.ts`.

## 🛠 3. Technical Verification

Once deployed, access your URL and check the following:

- **Connection Status:** Look at the sidebar (Desktop) or Header (Mobile). A **Green Dot** (🟢 Live) means the app has successfully communicated with Neon and initialized the `erp_state` table.
- **Data Persistence:** Try adding a Shipment. If you refresh the page or lose internet, the data remains in `localStorage` and attempts to sync to the cloud automatically in the background.

## ⚖️ 4. Calculation Logic Reference

- **Shared Costs:** (Driver Total + Store Total) / Total Batch Weight = Rate per KG.
- **Net Profit:** (Client Weight * Service Fee) - (Client Share of Driver/Store + Postal Costs).
- **Partner Split:** The primary partners split the **Net Profit** 50/50.

---
**Logistics Excellence for AbuRayhan Export.**
