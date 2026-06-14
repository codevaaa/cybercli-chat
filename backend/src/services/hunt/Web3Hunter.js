/**
 * Web3Hunter — Smart contract vulnerability detection agent.
 *
 * Targets: Immunefi ($50K-$2M payouts), Code4rena, Sherlock
 * Tools: Slither, Mythril, Foundry (forge), cast, solc
 * Vuln classes: reentrancy, flash loan, oracle manipulation, access control,
 *               signature replay, proxy upgrade bugs, meme coin rug pulls
 */

import llmGateway from '../llm/gateway.js'
import { getWeb3SkillContext } from './SkillsLoader.js'

const WEB3_AUDITOR_SYSTEM = `You are Ravan, an elite Web3 smart contract security auditor.
You have audited 500+ protocols and found critical bugs paying $50K-$2M on Immunefi.

Your expertise:
- Solidity, Vyper, Rust (Solana), Move (Aptos/Sui)
- EVM internals: storage layout, delegatecall, CREATE2, proxy patterns
- DeFi mechanics: AMM, lending protocols, flash loans, oracles
- Attack patterns: reentrancy, price manipulation, sandwich attacks, signature replay

Rules:
- Analyze the actual contract code provided
- Output specific vulnerable functions with line references
- Generate Foundry PoC test code that demonstrates exploitation
- Calculate economic impact (how much $ can attacker drain)
- Format for Immunefi submission`

const WEB3_RECON_SYSTEM = `You are Scout, a Web3 protocol recon agent.
Given a protocol name or contract address, identify:
1. Contract addresses (mainnet + testnets)
2. Protocol type (DEX, lending, bridge, etc.)
3. TVL (total value locked) — attack priority
4. Previous audit reports and known issues
5. Bug bounty program details (Immunefi/C4/Sherlock)
6. Recent contract changes (audit delta)
Output bash commands to gather this info using: cast, curl, python3`

export class Web3Hunter {
  constructor(target, sandbox, plan, onLog) {
    this.target  = target   // contract address or protocol name
    this.sandbox = sandbox
    this.plan    = plan
    this.onLog   = onLog
    this.web3SkillContext = null
  }

  log(msg) { this.onLog?.(`[WEB3] ${msg}`) }

  async loadSkills() {
    if (!this.web3SkillContext) {
      this.web3SkillContext = await getWeb3SkillContext()
    }
    return this.web3SkillContext
  }

  async llm(prompt, model = 'codeva-ravan-v1', system = null) {
    const skills = await this.loadSkills()
    const fullSystem = system
      ? `${system}\n\n${skills}`
      : `${WEB3_AUDITOR_SYSTEM}\n\n${skills}`

    const messages = [
      { role: 'system', content: fullSystem },
      { role: 'user', content: prompt },
    ]

    let result = ''
    for await (const chunk of await llmGateway.complete({
      messages, model, temperature: 0.1, plan: this.plan
    })) {
      if (chunk.type === 'token') result += chunk.content
    }
    return result.trim()
  }

  async runSandboxCmd(cmd) {
    if (!this.sandbox) return ''
    let out = ''
    try {
      await this.sandbox.commands.run(cmd, {
        timeout: 60_000,
        onStdout: (o) => { out += o.line + '\n'; this.log(o.line) },
      })
    } catch {}
    return out.slice(0, 3000)
  }

