WITH RECURSIVE TableHierarchy AS (
    -- Step 1: Identify "Base" tables (tables that have no Foreign Keys)
    SELECT 
        t.table_name, 
        0 AS depth
    FROM information_schema.tables t
    LEFT JOIN information_schema.key_column_usage k 
        ON t.table_name = k.table_name 
        AND t.table_schema = k.table_schema
        AND k.referenced_table_name IS NOT NULL
    WHERE t.table_schema = 'gvc_portal_db'
      AND t.table_type = 'BASE TABLE'
      AND k.table_name IS NULL

    UNION ALL

    -- Step 2: Recursively find tables that depend on the tables already found
    SELECT 
        k.table_name, 
        th.depth + 1
    FROM information_schema.key_column_usage k
    JOIN TableHierarchy th 
        ON k.referenced_table_name = th.table_name
    WHERE k.table_schema = 'gvc_portal_db'
      AND k.referenced_table_name IS NOT NULL
      AND k.table_name <> k.referenced_table_name -- Ignore self-references
)
-- Step 3: Select the maximum depth for each table and sort
SELECT 
    table_name, 
    MAX(depth) as dependency_level,
    (SELECT COUNT(*) 
     FROM information_schema.key_column_usage k2 
     WHERE k2.table_name = th.table_name 
       AND k2.table_schema = 'gvc_portal_db'
       AND k2.referenced_table_name IS NOT NULL) as fk_count,
    (SELECT GROUP_CONCAT(DISTINCT referenced_table_name) 
     FROM information_schema.key_column_usage k3 
     WHERE k3.table_name = th.table_name 
       AND k3.table_schema = 'gvc_portal_db'
       AND k3.referenced_table_name IS NOT NULL) as depends_on
FROM TableHierarchy th
GROUP BY table_name
ORDER BY dependency_level ASC, table_name ASC;