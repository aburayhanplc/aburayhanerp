# AbuRayhan Export ERP System

A production-ready Enterprise Resource Planning (ERP) system designed for the logistics and financial management of AbuRayhan (Ethiopia) and Tamaam (USA).

## 🚀 Key Features
- **Master Vessel Tracking:** Precise weight allocation for partners and clients.
- **Dynamic Costing:** Proportional distribution of Driver, Store, Freight, and Postal costs.
- **Profit Distribution:** Automatic calculation of the 50/50 profit split for primary partners.
- **Enterprise Reporting:** Proportional cost reconciliation reports in PDF format.

## 🏗 System Architecture

### 1. Database (Neon PostgreSQL)
- **Table:** `erp_state`
- **Logic:** Single-row atomic state storage using JSONB for maximum flexibility and performance.
- **Schema:**
  ```sql
  CREATE TABLE erp_state (
    id TEXT PRIMARY KEY,
    data JSONB NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
  ```

### 2. Profit Logic
- **Partner Split:** Total Client Revenue minus Client Expenses, divided by 2.
- **Precision:** All values are rounded to 2 decimal places to ensure accounting accuracy.

---

## 🛠 Step-by-Step Deployment Guide

### Step 1: Push Code to GitHub
1. Create a repository on GitHub.
2. Commit and push all files to the `main` branch.

### Step 2: Database Setup (Neon.tech)
1. Sign up at [Neon.tech](https://neon.tech/).
2. Create a project and database.
3. Copy the **Connection String** (e.g., `postgresql://user:pass@ep-cool-name.aws.neon.tech/neondb`).

### Step 3: Netlify Hosting
1. Import your GitHub repo into [Netlify](https://netlify.com/).
2. Go to **Site Settings > Environment Variables**.
3. Create a variable named `DATABASE_URL` and paste the Neon string.
4. The backend function in `netlify/functions/api.ts` will automatically initialize your tables.

### Step 4: Access Your Site
Visit your Netlify URL. The sidebar will indicate a **"Live Connection"** (Green dot) once the database is successfully linked.

---

## 📅 Future Maintenance
- **Local Backup:** Data is mirrored in Browser LocalStorage.
- **Performance:** Neon's HTTP driver handles high-frequency writes during batch arrivals effortlessly.

**AbuRayhan Export Logistics Excellence.**
