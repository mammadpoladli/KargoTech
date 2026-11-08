# 📦 KargoTech - Logistics Management & Dynamic Route Optimization Platform

A modern, full-stack logistics and vehicle routing management system. KargoTech automates delivery requests, optimizes multi-vehicle distribution routes using greedy heuristics and real road network data, and provides real-time geospatial tracking and operational analytics.

---

## 🌟 Key Features

### 🚚 Smart Route Planning & Optimization
- **Capacity-Constrained Routing:** Automatically groups delivery requests by destination and assigns cargo across fixed fleet vehicles (Trucks, Vans) and on-demand rented vehicles based on weight capacities.
- **Real-World Road Routing (OSRM):** Utilizes OpenStreetMap Routing Machine (OSRM) to calculate authentic driving distances, road geometries, and delivery paths.
- **Flexible Optimization Modes:**
  - *Unlimited Mode:* Automatically deploys rented vehicles when internal fleet capacity is exceeded.
  - *Limited Mode:* Strictly utilizes the available company fleet and flags unassigned cargo.
- **Dynamic Cost Calculation:** Calculates operational expenses considering vehicle rental base fees and per-kilometer fuel/distance rates.

### 🗺️ Interactive Geospatial Interface
- **Interactive Map Visualization:** Built with Leaflet, visualizing pickup/drop-off stations, depot centers, and vehicle itineraries with distinct route color-coding and directional paths.
- **Station Coordinates Picker:** Manage logistics hubs with point-and-click coordinate selection directly from the map.
- **Route Highlighting & Multi-Cargo Tracing:** View specific vehicle itineraries or inspect aggregated multi-order paths.

### 📊 Analytics & Reporting Dashboard
- **District Load Distribution:** Weight and volume distribution charts per region.
- **Fleet Efficiency & Cost Analysis:** Multi-axis bar charts tracking distance, expenditure, and cargo payload breakdown per trip.
- **Comprehensive Delivery Logs:** Searchable, filterable audit history of all pending and delivered consignments.

### 👥 Role-Based Portals
- **Customer Portal:** Submit cargo requests with specified quantities, weights, and scheduled dates; track shipment status (Pending / In Transit) with individual map links.
- **Admin Portal:** Centralized dispatch dashboard for route execution, fleet configuration, station management, and financial parameter tuning.

---

## 🛠️ Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 19, Vite, React-Leaflet, Leaflet, Recharts, React Router v7, React Hot Toast, Axios |
| **Backend** | Node.js, Express.js, PostgreSQL (`pg`), Bcrypt.js, CORS, Dotenv |
| **Routing & GIS** | Project OSRM (Open Source Routing Machine), CartoDB Tiles |

---

## 📂 Project Architecture

```text
├── client/                 # React frontend application (Vite)
│   ├── public/             # Static assets
│   ├── src/
│   │   ├── components/     # Admin, Customer, Map, Table, and Chart components
│   │   ├── App.jsx         # Application routing & layout
│   │   └── main.jsx        # React entry point
│   └── package.json
├── server/                 # Express REST API backend
│   ├── db.js               # PostgreSQL connection pool configuration
│   ├── schema.sql          # Database schema and seed data
│   ├── server.js           # API controllers and routing algorithms
│   ├── .env.example        # Environment variables template
│   └── package.json
├── .gitignore              # Git ignore rules
└── README.md               # Project documentation
```

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v18.0 or later)
- [PostgreSQL](https://www.postgresql.org/) (v14.0 or later)
- `npm` or `yarn`

---

### Installation & Setup

#### 1. Clone the Repository
```bash
git clone https://github.com/YOUR_USERNAME/YOUR_REPOSITORY.git
cd YOUR_REPOSITORY
```

#### 2. Database Initialization
Create a PostgreSQL database named `kargo_isletme` and run the initialization script:
```bash
# Using psql command line:
psql -U postgres -c "CREATE DATABASE kargo_isletme;"
psql -U postgres -d kargo_isletme -f server/schema.sql
```

#### 3. Backend Setup
Navigate to the `server` directory, install dependencies, and configure environment variables:
```bash
cd server
npm install

# Copy the environment template
cp .env.example .env
```

Open `.env` and configure your PostgreSQL database credentials:
```env
DB_USER=postgres
DB_HOST=localhost
DB_NAME=kargo_isletme
DB_PASSWORD=your_postgres_password
DB_PORT=5432
PORT=3001
```

Start the backend server:
```bash
npm start
# The server will run on http://localhost:3001
```

#### 4. Frontend Setup
In a new terminal window, navigate to the `client` directory and start the Vite development server:
```bash
cd client
npm install
npm run dev
# The client will run on http://localhost:5173
```

---

## 🔐 Default Access Accounts

The database seed comes pre-configured with the following test credentials:

| Role | Username | Password   | Notes |
|---|----------|------------|---|
| **Admin** | `admin`  | `admin123` | Full access to dispatching, fleet, and analytics |
| **Customer** | `test`   | `test123`  | Access to order placement and tracking |

*(New customer accounts can also be created via the registration page).*

---

## 📜 License
This project is open source and available under the [MIT License](LICENSE).
