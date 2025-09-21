#!/usr/bin/env node

import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const srcDir = join(__dirname, 'src');
const distDir = join(__dirname, 'dist');

// Ensure dist directory exists
if (!existsSync(distDir)) {
  mkdirSync(distDir, { recursive: true });
}

// Get all CSS files except index.css
const cssFiles = readdirSync(srcDir)
  .filter(file => file.endsWith('.css') && file !== 'index.css')
  .sort(); // Sort for consistent output

console.log('Found CSS files:', cssFiles);

// Copy individual CSS files
cssFiles.forEach(file => {
  const srcPath = join(srcDir, file);
  const distPath = join(distDir, file);
  const content = readFileSync(srcPath, 'utf8');
  writeFileSync(distPath, content);
  console.log(`Copied: ${file}`);
});

// Generate combined index.css
const indexHeader = `/*!
 * CASOON Atlas - Complete Style Collection for Tailwind v4
 * Version: 0.0.2 — Modern UI Effects & Utilities
 * Repository: https://github.com/casoon/atlas
 * Author: Jörn Seidel (joern.seidel@casoon.de)
 * License: MIT
 *
 * A comprehensive, modern UI effects library built for Tailwind v4
 * SSR-safe, tree-shakeable, framework-agnostic
 *
 * Usage: @import "@casoon/atlas-styles";
 * Individual imports: @import "@casoon/atlas-styles/glass.css";
 * Package: @casoon/atlas-styles
 */

`;

// Combine all CSS files into index.css
let combinedContent = indexHeader;

cssFiles.forEach(file => {
  const filePath = join(srcDir, file);
  const content = readFileSync(filePath, 'utf8');
  const fileName = file.replace('.css', '');
  
  combinedContent += `/* ===== ${fileName.toUpperCase()} ===== */\n`;
  combinedContent += content;
  combinedContent += '\n\n';
});

// Write combined index.css
const indexPath = join(distDir, 'index.css');
writeFileSync(indexPath, combinedContent.trim() + '\n');

console.log('Generated combined index.css');
console.log(`Total files processed: ${cssFiles.length + 1}`);