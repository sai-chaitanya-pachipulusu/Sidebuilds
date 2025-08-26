#!/usr/bin/env node

const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

console.log('🧹 Clean Restart for SideBuilds Client')
console.log('====================================\n')

try {
  // Clear Vite cache
  const viteCacheDir = path.join(__dirname, 'node_modules', '.vite')
  if (fs.existsSync(viteCacheDir)) {
    fs.rmSync(viteCacheDir, { recursive: true, force: true })
    console.log('✅ Cleared Vite cache')
  }

  // Clear other cache directories
  const distDir = path.join(__dirname, 'dist')
  const buildDir = path.join(__dirname, 'build')
  
  if (fs.existsSync(distDir)) {
    fs.rmSync(distDir, { recursive: true, force: true })
    console.log('✅ Cleared dist directory')
  }
  
  if (fs.existsSync(buildDir)) {
    fs.rmSync(buildDir, { recursive: true, force: true })
    console.log('✅ Cleared build directory')
  }

  // Verify main.jsx exists
  const mainJsxPath = path.join(__dirname, 'src', 'main.jsx')
  if (!fs.existsSync(mainJsxPath)) {
    console.log('❌ main.jsx not found, creating it...')
    const mainContent = `import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'
import App from './App'

const root = ReactDOM.createRoot(document.getElementById('root'))
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)`
    fs.writeFileSync(mainJsxPath, mainContent)
    console.log('✅ Created main.jsx')
  } else {
    console.log('✅ main.jsx exists')
  }

  // Remove old index.js if it exists
  const oldIndexJs = path.join(__dirname, 'src', 'index.js')
  if (fs.existsSync(oldIndexJs)) {
    fs.unlinkSync(oldIndexJs)
    console.log('✅ Removed old index.js')
  }

  console.log('\n🚀 Starting Vite development server...')
  console.log('Visit: http://localhost:3002 (or next available port)')
  console.log('Press Ctrl+C to stop\n')

  // Start the server
  execSync('npm start', { stdio: 'inherit' })

} catch (error) {
  console.error('❌ Error during restart:', error.message)
}