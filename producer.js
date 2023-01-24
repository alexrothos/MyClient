/**
 * The Producer module contains the tools for establishing connection with
 * ActiveMQ topics and sending the formated data.
 *
 * At first, importing Stomp module for connecting to ActiveMQ
 * the configuration array for ActiveMQ address, port and topic
 */
const Stomp = require('stomp-client')
fs = require('fs')
const conf2 = require('./config.json')
let config = conf2
fs.watchFile('./config.json', () => {
    config = JSON.parse(fs.readFileSync('config.json'))
})

const log4js = require('log4js')
log4js.configure('log4js.json')
const logTemp = log4js.getLogger('record')
const logger = log4js.getLogger()

const stompClient1 = new Stomp(config.ip1, config.port, '', '', '', '', {
    retries: 2,
    delay: 2000,
})

const stompClient2 = new Stomp(config.ip2, config.port, '', '', '', '', {
    retries: 2,
    delay: 2000,
})

/**
 * Importing moments for date formatting
 */
const moment = require('moment')

const os = require('os')
const hostName = os.hostname()
// The media players have the number 2 ethernet port
// related to this interface, the other doesn't work.
const ip_addr = os.networkInterfaces().Ethernet[1].address

/**
 * Establish connection with both stompClients and
 * pass it to other apps
 */
stompClient1.connect(function () {
    logTemp.info('Producer connected - server 1')
    stompClient1.isConnected = true
}, (error) => {
    logger.error('NOT connected to server 1')
})

stompClient2.connect(
    function () {
        logTemp.info('Producer connected - server 2')
        stompClient2.isConnected = true
    },
    (error) => {
        logger.error('NOT connected to server 2')
    }
)

/**
 * The function takes a var x for input
 * and send it to queue with timestamp as json string
 * @param { string } x - string with the monitors feedback
 * @param { string } g - the command's group
 * @param { string } u - the ID of the command, if any
 */
function sender(x, g, u = null) {
    const notifications = {
        uuid: u,
        group: g,
        msg: x,
        time: moment().format('Do MMMM YYYY, h:mm:ss a'),
        player_id: config.mp.player_id,
        last_known_player_id: hostName,
        fixed_ip: config.mp.fixed_ip,
        last_known_ip: ip_addr,
        hall: config.mp.hall,
        location: config.mp.location,
    }
    if (stompClient1.isConnected === true) {
        stompClient1.publish(
            config.notifications_topic,
            JSON.stringify(notifications)
        )
    }
    if (stompClient2.isConnected === true) {
        stompClient2.publish(
            config.notifications_topic,
            JSON.stringify(notifications)
        )
    }
}

module.exports = { sender, stompClient1, stompClient2 }
