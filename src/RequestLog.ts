import {Log} from './RequestLog'
import * as moment from 'moment'
import {cloneDeep, last} from 'lodash'
import {EventEmitter} from 'events'
import {LogCRUD, MongoReport} from './MongoReport'
import {logger} from './Logger'

const EVENT_KEY = 'KLG_REQUEST_LOG'

export interface Log {
  userId?: string
  requestId?: string
  useTime?: number
  body?: any
  type: string
  url?: string
  httpMethod?: string
  interfaceName?: string
  response?: any
}

export interface MongoReportOption {
  mongoUrl: string,
  collectionName?: string
}

function getKoaParams (ctx, key) {
  const requestExist = ctx && ctx.request
  const fromQuery = requestExist && ctx.request.query && ctx.request.query[key]
  const fromBody = requestExist && ctx.request.body && ctx.request.body[key]
  // 依赖 koa-router
  const fromUrl = ctx && ctx.params && ctx.params[key]
  return fromQuery || fromBody || fromUrl
}

function getUserId (ctx) {
  return getKoaParams(ctx, 'userId') || getKoaParams(ctx, 'ud') || getKoaParams(ctx, 'uid') || 'none'
}

export interface LogOptions {
  requestFilter?: (req) => boolean,  // 过滤器
  interceptor?: (ctx, log: Log) => Log       // 中间件
}

const defaultOptions = {
  requestFilter: function (ctx) {
    return ctx.method !== 'POST'
  },
  interceptor: null
}

export class RequestLog extends EventEmitter {

  static instance: RequestLog

  static getInstance () {
    if (!this.instance) {
      this.instance = new RequestLog()
    }
    return this.instance
  }

  getMiddleware (options: LogOptions = defaultOptions) {
    const that = this
    return async function (ctx, next) {
      let response = null
      const time = Date.now()
      const userId = getUserId(ctx)
      if (options.requestFilter && options.requestFilter(ctx)) return await next()
      try {
        await next()
      } catch (err) {
        response = {err: err.message, stack: err.stack}
        throw err
      } finally {
        response = response || ctx.body
        const body = cloneDeep(ctx.request.body)
        let log: Log = {
          userId: userId,
          httpMethod: ctx.req.method,
          useTime: Date.now() - time,
          type: 'in',
          body: body,
          url: ctx.url,
          interfaceName: last(ctx.url.split('?')[0].split('/')),
          response
        }
        if (options.interceptor) {
          log = options.interceptor(ctx, log)
        }
        that.emit(EVENT_KEY, log)
      }
    }
  }

  registerMongoReporter (options: MongoReportOption): LogCRUD {
    options.collectionName = options.collectionName || 'tracer'
    const mongo = new MongoReport(options)
    this.on(EVENT_KEY, (tracer: any) => {
      mongo.report(tracer).then(result => {
        // empty
      }).catch(err => {
        logger.err('save mongo report err', err)
      })
    })
    return mongo.crud
  }
}
