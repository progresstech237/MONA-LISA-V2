// ═══════════════════════════════════════════════════════════════════════════
//   🔎 RECON & WEB SECURITY (passive) — MONA LISA
//   Powered by Progress Tech
//
//   Everything here reads information a normal browser already receives
//   when visiting a public URL/domain — DNS records, WHOIS registration
//   data, HTTP response headers, the TLS certificate presented during a
//   normal handshake, robots.txt/sitemap.xml. Nothing here probes hidden
//   paths, scans ports, or touches anything beyond what's already publicly
//   served. Deliberately does NOT include active vulnerability scanning —
//   see README for why.
// ═══════════════════════════════════════════════════════════════════════════

const { cmd } = require('../redx');
const axios = require('axios');
const dns = require('dns').promises;
const tls = require('tls');
const net = require('net');
const { success, error } = require('../lib/responses');

function normalizeDomain(input) {
    return input.trim().replace(/^https?:\/\//i, '').replace(/\/.*$/, '');
}
function normalizeUrl(input) {
    const t = input.trim();
    return /^https?:\/\//i.test(t) ? t : `https://${t}`;
}

// ── DNS ──
cmd({ pattern: "dns", desc: "Look up DNS records for a domain", category: "tools", react: "🌐", filename: __filename },
    async (conn, mek, m, { reply, q }) => {
        if (!q) return reply("🌐 *Usage:* .dns <domain>");
        const domain = normalizeDomain(q);
        try {
            const [a, aaaa, mx, ns, txt] = await Promise.allSettled([
                dns.resolve4(domain), dns.resolve6(domain), dns.resolveMx(domain), dns.resolveNs(domain), dns.resolveTxt(domain),
            ]);
            const fmt = (r) => r.status === 'fulfilled' ? r.value : null;
            const lines = [];
            if (fmt(a)) lines.push(`*A:* ${fmt(a).join(', ')}`);
            if (fmt(aaaa)) lines.push(`*AAAA:* ${fmt(aaaa).join(', ')}`);
            if (fmt(mx)) lines.push(`*MX:* ${fmt(mx).map(x => x.exchange).join(', ')}`);
            if (fmt(ns)) lines.push(`*NS:* ${fmt(ns).join(', ')}`);
            if (fmt(txt)) lines.push(`*TXT:* ${fmt(txt).map(t => t.join('')).slice(0, 3).join(' | ')}`);
            reply(lines.length ? success(`🌐 *DNS records for ${domain}:*\n\n${lines.join('\n')}`) : error('No DNS records found.'));
        } catch (e) {
            reply(error(`DNS lookup failed: ${e.message}`));
        }
    });

// ── WHOIS (raw WHOIS protocol via IANA referral — no API key, standard protocol) ──
function whoisQuery(server, domain) {
    return new Promise((resolve, reject) => {
        const socket = net.createConnection(43, server);
        let data = '';
        socket.setTimeout(10000);
        socket.on('connect', () => socket.write(domain + '\r\n'));
        socket.on('data', chunk => data += chunk);
        socket.on('end', () => resolve(data));
        socket.on('timeout', () => { socket.destroy(); reject(new Error('WHOIS query timed out')); });
        socket.on('error', reject);
    });
}
cmd({ pattern: "whois", desc: "Look up domain registration info", category: "tools", react: "📋", filename: __filename },
    async (conn, mek, m, { reply, q }) => {
        if (!q) return reply("📋 *Usage:* .whois <domain>");
        const domain = normalizeDomain(q);
        try {
            const iana = await whoisQuery('whois.iana.org', domain);
            const referralMatch = iana.match(/refer:\s*(\S+)/i);
            const server = referralMatch ? referralMatch[1] : 'whois.iana.org';
            const raw = server !== 'whois.iana.org' ? await whoisQuery(server, domain) : iana;
            const trimmed = raw.split('\n').filter(l => l.trim() && !l.trim().startsWith('%') && !l.trim().startsWith('#')).slice(0, 25).join('\n');
            reply(success(`📋 *WHOIS for ${domain}:*\n\n\`\`\`${trimmed}\`\`\``));
        } catch (e) {
            reply(error(`WHOIS lookup failed: ${e.message}`));
        }
    });

// ── HTTP headers ──
cmd({ pattern: "headers", desc: "Fetch the HTTP response headers of a URL", category: "tools", react: "📨", filename: __filename },
    async (conn, mek, m, { reply, q }) => {
        if (!q) return reply("📨 *Usage:* .headers <url>");
        try {
            const res = await axios.get(normalizeUrl(q), { timeout: 15000, maxRedirects: 5, validateStatus: () => true });
            const lines = Object.entries(res.headers).map(([k, v]) => `*${k}:* ${v}`).join('\n');
            reply(success(`📨 *Headers for ${normalizeUrl(q)}* (HTTP ${res.status}):\n\n${lines}`));
        } catch (e) {
            reply(error(`Could not fetch headers: ${e.message}`));
        }
    });

// ── Security headers check ──
const SECURITY_HEADERS = ['strict-transport-security', 'content-security-policy', 'x-frame-options', 'x-content-type-options', 'referrer-policy', 'permissions-policy'];
cmd({ pattern: "securityheaders", desc: "Check which standard security headers a site sets", category: "tools", react: "🛡️", filename: __filename },
    async (conn, mek, m, { reply, q }) => {
        if (!q) return reply("🛡️ *Usage:* .securityheaders <url>");
        try {
            const res = await axios.get(normalizeUrl(q), { timeout: 15000, maxRedirects: 5, validateStatus: () => true });
            const lines = SECURITY_HEADERS.map(h => `${res.headers[h] ? '✅' : '❌'} ${h}`);
            reply(success(`🛡️ *Security headers for ${normalizeUrl(q)}:*\n\n${lines.join('\n')}`));
        } catch (e) {
            reply(error(`Check failed: ${e.message}`));
        }
    });

// ── Cookies ──
cmd({ pattern: "cookies", desc: "List cookies a URL sets on response", category: "tools", react: "🍪", filename: __filename },
    async (conn, mek, m, { reply, q }) => {
        if (!q) return reply("🍪 *Usage:* .cookies <url>");
        try {
            const res = await axios.get(normalizeUrl(q), { timeout: 15000, maxRedirects: 5, validateStatus: () => true });
            const cookies = res.headers['set-cookie'];
            reply(cookies?.length ? success(`🍪 *Cookies set by ${normalizeUrl(q)}:*\n\n${cookies.join('\n\n')}`) : success('No cookies were set on this response.'));
        } catch (e) {
            reply(error(`Check failed: ${e.message}`));
        }
    });

// ── CORS check ──
cmd({ pattern: "corscheck", desc: "Check a URL's CORS headers", category: "tools", react: "🔀", filename: __filename },
    async (conn, mek, m, { reply, q }) => {
        if (!q) return reply("🔀 *Usage:* .corscheck <url>");
        try {
            const res = await axios.get(normalizeUrl(q), { timeout: 15000, maxRedirects: 5, validateStatus: () => true, headers: { Origin: 'https://example.com' } });
            const acao = res.headers['access-control-allow-origin'];
            const acac = res.headers['access-control-allow-credentials'];
            reply(success(`🔀 *CORS for ${normalizeUrl(q)}:*\n\nAccess-Control-Allow-Origin: ${acao || '(not set)'}\nAccess-Control-Allow-Credentials: ${acac || '(not set)'}${acao === '*' && acac === 'true' ? '\n\n⚠️ Wildcard origin + credentials allowed together is a known misconfiguration pattern.' : ''}`));
        } catch (e) {
            reply(error(`Check failed: ${e.message}`));
        }
    });

// ── Redirect chain ──
cmd({ pattern: "redirectcheck", desc: "Trace the redirect chain for a URL", category: "tools", react: "↪️", filename: __filename },
    async (conn, mek, m, { reply, q }) => {
        if (!q) return reply("↪️ *Usage:* .redirectcheck <url>");
        try {
            const chain = [];
            let url = normalizeUrl(q);
            for (let i = 0; i < 10; i++) {
                const res = await axios.get(url, { timeout: 15000, maxRedirects: 0, validateStatus: () => true });
                chain.push(`${res.status} ${url}`);
                const loc = res.headers.location;
                if (!loc || res.status < 300 || res.status >= 400) break;
                url = new URL(loc, url).toString();
            }
            reply(success(`↪️ *Redirect chain:*\n\n${chain.join('\n↓\n')}`));
        } catch (e) {
            reply(error(`Check failed: ${e.message}`));
        }
    });

// ── TLS certificate info ──
cmd({ pattern: "sslcheck", alias: ["tlsaudit"], desc: "Inspect a domain's TLS certificate", category: "tools", react: "🔒", filename: __filename },
    async (conn, mek, m, { reply, q }) => {
        if (!q) return reply("🔒 *Usage:* .sslcheck <domain>");
        const domain = normalizeDomain(q);
        try {
            const cert = await new Promise((resolve, reject) => {
                const socket = tls.connect(443, domain, { servername: domain, timeout: 10000 }, () => {
                    const c = socket.getCertificate ? socket.getCertificate() : socket.getPeerCertificate();
                    socket.end();
                    resolve(c);
                });
                socket.on('error', reject);
                socket.on('timeout', () => { socket.destroy(); reject(new Error('Connection timed out')); });
            });
            if (!cert || !cert.subject) return reply(error('Could not retrieve a certificate.'));
            const now = Date.now();
            const validTo = new Date(cert.valid_to);
            const daysLeft = Math.round((validTo - now) / 86400000);
            reply(success(
                `🔒 *TLS certificate for ${domain}:*\n\n` +
                `Subject: ${cert.subject?.CN || 'N/A'}\n` +
                `Issuer: ${cert.issuer?.O || cert.issuer?.CN || 'N/A'}\n` +
                `Valid from: ${cert.valid_from}\n` +
                `Valid to: ${cert.valid_to}\n` +
                `${daysLeft < 0 ? '⚠️ *EXPIRED*' : daysLeft < 30 ? `⚠️ Expires in ${daysLeft} days` : `✅ ${daysLeft} days remaining`}`
            ));
        } catch (e) {
            reply(error(`TLS check failed: ${e.message}`));
        }
    });

// ── robots.txt / sitemap.xml ──
cmd({ pattern: "robots", desc: "Fetch a domain's robots.txt", category: "tools", react: "🤖", filename: __filename },
    async (conn, mek, m, { reply, q }) => {
        if (!q) return reply("🤖 *Usage:* .robots <domain>");
        try {
            const res = await axios.get(`${normalizeUrl(q).replace(/\/$/, '')}/robots.txt`, { timeout: 15000, validateStatus: () => true });
            reply(res.status === 200 ? success(`🤖 *robots.txt:*\n\n\`\`\`${res.data.slice(0, 1500)}\`\`\``) : error('No robots.txt found (or it returned an error).'));
        } catch (e) {
            reply(error(`Fetch failed: ${e.message}`));
        }
    });

cmd({ pattern: "sitemap", desc: "Fetch a domain's sitemap.xml", category: "tools", react: "🗺️", filename: __filename },
    async (conn, mek, m, { reply, q }) => {
        if (!q) return reply("🗺️ *Usage:* .sitemap <domain>");
        try {
            const res = await axios.get(`${normalizeUrl(q).replace(/\/$/, '')}/sitemap.xml`, { timeout: 15000, validateStatus: () => true });
            reply(res.status === 200 ? success(`🗺️ *sitemap.xml (first 1500 chars):*\n\n\`\`\`${res.data.slice(0, 1500)}\`\`\``) : error('No sitemap.xml found (or it returned an error).'));
        } catch (e) {
            reply(error(`Fetch failed: ${e.message}`));
        }
    });

// ── CVE lookup (NVD — real, free, public vulnerability database) ──
cmd({ pattern: "cve", alias: ["cveinfo"], desc: "Look up a CVE by ID, e.g. .cve CVE-2021-44228", category: "tools", react: "🛡️", filename: __filename },
    async (conn, mek, m, { reply, q }) => {
        if (!q || !/^CVE-\d{4}-\d+$/i.test(q.trim())) return reply("🛡️ *Usage:* .cve <CVE-ID>\n\nExample: .cve CVE-2021-44228");
        try {
            const res = await axios.get(`https://services.nvd.nist.gov/rest/json/cves/2.0?cveId=${q.trim().toUpperCase()}`, { timeout: 20000 });
            const vuln = res.data?.vulnerabilities?.[0]?.cve;
            if (!vuln) return reply(error(`No data found for ${q}.`));
            const desc = vuln.descriptions?.find(d => d.lang === 'en')?.value || 'No description available.';
            const metrics = vuln.metrics?.cvssMetricV31?.[0] || vuln.metrics?.cvssMetricV30?.[0] || vuln.metrics?.cvssMetricV2?.[0];
            const score = metrics?.cvssData?.baseScore;
            const severity = metrics?.cvssData?.baseSeverity || metrics?.baseSeverity;
            reply(success(
                `🛡️ *${vuln.id}*\n\n` +
                `${score ? `📊 CVSS: ${score} (${severity})\n` : ''}` +
                `📅 Published: ${vuln.published?.split('T')[0] || 'N/A'}\n\n` +
                `${desc.slice(0, 700)}${desc.length > 700 ? '...' : ''}\n\n` +
                `🔗 https://nvd.nist.gov/vuln/detail/${vuln.id}`
            ));
        } catch (e) {
            reply(error(`CVE lookup failed: ${e.response?.status === 404 ? 'not found' : e.message}`));
        }
    });
