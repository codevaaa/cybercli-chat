# Credits & Third-Party Attributions

CodeVaa builds on the work of the open-source community. This file documents
third-party projects whose work is adapted or redistributed here, along with
their licenses.

---

## Agency Agents (persona registry)

The curated AI agent personas in CodeVaa's agent ecosystem are adapted from the
open-source **agency-agents** project.

- **Project:** agency-agents
- **Source:** https://github.com/msitarzewski/agency-agents
- **Copyright:** © 2025 AgentLand Contributors
- **License:** MIT

CodeVaa's personas (see `backend/src/services/agents/registry.js`) are an
original curation inspired by and adapted from the persona format and concepts
in that project. The persona schema (name, description, tools, color, emoji,
vibe, and a system-prompt body) follows the upstream design. System prompts in
this repository have been rewritten and hardened for CodeVaa's platform.

### MIT License (agency-agents)

```
MIT License

Copyright (c) 2025 AgentLand Contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```
