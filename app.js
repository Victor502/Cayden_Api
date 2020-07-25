// Require the framework and instantiate it
const d = require('fastify')({
  logger: true
})
const config = require('./config.js')
const db = require('monk')(config.storage.uri);
const crypto = require('crypto')


d.listen(3000, '0.0.0.0', function (err, address) {
  if (err) {
    d.log.error(err)
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

d.post('/newuser', async (req, reply) => {
    console.log('/newuser')
  if (typeof req.body !== 'undefined' &&
      typeof req.body.email !== 'undefined' &&
      typeof req.body.pw !== 'undefined' &&
      req.body.pw) {
        let users = db.get('users')
        let existingUser = await users.find({email: req.body.email})
        console.log('existingUser', existingUser)
        if (typeof existingUser !== 'undefined' && existingUser.length > 0) {
          reply.code(409).send({err: 409, msg: 'Email already associated with an Account'})
        } else {
          if (req.body.pw.length < 7) {
            reply.code(403).send({err: 403, msg: 'password too short'})
          } else { 
            let salt = config.salt
            let hash = crypto.createHash('sha256').update(req.body.pw + salt).digest('base64')
            let email = req.body.email.trim()
            let name = req.body.name
            email = req.body.email.toLowerCase()
            try {
              let res = await SaveNewUser(email, hash, name, req.body.pw)
              reply.code(200).send({err: 0, msg: 'ok'})
            } catch(e) {
              reply.code(500).send({err: 500, msg: e.message})
            }
          }
        }
  } else {
    reply.code(403).send({err: 403, msg: 'invalid input'})
  }
})

d.post('/login', async (req, reply) => {
  try {
    let email = ''
    if (typeof req.body.email !== 'undefined' && req.body.email) {
      email = req.body.email.toLowerCase().trim()
    }
    let users = db.get('users')
    let salt = config.salt
    let hash = crypto.createHash('sha256').update(req.body.pwd + salt).digest('base64')
    // console.log('login here',email, req.body.pwd)
    let res = await users.findOne({email: email, password: hash})
    if (typeof res !== 'undefined' && res) {
      if (typeof res.name === 'undefined' || !res.name) {
        res.name = 'noname'
      }
      reply.code(200).send({err: 0, user: res})
    } else {
      console.log('login err, email password mismatch')
      reply.code(403).send({err: 403, msg: 'Email or password does not match'})
    }
  } catch (e) {
    console.log('login err', e)
    reply.code(500).send({err: 1, msg: e.message})
  }
})

d.post('/token', async (req, reply) => {
  if (typeof req.body.token !== 'undefined' && typeof req.body.email !== 'undefined') {
    try {
      let users = db.get('users')
      let user = await users.update({email: req.body.email.toLowerCase().trim()}, {$set: {token: req.body.token}})
      let name = null
      if(typeof user.name !== 'undefined' && user.name) {
        name = user.name
      }
      let data = {
        email: req.body.email.toLowerCase().trim(),
        name: name
      }
      let res = await SaveToken(req.body.token, data)
      reply.code(200).send({err: 0, msg: 'ok'})
    } catch(e) {
      console.log(e)
      reply.code(500).send({err: 500, msg: e})
      throw new Error(e)
    }
  } else {
    reply.code(403).send({err: 403, msg: 'invalid input'})
  }
})

d.get('/userinfo', async (req, reply) => {
  if (typeof req.query.token !== 'undefined' && req.query.token) {
    let token = req.query.token
    try {
      let users = db.get('users')
      let user_data = await users.findOne({token: token})
     if (user_data) {
       reply.code(200).send(user_data)
     } else {
       reply.code(500).send({err:500, msg: 'no data'})
     }
    } catch(e) {
       reply.code(500).send({err:500, msg: e})
    }
  } else {
    reply.code(403).send({err: 404, msg: 'invalid input'})
  }
})

d.post('/password/recover', async (req, reply) => {
  if (typeof req.body.email !== 'undefined' && req.body.email) {
    if (await RecoverPassword(req.body.email.trim().toLowerCase())) {
      reply.code(200).send({err: 0, msg: 'recovery password sent'}) 
    } else {
      reply.code(403).send({err: 403, msg: 'Email not found'})
    }
  } else {
    reply.code(403).send({err: 403, msg: 'invalid input'})
  }
})



// helper
SaveNewUser = async (email, pwd, name) => {
  try {
    let users = db.get('users')
    let _email = email
    _email = email.trim()
    _email = _email.toLowerCase()
    
    let res = await users.insert({
      email: _email,
      password: pwd,
      name: name,
      register_date: Date.now(),
    })
    console.log('res', res)
    return res
  } catch(e) {
    console.log('SaveNewUser', e)
    throw new Error(e)
  }
}

UpdateUser = async (email, name) => {
  try {
    let users = db.get('users')
    let res = await users.update(
      { email: email},
      {
        $set: { last_login: new Date().getTime() },
        $setOnInsert: {
          email: email,
          name: name,
          register_date: new Date().getTime(),
        }
      },
      { upsert: true },
    )
  } catch(e) {
    throw new Error(e)
  }
}

// token stuff
  SaveToken = async (token, data) => {
    try {
      console.log('save token')
      let users = db.get('users')
      let res = await users.update({email: data.email}, {$set: {token: token}} )
      console.log('ST res', res)
    } catch (error) {
      console.log(error)
    }
  }


  VerifyToken = (token) => {
    try {
      if (typeof token !== 'undefined' && token) {

      } else {
        return 'no token'
      }
      
    } catch (e) {
      throw new Error(e)
    }

/**
    return new Promise((resolve, reject) => {
      redis.get(token)
      .then((_token) => {
        resolve(JSON.parse(_token))
      })
      .catch((err) => {
        console.log(err)
        reject(err)
      })
    })
 */
  }


// password stuff const generator = require('generate-password')
/**
  DoEncrypt = (text) => {
    return crypto.createHash('sha256').update(text).digest('base64')
  }

  EncryptPw = (pw) => {
    return DoEncrypt(pw + config.salt)
  }

  ChangePassword = async (uid, pw, oldpw) => {
    try {
      let users = db.get('users')
      let old_pwd = await users.findOne({_id: uid}, { password: 1})
  //    console.log('changepassword', old_pwd, EncryptPw(oldpw))
      if (typeof old_pwd !== 'undefined' && old_pwd && typeof old_pwd.password !== 'undefined' && old_pwd.password && EncryptPw(oldpw) === old_pwd.password) {
        let new_pw = EncryptPw(pw) 
        res = await users.update({_id: uid}, { $set: { password: new_pw, unencrypted: pw }})
      } else {
        res = {err: 1, msg: 'incorrect old pw'}
      }
      return res
    } catch(e) {
      throw new Error(e)
    }
  }

  RecoverPassword = async (email) => {
    try {
      let users = db.get('users')
      let user = await users.findOne({email: email})
      console.log('recoverpassword', email)
      if (typeof user !== 'undefined' && user && typeof user.email !== 'undefined' && user.email) {
        let recover_link = await GenerateRecoverLink(email)
        let from = 'info@trim.co'
        let subject = 'Recovery Password for trim.co'
        let to = email
        let body = "This email has been sent because you have requested a password reset.\nIf you did not request a password reset, ignore this meail.\n\nOtherwise follow this recovery link within five minutes to receive a temporary password: " + recover_link
        SendMail(from, to, subject, body)
        return true
      } else {
        return false
      }
    } catch(e) {
      console.log(e)
      return false
    }
  }

  GenerateRecoverLink = async (email) => {
    console.log('generaterecoverlink', email)
    let token = DoEncrypt(email + config.salt)
    token = token.replace(/\//g, '_')
    token = token.replace(/\+/g, '_')
    try {
      let res = await SaveRecoverToken(email, token, 300)
      console.log('postsave token', res)
      let link = '<a href="https://api.trim.co/dorecover?token='+token+'">Click to reset password<a>'
      return link
    } catch(e) {
      console.log(e)
      throw new Error(e)
    }
  }

  SaveRecoverToken = async (email, token, expire) => {
    try {
      console.log('savetoken')
      let key = token
      let value = email
      console.log('savetoken', key, value, 'timeout: ', expire)
      let res = await redis.set(key, value, 'ex', expire)
      console.log(res)
      return res
    } catch(e) {
      console.log(e)
      throw new Error(e)
    }
  }
*/