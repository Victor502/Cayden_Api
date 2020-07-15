// Require the framework and instantiate it
const d = require('fastify')({
  logger: true
})
// const config = require("./config.js")

// Run the server!
d.listen(3000, function (err, address) {
  if (err) {
    fastify.log.error(err)
    process.exit(1)
  }
  d.log.info(`server listening on ${address}`)
})

// Declare a route
d.get('/', function (request, reply) {
  reply.send({ hello: 'world' })
})

d.get('/test', (req, reply) => {
    try {
        reply.code(200).send({err: 0, msg: "yaya"})
    } catch (e) {
        console.log('test error', e)
        throw new Error(e)
    }
})