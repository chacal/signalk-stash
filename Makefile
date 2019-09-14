NODE_BIN=./node_modules/.bin
TSC=$(NODE_BIN)/tsc
MOCHA=$(NODE_BIN)/mocha
NODEMON=$(NODE_BIN)/nodemon
TSLINT=$(NODE_BIN)/tslint
WEBPACK=$(NODE_BIN)/webpack
CYPRESS=$(NODE_BIN)/cypress

API_SERVER_DEV_MAIN=built/test/test-api-server.js

ifneq ($(CI)$(TF_BUILD),)
MOCHA_CI_PARAMS :=--reporter=mocha-multi-reporters --reporter-options configFile=.circleci/unit_test_reporter_config.json
CYPRESS_CI_PARAMS :=--record --reporter=mocha-multi-reporters --reporter-options configFile=.circleci/integration_test_reporter_config.json
endif

ifneq ($(CI),)
# ssh-agent is used in Circle CI -> no need to pass private key as commandline parameter
ANSIBLE_WITH_AUTH = ansible-playbook
else
ANSIBLE_WITH_AUTH = ansible-playbook --private-key $(SIGNALK_STASH_PROD_SSH_PRIVATE_KEY)
endif

-include env
export

SSH_PROD := ssh -i $(SIGNALK_STASH_PROD_SSH_PRIVATE_KEY) -t stash@$$(cat ./ansible/inventory | cut -d' ' -f1)

clean:
	@rm -rf built
	@rm -rf test_reports

compile: clean
	@$(TSC)

compile-watch:
	@$(TSC) --watch

start: compile
	@node $(API_SERVER_DEV_MAIN)

start-test: compile
	@ENVIRONMENT=integration-test node $(API_SERVER_DEV_MAIN)

lint:
	@node $(TSLINT) --project tsconfig.json

lint-fix:
	@node $(TSLINT) --project tsconfig.json --fix

test: compile docker-test-up lint test-only

test-only:
	ENVIRONMENT=unit-test $(MOCHA) --require source-map-support/register --exit $(MOCHA_CI_PARAMS) built/test/**/*test.js

test-watch: compile docker-test-up lint
	@ENVIRONMENT=unit-test $(MOCHA) --require source-map-support/register --watch --reporter min built/test/**/*test.js

test-integration: cypress-run

test-all: test test-integration

cypress-run:
	@$(CYPRESS) run $(CYPRESS_CI_PARAMS)

cypress-open:
	@$(CYPRESS) open

watch:
	@$(NODEMON) $(API_SERVER_DEV_MAIN)

docker-%-up:
	@docker-compose -f docker-compose.$*.yml -p signalk-stash-$* up -d

docker-%-stop:
	@docker-compose -f docker-compose.$*.yml -p signalk-stash-$* stop

docker-%-down:
	@docker-compose -f docker-compose.$*.yml -p signalk-stash-$* down

purge-docker:
	@docker system prune -a -f

purge-test: docker-test-down purge-docker clean

purge-all: docker-dev-down docker-e2e-down purge-test

e2e-plugin-install:
	cd plugin; npm pack; cd ../e2e/dotsignalk; npm install ../../plugin/signalk-mqtt-stasher-*.tgz

e2e-up: docker-e2e-up

e2e-stop: docker-e2e-stop

e2e-down: docker-e2e-down

e2e-mqtt-account: e2e-up compile
	ENVIRONMENT=e2e node built/e2e/insertTestAccounts.js

e2e-mqtt-input: compile
	ENVIRONMENT=e2e node built/delta-inputs/mqtt-runner.js
	
e2e-api: compile
	ENVIRONMENT=e2e node $(API_SERVER_DEV_MAIN)

e2e-clickhouse-cli:
	@docker exec -it signalk-stash-e2e_clickhouse_1  clickhouse-client

e2e-sub:
	mosquitto_sub -h localhost -p 21883 -u runner -P runnerpasswort -t signalk/delta/+

dev: docker-dev-up watch

mqtt-input: compile docker-dev-up
	@node built/delta-inputs/mqtt-runner.js

psql-dev:
	@psql 'postgresql://signalk:signalk@localhost:55432/signalk'

psql-e2e:
	@psql 'postgresql://signalk:signalk@localhost:25432/signalk'

psql-test:
	@psql 'postgresql://signalk:signalk@localhost:45432/signalk'

psql-prod: .ensure-inventory
	@$(SSH_PROD) "docker exec -it signalk-stash-prod_postgis_1 /usr/local/bin/psql -U signalk"

