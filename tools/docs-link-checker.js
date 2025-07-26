#!/usr/bin/env node

/**
 * Documentation Link Checker
 * Validates internal links within the documentation files
 */

const fs = require('fs');
const path = require('path');

class DocumentationLinkChecker {
  constructor(docsPath = '../docs') {
    this.docsPath = path.resolve(__dirname, docsPath);
    this.errors = [];
    this.warnings = [];
    this.checkedFiles = new Set();
    this.existingFiles = new Set();
  }

  /**
   * Scan all documentation files and collect existing files
   */
  scanDocumentationFiles(dir = this.docsPath) {
    const files = fs.readdirSync(dir);
    
    for (const file of files) {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        this.scanDocumentationFiles(fullPath);
      } else if (file.endsWith('.md')) {
        const relativePath = path.relative(this.docsPath, fullPath);
        this.existingFiles.add(relativePath);
      }
    }
  }

  /**
   * Extract markdown links from content
   */
  extractLinks(content, filePath) {
    const links = [];
    
    // Match markdown links [text](url)
    const markdownLinkRegex = /\[([^\]]*)\]\(([^)]+)\)/g;
    let match;
    
    while ((match = markdownLinkRegex.exec(content)) !== null) {
      const linkText = match[1];
      const linkUrl = match[2];
      
      // Only check internal links (not starting with http/https/mailto)
      if (!linkUrl.startsWith('http') && !linkUrl.startsWith('mailto:') && !linkUrl.startsWith('#')) {
        links.push({
          text: linkText,
          url: linkUrl,
          line: this.getLineNumber(content, match.index),
          filePath
        });
      }
    }
    
    return links;
  }

  /**
   * Get line number for a given character index
   */
  getLineNumber(content, index) {
    return content.substring(0, index).split('\n').length;
  }

  /**
   * Validate a single link
   */
  validateLink(link) {
    let targetPath = link.url;
    
    // Remove anchor fragments
    if (targetPath.includes('#')) {
      targetPath = targetPath.split('#')[0];
    }
    
    // Skip empty paths (anchor-only links)
    if (!targetPath) {
      return true;
    }
    
    // Resolve relative paths
    const linkDir = path.dirname(link.filePath);
    const resolvedPath = path.normalize(path.join(linkDir, targetPath));
    
    // Check if the target file exists
    if (!this.existingFiles.has(resolvedPath)) {
      this.errors.push({
        type: 'broken_link',
        file: link.filePath,
        line: link.line,
        link: link.url,
        text: link.text,
        message: `Broken internal link: ${link.url} -> ${resolvedPath}`
      });
      return false;
    }
    
    return true;
  }

  /**
   * Check all links in a documentation file
   */
  checkFile(filePath) {
    if (this.checkedFiles.has(filePath)) {
      return;
    }
    
    this.checkedFiles.add(filePath);
    
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
    const links = this.extractLinks(content, filePath);
    
    for (const link of links) {
      this.validateLink(link);
    }
  }

  /**
   * Run the complete link checking process
   */
  async run() {
    console.log('🔍 Starting documentation link validation...');
    
    // First, scan all existing files
    this.scanDocumentationFiles();
    console.log(`📁 Found ${this.existingFiles.size} documentation files`);
    
    // Check links in all files
    for (const filePath of this.existingFiles) {
      this.checkFile(filePath);
    }
    
    // Report results
    this.reportResults();
    
    return this.errors.length === 0;
  }

  /**
   * Report validation results
   */
  reportResults() {
    console.log('\n📊 Link Validation Results:');
    console.log(`✅ Files checked: ${this.checkedFiles.size}`);
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
      console.log('\n🎉 All documentation links are valid!');
    }
  }
}

// CLI execution
if (require.main === module) {
  const checker = new DocumentationLinkChecker();
  checker.run().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(error => {
    console.error('❌ Link checker failed:', error);
    process.exit(1);
  });
}

module.exports = DocumentationLinkChecker;