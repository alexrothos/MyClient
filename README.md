# BIDS monitoring Media Player client v1.4

Main purpose of the project is the remote control of LG monitor, from a specific media player.
The goal is to feed the media player commands over a topic of ActiveMQ and send the response back the same way.

At the docs folder you will find a flowchart representation of the app functionality.

## Structure (for src folder):
- app.js
- producer.js
- serial_port_functions.js
- queueing.js
- temp_checker.js
- config.js
- command_file.json
- cross_table.json
- log4js.json
- responses.json


#### note: this is an application that needs Node.JS to run it, all the dependencies are in package.json file and you must install all of them in the folder of the app.

## Installation of dependencies:
Use the Node.js package manager [npm](https://nodejs.org/en/download/)

```bash
npm install
```

## Running the project:
```bash
node app.js
```


### app.js

The main script of the application. 
The functionality of the app is to listen at the command topic and passing the incoming command requests. 

### producer.js

This script passing the messages through ActiveMQ, with the wright format.


### serial_port_functions.js

This script is responsible for the communication with the monitor by serial port hex commands.
Is sending the commands and receiving the answers from the monitor. 
Converts the commands from words to hex codes and vice versa for the answers, sending back the results.

### queueing.js

This script creates and exports the command queue.

### temp_checker.js

This snippet is used for sending a set of commands every X seconds.
The X value is imported by config.json.

### config.js

This file contains the setup for ActiveMQ's ip, port and the topics for communication for commands and replies.

### command_file.json

This file contains the possible commands. We have the comparison from the command word to command hex code.

### cross_table.json

Contains the cross reference of the commands at groups.
Every command belong to a group. This helps knowing if we had a reply to the command or not.

### log4js.json

It contains the configuration for the Log4js module.

### responses.json

This file contains the cross reference of the code answers to actual answers in proper format.


<h3 align="left">Languages and Tools:</h3>
<p align="left"> <a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript" target="_blank" rel="noreferrer"> <img src="https://raw.githubusercontent.com/devicons/devicon/master/icons/javascript/javascript-original.svg" alt="javascript" width="40" height="40"/> </a> <a href="https://nodejs.org" target="_blank" rel="noreferrer"> <img src="https://raw.githubusercontent.com/devicons/devicon/master/icons/nodejs/nodejs-original-wordmark.svg" alt="nodejs" width="40" height="40"/> </a> <a href="https://www.postgresql.org" target="_blank" rel="noreferrer"> <img src="https://raw.githubusercontent.com/devicons/devicon/master/icons/postgresql/postgresql-original-wordmark.svg" alt="postgresql" width="40" height="40"/> </a> </p>