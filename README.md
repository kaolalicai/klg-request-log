# klg-request-log
koa log middware

## QuickStart

```
const logMiddleware = RequestLog.getInstance().getMiddleware({
  // 过滤不需要记录 log的请求
  requestFilter: function (ctx) {
    return false
  },
  // log 写入 DB 之前做一些处理
  interceptor: function (ctx, log) {
    spy()
    return log
  }
})

// 初始化 log db
const mongoUrl = 'mongodb://joda/test'
const crud = RequestLog.getInstance().registerMongoReporter({mongoUrl: mongoUrl})

// 应用中间件
app.use(logMiddleware)
```

### Test

```bash
$ npm i
$ npm test
```

