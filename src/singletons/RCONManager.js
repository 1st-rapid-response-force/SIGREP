/*
    Purpose:
        The RCONManager manages the RCON connection to the ARMA III server.

    Implementation:
        RCONManager is implemented as a singleton with a socket connection to the server
 */

var BattleNode = require('battle-node'),
    EventEmitter = require('events').EventEmitter,
    util = require('util'),
    unexpectedCondition = require('../error/ErrorHandler').reportUnexpectedError

/**
 * Constructor for a new RCONManager
 *
 * @param {Object} config - Configuration for the RCON connection
 * @param {string} config.port - The port that the RCON connection should connect to
 * @param {string} config.password - The password that the RCON connection uses
 *
 * @constructor
 */
function RCONManager(config) {

    this.config = config

}

RCONManager.prototype.init = function() {

    this.connection = new BattleNode({
        ip: '127.0.0.1',
        port: this.config.port,
        rconPassword: this.config.password
    })

    // Start the connection
    this.connection.login()
    this.connection.on('login', this.connectionEstablished)

}

RCONManager.prototype.connectionEstablished = function(error, success) {
    console.log('connection established')
    if ( error || !success ) {
        unexpectedCondition(error)
    }

    if ( success === true ) {
        this.emit('rcon-connection-established')
    }

}

RCONManager.prototype.lock = function() {
    console.log('locked')
    // Issue a lock command to the server
    this.connection.sendCommand('#lock', (result) => {
        console.log(result)
        if ( error ) {
            unexpectedCondition(error)
            return
        }

        this.emit('rcon-server-locked')
    })

}

RCONManager.prototype.loadMission = function(mission_name) {
    console.log('mission loaded')
    // Load a Mission using the RCON system
    this.connection.sendCommand('#mission ' + mission_name, (error) => {
        if ( error ) {
            unexpectedCondition(error)
            return
        }

        this.emit('rcon-server-loaded-mission')
    })

}

util.inherits(RCONManager, EventEmitter)

module.exports = new RCONManager({
    port: 2302,
    password: 'test'
})