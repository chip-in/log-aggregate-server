'use strict';
import express from 'express';
import bodyParser from 'body-parser';
import zlib from 'zlib';
import csv from 'csv';
import pg from 'pg';
import async from 'async';
import { Logger } from '@chip-in/logger';
import MESSAGES from './messages';

const port = process.env.APP_PORT || process.env.PORT;
const version = process.env.npm_package_version;
const appFQDN = `${version}.LogAggregateServer.chip-in.net`;
const app = express();
app.use(bodyParser.json());
app.use(express.static('public'));

// Logger Configuration
if (process.env.LOGGER_LOGLEVEL) {
  Logger.setLogLevel(process.env.LOGGER_LOGLEVEL);
}
if (process.env.LOGGER_MAX_STRING_LENGTH) {
  Logger.setMaxStringLength(process.env.LOGGER_MAX_STRING_LENGTH);
}
const logger = Logger.getLogger(appFQDN);

// Log Database Configuration
const clientConfig = {
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
//password: process.env.DB_PASSWORD, // TODO: "password.secure": <Base64 encode string>
  port: process.env.DB_PORT
}

app.listen(port, () => {
  logger.trace(MESSAGES.START_LISTEN.code, MESSAGES.START_LISTEN.msg, [port.toString()]);
});

// Allows CORS
app.use(function(req, res, next) {
  res.header('Access-Control-Allow-Origin', req.headers.origin);
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  next();
});

app.options('*', (req, res) => {
  res.sendStatus(200);
});

/**
 * @desc Message storing API. Accepts registration of message data on CoreNode, and registeres the data in the database.
 */
app.post('/l/messages', (req, res) => {
  logger.trace(MESSAGES.START_POST.code, MESSAGES.START_POST.msg, ['/l/messages']);
  const bodyJson = JSON.stringify(req.body);
  const bodyObject = JSON.parse(bodyJson);
  const sql = "INSERT INTO messages VALUES ($1, $2, $3, $4) ON CONFLICT ON CONSTRAINT messages_pkey DO UPDATE SET message = $4";
  const values = [bodyObject['FQDN'], bodyObject['code'], bodyObject['language'], bodyObject['message']];
  
  const client = new pg.Client(clientConfig)
  client.connect()
  .then(() => {
    logger.trace(MESSAGES.CONNECTED.code, MESSAGES.CONNECTED.msg, ['messages']);
    client.query(sql, values)
    .then((result) => {
      logger.trace(MESSAGES.SUCCESS_REGISTER.code, MESSAGES.SUCCESS_REGISTER.msg, ['messages'], [result.rowCount]);
      return res.json({retCode: 0, detail: "Success"});
    })
    .catch(e => {
      logger.debug(MESSAGES.FAILURE_REGISTER.code, MESSAGES.FAILURE_REGISTER.msg, ['messages', e.toString()]);
      return res.json({retCode: e.code || 9, detail: e});
    })
    client.on('drain', function() {
      client.end(function() {
        logger.trace(MESSAGES.END_PGCLIENT.code, MESSAGES.END_PGCLIENT.msg, ['messages']);
      });
    });    
  })
  .catch(e => {
    logger.debug(MESSAGES.FAILURE_CONNECT.code, MESSAGES.FAILURE_CONNECT.msg, ['messages', e.stack.toString()]);
    return res.json({retCode: e.code || 9, detail: e});
  })
});

/**
 * @desc Session storing API. Accepts registration of session data on CoreNode, and registeres the data in the database.
 */
