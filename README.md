# Knex Schema Reader

[![Build Status](http://img.shields.io/travis/mattjcowan/knex-schema-reader/master.svg?style=flat-square)](https://travis-ci.org/mattjcowan/knex-schema-reader)
[![Dependency Status](http://img.shields.io/david/dev/mattjcowan/knex-schema-reader.svg?style=flat-square)](https://david-dm.org/mattjcowan/knex-schema-reader#info=devDependencies)
<!-- [![Coverage Status](https://img.shields.io/coveralls/mattjcowan/knex-schema-reader.svg?style=flat-square)](https://coveralls.io/github/mattjcowan/knex-schema-reader) -->

> Knex Schema Reader is a utility for exporting a database schema to an object (API) and/or json file (CLI)

### Install

Install from github at this time.

```sh
$ npm install git+https://git@github.com/mattjcowan/knex-schema-reader
```

Also, install the provider you need:

```shell
$ npm install mssql
$ npm install mysql
$ npm install pg
```

### Features

Exports a database schema to either an object (api) or to a json file (cli). Useful in a code generation pipeline or to build tooling.

Supported database dialects:

- [x] mysql
- [x] mssql
- [x] postgresql

### CLI

Run the command as:

```shell
$ node ./node_modules/knex-schema-reader/bin/cli.js extract --knexfile ./knexfile.json -o ./schema.json
```

Or if you just cloned this repo, you can run the pre-built version as:

```shell
$ node ./bin/cli.js extract --knexfile ./test/knexfiles/knexfile.mysql.sakila.json -o ./samples/mysql/sakila.json
```

#### Sample Outputs

- SQL Server samples:
  - [AdventureWorks 2014](https://github.com/mattjcowan/knex-schema-reader/blob/master/samples/mssql/adventureworks.json)
    - [Get the database](https://msftdbprodsamples.codeplex.com/releases)
  - [Northwind](https://github.com/mattjcowan/knex-schema-reader/blob/master/samples/mssql/northwind.json)
    - [Get the database](https://northwinddatabase.codeplex.com/releases/view/71634)

- MySQL samples:
  - [Sakila JSON output file](https://github.com/mattjcowan/knex-schema-reader/blob/master/samples/mysql/sakila.json)
    - [Get the database](https://dev.mysql.com/doc/sakila/en/)
  - [Employees JSON output file](https://github.com/mattjcowan/knex-schema-reader/blob/master/samples/mysql/employees.json)
    - [Get the database](https://dev.mysql.com/doc/employee/en/)

- PostgreSQL samples:
  - [Pagila JSON output file](https://github.com/mattjcowan/knex-schema-reader/blob/master/samples/postgresql/pagila.json)
    - [Get the database](http://www.postgresqltutorial.com/postgresql-sample-database/)
  - [SportsDB JSON output file](https://github.com/mattjcowan/knex-schema-reader/blob/master/samples/postgresql/sportsdb.json)
    - [Get the database](http://www.sportsdb.org/sd/samples)

### API

To extract a database using the api, import the module and call the
extract method.

The following example extracts the AdventureWorks schema from sql server
and outputs it to a file 'db.json'.

```javascript
import fs from 'fs';
import Knex from 'knex';
import SchemaReader from 'knex-schema-reader';

const knex = Knex({
    client: 'mssql',
    connectionstring: 'mssql://aw-username:aw-password@localhost:1433/AdventureWorks2014'
});
SchemaReader(knex).extract()
  .then(function (db) {
    knex.destroy();
    fs.writeFileSync('db.json', JSON.stringify(db), 'utf-8');
  })
  .catch(function (err) {
    knex.destroy();
    console.error(err.stack);
  });

```

### Documentation

github.io site to host documentation ... Currently, pretty much a re-hash of this readme.

* [Getting Started](https://mattjcowan.github.io/knex-schema-reader/getting-started)

### Development/Contributions

#### Build

To build, run:

```shell
$ npm run build
```

#### Lint

To lint, run:

```shell
$ npm run lint
```

#### Testing

To run tests, you'll need to make sure that you have valid connections to the 6 sample databases.
Check out the knexfiles [here](https://github.com/mattjcowan/knex-schema-reader/tree/master/test/knexfiles) for connection information.

Running the tests currently generates the same sample JSON files listed above and available
for viewing [here](https://github.com/mattjcowan/knex-schema-reader/tree/master/samples)

To run the tests, run:

```shell
$ npm run test
```

#### Code Coverage

To test your code coverage, run:

```shell
$ npm run test:cover
```

Travis CI code coverage is not reliable at the moment, as we don't have any migrations setup
with database provisioning to run the included tests. And I don't think Travis CI supports
SQL Server at this time either.

The local code coverage is in the 90%:

```
=============================== Coverage summary ===============================
Statements   : 93.15% ( 530/569 )
Branches     : 76.42% ( 470/615 )
Functions    : 94.08% ( 159/169 )
Lines        : 93.31% ( 516/553 )
================================================================================
```

That said, there are many many more tests that could be written to solidify the 
framework, the tests right now skim the surface.

### Notable Dependencies

* [knex.js](https://github.com/tgriesser/knex) — A query builder for PostgreSQL, MySQL and SQLite3, designed to be flexible, portable, and fun to use. [](http://knexjs.org)

### Similar Projects

* [Loopback (Discovery API/CLI)](https://loopback.io/doc/en/lb2/Discovering-models-from-relational-databases.html) — LoopBack makes it simple to create models from an existing relational database.
* [DatabaseSchemaReader](https://github.com/martinjw/dbschemareader) — A simple, cross-database facade over .Net 2.0 DbProviderFactories to read database metadata.

### Get in Touch

* [@mattjcowan](https://twitter.com/mattjcowan)

### License

Copyright © 2016 Matt Cowan, MJCZone Inc. This source code is licensed under the MIT license found in
the [LICENSE.txt](https://github.com/mattjcowan/knex-schema-reader/blob/master/LICENSE.txt) file.
The documentation to the project is licensed under the [CC BY-SA 4.0](http://creativecommons.org/licenses/by-sa/4.0/)
license.

