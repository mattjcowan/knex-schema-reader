---
id: bsk:getting-started
title: Getting Started ∙ Knex Schema Reader
---

# Getting Started

For better experience, make sure that you have `npm v3+` installed. 
Start by installing the tool into your project.

Install from github at this time. Once it's ready, we'll publish it to npm.

```sh
$ npm install git+https://git@github.com/mattjcowan/knex-schema-reader
```

**STILL A WORK IN PROGRESS!**

### CLI

The cli utilizes the [knexfile.js](http://knexjs.org/#knexfile) to 
establish a connection to the database. Simply use the --knexfile parameter
as indicated on the [knexjs.org](http://knexjs.org/#knexfile) website.

The following is a sample knexfile.js file:

```javascript
module.exports = {
  "client": "mssql",
  "connection": "mssql://aw-username:aw-password@localhost:1433/AdventureWorks2014",
  "debug": true,
  "acquireConnectionTimeout": 3000,
};
```

The following example exports the AdventureWorks database from sqlserver

```sh
$ knexschemareader extract -o ./adventureworks.json
```

Refer to the [Knex.js](http://knexjs.org) website for dialect and 
connectionstring related information.

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


