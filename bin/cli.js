#!/usr/bin/env node
/* eslint no-console:0, no-var:0 */
var Liftoff = require('liftoff');
var Promise = require('bluebird');
var interpret = require('interpret');
var path = require('path');
var chalk = require('chalk');
var tildify = require('tildify');
var commander = require('commander');
var argv = require('minimist')(process.argv.slice(2));
var fs = Promise.promisifyAll(require('fs'));
var cliPkg = require('../package');
var Knex = require('knex');

function exit(text) {
  if(knex) knex.destroy();
  if (text instanceof Error) {
    chalk.red(console.error(text.stack));
  } else {
    chalk.red(console.error(text));
  }
  process.exit(1);
}

function success(text) {
  if(knex) knex.destroy();
  console.log(text);
  process.exit(0);
}

function checkLocalModule(env) {
  if (!env.modulePath) {
    console.log(chalk.red('No local knex-schema-reader install found in:'), chalk.magenta(tildify(env.cwd)));
    exit('Try running: npm install knex-schema-reader.');
  }
}

var knex;
function initKnex(env) {

  checkLocalModule(env);

  if (!env.configPath) {
    exit('No knexfile found in this directory. Specify a path with --knexfile');
  }

  if (process.cwd() !== env.cwd) {
    process.chdir(env.cwd);
    console.log('Working directory changed to', chalk.magenta(tildify(env.cwd)));
  }

  var environment = commander.env || process.env.NODE_ENV;
  var defaultEnv = 'development';
  var config = require(env.configPath);

  if (!environment && typeof config[defaultEnv] === 'object') {
    environment = defaultEnv;
  }

  if (environment) {
    console.log('Using environment:', chalk.magenta(environment));
    config = config[environment] || config;
  }

  if (!config) {
    console.log(chalk.red('Warning: unable to read knexfile config'));
    process.exit(1);
  }

  if (argv.debug !== undefined)
    config.debug = argv.debug;

  var reader = require(env.modulePath);

  knex = Knex(config);

  return reader(knex);
}

function invoke(env) {

  var pending = null;

  commander
    .version(
      chalk.blue('Knex Schema Reader CLI version: ', chalk.green(cliPkg.version)) + '\n' +
      chalk.blue('Local Knex Schema Reader version: ', chalk.green(env.modulePackage.version)) + '\n'
    )
    .option('--debug', 'Run with debugging.')
    .option('--knexfile [path]', 'Specify the knexfile path.')
    .option('--cwd [path]', 'Specify the working directory.')
    .option('--env [name]', 'environment, default: process.env.NODE_ENV || development');

  commander
    .command('extract')
    .description('        Extract the schema to a file.')
    .option(`-o <path>`, '[Required] Output path to schema JSON file')
    .action(function() {
      if (!argv.o) {
        exit("Some arguments are missing, please use --help for more info: \n    knexschemareader extract --help");
      }

      pending = initKnex(env).extract().then(function(db) {
        var jsonFile = path.resolve(argv.o);
        fs.writeFileSync(jsonFile, JSON.stringify(db, null, '  '), 'utf8');
        success(chalk.green(`Created schema JSON file: ${jsonFile}`));
      }).catch(exit);
    });

  commander.parse(process.argv);

  Promise.resolve(pending).then(function() {
    commander.help();
  });
}

var cli = new Liftoff({
  name: 'knex-schema-reader',
  extensions: interpret.jsVariants,
  v8flags: require('v8flags')
});

cli.on('require', function(name) {
  console.log('Requiring external module', chalk.magenta(name));
});

cli.on('requireFail', function(name) {
  console.log(chalk.red('Failed to load external module'), chalk.magenta(name));
});

cli.launch({
  cwd: argv.cwd,
  configPath: argv.knexfile || (fs.existsSync('./knexfile.js') ? './knexfile.js': null),
  require: argv.require,
  completion: argv.completion
}, invoke);
