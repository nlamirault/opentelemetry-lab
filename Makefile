# SPDX-FileCopyrightText: Copyright (C) Nicolas Lamirault <nicolas.lamirault@gmail.com>
# SPDX-License-Identifier: Apache-2.0

BANNER = O P E N T E L E M E T R Y / L A B

SHELL = /bin/bash -o pipefail

DIR = $(shell pwd)

NO_COLOR=\033[0m
OK_COLOR=\033[32;01m
ERROR_COLOR=\033[31;01m
WARN_COLOR=\033[33;01m
INFO_COLOR=\033[36m
WHITE_COLOR=\033[1m

MAKE_COLOR=\033[33;01m%-20s\033[0m

.DEFAULT_GOAL := help

OK=[✅]
KO=[🔴]
WARN=[⚠️]
INFO=[🔵]

.PHONY: help
help:
	@echo -e "$(OK_COLOR)      $(BANNER)$(NO_COLOR)"
	@echo "------------------------------------------------------------------"
	@echo ""
	@awk 'BEGIN {FS = ":.*##"; printf "Usage: make ${INFO_COLOR}<target>${NO_COLOR}\n"} /^[a-zA-Z_-]+:.*?##/ { printf "  ${INFO_COLOR}%-35s${NO_COLOR} %s\n", $$1, $$2 } /^##@/ { printf "\n${WHITE_COLOR}%s${NO_COLOR}\n", substr($$0, 5) } ' $(MAKEFILE_LIST)
	@echo ""

guard-%:
	@if [ "${${*}}" = "" ]; then \
		echo -e "$(ERROR_COLOR)Environment variable $* not set$(NO_COLOR)"; \
		exit 1; \
	fi

check-%:
	@if $$(hash $* 2> /dev/null); then \
		echo -e "$(OK_COLOR)$(OK)$(NO_COLOR) $*"; \
	else \
		echo -e "$(ERROR_COLOR)$(KO)$(NO_COLOR) $*"; \
	fi

##@ Development

.PHONY: build
build: guard-APP ## Build Docker image
	@echo -e "$(INFO)$(INFO_COLOR)[Docker] Build image for $(APP)$(NO_COLOR)"
	@docker buildx build -f apps/$(APP)/Dockerfile apps/$(APP) --tag opentelemetry-lab/otel-$(APP):latest

.PHONY: run
run: guard-APP ## Launch Docker image
	@echo -e "$(INFO)$(INFO_COLOR)[Docker] Running image for $(APP)$(NO_COLOR)"
	@docker run --rm opentelemetry-lab/otel-$(APP):latest

.PHONY: start-observability
start-observability: guard-CHOICE ## Start the observability stack
	@echo -e "$(INFO)$(INFO_COLOR)[Docker-Compose] Starting lab using $(CHOICE)$(NO_COLOR)"
	@docker-compose -f docker-compose-core.yaml -f docker-compose-$(CHOICE).yaml up -d

.PHONY: stop-observability
stop-observability: guard-CHOICE ## Stop the observability stack
	@echo -e "$(INFO)$(INFO_COLOR)[Docker-Compose] Stopping lab using $(CHOICE) $(NO_COLOR)"
	@docker-compose -f docker-compose-core.yaml -f docker-compose-$(CHOICE).yaml down --remove-orphans

.PHONY: logs-observability
logs-observability: guard-CHOICE guard-SERVICE ## Display logs of observability stack
	@echo -e "$(INFO)$(INFO_COLOR)[Docker-Compose] Display logs using $(CHOICE) $(SERVICE)$(NO_COLOR)"
	@docker-compose -f docker-compose-core.yaml -f docker-compose-$(CHOICE).yaml logs -f $(SERVICE)

.PHONY: start-apps
start-apps: ## ## Start the applications
	@echo -e "$(INFO)$(INFO_COLOR)[Docker-Compose] Starting applications $(NO_COLOR)"
	@docker-compose -f docker-compose-core.yaml -f docker-compose-apps.yaml up -d

.PHONY: stop-apps
stop-apps: ## Stop the applications
	@echo -e "$(INFO)$(INFO_COLOR)[Docker-Compose] Stopping applications $(NO_COLOR)"
	@docker-compose -f docker-compose-core.yaml -f docker-compose-apps.yaml down --remove-orphans

.PHONY: logs-apps
logs-apps: guard-SERVICE ## Display logs of the application
@echo -e "$(INFO)$(INFO_COLOR)[Docker-Compose] Display logs application: $(SERVICE) $(NO_COLOR)"
	@docker-compose -f docker-compose-core.yaml -f docker-compose-apps.yaml logs -f $(SERVICE)

.PHONE: d2-build
d2-build: ## Generate architecture diagram
	@d2 doc/diagram.d2
