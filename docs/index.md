---
id: bsk:home
title: Knex Schema Reader ∙ A database schema reader and export utility
---

# Knex Schema Reader

Knex Schema Reader is a utility for exporting a database schema to an object and/or json file

**STILL A WORK IN PROGRESS!**

### Features

Exports a database schema to either an object (api) or to a json file (cli). Useful in a code generation pipeline or to build tooling.

Supported database dialects:

- <i class="fa fa-check-square-o" aria-hidden="true"></i> mssql
- <i class="fa fa-square-o" aria-hidden="true"></i> mysql
- <i class="fa fa-square-o" aria-hidden="true"></i> pg
- <i class="fa fa-square-o" aria-hidden="true"></i> oracle
- <i class="fa fa-square-o" aria-hidden="true"></i> db2
- <i class="fa fa-square-o" aria-hidden="true"></i> sqlite3

### Sample Outputs

- SQL Server samples:
  - [AdventureWorks](https://github.com/mattjcowan/knex-schema-reader/blob/master/samples/mssql/adventureworks.json)
  - [Northwind](https://github.com/mattjcowan/knex-schema-reader/blob/master/samples/mssql/northwind.json)
