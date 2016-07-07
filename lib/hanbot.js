'use strict';


var util = require('util');
var path = require('path');
var fs = require('fs');
var SQLite = require('sqlite3').verbose();
var Bot = require('slackbots');

/**
 * Constructor function. It accepts a settings object which should contain the following keys:
 *      token : the API token of the bot (mandatory)
 *      name : the name of the bot (will default to "norrisbot")
 *      dbPath : the path to access the database (will default to "data/norrisbot.db")
 *
 * @param {object} settings
 * @constructor
 *
 * @author Luciano Mammino <lucianomammino@gmail.com>
 */
var HanBot = function Constructor(settings) {
    this.settings = settings;
    this.settings.name = 'han_bot';
    this.dbPath = settings.dbPath || path.resolve(__dirname, '..', 'data', 'hanbot.db');
    this.secondPath =  path.resolve(__dirname, '..', 'data', 'functions');
    this.user = null;
    this.db = null;
    this.functionsdb = null;
};

// inherits methods and properties from the Bot constructor
util.inherits(HanBot, Bot);

/**
 * Run the bot
 * @public
 */
HanBot.prototype.run = function () {
    HanBot.super_.call(this, this.settings);

    this.on('start', this._onStart);
    this.on('message', this._onMessage);
};

/**
 * On Start callback, called when the bot connects to the Slack server and access the channel
 * @private
 */
HanBot.prototype._onStart = function () {

    this._loadBotUser();
    this._connectDb();
    this._firstRunCheck();
};

/**
 * On message callback, called when a message (of any type) is detected with the real time messaging API
 * @param {object} message
 * @private
 */
HanBot.prototype._onMessage = function (message) {
	if(this._validate(message))
	{
			
		    	if(message.text.toLowerCase().indexOf('joke') > -1) 
		    	{
		    		this._replyWithJokePM(message);
		    	}
		    	else if(message.text.toLowerCase().indexOf('!help') > -1) 
		    	{
		    		this._help(message);
		    	}

                else if(message.text.toLowerCase().indexOf('!lunchsuggest') > -1) 
                {
                    this._suggestlunch(message);
                }
                else if(message.text.toLowerCase().indexOf('!lunchadd') > -1) 
                {
                    this._addlunch(message);
                }
                else if(message.text.toLowerCase().indexOf('!lunchdel') > -1) 
                {
                    this._dellunch(message);
                }
                else if(message.text.toLowerCase().indexOf('!lunchlist') > -1) 
                {
                    this._listlunch(message);
                }
                else if(message.text.toLowerCase().indexOf('!gtfo') > -1) 
                {
                    this._getout(message);
                }
		    	else
		    	{
			    	
			    	this._replyWithGreeting(message);
	    		}
			

	}
	
};

HanBot.prototype._snack = function (message) {
	var params = {
		filename : path.resolve(__dirname, '..', 'imgs', 'orange.jpg'),
		title : "You look hungry!"
	};


	this.files.upload(params);
};

HanBot.prototype._validate = function (message) {
	return !this._isFromHanBot(message) && this._MentionsHan(message);
};


/**
 * Replyes to a message with a random Joke
 * @param {object} originalMessage
 * @private
 */
HanBot.prototype._replyWithRandomJoke = function (originalMessage) {
    var self = this;
    self.db.get('SELECT id, joke FROM jokes ORDER BY used ASC, RANDOM() LIMIT 1', function (err, record) {
        if (err) {
            return console.error('DATABASE ERROR:', err);
        }
		var channel = self._getChannelById(originalMessage.channel);
    	self.postMessage(channel.name, record.joke , {as_user: true});
        self.db.run('UPDATE jokes SET used = used + 1 WHERE id = ?', record.id);
    });
};

HanBot.prototype._getout = function (originalMessage) {
    
    
    var channel = this._getChannelById(originalMessage.channel);
    this.postMessage(channel.name, 'Maybe you should try fucking yourself?' , {as_user: true});
    
};

