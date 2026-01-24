# Changelog

All notable changes to the "SysML v2 Language Support" extension will be documented in this file.

## [0.2.2-alpha] - 2026-01-24

### Added
- **Type Definition Navigation** (`textDocument/typeDefinition`) - Navigate from usages directly to their type definitions
- **Clickable Relationships in Hover** - Relationships now render as markdown links, click to navigate to specialization targets, type definitions, etc.
- **Range Formatting** (`textDocument/rangeFormatting`) - Format selected code ranges instead of entire documents

### Changed
- Hover content now uses `MarkupContent` with `MarkupKind::Markdown` for proper link rendering

### Dependencies
- syster-lsp v0.2.1-alpha (from GitHub releases)
- syster-base v0.2.1-alpha

## [0.2.1-alpha] - 2026-01-23

### Fixed
- Re-release to fix Open VSX publishing issue

### Dependencies
- syster-lsp v0.2.0-alpha (from GitHub releases)
- syster-base v0.2.0-alpha

## [0.2.0-alpha] - 2026-01-23

### Fixed
- **Semantic token positioning** - Fixed 134 bogus tokens at position (0,0) overriding correct package highlighting
- Added validation filter to skip symbols with invalid span data in semantic tokens

### Changed
- Updated to Rust edition 2024 with let-chains and improved lifetime handling
- Improved code style with more concise conditional expressions

### Dependencies
- syster-lsp v0.2.0-alpha (from GitHub releases)
- syster-base v0.2.0-alpha

## [0.1.13-alpha] - 2026-01-21

### Added
- **Cross-platform binary support** - Downloads pre-built binaries from GitHub releases
- Support for Linux (x64), macOS (x64, ARM64), and Windows (x64)
- Automatic fallback to `cargo install` if pre-built binary unavailable

### Changed
- Build server script now downloads from GitHub releases instead of compiling locally
- Simplified build process - no longer requires Rust toolchain for users

### Dependencies
- syster-lsp v0.1.13-alpha (from GitHub releases)
- syster-base v0.1.12-alpha

## [0.1.12-alpha] - 2026-01-21

### Added
- **SysML standard library bundled with extension** - No more external stdlib setup required
- Support for `Dependency` elements in SysML models
- Expression references tracking in Usage and Element structures
- Feature chain context support for relationship types
- `Transition` support in UsageKind and SemanticRole
- Import phase resolution with scope-aware symbol lookup
- Enhanced `Comment` structure with `about` references

### Improved
- **Name resolution performance** - Optimized scope chain walking for direct symbols
- **Import resolution** - Prevents infinite recursion when resolving imports
- **ReferenceIndex** - Enhanced indexing with 200+ lines of improvements for faster lookups
- **Symbol table** - Improved lookup and scope handling with better caching
- **Parser performance** - Significantly enhanced SysML AST parsing (1400+ lines of parser improvements)
- **Semantic visitor** - Optimized SysML visitor with 600+ lines of enhancements
- Documentation whitespace trimming in hover tooltips
- Better span information for all AST elements

### Fixed
- Alias resolution edge cases
- Constraints and perform action parsing
- Symbol::Comment handling across all LSP features
- Test suite optimizations (disabled stdlib in unit tests for 10x faster CI)

### Dependencies
- syster-lsp v0.1.12-alpha (from crates.io)
- syster-base v0.1.12-alpha

## [0.1.9-alpha] - 2026-01-19

### Added
- Documentation comments now displayed in hover tooltips
- LSP server binary bundled directly from crates.io (`syster-lsp v0.1.10-alpha`)

### Improved
- Symbol lookup uses ReferenceIndex for more accurate hover on type references
- Simplified server-locator.ts (config path + bundled path only)
- Build process uses `cargo install` from crates.io for reproducible builds

### Dependencies
- syster-lsp v0.1.10-alpha (from crates.io)
- syster-base v0.1.11-alpha

## [0.1.8-alpha] - 2026-01-15

### Added
- New diagram viewer extension (`syster-viewer`) for visualizing SysML models
- New diagram modeller extension (`syster-modeller`) for interactive model editing
- Custom LSP endpoint `syster/getDiagram` for diagram data retrieval
- React Flow based webview for rendering diagrams

### Fixed
- Replaced deprecated `all_symbols()` with `iter_symbols()` in diagram endpoint
- Fixed relationship extraction to use symbol data directly instead of hardcoded typing
- Fixed webview bundling to use esbuild with proper `import.meta` handling for VS Code compatibility
- Added `isDisposed` guard in diagram panel to prevent "Webview is disposed" errors
- Restored `sysml-language-support` package name for marketplace compatibility
- Updated CI workflow paths for refactored extension structure

### Improved
- Simplified kind mapping in diagram endpoint (pass through directly)
- Better error handling for disposed webviews during async operations

## [0.1.7-alpha] - 2026-01-11

### Fixed
- Semantic token highlighting for feature chains like `pwrCmd.pwrLevel` now highlights each identifier separately
- Semantic token highlighting for qualified names like `SysML::Usage` works correctly with stdlib
- Token span calculation no longer includes trailing whitespace
- Path normalization ensures consistent file matching between symbol table and reference index

### Added
- Path utilities module (`path_utils.rs`) for consistent file path handling across the codebase
- Separate reference extraction for feature chain parts (each identifier gets its own span)
- TokenType enum for semantic token classification (Type, Property, etc.)

### Improved
- Grammar rules `owned_feature_chain` and `qualified_name` are now atomic for precise span calculation
- Quote stripping for qualified names with quoted parts like `'Foo'::'Bar'`
- Enhanced reference indexing with proper token type classification

## [0.1.6-alpha] - 2026-01-09

### Improved
- Consolidated KerML grammar with unified rules for better maintainability
- Added unified patterns: `any_relationship`, `feature_or_chain`, `classifier_relationships`, `ordering_modifiers`, `feature_prefix_modifiers`, `connector_feature_modifiers`, `type_body`, `feature_declaration`
- Synchronized all keywords across parser, code completion, and syntax highlighting
- Added missing keywords: `meta`, `multiplicity`, `new`, `var`, `variation`, `references`

### Fixed
- Fixed `readonly` and `derived` feature modifier detection in AST parsing
- Corrected multiple test cases with invalid KerML syntax

## [0.1.5-alpha] - 2026-01-08

### Fixed
- Code formatting and import ordering consistency across codebase

## [0.1.4-alpha] - 2026-01-08

### Added
- Grammar support for `satisfy X by Y` requirement satisfaction syntax
- Grammar support for measurement references `value@[unit]` (e.g., `5@[SI::kg]`)
- Grammar support for interface end crosses operator `=>` (e.g., `port => Target::input`)
- Grammar support for function/calculation definitions with parameters and return types
- Grammar support for action usages with parameter lists

### Fixed
- Workspace loader now continues processing files when one fails to parse
- Hover information now works correctly on quoted names (e.g., `'Data Packet'`)

### Improved
- Better error resilience when loading workspaces with syntax errors

## [0.1.3-alpha] - 2026-01-08

### Added
- Extension icon for marketplace and sidebar display

### Fixed
- Corrected icon path in package.json

## [0.1.2-alpha] - 2026-01-08

### Fixed
- Critical bug fix for extension activation
- Corrected Language Server initialization

## [0.1.1-alpha] - 2026-01-07

### Added
- Initial public release
- SysML v2 syntax highlighting
- Code completion for keywords
- Go to definition
- Find references
- Hover documentation
- Document outline
- Folding ranges
- Semantic token highlighting

## [0.1.0-alpha] - 2026-01-06

### Added
- Project scaffolding
- Basic grammar parsing
