/**
 * This module contains the tools for handling the incoming commands, sending
 * commands through serial port and listen for answer from the serial port.
 * 
 * 
 */
// Importing the command queue.
const queue = require('./queueing.js')
const res = require('./responses.json')
// Importing the table with the cross reference of command into groups.
const cross_t = require('./cross_table.json')

const log4js = require('log4js')
log4js.configure('log4js.json')
const logger = log4js.getLogger()
const logTemp = log4js.getLogger('record')

// Importing the message through AMQ module
const producer = require('./producer.js')

// Serialport module for serial port communication
const serialPort = require('serialport')

/**
 * Definition of port object.
 * 'COM(X)' is the COM port of the pc followed by settings.
 * (mostly default values)
 * COM1 : For media players
 * COM1-8 : For laptop, depend on which USB port is plagged in
 * After the COM decalration, there are the settings for the serial port.
 * These are the standard settings and these are using the LG monitors.
 * () => the arrow function is for error control
 */
const port = new serialPort(
    'COM5',
    {
        baudRate: 9600,
        dataBits: 8,
        parity: 'none',
        stopBits: 1,
    },
    (err) => {
        if (err) {
            logger.error('Error on serial port : ' + err)
            return
        }
        logger.info('-- Serial port is functional --')
    }
)

// This line creates a parser for the incoming data defining the end of the 
// answer received by the letter x. This is the standard answer for LG monitors.
const DelimiterParser = require('@serialport/parser-delimiter')
const parser = port.pipe(new DelimiterParser({ delimiter: 'x' }))

/**
 * This is the critical function for receiving data from the serial port.
 * After every signal from the serial port (the reply of the LG monitor),
 * this function handles the data to match the pending commands on the command
 * queue. The matching is based on the group number that the reply belongs.
 * If is not matching the first command, then a reply is send with the message 
 * 'No response'. Else the reply contains the data that the parser received.
 * Either way, the command is "shifted" from the queue.
 * 
 * For matching commands and result in the database that are send, is used an 
 * UUID. This is a long random generated string, unique for each command. So 
 * every command has a unique UUID and every answer is matched to this UUID.
 */
parser.on('data', function (x) {
    try {
        // Converting answer to string and passe it to handleMessage function 
        // for get the results
        let result = handleMessage(x.toString())
        // The message with the result is written on a file.
        logTemp.info(result[0])
        if (queue.qArr.length === 0){
            producer.sender(result[0], result[1])
        } else {
            while (
                queue.qArr.length !== 0 &&
                cross_t[queue.qArr[0]['msg']] !== result[1]
            ) {
                producer.sender(
                    'No response',
                    result[1],
                    queue.qArr[0]['uuid']
                )
                queue.qArr.shift() // 3
            }
            if (cross_t[queue.qArr[0]['msg']] === result[1]) {
                producer.sender(result[0], result[1], queue.qArr[0]['uuid'])
            } else {
                producer.sender(
                    'No response',
                    result[1],
                    queue.qArr[0]['uuid']
                )
            }
            // Delete the record from queued requests
           queue.qArr.shift() // 2
        }
    } catch (ex) {
        logger.error('Error on handling message: ' + ex)
    }
})

/**
 * This function handles the answer from the serial port and creates the returning value for the file
 * Possible answers are : a 01 OK01x (monitor turn on), a 01 OK00x (monitor turn off),
 * n 01 OK22x (temp is "22" in hex) and n 01 NG00x (monitor is off a.k.a "NG").
 * Return cases depends on the code on 5th & 6th position for (OK or NG)
 * @param {string} message - a code format that is recognized from the LG monitor
 * @returns - a message in string format
 */
function handleMessage(msg) {
    if (msg.substring(5, 7) === 'NG') {
        return [0, 1, msg]
    } else if (res[msg] !== undefined) {
        return [res[msg][0], res[msg][1], msg]
    } else if (res[msg.substring(0, 7)] !== undefined) {
        if (msg.length > 10) {
            return [
                msg.substring(7, 20),
                res[msg.substring(0, 7)][1],
                msg,
                res[msg.substring(0, 7)][0] + msg.substring(7, 20),
            ]
        } else {
            let num = parseInt(msg.substring(7, 9), 16)
            let a1 = res[msg.substring(0, 7)][0].a
            let b2 = res[msg.substring(0, 7)][0].b
            return [
                num,
                res[msg.substring(0, 7)][1],
                msg,
                a1 + num + b2,
            ]
        }
    } else {
        return ['Unknown or wrong command: ' + msg, 0, msg]
    }
}

/**
 * A way to delay the temperature recording in case of monitor being closed.
 * @param {int} ms - milliseconds for delay
 * @returns
 */
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * When the program is called for the first time,
 * sends a signal to open the monitor and waits
 * 10 sec for being functional.
 */
port.write('ka 01 01\r\n')
// Next delay loop stalls for 10000 ms (10 sec)
sleep(10000).then(() => {
    logTemp.info('Monitor is now open.')
})

/**
 * Convert incoming commands from words (e.x. open)
 * to code (e.x. "ka 01 OK01")
 * @param {string} x - command in word
 * @param {int or null} y - some commands have parameters,
 *  so we could have an integer decimal value
 *  or this parameter will be null.
 */
const comf = require('./command_file.json')
function com_sender(msg, param = null) {
    if (comf[msg] !== undefined) {
        if (param !== 'null') {
            port.write(comf[msg] + param + '\r\n')
        } else {
            port.write(comf[msg])
        }
    } else {
        producer.sender('Unknown command', 0, queue.qArr[0]['uuid'])
        // Delete the record from queued requests
        queue.qArr.shift() // 1
    }
}

module.exports = { com_sender }
