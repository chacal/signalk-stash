#!/usr/bin/env bash
if [[ $# != 3 ]]; then
    echo "Usage: $0 <vesselid> <password> <vesselname>"
    exit 1
fi

VESSELID=$1
PASSWD=$2
VESSELNAME=$3
HASHED_PASSWD=$(docker run --rm jllopis/mosquitto np -p ${PASSWD})

echo "INSERT INTO account (username, password, mosquitto_super) VALUES ('${VESSELID}', '${HASHED_PASSWD}', false);"
echo "INSERT INTO mqtt_acl (account_id, topic, rw) VALUES ((SELECT id FROM account WHERE username = '${VESSELID}'), 'signalk/delta/${VESSELID}', 7);"
echo "INSERT INTO mqtt_acl (account_id, topic, rw) VALUES ((SELECT id FROM account WHERE username = '${VESSELID}'), 'signalk/delta/${VESSELID}/stats', 5);"
echo "INSERT INTO vessel (name, vesselid) VALUES ('${VESSELNAME}','${VESSELID}');"
