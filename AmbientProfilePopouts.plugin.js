/**
 * @name AmbientProfilePopouts
 * @author s7lace
 * @version 1.5.1
 * @description Adds adaptive ambient glow, profile tools, and per-area animation system to Discord.
 * @updateUrl https://raw.githubusercontent.com/7solace/AmbientProfilePopouts/main/AmbientProfilePopouts.plugin.js
 * @downloadUrl https://raw.githubusercontent.com/7solace/AmbientProfilePopouts/main/AmbientProfilePopouts.plugin.js
 */

const PLUGIN_NAME = "AmbientProfilePopouts";
const PLUGIN_FILE = "AmbientProfilePopouts.plugin.js";
const UPDATE_URL  = "https://raw.githubusercontent.com/7solace/AmbientProfilePopouts/main/AmbientProfilePopouts.plugin.js";
const UPDATE_CHECK_INTERVAL = 30 * 60 * 1000;

const PROFILE_SELECTORS = [
    '[class*="userProfileOuter_"]',
    '[class*="userProfileModalOuter_"]',
    '[class*="userPopoutOuter_"]',
    '[class*="profileOuter_"]'
].join(",");

const IMAGE_SELECTORS = [
    'img[src*="i.scdn.co"]','img[src*="spotify"]',
    'svg foreignObject img','img[class*="avatar"]',
    '[class*="avatar_"] img','[class*="banner_"] img','[class*="profileBanner_"] img'
].join(",");

const LINK_SCOPE_SELECTORS = [
    '[id^="chat-messages-"]','[class*="message_"]','[class*="embed_"]'
].join(",");

const SUSPICIOUS_DOMAINS = new Set([
    "bit.ly","tinyurl.com","t.co","goo.gl","is.gd",
    "cutt.ly","rb.gy","shorturl.at","grabify.link","iplogger.org","2no.co"
]);

// ─── Animation definitions ───────────────────────────────────────────────────

const ANIM_STYLES = ["none","fade","slide-up","slide-down","slide-left","slide-right","scale","blur","flip","spring"];
const ANIM_STYLE_LABELS = {
    none:"Kapalı", fade:"Soluklaşma (Fade)",
    "slide-up":"Yukarı Kayma (Slide)", "slide-down":"Aşağı Kayma (Slide)",
    "slide-left":"Sola Kayma (Slide)", "slide-right":"Sağa Kayma (Slide)",
    scale:"Büyüme (Scale)", blur:"Odaklanma (Blur)", flip:"Dönme (Flip)", spring:"Esnek Yay (Spring)"
};

const ANIM_AREAS = {
    messages:     { label:"Yeni Mesaj Akışı",        selector:'[id^="chat-messages-"] [class*="message_"]:not(.amb-done)' },
    channelSwitch:{ label:"Kanal Değiştirme",        selector:'[class*="chat_"],[class*="chatContent_"]' },
    serverSwitch: { label:"Sunucu Değiştirme",       selector:'[class*="guilds_"],[class*="guildsList_"]' },
    sidebar:      { label:"Sol Panel (Sidebar)",     selector:'[class*="sidebar_"],[class*="panels_"]' },
    memberSidebar:{ label:"Üye Listesi (Right)",     selector:'[class*="membersWrap_"],[class*="members_"]' },
    modals:       { label:"Açılır Pencere & Profil", selector:'[class*="modal_"],[class*="layer_"],[class*="userPopoutOuter_"]' },
    emojiPicker:  { label:"İfade Seçici (Emoji)",    selector:'[class*="emojiPicker_"],[class*="reactionPicker_"]' },
    toasts:       { label:"Bildirimler (Toasts)",    selector:'[class*="toast_"],[class*="toastItem_"],[class*="notice_"]' },
    contextMenu:  { label:"Sağ Tık Menüsü",         selector:'[class*="menu_"][role="menu"]' },
};

const DEFAULT_SETTINGS = {
    blurStrength:   22,
    panelAlpha:     0.62,
    glowOpacity:    0.82,
    innerBlur:      8,
    sheenOpacity:   0.62,
    edgeAlpha:      0.52,
    animationSpeed: 1.0,
    hideTyping:     true,
    anim: {
        messages:     { style:"slide-up",    duration:280, enabled:true },
        channelSwitch:{ style:"fade",        duration:220, enabled:true },
        serverSwitch: { style:"scale",       duration:240, enabled:true },
        sidebar:      { style:"slide-left",  duration:260, enabled:true },
        memberSidebar:{ style:"slide-right", duration:240, enabled:true },
        modals:       { style:"spring",      duration:340, enabled:true },
        emojiPicker:  { style:"scale",       duration:180, enabled:true },
        toasts:       { style:"slide-right", duration:260, enabled:true },
        contextMenu:  { style:"scale",       duration:150, enabled:true },
    }
};

