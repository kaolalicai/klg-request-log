import * as mongoose from 'mongoose'
import * as assert from 'assert'
import {LogCRUD} from 'klg-log-model'
import {Log} from './RequestLog'

export interface MongoReportOption {
  mongoUrl: string,
  collectionName?: string
}

export {LogCRUD}

export class MongoReport {
  options: MongoReportOption
  crud: LogCRUD

  constructor (options: MongoReportOption) {
    assert(options.mongoUrl, 'mongoUrl must given')
    this.options = options
    this.initDb()
  }

  initDb () {
    const db = mongoose.createConnection(this.options.mongoUrl)
    this.crud = new LogCRUD(db, this.options.collectionName)
  }

  async report (log: Log) {
    await this.crud.save(log)
  }
}
