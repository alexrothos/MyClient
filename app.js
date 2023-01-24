/**
 * Main application for the Media Player Client.
 *
 * The function 'checkAMQ' establish a connection to the 'command' topic
 * and listen to incomming commands with the help of the 'producer.js' module.
 *
 * When a command is received, the incoming data are handled by the 'commander'
 * function. This function parses the incoming data to extract the information
 * to define where or not this command is for the current media player.
 * The configuration for the current media player is imported from the file
 * 'config.json' that has all the information about the media players ID and
 * location.
 *
 * If the command is for the current player, first the command is added to the
 * command queue and then is send to the serial port with the help of the module
 *  'serial_port_function' using the function 'com_sender'.
 */

// Import of the Command Queue.
const queue = require('./queueing.js')
const fs = require('fs')
const log4js = require('log4js')
log4js.configure('log4js.json')
const logger = log4js.getLogger()
const logTemp = log4js.getLogger('record')
const amq = require('./producer.js')
// Configuration of main app and the config file for the stompClients that
// includes ip, port & topics.
const conf2 = require('./config.json')
const serverConfig = require('./server_config.json')
// The config files are 2, in case of changing the settings of the player
// remotely.
let config = conf2
// This file contains the functions that handles the command requests and
// answers.
const spf = require('./serial_port_functions.js')
const { execFile, execFileSync } = require('child_process')

/**
 * This function converts activeMQ messages to monitor commands.
 * First it checks if the command is for the current media player.
 * Then, if the command is for changing the settings, perform that change.
 * In all other cases the command is registered at the command queue and the
 * com_sender function is fired.
 * @param {} msg - containing the command
 * @returns Nothing to return here
 */
function commander(data) {
    let x
    try {
        x = JSON.parse(data)
    } catch (err) {
        logger.error('Error at incoming data : ' + err)
    }
    if (
        (x.mp.player_id === 'all' &&
            (x.mp.hall === 'all' || x.mp.hall === config.mp.hall) &&
            (x.mp.location === 'all' ||
                x.mp.location === config.mp.location)) ||
        x.mp.player_id === config.mp.player_id
    ) {
        // This branch is for changing the media player's settings.
        // Is separated from the other functions in purpose.
        if (x.msg === 'change_settings') {
            try {
                let file = 'config.json'
                let settings = JSON.parse(fs.readFileSync(file))
                settings.mp = x.mp2
                fs.writeFileSync(file, JSON.stringify(settings))
                config = settings
                logger.info('Players')
            } catch (err) {
                logger.error('Error in settings : ' + err)
            }
        } else if (x.msg === 'change_server') {
            logger.info('Change server command received...')
            let result = serverSettingsChange(x.param)
            if (result === 1) {
                serverStatus('Restarting', x.uuid)
                logger.info('Restarting')
                if (serverConfig.current.name === 'server1') {
                    execFileSync('server2.bat')
                } else {
                    execFileSync('server1.bat')
                }
            } else if (result === 0) {
                logger.info('No changes at current server')
            } else {
                logger.error(
                    'Something went wrong with the change of current server'
                )
            }
        } else {
            // Registering the request in queued requests
            queue.qArr.push(x)
            spf.com_sender(x.msg, x.param)
        }
    }
}

/**
 * Establishing connection on the topic
 * If connection is not made yet, retry is made
 * after 1 sec (1000 ms).
 * The commander function is called for handling
 * the incoming command data, when we have any.
 */
function checkAMQ1() {
    logTemp.info('Subscribing to topic 1')
    if (amq.stompClient1.isConnected !== true) {
        setTimeout(checkAMQ1, 10000)
        return
    }
    amq.stompClient1.subscribe(config.command_topic, {}, (msg) => {
        commander(msg)
    })
    logTemp.info('Subscribed to server 1')
}

checkAMQ1()

function checkAMQ2() {
    logTemp.info('Subscribing to topic 2')
    if (amq.stompClient2.isConnected !== true) {
        setTimeout(checkAMQ2, 10000)
        return
    }
    amq.stompClient2.subscribe(config.command_topic, {}, (msg) => {
        commander(msg)
    })
    logTemp.info('Subscribed to server 2')
}

try {
    checkAMQ2()
} catch {
    logger.error('NOT subscribed to server 2!')
}
// serverConfig

const serverStatus = function (serverName, u = null) {
    amq.sender(serverName, 10, u)
}

const changer = function (x, file) {
    let settings = JSON.parse(fs.readFileSync(file))
    settings.current = settings[x]
    fs.writeFileSync(file, JSON.stringify(settings))
}

const serverSettingsChange = function (x) {
    if (x === serverConfig.current.name) {
        return 0
    }
    try {
        let file = 'server_config.json'
        changer(x, file)
        logger.info('Current Server changed')
        return 1
    } catch (err) {
        logger.error('Error on current server change : ' + err)
        return 2
    }
}

let commands = ['serial_number', 'temp', 'vol_level', 'status']
setInterval(() => {
    for (let i = 0; i < commands.length; i++) {
        let command = {
            msg: commands[i],
            param: null,
            mp: config.mp,
        }

        if (amq.stompClient1.isConnected === true) {
            amq.stompClient1.publish(
                config.command_topic,
                JSON.stringify(command)
            )
        }

        if (amq.stompClient2.isConnected === true) {
            amq.stompClient2.publish(
                config.command_topic,
                JSON.stringify(command)
            )
        }
    }
    serverStatus(serverConfig.current.name)
}, config.mp.timer)

module.exports = { config }
