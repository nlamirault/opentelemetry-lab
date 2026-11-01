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

##@ Docker

.PHONY: build
build: guard-APP ## Build Docker image
	@echo -e "$(INFO)$(INFO_COLOR)[Docker] Build image for $(APP)$(NO_COLOR)"
	@docker buildx build -f apps/$(APP)/Dockerfile apps/$(APP) --tag opentelemetry-lab/otel-$(APP):latest

.PHONY: run
run: guard-APP ## Launch Docker image
	@echo -e "$(INFO)$(INFO_COLOR)[Docker] Running image for $(APP)$(NO_COLOR)"
	@docker run --rm opentelemetry-lab/otel-$(APP):latest

##@ Usage

# Backend selection uses native Docker Compose profiles.
# CHOICE = lgtm | signoz | greptimedb | victoriastack
# You can also skip make entirely:
#   docker compose --profile lgtm --profile apps up -d
#   COMPOSE_PROFILES=lgtm,apps docker compose up -d

.PHONY: up-otel
up-otel: guard-CHOICE ## Start a backend + apps (CHOICE=lgtm|signoz|greptimedb|victoriastack)
	@echo -e "$(INFO)$(INFO_COLOR)[Compose] Starting lab: $(CHOICE)$(NO_COLOR)"
	@docker compose --profile $(CHOICE) up -d

.PHONY: up-apps
up-apps:
	@echo -e "$(INFO)$(INFO_COLOR)[Compose] Starting lab: apps$(NO_COLOR)"
	@docker compose --profile apps up -d

.PHONY: down
down: ## Stop everything (all profiles)
	@echo -e "$(INFO)$(INFO_COLOR)[Compose] Stopping lab$(NO_COLOR)"
	@docker compose down --remove-orphans

.PHONY: logs
logs: guard-SERVICE ## Tail logs of a service (SERVICE=otel-go)
	@echo -e "$(INFO)$(INFO_COLOR)[Compose] Logs: $(SERVICE)$(NO_COLOR)"
	@docker compose logs -f $(SERVICE)

.PHONY: ps
ps: ## List running services
	@docker compose ps

.PHONE: d2-build
d2-build: ## Generate architecture diagram
	@d2 doc/diagram.d2

##@ Schema

SCHEMA_DIR = schemas/opentelemetry-lab
SCHEMA_DEPS = $(SCHEMA_DIR)/.deps

# The semconv version comes from the dependency `schema_url` in the manifest.
SEMCONV_VERSION ?= $(shell sed -n 's|.*schema_url: https://opentelemetry.io/schemas/||p' $(SCHEMA_DIR)/model/manifest.yaml)

WEAVER_IMAGE = otel/weaver:v0.28.0@sha256:5857bb81d8cc7ed608cdcae37c4b459eb020f21dd4acade35f7933cd6762fbcc
WEAVER_DIAGNOSTIC_FORMAT ?= ansi

# The image runs as the non-root user `weaver`: map the caller so bind-mount
# writes work. Weaver resolves the manifest `registry_path` against its working
# directory, and loads nothing when the registry is given as `.`, so it runs
# from the schema directory with absolute paths.
WEAVER = docker run --rm -u $$(id -u):$$(id -g) -e HOME=/tmp \
	-v $(DIR):/src -w /src/$(SCHEMA_DIR) $(WEAVER_IMAGE)
WEAVER_REGISTRY = /src/$(SCHEMA_DIR)/model
WEAVER_POLICIES = /src/$(SCHEMA_DIR)/policies

# Git ref `schema-diff` compares against.
SCHEMA_BASELINE ?= origin/main
SCHEMA_BASELINE_DIR = $(SCHEMA_DEPS)/baseline

.PHONY: schema-deps
schema-deps: $(SCHEMA_DEPS)/semconv-v$(SEMCONV_VERSION)/model/manifest.yaml ## Fetch the upstream semconv model

