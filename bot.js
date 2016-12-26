'use strict';

// Weather Example
// See https://wit.ai/sungkim/weather/stories and https://wit.ai/docs/quickstart
const Wit = require('node-wit').Wit;
const FB = require('./facebook.js');
const Config = require('./const.js');
var pg = require('pg');

const firstEntityValue = (entities, entity) => {
  const val = entities && entities[entity] &&
    Array.isArray(entities[entity]) &&
    entities[entity].length > 0 &&
    entities[entity][0].value;
  if (!val) {
    return null;
  }
  return typeof val === 'object' ? val.value : val;
};

// Bot actions
const actions = {

  retrieve(sessionId, context, entities, cb){
    // Bot testing mode, run cb() and return
    console.log("Attempting to retrieve from datastore...")

    pg.defaults.ssl = true;
    pg.connect(process.env.DATABASE_URL, function(err, client) {
      if (err) throw err;
        console.log('Connected to postgres!');

      // Read data
      client.query('SELECT * FROM items ORDER BY id ASC')
        .on('row', (row) => {
          console.log(JSON.stringify(row)); 
      });
    });
  },

  store(sessionId, context, entities, cb){
    // Bot testing mode, run cb() and return
    console.log("Attempting to store in datastore...")

    pg.defaults.ssl = true;
    pg.connect(process.env.DATABASE_URL, function(err, client) {
      if (err) throw err;
        console.log('Connected to postgres!');

      // Insert data
      client
        .query('INSERT INTO items(text, complete) values($1, $2)',["testData", true]);
      
    });

    return new Promise(function(resolve, reject) {
      const data = firstEntityValue(entities, 'data');
      if (data) {
        context.data= data;
        console.log("Updated data");
      }
      
      console.log("Resolving context after STORE.");
      //call the API here
      return resolve(context);
    });

    cb();
  },
  say(sessionId, context, message, cb) {
    console.log(message);

    // Bot testing mode, run cb() and return
    if (require.main === module) {
      cb();
      return;
    }

    // Our bot has something to say!
    // Let's retrieve the Facebook user whose session belongs to from context
    // TODO: need to get Facebook user name
    const recipientId = context._fbid_;
    if (recipientId) {
      // Yay, we found our recipient!
      // Let's forward our bot response to her.
      FB.fbMessage(recipientId, message, (err, data) => {
        if (err) {
          console.log(
            'Oops! An error occurred while forwarding the response to',
            recipientId,
            ':',
            err
          );
        }

        // Let's give the wheel back to our bot
        cb();
      });
    } else {
      console.log('Oops! Couldn\'t find user in context:', context);
      // Giving the wheel back to our bot
      cb();
    }
  },
  merge(sessionId, context, entities, message, cb) {
    // Retrieve the location entity and store it into a context field
    const loc = firstEntityValue(entities, 'location');
    if (loc) {
      context.loc = loc; // store it in context
    }

    cb(context);
  },

  error(sessionId, context, error) {
    console.log(error.message);
  },

  // fetch-weather bot executes
  ['fetch-weather'](sessionId, context, cb) {
    // Here should go the api call, e.g.:
    // context.forecast = apiCall(context.loc)
    context.forecast = 'sunny';
    cb(context);
  },
};


const getWit = () => {
  return new Wit(Config.WIT_TOKEN, actions);
};

exports.getWit = getWit;

// bot testing mode
// http://stackoverflow.com/questions/6398196
if (require.main === module) {
  console.log("Bot testing mode.");
  const client = getWit();
  client.interactive();
}