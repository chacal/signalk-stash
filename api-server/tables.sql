CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS trackpoint (
  context   TEXT,
  timestamp TIMESTAMP WITH TIME ZONE,
  point     GEOGRAPHY(Point, 4326) NOT NULL,
  PRIMARY KEY (context, timestamp)
);

CREATE TABLE IF NOT EXISTS account (
  id              UUID DEFAULT uuid_generate_v4() NOT NULL,
  username        TEXT UNIQUE                     NOT NULL,
  password        TEXT                            NOT NULL,
  mosquitto_super BOOLEAN                         NOT NULL,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS mqtt_acl (
  account_id UUID NOT NULL REFERENCES account (id) ON DELETE CASCADE,
  topic      TEXT NOT NULL,
  rw         INT  NOT NULL,
  PRIMARY KEY (account_id, topic)
);
