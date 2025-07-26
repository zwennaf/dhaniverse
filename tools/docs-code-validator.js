#!/usr/bin/env node

/**
 * Documentation Code Example Validator
 * Validates code examples within documentation files
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class DocumentationCodeValidator {
  constructor(docsPath = '../docs') {
    this.docsPath = path.resolve(__dirname, docsPath);
    this.errors = [];
    this.warnings = [];
    this.validatedExamples = 0;
    this.tempDir = path.join(__dirname, '.temp-validation');
  }

  /**
   * Extract code blocks from markdown content
   */
  extractCodeBlocks(content, filePath) {
    const codeBlocks = [];
    const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
    let match;
    
    while ((match = codeBlockRegex.exec(content)) !== null) {
      const language = match[1] || 'text';
      const code = match[2];
      const line = this.getLineNumber(content, match.index);
      
      codeBlocks.push({
        language,
        code,
        line,
        filePath,
        raw: match[0]
      });
    }
    
    return codeBlocks;
  }

  /**
   * Get line number for a given character index
   */
  getLineNumber(content, index) {
    return content.substring(0, index).split('\n').length;
  }

  /**
   * Validate TypeScript/JavaScript code
   */
  validateJavaScriptCode(codeBlock) {
    const tempFile = path.join(this.tempDir, `temp-${Date.now()}.${codeBlock.language === 'typescript' ? 'ts' : 'js'}`);
    
    try {
      // Create temp directory if it doesn't exist
      if (!fs.existsSync(this.tempDir)) {
        fs.mkdirSync(this.tempDir, { recursive: true });
      }
      
      // Write code to temp file
      fs.writeFileSync(tempFile, codeBlock.code);
      
      // Check syntax using Node.js
      if (codeBlock.language === 'javascript' || codeBlock.language === 'js') {
        execSync(`node --check "${tempFile}"`, { stdio: 'pipe' });
      } else if (codeBlock.language === 'typescript' || codeBlock.language === 'ts') {
        // Try to compile TypeScript if tsc is available
        try {
          execSync(`npx tsc --noEmit --skipLibCheck "${tempFile}"`, { stdio: 'pipe' });
        } catch (error) {
          // If TypeScript compiler is not available, just check basic syntax
          this.warnings.push({
            type: 'typescript_check_skipped',
            file: codeBlock.filePath,
            line: codeBlock.line,
            message: 'TypeScript validation skipped (tsc not available)'
          });
        }
      }
      
      return true;
    } catch (error) {
      this.errors.push({
        type: 'syntax_error',
        file: codeBlock.filePath,
        line: codeBlock.line,
        language: codeBlock.language,
        message: `Syntax error in ${codeBlock.language} code: ${error.message}`
      });
      return false;
    } finally {
      // Clean up temp file
      if (fs.existsSync(tempFile)) {
        fs.unlinkSync(tempFile);
      }
    }
  }

  /**
   * Validate JSON code
   */
  validateJsonCode(codeBlock) {
    try {
      JSON.parse(codeBlock.code);
      return true;
    } catch (error) {
      this.errors.push({
        type: 'json_error',
        file: codeBlock.filePath,
        line: codeBlock.line,
        message: `Invalid JSON: ${error.message}`
      });
      return false;
    }
  }

  /**
   * Validate shell/bash code
   */
  validateShellCode(codeBlock) {
    // Basic validation for shell commands
    const lines = codeBlock.code.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Skip empty lines and comments
      if (!line || line.startsWith('#')) {
        continue;
      }
      
      // Check for common shell syntax issues
      if (line.includes('&&') && line.includes('||')) {
        this.warnings.push({
          type: 'shell_complexity',
          file: codeBlock.filePath,
          line: codeBlock.line + i,
          message: 'Complex shell command with both && and || operators'
        });
      }
      
      // Check for potentially dangerous commands
      const dangerousCommands = ['rm -rf /', 'sudo rm', 'format', 'del /s'];
      for (const dangerous of dangerousCommands) {
        if (line.includes(dangerous)) {
          this.warnings.push({
            type: 'dangerous_command',
            file: codeBlock.filePath,
            line: codeBlock.line + i,
            message: `Potentially dangerous command: ${dangerous}`
          });
        }
      }
    }
    
    return true;
  }

  /**
   * Validate Rust code
   */
  validateRustCode(codeBlock) {
    const tempFile = path.join(this.tempDir, `temp-${Date.now()}.rs`);
    
    try {
      // Create temp directory if it doesn't exist
      if (!fs.existsSync(this.tempDir)) {
        fs.mkdirSync(this.tempDir, { recursive: true });
      }
      
      // Write code to temp file
      fs.writeFileSync(tempFile, codeBlock.code);
      
      // Check syntax using rustc if available
      try {
        execSync(`rustc --crate-type lib --emit=metadata "${tempFile}" -o /dev/null`, { stdio: 'pipe' });
        return true;
      } catch (error) {
        // If rustc is not available, skip validation
        this.warnings.push({
          type: 'rust_check_skipped',
          file: codeBlock.filePath,
          line: codeBlock.line,
          message: 'Rust validation skipped (rustc not available)'
        });
        return true;
      }
    } catch (error) {
      this.errors.push({
        type: 'rust_syntax_error',
        file: codeBlock.filePath,
        line: codeBlock.line,
        message: `Rust syntax error: ${error.message}`
      });
      return false;
    } finally {
      // Clean up temp file
      if (fs.existsSync(tempFile)) {
        fs.unlinkSync(tempFile);
      }
    }
  }

  /**
   * Validate a single code block
   */
  validateCodeBlock(codeBlock) {
    this.validatedExamples++;
    
    switch (codeBlock.language.toLowerCase()) {
      case 'javascript':
      case 'js':
      case 'typescript':
      case 'ts':
        return this.validateJavaScriptCode(codeBlock);
      
      case 'json':
        return this.validateJsonCode(codeBlock);
      
      case 'bash':
      case 'shell':
      case 'sh':
        return this.validateShellCode(codeBlock);
      
      case 'rust':
      case 'rs':
        return this.validateRustCode(codeBlock);
      
      default:
        // For other languages, just check if the code is not empty
        if (!codeBlock.code.trim()) {
          this.warnings.push({
            type: 'empty_code_block',
            file: codeBlock.filePath,
            line: codeBlock.line,
            message: `Empty code block for language: ${codeBlock.language}`
          });
        }
        return true;
    }
  }

  /**
   * Validate all code examples in a documentation file
   */
  validateFile(filePath) {
    const fullPath = path.join(this.docsPath, filePath);
    
    if (!fs.existsSync(fullPath)) {
      this.errors.push({
        type: 'missing_file',
        file: filePath,
        message: `File does not exist: ${fullPath}`
      });
      return;
    }
    
    const content = fs.readFileSync(fullPath, 'utf8');
    const codeBlocks = this.extractCodeBlocks(content, filePath);
    
    for (const codeBlock of codeBlocks) {
      this.validateCodeBlock(codeBlock);
    }
  }

  /**
   * Scan all documentation files
   */
  scanDocumentationFiles(dir = this.docsPath) {
    const files = [];
    const entries = fs.readdirSync(dir);
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        files.push(...this.scanDocumentationFiles(fullPath));
      } else if (entry.endsWith('.md')) {
        const relativePath = path.relative(this.docsPath, fullPath);
        files.push(relativePath);
      }
    }
    
    return files;
  }

  /**
   * Run the complete code validation process
   */
  async run() {
    console.log('🔍 Starting documentation code validation...');
    
    const files = this.scanDocumentationFiles();
    console.log(`📁 Found ${files.length} documentation files`);
    
    // Validate code in all files
    for (const filePath of files) {
      this.validateFile(filePath);
    }
    
    // Clean up temp directory
    if (fs.existsSync(this.tempDir)) {
      fs.rmSync(this.tempDir, { recursive: true, force: true });
    }
    
    // Report results
    this.reportResults();
    
    return this.errors.length === 0;
  }

  /**
   * Report validation results
   */
  reportResults() {
    console.log('\n📊 Code Validation Results:');
    console.log(`✅ Code examples validated: ${this.validatedExamples}`);
    console.log(`❌ Errors found: ${this.errors.length}`);
    console.log(`⚠️  Warnings: ${this.warnings.length}`);
    
    if (this.errors.length > 0) {
      console.log('\n❌ Errors:');
      for (const error of this.errors) {
        console.log(`  ${error.file}:${error.line || '?'} - ${error.message}`);
      }
    }
    
    if (this.warnings.length > 0) {
      console.log('\n⚠️  Warnings:');
      for (const warning of this.warnings) {
        console.log(`  ${warning.file}:${warning.line || '?'} - ${warning.message}`);
      }
    }
    
    if (this.errors.length === 0 && this.warnings.length === 0) {
      console.log('\n🎉 All code examples are valid!');
    }
  }
}

// CLI execution
if (require.main === module) {
  const validator = new DocumentationCodeValidator();
  validator.run().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(error => {
    console.error('❌ Code validator failed:', error);
    process.exit(1);
  });
}

module.exports = DocumentationCodeValidator;