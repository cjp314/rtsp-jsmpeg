const log4js = require('log4js'),
  path = require('path');

log4js.configure({
  appenders: {
    stdout: {
      //控制台输出
      type: 'console'
    },
    trace: {
      type: 'dateFile',
      filename: 'logs/tracelog/',
      pattern: 'trace-yyyy-MM-dd.log',
      alwaysIncludePattern: true
    },
    debug: {
      type: 'dateFile',
      filename: 'logs/debuglog/',
      pattern: 'debug-yyyy-MM-dd.log',
      alwaysIncludePattern: true
    },
    info: {
      type: 'dateFile',
      filename: 'logs/infolog/',
      pattern: 'info-yyyy-MM-dd.log',
      alwaysIncludePattern: true
    },
    warn: {
      type: 'dateFile',
      filename: 'logs/warnlog/',
      pattern: 'warn-yyyy-MM-dd.log',
      alwaysIncludePattern: true
    },
    error: {
      type: 'dateFile',
      filename: 'logs/errorlog/',
      pattern: 'error-yyyy-MM-dd.log',
      alwaysIncludePattern: true
    },
    fatal: {
      type: 'dateFile',
      filename: 'logs/fatallog/',
      pattern: 'fatal-yyyy-MM-dd.log',
      alwaysIncludePattern: true
    }
  },
  categories: {
    trace: { appenders: ['stdout', 'trace'], level: 'trace' },
    debug: { appenders: ['stdout', 'debug'], level: 'debug' },
    default: { appenders: ['stdout', 'info'], level: 'info' },
    warn: { appenders: ['stdout', 'warn'], level: 'warn' },
    error: { appenders: ['stdout', 'error'], level: 'error' },
    fatal: { appenders: ['stdout', 'fatal'], level: 'fatal' }
  },
  pm2: true
});

//name取categories项
exports.getLogger = function(name) {
  return log4js.getLogger(name || 'info');
};
const loggerInfo = log4js.getLogger('info'),
  loggerWarn = log4js.getLogger('warn');

exports.info = function(message, ...args){
    if(args.length >0){
        loggerInfo.info(message,args);
    }else{
        loggerInfo.info(message);
    }
    
};


exports.warn = function(message, ...args){
    if(args.length >0){
        loggerWarn.warn(message,args);
    }else{
        loggerWarn.warn(message);
    }
    
};

//用来与express结合
exports.useLogger = function(app, logger) {
  app.use(
    log4js.connectLogger(logger || log4js.getLogger('info'), {
      format:
        '[:remote-addr :method :url :status :response-timems][:referrer HTTP/:http-version :user-agent]' //自定义输出格式
    })
  );
};
