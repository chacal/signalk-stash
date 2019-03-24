# Signal K Stash

Signal K Stash is a cloud deployed set of services that enable ingesting and storing Signal K data in the form of Signal K delta messages. Stored data can be accessed via a REST API.

## Developing

`make` is used for Typescript compiling, bundling frontend code, setting up development dependencies using `docker-compose` and for running test. Most important make targets are documented below. See all targets in [Makefile](Makefile). Run `npm i` to install Node dependencies before running any Make targets.

### Dependencies

`docker-compose` is used to start local development and test environment dependencies. Dependencies consist of 6 containers:

- `postgis` (Postgis development DB)
- `postgis-test` (Postgis test DB)
- `mqtt` (Mosquitto development MQTT broker)
- `mqtt-test` (Mosquitto test MQTT broker)
- `grafana` (Grafana development UI)
- `clickhouse-dev` (ClickHouse development DB)

`mqtt` container is configured to authenticate against `postgis` DB and `mqtt-test` against `postgis-test` DB.

To start all development dependencies run:

    make docker-up 

### Starting development server

    make dev

This starts development dependencies with `docker-compose` and runs development API server
using Nodemon watch for hot-reloading code changes. Development server also contains middleware for dynamically building frontend code using Webpack.

By default the development server listens on port 3000.

### Running tests

    make test

Starts development dependencies with `docker-compose` and runs tests using Mocha.

### Connecting to DB

Connect to local development DB:

    make psql-dev

Connect to local test DB:

    make psql-test

Connect to local ClickHouse DB:

    make clickhouse-dev

Connect to remote (e.g. prod) DB:

    ssh signalk-stash.chacal.fi  # SSH into the remote server
    docker exec -it signalk-stash_postgis_1 psql -U postgres signalk

### Mqtt Delta Input

Mqtt delta input can be used to subscribe to an MQTT topic for Signal K deltas and
storing them into Stash DB.

Generate new PBKDF2 password hash for a new Mqtt user:

    docker run -ti --rm jllopis/mosquitto np -p <password>

Create a new Mqtt user and add ACL:

    psql 'postgresql://signalk:signalk@localhost:55432/signalk'
    
    INSERT INTO account (username, password, mosquitto_super) 
      VALUES ('<username>', '<pwhash>', false);
      
    INSERT INTO mqtt_acl (account_id, topic, rw) VALUES (
      (SELECT id FROM account WHERE username = '<username>'), 'signalk/delta', 7
    );  -- '7' means all access rights

Start mqtt delta input:

    MQTT_USERNAME=<username> MQTT_PASSWORD=<password> make mqtt-input

Publish a new SignalK delta message that is written to the Stash by mqtt delta input:

    mosquitto_pub -t signalk/delta -p 51883 -u <username> -P <password> -m '
    {  
      "context":"vessels.urn:mrn:signalk:uuid:2204ae24-c944-5ffe-8d1d-4d411c9cea2e",
      "updates": [{  
        "source": {  
          "label":"aava",
          "type":"NMEA2000",
          "pgn":129029,
          "src":"160"
        },
        "$source":"aava.160",
        "timestamp":"2014-08-15T19:00:25.147",
        "values": [{  
          "path":"navigation.position",
          "value": {  
            "longitude":24.7361991,
            "latitude":59.724242
          }
        }]
      }]
    }'

### Stopping dependencies

    make docker-stop

Stops development docker containers using `docker-compose stop`.


# Production deployment

Deployment to production is done by running `docker-compose` against a remote Docker host. This can be achieved by adding the remote host as a "docker machine", activating it and then running `docker-compose up` for it. SSH private key needs to be copied to the target host before it can be used as a remote docker machine host.

### Docker images

The production deployment of SignalK Stash consists of the following Docker images:

    jihartik/signalk-stash-api-server     # SignalK Stash API server
    jihartik/signalk-stash-mqtt-input     # MQTT SignalK Delta input
    jihartik/signalk-stash-mosquitto      # Mosquitto MQTT broker (with custom configs)
    mdillon/postgis:10-alpine             # PostGIS DB
    
NOTE: ClickHouse is not included in the production deployment at the moment!

### Steps for production deployment:

    # Prerequisite:
    # Setup passwordless SSH into the target host by copying SSH private key there

    # Setup remote docker host locally
    docker-machine create --driver generic --generic-ip-address=signalk-stash.chacal.fi --generic-ssh-key=<path-to-ssh-key> signalk-stash
    
    # Set remote host as an active docker machine
    eval $(docker-machine env signalk-stash)
    
    # Deploy
    docker-compose -f docker-compose.prod.yml up
    
**NOTE!** Production version of the compose file fetches Docker images from the Docker Hub instead of building them locally! To build and publish new versions of all images to the Docker Hub, just push the changes to `master` branch and Docker Hub automatically builds the images. Build status can be checked at [https://hub.docker.com/u/jihartik/](https://hub.docker.com/u/jihartik/).
    
# Directory layout

## ansible

Scripts for provisioning a Linux server from scratch to be used as a SignalK Stash backend server. At the moment a Debian distribution is assumed as a base OS.

Steps to provision a new server:

- Setup the server running latest stable Debian
- Establish a passwordless SSH connectivity with sudo root access
- Add server's address to `inventory` file
- Provision the server: `ansible-playbook -i inventory stash-server.yml`
  - To provision only one server from the inventory use ansible-playbook's `--limit` option

## api-server

Node.js backend server providing REST API for accessing data stored in SignalK Stash. Also contains database access and SignalK delta handling.

## bin

Misc helper binaries

## delta-inputs

Different drivers for ingesting SignalK data (SignalK delta messages) into the SignalK Stash. At the moments contains only a driver that receives deltas from an MQTT broker.

## e2e

Docker compose file & configurations for settings up end-to-end test system.

## test

Tests for the project

## types

Type declarations for 3rd party Javascript libraries

## Project root

Support files for creating Docker containers and deploying them to both local (dev & test) and remote (prod) environments.

# License

Licensed under the Apache License, Version 2.0 (the "License").

