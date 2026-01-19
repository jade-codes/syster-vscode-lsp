.PHONY: help install test lint typecheck build run-guidelines package clean

help:
	@echo "Available targets:"
	@echo "  install        - Install dependencies"
	@echo "  test           - Run tests"
	@echo "  lint           - Run linter"
	@echo "  typecheck      - Run type checker"
	@echo "  build          - Build extension"
	@echo "  run-guidelines - Run complete validation"
	@echo "  package        - Package extension"
	@echo "  clean          - Clean build artifacts"

install:
	npm ci

test:
	npm test

lint:
	npm run lint

typecheck:
	npx tsc --noEmit

build:
	npm run compile

run-guidelines:
	@echo "=== Running Complete Validation Pipeline ==="
	@echo ""
	@echo "Step 1/4: Type checking..."
	@npx tsc --noEmit
	@echo "✓ Type check passed"
	@echo ""
	@echo "Step 2/4: Linting..."
	@npm run lint
	@echo "✓ Linting passed"
	@echo ""
	@echo "Step 3/4: Testing..."
	@npm test
	@echo "✓ Tests passed"
	@echo ""
	@echo "Step 4/4: Building..."
	@npm run compile
	@echo ""
	@echo "=== ✓ All guidelines passed! ==="

package:
	@echo "Installing LSP server from crates.io..."
	@cargo install syster-lsp --version 0.1.10-alpha --root ./server-install --force
	@echo "Copying server binary..."
	@mkdir -p server
	@cp ./server-install/bin/syster-lsp server/syster-lsp-$$(uname -s | tr '[:upper:]' '[:lower:]')-$$(uname -m | sed 's/x86_64/x64/' | sed 's/aarch64/arm64/')
	@rm -rf ./server-install
	@echo "Packaging extension..."
	@npx vsce package
	@echo "✓ Package created"

clean:
	rm -rf node_modules out dist *.vsix server/ server-install/
