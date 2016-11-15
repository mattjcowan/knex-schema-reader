/* eslint-disable prefer-template, no-tabs */

function commands() {
  function getConstraints(knex, schemaOwner, tableName, constraintType) {
    const sql = `SELECT DISTINCT
                  cons.constraint_name as 'name', 
                  cons.constraint_schema as 'schema',
                  keycolumns.table_name as 'table', 
                  column_name as 'column', 
                  ordinal_position as 'ordinal', 
                  refs.unique_constraint_name as 'ucName', 
                  cons2.table_name AS ucTable,
                  cons2.table_schema AS ucSchema,
                  refs.delete_rule AS deleteRule,
                  refs.update_rule AS updateRule
                  FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS AS cons
                      INNER JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE AS keycolumns
                          ON (cons.constraint_catalog = keycolumns.constraint_catalog
                              OR cons.constraint_catalog IS NULL) AND
                          cons.constraint_schema = keycolumns.constraint_schema AND
                          cons.constraint_name = keycolumns.constraint_name AND
                          cons.table_name = keycolumns.table_name
                      LEFT OUTER JOIN INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS AS refs
                          ON (cons.constraint_catalog = refs.constraint_catalog
                              OR cons.constraint_catalog IS NULL) AND
                          cons.constraint_schema = refs.constraint_schema AND
                          cons.constraint_name = refs.constraint_name
                      LEFT OUTER JOIN INFORMATION_SCHEMA.TABLE_CONSTRAINTS AS cons2
                          ON (cons2.constraint_catalog = refs.constraint_catalog
                              OR cons2.constraint_catalog IS NULL) AND
                          cons2.constraint_schema = refs.unique_constraint_schema AND
                          cons2.constraint_name = refs.unique_constraint_name
                  WHERE ` +
      (schemaOwner && schemaOwner.length > 0 ? '(cons.constraint_schema = :schemaOwner) AND ' : '') +
      (tableName && tableName.length > 0 ? '(keycolumns.table_name = :tableName) AND ' : '') + `
                      cons.constraint_type = :constraintType
                  ORDER BY
                      cons.constraint_schema, keycolumns.table_name, cons.constraint_name, ordinal_position`;
    return knex.raw(sql, {
      schemaOwner, tableName, constraintType,
    });
  }

  return {

    getTables: (knex, schemaOwner) => {
      const sql = `SELECT 
                        s.name as 'schema',
                        o.name as 'name',
                        p.value as 'description'
                    FROM sysobjects o
                    INNER JOIN  sys.schemas s
                        ON s.schema_id = o.uid
                    LEFT JOIN sys.extended_properties p 
                        ON p.major_id = o.id
                        AND p.minor_id = 0
                        AND p.name = 'MS_Description'
                    WHERE 
                      (s.name = :schemaOwner OR :schemaOwner IS NULL) AND 
                      o.type= 'U' 
                    ORDER BY s.name, o.name
                    `;
      return knex.raw(sql, { schemaOwner });
    },

    getViewColumns: (knex, schemaOwner, viewName) => {
      const sql = `select 
                    c.TABLE_SCHEMA as 'schema', 
                    c.TABLE_NAME as 'view', 
                    COLUMN_NAME as 'name', 
                    ORDINAL_POSITION as ordinal, 
                    COLUMN_DEFAULT as [default], 
                    case when IS_NULLABLE = 'NO' then 0 else 1 end as isNullable, 
                    DATA_TYPE as dataType, 
                    CHARACTER_MAXIMUM_LENGTH as maxLength, 
                    NUMERIC_PRECISION as precision, 
                    NUMERIC_SCALE as scale, 
                    DATETIME_PRECISION as dateTimePrecision,
                    CHARACTER_SET_NAME AS characterSet, 
                    COLLATION_NAME AS collation
                    from INFORMATION_SCHEMA.COLUMNS c
                    JOIN INFORMATION_SCHEMA.VIEWS v 
                    ON c.TABLE_SCHEMA = v.TABLE_SCHEMA AND 
                    c.TABLE_NAME = v.TABLE_NAME
                    where ` +
        (schemaOwner && schemaOwner.length > 0 ? '(c.TABLE_SCHEMA = :schemaOwner) AND ' : '') +
        (viewName && viewName.length > 0 ? '(c.TABLE_NAME = :viewName) AND ' : '') + `
                    1 = 1
                    order by 
                    c.TABLE_SCHEMA, c.TABLE_NAME, ORDINAL_POSITION`;
      return knex.raw(sql, { schemaOwner, viewName });
    },

    getViewSources: (knex, schemaOwner, viewName) => {
      const sql = `SELECT
                    OBJECT_SCHEMA_NAME(o.object_id) AS 'schema',
                    OBJECT_NAME(sm.object_id) AS 'name',
                    sm.definition As 'sql'
                    FROM sys.sql_modules AS sm
                    JOIN sys.objects AS o
                    ON sm.object_id = o.object_id
                    WHERE ` +
                    (schemaOwner && schemaOwner.length > 0 ? '(OBJECT_SCHEMA_NAME(o.object_id) = :schemaOwner) AND ' : '') +
                    (viewName && viewName.length > 0 ? '(OBJECT_NAME(sm.object_id) = :viewName) AND ' : '') + `
                    (o.type='V')
                    ORDER BY o.type;`;
      return knex.raw(sql, { schemaOwner, viewName });
    },

    getTableColumns: (knex, schemaOwner, tableName) => {
      const sql = `select 
                    c.TABLE_SCHEMA as 'schema',
                    c.TABLE_NAME as 'table', 
                    COLUMN_NAME as name, 
                    ORDINAL_POSITION as ordinal, 
                    COLUMN_DEFAULT as [default], 
                    case when IS_NULLABLE = 'NO' then 0 else 1 end as isNullable, 
                    DATA_TYPE as dataType, 
                    CHARACTER_MAXIMUM_LENGTH as maxLength, 
                    NUMERIC_PRECISION as precision, 
                    NUMERIC_SCALE as scale, 
                    DATETIME_PRECISION as dateTimePrecision,
                    CHARACTER_SET_NAME AS characterSet, 
                    COLLATION_NAME AS collation
                    from INFORMATION_SCHEMA.COLUMNS c
                    JOIN INFORMATION_SCHEMA.TABLES t 
                     ON c.TABLE_SCHEMA = t.TABLE_SCHEMA AND 
                        c.TABLE_NAME = t.TABLE_NAME
                    where ` +
        (schemaOwner && schemaOwner.length > 0 ? '(c.TABLE_SCHEMA = :schemaOwner) AND ' : '') +
        (tableName && tableName.length > 0 ? '(c.TABLE_NAME = :tableName) AND ' : '') + `
                        TABLE_TYPE = 'BASE TABLE'
                     order by 
                        c.TABLE_SCHEMA, c.TABLE_NAME, ORDINAL_POSITION
                    `;
      return knex.raw(sql, { schemaOwner, tableName });
    },

    getColumnDescriptions: (knex, schemaOwner, tableName) => {
      const sql = `SELECT
                    s.name as 'schema',
                    o.name as 'table',
                    c.name as 'name',
                    p.value as 'description'
                    FROM sysobjects o
                    INNER JOIN syscolumns c
                    ON o.id = c.id
                    INNER JOIN  sys.schemas s
                    ON s.schema_id = o.uid
                    LEFT JOIN sys.extended_properties p
                    ON p.major_id = c.id
                    AND	p.minor_id = c.colid
                    AND	p.name = 'MS_Description'
                    WHERE ` +
        (schemaOwner && schemaOwner.length > 0 ? '(s.name = :schemaOwner) AND ' : '') +
        (tableName && tableName.length > 0 ? '(o.name = :tableName) AND ' : '') + `
                      o.type= 'U'
                  ORDER BY s.name, o.name`;
      return knex.raw(sql, { schemaOwner, tableName });
    },

    getComputedColumnDefinitions: (knex, schemaOwner, tableName) => {
      const sql = `SELECT 
                        s.name as 'schema',
                        o.name as 'table',
                        c.name as 'name',
                        c.definition as 'definition'
                    FROM sys.computed_columns c
                    INNER JOIN sys.all_objects o ON c.object_id = o.object_id
                    INNER JOIN sys.schemas s ON s.schema_id = o.schema_id
                    WHERE ` +
        (schemaOwner && schemaOwner.length > 0 ? '(s.name = :schemaOwner) AND ' : '') +
        (tableName && tableName.length > 0 ? '(o.name = :tableName) AND ' : '') + `
                        o.type= 'U' 
                    ORDER BY o.name, c.name`;
      return knex.raw(sql, { schemaOwner, tableName });
    },

    getIdentityDefinitions: (knex, schemaOwner, tableName) => {
      const sql = `SELECT 
                    --s.name as 'schema', 
                    o.name as 'table', 
                    c.name as 'column',
                    seed_value as 'seed',
                    increment_value as 'increment'
                    FROM sys.identity_columns c
                    INNER JOIN sys.all_objects o ON c.object_id = o.object_id
                    INNER JOIN sys.schemas s ON s.schema_id = o.schema_id
                    WHERE ` +
        (schemaOwner && schemaOwner.length > 0 ? '(s.name = :schemaOwner) AND ' : '') +
        (tableName && tableName.length > 0 ? '(o.name = :tableName) AND ' : '') + `
                    o.type= 'U' 
                    ORDER BY o.name, c.name`;
      return knex.raw(sql, { schemaOwner, tableName });
    },

    getCheckConstraints: (knex, schemaOwner, tableName) => {
      const sql = `SELECT 
                    cons.constraint_name as 'name', 
                    cons.constraint_schema as 'schema',
                    cons.table_name as 'table', 
                    cons2.check_clause AS 'expression'
                    FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS AS cons
                    INNER JOIN INFORMATION_SCHEMA.CHECK_CONSTRAINTS AS cons2
                     ON cons2.constraint_catalog = cons.constraint_catalog AND
                      cons2.constraint_schema = cons.constraint_schema AND
                      cons2.constraint_name = cons.constraint_name
                    WHERE  ` +
        (schemaOwner && schemaOwner.length > 0 ? '(cons.constraint_schema = :schemaOwner) AND ' : '') +
        (tableName && tableName.length > 0 ? '(cons.table_name = :tableName) AND ' : '') + `
                         cons.constraint_type = 'CHECK'
                    ORDER BY cons.table_name, cons.constraint_name
                    `;
      return knex.raw(sql, { schemaOwner, tableName });
    },

    getIndexes: (knex, schemaOwner, tableName) => {
      const sql = `SELECT 
                         SCHEMA_NAME(t.schema_id) as 'schema',
                         t.name as 'table',
                         ind.name as 'name',
                         col.name as 'column',
                         ind.type_desc as 'type',
                         is_primary_key as isPrimary,
                         is_unique_constraint as isUnique
                    FROM 
                         sys.indexes ind 
                    INNER JOIN 
                         sys.index_columns ic ON  ind.object_id = ic.object_id and ind.index_id = ic.index_id 
                    INNER JOIN 
                         sys.columns col ON ic.object_id = col.object_id and ic.column_id = col.column_id 
                    INNER JOIN 
                         sys.tables t ON ind.object_id = t.object_id 
                    WHERE ` +
        (schemaOwner && schemaOwner.length > 0 ? '(SCHEMA_NAME(t.schema_id) = :schemaOwner) AND ' : '') +
        (tableName && tableName.length > 0 ? '(t.name = :tableName) AND ' : '') + `
                       t.is_ms_shipped = 0 
                    ORDER BY 
                         t.name, ind.name, col.name`;
      return knex.raw(sql, { schemaOwner, tableName });
    },

    getCheckConstraintDescriptions: (knex, schemaOwner, tableName) => {
      const sql = `SELECT
                  s.name as 'schema',
                  OBJECT_NAME(o.parent_obj) as 'table',
                  cc.name as 'name',
                  p.value as 'description'
                  FROM sysobjects o
                  INNER JOIN sys.check_constraints cc ON o.id = cc.object_id
                  INNER JOIN  sys.schemas s
                  ON s.schema_id = o.uid
                  LEFT JOIN sys.extended_properties p
                  ON p.major_id = cc.object_id
                  AND	p.name = 'MS_Description'
                  WHERE ` +
        (schemaOwner && schemaOwner.length > 0 ? '(s.name = :schemaOwner) AND ' : '') +
        (tableName && tableName.length > 0 ? '(OBJECT_NAME(o.parent_obj) = :tableName) AND ' : '') + `
                  o.type= 'C'
                  ORDER BY s.name, o.name`;
      return knex.raw(sql, { schemaOwner, tableName });
    },

    getForeignKeyConstraints: (knex, schemaOwner, tableName) => getConstraints(knex, schemaOwner, tableName, 'FOREIGN KEY'),

    getUniqueKeyConstraints: (knex, schemaOwner, tableName) => getConstraints(knex, schemaOwner, tableName, 'UNIQUE'),

    getPrimaryKeyConstraints: (knex, schemaOwner, tableName) => getConstraints(knex, schemaOwner, tableName, 'PRIMARY KEY'),

    getDefaultConstraints: (knex, schemaOwner, tableName) => {
      const sql = `SELECT 
                      s.name AS 'schema', 
                      o.name AS 'table',
                      c.name AS 'column',
                      d.name AS 'name',
                      d.[definition] AS 'expression'
                  FROM sys.[default_constraints] d
                  INNER JOIN sys.objects o
                      ON o.object_id = d.parent_object_id
                  INNER JOIN sys.columns c
                      ON c.default_object_id = d.object_id
                  INNER JOIN  sys.schemas s
                      ON s.schema_id = o.schema_id
                  WHERE ` +
        (schemaOwner && schemaOwner.length > 0 ? '(s.name = :schemaOwner) AND ' : '') +
        (tableName && tableName.length > 0 ? '(o.name = :tableName) AND ' : '') + `
                  o.type= 'U' 
                  ORDER BY s.name, o.name`;
      return knex.raw(sql, { schemaOwner, tableName });
    },

    hasSequences: (knex, schemaOwner) => {
      const sql = `SELECT COUNT(*) FROM sys.objects 
                    WHERE type = 'SO' AND (schema_name(schema_id) = :schemaOwner)`;
      return knex.raw(sql, { schemaOwner });
    },

    getSequences: (knex, schemaOwner) => {
      const sql = `SELECT schema_name(schema_id) AS 'schema',
                           name                   AS 'name',
                           start_value            AS 'minValue',
                           increment              AS 'increment',
                           is_cycling             AS 'isCycling'
                    FROM   sys.sequences
                    WHERE (schema_name(schema_id) = :schemaOwner)`;
      return knex.raw(sql, { schemaOwner });
    },

    getUsers: (knex) => {
      const sql = 'select name from sysusers';
      return knex.raw(sql);
    },

    getDataTypes: (knex) => {
      const sql = `SELECT distinct
                  --OBJECT_NAME(c.OBJECT_ID) TableName,
                  --,c.name AS ColumnName,
                  --SCHEMA_NAME(t.schema_id) AS SchemaName,
                  t.name AS typeName,
                  t.is_user_defined as isUserDefined,
                  t.is_assembly_type as isAssemblyType,
                  case when c.max_length > 0 then 1 else 0 end as hasMaxLength,
                  case when c.precision > 0 then 1 else 0 end as hasPrecision,
                  case when c.scale > 0 then 1 else 0 end as hasScale
                  FROM sys.columns AS c
                  JOIN sys.types AS t ON c.user_type_id=t.user_type_id
                  --ORDER BY c.OBJECT_ID;
                  order by t.name`;
      return knex.raw(sql);
    },

    getCatalog: knex => knex.raw('select db_name() as [name]'),

    getSchemas: (knex) => {
      const sql = `SELECT distinct a.schema_id as id, a.name as [name] 
                  FROM sys.schemas a 
                    INNER JOIN sys.schemas b ON a.principal_id = b.schema_id 
                  WHERE a.schema_id = 1 or (a.schema_id >= 5 and a.schema_id <= 16000)`;
      return knex.raw(sql);
    },

    getFunctions: (knex, schemaOwner) => {
      const sql = `SELECT 
                    SPECIFIC_SCHEMA as 'schema',
                    SPECIFIC_NAME as 'name',
                    ROUTINE_DEFINITION as 'sql'
                    FROM INFORMATION_SCHEMA.ROUTINES
                    WHERE ` +
        (schemaOwner && schemaOwner.length > 0 ? '(SPECIFIC_SCHEMA = :schemaOwner) AND ' : '') + `
                        (ROUTINE_TYPE = 'FUNCTION')
                        AND ObjectProperty (Object_Id (INFORMATION_SCHEMA.ROUTINES.ROUTINE_NAME), 'IsMSShipped') = 0 and
                            (
                                select 
                                    major_id 
                                from 
                                    sys.extended_properties 
                                where 
                                    major_id = object_id(INFORMATION_SCHEMA.ROUTINES.ROUTINE_NAME) and 
                                    minor_id = 0 and 
                                    class = 1 and 
                                    name = N'microsoft_database_tools_support'
                            ) is null
                    ORDER BY SPECIFIC_SCHEMA, SPECIFIC_NAME`;
      return knex.raw(sql, { schemaOwner });
    },

    getStoredProcedures: (knex, schemaOwner) => {
      const sql = `SELECT
                    SPECIFIC_SCHEMA as 'schema',
                    SPECIFIC_NAME as 'name',
                    ROUTINE_DEFINITION as 'sql'
                    FROM INFORMATION_SCHEMA.ROUTINES
                    WHERE ` +
                      (schemaOwner && schemaOwner.length > 0 ? '(SPECIFIC_SCHEMA = :schemaOwner) AND ' : '') + `
                      (ROUTINE_TYPE = 'PROCEDURE')
                      AND ObjectProperty (Object_Id (INFORMATION_SCHEMA.ROUTINES.ROUTINE_NAME), 'IsMSShipped') = 0 and
                      (
                                select 
                                    major_id 
                                from 
                                    sys.extended_properties 
                                where 
                                    major_id = object_id(INFORMATION_SCHEMA.ROUTINES.ROUTINE_NAME) and 
                                    minor_id = 0 and 
                                    class = 1 and 
                                    name = N'microsoft_database_tools_support'
                      ) is null
                    ORDER BY SPECIFIC_SCHEMA, SPECIFIC_NAME`;
      return knex.raw(sql, { schemaOwner });
    },

    getProcedureArguments: (knex, schemaOwner) => {
      const sql = `SELECT
                      SPECIFIC_SCHEMA as 'schema',
                      SPECIFIC_NAME as 'procedureName',
                      PARAMETER_NAME as 'parameterName',
                      ORDINAL_POSITION as 'ordinal',
                      PARAMETER_MODE as 'parameterMode',
                      case when IS_RESULT = 'NO' then 0 else 1 end as 'isResult',
                      case when AS_LOCATOR = 'NO' then 0 else 1 end as 'asLocator',
                      CASE
                        WHEN DATA_TYPE IS NULL THEN USER_DEFINED_TYPE_NAME
                        WHEN DATA_TYPE = 'table type' THEN USER_DEFINED_TYPE_NAME
                        ELSE DATA_TYPE
                      END AS 'dataType',
                      CHARACTER_MAXIMUM_LENGTH as 'maxLength',
                      CHARACTER_OCTET_LENGTH as 'characterOctetLength',
                      COLLATION_CATALOG as 'collationCatalog',
                      COLLATION_SCHEMA as 'collationSchema',
                      COLLATION_NAME as 'collation',
                      CHARACTER_SET_CATALOG as 'characterSetCatalog',
                      CHARACTER_SET_SCHEMA as 'characterSetSchema',
                      CHARACTER_SET_NAME as 'characterSetName',
                      NUMERIC_PRECISION as 'precision',
                      NUMERIC_PRECISION_RADIX as 'radix',
                      NUMERIC_SCALE as 'scale',
                      DATETIME_PRECISION as 'dateTimePrecision',
                      INTERVAL_TYPE as 'intervalType',
                      INTERVAL_PRECISION as 'intervalPrecision'
                    FROM INFORMATION_SCHEMA.PARAMETERS
                    WHERE (SPECIFIC_SCHEMA = :schemaOwner)
                    ORDER BY SPECIFIC_SCHEMA, SPECIFIC_NAME, ORDINAL_POSITION, PARAMETER_NAME`;
      return knex.raw(sql, { schemaOwner });
    },

    getViews: (knex, schemaOwner) => {
      const sql = `SELECT 
                        s.name as 'schema',
                        o.name as 'name',
                        p.value as 'description'
                    FROM sysobjects o
                    INNER JOIN  sys.schemas s
                        ON s.schema_id = o.uid
                    LEFT JOIN sys.extended_properties p 
                        ON p.major_id = o.id
                        AND p.minor_id = 0
                        AND p.name = 'MS_Description'
                    WHERE ` +
        (schemaOwner && schemaOwner.length > 0 ? '(s.name = :schemaOwner) AND ' : '') + `
                      o.type= 'V' 
                    ORDER BY s.name, o.name
                    `;
      return knex.raw(sql, { schemaOwner });
    },


  };
}

const CMDS = commands();
export default CMDS;
