# employee-management-app

Employee Management System using Node.js + Express + SQLite with a React frontend.

## Backend

```bash
cd backend
npm install
npm start
```

Runs the REST API at `http://localhost:3001`.

## Frontend

```bash
cd frontend
npm install
npm run dev
```

Runs the UI at `http://localhost:5173` and proxies API requests to the backend.

## Features

- CRUD operations for employee records
- Employee fields: ID, Name, Email, Department, Role, Hire Date
- Search and filtering by department
- RESTful API design with basic error handling
