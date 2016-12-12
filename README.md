# Knex Schema Reader

[![Build Status](http://img.shields.io/travis/mattjcowan/knex-schema-reader/master.svg?style=flat-square)](https://travis-ci.org/mattjcowan/knex-schema-reader)
<!--
[![Coverage Status](https://img.shields.io/coveralls/mattjcowan/knex-schema-reader.svg?style=flat-square)](https://coveralls.io/github/mattjcowan/knex-schema-reader)
-->
[![Dependency Status](http://img.shields.io/david/dev/mattjcowan/knex-schema-reader.svg?style=flat-square)](https://david-dm.org/mattjcowan/knex-schema-reader#info=devDependencies)

> Knex Schema Reader is a utility for exporting a database schema to an object and/or json file

### Install

Install from github at this time. Once it's ready, we'll publish it to npm.

```sh
$ npm install git+https://git@github.com/mattjcowan/knex-schema-reader
```

### Features

Exports a database schema to either an object (api) or to a json file (cli). Useful in a code generation pipeline or to build tooling.

Supported database dialects:

- [x] mysql
- [x] mssql
- [ ] pg


### Documentation

* [Getting Started](https://mattjcowan.github.io/knex-schema-reader/getting-started)

### CLI

Run the command as:

```shell
knexschemareader extract --knexfile knexfile.mysql.sakila.json -o sakila.json
```

Or if you just cloned this repo, you can run the pre-built version as:

```shell
node ./bin/cli.js extract --knexfile knexfile.mysql.sakila.json -o sakila.json
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

### Related Projects

* [DatabaseSchemaReader](https://github.com/martinjw/dbschemareader) — A simple, cross-database facade over .Net 2.0 DbProviderFactories to read database metadata.
* [knex.js](https://github.com/tgriesser/knex) — A query builder for PostgreSQL, MySQL and SQLite3, designed to be flexible, portable, and fun to use. [](http://knexjs.org)

### Get in Touch

* [@mattjcowan](https://twitter.com/mattjcowan)

### License

Copyright © 2016 Matt Cowan, MJCZone Inc. This source code is licensed under the MIT license found in
the [LICENSE.txt](https://github.com/mattjcowan/knex-schema-reader/blob/master/LICENSE.txt) file.
The documentation to the project is licensed under the [CC BY-SA 4.0](http://creativecommons.org/licenses/by-sa/4.0/)
license.

