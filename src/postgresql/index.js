/* eslint-disable func-names, no-console */

import _ from 'lodash';
import co from 'co';
import cmds from './commands';

function extractor() {
  const getRows = function (result) {
    if (result.rows) {
      return result.rows;
    }
    return result;
  };

  return {
    extract: function extract(knex) {
      return co(function*() {
        const pgTypes = _.keyBy(getRows(yield cmds.getPgTypes(knex)), 'id');

        const db = {
          driver: 'postgresql',
          variant: {},
          catalog: getRows(yield cmds.getCatalog(knex))[0].name,
          dataTypes: _.keyBy(getRows(yield cmds.getDataTypes(knex)), 'typeName'),
          schemas: {},
        };

        const versionInfo = (getRows(yield cmds.getVersionInfo(knex)))[0].version.split(' ');
        db.variant.edition = versionInfo[0];
        db.variant.productVersion = versionInfo[1];
        db.variant.productLevel = null;
        if (db.variant.productVersion && db.variant.productVersion.length > 0) {
          db.variant.majorVersion = `PostgreSQL ${db.variant.productVersion.split('.')[0]}`;
        }

        // get database users
        // db.users = _.map(getRows(yield cmds.getUsers(knex)), 'name');

        const schemaNames = _.map(getRows(yield cmds.getSchemas(knex)), 'name');
        for (let i = 0; i < schemaNames.length; i++) {
          const schemaName = schemaNames[i];

          // get schema tables
          const tables = getRows(yield cmds.getTables(knex, schemaName));
          if (tables.length === 0) continue;
          const schema = {
            name: schemaName,
            tables: _.keyBy(_.map(tables, function (t) {
              return {
                name: t.name,
                description: t.description,
              };
            }), 'name'),
          };
          db.schemas[schemaName] = schema;

          // get sequences
          const hasSequences = yield cmds.hasSequences(knex, schema.name);
          if (hasSequences) {
            const sequences = _.map(getRows(yield cmds.getSequences(knex, schemaName)), function (r) {
              return {
                name: r.name,
                dataType: r.dataType,
                minValue: r.minValue,
                increment: r.increment === 1,
                isCycling: r.isCycling === 'YES'
              };
            });
            if (sequences.length > 0) {
              schema.sequences = _.keyBy(sequences, 'name');
            }
          }

          // get schema table columns
          const schemaTableColumns = _.map(getRows(yield cmds.getTableColumns(knex, schema.name)), function (row) {
            const col = {
              table: row.table,
              name: row.name,
              description: '', // gets populated later
              ordinal: row.ordinal,
              dataType: row.dataType,
              maxLength: row.maxLength,
              precision: row.precision,
              scale: row.scale,
              dateTimePrecision: row.dateTimePrecision,
              characterSet: row.characterSet,
              collation: row.collation,
              isNullable: row.isNullable,
              default: row.default ? { expression: row.default, constraintName: null } : null, // gets populated later
              isIdentity: row.isIdentity,
              isPartOfPrimaryKey: false, // gets populated later
              isPrimaryKey: false, // gets populated later
              isComputed: false, // gets populated later
              isPartOfUniqueKey: false, // gets populated later
              isUnique: false, // gets populated later
              isForeignKey: false // gets populated later
            };
            if (row.seed && row.seed > 0 && row.increment && row.increment > 0) {
              col.identity = {
                seed: row.seed,
                increment: row.increment,
              };
            }
            return col;
          });
          _.forEach(schema.tables, function (table) {
            table.columns = _.keyBy(_.filter(schemaTableColumns, { table: table.name }), 'name');
            // remove the table property
            _.forEach(table.columns, function (col) {
              _.unset(col, 'schema');
              _.unset(col, 'table');
            });
          });

          // get schema views
          const views = getRows(yield cmds.getViews(knex, schemaName));
          if (views.length > 0) {
            schema.views = _.keyBy(_.map(views, function (v) {
              return {
                name: v.name,
                description: v.description,
                sql: v.sql
              };
            }), 'name');
          }

          // get schema view columns
          const schemaViewColumns = _.map(getRows(yield cmds.getViewColumns(knex, schema.name)), function (row) {
            return {
              view: row.view,
              name: row.name,
              ordinal: row.ordinal,
              dataType: row.dataType,
              maxLength: row.maxLength,
              precision: row.precision,
              scale: row.scale,
              dateTimePrecision: row.dateTimePrecision,
              characterSet: row.characterSet,
              collation: row.collation,
              isNullable: row.isNullable
            };
          });
          _.forEach(schema.views, function (view) {
            view.columns = _.keyBy(_.filter(schemaViewColumns, { view: view.name }), 'name');
            // remove the view property
            _.forEach(view.columns, function (col) {
              _.unset(col, 'schema');
              _.unset(col, 'view');
            });
          });
        }

        // now that all tables are populated on all schemas with their columns
        // let's get the rest of the info
        for (let i = 0; i < schemaNames.length; i++) {
          const schemaName = schemaNames[i];
          const schema = db.schemas[schemaName];
          if (!schema) continue;

          const schemaColumnDescriptions = getRows(yield cmds.getColumnDescriptions(knex, schema.name));

          _.forEach(schemaColumnDescriptions, function (scd) {
            if (scd.description && scd.description.length > 0) {
              schema.tables[scd.table].columns[scd.name].description = scd.description;
            }
          });

          // get check constraints
          const checkConstraints = getRows(yield cmds.getCheckConstraints(knex, schema.name));
          if (checkConstraints.length > 0) {
            _.forEach(schema.tables, function (table) {
              const tableCheckConstraints = _.filter(checkConstraints, { table: table.name });
              if (tableCheckConstraints.length > 0) {
                table.checkConstraints = _.keyBy(tableCheckConstraints, 'name');
                _.forEach(table.checkConstraints, function (ck) {
                  _.unset(ck, 'schema');
                  _.unset(ck, 'table');
                });
              }
            });
          }

          // get indexes
          const indexes = getRows(yield cmds.getIndexes(knex, schema.name));
          const primaryKeys = {};
          if (indexes.length > 0) {
            _.forEach(_.groupBy(indexes, 'name'), function (idxArr, idxName) {
              const idx = idxArr[0];
              const table = schema.tables[idx.table];
              const isPrimaryKey = idx.isPrimary;
              if (!isPrimaryKey) {
                const idxc = {
                  name: idxName,
                  columnCount: idxArr.length,
                  columns: _.map(idxArr, 'column'),
                  type: null,
                  isUnique: idx.isUnique
                };
                table.indexes = table.indexes || {};
                table.indexes[idxName] = idxc;
                _.forEach(idxc.columns, function (idxcc) {
                  table.columns[idxcc].isPartOfIndex = true;
                  if (idx.isUnique && idxArr.length > 1) {
                    table.columns[idxcc].isUnique = true;
                  }
                });
              } else {
                primaryKeys[table.name] = idxName;
              }
            });
          }

          // get primary key (in MySQL, primary key names are always 'PRIMARY' so we need to group by table name instead)
          const primaryKeyConstraints = getRows(yield cmds.getPrimaryKeyConstraints(knex, schema.name));
          if (primaryKeyConstraints.length > 0) {
            _.forEach(_.groupBy(primaryKeyConstraints, 'table'), function (pk, pkName) {
              const table = schema.tables[pkName];
              table.primaryKey = { name: primaryKeys[pkName], columnCount: pk.length, columns: _.map(pk, 'column') };
              _.forEach(pk, function (pkc) {
                table.columns[pkc.column].isPartOfPrimaryKey = true;
                if (pk.length === 1) {
                  table.columns[pkc.column].isPrimaryKey = true;
                }
              });
            });
          }

          // get unique keys
          const uniqueKeyConstraints = getRows(yield cmds.getUniqueKeyConstraints(knex, schema.name));
          if (uniqueKeyConstraints.length > 0) {
            _.forEach(_.groupBy(uniqueKeyConstraints, 'name'), function (uk, ukName) {
              const table = schema.tables[uk[0].table];
              const ukk = { name: ukName, columnCount: uk.length, columns: _.map(uk, 'column') };
              table.uniqueKeys = table.uniqueKeys || {};
              table.uniqueKeys[ukName] = ukk;
              _.forEach(ukk.columns, function (ukc) {
                table.columns[ukc].isPartOfUniqueKey = true;
                table.columns[ukc].uniqueKeyName = ukName;
              });
            });
          }

          // get foreign keys
          const foreignKeyConstraints = getRows(yield cmds.getForeignKeyConstraints(knex, schema.name));
          if (foreignKeyConstraints.length > 0) {
            schema.foreignKeys = _.keyBy(_.map(foreignKeyConstraints, function (fkc) {
              return {
                name: fkc.name,
                fkSchemaName: fkc.schema,
                fkTableName: fkc.table,
                fkColumnName: fkc.column,
                pkSchemaName: fkc.ucSchema,
                pkTableName: fkc.ucTable,
                pkName: fkc.ucName,
                deleteRule: fkc.deleteRule,
                updateRule: fkc.updateRule,
              };
            }), 'name');
            _.forEach(schema.foreignKeys, function (fk) {
              const fkc = schema.tables[fk.fkTableName].columns[fk.fkColumnName];
              fkc.isForeignKey = true;
              fkc.foreignKeyName = fk.name;

              const pkt = db.schemas[fk.pkSchemaName].tables[fk.pkTableName];
              pkt.reverseForeignKeys = pkt.reverseForeignKeys || {};
              pkt.reverseForeignKeys[fk.name] = {
                name: fk.name,
                schemaName: fk.fkSchemaName,
                tableName: fk.fkTableName,
                columnName: fk.fkColumnName,
              };
            });
          }

          // get schema functions
          const functions = _.map(getRows(yield cmds.getFunctions(knex, schemaName)), function (row) {
            return {
              name: row.name,
              description: row.description,
              sql: row.sql,
              language: row.language, // typically always 'SQL'
              result: !row.dataType ? null : {
                name: '',
                ordinal: 0,
                isIn: false,
                isOut: false,
                isResult: true,
                asLocator: false,
                dataType: row.dataType
                // maxLength: row.maxLength,
                // precision: row.precision,
                // scale: row.scale,
                // dateTimePrecision: row.dateTimePrecision,
                // characterSet: row.characterSetName,
                // collation: row.collation
              }
            };
          });

          if (functions.length > 0) {
            schema.functions = _.keyBy(functions, 'name');
          }

          // get function arguments
          const functionsWithArgumentInfo = getRows(yield cmds.getFunctionArguments(knex, schemaName));
          if (functionsWithArgumentInfo && functionsWithArgumentInfo.length > 0) {
            _.forEach(functionsWithArgumentInfo, function (functionWithArgumentInfo) {
              // there is simply no easy way to get function arguments,
              // this is a bit hackish in my mind (for being soo powerful, it's strange
              // that PostgreSQL wouldn't give us a clean way to do this easily
              // like MySQL and MSSQL do

              // SAMPLE ROW:
              /*
               {
                 schema: 'public',
                 procedureName: 'film_not_in_stock',
                 parameterNames: [ 'p_film_id', 'p_store_id', 'p_film_count' ],
                 parameterModes: '{i,i,o}',
                 parameterDefinitions: 'p_film_id integer, p_store_id integer, OUT p_film_count integer',
                 inDataTypes: '23 23',
                 allDataTypes: [ 23, 23, 23 ]
               }

               parameterNames can be NULL sometimes in postgresql, i think it's a db that makes up rules as it goes
               parameterModes is often NULL, in which case, the parameters are usually IN parameters
               allDataTypes is also often null
               */
              const procedureName = functionWithArgumentInfo.procedureName;
              const parameterDefinitions = (functionWithArgumentInfo.parameterDefinitions || '').split(', ');
              const pcount = parameterDefinitions.length;
              const parameterNames = functionWithArgumentInfo.parameterNames || [];
              while (parameterNames.length < pcount) {
                // create a fake name for the argument
                parameterNames.push(`$${parameterNames.length}1`);
              }
              const parameterModesStr = (functionWithArgumentInfo.parameterModes || '');
              const parameterModes = parameterModesStr.length > 2 ? parameterModesStr.substring(1, parameterModesStr.length - 2).split(',') : [pcount];
              while (parameterModes.length < pcount) {
                parameterModes.push('i');
              }
              const inDataTypes = (functionWithArgumentInfo.inDataTypes || '').split(' ');
              while (inDataTypes.length < pcount) {
                inDataTypes.push(null);
              }
              const allDataTypes = (functionWithArgumentInfo.allDataTypes || [pcount]);
              const pargs = [];
              for (let p = 0; p < pcount; p++) {
                const pName = parameterNames[p];
                const pDef = parameterDefinitions[p];
                const pMode = parameterModes[p];
                const pIsInParam = pMode == null || pMode === 'i' || pMode !== 'b';
                const pIsOutParam = (pMode != null && pMode === 'o') || ((pDef || '').split(' ')[0] === 'OUT');
                const pDataTypeOid = (pIsInParam && inDataTypes[p]) || allDataTypes[p] || pDef;
                let pDataType = pDataTypeOid;
                const pDataTypeAsInt = parseInt(pDataTypeOid, 10);
                if (Number.isInteger(pDataTypeAsInt)) {
                  if (pgTypes[pDataTypeAsInt]) {
                    pDataType = pgTypes[pDataTypeAsInt].name;
                  }
                }
                const parg = {
                  name: pName,
                  ordinal: p + 1,
                  isIn: pIsInParam, // can be INOUT
                  isOut: pIsOutParam, // can be INOUT
                  isResult: false,
                  asLocator: false,
                  dataType: pDataType
                };
                pargs.push(parg);
              }
              const parguments = _.keyBy(pargs, 'name');
              schema.functions[procedureName].arguments = parguments;
            });
          }
        }

        return db;
      });
    },
  };
}

const mssqlExtractor = extractor();
export default mssqlExtractor;
