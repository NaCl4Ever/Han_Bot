

'use strict';

var HanBot = require('../lib/hanbot');
var env = require('dotenv').config();


var token = process.env.API_KEY;
var dbPath = process.env.BOT_DB_PATH;
var name = process.env.BOT_NAME;

var hanbot = new HanBot({
    token: token,
    dbPath: dbPath,
    name: name
});

hanbot.run();