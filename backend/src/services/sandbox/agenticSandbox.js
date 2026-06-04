import { Sandbox } from '@e2b/code-interpreter'
import User from '../../models/User.js'
import logger from '../../utils/logger.js'

/**
 * Executes Python code inside a secure E2B cloud sandbox.
 * @param {string} code - The code to execute.
 * @param {string} userId - The ID of the user requesting execution.
 * @param {Function} [onStdout] - Callback for real-time stdout chunks.
 * @param {Function} [onStderr] - Callback for real-time stderr chunks.
 * @returns {Promise<{stdout: string, stderr: string, error?: string}>}
 */
export async function executeInSandbox(code, userId, onStdout, onStderr) {
  try {
    // 1. Check Usage Limits
    let user = await User.findOne({ supabase_id: userId })
    if (!user) {
      user = new User({
        supabase_id: userId,
        sandbox_executions_count: 0,
        sandbox_last_execution_date: new Date()
      })
      await user.save()
    }

    const isPro = user.plan === 'pro' || user.plan === 'max'
    const today = new Date().toDateString()
    const lastExecutionDate = user.sandbox_last_execution_date 
      ? new Date(user.sandbox_last_execution_date).toDateString() 
      : null

    // Reset count if it's a new day
    if (lastExecutionDate !== today) {
      user.sandbox_executions_count = 0
      user.sandbox_last_execution_date = new Date()
    }

    // Enforce limits (Free: 5/day)
    if (!isPro && user.sandbox_executions_count >= 5) {
      return {
        stdout: '',
        stderr: '',
        error: `[SANDBOX_DENIED] Free tier sandbox limit reached (5/5 today). Upgrade to PRO for unlimited execution.`
      }
    }

    // 2. Increment usage
    user.sandbox_executions_count += 1
    await user.save()

    // 3. Create Sandbox & Execute
    logger.info(`Starting E2B Sandbox for user ${userId}...`)
    
    // Create sandbox instance
    const sandbox = await Sandbox.create({
      apiKey: process.env.E2B_API_KEY
    })

    logger.info(`Sandbox ${sandbox.sandboxId} started. Executing code...`)
    
    const execution = await sandbox.runCode(code, {
      language: 'python',
      onStdout: onStdout ? (out) => onStdout(out.line) : undefined,
      onStderr: onStderr ? (err) => onStderr(err.line) : undefined
    })

    await sandbox.kill()
    logger.info(`Sandbox ${sandbox.sandboxId} killed.`)

    return {
      stdout: execution.text || '',
      stderr: execution.error ? execution.error.traceback || execution.error.value : '',
      error: null
    }

  } catch (error) {
    logger.error('Sandbox execution failed:', error)
    return {
      stdout: '',
      stderr: '',
      error: `[SANDBOX_ERROR] Sandbox failed to initialize or crashed: ${error.message}`
    }
  }
}
