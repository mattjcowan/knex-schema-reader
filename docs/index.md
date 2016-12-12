---
id: bsk:home
title: Knex Schema Reader ∙ A database schema reader and export utility
---

# Knex Schema Reader

Knex Schema Reader is a utility for exporting a database schema to an object and/or json file

### Features

Exports a database schema to either an object (api) or to a json file (cli). Useful in a code generation pipeline or to build tooling.

Supported database dialects:

- <i class="fa fa-check-square-o" aria-hidden="true"></i> mssql
- <i class="fa fa-check-square-o" aria-hidden="true"></i> mysql
- <i class="fa fa-square-o" aria-hidden="true"></i> pg

### Sample Outputs

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
