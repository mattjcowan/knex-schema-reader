const program = require('commander');
const fs = require('fs');
const path = require('path');
const Knex = require('knex');
const schemaReader = require('../dist/index.js');

var cliRunner = function (args, notifCallback) {

  var args = args || process.argv;

  program
    .version('0.0.1')
    .usage('[options]')
    .option('-d, --dialect <dialect>', '[Required] The knex dialect for the database')
    .option('-c, --connectionstring <connectionstring>', '[Required] The knex connectionstring for the database')
    .option('-o, --output <output>', '[Required] The json file to output the schema to');

  program.parse(args);

  if(!program.dialect || !program.connectionstring || !program.output) {

    program.help();

  } else {

    var knex;
    try {

      knex = Knex({
        client: program.dialect,
        connection: program.connectionstring,
        debug: process.env.NODE_ENV !== 'production'
      });

    } catch(err) {

        var message = 'Unknown exception';
        if(err.stack.indexOf('Cannot find module')) {
          message = 'Invalid dialect ' + program.dialect + '. Please make sure you have installed the required dialect, see http://knexjs.org/#Installation for more info.';
        } else if(err.stack.indexOf('ConnectionError')) {
          message = 'Invalid connectionstring ' + program.connectionstring + '. Could not establish a connection with given information.';
        }

        throw {
          message: message,
          source: 'knex',
          sourceException: err.stack
        }

    }

    if(knex) {

      schemaReader(knex)
        .then(function(db) {

          knex.destroy();

          var pathToOutputFile = path.resolve(program.output);
          fs.writeFileSync(pathToOutputFile, JSON.stringify(db, null, '  '), 'utf8');

          var msg = 'File created at: ' + pathToOutputFile;
          if(notifCallback) notifCallback(msg);
          else console.log(msg);

        }, function(err) {

          knex.destroy();

          if(notifCallback) notifCallback(err.stack);
          console.error(err.stack);

        });

    }

  }

}

module.exports = cliRunner;
