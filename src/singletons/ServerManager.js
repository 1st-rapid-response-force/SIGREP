
/*
    Purpose:
        This file stores the ARMA game server that SIGREP is currently running and provides
        interfaces to it.

    Implementation:
        ServerManager is a singleton which extends EventEmitter.
 */

var EventEmitter = require('events').EventEmitter,
    util = require('util'),
    exec = require('child_process').exec,
    RCONManager = require('./RCONManager')

/**
 * Initialize a new ServerManager with the provided configuration
 *
 * @param {Object} config - An Object contianing the configuration details for the server manager
 * @param {string} config.port - The port which this server should bind to - Defaults to 2302
 * @param {string} config.maxMem - The amount of RAM allocated to this server instance - Default to 4028
 * @param {string} config.exThreads - The number of threads allocated to this server - Defaults to 7
 * @param {string} config.cpuCount - The number of CPUs allocated to this server - Defaults to 4
 * @param {string} config.configPath - The path to the config.cfg for this server - Defaults to server.cfg
 * @param {string} config.modLine - The mod's line that will be passed to the server - No Default - will be ommited if empty
 * @param {string} config.enableHT - Enable Hyper Threading - Defaults to yes
 *
 * @constructor
 */
function ServerManager(config) {

    // Load the provided information into the local configuration
    this.config = config

    // Add an event hander that kills the server on shutdown
    process.on('SIGINT', this.kill)

}

ServerManager.prototype.kill = function() {
    console.log('lololol')
    this.server.kill()
}

ServerManager.prototype.start = function() {

    // Mark indicator variables to init state
    this.running = false
    this.locked = false
    this.initializationComplete = false
    this.shutdownRequested = false

    // Build out the arguments to the system
    var args = []
    var config = this.config

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
    var argString

    args.forEach(function(arg) {
        var argString = argString + " "
    })

    console.log(argString)

    // Start a new ARMA 3 process as a child process
    var child = exec('../arma/arma3server ' + argString, {
            cwd: '/home/server/arma'
        },
        function(error, stdout, stderr) {
        if (error !== null) {
            console.log(error)
        }
    })

    // Subscribe to the created ChildProcess so that we can monitor it
    child.stdout.on('data', this.messageReceived)

    this.server = child

}

/**
 * @param {string} message = A message that has originated from the server's ChildProcess
 */
ServerManager.prototype.messageReceived = function(message) {
    console.log('message received')
    // Check the message for various formats - rules - to process the message

    if ( message.indexOf('Game Port:') > -1 ) {

        // Mark the server as being initialized
        this.running = true
        this.initializationComplete = true

        // Trigger the BattleEye Connection
        RCONManager.init()
        RCONManager.on('rcon-connection-established', this.rconActivated)

    }

}

ServerManager.prototype.rconActivated = function() {
    console.log('rcon activated')
    // Now an RCON connection is established - lock the server
    RCONManager.removeListener('rcon-connection-established', this.rconActivated)
    RCONManager.lock()
    RCONManager.on('rcon-server-locked', this.mapLoadStart)
}

ServerManager.prototype.mapLoadStart = function() {
    console.log('map load start')
    // This command follows the rconActivation so the server is locked at this point
    this.locked = true
    RCONManager.removeListener('rcon-server-locked', this.mapLoadStart)

    // Tell the server to load the map file
    RCONManager.loadMission('1st_rrf_training.wake')

    RCONManager.on('rcon-server-loaded-mission', this.serverReady)

}

ServerManager.prototype.serverReady = function() {
    console.log('server ready')
    // The server is now ready to receive traffic - unlock it and we're golden
    console.log('done')

}

util.inherits(ServerManager, EventEmitter)

module.exports = new ServerManager ({
    port: 2302,
    maxMem: 3072,
    exThreads: 7,
    config: 'server.cfg',
    mod: 'modpack/@cba_a3;modpack/@ares;modpack/@ace;modpack/@rhs_afrf;modpack/@rhs_usaf;modpack/@1rrf_maps;modpack/@1rrf_content;modpack/@1rrf_utility',
    enableHT: true
})