HanBot.prototype._suggestlunch = function (originalMessage) {
    var self = this;
    self.functionsdb.get('SELECT * FROM restaurants ORDER BY used ASC, RANDOM() LIMIT 1', function (err, record) {
        if (err) {
            return console.error('DATABASE ERROR:', err);
        }
        self.postMessage(originalMessage.channel, 'I am thinking ' + record.name , {as_user: true});
        self.functionsdb.run('UPDATE restaurants SET used = used + 1 WHERE name = ?', record.name);
    });
};
HanBot.prototype._listlunch = function (originalMessage) {
    var self = this;
    self.functionsdb.each('SELECT * FROM restaurants', function (err, record) {
        if (err) {
            return console.error('DATABASE ERROR:', err);
        }
        self.postMessage(originalMessage.channel, record.name  , {as_user: true});
    });
};
HanBot.prototype._help = function (originalMessage) {
    var self = this;
    self.functionsdb.each('SELECT * FROM commands', function (err, record) {
        if (err) {
            return console.error('DATABASE ERROR:', err);
        }
        self.postMessage(originalMessage.channel, 'Command: ' + record.prompt + ' Use: ' + record.use + ' Example Use: '  + record.example , {as_user: true});
    });
};
HanBot.prototype._addlunch = function (originalMessage) {
    var self = this;
    var tagIndex , startI, endI;
    //Get a tags index this will be the name
    var ogText = originalMessage.text;
     tagIndex  = ogText.indexOf('name:');
     startI = ogText.indexOf(':',tagIndex) + 1;
     endI =  ogText.indexOf(':', startI);
    var name  = ogText.substring(startI, endI);
    console.log(name);
    if( tagIndex === -1)
    {
        self.postMessage(originalMessage.channel, 'Sorry you need to include a name otherwise I cant add that. Make sure to use the name tag name:restaurantnamehere:  ' , {as_user: true});
        return
    }
    
    self.functionsdb.get('SELECT * FROM restaurants WHERE name = ? ORDER BY used ASC, RANDOM() LIMIT 1 ', name , function (err, record) {
        if (err) {
            return console.error('DATABASE ERROR:', err);
        }
        if(record === undefined)
        {
         
            self.functionsdb.run("INSERT INTO restaurants (name, type, used, last_visit) VALUES (?, '' , 0, '2013-10-07 08:23:19');", name.toUpperCase()); //Add the restaurant to our list
            self.functionsdb.run('UPDATE restaurants SET used = 0'); //Reset usage of all locations
            self.postMessage(originalMessage.channel, 'I have added the ' + name.toUpperCase() + ' into the database! Also reset the number of uses for each location' , {as_user: true});
        }
        
    });
};

HanBot.prototype._dellunch = function (originalMessage) {
    var self = this;
    var tagIndex , startI, endI;
    //Get a tags index this will be the name
    var ogText = originalMessage.text;
     tagIndex  = ogText.indexOf('name:');
     startI = ogText.indexOf(':',tagIndex) + 1;
     endI =  ogText.indexOf(':', startI);
    var name  = ogText.substring(startI, endI);
    console.log(name);
    if( tagIndex === -1)
    {
        self.postMessage(originalMessage.channel, 'Sorry you need to include a name otherwise I cant delete that. Make sure to use the name tag name:restaurantnamehere:  ' , {as_user: true});
        return
    }
    
    self.functionsdb.get('SELECT * FROM restaurants WHERE name = ? ORDER BY used ASC, RANDOM() LIMIT 1 ', name.toUpperCase() , function (err, record) {
        if (err) {
            return console.error('DATABASE ERROR:', err);
        }
        if(record !== undefined)
        {
         
            self.functionsdb.run("DELETE FROM restaurants WHERE name = ?", name.toUpperCase()); //Add the restaurant to our list
            self.postMessage(originalMessage.channel, 'I have deleted ' + name.toUpperCase() + ' from the database!' , {as_user: true});
        }
        else
        {
            self.postMessage(originalMessage.channel, 'I can not seem to find what you named. ' , {as_user: true});

        }
        
    });
};

HanBot.prototype._replyWithJokePM = function (originalMessage) {
    var self = this;
    self.db.get('SELECT id, joke FROM jokes ORDER BY used ASC, RANDOM() LIMIT 1', function (err, record) {
        if (err) {
            return console.error('DATABASE ERROR:', err);
        }
		var channel = self._getChannelById(originalMessage.channel);
		self.postMessage(originalMessage.channel, record.joke, {as_user: true});
    	
        self.db.run('UPDATE jokes SET used = used + 1 WHERE id = ?', record.id);
    });
};
HanBot.prototype._replyWithGreeting = function (originalMessage) {
    var self = this;
    console.log('No command: Error Response');
 	var response = "I'm Sorry I didn't recognize that could you try something else? If you need a list of commands simply type han !help.";
 	self.postMessage(originalMessage.channel, response, {as_user: true});
 	console.log(self);
};

