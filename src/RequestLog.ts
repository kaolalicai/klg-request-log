import {cloneDeep, last} from 'lodash'
import {ObjectID} from 'mongodb'

export interface Log {
  userId?: string
  requestId?: string
  useTime?: number
  body?: any
  url?: string
  httpMethod?: string
  interfaceName?: string
  response?: any
}

function getKoaParams (ctx, key) {
  const requestExist = ctx && ctx.request
  const fromQuery = requestExist && ctx.request.query && ctx.request.query[key]
  const fromBody = requestExist && ctx.request.body && ctx.request.body[key]
  // 依赖 koa-router
  const fromUrl = ctx && ctx.params && ctx.params[key]
  return fromQuery || fromBody || fromUrl
}

function getRequestId (ctx) {
  return getKoaParams(ctx, 'requestId') || new ObjectID().toString() || 'none'
}

function getUserId (ctx) {
  return getKoaParams(ctx, 'userId') || getKoaParams(ctx, 'ud') || getKoaParams(ctx, 'uid') || 'none'
}

export function log (handle: Function) {
  return async (ctx, next) => {
    let response = null
    const time = Date.now()
    const requestId = getRequestId(ctx)
    const userId = getUserId(ctx)
    try {
      await next()
    } catch (err) {
      response = {err: err.message, stack: err.stack}
      throw err
    } finally {
      response = response || ctx.body
      const body = cloneDeep(ctx.request.body)
      const log: Log = {
        userId: userId,
        requestId: requestId,
        httpMethod: ctx.req.method,
        useTime: Date.now() - time,
        body: body,
        url: ctx.url,
        interfaceName: last(ctx.url.split('?')[0].split('/')),
        response
      }
      handle(log)
    }
  }
}
