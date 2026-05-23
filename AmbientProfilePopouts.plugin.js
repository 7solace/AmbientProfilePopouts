/**
 * @name AmbientProfilePopouts
 * @author s7lace
 * @version 1.1.11
 * @description Adds adaptive ambient glow effects to Discord profile popouts.
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

module.exports = class AmbientProfilePopouts {
    start() {
        try {
            this.colorRefreshTimers = new WeakMap();
            this.checkForUpdates();
            this.updateInterval = setInterval(() => this.checkForUpdates(true), UPDATE_CHECK_INTERVAL);
            this.injectCSS();
            this.scanExistingProfiles();

            this.observer = new MutationObserver((mutations) => {
                for (const mutation of mutations) {
                    if (mutation.type === "attributes") {
                        const profile = mutation.target.closest?.(PROFILE_SELECTORS);
                        if (profile) this.queueColorRefresh(profile);
                        continue;
                    }

                    for (const node of mutation.addedNodes) {
                        if (node.nodeType !== Node.ELEMENT_NODE) continue;
                        for (const profile of this.findProfileRoots(node)) this.addAmbientGlow(profile);
                    }
                }
            });

            const appMount = document.getElementById("app-mount") || document.body;
            this.observer.observe(appMount, {
                childList: true,
                subtree: true,
                attributes: true,
                attributeFilter: ["class", "src", "style"]
            });
        } catch (err) {
            console.error(`${PLUGIN_NAME} start failed:`, err);
        }
    }

    stop() {
        BdApi.DOM.removeStyle("AmbientProfileCSS");
        if (this.observer) this.observer.disconnect();
        if (this.updateInterval) clearInterval(this.updateInterval);
        document.querySelectorAll(".ambient-profile-container").forEach(el => el.remove());
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

    addAmbientGlow(popout) {
        if (!popout) return;

        if (popout.querySelector(".ambient-profile-container")) {
            popout.classList.add("ambient-profile-root");
            this.queueColorRefresh(popout);
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
