import * as Koa from 'koa'
import * as supertest from 'supertest'
import * as bodyParser from 'koa-bodyparser'
import * as Router from 'koa-router'
import {log} from './RequestLog'
import {ObjectID} from 'mongodb'

let logObj = null

const app = new Koa()
const router = new Router()

// 注意 bodyParse 一定要在前面
app.use(bodyParser())

app.use(log(function (log) {
  // TODO save log to DB
  logObj = log
  console.log('log', log)
}))

// 处理内部错误
app.use(async function (ctx, next) {
  try {
    await next()
  } catch (error) {
    ctx.status = 200
    ctx.body = {
      code: 101,
      msg: error.message
    }
    return
  }
})

router.post('/error', async (ctx, next) => {
  throw new Error('内部错误')
})

router.all('/api/v1/hello', async (ctx, next) => {
  ctx.body = {msg: 'hello world'}
  await next()
})

app
  .use(router.routes())
  .use(router.allowedMethods())

const server = app.listen(3008)
const request = supertest.agent(server)

describe('requestLog test', async function () {

  it(' test get request ', async () => {
    logObj = undefined
    const query = {a: 1, b: 3, c: 'sssss'}
    await request.get('/api/v1/hello').query(query).expect({msg: 'hello world'})
    expect(logObj)
    expect(logObj.userId).toEqual('none')
    expect(ObjectID.isValid(logObj.requestId))
    expect(logObj.url).toEqual('/api/v1/hello?a=1&b=3&c=sssss')
    expect(logObj.interfaceName).toEqual('hello')
    expect(logObj.body).toEqual({})
    expect(logObj.response).toEqual({msg: 'hello world'})
  })

  it(' test post request ', async () => {
    const requestId = new ObjectID().toString()
    const body = {requestId: requestId, b: 3, c: 'sssss'}
    await request.post('/api/v1/hello').send(body).expect({msg: 'hello world'})
    expect(logObj)
    expect(logObj.userId).toEqual('none')
    expect(logObj.requestId).toEqual(requestId)
    expect(logObj.url).toEqual('/api/v1/hello')
    expect(logObj.interfaceName).toEqual('hello')
    expect(logObj.body).toEqual(body)
    expect(logObj.response).toEqual({msg: 'hello world'})
  })

  it(' test url parameters ', async () => {
    // TODO
  })

  it(' test error ', async () => {
    const body = {requestId: '123123123123123', b: 3, c: 'sssss'}
    await request.post('/error').send(body)
    expect(logObj)
    expect(logObj.userId).toEqual('none')
    expect(logObj.requestId).toEqual('123123123123123')
    expect(logObj.url).toEqual('/error')
    expect(logObj.interfaceName).toEqual('error')
    expect(logObj.body).toEqual(body)
    expect(logObj.response).toEqual({code: 101, msg: '内部错误'})
  })

  afterAll((done) => {
    server.close(done)
  })
})
