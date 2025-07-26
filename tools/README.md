# Documentation Validation Tools

This directory contains tools for validating and maintaining the project documentation.

## Available Tools

### Link Checker (`docs-link-checker.js`)
Validates internal links within documentation files to ensure they point to existing files.

```bash
# Check all internal documentation links
npm run check-docs-links
```

**Features:**
- Scans all `.md` files in the docs directory
- Validates internal links (excludes external URLs)
- Reports broken links with file and line numbers
- Handles relative path resolution

### Code Validator (`docs-code-validator.js`)
Validates code examples within documentation files to ensure they are syntactically correct.

```bash
# Validate all code examples in documentation
npm run validate-docs-code
```

**Supported Languages:**
- JavaScript/TypeScript (syntax checking)
- JSON (parsing validation)
- Shell/Bash (basic validation)
- Rust (compilation checking if rustc available)

**Features:**
- Extracts code blocks from markdown files
- Validates syntax for supported languages
- Reports errors with file and line numbers
- Warns about potentially dangerous commands

### Combined Validation
Run both tools together for complete documentation validation:

```bash
# Run all documentation validation
npm run validate-docs

# Quick validation (links only)
npm run validate-docs-quick
```

## Usage in CI/CD

Add documentation validation to your CI/CD pipeline:

```yaml
name: Documentation Validation
on: [push, pull_request]
jobs:
  validate-docs:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '16'
      - name: Install dependencies
        run: cd tools && npm install
      - name: Validate documentation
        run: cd tools && npm run validate-docs
```

## Tool Configuration

Both tools can be configured by modifying their constructor parameters:

```javascript
// Custom docs path
const checker = new DocumentationLinkChecker('../custom-docs');
const validator = new DocumentationCodeValidator('../custom-docs');
```

## Error Types

### Link Checker Errors
- `broken_link`: Internal link points to non-existent file
- `missing_file`: Referenced file does not exist

### Code Validator Errors
- `syntax_error`: JavaScript/TypeScript syntax error
- `json_error`: Invalid JSON format
- `rust_syntax_error`: Rust compilation error

### Warnings
- `typescript_check_skipped`: TypeScript compiler not available
- `rust_check_skipped`: Rust compiler not available
- `shell_complexity`: Complex shell command detected
- `dangerous_command`: Potentially dangerous command found
- `empty_code_block`: Code block contains no content

## Dependencies

The tools use only Node.js built-in modules:
- `fs` - File system operations
- `path` - Path manipulation
- `child_process` - External command execution

No additional npm dependencies are required for basic functionality.

## Extending the Tools

### Adding New Language Support

To add support for a new language in the code validator:

1. Add a new validation method:
```javascript
validateNewLanguageCode(codeBlock) {
  // Validation logic here
  return true; // or false if invalid
}
```

2. Add the language to the switch statement in `validateCodeBlock()`:
```javascript
case 'newlanguage':
  return this.validateNewLanguageCode(codeBlock);
```

### Custom Validation Rules

Both tools can be extended with custom validation rules by modifying the respective validation methods.

## Troubleshooting

### Common Issues

**Issue**: "ENOENT: no such file or directory, scandir 'docs'"
**Solution**: Run tools from the correct directory or adjust the docs path

**Issue**: TypeScript/Rust validation skipped
**Solution**: Install the respective compilers (`tsc`, `rustc`) for full validation

**Issue**: False positives in shell validation
**Solution**: Adjust the dangerous command patterns in `validateShellCode()`

## Contributing

When adding new validation features:
1. Follow the existing error/warning reporting format
2. Add appropriate tests for new functionality
3. Update this README with new features
4. Consider performance impact for large documentation sets