$(SCHEMA_DEPS)/semconv-v%/model/manifest.yaml:
	@echo -e "$(INFO)$(INFO_COLOR)[Schema] Fetch semantic conventions v$*$(NO_COLOR)"
	@mkdir -p $(SCHEMA_DEPS)
	@tmp=$$(mktemp -d $(SCHEMA_DEPS)/semconv.XXXXXX) && \
		curl -fsSL https://github.com/open-telemetry/semantic-conventions/archive/refs/tags/v$*.tar.gz \
			| tar -xz -C $$tmp --strip-components=1 semantic-conventions-$*/model && \
		rm -rf $(SCHEMA_DEPS)/semconv-v$* && mv $$tmp $(SCHEMA_DEPS)/semconv-v$*

.PHONY: schema-check
schema-check: schema-deps ## Check the registry against the policies
	@echo -e "$(INFO)$(INFO_COLOR)[Schema] Check registry$(NO_COLOR)"
	@$(WEAVER) registry check -r $(WEAVER_REGISTRY) -p $(WEAVER_POLICIES) \
		--diagnostic-format $(WEAVER_DIAGNOSTIC_FORMAT)

.PHONY: schema-policy-test
schema-policy-test: schema-deps ## Check that each policy rejects its fixture
	@echo -e "$(INFO)$(INFO_COLOR)[Schema] Test policies$(NO_COLOR)"
	@status=0; \
	for fixture in $(SCHEMA_DIR)/policies/testdata/*/; do \
		rule=$$(basename $$fixture); \
		if out=$$($(WEAVER) registry check -r /src/$${fixture%/} -p $(WEAVER_POLICIES) --diagnostic-format json 2>&1); then \
			echo -e "$(ERROR_COLOR)$(KO)$(NO_COLOR) $$rule: fixture accepted"; status=1; \
		elif echo "$$out" | grep -Eq "\"id\": *\"$$rule\""; then \
			echo -e "$(OK_COLOR)$(OK)$(NO_COLOR) $$rule"; \
		else \
			echo -e "$(ERROR_COLOR)$(KO)$(NO_COLOR) $$rule: rejected without a $$rule finding"; echo "$$out"; status=1; \
		fi; \
	done; \
	exit $$status

.PHONY: schema-docs
schema-docs: schema-deps ## Generate the registry docs
	@echo -e "$(INFO)$(INFO_COLOR)[Schema] Generate docs$(NO_COLOR)"
	@$(WEAVER) registry generate -r $(WEAVER_REGISTRY) -p $(WEAVER_POLICIES) \
		-t /src/$(SCHEMA_DIR)/templates --diagnostic-format $(WEAVER_DIAGNOSTIC_FORMAT) \
		markdown /src/$(SCHEMA_DIR)/docs

.PHONY: schema-docs-check
schema-docs-check: schema-docs ## Check the committed registry docs are up to date
	@if [ -n "$$(git status --porcelain -- $(SCHEMA_DIR)/docs)" ]; then \
		git --no-pager diff -- $(SCHEMA_DIR)/docs; \
		echo -e "$(ERROR_COLOR)$(KO)$(NO_COLOR) $(SCHEMA_DIR)/docs is stale: run 'make schema-docs' and commit the result"; \
		exit 1; \
	fi

.PHONY: schema-diff
schema-diff: schema-deps ## Diff the registry against a git ref (SCHEMA_BASELINE=origin/main)
	@if ! git cat-file -e $(SCHEMA_BASELINE):$(SCHEMA_DIR)/model/manifest.yaml 2>/dev/null; then \
		echo "No registry at $(SCHEMA_BASELINE): nothing to diff."; \
		exit 0; \
	fi; \
	rm -rf $(SCHEMA_BASELINE_DIR) && mkdir -p $(SCHEMA_BASELINE_DIR) && \
	git archive $(SCHEMA_BASELINE) $(SCHEMA_DIR)/model | tar -x -C $(SCHEMA_BASELINE_DIR) && \
	version=$$(sed -n 's|.*schema_url: https://opentelemetry.io/schemas/||p' $(SCHEMA_BASELINE_DIR)/$(SCHEMA_DIR)/model/manifest.yaml) && \
	$(MAKE) -s --no-print-directory $(SCHEMA_DEPS)/semconv-v$$version/model/manifest.yaml && \
	$(WEAVER) registry diff -r $(WEAVER_REGISTRY) \
		--baseline-registry /src/$(SCHEMA_BASELINE_DIR)/$(SCHEMA_DIR)/model \
		--format markdown --diagnostic-format $(WEAVER_DIAGNOSTIC_FORMAT)
