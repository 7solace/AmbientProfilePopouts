/**
 * @name AmbientProfilePopouts
 * @author s7lace
 * @version 1.3.2
 * @description Adds adaptive ambient glow effects and useful profile tools to Discord profile popouts.
 * @updateUrl https://raw.githubusercontent.com/7solace/AmbientProfilePopouts/main/AmbientProfilePopouts.plugin.js
 * @downloadUrl https://raw.githubusercontent.com/7solace/AmbientProfilePopouts/main/AmbientProfilePopouts.plugin.js
 */

const PLUGIN_NAME = "AmbientProfilePopouts";
const PLUGIN_FILE = "AmbientProfilePopouts.plugin.js";
const UPDATE_URL = "https://raw.githubusercontent.com/7solace/AmbientProfilePopouts/main/AmbientProfilePopouts.plugin.js";
const UPDATE_CHECK_INTERVAL = 30 * 60 * 1000;
const PROFILE_SELECTORS = [
    '[class*="userProfileOuter_"]',
    '[class*="userProfileModalOuter_"]',
    '[class*="userPopoutOuter_"]',
    '[class*="profileOuter_"]'
].join(",");
const IMAGE_SELECTORS = [
    'img[src*="i.scdn.co"]',
    'img[src*="spotify"]',
    'svg foreignObject img',
    'img[class*="avatar"]',
    '[class*="avatar_"] img',
    '[class*="banner_"] img',
    '[class*="profileBanner_"] img'
].join(",");
const LINK_SCOPE_SELECTORS = [
    '[id^="chat-messages-"]',
    '[class*="message_"]',
    '[class*="embed_"]'
].join(",");
const SUSPICIOUS_DOMAINS = new Set([
    "bit.ly",
    "tinyurl.com",
    "t.co",
    "goo.gl",
    "is.gd",
    "cutt.ly",
    "rb.gy",
    "shorturl.at",
    "grabify.link",
    "iplogger.org",
    "2no.co"
]);

