/*
 * [Caution]
 * 
 * When updating the version of chipin/log-aggregate-server from 0.0.5 or lower to 0.1.1-, you need to add a column in the table.  
 *
 */

/*
 * UPDATE TABLE
 */
\c logdb;

ALTER TABLE logs ADD COLUMN message text;
