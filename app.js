// Require the framework and instantiate it
const d = require('fastify')({
  logger: true
})
const config = require('./config.js')
const db = require('monk')(config.storage.uri);
// const { MongoClient } = require("mongodb");
// const client = new MongoClient(config.storage.uri);
// const dbName = 'cayden';


d.listen(3000, function (err, address) {
  if (err) {
    fastify.log.error(err)
    process.exit(1)
  }
  d.log.info(`server listening on ${address}`)
})

// routes
d.get('/', function (request, reply) {
  reply.send({ hello: 'world' })
})

d.get('/test', async (req, reply) => {
    try {
        let users = db.get('user')
        let user = await users.find({name: 'victor'})
        console.log('user', user)
        reply.code(200).send({err: 0, msg: user[0].name})
    } catch (e) {
        console.log('test error', e)
        throw new Error(e)
    }
})