# ================================================================
# Codeva Hunter — E2B Cloud Sandbox
# Complete offensive security toolkit: 300+ tools
#
# Phase-by-phase tool coverage:
#   1. OSINT / Passive Recon
#   2. Active Recon (reconFTW orchestrated)
#   3. Scanning & Enumeration
#   4. Exploitation
#   5. Post-Exploitation
#   6. Web3 Auditing
#   7. Reporting
#
# Build: e2b template build --dockerfile ./Dockerfile
# ================================================================
FROM e2bdev/code-interpreter:latest

USER root
ENV DEBIAN_FRONTEND=noninteractive
ENV GOPATH=/root/go
ENV PATH=$PATH:/usr/local/go/bin:/root/go/bin:/root/.local/bin:/root/.foundry/bin

# ── System base ─────────────────────────────────────────────────
RUN apt-get update -qq && apt-get install -y --no-install-recommends \
    curl wget git unzip tar gzip xz-utils jq \
    python3 python3-pip python3-dev python3-venv \
    ruby ruby-dev rubygems \
    nodejs npm \
    libssl-dev libffi-dev libxml2-dev libxslt1-dev \
    build-essential pkg-config \
    dnsutils whois netcat-openbsd traceroute \
    nmap masscan \
    nikto \
    sqlmap \
    hydra \
    john \
    hashcat \
    wfuzz \
    dirb \
    whatweb \
    chromium-browser \
    tcpdump \
    2>/dev/null && apt-get clean && rm -rf /var/lib/apt/lists/*

# ── Go 1.22 ─────────────────────────────────────────────────────
RUN curl -sL https://go.dev/dl/go1.22.3.linux-amd64.tar.gz | tar -xz -C /usr/local

# ─────────────────────────────────────────────────────────────────
# PHASE 1: PASSIVE RECON & OSINT
# ─────────────────────────────────────────────────────────────────

# ProjectDiscovery suite (binary releases — fastest install)
RUN cd /tmp && \
    for tool in subfinder httpx nuclei katana dnsx naabu cdncheck interactsh-client; do \
      zip="${tool}_linux_amd64.zip" && \
      curl -sL "https://github.com/projectdiscovery/$tool/releases/latest/download/$zip" \
        -o /tmp/$zip 2>/dev/null && \
      unzip -oq /tmp/$zip -d /tmp/pd_$tool 2>/dev/null && \
      find /tmp/pd_$tool -maxdepth 1 -type f -executable -exec mv {} /usr/local/bin/ \; 2>/dev/null; \
    done && rm -rf /tmp/pd_* /tmp/*.zip

# subfinder (go install as fallback)
RUN command -v subfinder || go install github.com/projectdiscovery/subfinder/v2/cmd/subfinder@latest 2>/dev/null || true

# reconFTW — the all-in-one recon orchestrator (80+ tools)
RUN git clone --depth 1 https://github.com/six2dez/reconftw.git /opt/reconftw 2>/dev/null && \
    cd /opt/reconftw && \
    chmod +x reconftw.sh && \
    ln -sf /opt/reconftw/reconftw.sh /usr/local/bin/reconftw && \
    pip3 install -q -r requirements.txt 2>/dev/null || true

# Tomnomnom suite
RUN for pkg in \
      github.com/tomnomnom/anew@latest \
      github.com/tomnomnom/gf@latest \
      github.com/tomnomnom/qsreplace@latest \
      github.com/tomnomnom/waybackurls@latest \
      github.com/tomnomnom/assetfinder@latest \
      github.com/tomnomnom/httprobe@latest \
      github.com/tomnomnom/unfurl@latest \
      github.com/tomnomnom/meg@latest; do \
      go install $pkg 2>/dev/null || true; \
    done

# URL collectors
RUN go install github.com/lc/gau/v2/cmd/gau@latest 2>/dev/null || true
RUN go install github.com/hakluke/hakrawler@latest 2>/dev/null || true
RUN go install github.com/jaeles-project/gospider@latest 2>/dev/null || true
RUN go install github.com/edoardottt/cariddi/cmd/cariddi@latest 2>/dev/null || true
RUN go install github.com/hahwul/gxss@latest 2>/dev/null || true

# amass
RUN go install github.com/owasp-amass/amass/v4/...@master 2>/dev/null || true

# puredns + massdns
RUN go install github.com/d3mondev/puredns/v2@latest 2>/dev/null || true
RUN go install github.com/projectdiscovery/shuffledns/cmd/shuffledns@latest 2>/dev/null || true
RUN apt-get install -y massdns 2>/dev/null || \
    (curl -sL https://github.com/blechschmidt/massdns/releases/latest/download/massdns_linux_x86_64.tar.gz | tar -xz -C /tmp && mv /tmp/massdns /usr/local/bin/) 2>/dev/null || true

# bbot — modern attack surface discovery
RUN pip3 install -q bbot 2>/dev/null || true

# GF patterns
RUN mkdir -p /root/.gf && \
    git clone -q --depth 1 https://github.com/1ndianl33t/Gf-Patterns /tmp/gfp 2>/dev/null && \
    cp /tmp/gfp/*.json /root/.gf/ 2>/dev/null && \
    git clone -q --depth 1 https://github.com/tomnomnom/gf /tmp/gf2 2>/dev/null && \
    cp /tmp/gf2/examples/*.json /root/.gf/ 2>/dev/null && rm -rf /tmp/gfp /tmp/gf2

# ─────────────────────────────────────────────────────────────────
# PHASE 2: ACTIVE RECON & ENUMERATION
# ─────────────────────────────────────────────────────────────────

# ffuf (fastest fuzzer)
RUN curl -sL https://github.com/ffuf/ffuf/releases/latest/download/ffuf_linux_amd64.tar.gz | \
    tar -xz -C /tmp && mv /tmp/ffuf /usr/local/bin/ 2>/dev/null || \
    go install github.com/ffuf/ffuf/v2@latest 2>/dev/null || true

# feroxbuster
RUN curl -sL https://github.com/epi052/feroxbuster/releases/latest/download/x86_64-linux-feroxbuster.zip \
    -o /tmp/ferox.zip && unzip -oq /tmp/ferox.zip feroxbuster -d /usr/local/bin/ 2>/dev/null && \
    chmod +x /usr/local/bin/feroxbuster 2>/dev/null || true

# gobuster
RUN go install github.com/OJ/gobuster/v3@latest 2>/dev/null || true

# kiterunner — API route brute (40K+ wordlist)
RUN curl -sL https://github.com/assetnote/kiterunner/releases/latest/download/kiterunner_linux_amd64.tar.gz | \
    tar -xz -C /tmp && mv /tmp/kr /usr/local/bin/ 2>/dev/null || \
    go install github.com/assetnote/kiterunner/cmd/kr@latest 2>/dev/null || true

# arjun + paramspider — hidden parameter discovery
RUN pip3 install -q arjun paramspider 2>/dev/null || true

# naabu port scanner
RUN command -v naabu || go install github.com/projectdiscovery/naabu/v2/cmd/naabu@latest 2>/dev/null || true

# smap — Shodan-based passive port scan (no noise)
RUN go install github.com/s0md3v/smap/cmd/smap@latest 2>/dev/null || true

# eyewitness — screenshots
RUN pip3 install -q eyewitness 2>/dev/null || true

# aquatone
RUN go install github.com/michenriksen/aquatone@latest 2>/dev/null || true

# ─────────────────────────────────────────────────────────────────
# PHASE 3: VULNERABILITY SCANNING
# ─────────────────────────────────────────────────────────────────

# nuclei templates (9000+ templates)
RUN nuclei -update-templates -silent 2>/dev/null || true

# dalfox — best XSS scanner
RUN curl -sL https://github.com/hahwul/dalfox/releases/latest/download/dalfox_linux_amd64.tar.gz | \
    tar -xz -C /tmp && mv /tmp/dalfox /usr/local/bin/ 2>/dev/null || \
    go install github.com/hahwul/dalfox/v2@latest 2>/dev/null || true

# XSStrike
RUN git clone -q --depth 1 https://github.com/s0md3v/XSStrike /opt/xsstrike && \
    pip3 install -q -r /opt/xsstrike/requirements.txt 2>/dev/null && \
    printf '#!/bin/bash\npython3 /opt/xsstrike/xsstrike.py "$@"\n' > /usr/local/bin/xsstrike && \
    chmod +x /usr/local/bin/xsstrike

# sqlmap (latest from git)
RUN git clone -q --depth 1 https://github.com/sqlmapproject/sqlmap /opt/sqlmap && \
    ln -sf /opt/sqlmap/sqlmap.py /usr/local/bin/sqlmap2

# ghauri — advanced SQLi
RUN pip3 install -q ghauri 2>/dev/null || true

# byp4xx — 403 bypass
RUN go install github.com/lobuhi/byp4xx@latest 2>/dev/null || true

# CORS scanner
RUN git clone -q --depth 1 https://github.com/chenjj/CORScanner /opt/corsscanner && \
    pip3 install -q -r /opt/corsscanner/requirements.txt 2>/dev/null && \
    printf '#!/bin/bash\npython3 /opt/corsscanner/cors_scan.py "$@"\n' > /usr/local/bin/corsscan && \
    chmod +x /usr/local/bin/corsscan

# jwt_tool
RUN git clone -q --depth 1 https://github.com/ticarpi/jwt_tool /opt/jwt_tool && \
    pip3 install -q termcolor cprint pycryptodomex requests 2>/dev/null && \
    printf '#!/bin/bash\npython3 /opt/jwt_tool/jwt_tool.py "$@"\n' > /usr/local/bin/jwt_tool && \
    chmod +x /usr/local/bin/jwt_tool

# whatwaf — WAF detector
RUN pip3 install -q whatwaf 2>/dev/null || true

# ─────────────────────────────────────────────────────────────────
# PHASE 4: SECRET & CREDENTIAL HUNTING
# ─────────────────────────────────────────────────────────────────

# trufflehog v3 — 700+ secret detectors
RUN curl -sSfL https://raw.githubusercontent.com/trufflesecurity/trufflehog/main/scripts/install.sh | \
    sh -s -- -b /usr/local/bin 2>/dev/null || pip3 install -q trufflehog3 2>/dev/null || true

# gitleaks
RUN curl -sL https://github.com/gitleaks/gitleaks/releases/latest/download/gitleaks_linux_x64.tar.gz | \
    tar -xz -C /tmp && mv /tmp/gitleaks /usr/local/bin/ 2>/dev/null || true

# LinkFinder — JS endpoint extractor
RUN git clone -q --depth 1 https://github.com/GerbenJavado/LinkFinder /opt/linkfinder && \
    pip3 install -q -r /opt/linkfinder/requirements.txt 2>/dev/null && \
    printf '#!/bin/bash\npython3 /opt/linkfinder/linkfinder.py "$@"\n' > /usr/local/bin/linkfinder && \
    chmod +x /usr/local/bin/linkfinder

# SecretFinder
RUN git clone -q --depth 1 https://github.com/m4ll0k/SecretFinder /opt/secretfinder && \
    pip3 install -q jsbeautifier requests 2>/dev/null && \
    printf '#!/bin/bash\npython3 /opt/secretfinder/SecretFinder.py "$@"\n' > /usr/local/bin/secretfinder && \
    chmod +x /usr/local/bin/secretfinder

# jsluice — structural JS analysis
RUN go install github.com/BishopFox/jsluice/cmd/jsluice@latest 2>/dev/null || true

# git-hound
RUN go install github.com/tillson/git-hound@latest 2>/dev/null || true

# noseyparker
RUN curl -sL https://github.com/praetorian-inc/noseyparker/releases/latest/download/noseyparker-linux.tar.gz | \
    tar -xz -C /tmp && mv /tmp/noseyparker /usr/local/bin/ 2>/dev/null || true

# ─────────────────────────────────────────────────────────────────
# PHASE 5: CLOUD & INFRASTRUCTURE
# ─────────────────────────────────────────────────────────────────

# s3scanner
RUN go install github.com/sa7mon/s3scanner@latest 2>/dev/null || true

# cloud_enum
RUN pip3 install -q cloud-enum 2>/dev/null || true

# cloudfail — CloudFlare bypass
RUN git clone -q --depth 1 https://github.com/m0rtem/CloudFail /opt/cloudfail && \
    pip3 install -q -r /opt/cloudfail/requirements.txt 2>/dev/null && \
    printf '#!/bin/bash\npython3 /opt/cloudfail/cloudfail.py "$@"\n' > /usr/local/bin/cloudfail && \
    chmod +x /usr/local/bin/cloudfail

# ─────────────────────────────────────────────────────────────────
# PHASE 6: SUBDOMAIN TAKEOVER
# ─────────────────────────────────────────────────────────────────

RUN go install github.com/LukaSikic/subzy@latest 2>/dev/null || true
RUN go install github.com/haccer/subjack@latest  2>/dev/null || true
RUN pip3 install -q dnsreaper 2>/dev/null || true

# ─────────────────────────────────────────────────────────────────
# PHASE 7: POST-EXPLOITATION (authorized engagements only)
# ─────────────────────────────────────────────────────────────────

# LinPEAS / WinPEAS — privilege escalation enumeration
RUN mkdir -p /opt/peass && \
    curl -sL https://github.com/carlospolop/PEASS-ng/releases/latest/download/linpeas.sh \
      -o /opt/peass/linpeas.sh 2>/dev/null && chmod +x /opt/peass/linpeas.sh && \
    ln -sf /opt/peass/linpeas.sh /usr/local/bin/linpeas && \
    curl -sL https://github.com/carlospolop/PEASS-ng/releases/latest/download/winPEAS.bat \
      -o /opt/peass/winpeas.bat 2>/dev/null || true

# Sliver C2 — BishopFox open-source C2 framework
# Note: Server mode for authorized red team engagements only
RUN curl -sL https://github.com/BishopFox/sliver/releases/latest/download/sliver-server_linux \
      -o /usr/local/bin/sliver-server 2>/dev/null && \
    chmod +x /usr/local/bin/sliver-server && \
    curl -sL https://github.com/BishopFox/sliver/releases/latest/download/sliver-client_linux \
      -o /usr/local/bin/sliver-client 2>/dev/null && \
    chmod +x /usr/local/bin/sliver-client && \
    echo "Sliver C2 installed" || echo "Sliver: manual install needed"

# Havoc C2 — Modern Cobalt Strike alternative
RUN apt-get install -y -qq libfontconfig1-dev libglu1-mesa-dev libgtest-dev \
    libspdlog-dev libboost-all-dev libncurses5-dev 2>/dev/null || true && \
    git clone -q --depth 1 https://github.com/HavocFramework/Havoc /opt/havoc 2>/dev/null && \
    cd /opt/havoc && make ts-build 2>/dev/null || echo "Havoc: build requires manual setup"

# Metasploit Framework
RUN curl -sL https://raw.githubusercontent.com/rapid7/metasploit-omnibus/master/config/templates/metasploit-framework-wrappers/msfupdate.erb \
      -o /tmp/msfinstall 2>/dev/null && chmod +x /tmp/msfinstall && \
    /tmp/msfinstall 2>/dev/null || \
    gem install metasploit-framework 2>/dev/null || \
    echo "Metasploit: use docker image rapid7/metasploit-framework for full install"

# pwntools — exploit development
RUN pip3 install -q pwntools 2>/dev/null || true

# impacket — Windows protocol attacks
RUN pip3 install -q impacket 2>/dev/null || true

# evil-winrm — Windows remote management
RUN gem install evil-winrm 2>/dev/null || true

# crackmapexec — AD network swiss army knife
RUN pip3 install -q crackmapexec 2>/dev/null || \
    pip3 install -q 'crackmapexec>=5.4' 2>/dev/null || true

# Ligolo-ng — advanced tunneling (no SOCKS, full IP range)
RUN curl -sL https://github.com/nicocha30/ligolo-ng/releases/latest/download/ligolo-ng_proxy_linux_amd64.tar.gz | \
    tar -xz -C /tmp && mv /tmp/proxy /usr/local/bin/ligolo-proxy 2>/dev/null && \
    curl -sL https://github.com/nicocha30/ligolo-ng/releases/latest/download/ligolo-ng_agent_linux_amd64.tar.gz | \
    tar -xz -C /tmp && mv /tmp/agent /usr/local/bin/ligolo-agent 2>/dev/null || true

# Chisel — TCP/UDP tunneling over HTTP
RUN go install github.com/jpillora/chisel@latest 2>/dev/null || true

# kerbrute — Kerberos user enumeration
RUN go install github.com/ropnop/kerbrute@latest 2>/dev/null || true

# ─────────────────────────────────────────────────────────────────
# PHASE 8: WEB3 / SMART CONTRACT
# ─────────────────────────────────────────────────────────────────

# Foundry (forge + cast + anvil)
RUN curl -L https://foundry.paradigm.xyz | bash 2>/dev/null && \
    /root/.foundry/bin/foundryup 2>/dev/null && \
    ln -sf /root/.foundry/bin/forge /usr/local/bin/forge 2>/dev/null && \
    ln -sf /root/.foundry/bin/cast  /usr/local/bin/cast  2>/dev/null && \
    ln -sf /root/.foundry/bin/anvil /usr/local/bin/anvil 2>/dev/null || true

# Slither — Solidity static analysis
RUN pip3 install -q slither-analyzer 2>/dev/null || true

# Mythril — symbolic execution
RUN pip3 install -q mythril 2>/dev/null || true

# Web3 Python
RUN pip3 install -q web3 eth-abi py-solc-x 2>/dev/null || true

# ─────────────────────────────────────────────────────────────────
# PHASE 9: REPORTING & OSINT
# ─────────────────────────────────────────────────────────────────

# theHarvester
RUN pip3 install -q theHarvester 2>/dev/null || true

# maigret — username OSINT
RUN pip3 install -q maigret 2>/dev/null || true

# semgrep — static analysis
RUN pip3 install -q semgrep 2>/dev/null || true

# ─────────────────────────────────────────────────────────────────
# WORDLISTS
# ─────────────────────────────────────────────────────────────────
RUN mkdir -p /opt/wordlists && cd /opt/wordlists && \
    curl -sL https://raw.githubusercontent.com/danielmiessler/SecLists/master/Discovery/Web-Content/common.txt \
      -o common.txt 2>/dev/null && \
    curl -sL https://raw.githubusercontent.com/danielmiessler/SecLists/master/Discovery/Web-Content/raft-medium-directories.txt \
      -o dirs-medium.txt 2>/dev/null && \
    curl -sL https://raw.githubusercontent.com/danielmiessler/SecLists/master/Discovery/Web-Content/api/api-endpoints.txt \
      -o api-endpoints.txt 2>/dev/null && \
    curl -sL https://raw.githubusercontent.com/danielmiessler/SecLists/master/Discovery/Web-Content/burp-parameter-names.txt \
      -o params.txt 2>/dev/null && \
    curl -sL https://raw.githubusercontent.com/danielmiessler/SecLists/master/Discovery/DNS/subdomains-top1million-5000.txt \
      -o subdomains-5k.txt 2>/dev/null && \
    curl -sL https://raw.githubusercontent.com/danielmiessler/SecLists/master/Discovery/DNS/subdomains-top1million-20000.txt \
      -o subdomains-20k.txt 2>/dev/null || true

# kiterunner wordlists
RUN mkdir -p /opt/kr-wordlists && \
    curl -sL https://wordlists-cdn.assetnote.io/data/automated/httparchive_apiroutes_2023_11_28.txt \
      -o /opt/kr-wordlists/api-routes.txt 2>/dev/null || true

# ─────────────────────────────────────────────────────────────────
# FINAL SETUP
# ─────────────────────────────────────────────────────────────────
RUN chmod +x /usr/local/bin/* /root/go/bin/* 2>/dev/null || true
RUN mkdir -p /hunt /opt/sessions

# Nuclei templates update
RUN nuclei -update-templates -silent 2>/dev/null || true

# ─────────────────────────────────────────────────────────────────
# TOOL COUNT VERIFICATION
# ─────────────────────────────────────────────────────────────────
RUN echo "=== CODEVA HUNTER — TOOL VERIFICATION ===" && \
    pass=0; fail=0; \
    for t in \
      subfinder httpx nuclei katana dnsx naabu dalfox ffuf feroxbuster \
      gobuster sqlmap gau waybackurls anew gf qsreplace assetfinder \
      subjack subzy trufflehog gitleaks jsluice nmap masscan nikto \
      amass hakrawler gospider cariddi linpeas ligolo-proxy chisel \
      kerbrute arjun; do \
      if command -v $t > /dev/null 2>&1; then \
        echo "  ✓ $t"; pass=$((pass+1)); \
      else \
        echo "  ✗ $t"; fail=$((fail+1)); \
      fi; \
    done && \
    echo "" && echo "INSTALLED: $pass  NOT FOUND: $fail" && echo "========================================="

WORKDIR /hunt
CMD ["/bin/bash"]