HanBot.prototype._imageSearch = function (keyword) {
	var params = {
		exactTerms: keyword,
		searchType : 'image',
		num: 5,
		imgSize: 'medium'

	};
	client.search('cheese' ,{
    page: 2
	})
    .then(function (images) {
        /*
        [{
            "url": "http://steveangello.com/boss.jpg",
            "type": "image/jpeg",
            "width": 1024,
            "height": 768,
            "size": 102451,
            "thumbnail": {
                "url": "http://steveangello.com/thumbnail.jpg",
                "width": 512,
                "height": 512
            }
        }]
         */
         console.log(images);
    });
};
/**
 * Loads the user object representing the bot
 * @private
 */
HanBot.prototype._loadBotUser = function () {
    var self = this;


    this.user = this.users.filter(function (user) {
        return user.name === self.name;
    })[0];
    console.log('User is :' + this.user);
};



/**
 * Open connection to the db
 * @private
 */
HanBot.prototype._connectDb = function () {
    if (!fs.existsSync(this.dbPath)) {
        console.error('Database path ' + '"' + this.dbPath + '" does not exists or it\'s not readable.');
        process.exit(1);
    }

    this.db = new SQLite.Database(this.dbPath);
    // Connects to second database for new functions
    if (!fs.existsSync(this.secondPath)) {
        console.error('Database path ' + '"' + this.secondPath + '" does not exists or it\'s not readable.');
        process.exit(1);
    }

    this.functionsdb = new SQLite.Database(this.secondPath);
};

HanBot.prototype._bandito = function (originalMessage) {
    var self = this;
    self.functionsdb.get('SELECT ind, response FROM bandito ORDER BY used ASC, RANDOM() LIMIT 1', function (err, record) {
        if (err) {
            return console.error('DATABASE ERROR:', err);
        }

		var channel = self._getChannelById(originalMessage.channel);
    	self.postMessage(originalMessage.channel, record.response, {as_user: true});
		// This works for messages inside the chat
    	// self.postMessage(channel.name, record.response , {as_user: true});
        self.functionsdb.run('UPDATE bandito SET used = used + 1 WHERE ind = ?', record.ind);
    });
};
/**
 * Check if the first time the bot is run. It's used to send a welcome message into the channel
 * @private
 */
HanBot.prototype._firstRunCheck = function () {
    var self = this;
    self.db.get('SELECT val FROM info WHERE name = "lastrun" LIMIT 1', function (err, record) {
        if (err) {
            return console.error('DATABASE ERROR:', err);
        }

        var currentTime = (new Date()).toJSON();

        // this is a first run
        if (!record) {
            self._welcomeMessage();
            return self.db.run('INSERT INTO info(name, val) VALUES("lastrun", ?)', currentTime);
        }

        // updates with new last running time
        self.db.run('UPDATE info SET val = ? WHERE name = "lastrun"', currentTime);
    });
};

/**
 * Sends a welcome message in the channel
 * @private
 */
HanBot.prototype._welcomeMessage = function () {
    this.postMessage(this.channels[0].name, 'Hi guys, roundhouse-kick anyone?' +
        '\n I can tell jokes, but very honest ones. Just say `Han` or `' + this.name + '` to invoke me!',
        {as_user: true});
};

/**
 * Util function to check if a given real time message object represents a chat message
 * @param {object} message
 * @returns {boolean}
 * @private
 */
HanBot.prototype._isChatMessage = function (message) {
	console.log('Chat message');
    return message.type === 'message' && Boolean(message.text);
};

/**
 * Util function to check if a given real time message object is directed to a channel
 * @param {object} message
 * @returns {boolean}
 * @private
 */
HanBot.prototype._isChannelConversation = function (message) {
	console.log(message.channel[0] === 'C');
	console.log('The current source of the message is ' + message.channel[0]);
    return typeof message.channel === 'string' &&
        message.channel[0] === 'C'
        ;
};


HanBot.prototype._isDirectMessage = function (message) {
	
    return typeof message.channel === 'string' &&
        message.channel[0] === 'D'
        ;
};
/**
 * Util function to check if a given real time message is mentioning Chuck Norris or the norrisbot
 * @param {object} message
 * @returns {boolean}
 * @private
 */
HanBot.prototype._MentionsHan = function (message) {
	
    return message.text.toLowerCase().indexOf('han') > -1 ||
        message.text.toLowerCase().indexOf(this.name) > -1;
};

/**
 * Util function to check if a given real time message has ben sent by the norrisbot
 * @param {object} message
 * @returns {boolean}
 * @private
 */
HanBot.prototype._isFromHanBot = function (message) {
    return message.user === this.user.id;
};

/**
 * Util function to get the name of a channel given its id
 * @param {string} channelId
 * @returns {Object}
 * @private
 */
HanBot.prototype._getChannelById = function (channelId) {

    return this.channels.filter(function (item) {
        return item.id === channelId;
    })[0];
};

module.exports = HanBot;
