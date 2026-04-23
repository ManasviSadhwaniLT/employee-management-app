import { useCallback, useEffect, useMemo, useState } from 'react'
import './App.css'

const emptyForm = {
  name: '',
  email: '',
  department: '',
  role: '',
  hireDate: '',
}

function App() {
  const [employees, setEmployees] = useState([])
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState(null)
  const [departmentFilter, setDepartmentFilter] = useState('')
  const [search, setSearch] = useState('')
  const [statusMessage, setStatusMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')

  const departments = useMemo(
    () => [...new Set(employees.map((employee) => employee.department))].sort((a, b) => a.localeCompare(b)),
    [employees],
  )

  const loadEmployees = useCallback(async () => {
    const params = new URLSearchParams()
    if (departmentFilter) {
      params.set('department', departmentFilter)
    }
    if (search.trim()) {
      params.set('q', search.trim())
    }

    const endpoint = params.size ? `/api/employees?${params.toString()}` : '/api/employees'
    const response = await fetch(endpoint)
    if (!response.ok) {
      throw new Error('Unable to fetch employees')
    }
    setEmployees(await response.json())
  }, [departmentFilter, search])

  useEffect(() => {
    loadEmployees().catch((error) => {
      setErrorMessage(error.message)
    })
  }, [loadEmployees])

  function resetForm() {
    setForm(emptyForm)
    setEditingId(null)
  }

  function onInputChange(event) {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
  }

  async function onSubmit(event) {
    event.preventDefault()
    setErrorMessage('')
    setStatusMessage('')

    const endpoint = editingId ? `/api/employees/${editingId}` : '/api/employees'
    const method = editingId ? 'PUT' : 'POST'

    const response = await fetch(endpoint, {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(form),
    })

    if (!response.ok) {
      const payload = await response.json().catch(() => ({ message: 'Request failed' }))
      throw new Error(payload.message || 'Request failed')
    }

    setStatusMessage(editingId ? 'Employee updated' : 'Employee created')
    resetForm()
    await loadEmployees()
  }

  async function onDelete(id) {
    setErrorMessage('')
    setStatusMessage('')

    const response = await fetch(`/api/employees/${id}`, { method: 'DELETE' })
    if (!response.ok) {
      const payload = await response.json().catch(() => ({ message: 'Delete failed' }))
      throw new Error(payload.message || 'Delete failed')
    }

    if (editingId === id) {
      resetForm()
    }

    setStatusMessage('Employee deleted')
    await loadEmployees()
  }

  function onEdit(employee) {
    setEditingId(employee.id)
    setForm({
      name: employee.name,
      email: employee.email,
      department: employee.department,
      role: employee.role,
      hireDate: employee.hireDate,
    })
    setStatusMessage('')
    setErrorMessage('')
  }

  return (
    <main className="container">
      <h1>Employee Management System</h1>

      <section className="panel">
        <h2>{editingId ? `Edit Employee #${editingId}` : 'Add Employee'}</h2>
        <form
          className="grid"
          onSubmit={(event) => {
            onSubmit(event).catch((error) => setErrorMessage(error.message))
          }}
        >
          <label>
            Name
            <input name="name" value={form.name} onChange={onInputChange} required />
          </label>
          <label>
            Email
            <input name="email" type="email" value={form.email} onChange={onInputChange} required />
          </label>
          <label>
            Department
            <input name="department" value={form.department} onChange={onInputChange} required />
          </label>
          <label>
            Role
            <input name="role" value={form.role} onChange={onInputChange} required />
          </label>
          <label>
            Hire Date
            <input name="hireDate" type="date" value={form.hireDate} onChange={onInputChange} required />
          </label>
          <div className="actions">
            <button type="submit">{editingId ? 'Update Employee' : 'Create Employee'}</button>
            {editingId ? (
              <button type="button" onClick={resetForm} className="secondary">
                Cancel
              </button>
            ) : null}
          </div>
        </form>
      </section>

      <section className="panel">
        <h2>Employees</h2>
        <div className="filters">
          <label>
            Search
            <input
              placeholder="Name, email, or role"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
          <label>
            Department
            <select value={departmentFilter} onChange={(event) => setDepartmentFilter(event.target.value)}>
              <option value="">All Departments</option>
              {departments.map((department) => (
                <option key={department} value={department}>
                  {department}
                </option>
              ))}
            </select>
          </label>
        </div>

        {statusMessage ? <p className="status">{statusMessage}</p> : null}
        {errorMessage ? <p className="error">{errorMessage}</p> : null}

        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Email</th>
              <th>Department</th>
              <th>Role</th>
              <th>Hire Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {employees.length === 0 ? (
              <tr>
                <td colSpan="7" className="empty">
                  No employees found
                </td>
              </tr>
            ) : (
              employees.map((employee) => (
                <tr key={employee.id}>
                  <td>{employee.id}</td>
                  <td>{employee.name}</td>
                  <td>{employee.email}</td>
                  <td>{employee.department}</td>
                  <td>{employee.role}</td>
                  <td>{employee.hireDate}</td>
                  <td className="actions">
                    <button type="button" onClick={() => onEdit(employee)} className="secondary">
                      Edit
                    </button>
                    <button
                      type="button"
                      className="danger"
                      onClick={() => {
                        onDelete(employee.id).catch((error) => setErrorMessage(error.message))
                      }}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>
    </main>
  )
}

export default App
