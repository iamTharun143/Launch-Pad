import dotenv from 'dotenv'
import path from 'path'
import fs from 'fs/promises'
import { existsSync } from 'fs'
import { spawn } from 'child_process'
import prisma from './db.js'

dotenv.config()

// Ensure temp and deployments directories exist
const BASE_DIR = process.cwd()
const TEMP_ROOT = path.join(BASE_DIR, 'temp')
const DEPLOYMENTS_ROOT = path.join(BASE_DIR, 'deployments')

let isProcessing = false

/**
 * Executes a shell command with an args array and a 5-minute timeout.
 * Streams stdout and stderr line-by-line into the log callback.
 */
function runCommand(cmd, args, cwd, onLog, timeoutMs = 300000) {
  return new Promise((resolve, reject) => {
    let timedOut = false

    // Spawn process (shell: true on Windows for npm.cmd, etc.)
    const proc = spawn(cmd, args, {
      cwd,
      shell: process.platform === 'win32',
      env: { ...process.env, CI: 'true' },
    })

    const timer = setTimeout(() => {
      timedOut = true
      proc.kill('SIGTERM')
      reject(new Error(`Command timed out after ${timeoutMs / 1000}s`))
    }, timeoutMs)

    proc.stdout.on('data', (data) => {
      const lines = data.toString().split(/\r?\n/)
      for (const line of lines) {
        if (line.trim()) onLog(line)
      }
    })

    proc.stderr.on('data', (data) => {
      const lines = data.toString().split(/\r?\n/)
      for (const line of lines) {
        if (line.trim()) onLog(line)
      }
    })

    proc.on('error', (err) => {
      clearTimeout(timer)
      reject(err)
    })

    proc.on('close', (code) => {
      clearTimeout(timer)
      if (timedOut) return
      if (code === 0) {
        resolve()
      } else {
        reject(new Error(`Command "${cmd} ${args.join(' ')}" failed with exit code ${code}`))
      }
    })
  })
}

/**
 * Saves a line to the logs database table and prints to worker stdout
 */
async function recordLog(deploymentId, line) {
  console.log(`[worker:${deploymentId}] ${line}`)
  try {
    await prisma.log.create({
      data: {
        deploymentId,
        line,
      },
    })
  } catch (err) {
    console.error(`[worker] Failed to persist log line for ${deploymentId}:`, err.message)
  }
}

/**
 * Processes a single deployment through the full pipeline:
 * Clone -> Git rev-parse -> npm install -> Build -> Copy assets -> Mark READY
 */
