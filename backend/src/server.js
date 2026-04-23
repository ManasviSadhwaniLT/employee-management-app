const { createApp } = require('./app')

const port = Number(process.env.PORT || 3001)

createApp()
  .then(({ app }) => {
    app.listen(port, () => {
      console.log(`Employee API listening on port ${port}`)
    })
  })
  .catch((error) => {
    console.error('Failed to start server', error)
    process.exit(1)
  })
