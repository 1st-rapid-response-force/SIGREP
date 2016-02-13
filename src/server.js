var manager = require('./managers/Server'),
    winston = require('winston')

manager.start()

process.on('SIGINT', function() {
    winston.info('SIGINT received - performing graceful shutdown')

    manager.close()
    process.exit(0)
})