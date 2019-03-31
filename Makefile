NODE_BIN=./node_modules/.bin
TSC=$(NODE_BIN)/tsc
MOCHA=$(NODE_BIN)/mocha
NODEMON=$(NODE_BIN)/nodemon
TSLINT=$(NODE_BIN)/tslint
WEBPACK=$(NODE_BIN)/webpack
CYPRESS=$(NODE_BIN)/cypress

API_SERVER_DEV_MAIN=built/test/test-api-server.js

ifneq ($(CI),)
MOCHA_CI_PARAMS :=--reporter=mocha-multi-reporters --reporter-options configFile=.circleci/unit_test_reporter_config.json
CYPRESS_CI_PARAMS :=--record --reporter=mocha-multi-reporters --reporter-options configFile=.circleci/integration_test_reporter_config.json
endif

PROD_SSH_PRIVATE_KEY=./ansible/id_rsa_stash
ANSIBLE_VAULT_PASSWD_FILE=./ansible/vault_passwd

clean:
	@rm -rf built

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

e2e-plugin-install:
	cd e2e/dotsignalk; npm install; rm -rf node_modules/mdns

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

psql-test:
	@psql 'postgresql://signalk:signalk@localhost:45432/signalk'

psql-prod:
	@ssh -i $(PROD_SSH_PRIVATE_KEY) -t stash@$$(cat ./ansible/inventory) "docker exec -it signalk-stash-prod_postgis_1 /usr/local/bin/psql -U signalk"

clickhouse-client-%:
	@docker exec -it signalk-stash-$*_clickhouse-$*_1 clickhouse-client

clickhouse-dev: clickhouse-client-dev

clickhouse-test: clickhouse-client-test

ansible-initialize-prod: .check-ansible-vault-passwd
	@echo You must have passwordless SSH \& sudo to the destination host for this to work properly..
	@ansible-playbook --vault-id $(ANSIBLE_VAULT_PASSWD_FILE) -i ./ansible/inventory ./ansible/initialize-server.yml

ansible-provision-prod: .ensure-prod-ssh-keypair
	@ansible-playbook --vault-id $(ANSIBLE_VAULT_PASSWD_FILE) --private-key $(PROD_SSH_PRIVATE_KEY) -i ./ansible/inventory ./ansible/provision-server.yml -D

ansible-deploy-prod: .ensure-prod-ssh-keypair .check-tag-set
	@ansible-playbook -e docker_tag=$(TAG) --vault-id $(ANSIBLE_VAULT_PASSWD_FILE) --private-key $(PROD_SSH_PRIVATE_KEY) -i ./ansible/inventory ./ansible/deploy.yml -D

ansible-vault-edit:
	@ansible-vault edit --vault-id $(ANSIBLE_VAULT_PASSWD_FILE) ./ansible/secrets.yml

ansible-vault-view:
	@ansible-vault view --vault-id $(ANSIBLE_VAULT_PASSWD_FILE) ./ansible/secrets.yml

ssh-prod: .ensure-prod-ssh-keypair
	@ssh -i $(PROD_SSH_PRIVATE_KEY) stash@$$(cat ./ansible/inventory | cut -d' ' -f1)

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

.ensure-prod-ssh-keypair: .check-ansible-vault-passwd
	@if [ ! -f $(PROD_SSH_PRIVATE_KEY) -o ! -f $(PROD_SSH_PRIVATE_KEY).pub ]; then \
		ansible localhost -i localhost, -m copy -a "content='{{ secrets.prod.ssh.private_key }}' dest=$(PROD_SSH_PRIVATE_KEY) mode=0600" -e @./ansible/secrets.yml --connection=local --vault-id $(ANSIBLE_VAULT_PASSWD_FILE); \
		ssh-keygen -y -f $(PROD_SSH_PRIVATE_KEY) > $(PROD_SSH_PRIVATE_KEY).pub; \
	fi

.check-ansible-vault-passwd:
	@if [ ! -f $(ANSIBLE_VAULT_PASSWD_FILE) ]; then echo $(ANSIBLE_VAULT_PASSWD_FILE) missing!; exit 1; fi

.check-tag-set:
	@if [ -z "$(TAG)" ]; then echo TAG environment variable is not set!; exit 1; fi
