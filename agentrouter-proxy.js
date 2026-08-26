const http = require('http');
const https = require('https');

const PORT = 3000;
const TARGET_HOST = 'agentrouter.org';

const apiKey = process.env.AGENTROUTER_API_KEY;
if (!apiKey) {
    console.error('[Proxy] Missing AGENTROUTER_API_KEY environment variable');
    process.exit(1);
}
const AUTH_HEADER = apiKey.startsWith('Bearer ') ? apiKey : `Bearer ${apiKey}`;

process.on('uncaughtException', (err) => {
    console.error('[Proxy] Uncaught Exception:', err);
});
process.on('unhandledRejection', (reason) => {
    console.error('[Proxy] Unhandled Rejection:', reason);
});

const server = http.createServer((req, res) => {
    if (req.method === 'OPTIONS') {
        res.writeHead(204, {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': '*',
            'Access-Control-Allow-Headers': '*'
        });
        res.end();
        return;
    }

    console.log(`[Proxy] Request: ${req.method} ${req.url}`);

    let body = [];
    req.on('data', (chunk) => {
        body.push(chunk);
    }).on('end', () => {
        body = Buffer.concat(body);

        // Try to log the incoming request parameters
        try {
            const reqJson = JSON.parse(body.toString('utf8'));
            console.log(`[Proxy] Request payload: model=${reqJson.model}, stream=${reqJson.stream}`);
        } catch (e) {
            console.log(`[Proxy] Request body could not be parsed as JSON: ${body.toString('utf8').substring(0, 200)}`);
        }

        const headers = { ...req.headers };
        delete headers['host'];
        delete headers['connection'];

        headers['User-Agent'] = 'claude-cli/2.1.119 (external, cli)';
        headers['X-Stainless-Lang'] = 'js';
        headers['X-Stainless-Arch'] = 'x64';
        headers['X-Stainless-OS'] = 'Windows';
        headers['X-Stainless-Runtime'] = 'node';
        headers['anthropic-version'] = '2023-06-01';
        headers['authorization'] = AUTH_HEADER;

        const options = {
            hostname: TARGET_HOST,
            port: 443,
            path: req.url,
            method: req.method,
            headers: headers
        };

        const proxyReq = https.request(options, (proxyRes) => {
            console.log(`[Proxy] Response: ${proxyRes.statusCode} ${proxyRes.headers['content-type']}`);

            const isJson = proxyRes.headers['content-type'] && proxyRes.headers['content-type'].includes('application/json');
            const isEventStream = proxyRes.headers['content-type'] && proxyRes.headers['content-type'].includes('event-stream');

            if (proxyRes.statusCode >= 400 || isJson) {
                let resBody = [];
                proxyRes.on('data', (chunk) => {
                    resBody.push(chunk);
                }).on('end', () => {
                    const resStr = Buffer.concat(resBody).toString('utf8');
                    console.log(`[Proxy] Error or JSON Response Body: ${resStr}`);
                    res.writeHead(proxyRes.statusCode, proxyRes.headers);
                    res.end(resStr);
                });
                return;
            }

            if (isEventStream) {
                let buffer = '';
                proxyRes.on('data', (chunk) => {
                    buffer += chunk.toString('utf8');
                    let lines = buffer.split('\n');
                    buffer = lines.pop();

                    for (let line of lines) {
                        if (line.trim() === 'data: null') {
                            console.log('[Proxy] Filtered out: data: null');
                            continue;
                        }
                        res.write(line + '\n');
                    }
                });

                proxyRes.on('end', () => {
                    if (buffer) {
                        if (buffer.trim() !== 'data: null') {
                            res.write(buffer);
                        } else {
                            console.log('[Proxy] Filtered out trailing: data: null');
                        }
                    }
                    res.end();
                });
            } else {
                proxyRes.pipe(res);
            }
        });

        proxyReq.on('error', (err) => {
            console.error('[Proxy] Error forwarding request:', err);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: { message: err.message } }));
        });

        proxyReq.write(body);
        proxyReq.end();
    });
});

server.listen(PORT, '127.0.0.1', () => {
    console.log(`[Proxy] AgentRouter Local Proxy is running on http://127.0.0.1:${PORT}`);
});
