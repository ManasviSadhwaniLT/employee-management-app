const test = require('node:test')
const assert = require('node:assert/strict')
const request = require('supertest')
const { createApp } = require('../src/app')

let app
let close

test.before(async () => {
  const created = await createApp({ dbFile: ':memory:' })
  app = created.app
  close = created.close
})

test.after(async () => {
  await close()
})

test('creates, reads, updates, filters, and deletes employees', async () => {
  const createResponse = await request(app).post('/api/employees').send({
    name: 'Alex Doe',
    email: 'alex@example.com',
    department: 'Engineering',
    role: 'Developer',
    hireDate: '2025-01-10',
  })

  assert.equal(createResponse.status, 201)
  assert.equal(createResponse.body.name, 'Alex Doe')

  const createdId = createResponse.body.id

  const getResponse = await request(app).get(`/api/employees/${createdId}`)
  assert.equal(getResponse.status, 200)
  assert.equal(getResponse.body.email, 'alex@example.com')

  const updateResponse = await request(app).put(`/api/employees/${createdId}`).send({
    name: 'Alex Roe',
    email: 'alex.roe@example.com',
    department: 'Engineering',
    role: 'Senior Developer',
    hireDate: '2025-01-10',
  })

  assert.equal(updateResponse.status, 200)
  assert.equal(updateResponse.body.role, 'Senior Developer')

  const filteredResponse = await request(app).get('/api/employees').query({ department: 'Engineering', q: 'Alex' })
  assert.equal(filteredResponse.status, 200)
  assert.equal(filteredResponse.body.length, 1)

  const deleteResponse = await request(app).delete(`/api/employees/${createdId}`)
  assert.equal(deleteResponse.status, 204)
})

test('returns validation and conflict errors', async () => {
  const invalidResponse = await request(app).post('/api/employees').send({
    name: '',
    email: 'bad@example.com',
    department: 'HR',
    role: 'Manager',
    hireDate: 'not-a-date',
  })

  assert.equal(invalidResponse.status, 400)

  const first = await request(app).post('/api/employees').send({
    name: 'Sam',
    email: 'sam@example.com',
    department: 'HR',
    role: 'Manager',
    hireDate: '2024-05-01',
  })
  assert.equal(first.status, 201)

  const duplicate = await request(app).post('/api/employees').send({
    name: 'Another Sam',
    email: 'sam@example.com',
    department: 'HR',
    role: 'Lead',
    hireDate: '2024-05-02',
  })

  assert.equal(duplicate.status, 409)
})
