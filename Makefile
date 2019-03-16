NODE_BIN=./node_modules/.bin
TSC=$(NODE_BIN)/tsc
MOCHA=$(NODE_BIN)/mocha
NODEMON=$(NODE_BIN)/nodemon
TSLINT=$(NODE_BIN)/tslint
WEBPACK=$(NODE_BIN)/webpack

API_SERVER_MAIN=built/api-server/index.js

clean:
	@rm -rf built

compile: clean
	@$(TSC)

compile-watch:
	@$(TSC) --watch

start: compile
	@node $(API_SERVER_MAIN)

lint:
	@node $(TSLINT) --project tsconfig.json

lint-fix:
	@node $(TSLINT) --project tsconfig.json --fix

test: compile docker-up lint
	@ENVIRONMENT=test $(MOCHA) --require source-map-support/register --exit built/test/**/*test.js

test-watch: compile docker-up lint
	@ENVIRONMENT=test $(MOCHA) --require source-map-support/register --watch --reporter min built/test/**/*test.js

watch:
	@$(NODEMON) $(API_SERVER_MAIN)

docker-up:
	@docker-compose -f docker-compose.dev.yml -p signalk-stash up -d

docker-stop:
	@docker-compose -f docker-compose.dev.yml -p signalk-stash stop

docker-down:
	@docker-compose -f docker-compose.dev.yml -p signalk-stash down

dev: docker-up watch

mqtt-input: compile docker-up
	@node built/delta-inputs/mqtt-runner.js

psql-dev:
	@psql 'postgresql://signalk:signalk@localhost:50400/signalk'

psql-test:
	@psql 'postgresql://signalk:signalk@localhost:50500/signalk'

clickhouse-dev:
	@docker exec -it signalk-stash_clickhouse-dev_1 clickhouse-client

webpack-prod:
	@$(WEBPACK) -p
