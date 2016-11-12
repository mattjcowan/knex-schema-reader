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

The following example exports the AdventureWorks database from sqlserver

```sh
$ knexschemareader \
    -dialect mssql \
    -connectionstring mssql://userid:password@localhost:1443/AdventureWorks \
    -output ./adventureworks.json
```

Refer to the [Knex.js](http://knexjs.org) website for dialect and connectionstring information.


### API

Coming soon ...



