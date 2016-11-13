const program = require('commander');
const fs = require('fs');
const path = require('path');
const Knex = require('knex');
const schemaReader = require('../dist/index.js');

var cliRunner = function (args, notifCallback) {

  var args = args || process.argv;
  if(!notifCallback) process.env.NODE_ENV = 'production';

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

      knex = null;

      var errorMessage = err.code === 'MODULE_NOT_FOUND' ?
        `Invalid dialect ${program.dialect}. Please make sure you have installed the required dialect, see http://knexjs.org/#Installation for more info.`:
        err.toString() + '\n' + err.stack;

      if(notifCallback) notifCallback(errorMessage);
      else console.error(errorMessage);

    }

    if(knex) {
      schemaReader(knex)
        .then(function(db) {

          knex.destroy();

          var pathToOutputFile = path.resolve(program.output);
          fs.writeFileSync(pathToOutputFile, JSON.stringify(db, null, '  '), 'utf8');

          if(notifCallback) notifCallback(`File created at: ${pathToOutputFile}`);

        }, function(err) {

          knex.destroy();

          var errorMessage = err.code === 'ESOCKET' || err.name === 'ConnectionError' ?
            `Unable to connect to the database. Please check the connectionstring.`:
            err.toString() + '\n' + err.stack;

          if(notifCallback) notifCallback(errorMessage);
          else {
            console.error(errorMessage);
            process.exit(0);
          }

        });
    }
  }
}

module.exports = cliRunner;
