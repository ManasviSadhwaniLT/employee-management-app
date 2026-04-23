const express = require('express')
const cors = require('cors')
const sqlite3 = require('sqlite3').verbose()
const path = require('path')
const fs = require('fs')

function createDb(dbFile) {
  if (dbFile !== ':memory:') {
    fs.mkdirSync(path.dirname(dbFile), { recursive: true })
  }
  return new sqlite3.Database(dbFile)
}

function run(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function onRun(error) {
      if (error) {
        reject(error)
        return
      }
      resolve({ lastID: this.lastID, changes: this.changes })
    })
  })
}

function get(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (error, row) => {
      if (error) {
        reject(error)
        return
      }
      resolve(row)
    })
  })
}

function all(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (error, rows) => {
      if (error) {
        reject(error)
        return
      }
      resolve(rows)
    })
  })
}

function closeDatabase(db) {
  return new Promise((resolve, reject) => {
    db.close((error) => {
      if (error) {
        reject(error)
        return
      }
      resolve()
    })
  })
}

function normalizeEmployeePayload(payload) {
  return {
    name: payload?.name?.trim(),
    email: payload?.email?.trim(),
    department: payload?.department?.trim(),
    role: payload?.role?.trim(),
    hireDate: payload?.hireDate?.trim(),
  }
}

function validateEmployeePayload(employee) {
  const missingField = Object.entries(employee).find(([, value]) => !value)
  if (missingField) {
    return `${missingField[0]} is required`
  }
  const parsedDate = Date.parse(employee.hireDate)
  if (Number.isNaN(parsedDate)) {
    return 'hireDate must be a valid date'
  }
  return null
}

async function createApp(options = {}) {
  const dbFile = options.dbFile || path.join(__dirname, '..', 'data', 'employees.db')
  const db = createDb(dbFile)

  await run(
    db,
    `CREATE TABLE IF NOT EXISTS employees (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      department TEXT NOT NULL,
      role TEXT NOT NULL,
      hireDate TEXT NOT NULL
    )`,
  )

  const app = express()
  app.use(cors())
  app.use(express.json())

  app.get('/health', (request, response) => {
    response.json({ status: 'ok' })
  })

  app.get('/api/employees', async (request, response, next) => {
    try {
      const { department, q } = request.query
      const filters = []
      const params = []

      if (department) {
        filters.push('department = ?')
        params.push(department)
      }

      if (q) {
        filters.push('(name LIKE ? OR email LIKE ? OR role LIKE ?)')
        const term = `%${q}%`
        params.push(term, term, term)
      }

      const whereClause = filters.length > 0 ? `WHERE ${filters.join(' AND ')}` : ''
      const employees = await all(
        db,
        `SELECT id, name, email, department, role, hireDate FROM employees ${whereClause} ORDER BY id DESC`,
        params,
      )
      response.json(employees)
    } catch (error) {
      next(error)
    }
  })

  app.get('/api/employees/:id', async (request, response, next) => {
    try {
      const employee = await get(
        db,
        'SELECT id, name, email, department, role, hireDate FROM employees WHERE id = ?',
        [request.params.id],
      )
      if (!employee) {
        response.status(404).json({ message: 'Employee not found' })
        return
      }
      response.json(employee)
    } catch (error) {
      next(error)
    }
  })

  app.post('/api/employees', async (request, response, next) => {
    try {
      const employee = normalizeEmployeePayload(request.body)
      const validationError = validateEmployeePayload(employee)
      if (validationError) {
        response.status(400).json({ message: validationError })
        return
      }

      const result = await run(
        db,
        'INSERT INTO employees (name, email, department, role, hireDate) VALUES (?, ?, ?, ?, ?)',
        [employee.name, employee.email, employee.department, employee.role, employee.hireDate],
      )

      const created = await get(
        db,
        'SELECT id, name, email, department, role, hireDate FROM employees WHERE id = ?',
        [result.lastID],
      )
      response.status(201).json(created)
    } catch (error) {
      if (error.code === 'SQLITE_CONSTRAINT') {
        response.status(409).json({ message: 'Email already exists' })
        return
      }
      next(error)
    }
  })

  app.put('/api/employees/:id', async (request, response, next) => {
    try {
      const employee = normalizeEmployeePayload(request.body)
      const validationError = validateEmployeePayload(employee)
      if (validationError) {
        response.status(400).json({ message: validationError })
        return
      }

      const result = await run(
        db,
        'UPDATE employees SET name = ?, email = ?, department = ?, role = ?, hireDate = ? WHERE id = ?',
        [employee.name, employee.email, employee.department, employee.role, employee.hireDate, request.params.id],
      )

      if (result.changes === 0) {
        response.status(404).json({ message: 'Employee not found' })
        return
      }

      const updated = await get(
        db,
        'SELECT id, name, email, department, role, hireDate FROM employees WHERE id = ?',
        [request.params.id],
      )
      response.json(updated)
    } catch (error) {
      if (error.code === 'SQLITE_CONSTRAINT') {
        response.status(409).json({ message: 'Email already exists' })
        return
      }
      next(error)
    }
  })

  app.delete('/api/employees/:id', async (request, response, next) => {
    try {
      const result = await run(db, 'DELETE FROM employees WHERE id = ?', [request.params.id])
      if (result.changes === 0) {
        response.status(404).json({ message: 'Employee not found' })
        return
      }
      response.status(204).send()
    } catch (error) {
      next(error)
    }
  })

  app.use((error, request, response, next) => {
    if (response.headersSent) {
      next(error)
      return
    }
    response.status(500).json({ message: 'Internal server error' })
  })

  return {
    app,
    close: () => closeDatabase(db),
  }
}

module.exports = {
  createApp,
}
