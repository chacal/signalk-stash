#!/usr/bin/env bash
if [[ $# != 3 ]]; then
    echo "Usage: $0 <username> <password> <topic>"
    exit 1
fi

USERNAME=$1
PASSWD=$2
TOPIC=$3
HASHED_PASSWD=$(docker run --rm jllopis/mosquitto np -p ${PASSWD})

echo "INSERT INTO account (username, password, mosquitto_super) VALUES ('${USERNAME}', '${HASHED_PASSWD}', false);"
echo "INSERT INTO mqtt_acl (account_id, topic, rw) VALUES ((SELECT id FROM account WHERE username = '${USERNAME}'), '${TOPIC}', 7);"