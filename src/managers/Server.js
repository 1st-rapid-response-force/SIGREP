/*
    Server represents the server currently connected to by SIGREP
 */

var config = {
        port: 2302,
        maxMem: 3072,
        exThreads: 7,
        config: 'server.cfg',
        modLine: 'modpack/@cba_a3;modpack/@ares;modpack/@ace;modpack/@rhs_afrf;modpack/@rhs_usaf;modpack/@1rrf_maps;modpack/@1rrf_content;modpack/@1rrf_utility',
        enableHT: true
    },
    server = null,
    headlessClient = null,
    exec = require('child_process').exec
    statusFlags = {
        initialized: false,
        running: false,
        crashed: false,
        locked: false
    },
    BattleNode = require('battle-node'),
    rcon = null,
    winston = require('winston')

var start = function() {

    winston.info('Start Server called')

    if ( server !== null ) {
        winston.info('An existing server is already running')
        return false
    }

    // Build out the arguments to the system
    var args = []

    if ( config.port !== undefined ) {
        args.push('-port=' + config.port)
    }

    if ( config.maxMem !== undefined ) {
        args.push('-maxMem=' + config.maxMem)
    }

    if ( config.exThreads !== undefined ) {
        args.push('-exThreads=' + config.exThreads)
    }

    if ( config.cpuCount !== undefined ) {
        args.push('-cpuCount=' + config.cpuCount)
    }

    if ( config.configPath !== undefined ) {
        args.push('-config=' + config.configPath)
    }

    if ( config.modLine !== undefined ) {
        args.push('-mod="' + config.modLine + '"')
    }

    if ( config.enableHT !== undefined ) {
        args.push('-enableHT')
    }

    // Convert args to a string
    var argString = ""

    args.forEach(function(arg) {
        argString = argString + " " + arg
    })

    winston.info('Server submitted for execution with command line: ' + '../arma/arma3server ' + argString)
    // Start a new ARMA 3 process as a child process
    var child = exec('./arma3server ' + argString, {
            cwd: '/home/server/arma'
        },
        function(error, stdout, stderr) {
            if (error !== null) {
                console.log(error)
            }
        })

    // Subscribe to the created ChildProcess so that we can monitor it
    child.stdout.on('data', function(data) {
        processOutput('Server: ' + data)
    })

    child.once('close', function() {
        winston.info('ARMA III server has been shutdown.')
    })

    server = child

    // Spawn a headless client so that the mission will load - Also HC
    var hcChild = exec('./arma3server -client -connect=127.0.0.1 ' + argString, {
            cwd: '/home/server/arma'
        },
        function(error, stdout, stderr) {
            if (error !== null) {
                console.log(error)
            }
        })

    hcChild.stdout.on('data', function(data) {
        processOutput('Headless Client: ' + data)
    })

    hcChild.once('close', function() {
        winston.info('Headless Client Closed')
    })

    headlessClient = hcChild

}

var processOutput = function(message) {

    winston.info('Output received from process: ' + message)

    if ( message.indexOf('Client connected:') > -1 ) {

        // Mark the server as being initialized
        statusFlags.running = true
        statusFlags.initialized = true

        // Open a BattleEye Connection
        rcon = new BattleNode({
            ip: '127.0.0.1',
            port: '2302',
            rconPassword: 'testPassword'
        })

        // Wait until the server has succesfully connected
        rcon.login()

        rcon.once('login', handleRCONConnection)

        rcon.on('login', function() {
            winston.info('RCON Server connected')
        })

        rcon.on('disconnected', function() {
            winston.error('RCON Server disconnected')
        })

    }

}

var handleRCONConnection = function(error, success) {

    if ( error ) {
        winston.error('RCON Connection refused')
        statusFlags.crashed = true
        return
    }

    if ( success ) {
        winston.info('RCON Client connected')
        winston.info('Locking server for pre init')

        // The RCON has connected - Issue a lock command to prevent people from joining during loadup
        rcon.sendCommand('#lock', loadMapFile)
        statusFlags.locked = true
    }

}

var loadMapFile = function() {

    winston.info('Loading Map File')
    rcon.sendCommand('#mission 1st_rrf_training.wake', unlockServer)

}

var unlockServer = function() {

    winston.info('Map Loading complete')

    rcon.sendCommand('#unlock', serverUnlocked)

}

var serverUnlocked = function() {

    winston.info('Server Unlocked and accepting connections')

    statusFlags.locked = false

}

var closeServer = function() {

    winston.info('Cleaning up existing server')
    // Disconnect and destroy the rcon client
    rcon.sendCommand('Exit')
    rcon = null

    server.kill()
    server = null

}

module.exports = {
    start: start,
    close: closeServer
}