module.exports = class AmbientProfilePopouts {

    // ─── Settings Panel Redesign ─────────────────────────────────────────────────

    getSettings() {
        const saved = BdApi.Data.load(PLUGIN_NAME, "settings") || {};
        const base  = Object.assign({}, DEFAULT_SETTINGS, saved);
        base.anim   = {};
        for (const k of Object.keys(DEFAULT_SETTINGS.anim))
            base.anim[k] = Object.assign({}, DEFAULT_SETTINGS.anim[k], saved.anim?.[k] || {});
        return base;
    }

    saveSettings(s) { BdApi.Data.save(PLUGIN_NAME, "settings", s); }

    getSettingsPanel() {
        const s = this.getSettings();
        const wrap = document.createElement("div");
        wrap.style.cssText = `
            padding: 20px;
            display: flex;
            flex-direction: column;
            gap: 24px;
            font-family: var(--font-primary, 'gg sans', sans-serif);
            color: #dbdee1;
            background: #2b2d31;
            border-radius: 12px;
            max-height: 85vh;
            overflow-y: auto;
            box-sizing: border-box;
        `;

        // Özel Scrollbar CSS'i Ekleme
        const styleId = "AmbientSettingsScrollbar";
        if (!document.getElementById(styleId)) {
            const style = document.createElement("style");
            style.id = styleId;
            style.textContent = `
                .amb-settings-wrap::-webkit-scrollbar { width: 8px; }
                .amb-settings-wrap::-webkit-scrollbar-track { background: transparent; }
                .amb-settings-wrap::-webkit-scrollbar-thumb { background: #1e1f22; border-radius: 4px; }
                .amb-settings-wrap::-webkit-scrollbar-thumb:hover { background: #111214; }
                .amb-input-range { -webkit-appearance: none; width: 100%; height: 6px; background: #1e1f22; border-radius: 3px; outline: none; transition: background .15s ease; }
                .amb-input-range::-webkit-slider-thumb { -webkit-appearance: none; width: 16px; height: 16px; border-radius: 50%; background: #5865f2; cursor: pointer; transition: transform .1s ease, background .15s ease; }
                .amb-input-range::-webkit-slider-thumb:hover { transform: scale(1.15); background: #4752c4; }
                .amb-select-custom { background: #1e1f22; border: 1px solid #3f4147; border-radius: 6px; color: #dbdee1; padding: 6px 12px; font-size: 13px; font-weight: 500; cursor: pointer; outline: none; transition: border-color .15s ease; }
                .amb-select-custom:focus { border-color: #5865f2; }
                .amb-card { background: #232428; border: 1px solid #1e1f22; border-radius: 8px; padding: 14px; display: flex; flex-direction: column; gap: 12px; transition: border-color .2s ease; }
                .amb-card:hover { border-color: #3f4147; }
            `;
            document.head.appendChild(style);
        }
        wrap.classList.add("amb-settings-wrap");

        const secHead = (text, icon) => {
            const h = document.createElement("div");
            h.style.cssText = "font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: .05em; color: #949ba4; padding-bottom: 8px; border-bottom: 1px solid #3f4147; margin-top: 10px; display: flex; align-items: center; gap: 8px;";
            h.innerHTML = `<span>${icon}</span> ${text}`; return h;
        };

        const mkSlider = (label, desc, min, max, step, val, onChange) => {
            const row = document.createElement("div");
            row.style.cssText = "display: flex; flex-direction: column; gap: 6px;";
            const top = document.createElement("div");
            top.style.cssText = "display: flex; justify-content: space-between; align-items: center;";
            const lbl = document.createElement("span");
            lbl.style.cssText = "font-size: 14px; font-weight: 600; color: #f2f3f5;"; lbl.textContent = label;
            const valEl = document.createElement("span");
            valEl.style.cssText = "font-size: 12px; font-weight: 700; color: #5865f2; background: rgba(88,101,242,0.1); padding: 2px 6px; border-radius: 4px;";
            valEl.textContent = step < 1 ? parseFloat(val).toFixed(2) : String(val);
            top.append(lbl, valEl);
            const d = document.createElement("div");
            d.style.cssText = "font-size: 12px; color: #949ba4; line-height: 1.4;"; d.textContent = desc;
            const inp = document.createElement("input");
            inp.classList.add("amb-input-range");
            inp.type="range"; inp.min=min; inp.max=max; inp.step=step; inp.value=val;
            inp.addEventListener("input", () => {
                const v = parseFloat(inp.value);
                valEl.textContent = step < 1 ? v.toFixed(2) : String(v);
                onChange(v);
            });
            row.append(top, d, inp); return row;
        };

        const mkToggle = (label, desc, val, onChange) => {
            const row = document.createElement("div");
            row.style.cssText = "display: flex; justify-content: space-between; align-items: center; padding: 4px 0;";
            const left = document.createElement("div"); left.style.cssText = "display: flex; flex-direction: column; gap: 3px; max-width: 80%;";
            const t = document.createElement("span"); t.style.cssText = "font-size: 14px; font-weight: 600; color: #f2f3f5;"; t.textContent = label;
            const d = document.createElement("span"); d.style.cssText = "font-size: 12px; color: #949ba4; line-height: 1.4;"; d.textContent = desc;
            left.append(t, d);
            const btn = document.createElement("button"); let state = val;
            const render = () => {
                btn.style.cssText = `width: 42px; height: 24px; border: 0; border-radius: 14px; cursor: pointer; background: ${state ? "#248046" : "#80848e"}; transition: background .15s ease; position: relative; flex-shrink: 0;`;
                btn.innerHTML = `<span style="position: absolute; top: 3px; left: ${state ? "21px" : "3px"}; width: 18px; height: 18px; border-radius: 50%; background: #fff; transition: left .15s cubic-bezier(0.25, 1, 0.5, 1); box-shadow: 0 2px 4px rgba(0,0,0,0.2); display: block;"></span>`;
            };
            render();
            btn.addEventListener("click", () => { state=!state; render(); onChange(state); });
            row.append(left, btn); return row;
        };

        const mkSelect = (label, options, val, onChange) => {
            const row = document.createElement("div");
            row.style.cssText = "display: flex; align-items: center; justify-content: space-between; gap: 12px;";
            const lbl = document.createElement("span"); lbl.style.cssText = "font-size: 13px; font-weight: 600; color: #b5bac1;"; lbl.textContent = label;
            const sel = document.createElement("select");
            sel.classList.add("amb-select-custom");
            for (const opt of options) {
                const o = document.createElement("option"); o.value=opt.value; o.textContent=opt.label;
                if (opt.value===val) o.selected=true; sel.appendChild(o);
            }
            sel.addEventListener("change", () => onChange(sel.value));
            row.append(lbl, sel); return row;
        };

        // ── Glass & Ambient section ──
        wrap.appendChild(secHead("Cam & Ambient Efektleri", "🔮"));
        const glassCard = document.createElement("div");
        glassCard.classList.add("amb-card");
        
        const glassSliders = [
            {key:"blurStrength",   label:"Arka Plan Bulanıklığı (Glass Blur)", desc:"Açılır pencerelerin arkasındaki bulanıklık yoğunluğu", min:0,  max:60, step:1},
            {key:"innerBlur",      label:"İç Katman Bulanıklığı",             desc:"Profil içi panellerin odak/blur yumuşaklığı",       min:0,  max:30, step:1},
            {key:"panelAlpha",     label:"Panel Opaklığı",                   desc:"0 (Tamamen Şeffaf) ile 1 (Tam Opak) arası",        min:0,  max:1,  step:0.01},
            {key:"glowOpacity",    label:"Ortam Işığı (Glow) Yoğunluğu",       desc:"Profil arkasındaki renkli yansıma gücü",            min:0,  max:1,  step:0.01},
            {key:"sheenOpacity",   label:"Dinamik Parlama (Sheen)",           desc:"Akan parlak ışık efektinin netliği",               min:0,  max:1,  step:0.01},
            {key:"edgeAlpha",      label:"Kenar Çizgisi Işığı",               desc:"Profil kartının lüks çerçeve neon opaklığı",         min:0,  max:1,  step:0.01},
            {key:"animationSpeed", label:"Aura Döngü Hızı",                  desc:"Glow hareket hızı katsayısı (Varsayılan: 1x)",      min:0.1,max:3,  step:0.1},
        ];
        
        for (const cfg of glassSliders) {
            glassCard.appendChild(mkSlider(cfg.label, cfg.desc, cfg.min, cfg.max, cfg.step, s[cfg.key], (v) => {
                const cur = this.getSettings(); cur[cfg.key] = v; this.saveSettings(cur); this.applySettingsToCSS(cur);
            }));
        }
        glassCard.appendChild(document.createElement("hr")).style.cssText = "border: 0; border-top: 1px solid #3f4147; margin: 4px 0;";
        glassCard.appendChild(mkToggle('"Yazıyor..." Animasyonunu Gizle','Birileri mesaj yazarken ortaya çıkan baloncuk uyarısını kapatır', s.hideTyping, (v) => {
            const cur = this.getSettings(); cur.hideTyping = v; this.saveSettings(cur); this.applySettingsToCSS(cur);
        }));
        wrap.appendChild(glassCard);

        // ── Animation section ──
        wrap.appendChild(secHead("Arayüz Alan Animasyonları", "🎬"));
        
        const animGrid = document.createElement("div");
        animGrid.style.cssText = "display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 14px;";

        for (const [areaKey, areaMeta] of Object.entries(ANIM_AREAS)) {
            const ac = s.anim[areaKey] || DEFAULT_SETTINGS.anim[areaKey];
            const card = document.createElement("div");
            card.classList.add("amb-card");

            const head = document.createElement("div");
            head.style.cssText = "display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255,255,255,0.04); padding-bottom: 8px;";
            const title = document.createElement("span");
            title.style.cssText = "font-size: 14px; font-weight: 700; color: #f2f3f5;"; title.textContent = areaMeta.label;

            const body = document.createElement("div");
            body.style.cssText = "display: flex; flex-direction: column; gap: 10px; margin-top: 4px;";

            const enBtn = document.createElement("button"); let enState = ac.enabled;
            const renderEn = () => {
                enBtn.style.cssText = `width: 34px; height: 18px; border: 0; border-radius: 9px; cursor: pointer; background: ${enState ? "#248046" : "#4e5058"}; transition: background .15s ease; position: relative; flex-shrink: 0;`;
                enBtn.innerHTML = `<span style="position: absolute; top: 2px; left: ${enState ? "18px" : "2px"}; width: 14px; height: 14px; border-radius: 50%; background: #fff; transition: left .15s cubic-bezier(0.25, 1, 0.5, 1); display: block;"></span>`;
                body.style.opacity = enState ? "1" : "0.35";
                body.style.pointerEvents = enState ? "auto" : "none";
            };
            enBtn.addEventListener("click", () => {
                enState = !enState;
                const cur = this.getSettings(); cur.anim[areaKey].enabled = enState;
                this.saveSettings(cur); this.applySettingsToCSS(cur); renderEn();
            });

            body.appendChild(mkSelect("Geçiş Efekti",
                ANIM_STYLES.map(k => ({value:k, label:ANIM_STYLE_LABELS[k]})),
                ac.style,
                (v) => { const cur=this.getSettings(); cur.anim[areaKey].style=v; this.saveSettings(cur); this.applySettingsToCSS(cur); }
            ));
            body.appendChild(mkSlider("Süre (ms)", "Hareket hızı", 80, 800, 10, ac.duration, (v)=>{
                const cur=this.getSettings(); cur.anim[areaKey].duration=v; this.saveSettings(cur); this.applySettingsToCSS(cur);
            }));

            head.append(title, enBtn); card.append(head, body); renderEn(); animGrid.appendChild(card);
        }
        wrap.appendChild(animGrid);

        // Reset Button Action
        const resetBtn = document.createElement("button");
        resetBtn.textContent = "Fabrika Ayarlarına Dön";
        resetBtn.style.cssText = "margin-top: 10px; padding: 10px 18px; border: 1px solid #1e1f22; border-radius: 6px; background: #4e5058; color: #fff; font-size: 13px; font-weight: 600; cursor: pointer; align-self: flex-start; transition: background .15s ease;";
        resetBtn.addEventListener("mouseenter", () => resetBtn.style.background = "#da373c");
        resetBtn.addEventListener("mouseleave", () => resetBtn.style.background = "#4e5058");
        resetBtn.addEventListener("click", () => {
            this.saveSettings(JSON.parse(JSON.stringify(DEFAULT_SETTINGS)));
            this.applySettingsToCSS(this.getSettings());
            this.toast("Ayarlar başarıyla sıfırlandı.", "success");
            const p = wrap.parentElement; if (p) { wrap.remove(); p.appendChild(this.getSettingsPanel()); }
        });
        wrap.appendChild(resetBtn);
        return wrap;
    }

    applySettingsToCSS(s) {
        BdApi.DOM.removeStyle("AmbientProfileCSS");
        BdApi.DOM.removeStyle("AmbientAnimCSS");
        this.injectCSS(s);
        this.injectAnimCSS(s);
    }

    // ─── Lifecycle ───────────────────────────────────────────────────────────────

    start() {
        try {
            this.colorRefreshTimers = new WeakMap();
            this.handleShiftClickCopy = this.handleShiftClickCopy.bind(this);
            document.addEventListener("click", this.handleShiftClickCopy, true);
            this.checkForUpdates();
            this.updateInterval = setInterval(()=>this.checkForUpdates(true), UPDATE_CHECK_INTERVAL);
            const s = this.getSettings();
            this.injectCSS(s);
            this.injectAnimCSS(s);
            this.scanExistingProfiles();
            this.scanExistingMessageEnhancements();

            this.observer = new MutationObserver((mutations) => {
                for (const mutation of mutations) {
                    if (mutation.type === "attributes") {
                        const profile = mutation.target.closest?.(PROFILE_SELECTORS);
                        if (profile) { this.queueColorRefresh(profile); this.polishSpotifyCards(profile); }
                        continue;
                    }
                    for (const node of mutation.addedNodes) {
                        if (node.nodeType !== Node.ELEMENT_NODE) continue;
                        for (const profile of this.findProfileRoots(node)) this.addAmbientGlow(profile);
                        this.enhanceMessageNode(node);
                        this.animateNode(node);
                    }
                }
            });

            const appMount = document.getElementById("app-mount") || document.body;
            this.observer.observe(appMount, { childList:true, subtree:true, attributes:true, attributeFilter:["class","src"] });
        } catch(err) {
            console.error(`${PLUGIN_NAME} start failed:`, err);
        }
    }

    stop() {
        BdApi.DOM.removeStyle("AmbientProfileCSS");
        BdApi.DOM.removeStyle("AmbientAnimCSS");
        BdApi.DOM.removeStyle("AmbientSettingsScrollbar");
        document.removeEventListener("click", this.handleShiftClickCopy, true);
        if (this.observer) this.observer.disconnect();
        if (this.updateInterval) clearInterval(this.updateInterval);
        document.querySelectorAll(".ambient-profile-container,.ambient-profile-tools,.ambient-profile-note,.ambient-link-tools,.ambient-code-copy,.ambient-profile-tags").forEach(el=>el.remove());
        document.querySelectorAll(".ambient-enhanced-link").forEach(el=>{el.classList.remove("ambient-enhanced-link");el.removeAttribute("data-ambient-domain");el.removeAttribute("data-ambient-risk");});
        document.querySelectorAll(".ambient-enhanced-code").forEach(el=>el.classList.remove("ambient-enhanced-code"));
        document.querySelectorAll(".ambient-spotify-card").forEach(el=>el.classList.remove("ambient-spotify-card"));
        document.querySelectorAll(".ambient-profile-root").forEach(el=>el.classList.remove("ambient-profile-root"));
        document.querySelectorAll(".amb-done").forEach(el=>el.classList.remove("amb-done"));
        for (const k of Object.keys(ANIM_AREAS))
            document.querySelectorAll(`.ambient-anim-${k}`).forEach(el=>el.classList.remove(`ambient-anim-${k}`));
    }

    // ─── BetterAnimations Style Fluid System ─────────────────────────────────────

    injectAnimCSS(s) {
        // Donanım hızlandırma (will-change, transform3d, backface-visibility) entegre edildi.
        // Cubic-bezier eğrileri BetterAnimations standartlarına (0.215, 0.610, 0.355, 1.000) çekildi.
        const rules = [`
        @keyframes amb-fade        { from { opacity: 0; filter: blur(3px); } to { opacity: 1; filter: blur(0); } }
        @keyframes amb-slide-up    { from { opacity: 0; transform: translate3d(0, 18px, 0); } to { opacity: 1; transform: translate3d(0, 0, 0); } }
        @keyframes amb-slide-down  { from { opacity: 0; transform: translate3d(0, -18px, 0); } to { opacity: 1; transform: translate3d(0, 0, 0); } }
        @keyframes amb-slide-left  { from { opacity: 0; transform: translate3d(24px, 0, 0); } to { opacity: 1; transform: translate3d(0, 0, 0); } }
        @keyframes amb-slide-right { from { opacity: 0; transform: translate3d(-24px, 0, 0); } to { opacity: 1; transform: translate3d(0, 0, 0); } }
        @keyframes amb-scale       { from { opacity: 0; transform: scale3d(0.93, 0.93, 1); } to { opacity: 1; transform: scale3d(1, 1, 1); } }
        @keyframes amb-blur        { from { opacity: 0; filter: blur(14px); transform: scale3d(0.98, 0.98, 1); } to { opacity: 1; filter: blur(0); transform: scale3d(1, 1, 1); } }
        @keyframes amb-flip        { from { opacity: 0; transform: perspective(500px) rotateX(12deg); } to { opacity: 1; transform: perspective(500px) rotateX(0); } }
        @keyframes amb-spring      { 0% { opacity: 0; transform: scale3d(0.85, 0.85, 1); } 55% { opacity: 1; transform: scale3d(1.03, 1.03, 1); } 78% { transform: scale3d(0.98, 0.98, 1); } 100% { transform: scale3d(1, 1, 1); } }
        `];

        for (const [areaKey, cfg] of Object.entries(s.anim)) {
            if (!cfg.enabled || cfg.style === "none") continue;
            // Yay efekti hariç tüm hareketlere ultra smooth ipeksi bitiş eğrisi (Apple/BetterAnimations mantığı)
            const easing = cfg.style === "spring" ? "cubic-bezier(0.34, 1.56, 0.64, 1)" : "cubic-bezier(0.16, 1, 0.3, 1)";
            rules.push(`
                .${areaKey === "messages" ? "ambient-anim-messages" : `ambient-anim-${areaKey}`} {
                    animation: amb-${cfg.style} ${cfg.duration}ms ${easing} both;
                    will-change: transform, opacity, filter;
                    backface-visibility: hidden;
                    transform-style: preserve-3d;
                }
            `);
        }

        BdApi.DOM.addStyle("AmbientAnimCSS", rules.join("\n"));
    }

    animateNode(node) {
        const s = this.getSettings();
        for (const [areaKey, areaMeta] of Object.entries(ANIM_AREAS)) {
            const cfg = s.anim[areaKey];
            if (!cfg?.enabled || cfg.style==="none") continue;
            const cls = `ambient-anim-${areaKey}`;
            if (node.matches?.(areaMeta.selector)) this.applyAnim(node, areaKey, cls);
            node.querySelectorAll?.(areaMeta.selector).forEach(el => this.applyAnim(el, areaKey, cls));
        }
    }

    applyAnim(el, areaKey, cls) {
        if (areaKey === "messages") {
            if (el.classList.contains("amb-done")) return;
            el.classList.add(cls);
            el.addEventListener("animationend", ()=>{el.classList.remove(cls);el.classList.add("amb-done");}, {once:true});
        } else {
            el.classList.remove(cls);
            void el.offsetWidth; // Reflow forcing
            el.classList.add(cls);
            el.addEventListener("animationend", ()=>el.classList.remove(cls), {once:true});
        }
    }

    // ─── Update ──────────────────────────────────────────────────────────────────

    async checkForUpdates(silent=false) {
        if (this.isCheckingForUpdates) return;
        this.isCheckingForUpdates = true;
        try {
            const fs=require("fs"), path=require("path");
            const addon=BdApi.Plugins.get(PLUGIN_NAME);
            const fileName=addon?.filename||PLUGIN_FILE;
            const targetPath=path.join(BdApi.Plugins.folder,fileName);
            const localContent=fs.existsSync(targetPath)?fs.readFileSync(targetPath,"utf8"):"";
            const currentVersion=addon?.version||this.getMetaValue(localContent,"version");
            if (!currentVersion) throw new Error("Local version could not be read.");
            const response=await BdApi.Net.fetch(this.withCacheBuster(UPDATE_URL),{headers:{"Cache-Control":"no-cache","Pragma":"no-cache"},timeout:15000});
            if (!response?.ok) throw new Error(`HTTP ${response?.status||"?"}`);
            const remoteContent=await response.text();
            const remoteName=this.getMetaValue(remoteContent,"name");
            const remoteVersion=this.getMetaValue(remoteContent,"version");
            this.validateUpdate(remoteContent,remoteName,remoteVersion);
            if (!this.isNewerVersion(remoteVersion,currentVersion)) return;
            const tempPath=targetPath+".download";
            fs.writeFileSync(tempPath,remoteContent,"utf8");
            fs.renameSync(tempPath,targetPath);
            BdApi.UI?.showToast?.(`${PLUGIN_NAME} ${remoteVersion} downloaded. Reload Discord.`,{type:"success"});
        } catch(err) {
            if (!silent) console.error(`${PLUGIN_NAME} update check failed:`,err);
        } finally { this.isCheckingForUpdates=false; }
    }

    withCacheBuster(url){return url+(url.includes("?")?"&":"?")+"t="+Date.now();}

    validateUpdate(content,name,version){
        if(name!==PLUGIN_NAME) throw new Error("Remote plugin name does not match.");
        if(!version||!/^\d+(?:\.\d+){1,3}$/.test(version)) throw new Error("Remote plugin version is invalid.");
        if(!content.includes("module.exports")) throw new Error("Remote file does not look like a plugin.");
        if(content.length<1000) throw new Error("Remote file looks unexpectedly short.");
    }

    getMetaValue(content,key){const m=content.match(new RegExp("^\\s*\\*\\s*@"+key+"\\s+(.+)$","mi"));return m?m[1].trim():"";}

    isNewerVersion(remote,current){
        const r=remote.split(".").map(p=>parseInt(p,10)||0);
        const c=current.split(".").map(p=>parseInt(p,10)||0);
        for(let i=0;i<Math.max(r.length,c.length);i++){const ri=r[i]||0,ci=c[i]||0;if(ri>ci)return true;if(ri<ci)return false;}
        return false;
    }

    // ─── CSS ─────────────────────────────────────────────────────────────────────

    injectCSS(s=DEFAULT_SETTINGS){
        const bp=`${s.blurStrength}px`, ibp=`${s.innerBlur}px`;
        const sp=s.animationSpeed;
        const typingCSS=s.hideTyping?`[class*="typing_"],[class*="typingDots_"],[class*="typingUsers_"]{display:none!important;visibility:hidden!important;opacity:0!important;pointer-events:none!important;}`:"";

        BdApi.DOM.addStyle("AmbientProfileCSS",`
        .ambient-profile-root{
            --ambient-base:114,137,218;--ambient-bright:153,170,255;--ambient-soft:230,235,255;
            --ambient-panel-alpha:${s.panelAlpha};--ambient-edge-alpha:${s.edgeAlpha};
            position:relative!important;overflow:hidden!important;isolation:isolate!important;border-radius:inherit;
            background:linear-gradient(160deg,rgba(var(--ambient-base),.24),rgba(12,12,16,var(--ambient-panel-alpha)) 42%,rgba(0,0,0,.52)),var(--background-floating,rgba(18,18,22,.88))!important;
            box-shadow:0 18px 46px rgba(0,0,0,.42),0 0 30px rgba(var(--ambient-base),.18)!important;
            backdrop-filter:blur(${bp}) saturate(150%)!important;
        }
        .ambient-profile-root>:not(.ambient-profile-container){position:relative!important;z-index:2!important;}
        .ambient-profile-root [class*="userProfileInner_"],.ambient-profile-root [class*="profileInner_"],.ambient-profile-root [class*="overlayBackground_"]{background-color:rgba(8,8,12,.34)!important;background-image:none!important;backdrop-filter:blur(${ibp}) saturate(125%);}
        .ambient-profile-root [class*="userProfileInner_"]::before,.ambient-profile-root [class*="profileInner_"]::before{opacity:.18!important;}
        .ambient-profile-container{position:absolute;inset:0;border-radius:inherit;overflow:hidden;pointer-events:none;z-index:0;background:radial-gradient(circle at 18% 18%,rgba(var(--ambient-soft),.22),transparent 34%),radial-gradient(circle at 82% 12%,rgba(var(--ambient-bright),.20),transparent 32%),linear-gradient(135deg,rgba(var(--ambient-base),.16),transparent 54%);}
        .ambient-glow-main{position:absolute;inset:-42%;background:radial-gradient(circle at 30% 35%,rgba(var(--ambient-base),.70),transparent 46%),radial-gradient(circle at 72% 70%,rgba(var(--ambient-bright),.38),transparent 42%),conic-gradient(from 120deg,rgba(var(--ambient-base),.12),rgba(var(--ambient-bright),.26),rgba(var(--ambient-soft),.10),rgba(var(--ambient-base),.12));background-size:150% 150%;filter:blur(30px) saturate(145%);opacity:${s.glowOpacity};animation:ambientGlowMove ${(18/sp).toFixed(1)}s ease-in-out infinite alternate;}
        .ambient-glow-pop{position:absolute;top:18%;left:50%;width:92%;height:68%;transform:translate(-50%,-50%) scale(1);background:radial-gradient(circle,rgba(var(--ambient-bright),.58),transparent 58%);opacity:.48;filter:blur(42px);animation:neonPulse ${(9/sp).toFixed(1)}s ease-in-out infinite alternate;}
        .ambient-glow-sheen{position:absolute;inset:-2px;background:linear-gradient(115deg,transparent 0%,rgba(255,255,255,.16) 38%,transparent 58%),linear-gradient(180deg,rgba(var(--ambient-soft),.10),transparent 42%);mix-blend-mode:screen;opacity:${s.sheenOpacity};animation:ambientSheen ${(12/sp).toFixed(1)}s ease-in-out infinite;}
        .ambient-profile-root::after{content:'';position:absolute;inset:0;border-radius:inherit;padding:1px;background:linear-gradient(135deg,rgba(var(--ambient-soft),.34),rgba(var(--ambient-bright),var(--ambient-edge-alpha)) 34%,transparent 62%,rgba(var(--ambient-base),.34));background-size:200% 200%;-webkit-mask:linear-gradient(#fff 0 0) content-box,linear-gradient(#fff 0 0);-webkit-mask-composite:xor;mask-composite:exclude;pointer-events:none;z-index:4;animation:borderRotate ${(7/sp).toFixed(1)}s linear infinite;}
        .ambient-profile-tools{position:absolute;right:44px;top:10px;z-index:6;display:flex;align-items:center;gap:6px;padding:5px;border:1px solid rgba(var(--ambient-soft),.20);border-radius:10px;background:rgba(12,12,16,.50);box-shadow:0 10px 26px rgba(0,0,0,.30);backdrop-filter:blur(14px) saturate(145%);pointer-events:auto;}
        .ambient-profile-root[class*="userProfileModalOuter_"] .ambient-profile-tools,.ambient-profile-root[class*="profileOuter_"] .ambient-profile-tools{top:12px;right:56px;}
        .ambient-profile-tool{height:28px;min-width:34px;padding:0 9px;border:0;border-radius:7px;color:var(--interactive-active,#fff);background:rgba(255,255,255,.08);font-size:12px;font-weight:700;line-height:28px;cursor:pointer;transition:background 160ms,color 160ms,transform 160ms;}
        .ambient-profile-tool:hover:not(:disabled){background:rgba(var(--ambient-bright),.24);color:#fff;transform:translateY(-1px);}
        .ambient-profile-tool:disabled{cursor:not-allowed;opacity:.42;}
        .ambient-profile-note{position:absolute;right:44px;top:52px;z-index:7;width:min(280px,calc(100% - 64px));padding:10px;border:1px solid rgba(var(--ambient-soft),.22);border-radius:10px;background:rgba(10,10,14,.86);box-shadow:0 16px 40px rgba(0,0,0,.42);backdrop-filter:blur(18px) saturate(145%);pointer-events:auto;}
        .ambient-profile-note[hidden]{display:none;}
        .ambient-profile-note textarea{box-sizing:border-box;width:100%;min-height:86px;resize:vertical;border:0;outline:none;border-radius:8px;padding:9px;color:var(--text-normal,#dbdee1);background:rgba(0,0,0,.32);font:500 12px/1.4 var(--font-primary,sans-serif);}
        .ambient-profile-note-label{display:block;margin:8px 0 5px;color:var(--text-muted,#949ba4);font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.04em;}
        .ambient-profile-note-footer{display:flex;justify-content:space-between;align-items:center;gap:8px;margin-top:8px;color:var(--text-muted,#949ba4);font-size:11px;}
        .ambient-profile-note-clear{border:0;border-radius:6px;padding:5px 8px;color:var(--interactive-normal,#b5bac1);background:rgba(255,255,255,.08);cursor:pointer;font-size:11px;}
        .ambient-profile-tag-input{box-sizing:border-box;width:100%;height:30px;margin-top:8px;border:0;outline:none;border-radius:8px;padding:0 9px;color:var(--text-normal,#dbdee1);background:rgba(255,255,255,.075);font:700 11px/30px var(--font-primary,sans-serif);}
        .ambient-profile-tags{position:absolute;right:44px;top:52px;z-index:5;display:flex;max-width:min(300px,calc(100% - 70px));flex-wrap:wrap;justify-content:flex-end;gap:5px;pointer-events:none;}
        .ambient-profile-note:not([hidden])~.ambient-profile-tags{display:none;}
        .ambient-profile-tag{max-width:116px;overflow:hidden;text-overflow:ellipsis;border:1px solid rgba(var(--ambient-soft),.20);border-radius:999px;padding:3px 7px;color:#fff;background:rgba(var(--ambient-base),.34);box-shadow:0 8px 18px rgba(0,0,0,.22);backdrop-filter:blur(10px);font-size:10px;font-weight:800;line-height:1;}
        [class*="menu_"],[class*="submenu_"],[class*="tooltip_"],[class*="popout_"]:not(.ambient-profile-root):not([class*="userPopoutOuter_"]),[class*="picker_"],[class*="autocomplete_"],[class*="container_"][role="dialog"]{background-color:rgba(18,18,24,.72)!important;border:1px solid rgba(255,255,255,.08)!important;box-shadow:0 18px 48px rgba(0,0,0,.42),0 0 28px rgba(114,137,218,.08)!important;backdrop-filter:blur(18px) saturate(145%)!important;}
        [class*="menu_"] [class*="item_"]:hover,[class*="submenu_"] [class*="item_"]:hover{background-color:rgba(114,137,218,.18)!important;}
        .ambient-enhanced-link{text-decoration-thickness:2px!important;text-underline-offset:2px!important;}
        .ambient-link-tools{display:inline-flex;align-items:center;gap:4px;margin-left:5px;vertical-align:baseline;white-space:nowrap;}
        .ambient-link-domain,.ambient-link-copy{display:inline-flex;align-items:center;height:18px;border:1px solid rgba(255,255,255,.10);border-radius:6px;color:var(--text-muted,#949ba4);background:rgba(255,255,255,.055);font-size:10px;font-weight:700;line-height:18px;}
        .ambient-link-domain{max-width:150px;padding:0 6px;overflow:hidden;text-overflow:ellipsis;}
        .ambient-link-copy{padding:0 6px;cursor:pointer;font-family:var(--font-primary,sans-serif);}
        .ambient-link-copy:hover{color:#fff;background:rgba(114,137,218,.22);}
        .ambient-enhanced-link[data-ambient-risk="warn"]{color:#ffd166!important;}
        .ambient-enhanced-link[data-ambient-risk="danger"]{color:#ff6b6b!important;}
        .ambient-link-domain[data-ambient-risk="warn"]{color:#ffd166;border-color:rgba(255,209,102,.32);background:rgba(255,209,102,.12);}
        .ambient-link-domain[data-ambient-risk="danger"]{color:#ffb3b3;border-color:rgba(255,107,107,.34);background:rgba(255,107,107,.14);}
        .ambient-enhanced-code{position:relative!important;}
        .ambient-code-copy{position:absolute;top:6px;right:6px;z-index:3;height:22px;min-width:38px;border:1px solid rgba(255,255,255,.10);border-radius:6px;color:var(--text-muted,#949ba4);background:rgba(12,12,16,.62);backdrop-filter:blur(10px);cursor:pointer;font-size:10px;font-weight:800;opacity:0;transition:opacity 140ms,background 140ms,color 140ms;}
        .ambient-enhanced-code:hover .ambient-code-copy,.ambient-code-copy:focus-visible{opacity:1;}
        .ambient-code-copy:hover{color:#fff;background:rgba(114,137,218,.24);}
        .ambient-spotify-card{position:relative!important;overflow:hidden!important;border:1px solid rgba(30,215,96,.34)!important;box-shadow:0 0 26px rgba(30,215,96,.14),inset 0 0 0 1px rgba(255,255,255,.03)!important;}
        .ambient-spotify-card::after{content:'';position:absolute;inset:0;pointer-events:none;background:linear-gradient(120deg,rgba(30,215,96,.10),transparent 42%);opacity:.88;}
        ${typingCSS}
        @keyframes ambientGlowMove{0%{transform:translate3d(-2%,-1%,0) rotate(0deg) scale(1);background-position:0% 50%}50%{transform:translate3d(2%,1%,0) rotate(8deg) scale(1.04);background-position:100% 50%}100%{transform:translate3d(-1%,2%,0) rotate(-6deg) scale(1.02);background-position:0% 50%}}
        @keyframes neonPulse{0%{transform:translate(-50%,-50%) scale(.94);opacity:.30}100%{transform:translate(-50%,-50%) scale(1.12);opacity:.58}}
        @keyframes ambientSheen{0%,100%{transform:translateX(-18%);opacity:.32}50%{transform:translateX(18%);opacity:.64}}
        @keyframes borderRotate{0%{background-position:0% 0%}100%{background-position:200% 200%}}
        `);
    }

    // ─── Profile scanning ────────────────────────────────────────────────────────

    scanExistingProfiles(){for(const p of document.querySelectorAll(PROFILE_SELECTORS))this.addAmbientGlow(p);}
    findProfileRoots(node){const s=new Set();if(node.matches?.(PROFILE_SELECTORS))s.add(node);node.querySelectorAll?.(PROFILE_SELECTORS).forEach(p=>s.add(p));return s;}

    addAmbientGlow(popout){
        if(!popout)return;
        if(popout.querySelector(".ambient-profile-container")){
            popout.classList.add("ambient-profile-root");
            this.queueColorRefresh(popout);this.ensureProfileTools(popout);this.renderProfileTags(popout);this.polishSpotifyCards(popout);return;
        }
        setTimeout(()=>{
            if(!document.body.contains(popout)||popout.querySelector(".ambient-profile-container"))return;
            popout.classList.add("ambient-profile-root");
            const c=document.createElement("div");c.className="ambient-profile-container";
            for(const cls of["ambient-glow-main","ambient-glow-pop","ambient-glow-sheen"]){const d=document.createElement("div");d.className=cls;c.appendChild(d);}
            popout.insertBefore(c,popout.firstChild);
            this.updateProfileColors(popout);this.ensureProfileTools(popout);this.renderProfileTags(popout);this.polishSpotifyCards(popout);
        },180);
    }

    queueColorRefresh(popout){
        const t=this.colorRefreshTimers?.get(popout);if(t)clearTimeout(t);
        this.colorRefreshTimers?.set(popout,setTimeout(()=>{this.colorRefreshTimers?.delete(popout);if(document.body.contains(popout))this.updateProfileColors(popout);},180));
    }

    updateProfileColors(p){this.applyFallbackColors(p);this.applyImageColors(p);}

    applyFallbackColors(popout){
        const cs=getComputedStyle(popout);
        const rgb=["--profile-gradient-primary-color","--profile-gradient-secondary-color","--brand-500","--background-accent","--interactive-active"].map(p=>this.parseCssColor(cs.getPropertyValue(p))).find(Boolean)||[114,137,218];
        this.setAmbientColors(popout,rgb);
    }

    applyImageColors(popout){
        const img=this.pickBestImage(popout);if(!img?.src)return;
        const probe=new Image();probe.crossOrigin="Anonymous";
        probe.onload=()=>{const rgb=this.sampleImageColor(probe);if(rgb)this.setAmbientColors(popout,rgb);};
        probe.onerror=()=>{};probe.src=this.normalizeImageUrl(img.src);
    }

    pickBestImage(popout){
        const imgs=Array.from(popout.querySelectorAll(IMAGE_SELECTORS)).filter(i=>i.src);
        return imgs.find(i=>i.src.includes("i.scdn.co")||i.src.includes("spotify"))||imgs.find(i=>i.width>=64||i.height>=64)||imgs[0];
    }

    normalizeImageUrl(src){
        if(!src.includes("cdn.discordapp.com")&&!src.includes("media.discordapp.net"))return src;
        return src.split("?")[0]+"?size=128";
    }

    sampleImageColor(img){
        try{
            const c=document.createElement("canvas");c.width=c.height=12;
            const ctx=c.getContext("2d",{willReadFrequently:true});ctx.drawImage(img,0,0,12,12);
            const px=ctx.getImageData(0,0,12,12).data;let r=0,g=0,b=0,n=0;
            for(let i=0;i<px.length;i+=4){if(px[i+3]<90)continue;const br=(px[i]+px[i+1]+px[i+2])/3;if(br<18||br>242)continue;r+=px[i];g+=px[i+1];b+=px[i+2];n++;}
            return n?[Math.round(r/n),Math.round(g/n),Math.round(b/n)]:null;
        }catch{return null;}
    }

    setAmbientColors(popout,rgb){
        const base=this.boostColor(rgb);
        popout.style.setProperty("--ambient-base",base.join(", "));
        popout.style.setProperty("--ambient-bright",this.mixColor(base,[255,255,255],.28).join(", "));
        popout.style.setProperty("--ambient-soft",this.mixColor(base,[255,255,255],.58).join(", "));
    }

    boostColor(rgb){const mx=Math.max(...rgb);const sc=mx<150?150/Math.max(mx,1):1;return rgb.map(v=>Math.max(36,Math.min(255,Math.round(v*sc))));}
    mixColor(a,b,t){return a.map((v,i)=>Math.round(v+(b[i]-v)*t));}

    // ─── Profile tools ───────────────────────────────────────────────────────────

    ensureProfileTools(popout){
        if(popout.querySelector(".ambient-profile-tools")){this.updateProfileTools(popout);return;}
        const tools=document.createElement("div");tools.className="ambient-profile-tools";
        const b=(l,t,fn)=>this.createToolButton(l,t,fn);
        tools.append(
            b("ID","Copy user ID",()=>{const d=this.getProfileData(popout);d.id?this.copyText(d.id,"User ID copied."):this.toast("User ID not found.","error");}),
            b("User","Copy username",()=>{const d=this.getProfileData(popout);d.username?this.copyText(d.username,"Username copied."):this.toast("Username not found.","error");}),
            b("Link","Copy profile link",()=>{const d=this.getProfileData(popout);d.id?this.copyText(`https://discord.com/users/${d.id}`,"Profile link copied."):this.toast("Profile link needs a user ID.","error");}),
            b("Song","Open Spotify link",()=>{const l=this.getSpotifyLink(popout);l?window.open(l,"_blank"):this.toast("Spotify link not found.","error");}),
            b("Note","Private local note",()=>this.toggleNotePanel(popout)),
            b("Tag","Private local tags",()=>this.toggleNotePanel(popout))
        );
        popout.appendChild(tools);this.updateProfileTools(popout);
    }

    updateProfileTools(popout){
        const d=this.getProfileData(popout);const tools=popout.querySelector(".ambient-profile-tools");if(!tools)return;
        const [ci,cn,cl,sp]=tools.querySelectorAll(".ambient-profile-tool");
        if(ci)ci.disabled=!d.id;if(cn)cn.disabled=!d.username;if(cl)cl.disabled=!d.id;if(sp)sp.disabled=!this.getSpotifyLink(popout);
    }

    createToolButton(label,title,onClick){
        const b=document.createElement("button");b.className="ambient-profile-tool";b.type="button";b.textContent=label;b.title=title;
        b.addEventListener("click",e=>{e.preventDefault();e.stopPropagation();onClick();});return b;
    }

    // ─── Note panel ──────────────────────────────────────────────────────────────

    toggleNotePanel(popout){
        let p=popout.querySelector(".ambient-profile-note");if(!p)p=this.createNotePanel(popout);
        p.hidden=!p.hidden;this.renderProfileTags(popout);if(!p.hidden)p.querySelector("textarea")?.focus();
    }

    createNotePanel(popout){
        const panel=document.createElement("div");panel.className="ambient-profile-note";panel.hidden=true;
        const ta=document.createElement("textarea");ta.spellcheck=false;ta.placeholder="Private note for this profile...";
        const ti=document.createElement("input");ti.className="ambient-profile-tag-input";ti.type="text";ti.spellcheck=false;ti.placeholder="tags: friend, staff, trade";
        const tl=document.createElement("label");tl.className="ambient-profile-note-label";tl.textContent="Local tags";
        const footer=document.createElement("div");footer.className="ambient-profile-note-footer";
        const status=document.createElement("span");status.textContent="Saved locally";
        const clear=document.createElement("button");clear.className="ambient-profile-note-clear";clear.type="button";clear.textContent="Clear";
        footer.append(status,clear);panel.append(ta,tl,ti,footer);popout.appendChild(panel);
        const refresh=()=>{const k=this.getNoteKey(popout);ta.value=k?this.getNotes()[k]||"":"";ti.value=k?(this.getTags()[k]||[]).join(", "):"";ta.disabled=ti.disabled=!k;status.textContent=k?"Saved locally":"Profile key not found";};
        ta.addEventListener("input",()=>{const k=this.getNoteKey(popout);if(!k)return;const n=this.getNotes();const v=ta.value.trim();v?n[k]=ta.value:delete n[k];this.saveNotes(n);status.textContent="Saved";});
        ti.addEventListener("input",()=>{const k=this.getNoteKey(popout);if(!k)return;const t=this.getTags();const v=this.parseTags(ti.value);v.length?t[k]=v:delete t[k];this.saveTags(t);this.renderProfileTags(popout);status.textContent="Saved";});
        clear.addEventListener("click",()=>{const k=this.getNoteKey(popout);if(!k)return;const n=this.getNotes(),t=this.getTags();delete n[k];delete t[k];this.saveNotes(n);this.saveTags(t);ta.value=ti.value="";this.renderProfileTags(popout);status.textContent="Cleared";});
        refresh();return panel;
    }

    getProfileData(p){return{id:this.extractUserId(p),username:this.extractUsername(p)};}

    extractUserId(popout){
        const vals=[];
        popout.querySelectorAll("img[src],source[srcset],a[href]").forEach(el=>vals.push(el.src,el.srcset,el.href));
        popout.querySelectorAll("[style]").forEach(el=>vals.push(el.getAttribute("style")));
        for(const v of vals.filter(Boolean)){const m=String(v).match(/(?:avatars|banners)\/(\d{16,22})\//);if(m)return m[1];}
        return "";
    }

    extractUsername(popout){
        for(const sel of['[class*="nickname_"]','[class*="username_"]','[class*="userTag_"]','h1','[aria-label*="profile"]']){
            const el=popout.querySelector(sel);const text=el?.textContent?.trim();if(text&&text.length<=80)return text;
            const label=el?.getAttribute?.("aria-label")?.trim();if(label&&label.length<=80)return label;
        }
        return "";
    }

    getSpotifyLink(p){return p.querySelector('a[href*="open.spotify.com"],a[href*="spotify.link"]')?.href||"";}
    getNoteKey(p){const d=this.getProfileData(p);return d.id?`id:${d.id}`:d.username?`name:${d.username.toLowerCase()}`:""; }
    getNotes(){return BdApi.Data.load(PLUGIN_NAME,"profileNotes")||{};}
    saveNotes(n){BdApi.Data.save(PLUGIN_NAME,"profileNotes",n);}
    getTags(){return BdApi.Data.load(PLUGIN_NAME,"profileTags")||{};}
    saveTags(t){BdApi.Data.save(PLUGIN_NAME,"profileTags",t);}
    parseTags(v){return Array.from(new Set(String(v).split(",").map(t=>t.trim()).filter(Boolean).map(t=>t.slice(0,20)))).slice(0,6);}

    renderProfileTags(popout){
        popout.querySelector(".ambient-profile-tags")?.remove();
        const panel=popout.querySelector(".ambient-profile-note");if(panel&&!panel.hidden)return;
        const key=this.getNoteKey(popout);const tags=key?this.getTags()[key]||[]:[];if(!tags.length)return;
        const row=document.createElement("div");row.className="ambient-profile-tags";
        for(const tag of tags){const chip=document.createElement("span");chip.className="ambient-profile-tag";chip.textContent=chip.title=tag;row.appendChild(chip);}
        popout.appendChild(row);
    }

    polishSpotifyCards(popout){
        popout.querySelectorAll('img[src*="i.scdn.co"],img[src*="spotify"]').forEach(img=>{
            const card=this.findSpotifyCard(img,popout);if(card)card.classList.add("ambient-spotify-card");
        });
    }

    findSpotifyCard(img,popout){
        let best=img.parentElement,cur=img.parentElement;
        for(let i=0;i<8&&cur&&cur!==popout;i++){
            const text=(cur.textContent||"").toLowerCase(),rect=cur.getBoundingClientRect?.();
            if(text.includes("spotify")||text.includes("dinliyor")||(rect&&rect.width>220&&rect.height>70))best=cur;
            cur=cur.parentElement;
        }
        return best&&best!==img.parentElement?best:img.closest('[class*="activity_"],[class*="card_"],[class*="section_"]')||best;
    }

    // ─── Message enhancements ────────────────────────────────────────────────────

    scanExistingMessageEnhancements(){this.enhanceMessageNode(document);}
    enhanceMessageNode(root){this.enhanceLinks(root);this.enhanceCodeBlocks(root);}

    enhanceLinks(root){
        const anchors=[];
        if(root.matches?.("a[href]"))anchors.push(root);
        root.querySelectorAll?.("a[href]").forEach(a=>anchors.push(a));
        for(const a of anchors)this.enhanceLink(a);
    }

    enhanceLink(anchor){
        if(anchor.classList.contains("ambient-enhanced-link"))return;
        if(!anchor.closest(LINK_SCOPE_SELECTORS))return;
        if(anchor.closest(".ambient-link-tools,.ambient-profile-tools,.ambient-profile-note"))return;
        if(anchor.querySelector("img,video,canvas,svg"))return;
        const url=this.parseHttpUrl(anchor.href);if(!url)return;
        const domain=this.getDisplayDomain(url);if(!domain||domain==="discord.com")return;
        const risk=this.getLinkRisk(url);
        anchor.classList.add("ambient-enhanced-link");anchor.dataset.ambientDomain=domain;anchor.dataset.ambientRisk=risk;
        const tools=document.createElement("span");tools.className="ambient-link-tools";tools.contentEditable="false";
        const badge=document.createElement("span");badge.className="ambient-link-domain";badge.dataset.ambientRisk=risk;
        badge.textContent=risk==="safe"?domain:`! ${domain}`;badge.title=this.getLinkRiskTitle(url,risk);
        const copy=document.createElement("button");copy.className="ambient-link-copy";copy.type="button";copy.textContent="Copy";copy.title="Copy link";
        copy.addEventListener("click",e=>{e.preventDefault();e.stopPropagation();this.copyText(url.href,"Link copied.");});
        tools.append(badge,copy);anchor.insertAdjacentElement("afterend",tools);
    }

    parseHttpUrl(href){try{const u=new URL(href);return(u.protocol==="http:"||u.protocol==="https:")?u:null;}catch{return null;}}
    getDisplayDomain(url){return url.hostname.replace(/^www\./i,"").toLowerCase();}
    getLinkRisk(url){const d=this.getDisplayDomain(url);if(SUSPICIOUS_DOMAINS.has(d))return"danger";if(d.startsWith("xn--"))return"warn";if(/^\d{1,3}(?:\.\d{1,3}){3}$/.test(d))return"warn";if(d.split(".").length>3)return"warn";return"safe";}
    getLinkRiskTitle(url,risk){if(risk==="danger")return`Risky shortener/logger style domain: ${url.href}`;if(risk==="warn")return`Check this domain before opening: ${url.href}`;return url.href;}

    enhanceCodeBlocks(root){
        const blocks=[];if(root.matches?.("pre"))blocks.push(root);root.querySelectorAll?.("pre").forEach(b=>blocks.push(b));
        for(const block of blocks){
            if(!block.closest(LINK_SCOPE_SELECTORS))continue;if(block.classList.contains("ambient-enhanced-code"))continue;
            const text=this.extractCodeText(block);if(!text)continue;
            block.classList.add("ambient-enhanced-code");
            const btn=document.createElement("button");btn.className="ambient-code-copy";btn.type="button";btn.textContent="Copy";btn.title="Copy code block";
            btn.addEventListener("click",e=>{e.preventDefault();e.stopPropagation();this.copyText(this.extractCodeText(block),"Code copied.");});
            block.appendChild(btn);
        }
    }

    extractCodeText(block){const code=block.querySelector("code");const src=code||block.cloneNode(true);src.querySelector?.(".ambient-code-copy")?.remove();return this.normalizeCopiedText(src.innerText||src.textContent||"");}

    handleShiftClickCopy(event){
        if(!event.shiftKey||event.button!==0)return;if(this.isInteractiveTarget(event.target))return;
        const msg=event.target?.closest?.('[id^="chat-messages-"],[class*="message_"]');
        if(!msg||msg.closest('[class*="messagesPopout_"],[class*="searchResult_"]'))return;
        const content=this.extractMessageText(msg);if(!content)return;
        event.preventDefault();event.stopPropagation();this.copyText(content,"Message copied.");
    }

    isInteractiveTarget(target){return Boolean(target?.closest?.("a,button,input,textarea,select,[role='button'],[contenteditable='true'],.ambient-profile-tools,.ambient-profile-note"));}

    extractMessageText(message){
        const c=message.querySelector('[class*="messageContent_"]');
        if(c)return this.normalizeCopiedText(c.innerText||c.textContent||"");
        return Array.from(message.querySelectorAll('[class*="markup_"],[class*="embedDescription_"],[class*="embedTitle_"]')).map(el=>this.normalizeCopiedText(el.innerText||el.textContent||"")).filter(Boolean).join("\n");
    }

    normalizeCopiedText(text){return text.replace(/\u200B/g,"").replace(/\n{3,}/g,"\n\n").trim();}

    async copyText(text,message){
        try{await navigator.clipboard.writeText(text);}
        catch{const ta=document.createElement("textarea");ta.value=text;ta.style.cssText="position:fixed;opacity:0;";document.body.appendChild(ta);ta.select();document.execCommand("copy");ta.remove();}
        this.toast(message,"success");
    }

    toast(message,type="info"){BdApi.UI?.showToast?.(message,{type});}

    parseCssColor(value){
        if(!value||value.includes("transparent"))return null;
        const m=value.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);if(m)return m.slice(1,4).map(Number);
        const h=value.trim().match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);if(!h)return null;
        const hex=h[1].length===3?h[1].split("").map(c=>c+c).join(""):h[1];
        return[0,2,4].map(i=>parseInt(hex.slice(i,i+2),16));
    }
};