  // Full web3 audit pipeline
  async audit(contractSource = null, contractAddress = null) {
    this.log(`Starting Web3 audit: ${contractAddress || this.target}`)
    const results = { findings: [], reports: [], chains: [] }

    // Step 1: Gather contract info
    if (contractAddress) {
      this.log('Fetching contract from chain...')
      const castOut = await this.runSandboxCmd(
        `cast etherscan-source ${contractAddress} 2>/dev/null | head -200 || ` +
        `curl -s "https://api.etherscan.io/api?module=contract&action=getsourcecode&address=${contractAddress}" | python3 -c "import json,sys; d=json.load(sys.stdin); src=d.get('result',[{}])[0].get('SourceCode',''); print(src[:3000])"`
      )
      if (castOut && castOut.length > 100) contractSource = castOut
    }

    if (!contractSource) {
      this.log('No contract source — using AI-based analysis')
      const analysis = await this.llm(
        `Analyze ${this.target} for common Web3 vulnerabilities based on protocol type and name.`,
        'codeva-ravan-v1'
      )
      results.findings.push({ category: 'web3-analysis', evidence: analysis, severity: 'unknown' })
      return results
    }

    // Step 2: Static analysis with Slither
    if (this.sandbox) {
      this.log('Running Slither static analysis...')
      await this.sandbox.commands.run('echo "' + contractSource.replace(/"/g, '\\"').slice(0, 2000) + '" > /hunt/contract.sol 2>/dev/null', { timeout: 5000 }).catch(() => {})
      const slitherOut = await this.runSandboxCmd('slither /hunt/contract.sol 2>/dev/null | head -50 || echo "slither not available"')

      if (slitherOut && !slitherOut.includes('not available')) {
        const lines = slitherOut.split('\n').filter(l => l.includes('HIGH') || l.includes('MEDIUM') || l.includes('reentrancy'))
        lines.forEach(l => results.findings.push({ category: 'web3-static', evidence: l, severity: 'high', tool: 'slither' }))
      }

      // Step 3: Mythril symbolic execution
      this.log('Running Mythril symbolic execution...')
      const mythrilOut = await this.runSandboxCmd('myth analyze /hunt/contract.sol 2>/dev/null | head -30 || echo "mythril not available"')
      if (mythrilOut && !mythrilOut.includes('not available')) {
        mythrilOut.split('\n').filter(l => l.includes('SWC') || l.includes('Vuln'))
          .forEach(l => results.findings.push({ category: 'web3-mythril', evidence: l, severity: 'high', tool: 'mythril' }))
      }
    }

    // Step 4: AI deep analysis
    this.log('AI deep vulnerability analysis...')
    const aiAnalysis = await this.llm(`Analyze this Solidity contract for vulnerabilities:

\`\`\`solidity
${contractSource.slice(0, 4000)}
\`\`\`

Check for:
1. Reentrancy (cross-function, cross-contract)
2. Access control issues
3. Integer overflow/underflow
4. Oracle manipulation / price manipulation
5. Flash loan attack vectors
6. Signature replay attacks
7. Proxy upgrade vulnerabilities
8. Economic attack vectors (sandwich, MEV)

For each vulnerability found:
- Exact function name and line
- Attack scenario
- Economic impact ($)
- Foundry PoC test code
- CVSS score`)

    if (aiAnalysis.length > 100) {
      results.findings.push({ category: 'web3-ai', evidence: aiAnalysis, severity: 'unknown', tool: 'ravan-ai' })
    }

    // Step 5: Generate Immunefi report if findings exist
    if (results.findings.length > 0) {
      this.log('Generating Immunefi report...')
      const report = await this.llm(`Write an Immunefi bug bounty report for this web3 finding.

Contract: ${contractAddress || this.target}
Analysis: ${aiAnalysis.slice(0, 2000)}

Format as professional Immunefi submission:
## Summary (economic impact first)
## Vulnerability Details (exact function, code snippet)
## Proof of Concept (Foundry test)
## Impact ($ amount drainable)
## Recommended Fix`)

      results.reports.push({
        platform: 'immunefi',
        title: `Smart Contract Vulnerability in ${this.target}`,
        severity: 'critical',
        content: report,
      })
    }

    return results
  }

  // Meme coin / token rug pull scanner
  async scanToken(contractAddress) {
    this.log(`Scanning token ${contractAddress} for rug pull indicators...`)

    const castChecks = [
      `cast call ${contractAddress} "owner()(address)" 2>/dev/null`,
      `cast call ${contractAddress} "totalSupply()(uint256)" 2>/dev/null`,
      `cast call ${contractAddress} "decimals()(uint8)" 2>/dev/null`,
    ]

    let tokenData = ''
    for (const cmd of castChecks) {
      tokenData += await this.runSandboxCmd(cmd)
    }

    const rugAnalysis = await this.llm(`Analyze this token contract ${contractAddress} for rug pull indicators.

On-chain data:
${tokenData || '(could not fetch on-chain data)'}

Check for:
1. Mint authority (can team print tokens?)
2. Transfer restrictions (can sells be blocked?)
3. LP lock status (liquidity rug risk)
4. Honeypot detection (can't sell?)
5. Ownership renounced?
6. Blacklist/whitelist functions
7. Tax manipulation

Output risk score 0-100 and detailed findings.`)

    return {
      address: contractAddress,
      analysis: rugAnalysis,
      findings: [{ category: 'web3-token', evidence: rugAnalysis, severity: 'unknown' }]
    }
  }
}