module.exports = class AmbientProfilePopouts {
    start() {
        try {
            this.colorRefreshTimers = new WeakMap();
            this.handleShiftClickCopy = this.handleShiftClickCopy.bind(this);
            document.addEventListener("click", this.handleShiftClickCopy, true);
            this.checkForUpdates();
            this.updateInterval = setInterval(() => this.checkForUpdates(true), UPDATE_CHECK_INTERVAL);
            this.injectCSS();
            this.scanExistingProfiles();
            this.scanExistingMessageEnhancements();

            this.observer = new MutationObserver((mutations) => {
                for (const mutation of mutations) {
                    if (mutation.type === "attributes") {
                        const profile = mutation.target.closest?.(PROFILE_SELECTORS);
                        if (profile) {
                            this.queueColorRefresh(profile);
                            this.polishSpotifyCards(profile);
                        }
                        continue;
                    }

                    for (const node of mutation.addedNodes) {
                        if (node.nodeType !== Node.ELEMENT_NODE) continue;
                        for (const profile of this.findProfileRoots(node)) this.addAmbientGlow(profile);
                        this.enhanceMessageNode(node);
                    }
                }
            });

            const appMount = document.getElementById("app-mount") || document.body;
            this.observer.observe(appMount, {
                childList: true,
                subtree: true,
                attributes: true,
                attributeFilter: ["class", "src"]
            });
        } catch (err) {
            console.error(`${PLUGIN_NAME} start failed:`, err);
        }
    }

    stop() {
        BdApi.DOM.removeStyle("AmbientProfileCSS");
        document.removeEventListener("click", this.handleShiftClickCopy, true);
        if (this.observer) this.observer.disconnect();
        if (this.updateInterval) clearInterval(this.updateInterval);
        document.querySelectorAll(".ambient-profile-container").forEach(el => el.remove());
        document.querySelectorAll(".ambient-profile-tools").forEach(el => el.remove());
        document.querySelectorAll(".ambient-profile-note").forEach(el => el.remove());
        document.querySelectorAll(".ambient-link-tools").forEach(el => el.remove());
        document.querySelectorAll(".ambient-code-copy").forEach(el => el.remove());
        document.querySelectorAll(".ambient-profile-tags").forEach(el => el.remove());
        document.querySelectorAll(".ambient-enhanced-link").forEach(el => {
            el.classList.remove("ambient-enhanced-link");
            el.removeAttribute("data-ambient-domain");
            el.removeAttribute("data-ambient-risk");
        });
        document.querySelectorAll(".ambient-enhanced-code").forEach(el => el.classList.remove("ambient-enhanced-code"));
        document.querySelectorAll(".ambient-spotify-card").forEach(el => el.classList.remove("ambient-spotify-card"));
        document.querySelectorAll(".ambient-profile-root").forEach(el => el.classList.remove("ambient-profile-root"));
    }

    async checkForUpdates(silent = false) {
        if (this.isCheckingForUpdates) return;
        this.isCheckingForUpdates = true;

        try {
            const fs = require("fs");
            const path = require("path");
            const addon = BdApi.Plugins.get(PLUGIN_NAME);
            const fileName = addon?.filename || PLUGIN_FILE;
            const targetPath = path.join(BdApi.Plugins.folder, fileName);
            const localContent = fs.existsSync(targetPath) ? fs.readFileSync(targetPath, "utf8") : "";
            const currentVersion = addon?.version || this.getMetaValue(localContent, "version");

            if (!currentVersion) throw new Error("Local version could not be read.");

            const response = await BdApi.Net.fetch(this.withCacheBuster(UPDATE_URL), {
                headers: {
                    "Cache-Control": "no-cache",
                    "Pragma": "no-cache"
                },
                timeout: 15000
            });

            if (!response || !response.ok) {
                throw new Error(`Update file could not be fetched. HTTP ${response?.status || "?"}`);
            }

            const remoteContent = await response.text();
            const remoteName = this.getMetaValue(remoteContent, "name");
            const remoteVersion = this.getMetaValue(remoteContent, "version");

            this.validateUpdate(remoteContent, remoteName, remoteVersion);
            if (!this.isNewerVersion(remoteVersion, currentVersion)) return;

            const tempPath = targetPath + ".download";
            fs.writeFileSync(tempPath, remoteContent, "utf8");
            fs.renameSync(tempPath, targetPath);

            BdApi.UI?.showToast?.(`${PLUGIN_NAME} ${remoteVersion} downloaded. Reload Discord.`, {type: "success"});
            console.log(`${PLUGIN_NAME} ${currentVersion} -> ${remoteVersion} updated.`);
        } catch (err) {
            if (!silent) console.error(`${PLUGIN_NAME} update check failed:`, err);
        } finally {
            this.isCheckingForUpdates = false;
        }
    }

    withCacheBuster(url) {
        return url + (url.includes("?") ? "&" : "?") + "t=" + Date.now();
    }

    validateUpdate(content, name, version) {
        if (name !== PLUGIN_NAME) throw new Error("Remote plugin name does not match.");
        if (!version || !/^\d+(?:\.\d+){1,3}$/.test(version)) throw new Error("Remote plugin version is invalid.");
        if (!content.includes("module.exports")) throw new Error("Remote file does not look like a plugin.");
        if (content.length < 1000) throw new Error("Remote file looks unexpectedly short.");
    }

    getMetaValue(content, key) {
        const match = content.match(new RegExp("^\\s*\\*\\s*@" + key + "\\s+(.+)$", "mi"));
        return match ? match[1].trim() : "";
    }

    isNewerVersion(remoteVersion, currentVersion) {
        const remoteParts = remoteVersion.split(".").map(part => parseInt(part, 10) || 0);
        const currentParts = currentVersion.split(".").map(part => parseInt(part, 10) || 0);
        const length = Math.max(remoteParts.length, currentParts.length);

        for (let i = 0; i < length; i++) {
            const remotePart = remoteParts[i] || 0;
            const currentPart = currentParts[i] || 0;
            if (remotePart > currentPart) return true;
            if (remotePart < currentPart) return false;
        }

        return false;
    }

    injectCSS() {
        const css = `
        .ambient-profile-root {
            --ambient-base: 114, 137, 218;
            --ambient-bright: 153, 170, 255;
            --ambient-soft: 230, 235, 255;
            --ambient-panel-alpha: 0.62;
            --ambient-edge-alpha: 0.52;
            position: relative !important;
            overflow: hidden !important;
            isolation: isolate !important;
            border-radius: inherit;
            background:
                linear-gradient(160deg, rgba(var(--ambient-base), 0.24), rgba(12, 12, 16, var(--ambient-panel-alpha)) 42%, rgba(0, 0, 0, 0.52)),
                var(--background-floating, rgba(18, 18, 22, 0.88)) !important;
            box-shadow:
                0 18px 46px rgba(0, 0, 0, 0.42),
                0 0 30px rgba(var(--ambient-base), 0.18) !important;
            backdrop-filter: blur(22px) saturate(150%) !important;
        }

        .ambient-profile-root > :not(.ambient-profile-container) {
            position: relative !important;
            z-index: 2 !important;
        }

        .ambient-profile-root [class*="userProfileInner_"],
        .ambient-profile-root [class*="profileInner_"],
        .ambient-profile-root [class*="overlayBackground_"] {
            background-color: rgba(8, 8, 12, 0.34) !important;
            background-image: none !important;
            backdrop-filter: blur(8px) saturate(125%);
        }

        .ambient-profile-root [class*="userProfileInner_"]::before,
        .ambient-profile-root [class*="profileInner_"]::before {
            opacity: 0.18 !important;
        }

        .ambient-profile-container {
            position: absolute;
            inset: 0;
            border-radius: inherit;
            overflow: hidden;
            pointer-events: none;
            z-index: 0;
            background:
                radial-gradient(circle at 18% 18%, rgba(var(--ambient-soft), 0.22), transparent 34%),
                radial-gradient(circle at 82% 12%, rgba(var(--ambient-bright), 0.20), transparent 32%),
                linear-gradient(135deg, rgba(var(--ambient-base), 0.16), transparent 54%);
        }

        .ambient-glow-main {
            position: absolute;
            inset: -42%;
            background:
                radial-gradient(circle at 30% 35%, rgba(var(--ambient-base), 0.70), transparent 46%),
                radial-gradient(circle at 72% 70%, rgba(var(--ambient-bright), 0.38), transparent 42%),
                conic-gradient(from 120deg, rgba(var(--ambient-base), 0.12), rgba(var(--ambient-bright), 0.26), rgba(var(--ambient-soft), 0.10), rgba(var(--ambient-base), 0.12));
            background-size: 150% 150%;
            filter: blur(30px) saturate(145%);
            opacity: 0.82;
            animation: ambientGlowMove 18s ease-in-out infinite alternate;
        }

        .ambient-glow-pop {
            position: absolute;
            top: 18%;
            left: 50%;
            width: 92%;
            height: 68%;
            transform: translate(-50%, -50%) scale(1);
            background: radial-gradient(circle, rgba(var(--ambient-bright), 0.58), transparent 58%);
            opacity: 0.48;
            filter: blur(42px);
            animation: neonPulse 9s ease-in-out infinite alternate;
        }

        .ambient-glow-sheen {
            position: absolute;
            inset: -2px;
            background:
                linear-gradient(115deg, transparent 0%, rgba(255, 255, 255, 0.16) 38%, transparent 58%),
                linear-gradient(180deg, rgba(var(--ambient-soft), 0.10), transparent 42%);
            mix-blend-mode: screen;
            opacity: 0.62;
            animation: ambientSheen 12s ease-in-out infinite;
        }

        .ambient-profile-root::after {
            content: '';
            position: absolute;
            inset: 0;
            border-radius: inherit;
            padding: 1px;
            background:
                linear-gradient(135deg, rgba(var(--ambient-soft), 0.34), rgba(var(--ambient-bright), var(--ambient-edge-alpha)) 34%, transparent 62%, rgba(var(--ambient-base), 0.34));
            background-size: 200% 200%;
            -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
            -webkit-mask-composite: xor;
            mask-composite: exclude;
            pointer-events: none;
            z-index: 4;
            animation: borderRotate 7s linear infinite;
        }

        .ambient-profile-tools {
            position: absolute;
            right: 44px;
            top: 10px;
            z-index: 6;
            display: flex;
            align-items: center;
            gap: 6px;
            padding: 5px;
            border: 1px solid rgba(var(--ambient-soft), 0.20);
            border-radius: 10px;
            background: rgba(12, 12, 16, 0.50);
            box-shadow: 0 10px 26px rgba(0, 0, 0, 0.30);
            backdrop-filter: blur(14px) saturate(145%);
            pointer-events: auto;
        }

        .ambient-profile-root[class*="userProfileModalOuter_"] .ambient-profile-tools,
        .ambient-profile-root[class*="profileOuter_"] .ambient-profile-tools {
            top: 12px;
            right: 56px;
        }

        .ambient-profile-tool {
            height: 28px;
            min-width: 34px;
            padding: 0 9px;
            border: 0;
            border-radius: 7px;
            color: var(--interactive-active, #fff);
            background: rgba(255, 255, 255, 0.08);
            font-size: 12px;
            font-weight: 700;
            line-height: 28px;
            cursor: pointer;
            transition: background 160ms ease, color 160ms ease, transform 160ms ease;
        }

        .ambient-profile-tool:hover:not(:disabled) {
            background: rgba(var(--ambient-bright), 0.24);
            color: #fff;
            transform: translateY(-1px);
        }

        .ambient-profile-tool:disabled {
            cursor: not-allowed;
            opacity: 0.42;
        }

        .ambient-profile-note {
            position: absolute;
            right: 44px;
            top: 52px;
            z-index: 7;
            width: min(280px, calc(100% - 64px));
            padding: 10px;
            border: 1px solid rgba(var(--ambient-soft), 0.22);
            border-radius: 10px;
            background: rgba(10, 10, 14, 0.86);
            box-shadow: 0 16px 40px rgba(0, 0, 0, 0.42);
            backdrop-filter: blur(18px) saturate(145%);
            pointer-events: auto;
        }

        .ambient-profile-note[hidden] {
            display: none;
        }

        .ambient-profile-note textarea {
            box-sizing: border-box;
            width: 100%;
            min-height: 86px;
            resize: vertical;
            border: 0;
            outline: none;
            border-radius: 8px;
            padding: 9px;
            color: var(--text-normal, #dbdee1);
            background: rgba(0, 0, 0, 0.32);
            font: 500 12px/1.4 var(--font-primary, sans-serif);
        }

        .ambient-profile-note-label {
            display: block;
            margin: 8px 0 5px;
            color: var(--text-muted, #949ba4);
            font-size: 10px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.04em;
        }

        .ambient-profile-note-footer {
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 8px;
            margin-top: 8px;
            color: var(--text-muted, #949ba4);
            font-size: 11px;
        }

        .ambient-profile-note-clear {
            border: 0;
            border-radius: 6px;
            padding: 5px 8px;
            color: var(--interactive-normal, #b5bac1);
            background: rgba(255, 255, 255, 0.08);
            cursor: pointer;
            font-size: 11px;
        }

        .ambient-profile-tag-input {
            box-sizing: border-box;
            width: 100%;
            height: 30px;
            margin-top: 8px;
            border: 0;
            outline: none;
            border-radius: 8px;
            padding: 0 9px;
            color: var(--text-normal, #dbdee1);
            background: rgba(255, 255, 255, 0.075);
            font: 700 11px/30px var(--font-primary, sans-serif);
        }

        .ambient-profile-tags {
            position: absolute;
            right: 44px;
            top: 52px;
            z-index: 5;
            display: flex;
            max-width: min(300px, calc(100% - 70px));
            flex-wrap: wrap;
            justify-content: flex-end;
            gap: 5px;
            pointer-events: none;
        }

        .ambient-profile-note:not([hidden]) ~ .ambient-profile-tags {
            display: none;
        }

        .ambient-profile-tag {
            max-width: 116px;
            overflow: hidden;
            text-overflow: ellipsis;
            border: 1px solid rgba(var(--ambient-soft), 0.20);
            border-radius: 999px;
            padding: 3px 7px;
            color: #fff;
            background: rgba(var(--ambient-base), 0.34);
            box-shadow: 0 8px 18px rgba(0, 0, 0, 0.22);
            backdrop-filter: blur(10px);
            font-size: 10px;
            font-weight: 800;
            line-height: 1;
        }

        [class*="menu_"],
        [class*="submenu_"],
        [class*="tooltip_"],
        [class*="popout_"]:not(.ambient-profile-root):not([class*="userPopoutOuter_"]),
        [class*="picker_"],
        [class*="autocomplete_"],
        [class*="container_"][role="dialog"] {
            background-color: rgba(18, 18, 24, 0.72) !important;
            border: 1px solid rgba(255, 255, 255, 0.08) !important;
            box-shadow: 0 18px 48px rgba(0, 0, 0, 0.42), 0 0 28px rgba(114, 137, 218, 0.08) !important;
            backdrop-filter: blur(18px) saturate(145%) !important;
        }

        [class*="menu_"] [class*="item_"]:hover,
        [class*="submenu_"] [class*="item_"]:hover {
            background-color: rgba(114, 137, 218, 0.18) !important;
        }

        .ambient-enhanced-link {
            text-decoration-thickness: 2px !important;
            text-underline-offset: 2px !important;
        }

        .ambient-link-tools {
            display: inline-flex;
            align-items: center;
            gap: 4px;
            margin-left: 5px;
            vertical-align: baseline;
            white-space: nowrap;
        }

        .ambient-link-domain,
        .ambient-link-copy {
            display: inline-flex;
            align-items: center;
            height: 18px;
            border: 1px solid rgba(255, 255, 255, 0.10);
            border-radius: 6px;
            color: var(--text-muted, #949ba4);
            background: rgba(255, 255, 255, 0.055);
            font-size: 10px;
            font-weight: 700;
            line-height: 18px;
        }

        .ambient-link-domain {
            max-width: 150px;
            padding: 0 6px;
            overflow: hidden;
            text-overflow: ellipsis;
        }

        .ambient-link-copy {
            padding: 0 6px;
            cursor: pointer;
            font-family: var(--font-primary, sans-serif);
        }

        .ambient-link-copy:hover {
            color: #fff;
            background: rgba(114, 137, 218, 0.22);
        }

        .ambient-enhanced-link[data-ambient-risk="warn"] {
            color: #ffd166 !important;
        }

        .ambient-enhanced-link[data-ambient-risk="danger"] {
            color: #ff6b6b !important;
        }

        .ambient-link-domain[data-ambient-risk="warn"] {
            color: #ffd166;
            border-color: rgba(255, 209, 102, 0.32);
            background: rgba(255, 209, 102, 0.12);
        }

        .ambient-link-domain[data-ambient-risk="danger"] {
            color: #ffb3b3;
            border-color: rgba(255, 107, 107, 0.34);
            background: rgba(255, 107, 107, 0.14);
        }

        .ambient-enhanced-code {
            position: relative !important;
        }

        .ambient-code-copy {
            position: absolute;
            top: 6px;
            right: 6px;
            z-index: 3;
            height: 22px;
            min-width: 38px;
            border: 1px solid rgba(255, 255, 255, 0.10);
            border-radius: 6px;
            color: var(--text-muted, #949ba4);
            background: rgba(12, 12, 16, 0.62);
            backdrop-filter: blur(10px);
            cursor: pointer;
            font-size: 10px;
            font-weight: 800;
            opacity: 0;
            transition: opacity 140ms ease, background 140ms ease, color 140ms ease;
        }

        .ambient-enhanced-code:hover .ambient-code-copy,
        .ambient-code-copy:focus-visible {
            opacity: 1;
        }

        .ambient-code-copy:hover {
            color: #fff;
            background: rgba(114, 137, 218, 0.24);
        }

        .ambient-spotify-card {
            position: relative !important;
            overflow: hidden !important;
            border: 1px solid rgba(30, 215, 96, 0.34) !important;
            box-shadow: 0 0 26px rgba(30, 215, 96, 0.14), inset 0 0 0 1px rgba(255, 255, 255, 0.03) !important;
        }

        .ambient-spotify-card::after {
            content: '';
            position: absolute;
            inset: 0;
            pointer-events: none;
            background: linear-gradient(120deg, rgba(30, 215, 96, 0.10), transparent 42%);
            opacity: 0.88;
        }

        @keyframes ambientGlowMove {
            0% { transform: translate3d(-2%, -1%, 0) rotate(0deg) scale(1); background-position: 0% 50%; }
            50% { transform: translate3d(2%, 1%, 0) rotate(8deg) scale(1.04); background-position: 100% 50%; }
            100% { transform: translate3d(-1%, 2%, 0) rotate(-6deg) scale(1.02); background-position: 0% 50%; }
        }

        @keyframes neonPulse {
            0% { transform: translate(-50%, -50%) scale(0.94); opacity: 0.30; }
            100% { transform: translate(-50%, -50%) scale(1.12); opacity: 0.58; }
        }

        @keyframes ambientSheen {
            0%, 100% { transform: translateX(-18%); opacity: 0.32; }
            50% { transform: translateX(18%); opacity: 0.64; }
        }

        @keyframes borderRotate {
            0% { background-position: 0% 0%; }
            100% { background-position: 200% 200%; }
        }
        `;
        BdApi.DOM.addStyle("AmbientProfileCSS", css);
    }

    scanExistingProfiles() {
        for (const profile of document.querySelectorAll(PROFILE_SELECTORS)) this.addAmbientGlow(profile);
    }

    findProfileRoots(node) {
        const roots = new Set();
        if (node.matches?.(PROFILE_SELECTORS)) roots.add(node);
        node.querySelectorAll?.(PROFILE_SELECTORS).forEach(profile => roots.add(profile));
        return roots;
    }

    scanExistingMessageEnhancements() {
        this.enhanceMessageNode(document);
    }

    enhanceMessageNode(root) {
        this.enhanceLinks(root);
        this.enhanceCodeBlocks(root);
    }

    enhanceLinks(root) {
        const anchors = [];
        if (root.matches?.("a[href]")) anchors.push(root);
        root.querySelectorAll?.("a[href]").forEach(anchor => anchors.push(anchor));

        for (const anchor of anchors) this.enhanceLink(anchor);
    }

    enhanceLink(anchor) {
        if (anchor.classList.contains("ambient-enhanced-link")) return;
        if (!anchor.closest(LINK_SCOPE_SELECTORS)) return;
        if (anchor.closest(".ambient-link-tools, .ambient-profile-tools, .ambient-profile-note")) return;
        if (anchor.querySelector("img, video, canvas, svg")) return;

        const url = this.parseHttpUrl(anchor.href);
        if (!url) return;

        const domain = this.getDisplayDomain(url);
        if (!domain || domain === "discord.com") return;
        const risk = this.getLinkRisk(url);

        anchor.classList.add("ambient-enhanced-link");
        anchor.dataset.ambientDomain = domain;
        anchor.dataset.ambientRisk = risk;

        const tools = document.createElement("span");
        tools.className = "ambient-link-tools";
        tools.contentEditable = "false";

        const domainBadge = document.createElement("span");
        domainBadge.className = "ambient-link-domain";
        domainBadge.dataset.ambientRisk = risk;
        domainBadge.textContent = risk === "safe" ? domain : `! ${domain}`;
        domainBadge.title = this.getLinkRiskTitle(url, risk);

        const copyButton = document.createElement("button");
        copyButton.className = "ambient-link-copy";
        copyButton.type = "button";
        copyButton.textContent = "Copy";
        copyButton.title = "Copy link";
        copyButton.addEventListener("click", (event) => {
            event.preventDefault();
            event.stopPropagation();
            this.copyText(url.href, "Link copied.");
        });

        tools.append(domainBadge, copyButton);
        anchor.insertAdjacentElement("afterend", tools);
    }

    parseHttpUrl(href) {
        try {
            const url = new URL(href);
            if (url.protocol !== "http:" && url.protocol !== "https:") return null;
            return url;
        } catch {
            return null;
        }
    }

    getDisplayDomain(url) {
        return url.hostname.replace(/^www\./i, "").toLowerCase();
    }

    getLinkRisk(url) {
        const domain = this.getDisplayDomain(url);
        if (SUSPICIOUS_DOMAINS.has(domain)) return "danger";
        if (domain.startsWith("xn--")) return "warn";
        if (/^\d{1,3}(?:\.\d{1,3}){3}$/.test(domain)) return "warn";
        if (domain.split(".").length > 3) return "warn";
        return "safe";
    }

    getLinkRiskTitle(url, risk) {
        if (risk === "danger") return `Risky shortener/logger style domain: ${url.href}`;
        if (risk === "warn") return `Check this domain before opening: ${url.href}`;
        return url.href;
    }

    enhanceCodeBlocks(root) {
        const blocks = [];
        if (root.matches?.("pre")) blocks.push(root);
        root.querySelectorAll?.("pre").forEach(block => blocks.push(block));

        for (const block of blocks) {
            if (!block.closest(LINK_SCOPE_SELECTORS)) continue;
            if (block.classList.contains("ambient-enhanced-code")) continue;

            const text = this.extractCodeText(block);
            if (!text) continue;

            block.classList.add("ambient-enhanced-code");
            const button = document.createElement("button");
            button.className = "ambient-code-copy";
            button.type = "button";
            button.textContent = "Copy";
            button.title = "Copy code block";
            button.addEventListener("click", (event) => {
                event.preventDefault();
                event.stopPropagation();
                this.copyText(this.extractCodeText(block), "Code copied.");
            });
            block.appendChild(button);
        }
    }

    extractCodeText(block) {
        const code = block.querySelector("code");
        const source = code || block.cloneNode(true);
        source.querySelector?.(".ambient-code-copy")?.remove();
        return this.normalizeCopiedText(source.innerText || source.textContent || "");
    }

    addAmbientGlow(popout) {
        if (!popout) return;

        if (popout.querySelector(".ambient-profile-container")) {
            popout.classList.add("ambient-profile-root");
            this.queueColorRefresh(popout);
            this.ensureProfileTools(popout);
            this.renderProfileTags(popout);
            this.polishSpotifyCards(popout);
            return;
        }

        setTimeout(() => {
            if (!document.body.contains(popout) || popout.querySelector(".ambient-profile-container")) return;

            popout.classList.add("ambient-profile-root");

            const containerDiv = document.createElement("div");
            containerDiv.className = "ambient-profile-container";

            const mainGlow = document.createElement("div");
            mainGlow.className = "ambient-glow-main";
            containerDiv.appendChild(mainGlow);

            const popGlow = document.createElement("div");
            popGlow.className = "ambient-glow-pop";
            containerDiv.appendChild(popGlow);

            const sheen = document.createElement("div");
            sheen.className = "ambient-glow-sheen";
            containerDiv.appendChild(sheen);

            popout.insertBefore(containerDiv, popout.firstChild);
            this.updateProfileColors(popout);
            this.ensureProfileTools(popout);
            this.renderProfileTags(popout);
            this.polishSpotifyCards(popout);
        }, 180);
    }

    queueColorRefresh(popout) {
        const existingTimer = this.colorRefreshTimers?.get(popout);
        if (existingTimer) clearTimeout(existingTimer);

        const timer = setTimeout(() => {
            this.colorRefreshTimers?.delete(popout);
            if (document.body.contains(popout)) this.updateProfileColors(popout);
        }, 180);

        this.colorRefreshTimers?.set(popout, timer);
    }

    updateProfileColors(popout) {
        this.applyFallbackColors(popout);
        this.applyImageColors(popout);
    }

    applyFallbackColors(popout) {
        const computed = getComputedStyle(popout);
        const candidates = [
            computed.getPropertyValue("--profile-gradient-primary-color"),
            computed.getPropertyValue("--profile-gradient-secondary-color"),
            computed.getPropertyValue("--brand-500"),
            computed.getPropertyValue("--background-accent"),
            computed.getPropertyValue("--interactive-active")
        ];
        const rgb = candidates.map(value => this.parseCssColor(value)).find(Boolean) || [114, 137, 218];
        this.setAmbientColors(popout, rgb);
    }

    applyImageColors(popout) {
        const img = this.pickBestImage(popout);
        if (!img?.src) return;

        const probe = new Image();
        probe.crossOrigin = "Anonymous";
        probe.onload = () => {
            const rgb = this.sampleImageColor(probe);
            if (rgb) this.setAmbientColors(popout, rgb);
        };
        probe.onerror = () => {};
        probe.src = this.normalizeImageUrl(img.src);
    }

    pickBestImage(popout) {
        const images = Array.from(popout.querySelectorAll(IMAGE_SELECTORS)).filter(img => img.src);
        return images.find(img => img.src.includes("i.scdn.co") || img.src.includes("spotify"))
            || images.find(img => img.width >= 64 || img.height >= 64)
            || images[0];
    }

    normalizeImageUrl(src) {
        if (!src.includes("cdn.discordapp.com") && !src.includes("media.discordapp.net")) return src;
        const cleanUrl = src.split("?")[0];
        return cleanUrl + "?size=128";
    }

    sampleImageColor(img) {
        try {
            const canvas = document.createElement("canvas");
            const size = 12;
            canvas.width = size;
            canvas.height = size;
            const ctx = canvas.getContext("2d", {willReadFrequently: true});
            ctx.drawImage(img, 0, 0, size, size);
            const pixels = ctx.getImageData(0, 0, size, size).data;
            let r = 0;
            let g = 0;
            let b = 0;
            let count = 0;

            for (let i = 0; i < pixels.length; i += 4) {
                const alpha = pixels[i + 3];
                if (alpha < 90) continue;
                const pr = pixels[i];
                const pg = pixels[i + 1];
                const pb = pixels[i + 2];
                const brightness = (pr + pg + pb) / 3;
                if (brightness < 18 || brightness > 242) continue;
                r += pr;
                g += pg;
                b += pb;
                count++;
            }

            if (!count) return null;
            return [Math.round(r / count), Math.round(g / count), Math.round(b / count)];
        } catch {
            return null;
        }
    }

    setAmbientColors(popout, rgb) {
        const base = this.boostColor(rgb);
        const bright = this.mixColor(base, [255, 255, 255], 0.28);
        const soft = this.mixColor(base, [255, 255, 255], 0.58);

        popout.style.setProperty("--ambient-base", base.join(", "));
        popout.style.setProperty("--ambient-bright", bright.join(", "));
        popout.style.setProperty("--ambient-soft", soft.join(", "));
    }

    boostColor(rgb) {
        const max = Math.max(...rgb);
        const scale = max < 150 ? 150 / Math.max(max, 1) : 1;
        return rgb.map(value => Math.max(36, Math.min(255, Math.round(value * scale))));
    }

    mixColor(a, b, amount) {
        return a.map((value, index) => Math.round(value + (b[index] - value) * amount));
    }

    ensureProfileTools(popout) {
        if (popout.querySelector(".ambient-profile-tools")) {
            this.updateProfileTools(popout);
            return;
        }

        const tools = document.createElement("div");
        tools.className = "ambient-profile-tools";

        const copyId = this.createToolButton("ID", "Copy user ID", () => {
            const data = this.getProfileData(popout);
            if (!data.id) return this.toast("User ID not found.", "error");
            this.copyText(data.id, "User ID copied.");
        });

        const copyName = this.createToolButton("User", "Copy username", () => {
            const data = this.getProfileData(popout);
            if (!data.username) return this.toast("Username not found.", "error");
            this.copyText(data.username, "Username copied.");
        });

        const copyLink = this.createToolButton("Link", "Copy profile link", () => {
            const data = this.getProfileData(popout);
            if (!data.id) return this.toast("Profile link needs a user ID.", "error");
            this.copyText(`https://discord.com/users/${data.id}`, "Profile link copied.");
        });

        const spotify = this.createToolButton("Song", "Open Spotify link", () => {
            const link = this.getSpotifyLink(popout);
            if (!link) return this.toast("Spotify link not found.", "error");
            window.open(link, "_blank");
        });

        const note = this.createToolButton("Note", "Private local note", () => this.toggleNotePanel(popout));
        const tag = this.createToolButton("Tag", "Private local tags", () => this.toggleNotePanel(popout));

        tools.append(copyId, copyName, copyLink, spotify, note, tag);
        popout.appendChild(tools);
        this.updateProfileTools(popout);
    }

    updateProfileTools(popout) {
        const data = this.getProfileData(popout);
        const tools = popout.querySelector(".ambient-profile-tools");
        if (!tools) return;

        const [copyId, copyName, copyLink, spotify] = tools.querySelectorAll(".ambient-profile-tool");
        if (copyId) copyId.disabled = !data.id;
        if (copyName) copyName.disabled = !data.username;
        if (copyLink) copyLink.disabled = !data.id;
        if (spotify) spotify.disabled = !this.getSpotifyLink(popout);
    }

    createToolButton(label, title, onClick) {
        const button = document.createElement("button");
        button.className = "ambient-profile-tool";
        button.type = "button";
        button.textContent = label;
        button.title = title;
        button.addEventListener("click", (event) => {
            event.preventDefault();
            event.stopPropagation();
            onClick();
        });
        return button;
    }

    toggleNotePanel(popout) {
        let panel = popout.querySelector(".ambient-profile-note");
        if (!panel) panel = this.createNotePanel(popout);
        panel.hidden = !panel.hidden;
        this.renderProfileTags(popout);
        if (!panel.hidden) panel.querySelector("textarea")?.focus();
    }

    createNotePanel(popout) {
        const panel = document.createElement("div");
        panel.className = "ambient-profile-note";
        panel.hidden = true;

        const textarea = document.createElement("textarea");
        textarea.spellcheck = false;
        textarea.placeholder = "Private note for this profile...";

        const tagInput = document.createElement("input");
        tagInput.className = "ambient-profile-tag-input";
        tagInput.type = "text";
        tagInput.spellcheck = false;
        tagInput.placeholder = "tags: friend, staff, trade";

        const tagLabel = document.createElement("label");
        tagLabel.className = "ambient-profile-note-label";
        tagLabel.textContent = "Local tags";

        const footer = document.createElement("div");
        footer.className = "ambient-profile-note-footer";

        const status = document.createElement("span");
        status.textContent = "Saved locally";

        const clear = document.createElement("button");
        clear.className = "ambient-profile-note-clear";
        clear.type = "button";
        clear.textContent = "Clear";

        footer.append(status, clear);
        panel.append(textarea, tagLabel, tagInput, footer);
        popout.appendChild(panel);

        const refresh = () => {
            const key = this.getNoteKey(popout);
            textarea.value = key ? this.getNotes()[key] || "" : "";
            tagInput.value = key ? (this.getTags()[key] || []).join(", ") : "";
            textarea.disabled = !key;
            tagInput.disabled = !key;
            status.textContent = key ? "Saved locally" : "Profile key not found";
        };

        textarea.addEventListener("input", () => {
            const key = this.getNoteKey(popout);
            if (!key) return;
            const notes = this.getNotes();
            const value = textarea.value.trim();
            if (value) notes[key] = textarea.value;
            else delete notes[key];
            this.saveNotes(notes);
            status.textContent = "Saved";
        });

        tagInput.addEventListener("input", () => {
            const key = this.getNoteKey(popout);
            if (!key) return;
            const tags = this.getTags();
            const values = this.parseTags(tagInput.value);
            if (values.length) tags[key] = values;
            else delete tags[key];
            this.saveTags(tags);
            this.renderProfileTags(popout);
            status.textContent = "Saved";
        });

        clear.addEventListener("click", () => {
            const key = this.getNoteKey(popout);
            if (!key) return;
            const notes = this.getNotes();
            const tags = this.getTags();
            delete notes[key];
            delete tags[key];
            this.saveNotes(notes);
            this.saveTags(tags);
            textarea.value = "";
            tagInput.value = "";
            this.renderProfileTags(popout);
            status.textContent = "Cleared";
        });

        refresh();
        return panel;
    }

    getProfileData(popout) {
        const id = this.extractUserId(popout);
        const username = this.extractUsername(popout);
        return {id, username};
    }

    extractUserId(popout) {
        const values = [];
        popout.querySelectorAll("img[src], source[srcset], a[href]").forEach(element => {
            values.push(element.src, element.srcset, element.href);
        });
        popout.querySelectorAll("[style]").forEach(element => values.push(element.getAttribute("style")));

        for (const value of values.filter(Boolean)) {
            const match = String(value).match(/(?:avatars|banners)\/(\d{16,22})\//);
            if (match) return match[1];
        }

        return "";
    }

    extractUsername(popout) {
        const selectors = [
            '[class*="nickname_"]',
            '[class*="username_"]',
            '[class*="userTag_"]',
            'h1',
            '[aria-label*="profile"]'
        ];

        for (const selector of selectors) {
            const element = popout.querySelector(selector);
            const text = element?.textContent?.trim();
            if (text && text.length <= 80) return text;
            const label = element?.getAttribute?.("aria-label")?.trim();
            if (label && label.length <= 80) return label;
        }

        return "";
    }

    getSpotifyLink(popout) {
        const link = popout.querySelector('a[href*="open.spotify.com"], a[href*="spotify.link"]');
        return link?.href || "";
    }

    getNoteKey(popout) {
        const data = this.getProfileData(popout);
        if (data.id) return `id:${data.id}`;
        if (data.username) return `name:${data.username.toLowerCase()}`;
        return "";
    }

    getNotes() {
        return BdApi.Data.load(PLUGIN_NAME, "profileNotes") || {};
    }

    saveNotes(notes) {
        BdApi.Data.save(PLUGIN_NAME, "profileNotes", notes);
    }

    getTags() {
        return BdApi.Data.load(PLUGIN_NAME, "profileTags") || {};
    }

    saveTags(tags) {
        BdApi.Data.save(PLUGIN_NAME, "profileTags", tags);
    }

    parseTags(value) {
        return Array.from(new Set(String(value)
            .split(",")
            .map(tag => tag.trim())
            .filter(Boolean)
            .map(tag => tag.slice(0, 20))))
            .slice(0, 6);
    }

    renderProfileTags(popout) {
        popout.querySelector(".ambient-profile-tags")?.remove();
        const panel = popout.querySelector(".ambient-profile-note");
        if (panel && !panel.hidden) return;

        const key = this.getNoteKey(popout);
        const tags = key ? this.getTags()[key] || [] : [];
        if (!tags.length) return;

        const row = document.createElement("div");
        row.className = "ambient-profile-tags";

        for (const tag of tags) {
            const chip = document.createElement("span");
            chip.className = "ambient-profile-tag";
            chip.textContent = tag;
            chip.title = tag;
            row.appendChild(chip);
        }

        popout.appendChild(row);
    }

    polishSpotifyCards(popout) {
        const spotifyImages = popout.querySelectorAll('img[src*="i.scdn.co"], img[src*="spotify"]');
        spotifyImages.forEach(img => {
            const card = this.findSpotifyCard(img, popout);
            if (card) card.classList.add("ambient-spotify-card");
        });
    }

    findSpotifyCard(img, popout) {
        let best = img.parentElement;
        let current = img.parentElement;

        for (let i = 0; i < 8 && current && current !== popout; i++) {
            const text = (current.textContent || "").toLowerCase();
            const rect = current.getBoundingClientRect?.();
            if (text.includes("spotify") || text.includes("dinliyor") || (rect && rect.width > 220 && rect.height > 70)) {
                best = current;
            }
            current = current.parentElement;
        }

        return best && best !== img.parentElement ? best : img.closest('[class*="activity_"], [class*="card_"], [class*="section_"]') || best;
    }

    handleShiftClickCopy(event) {
        if (!event.shiftKey || event.button !== 0) return;
        if (this.isInteractiveTarget(event.target)) return;

        const message = event.target?.closest?.('[id^="chat-messages-"], [class*="message_"]');
        if (!message || message.closest('[class*="messagesPopout_"], [class*="searchResult_"]')) return;

        const content = this.extractMessageText(message);
        if (!content) return;

        event.preventDefault();
        event.stopPropagation();
        this.copyText(content, "Message copied.");
    }

    isInteractiveTarget(target) {
        return Boolean(target?.closest?.([
            "a",
            "button",
            "input",
            "textarea",
            "select",
            "[role='button']",
            "[contenteditable='true']",
            ".ambient-profile-tools",
            ".ambient-profile-note"
        ].join(",")));
    }

    extractMessageText(message) {
        const content = message.querySelector('[class*="messageContent_"]');
        if (content) return this.normalizeCopiedText(content.innerText || content.textContent || "");

        const fallback = Array.from(message.querySelectorAll('[class*="markup_"], [class*="embedDescription_"], [class*="embedTitle_"]'))
            .map(element => element.innerText || element.textContent || "")
            .map(text => this.normalizeCopiedText(text))
            .filter(Boolean)
            .join("\n");

        return fallback || "";
    }

    normalizeCopiedText(text) {
        return text
            .replace(/\u200B/g, "")
            .replace(/\n{3,}/g, "\n\n")
            .trim();
    }

    async copyText(text, message) {
        try {
            await navigator.clipboard.writeText(text);
        } catch {
            const input = document.createElement("textarea");
            input.value = text;
            input.style.position = "fixed";
            input.style.opacity = "0";
            document.body.appendChild(input);
            input.select();
            document.execCommand("copy");
            input.remove();
        }
        this.toast(message, "success");
    }

    toast(message, type = "info") {
        BdApi.UI?.showToast?.(message, {type});
    }

    parseCssColor(value) {
        if (!value || value.includes("transparent")) return null;
        const rgbMatch = value.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
        if (rgbMatch) return rgbMatch.slice(1, 4).map(Number);
        const hexMatch = value.trim().match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
        if (!hexMatch) return null;
        const hex = hexMatch[1].length === 3
            ? hexMatch[1].split("").map(char => char + char).join("")
            : hexMatch[1];
        return [0, 2, 4].map(index => parseInt(hex.slice(index, index + 2), 16));
    }
};