app.post('/l/sessions', (req, res, next) => {
  logger.trace(MESSAGES.START_POST.code, MESSAGES.START_POST.msg, ['/l/sessions']);
  const bodyJson = JSON.stringify(req.body);
  const bodyObject = JSON.parse(bodyJson);
  
  const now = new Date();
  const registeredTime = now.toISOString();
  const startTime = new Date(bodyObject['startTime']);
  const timeOffset = now.getTime() - startTime.getTime();
  let remoteAddress = req.headers['x-forwarded-for'] || req.connection.remoteAddress || null;
  if (remoteAddress.match(/^::ffff:/i, 0)) {
     remoteAddress = remoteAddress.substr("::ffff:".length);
  }
  const remotePort = req.headers['x-forwarded-port'] || req.connection.remotePort || null;
  
  const sql = `INSERT INTO sessions VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
              ON CONFLICT ON CONSTRAINT sessions_pkey
              DO UPDATE SET start_time = $2, node_class = $3, node_name = $4, uid = $5, org = $6, dev = $7, ua = $8, registered_time=$9, time_offset=$10, remote_address=$11, remote_port=$12`;
  const values = [bodyObject['sessionId'], bodyObject['startTime'], bodyObject['nodeClass'], bodyObject['nodeName'],
                 bodyObject['uid'], bodyObject['org'], bodyObject['dev'], bodyObject['ua'], registeredTime, timeOffset, remoteAddress, remotePort];
  
  const client = new pg.Client(clientConfig)
  client.connect()
  .then(() => {
    logger.trace(MESSAGES.CONNECTED.code, MESSAGES.CONNECTED.msg, ['sessions']);
    client.query(sql, values)
    .then((result) => {
      logger.trace(MESSAGES.SUCCESS_REGISTER.code, MESSAGES.SUCCESS_REGISTER.msg, ['sessions'], [result.rowCount]);
      return res.json({retCode: 0, detail: "Success"});
    })
    .catch(e => {
      logger.debug(MESSAGES.FAILURE_REGISTER.code, MESSAGES.FAILURE_REGISTER.msg, ['sessions', e.toString()]);
      return res.json({retCode: e.code || 9, detail: e});
    })
    client.on('drain', function() {
      client.end(function() {
        logger.trace(MESSAGES.END_PGCLIENT.code, MESSAGES.END_PGCLIENT.msg, ['sessions']);
      });
    });    
  })
  .catch(e => {
    logger.debug(MESSAGES.FAILURE_CONNECT.code, MESSAGES.FAILURE_CONNECT.msg, ['sessions', e.stack.toString()]);
    return res.json({retCode: e.code || 9, detail: e});
  })
});

/**
 * @desc Log storing API. Accepts registration of log data on CoreNode, and registeres the data in the database.
 */
app.post('/l/logs', (req, res) => {
  logger.trace(MESSAGES.START_POST.code, MESSAGES.START_POST.msg, ['/l/logs']);
  const bodyJson = JSON.stringify(req.body);
  const bodyObject = JSON.parse(bodyJson);

  decodeCsvLog(bodyObject['csvLog'])
  .then((logObject)=>{
    const client = new pg.Client(clientConfig)
    client.connect()
    .then(() => {
      logger.trace(MESSAGES.CONNECTED.code, MESSAGES.CONNECTED.msg, ['logs']);
      const sql = "INSERT INTO logs VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)";
      async.eachSeries(logObject, function(log, next) {
        const values = [bodyObject['sessionId']].concat(setLogParam(log));
        client.query(sql, values)
        .then(result => {
          logger.trace(MESSAGES.SUCCESS_REGISTER.code, MESSAGES.SUCCESS_REGISTER.msg, ['logs'], [result.rowCount]);
        })
        .catch(e => {
          logger.debug(MESSAGES.FAILURE_REGISTER.code, MESSAGES.FAILURE_REGISTER.msg, ['logs', e.stack.toString()]);
          throw e.code;
        });
      
        next();
      }, function(err) {
        client.on('drain', function() {
          client.end(function() {
            logger.trace(MESSAGES.END_PGCLIENT.code, MESSAGES.END_PGCLIENT.msg, ['logs']);
          });
        });    
        return res.json({retCode: 0, detail: "Success"});
      });
    })
    .catch(e => {
      logger.debug(MESSAGES.FAILURE_CONNECT.code, MESSAGES.FAILURE_CONNECT.msg, ['logs', e.stack.toString()]);
      return res.json({retCode: e.code || 9, detail: e});
    })
  })
  .catch((e)=>{
    logger.debug(MESSAGES.FAILURE_DECODE.code, MESSAGES.FAILURE_DECODE.msg, [e.toString()]);
    return res.json({retCode: 9});
  });
});