clickhouse-client-%:
	@docker exec -it signalk-stash-$*_clickhouse_1 clickhouse-client

clickhouse-dev: clickhouse-client-dev

clickhouse-test: clickhouse-client-test

clickhouse-prod: .ensure-inventory
	@$(SSH_PROD) "docker exec -it signalk-stash-prod_clickhouse_1 clickhouse-client"

ansible-initialize-prod: .ensure-inventory .ensure-prod-ssh-keypair
	@echo You must have passwordless SSH \& sudo to the destination host for this to work properly.
	@echo Set ANSIBLE_REMOTE_USER to change the username for remote SSH connection.
	@echo Set ANSIBLE_PRIVATE_KEY_FILE to use specific private key file.
	@ansible-playbook -i ./ansible/inventory ./ansible/initialize-server.yml

ansible-provision-prod: .ensure-prod-ssh-keypair  .ensure-inventory
	@$(ANSIBLE_WITH_AUTH) -i ./ansible/inventory ./ansible/provision-server.yml -D

ansible-deploy-prod: .ensure-prod-ssh-keypair .check-tag-set  .ensure-inventory
	@$(ANSIBLE_WITH_AUTH) -e docker_tag=$(TAG) -i ./ansible/inventory ./ansible/deploy.yml -D

ssh-prod: .ensure-prod-ssh-keypair  .ensure-inventory
	@$(SSH_PROD)

docker-build-apiserver:
	@docker build -t signalkstash/api-server:latest -f Dockerfile.api-server .

docker-tag-and-push-apiserver: .check-tag-set
	@docker tag signalkstash/api-server:latest signalkstash/api-server:$(TAG)
	@docker push signalkstash/api-server:$(TAG)

docker-build-mqtt-input:
	@docker build -t signalkstash/mqtt-input:latest -f Dockerfile.mqtt-input .

docker-tag-and-push-mqtt-input: .check-tag-set
	@docker tag signalkstash/mqtt-input:latest signalkstash/mqtt-input:$(TAG)
	@docker push signalkstash/mqtt-input:$(TAG)

docker-build-mosquitto:
	@docker build -t signalkstash/mosquitto:latest -f Dockerfile.mosquitto .

docker-tag-and-push-mosquitto:
	@docker tag signalkstash/mosquitto:latest signalkstash/mosquitto:prod
	@docker push signalkstash/mosquitto:prod

.check-tag-set:
	@if [ -z "$(TAG)" ]; then echo TAG environment variable is not set!; exit 1; fi

.ensure-inventory: .check-prod-host-set
	@if ! $$(grep -q "^$(SIGNALK_STASH_PROD_HOST) .*$$" ansible/inventory); then \
		echo "$(SIGNALK_STASH_PROD_HOST) ansible_ssh_common_args='-o StrictHostKeyChecking=no'" > ansible/inventory; \
	fi

.check-prod-host-set:
	@if [ -z "$(SIGNALK_STASH_PROD_HOST)" ]; then echo SIGNALK_STASH_PROD_HOST environment variable is not set!; exit 1; fi

# Check prod SSH key only outside Circle CI. Circle has the private key installed in the ssh-agent and thus the key file is not needed.
ifneq ($(CI),)
.ensure-prod-ssh-keypair:
.check-prod-ssh-key-set:
else
.ensure-prod-ssh-keypair: .check-prod-ssh-key-set
	@if [ ! -f $(SIGNALK_STASH_PROD_SSH_PRIVATE_KEY) ]; then \
		echo 'SSH key for prod missing! Looked for "$(SIGNALK_STASH_PROD_SSH_PRIVATE_KEY)". Set SIGNALK_STASH_PROD_SSH_PRIVATE_KEY to use different file.'; \
		exit 1; \
	fi
	@if [ ! -f $(SIGNALK_STASH_PROD_SSH_PRIVATE_KEY).pub ]; then \
		ssh-keygen -y -f $(SIGNALK_STASH_PROD_SSH_PRIVATE_KEY) > $(SIGNALK_STASH_PROD_SSH_PRIVATE_KEY).pub; \
	fi

.check-prod-ssh-key-set:
	@if [ -z "$(SIGNALK_STASH_PROD_SSH_PRIVATE_KEY)" ]; then echo SIGNALK_STASH_PROD_SSH_PRIVATE_KEY environment variable is not set!; exit 1; fi
endif