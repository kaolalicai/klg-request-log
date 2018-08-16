import * as Koa from 'koa'
import * as supertest from 'supertest'
import * as bodyParser from 'koa-bodyparser'
import * as Router from 'koa-router'
import {RequestLog} from './RequestLog'

const app = new Koa()
const router = new Router()

// 注意 bodyParse 一定要在前面
app.use(bodyParser())

const spy = jest.fn()
const logMiddleware = RequestLog.getInstance().getMiddleware({
  requestFilter: function (ctx) {
    return false
  },
  interceptor: function (ctx, log) {
    spy()
    return log
  }
})

const mongoUrl = 'mongodb://joda/test'

const crud = RequestLog.getInstance().registerMongoReporter({mongoUrl: mongoUrl})

app.use(logMiddleware)

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
    const query = {a: 1, b: 3, c: 'sssss'}
    await request.get('/api/v1/hello').query(query).expect({msg: 'hello world'})
    const logObj = await crud.model.findOne()
    await crud.model.remove({})
    console.log('logObj', logObj)
    expect(spy).toBeCalled()
    expect(logObj).toBeDefined()
    expect(logObj.userId).toEqual('none')
    expect(logObj.url).toEqual('/api/v1/hello?a=1&b=3&c=sssss')
    expect(logObj.interfaceName).toEqual('hello')
    expect(logObj.httpMethod).toEqual('GET')
    expect(logObj.body).toBeUndefined()
    expect(logObj.response).toEqual({msg: 'hello world'})
  })

  it(' test post request ', async () => {
    const body = {b: 3, c: 'sssss'}
    await request.post('/api/v1/hello').send(body).expect({msg: 'hello world'})
    const logObj = await crud.model.findOne()
    await crud.model.remove({})
    expect(logObj)
    expect(logObj.userId).toEqual('none')
    expect(logObj.url).toEqual('/api/v1/hello')
    expect(logObj.interfaceName).toEqual('hello')
    expect(logObj.httpMethod).toEqual('POST')
    expect(logObj.body).toEqual(body)
    expect(logObj.response).toEqual({msg: 'hello world'})
  })

  it(' test url parameters ', async () => {
    // TODO
  })

  it(' test error ', async () => {
    const body = {requestId: '123123123123123', b: 3, c: 'sssss'}
    await request.post('/error').send(body)
    const logObj = await crud.model.findOne()
    await crud.model.remove({})
    expect(logObj)
    expect(logObj.userId).toEqual('none')
    expect(logObj.url).toEqual('/error')
    expect(logObj.interfaceName).toEqual('error')
    expect(logObj.httpMethod).toEqual('POST')
    expect(logObj.body).toEqual(body)
    expect(logObj.response).toEqual({code: 101, msg: '内部错误'})
  })

  afterAll((done) => {
    server.close(done)
  })
})
