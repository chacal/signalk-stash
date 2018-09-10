# SignalK Stash

SignalK Stash is a cloud deployed set of services that enable ingesting and storing SignalK data in the form of SignalK delta messages. Stored data can be accessed via a REST API.

# Developing

## Setting up development environment

### Dependencies

Use `docker-compose` to start local development and test environment dependencies:

    docker-compose -f docker-compose.dev.yml up
    
This starts 4 containers:

- `postgis` (Postgis development DB)
- `postgis-test` (Postgis test DB)
- `mqtt` (Mosquitto development MQTT broker)
- `mqtt-test` (Mosquitto test MQTT broker)

`mqtt` container is configured to authenticate against `postgis` DB and `mqtt-test` against `postgis-test` DB.

### API server

    npm run start  # or "npm run watch" to start with nodemon watch

By default the development API server listens on port 3000.

### Mqtt Delta Input

Generate new PBKDF2 password hash for a new Mqtt user:

    docker run -ti --rm jllopis/mosquitto np -p <password>

Create a new Mqtt user and add ACL:

    psql 'postgresql://signalk:signalk@localhost:50400/signalk'
    
    INSERT INTO account (username, password, mosquitto_super) 
      VALUES ('<username>', '<pwhash>', false);
      
    INSERT INTO mqtt_acl (account_id, topic, rw) VALUES (
      (SELECT id FROM account WHERE username = '<username>'), 'signalk/delta', 7
    );  -- '7' means all access rights

Start mqtt delta input:

    MQTT_USERNAME=<username> MQTT_PASSWORD=<password> npm run mqtt-input

Publish a new SignalK delta message that is written to the Stash by mqtt delta input:

    mosquitto_pub -t signalk/delta -u <username> -P <password> -m '
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

## Running test

    docker-compose -f docker-compose.dev.yml up.  # Start dev dependencies
    npm run test                                  # Run tests


## Connecting to DB

Connect to local development DB:

    psql 'postgresql://signalk:signalk@localhost:50400/signalk'

Connect to local test DB:

    psql 'postgresql://signalk:signalk@localhost:50500/signalk'

Connect to remote (e.g. prod) DB:

    ssh signalk-stash.chacal.fi  # SSH into the remote server
    docker exec -it signalk-stash_postgis_1 psql -U postgres signalk

# Production deployment

Deployment to production is done by running `docker-compose` against a remote Docker host. This can be achieved by adding the remote host as a "docker machine", activating it and then running `docker-compose up` for it. SSH private key needs to be copied to the target host before it can be used as a remote docker machine host.

### Docker images

The production deployment of SignalK Stash consists of the following Docker images:

    jihartik/signalk-stash-api-server     # SignalK Stash API server
    jihartik/signalk-stash-mqtt-input     # MQTT SignalK Delta input
    jihartik/signalk-stash-mosquitto      # Mosquitto MQTT broker (with custom configs)
    mdillon/postgis:10-alpine             # PostGIS DB

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

## delta-inputs

Different drivers for ingesting SignalK data (SignalK delta messages) into the SignalK Stash. At the moments contains only a driver that receives deltas from an MQTT broker.

## test

Tests for the project

## Project root

Support files for creating Docker containers and deploying them to both local (dev & test) and remote (prod) environments.

