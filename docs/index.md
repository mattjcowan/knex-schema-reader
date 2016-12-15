---
id: bsk:home
title: Knex Schema Reader ∙ A database schema reader and export utility
---

# Knex Schema Reader

Knex Schema Reader is a utility for exporting a database schema to an object (API) and/or json file (CLI)

### Features

Exports a database schema to either an object (api) or to a json file (cli). 
Useful in a code generation pipeline or to build tooling.

Supported database dialects:

- <i class="fa fa-check-square-o" aria-hidden="true"></i> mssql
- <i class="fa fa-check-square-o" aria-hidden="true"></i> mysql
- <i class="fa fa-check-square-o" aria-hidden="true"></i> postgresql
- <i class="fa fa-square-o" aria-hidden="true"></i> oracle

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

- PostgreSQL samples:
  - [Pagila JSON output file](https://github.com/mattjcowan/knex-schema-reader/blob/master/samples/postgresql/pagila.json)
    - [Get the database](http://www.postgresqltutorial.com/postgresql-sample-database/)
  - [SportsDB JSON output file](https://github.com/mattjcowan/knex-schema-reader/blob/master/samples/postgresql/sportsdb.json)
    - [Get the database](http://www.sportsdb.org/sd/samples)