async function processDeployment(deployment) {
  const { id, project } = deployment
  const workDir = path.join(TEMP_ROOT, id)
  const targetDir = path.join(DEPLOYMENTS_ROOT, id)

  console.log(`\n======================================================`)
  console.log(`[worker] Starting build for deployment ${id} (Project: ${project.name})`)
  console.log(`======================================================`)

  // Step 0: Mark as BUILDING
  await prisma.deployment.update({
    where: { id },
    data: { status: 'BUILDING' },
  })
  await recordLog(id, `[queued] Build worker assigned to deployment ${id}`)

  try {
    // Prepare directories
    await fs.mkdir(workDir, { recursive: true })
    await fs.mkdir(targetDir, { recursive: true })

    const log = (msg) => recordLog(id, msg)

    // Step 1: Git clone
    await log(`[build] Cloning repository: ${project.repoUrl}...`)
    await runCommand('git', ['clone', '--depth', '1', project.repoUrl, '.'], workDir, log)

    // Step 2: Extract real commit hash
    try {
      let commitSha = ''
      await runCommand('git', ['rev-parse', 'HEAD'], workDir, (line) => {
        if (!commitSha && /^[0-9a-f]{7,40}$/i.test(line.trim())) {
          commitSha = line.trim().substring(0, 7)
        }
      })
      if (commitSha) {
        await prisma.deployment.update({
          where: { id },
          data: { commitSha },
        })
        await log(`[build] Checked out commit ${commitSha}`)
      }
    } catch {
      // Continue if rev-parse had non-fatal issue
    }

    // Step 2.5: Verify repository is not empty
    const clonedFiles = (await fs.readdir(workDir)).filter((f) => f !== '.git')
    if (clonedFiles.length === 0) {
      throw new Error(
        `Repository "${project.repoUrl}" appears to be empty. Please commit and push your project files (such as index.html or a React/Vite app) before deploying.`
      )
    }

    // Step 3: Check for package.json
    const pkgPath = path.join(workDir, 'package.json')
    const hasPackageJson = existsSync(pkgPath)

    if (hasPackageJson) {
      await log('[build] Installing dependencies: npm install...')
      await runCommand('npm', ['install'], workDir, log)

      // Step 4: Build command
      const rawBuildCmd = (project.buildCommand || 'npm run build').trim()
      let shouldRunBuild = false

      try {
        const pkgContent = JSON.parse(await fs.readFile(pkgPath, 'utf-8'))
        const runMatch = rawBuildCmd.match(/^npm\s+run\s+(\S+)$/)

        if (runMatch) {
          const scriptName = runMatch[1]
          if (pkgContent.scripts && pkgContent.scripts[scriptName]) {
            shouldRunBuild = true
          } else {
            await log(
              `[build] Script "${scriptName}" is not defined in package.json. Skipping build command.`
            )
          }
        } else if (rawBuildCmd) {
          shouldRunBuild = true
        }
      } catch {
        shouldRunBuild = Boolean(rawBuildCmd)
      }

      if (shouldRunBuild) {
        await log(`[build] Running build command: ${rawBuildCmd}...`)
        const cmdParts = rawBuildCmd.split(/\s+/)
        const mainCmd = cmdParts[0]
        const cmdArgs = cmdParts.slice(1)
        await runCommand(mainCmd, cmdArgs, workDir, log)
      }
    } else {
      await log(
        '[build] No package.json detected. Treating as static site (skipping npm install & build).'
      )
    }

    // Step 5: Copy built assets to deployments/<id>/
    const outputFolder = project.outputDir || 'dist'
    let fullOutputPath = path.join(workDir, outputFolder)

    if (!existsSync(fullOutputPath)) {
      // Fallback: check if index.html exists in root
      if (existsSync(path.join(workDir, 'index.html'))) {
        await log(
          `[deploy] Output directory "${outputFolder}" not found, but root index.html found. Using root as deployment assets.`
        )
        fullOutputPath = workDir
      } else {
        throw new Error(
          `Build finished, but output directory "${outputFolder}" was not found in ${workDir}. Verify project outputDir setting or ensure an index.html exists.`
        )
      }
    }

    await log(`[deploy] Copying built assets to deployments/${id}/...`)
    await fs.cp(fullOutputPath, targetDir, {
      recursive: true,
      filter: (src) => !src.includes('.git') && !src.includes('node_modules'),
    })

    // Step 6: Mark READY and activate deployment on project
    const finishedAt = new Date()
    await prisma.$transaction([
      prisma.deployment.update({
        where: { id },
        data: {
          status: 'READY',
          finishedAt,
        },
      }),
      prisma.project.update({
        where: { id: project.id },
        data: {
          activeDeploymentId: id,
        },
      }),
    ])

    await log(`[ready] Deployment READY! Live site accessible at http://${project.name}.localhost:8000`)
    console.log(`[worker] Deployment ${id} succeeded! Active on http://${project.name}.localhost:8000\n`)
  } catch (err) {
    console.error(`[worker] Deployment ${id} failed:`, err.message)
    await recordLog(id, `[error] ${err.message}`)

    await prisma.deployment.update({
      where: { id },
      data: {
        status: 'FAILED',
        finishedAt: new Date(),
      },
    })
  } finally {
    // Step 7: Clean up temp directory
    try {
      await fs.rm(workDir, { recursive: true, force: true })
    } catch {
      // Ignore cleanup error
    }
  }
}

/**
 * Polls the deployments table every 3 seconds for the oldest QUEUED row.
 * Strictly guarantees one build at a time in the MVP.
 */
async function pollQueue() {
  if (isProcessing) return

  try {
    const oldestQueued = await prisma.deployment.findFirst({
      where: { status: 'QUEUED' },
      orderBy: { createdAt: 'asc' },
      include: { project: true },
    })

    if (oldestQueued) {
      isProcessing = true
      await processDeployment(oldestQueued)
    }
  } catch (err) {
    // If DB is temporarily unreachable or starting up, wait for next tick
    console.error('[worker] Poll cycle error:', err.message)
  } finally {
    isProcessing = false
  }
}

// Ensure base directories exist
await fs.mkdir(TEMP_ROOT, { recursive: true })
await fs.mkdir(DEPLOYMENTS_ROOT, { recursive: true })

console.log('[worker] Launchpad Build Worker daemon started.')
console.log('[worker] Polling deployments table every 3s for QUEUED builds...')

// Run immediately and then every 3 seconds
pollQueue()
setInterval(pollQueue, 3000)

