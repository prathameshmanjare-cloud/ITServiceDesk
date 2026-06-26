# IT Service Desk Automation System

A full-stack IT Service Desk Automation System built with Python FastAPI, MySQL, and React 18.

## Prerequisites

- Python 3.11+
- Node.js 18+
- MySQL 8+
- npm or yarn

## Setup Instructions

### 1. Clone and Setup Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 2. Configure Database

Create a MySQL database:

```sql
CREATE DATABASE itdesk CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

Copy `.env.example` to `.env` and update the database credentials:

```bash
cp .env.example .env
```

Edit `.env` with your MySQL connection string and other settings.

### 3. Run Database Migrations

```bash
# The app auto-creates tables on startup via SQLAlchemy
# Alternatively, run the seed script to populate sample data
python seed.py
```

### 4. Start Backend Server

```bash
uvicorn app.main:app --reload --port 8000
```

The API will be available at `http://localhost:8000`
API Documentation: `http://localhost:8000/docs`

### 5. Setup and Run Frontend

```bash
cd frontend
npm install
npm run dev
```

The frontend will be available at `http://localhost:5173`

## Default Credentials

| Role  | Email                 | Password   |
|-------|-----------------------|------------|
| Admin | admin@company.com     | Admin@123  |
| Agent | agent1@company.com    | Agent@123  |
| Agent | agent2@company.com    | Agent@123  |
| Agent | agent3@company.com    | Agent@123  |
| User  | user1@company.com     | User@123   |
| User  | user2@company.com     | User@123   |
| User  | user3@company.com     | User@123   |
| User  | user4@company.com     | User@123   |
| User  | user5@company.com     | User@123   |

## Features

- **Role-based Access Control**: Admin, Agent, and User roles with specific permissions
- **Ticket Management**: Create, view, update, and track support tickets
- **Auto-Priority Assignment**: Intelligent priority engine based on category, keywords, and complexity
- **Auto-Assignment Engine**: Automatically assigns tickets to the best-suited agent
- **SLA Management**: Automatic SLA due date calculation with breach monitoring
- **Status Tracking**: Complete status flow with timeline history
- **Comments & Internal Notes**: Collaboration with internal notes for agents
- **Email Notifications**: Automated email alerts for ticket events
- **In-App Notifications**: Real-time notification system
- **Reports Dashboard**: Comprehensive analytics with charts and KPIs
- **User Management**: Admin panel for user administration
- **File Attachments**: Drag-and-drop file upload support

## API Documentation

Once the backend is running, visit `http://localhost:8000/docs` for interactive Swagger API documentation.

## Project Structure

```
it-service-desk/
├── backend/
│   ├── app/
│   │   ├── main.py          # FastAPI application entry point
│   │   ├── config.py        # Configuration and environment variables
│   │   ├── database.py      # Database connection and session
│   │   ├── models/          # SQLAlchemy ORM models
│   │   ├── schemas/         # Pydantic schemas for validation
│   │   ├── routers/         # API route handlers
│   │   ├── services/        # Business logic services
│   │   └── utils/           # Utility functions and dependencies
│   ├── seed.py              # Database seed script
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── api/             # Axios client with interceptors
│   │   ├── components/      # Reusable UI components
│   │   ├── context/         # React context providers
│   │   ├── pages/           # Page components
│   │   └── styles/          # Global CSS and variables
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
└── README.md
```

## Tech Stack

- **Backend**: Python, FastAPI, SQLAlchemy, MySQL, JWT Authentication
- **Frontend**: React 18, Vite, React Query, Recharts, Axios
- **UI**: Lucide React Icons, Google Fonts (Roboto)
