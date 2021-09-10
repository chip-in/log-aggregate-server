/*
 * CREATE USER
 */
CREATE USER chipinadmin WITH ENCRYPTED PASSWORD 'your.password'; -- TODO: [Caution] Please set up your user name and password.


/*
 * CREATE DATABASE
 */
CREATE DATABASE logdb WITH OWNER = chipinadmin ENCODING = 'UTF8';

/*
 * CREATE TABLE
 */
\c logdb;

CREATE TABLE messages (
  fqdn      varchar(63) NOT NULL,
  code      integer NOT NULL,
  language  char(5) NOT NULL,
  message   text,
  CONSTRAINT messages_pkey PRIMARY KEY(fqdn, code, language)
);
ALTER TABLE messages OWNER TO chipinadmin;

CREATE TABLE sessions (
  session_id      char(8) NOT NULL,
  start_time      timestamp,
  node_class      varchar(63),
  node_name       varchar(63),
  uid             varchar(63),
  org             varchar(63),
  dev             varchar(63),
  ua              varchar(255),
  registered_time timestamp,
  time_offset     integer,
  remote_address  varchar(15),
  remote_port     varchar(15),
  CONSTRAINT sessions_pkey PRIMARY KEY(session_id)
);
ALTER TABLE sessions OWNER TO chipinadmin;

CREATE TABLE logs (
  session_id      char(8),
  start_time      timestamp,
  merge_count     integer,
  end_time        timestamp,
  fqdn            varchar(63),
  code            integer,
  level           integer,
  string1         text,
  string2         text,
  string3         text,
  string4         text,
  timestamp1      timestamp,
  timestamp2      timestamp,
  timestamp3      timestamp,
  timestamp4      timestamp,
  integer1        integer,
  integer2        integer,
  integer3        integer,
  integer4        integer,
  message         text
);
ALTER TABLE logs OWNER TO chipinadmin;
