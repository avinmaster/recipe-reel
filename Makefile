.PHONY: help install install-gpu dev run test lint fmt demo docker-build docker-run clean

PY ?= python3
VENV := .venv
BIN := $(VENV)/bin

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
	  awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-14s\033[0m %s\n", $$1, $$2}'

$(BIN)/activate:
	$(PY) -m venv $(VENV)

install: $(BIN)/activate ## Install core + dev deps into a venv
	$(BIN)/pip install -q --upgrade pip
	$(BIN)/pip install -q -r requirements-dev.txt

install-gpu: ## Install GPU perception deps (run on the AMD MI300X pod)
	pip install torch torchaudio --index-url https://download.pytorch.org/whl/rocm6.4
	pip install -r requirements-gpu.txt

dev: ## Run the API with autoreload (mock mode)
	MOCK_MODE=true $(BIN)/uvicorn app.main:app --reload --port 8000

run: ## Run the API (reads .env for real providers)
	$(BIN)/uvicorn app.main:app --host 0.0.0.0 --port 8000

test: ## Run the test suite
	$(BIN)/python -m pytest

lint: ## Lint with ruff
	$(BIN)/ruff check app tests

fmt: ## Auto-fix lint issues
	$(BIN)/ruff check --fix app tests

demo: ## End-to-end demo against a running server (mock mode ok)
	./scripts/demo.sh

docker-build: ## Build the slim container image
	docker build -t recipereel:latest .

docker-run: ## Run the container (mock mode) on :8000
	docker run --rm -p 8000:8000 recipereel:latest

clean: ## Remove caches and local data
	rm -rf .pytest_cache .ruff_cache data **/__pycache__