process.on('unhandledRejection', console.dir);

/**
 * @desc This function uncompresses the log data of the CSV format which decoded base64 using gunzip, and returns a JSON Object.
 * @return {Promise<Object>}
 */
function decodeCsvLog(csvLog) {
  const columns = [
    'startTime',
    'mergeCount',
    'endTime',
    'FQDN',
    'code',
    'level',
    'string1',
    'string2',
    'string3',
    'string4',
    'integer1',
    'integer2',
    'integer3',
    'integer4',
    'timestamp1',
    'timestamp2',
    'timestamp3',
    'timestamp4'
  ];
  return Promise.resolve()
  .then(()=>{
    // Base64 decode
    return Buffer.from(csvLog, 'base64');
  })
  .then((outputGzip)=>{
    // Uncompress
    return new Promise((resolve, reject) => {
      zlib.gunzip(outputGzip, function (err, binary) {
        if (err != null) {
          reject(`[zlib.gunzip error] code=${err.code}, errno=${err.errno}, message=${err.message}`);
        } else {
          resolve(binary)
        }
      });
    });
  })
  .then((outputCSV)=>{
    // CSV to JSON Object
    return new Promise((resolve, reject) => {
      csv.parse(outputCSV.toString(), { columns: columns }, function(err, output){
        if (err != null) {
          reject(`[csv.parse error]${err}`);
        } else {
          resolve(output)
        }
      })
    });
  })
  .then((result)=>{
    return result;
  })
  .catch((e)=>{
    logger.debug(MESSAGES.FAILURE_CSVDECODE.code, MESSAGES.FAILURE_CSVDECODE.msg);
    throw e;
  });
}

/*
 * @desc This function changes the JSON object an array for the log table. Also, it converts invalid values to null.
 * @return {Array}
 */
function setLogParam(logObject) {
  const logTableColumns = [
    {name: 'startTime'},
    {name: 'mergeCount', type:'integer'},
    {name: 'endTime'},
    {name: 'FQDN'},
    {name: 'code', type:'integer'},
    {name: 'level', type:'integer'},
    {name: 'string1', embeddedType:'string'},
    {name: 'string2', embeddedType:'string'},
    {name: 'string3', embeddedType:'string'},
    {name: 'string4', embeddedType:'string'},
    {name: 'timestamp1', embeddedType:'timestamp'},
    {name: 'timestamp2', embeddedType:'timestamp'},
    {name: 'timestamp3', embeddedType:'timestamp'},
    {name: 'timestamp4', embeddedType:'timestamp'},
    {name: 'integer1', embeddedType:'integer'},
    {name: 'integer2', embeddedType:'integer'},
    {name: 'integer3', embeddedType:'integer'},
    {name: 'integer4', embeddedType:'integer'}
  ];
  let ret = [];
  logTableColumns.map((columnInfo) => {
    let data = logObject[columnInfo.name];
    if (columnInfo.embeddedType && columnInfo.embeddedType == 'string' && data == '__Invalid_String__') { // embeddedType=string: When embedded data is "" or null, both are registered as empty character.
      logger.warn(MESSAGES.REGISTERED_NULL_STRING.code, MESSAGES.REGISTERED_NULL_STRING.msg);
      data = null;
    } else if (columnInfo.embeddedType && columnInfo.embeddedType == 'timestamp') {
      if (data == '' || data == null) {
        data = null;
      } else if (data == 'Invalid Date') {
        logger.warn(MESSAGES.REGISTERED_NULL_DATE.code, MESSAGES.REGISTERED_NULL_DATE.msg);
        data = null;
      }
    } else if (columnInfo.embeddedType && columnInfo.embeddedType == 'integer') {
      if (data == '' || data == null) {
        data = null;
      } else if (data == -2147483648) {
        logger.warn(MESSAGES.REGISTERED_NULL_INTEGER.code, MESSAGES.REGISTERED_NULL_INTEGER.msg);
        data = null;
      } else {
        data = parseInt(data, 10);
      }
    } else if (columnInfo.type && columnInfo.type == 'integer') {
      data = parseInt(data, 10);
    }
    ret.push(data);
  });
  return ret;
}  
