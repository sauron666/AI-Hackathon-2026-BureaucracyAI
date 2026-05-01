/**
 * Setup Script - Get the project running in one command
 * Run: npx tsx scripts/setup.ts
 * 
 * This script:
 * 1. Checks prerequisites (Docker, Node.js)
 * 2. Starts ChromaDB
 * 3. Creates .env.local from .env.local.example
 * 4. Lists next steps
 */

import { readFile, writeFile, access } from 'fs/promises';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';

const execAsync = promisify(exec);

const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[34m';
const RESET = '\x1b[0m';

function log(message: string, color = RESET) {
  console.log(`${color}${message}${RESET}`);
}

function success(message: string) {
  log(`✓ ${message}`, GREEN);
}

function error(message: string) {
  log(`✗ ${message}`, RED);
}

function warn(message: string) {
  log(`⚠ ${message}`, YELLOW);
}

function info(message: string) {
  log(`ℹ ${message}`, BLUE);
}

async function checkFileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function runCommand(command: string, description: string): Promise<boolean> {
  try {
    info(`Running: ${description}...`);
    await execAsync(command, { cwd: process.cwd() });
    success(`${description} completed`);
    return true;
  } catch (err) {
    error(`${description} failed: ${(err as Error).message}`);
    return false;
  }
}

async function copyFileContent(src: string, dest: string): Promise<void> {
  const content = await readFile(src);
  await writeFile(dest, content);
}

async function checkDockerRunning(): Promise<boolean> {
  try {
    await execAsync('docker ps');
    return true;
  } catch {
    return false;
  }
}

async function isChromaDBRunning(): Promise<boolean> {
  try {
    const { stdout } = await execAsync('docker ps --filter "name=chromadb" --format "{{.Names}}"');
    return stdout.includes('chromadb');
  } catch {
    return false;
  }
}

async function isChromaDBHealthy(): Promise<boolean> {
  try {
    await execAsync('curl -s --max-time 5 http://localhost:8000/api/v2/heartbeat');
    return true;
  } catch {
    return false;
  }
}

async function waitForChromaDB(maxAttempts = 15): Promise<boolean> {
  info('Waiting for ChromaDB to be ready...');
  for (let i = 0; i < maxAttempts; i++) {
    if (await isChromaDBHealthy()) {
      return true;
    }
    await new Promise(r => setTimeout(r, 1000));
    process.stdout.write('.');
  }
  return false;
}

async function setup() {
  console.log('\n' + '='.repeat(50));
  log('  BureaucracyAI Setup Script', BLUE);
  log('  Infrastructure & Ingest Pipeline', BLUE);
  console.log('='.repeat(50) + '\n');

  // ================== CHECK PREREQUISITES ==================
  
  log('Checking prerequisites...', BLUE);
  
  // Docker
  try {
    await execAsync('docker --version');
    success('Docker is installed');
  } catch {
    error('Docker is not installed. Please install Docker Desktop from https://docker.com');
    console.log('\n📝 After installing Docker, restart this script.');
    process.exit(1);
  }

  // Node.js
  try {
    const { stdout } = await execAsync('node --version');
    success(`Node.js ${stdout.trim()} is installed`);
  } catch {
    error('Node.js is not installed. Please install Node.js 18+');
    console.log('\n📝 After installing Node.js, restart this script.');
    process.exit(1);
  }

  // Check Docker daemon is running
  if (!(await checkDockerRunning())) {
    error('Docker daemon is not running. Please start Docker Desktop.');
    console.log('\n📝 Start Docker Desktop and restart this script.');
    process.exit(1);
  }

  // ================== START CHROMADB ==================
  
  log('\nStarting ChromaDB...', BLUE);
  
  if (await isChromaDBRunning()) {
    success('ChromaDB container is already running');
  } else {
    // Check if docker-compose.yml exists
    if (!(await checkFileExists('docker-compose.yml'))) {
      error('docker-compose.yml not found in project root');
      process.exit(1);
    }

    try {
      info('Starting ChromaDB container...');
      await execAsync('docker-compose up -d chromadb', { cwd: process.cwd() });
      success('ChromaDB container started');
    } catch (err) {
      error(`Failed to start ChromaDB: ${(err as Error).message}`);
      process.exit(1);
    }
  }

  // Wait for ChromaDB to be healthy
  const chromaReady = await waitForChromaDB();
  if (chromaReady) {
    success('ChromaDB is ready and healthy');
  } else {
    warn('ChromaDB is slow to start. Check status with: docker ps');
    warn('Or view logs with: docker-compose logs chromadb');
  }

  // ================== CREATE .env.local ==================
  
  log('\nSetting up environment...', BLUE);
  
  const envExample = '.env.local.example';
  const envFile = '.env.local';
  
  if (await checkFileExists(envFile)) {
    info('.env.local already exists - skipping');
  } else if (await checkFileExists(envExample)) {
    try {
      await copyFileContent(envExample, envFile);
      success('Created .env.local from template');
      warn('⚠ Please edit .env.local and add your API keys:');
      warn('   - ANTHROPIC_API_KEY');
      warn('   - OPENAI_API_KEY');
      warn('   - UPLOADTHING_SECRET');  
      warn('   - NEXT_PUBLIC_UPLOADTHING_APP_ID');
    } catch (err) {
      error(`Failed to create .env.local: ${err instanceof Error ? err.message : String(err)}`);
    }
  } else {
    warn('.env.local.example not found - skipping');
  }

  // ================== INSTALL DEPENDENCIES ==================
  
  log('\nInstalling dependencies...', BLUE);
  await runCommand('npm install', 'npm install');

  // ================== CHECK STATUS ==================
  
  log('\n' + '='.repeat(50));
  log('  Setup Complete!', GREEN);
  log('='.repeat(50), BLUE);
  
  console.log('\n📋 Next steps:');
  console.log('   1. Edit .env.local with your API keys');
  console.log('   2. Seed data:  npx tsx scripts/seed.ts');
  console.log('   3. Test infra: npx tsx scripts/test-infra.ts');
  console.log('   4. Start app:  npm run dev');
  console.log('\n🔧 Useful commands:');
  console.log('   docker-compose logs chromadb  # View ChromaDB logs');
  console.log('   docker-compose down          # Stop all containers');
  console.log('   docker ps                    # Check running containers');
  console.log('   curl http://localhost:3000/api/health  # Test API\n');
}

// Run if called directly
setup().catch(err => {
  error(`Setup failed: ${err.message}`);
  process.exit(1);
});

export { setup };
