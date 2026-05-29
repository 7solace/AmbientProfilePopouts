/**
 * @name AmbientProfilePopouts
 * @author s7lace
 * @version 1.5.3
 * @description Adds ambient blur and animation effects to profile popouts, modals, sidebars, and more. Highly customizable with per-area animation styles and speeds. 
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
    '[class*="avatar_"] img','[class*="banner_\"] img','[class*="profileBanner_\"] img'
].join(",");

const LINK_SCOPE_SELECTORS = [
    '[id^="chat-messages-"]','[class*="message_"]','[class*="embed_"]'
].join(",");

const SUSPICIOUS_DOMAINS = new Set([
    "bit.ly","tinyurl.com","t.co","goo.gl","is.gd",
    "cutt.ly","rb.gy","shorturl.at","grabify.link","iplogger.org","2no.co"
]);

// ─── Animation definitions ───────────────────────────────────────────────────

const ANIM_STYLES = ["none","fade","slide-up","slide-down","slide-left","slide-right","scale","blur","flip","spring","bounce","elastic","rotate","pulse","shake","jelly","zoom-in","zoom-out","slide-fade","pop"];
const ANIM_STYLE_LABELS = {
    none:"Kapalı", fade:"Fade (Soluklaşma)",
    "slide-up":"Slide Yukarı", "slide-down":"Slide Aşağı",
    "slide-left":"Slide Sol", "slide-right":"Slide Sağ",
    scale:"Scale / Zoom", blur:"Blur", flip:"Flip", spring:"Spring / Bounce",
    bounce:"Bounce", elastic:"Elastic", rotate:"Rotate", pulse:"Pulse",
    shake:"Shake", jelly:"Jelly", "zoom-in":"Zoom In", "zoom-out":"Zoom Out",
    "slide-fade":"Slide + Fade", pop:"Pop"
};

const ANIM_AREAS = {
    messages:     { label:"Mesaj Girişi",            selector:'[id^="chat-messages-"] [class*="message_"]:not(.amb-done)' },
    channelSwitch:{ label:"Kanal Değiştirme",        selector:'[class*="chat_"],[class*="chatContent_"]' },
    serverSwitch: { label:"Sunucu Değiştirme",       selector:'[class*="guilds_"],[class*="guildsList_"]' },
    sidebar:      { label:"Sidebar",                 selector:'[class*="sidebar_"],[class*="panels_"]' },
    memberSidebar:{ label:"Member Sidebar",          selector:'[class*="membersWrap_"],[class*="members_"]' },
    modals:       { label:"Modal & Popout",          selector:'[class*="modal_"],[class*="layer_"],[class*="userPopoutOuter_"]' },
    emojiPicker:  { label:"Emoji & Reaction Picker", selector:'[class*="emojiPicker_"],[class*="reactionPicker_"]' },
    toasts:       { label:"Bildirim Toast\'ları",    selector:'[class*="toast_"],[class*="toastItem_"],[class*="notice_"]' },
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
        messages:     { style:"slide-up",    duration:320, enabled:true },
        channelSwitch:{ style:"fade",        duration:260, enabled:true },
        serverSwitch: { style:"scale",       duration:280, enabled:true },
        sidebar:      { style:"slide-left",  duration:300, enabled:true },
        memberSidebar:{ style:"slide-right", duration:280, enabled:true },
        modals:       { style:"spring",      duration:380, enabled:true },
        emojiPicker:  { style:"scale",       duration:220, enabled:true },
        toasts:       { style:"slide-right", duration:300, enabled:true },
        contextMenu:  { style:"scale",       duration:180, enabled:true },
    }
};

module.exports = class AmbientProfilePopouts {

    // ─── Settings ────────────────────────────────────────────────────────────────

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
        
        // Create custom modal container
        const modalOverlay = document.createElement("div");
        modalOverlay.className = "amb-modal-overlay";
        modalOverlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: rgba(0, 0, 0, 0.85);
            z-index: 99999;
            display: flex;
            align-items: center;
            justify-content: center;
        `;
        
        const modalContainer = document.createElement("div");
        modalContainer.className = "amb-modal-container";
        modalContainer.style.cssText = `
            width: 95vw;
            height: 95vh;
            min-width: 1400px;
            min-height: 900px;
            background: #2b2d31;
            border-radius: 12px;
            overflow: hidden;
            display: flex;
            flex-direction: column;
        `;
        
        const modalHeader = document.createElement("div");
        modalHeader.style.cssText = `
            padding: 20px 24px;
            background: #1e1f22;
            border-bottom: 1px solid #1f2023;
            display: flex;
            justify-content: space-between;
            align-items: center;
        `;
        
        const modalTitle = document.createElement("h2");
        modalTitle.textContent = "AmbientProfilePopouts Settings";
        modalTitle.style.cssText = `
            margin: 0;
            font-size: 20px;
            font-weight: 600;
            color: #dbdee1;
        `;
        
        const modalCloseBtn = document.createElement("button");
        modalCloseBtn.textContent = "✕";
        modalCloseBtn.style.cssText = `
            width: 32px;
            height: 32px;
            border: none;
            border-radius: 4px;
            background: #4e5058;
            color: #dbdee1;
            font-size: 18px;
            cursor: pointer;
            transition: all 0.15s ease;
        `;
        modalCloseBtn.addEventListener("mouseenter", () => {
            modalCloseBtn.style.background = "#ed4245";
        });
        modalCloseBtn.addEventListener("mouseleave", () => {
            modalCloseBtn.style.background = "#4e5058";
        });
        modalCloseBtn.addEventListener("click", () => {
            modalOverlay.remove();
        });
        
        modalHeader.appendChild(modalTitle);
        modalHeader.appendChild(modalCloseBtn);
        
        const modalContent = document.createElement("div");
        modalContent.style.cssText = `
            flex: 1;
            overflow: hidden;
        `;
        
        const wrap = document.createElement("div");
        wrap.className = "amb-settings-panel";
        wrap.style.cssText = `
            width: 100%;
            height: 100%;
            display: flex;
        `;
        
        modalContent.appendChild(wrap);
        modalContainer.appendChild(modalHeader);
        modalContainer.appendChild(modalContent);
        modalOverlay.appendChild(modalContainer);
        
        // Append to body
        document.body.appendChild(modalOverlay);
        
        // BetterAnimations tarzı modern CSS
        const styleBlock = document.createElement("style");
        styleBlock.textContent = `
            .amb-settings-panel {
    display: flex;

    width: 100%;
    height: 100%;

    overflow: hidden;

    font-family: var(--font-primary, 'gg sans', sans-serif);
    color: #dbdee1;
    background: #2b2d31;

    position: relative;
}

            
            /* Sidebar */
            .amb-sidebar {
                width: 320px;
                padding: 20px;
                background: #1e1f22;
                border-right: 1px solid #1f2023;
                display: flex;
                flex-direction: column;
                gap: 4px;
                overflow-y: auto;
            }
            .amb-sidebar::-webkit-scrollbar { width: 8px; }
            .amb-sidebar::-webkit-scrollbar-track { background: #2b2d31; }
            .amb-sidebar::-webkit-scrollbar-thumb { background: #1a1b1e; border-radius: 4px; }
            
            .amb-sidebar-item {
                padding: 10px 12px; border-radius: 4px; cursor: pointer;
                font-size: 14px; font-weight: 500; color: #b5bac1;
                transition: all 0.15s ease; display: flex; align-items: center; gap: 12px;
            }
            .amb-sidebar-item:hover { background: #3f4147; color: #dbdee1; }
            .amb-sidebar-item.active { background: #5865f2; color: #fff; }
            .amb-sidebar-divider { height: 1px; background: rgba(255,255,255,0.05); margin: 8px 0; }
            
            /* Main Content */
            .amb-main-content {
                flex: 1;
                padding: 32px;
                overflow-y: auto;
                background: #313338;
                min-width: 0;
            }
            .amb-main-content::-webkit-scrollbar { width: 8px; }
            .amb-main-content::-webkit-scrollbar-track { background: #2b2d31; }
            .amb-main-content::-webkit-scrollbar-thumb { background: #1a1b1e; border-radius: 4px; }
            
            /* Content Sections */
            .amb-content-section { display: none; position: relative; }
            .amb-content-section.active { display: block; }
            
            .amb-section-title {
                font-size: 20px; font-weight: 600; color: #fff; margin-bottom: 8px;
            }
            .amb-section-desc { font-size: 14px; color: #b5bac1; margin-bottom: 20px; line-height: 1.4; }
            
            /* Animation Grid */
            .amb-anim-grid {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
                gap: 20px;
                margin-top: 20px;
            }
            
            /* Animation Style Cards */
            .amb-style-card {
                background: #2b2d31; 
                border: 1px solid #1f2023; border-radius: 8px; 
                padding: 20px; display: flex; flex-direction: column; gap: 12px; 
                transition: all 0.15s ease; cursor: pointer;
            }
            .amb-style-card:hover { 
                border-color: #5865f2; 
            }
            .amb-style-card.selected { border-color: #5865f2; background: #3f4147; }
            
            .amb-style-preview {
                height: 140px;
                background: linear-gradient(135deg, #1e1f22 0%, #2b2d31 100%); 
                border-radius: 8px; display: flex; align-items: center; justify-content: center;
                border: 1px solid #1f2023; perspective: 600px;
                overflow: hidden;
                position: relative;
            }
            .amb-style-preview::before {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: radial-gradient(circle at 50% 50%, rgba(88,101,242,0.1) 0%, transparent 70%);
                pointer-events: none;
            }
            .amb-style-preview-box {
                width: 50px; height: 35px; background: linear-gradient(135deg, #5865f2 0%, #7289da 100%); 
                border-radius: 8px; opacity: 0;
                box-shadow: 0 4px 20px rgba(88,101,242,0.4);
            }
            
            .amb-style-name { font-size: 14px; font-weight: 600; color: #dbdee1; text-align: center; }
            .amb-style-desc { font-size: 12px; color: #949ba4; text-align: center; margin-top: 4px; line-height: 1.3; }
            .amb-style-actions { display: flex; gap: 8px; justify-content: center; }
            .amb-style-btn {
                width: 32px; height: 32px; border: 0; border-radius: 4px; cursor: pointer;
                background: #3f4147; color: #b5bac1;
                display: flex; align-items: center; justify-content: center;
                transition: all 0.15s ease; font-size: 14px;
            }
            .amb-style-btn:hover { background: #4f545c; color: #dbdee1; }
            
            /* Settings Elements */
            .amb-setter-row { 
                display: flex; flex-direction: column; gap: 8px; 
                background: #2b2d31; 
                padding: 16px; border-radius: 8px; border: 1px solid #1f2023;
                margin-bottom: 12px;
            }
            .amb-setter-top { display: flex; justify-content: space-between; align-items: center; }
            .amb-setter-lbl { font-size: 14px; font-weight: 600; color: #dbdee1; }
            .amb-setter-val { font-size: 14px; font-weight: 600; color: #5865f2; background: #5865f220; padding: 2px 8px; border-radius: 4px; }
            .amb-setter-desc { font-size: 13px; color: #949ba4; line-height: 1.4; }
            
            /* Modal Buttons (reused for detail section) */
            .amb-modal-btn {
                padding: 10px 16px; border: 0; border-radius: 4px;
                font-size: 14px; font-weight: 500; cursor: pointer;
                transition: all 0.15s ease;
            }
            .amb-modal-btn-primary {
                background: #5865f2;
                color: #fff;
            }
            .amb-modal-btn-primary:hover { background: #4752c4; }
            .amb-modal-btn-secondary {
                background: #4e5058; color: #dbdee1;
            }
            .amb-modal-btn-secondary:hover { background: #6d6f78; }
            
            .amb-settings-panel input[type="range"] {
                width: 100%; height: 6px; -webkit-appearance: none; 
                background: linear-gradient(90deg, #4e5058 0%, #5865f2 100%); 
                border-radius: 3px; outline: none; margin-top: 6px; cursor: pointer;
            }
            .amb-settings-panel input[type="range"]::-webkit-slider-thumb {
                -webkit-appearance: none; width: 18px; height: 18px; border-radius: 50%; 
                background: linear-gradient(135deg, #5865f2, #7289da); 
                cursor: pointer; transition: all 0.2s ease; box-shadow: 0 2px 8px rgba(88,101,242,0.4);
            }
            .amb-settings-panel input[type="range"]::-webkit-slider-thumb:hover { transform: scale(1.1); }
            
            .amb-toggle-row { 
                display: flex; justify-content: space-between; align-items: center; 
                background: #2b2d31; 
                padding: 16px; border-radius: 8px; border: 1px solid #1f2023;
            }
            .amb-toggle-btn {
                width: 44px; height: 24px; border: 0; border-radius: 12px; cursor: pointer; position: relative; 
                transition: all 0.2s ease; background: #4e5058;
            }
            .amb-toggle-dot {
                position: absolute; top: 2px; left: 2px; width: 20px; height: 20px; border-radius: 50%; 
                background: #fff; transition: all 0.2s ease; box-shadow: 0 2px 4px rgba(0,0,0,0.2);
            }
            
            .amb-select-el {
                background: #1e1f22; 
                border: 1px solid #1f2023; border-radius: 4px; 
                color: #dbdee1; padding: 8px 12px; font-size: 14px; font-weight: 500; 
                cursor: pointer; outline: none; width: 100%;
            }
            .amb-select-el:hover { border-color: #5865f2; }
            .amb-select-el option { background: #1e1f22; color: #dbdee1; }
            
            .amb-btn-reset {
                padding: 10px 16px; border: 1px solid #ed4245; border-radius: 4px; 
                background: transparent; 
                color: #ed4245; font-size: 14px; font-weight: 500; cursor: pointer; 
                transition: all 0.15s ease; margin-top: 16px;
            }
            .amb-btn-reset:hover { 
                background: #ed4245; color: #fff;
            }
        `;
        wrap.appendChild(styleBlock);


        // Sidebar
        const sidebar = document.createElement("div");
        sidebar.className = "amb-sidebar";
        
        const sidebarItems = [
            { id: "home", label: "🏠 Ana Sayfa", icon: "home" },
            { id: "messages", label: "💬 Mesajlar", icon: "message" },
            { id: "modals", label: "🪟 Modals & Popouts", icon: "window" },
            { id: "tooltips", label: "💡 Tooltips", icon: "tooltip" },
            { id: "menus", label: "📋 Menüler", icon: "menu" },
            { id: "settings", label: "⚙️ Genel Ayarlar", icon: "settings" }
        ];
        
        let activeSection = "home";
        
        sidebarItems.forEach(item => {
            const btn = document.createElement("div");
            btn.className = `amb-sidebar-item ${item.id === activeSection ? 'active' : ''}`;
            btn.textContent = item.label;
            btn.dataset.section = item.id;
            btn.addEventListener("click", () => {
                document.querySelectorAll('.amb-sidebar-item').forEach(el => el.classList.remove('active'));
                btn.classList.add('active');
                document.querySelectorAll('.amb-content-section').forEach(el => el.classList.remove('active'));
                document.querySelector(`.amb-section-${item.id}`).classList.add('active');
                activeSection = item.id;
                previousSection = item.id;
            });
            sidebar.appendChild(btn);
        });
        
        const divider = document.createElement("div");
        divider.className = "amb-sidebar-divider";
        sidebar.appendChild(divider);
        
        wrap.appendChild(sidebar);

        // Main Content
        const mainContent = document.createElement("div");
        mainContent.className = "amb-main-content";
        
        // Home Section
        const homeSection = document.createElement("div");
        homeSection.className = "amb-content-section amb-section-home active";
        homeSection.innerHTML = `
            <h2 class="amb-section-title">AmbientProfilePopouts</h2>
            <p class="amb-section-desc">Discord için gelişmiş animasyon ve profil efektleri eklentisi. Sol menüden farklı kategorilere geçerek animasyon stillerini test edebilirsiniz.</p>
            
            <h3 style="font-size:18px; font-weight:700; color:#fff; margin:24px 0 16px;">🎬 Tüm Animasyon Stilleri</h3>
            <div class="amb-anim-grid" id="allAnimGrid"></div>
        `;
        mainContent.appendChild(homeSection);
        
        // Messages Section
        const messagesSection = document.createElement("div");
        messagesSection.className = "amb-content-section amb-section-messages";
        messagesSection.innerHTML = `
            <h2 class="amb-section-title">Mesaj Animasyonları</h2>
            <p class="amb-section-desc">Sohbet mesajları için animasyon stillerini buradan yapılandırabilirsiniz.</p>
            <div class="amb-anim-grid" id="messagesAnimGrid"></div>
        `;
        mainContent.appendChild(messagesSection);
        
        // Modals Section
        const modalsSection = document.createElement("div");
        modalsSection.className = "amb-content-section amb-section-modals";
        modalsSection.innerHTML = `
            <h2 class="amb-section-title">Modals & Popouts</h2>
            <p class="amb-section-desc">Modal pencereleri ve profil popout'ları için animasyon stilleri.</p>
            <div class="amb-anim-grid" id="modalsAnimGrid"></div>
        `;
        mainContent.appendChild(modalsSection);
        
        // Tooltips Section
        const tooltipsSection = document.createElement("div");
        tooltipsSection.className = "amb-content-section amb-section-tooltips";
        tooltipsSection.innerHTML = `
            <h2 class="amb-section-title">Tooltips</h2>
            <p class="amb-section-desc">Tooltip ve bilgi balonları için animasyon stilleri.</p>
            <div class="amb-anim-grid" id="tooltipsAnimGrid"></div>
        `;
        mainContent.appendChild(tooltipsSection);
        
        // Menus Section
        const menusSection = document.createElement("div");
        menusSection.className = "amb-content-section amb-section-menus";
        menusSection.innerHTML = `
            <h2 class="amb-section-title">Menüler</h2>
            <p class="amb-section-desc">Sağ tık menüleri ve dropdown menüler için animasyon stilleri.</p>
            <div class="amb-anim-grid" id="menusAnimGrid"></div>
        `;
        mainContent.appendChild(menusSection);
        
        // Animation Detail Section (dynamic)
        const animDetailSection = document.createElement("div");
        animDetailSection.className = "amb-content-section amb-section-anim-detail";
        animDetailSection.innerHTML = `
            <button class="amb-modal-btn amb-modal-btn-secondary" id="backToGrid" style="margin-bottom: 20px;">← Grid'e Dön</button>
            <h2 class="amb-section-title" id="animDetailTitle">Animasyon Detayları</h2>
            <p class="amb-section-desc" id="animDetailDesc">Bu animasyon stilinin farklı alanlar için hız ayarlarını buradan yapılandırabilirsiniz.</p>
            <div id="animDetailSettings"></div>
        `;
        mainContent.appendChild(animDetailSection);
        
        // Settings Section
        const settingsSection = document.createElement("div");
        settingsSection.className = "amb-content-section amb-section-settings";
        mainContent.appendChild(settingsSection);
        
        wrap.appendChild(mainContent);

        // Animation Detail Section functionality
        const backToGridBtn = animDetailSection.querySelector('#backToGrid');
        const animDetailTitle = animDetailSection.querySelector('#animDetailTitle');
        const animDetailDesc = animDetailSection.querySelector('#animDetailDesc');
        const animDetailSettings = animDetailSection.querySelector('#animDetailSettings');
        let currentDetailStyle = null;
        let previousSection = 'home';

        const showAnimDetail = (style, label) => {
            currentDetailStyle = style;
            animDetailTitle.textContent = `${label} - Animasyon Ayarları`;
            animDetailDesc.textContent = `Bu animasyon stilinin farklı Discord alanları için hız ayarlarını buradan yapılandırabilirsiniz.`;
            
            // Clear previous settings
            animDetailSettings.innerHTML = '';
            
            const cur = this.getSettings();
            const areaLabels = {
                messages: "Mesaj Girişi",
                channelSwitch: "Kanal Değiştirme",
                serverSwitch: "Sunucu Değiştirme",
                sidebar: "Sidebar",
                memberSidebar: "Member Sidebar",
                modals: "Modal & Popout",
                emojiPicker: "Emoji Picker",
                toasts: "Bildirim Toast'ları",
                contextMenu: "Sağ Tık Menüsü"
            };
            const areaDescriptions = {
                messages: "Sohbet mesajlarının görünme animasyonu",
                channelSwitch: "Kanal değiştirirken geçiş animasyonu",
                serverSwitch: "Sunucu değiştirirken geçiş animasyonu",
                sidebar: "Sol sidebar'ın görünüme animasyonu",
                memberSidebar: "Sağ member sidebar'ın görünüme animasyonu",
                modals: "Modal pencerelerinin ve profil popout'ların animasyonu",
                emojiPicker: "Emoji picker ve reaction picker'ın animasyonu",
                toasts: "Bildirim toast'larının (sağ üst bildirimler) animasyonu",
                contextMenu: "Sağ tık menülerinin açılış animasyonu"
            };
            
            // Create settings for each area
            for (const [areaKey, areaLabel] of Object.entries(areaLabels)) {
                if (cur.anim[areaKey]) {
                    const areaSettings = document.createElement('div');
                    areaSettings.className = 'amb-setter-row';
                    const currentDuration = cur.anim[areaKey].duration || 300;
                    const isApplied = cur.anim[areaKey].style === style;
                    const isEnabled = cur.anim[areaKey].enabled !== false;
                    
                    // Area-specific preview design
                    const getAreaPreviewHTML = (area) => {
                        switch(area) {
                            case 'messages':
                                return `
                                    <div class="amb-style-preview" style="height: 80px; margin: 8px 0; background: #1e1f22; border-radius: 8px; padding: 12px; position: relative;">
                                        <div class="amb-preview-message" style="background: #313338; border-radius: 8px; padding: 8px 12px; max-width: 200px; opacity: 0;">
                                            <div style="display: flex; gap: 8px; align-items: center;">
                                                <div style="width: 24px; height: 24px; background: #5865f2; border-radius: 50%;"></div>
                                                <div style="flex: 1;">
                                                    <div style="height: 8px; background: #4e5058; border-radius: 4px; margin-bottom: 4px; width: 80%;"></div>
                                                    <div style="height: 8px; background: #4e5058; border-radius: 4px; width: 60%;"></div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                `;
                            case 'sidebar':
                                return `
                                    <div class="amb-style-preview" style="height: 80px; margin: 8px 0; background: #1e1f22; border-radius: 8px; padding: 12px; display: flex; gap: 8px;">
                                        <div class="amb-preview-sidebar-item" style="width: 40px; height: 40px; background: #313338; border-radius: 50%; opacity: 0;"></div>
                                        <div class="amb-preview-sidebar-item" style="width: 40px; height: 40px; background: #313338; border-radius: 50%; opacity: 0;"></div>
                                        <div class="amb-preview-sidebar-item" style="width: 40px; height: 40px; background: #313338; border-radius: 50%; opacity: 0;"></div>
                                    </div>
                                `;
                            case 'modals':
                                return `
                                    <div class="amb-style-preview" style="height: 80px; margin: 8px 0; background: #1e1f22; border-radius: 8px; padding: 12px; display: flex; align-items: center; justify-content: center;">
                                        <div class="amb-preview-modal" style="width: 120px; height: 60px; background: #313338; border-radius: 8px; opacity: 0;"></div>
                                    </div>
                                `;
                            case 'toasts':
                                return `
                                    <div class="amb-style-preview" style="height: 80px; margin: 8px 0; background: #1e1f22; border-radius: 8px; padding: 12px; display: flex; align-items: center; justify-content: center;">
                                        <div class="amb-preview-toast" style="width: 180px; height: 40px; background: #3ba55c; border-radius: 4px; opacity: 0;"></div>
                                    </div>
                                `;
                            default:
                                return `
                                    <div class="amb-style-preview" style="height: 60px; margin: 8px 0;">
                                        <div class="amb-style-preview-box" style="width: 30px; height: 20px;"></div>
                                    </div>
                                `;
                        }
                    };
                    
                    areaSettings.innerHTML = `
                        <div class="amb-setter-top">
                            <span class="amb-setter-lbl">${areaLabel}</span>
                            <div style="display: flex; align-items: center; gap: 12px;">
                                <span class="amb-setter-val">${currentDuration}ms ${isApplied ? '✓' : ''}</span>
                                <button class="amb-toggle-btn area-toggle-btn" data-area="${areaKey}" style="width: 40px; height: 20px; border: 0; border-radius: 10px; cursor: pointer; position: relative; transition: all 0.2s ease; background: ${isEnabled ? '#5865f2' : '#4e5058'};">
                                    <span class="amb-toggle-dot" style="position: absolute; top: 2px; left: ${isEnabled ? '20px' : '2px'}; width: 16px; height: 16px; border-radius: 50%; background: #fff; transition: all 0.2s ease; box-shadow: 0 2px 4px rgba(0,0,0,0.2);"></span>
                                </button>
                            </div>
                        </div>
                        <div class="amb-setter-desc">${areaDescriptions[areaKey] || ''}</div>
                        <div class="amb-setter-subdesc" style="font-size: 12px; color: #949ba4; margin-top: 4px;">${isEnabled ? (isApplied ? 'Bu animasyon şu an bu alana uygulanmış.' : 'Hız ayarlayın ve uygula butonuna basın.') : 'Bu animasyon kapalı. Toggle butonuna basarak açın.'}</div>
                        ${getAreaPreviewHTML(areaKey)}
                        <input type="range" min="80" max="800" step="10" value="${currentDuration}" class="area-speed-slider" data-area="${areaKey}" ${!isEnabled ? 'disabled' : ''}>
                        <div style="display: flex; gap: 8px; margin-top: 12px;">
                            <button class="amb-modal-btn amb-modal-btn-primary apply-anim-btn" data-area="${areaKey}" style="flex: 1;" ${!isEnabled ? 'disabled' : ''}>${isApplied ? 'Uygulandı' : 'Uygula'}</button>
                            <button class="amb-modal-btn amb-modal-btn-secondary preview-area-btn" data-area="${areaKey}" style="flex: 1;" ${!isEnabled ? 'disabled' : ''}>Önizle</button>
                        </div>
                    `;
                    animDetailSettings.appendChild(areaSettings);
                }
            }
            
            // Add event listeners
            animDetailSettings.querySelectorAll('.area-toggle-btn').forEach(toggleBtn => {
                toggleBtn.addEventListener('click', (e) => {
                    const areaKey = e.target.dataset.area;
                    const cur = this.getSettings();
                    const currentState = cur.anim[areaKey].enabled !== false;
                    cur.anim[areaKey].enabled = !currentState;
                    this.saveSettings(cur);
                    this.applySettingsToCSS(cur);
                    
                    // Update UI
                    const toggleDot = toggleBtn.querySelector('.amb-toggle-dot');
                    if (cur.anim[areaKey].enabled) {
                        toggleBtn.style.background = '#5865f2';
                        toggleDot.style.left = '20px';
                    } else {
                        toggleBtn.style.background = '#4e5058';
                        toggleDot.style.left = '2px';
                    }
                    
                    // Enable/disable controls
                    const slider = animDetailSettings.querySelector(`.area-speed-slider[data-area="${areaKey}"]`);
                    const applyBtn = animDetailSettings.querySelector(`.apply-anim-btn[data-area="${areaKey}"]`);
                    const previewBtn = animDetailSettings.querySelector(`.preview-area-btn[data-area="${areaKey}"]`);
                    const subdesc = toggleBtn.parentElement.parentElement.querySelector('.amb-setter-subdesc');
                    
                    if (cur.anim[areaKey].enabled) {
                        slider.disabled = false;
                        applyBtn.disabled = false;
                        previewBtn.disabled = false;
                        subdesc.textContent = cur.anim[areaKey].style === style ? 'Bu animasyon şu an bu alana uygulanmış.' : 'Hız ayarlayın ve uygula butonuna basın.';
                    } else {
                        slider.disabled = true;
                        applyBtn.disabled = true;
                        previewBtn.disabled = true;
                        subdesc.textContent = 'Bu animasyon kapalı. Toggle butonuna basarak açın.';
                    }
                    
                    this.toast(`${areaLabel} animasyonu ${cur.anim[areaKey].enabled ? 'açık' : 'kapalı'}.`, "success");
                });
            });
            
            animDetailSettings.querySelectorAll('.area-speed-slider').forEach(slider => {
                slider.addEventListener('input', (e) => {
                    const valSpan = e.target.parentElement.querySelector('.amb-setter-val');
                    valSpan.textContent = `${e.target.value}ms`;
                });
            });
            
            animDetailSettings.querySelectorAll('.apply-anim-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const areaKey = e.target.dataset.area;
                    const slider = animDetailSettings.querySelector(`.area-speed-slider[data-area="${areaKey}"]`);
                    const duration = parseInt(slider.value);
                    
                    const cur = this.getSettings();
                    cur.anim[areaKey].style = style;
                    cur.anim[areaKey].duration = duration;
                    this.saveSettings(cur);
                    this.applySettingsToCSS(cur);
                    
                    e.target.textContent = 'Uygulandı';
                    e.target.style.background = 'linear-gradient(135deg, #3ba55c, #2d7d46)';
                    
                    const valSpan = slider.parentElement.querySelector('.amb-setter-val');
                    valSpan.textContent = `${duration}ms ✓`;
                    
                    const desc = slider.parentElement.querySelector('.amb-setter-desc');
                    desc.textContent = 'Bu animasyon şu an bu alana uygulanmış.';
                    
                    this.toast(`${label} animasyonu ${areaKey} alanına uygulandı.`, "success");
                });
            });
            
            // Add preview button functionality
            animDetailSettings.querySelectorAll('.preview-area-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const areaKey = e.target.dataset.area;
                    const slider = animDetailSettings.querySelector(`.area-speed-slider[data-area="${areaKey}"]`);
                    const duration = parseInt(slider.value);
                    
                    // Get the correct preview element based on area
                    let previewElement;
                    switch(areaKey) {
                        case 'messages':
                            previewElement = e.target.parentElement.parentElement.querySelector('.amb-preview-message');
                            break;
                        case 'sidebar':
                            previewElement = e.target.parentElement.parentElement.querySelectorAll('.amb-preview-sidebar-item');
                            break;
                        case 'modals':
                            previewElement = e.target.parentElement.parentElement.querySelector('.amb-preview-modal');
                            break;
                        case 'toasts':
                            previewElement = e.target.parentElement.parentElement.querySelector('.amb-preview-toast');
                            break;
                        default:
                            previewElement = e.target.parentElement.parentElement.querySelector('.amb-style-preview-box');
                    }
                    
                    if (style === "none") {
                        if (Array.isArray(previewElement)) {
                            previewElement.forEach(el => el.style.opacity = "0");
                        } else {
                            previewElement.style.opacity = "0";
                        }
                        return;
                    }
                    
                    const easingMap = {
                        "spring": "cubic-bezier(.34,1.56,.64,1)",
                        "bounce": "cubic-bezier(.68,-0.55,.265,1.55)",
                        "elastic": "cubic-bezier(.68,-0.6,.32,1.6)",
                        "jelly": "cubic-bezier(.68,-0.55,.265,1.55)",
                        "pop": "cubic-bezier(.68,-0.55,.265,1.55)",
                        "shake": "cubic-bezier(.36,.07,.19,.97)",
                        "fade": "cubic-bezier(.4,0,.2,1)",
                        "slide-up": "cubic-bezier(.25,1,.5,1)",
                        "slide-down": "cubic-bezier(.25,1,.5,1)",
                        "slide-left": "cubic-bezier(.25,1,.5,1)",
                        "slide-right": "cubic-bezier(.25,1,.5,1)",
                        "scale": "cubic-bezier(.34,1.56,.64,1)",
                        "blur": "cubic-bezier(.4,0,.2,1)",
                        "flip": "cubic-bezier(.68,-0.55,.265,1.55)",
                        "rotate": "cubic-bezier(.68,-0.55,.265,1.55)",
                        "pulse": "cubic-bezier(.4,0,.6,1)",
                        "zoom-in": "cubic-bezier(.34,1.56,.64,1)",
                        "zoom-out": "cubic-bezier(.34,1.56,.64,1)",
                        "slide-fade": "cubic-bezier(.25,1,.5,1)"
                    };
                    const easing = easingMap[style] || "cubic-bezier(.22,.68,0,1.2)";
                    
                    // Apply animation to preview element(s)
                    if (Array.isArray(previewElement)) {
                        previewElement.forEach((el, index) => {
                            el.style.animation = "none";
                            void el.offsetWidth;
                            el.style.animation = `amb-${style} ${duration}ms ${easing} both`;
                            el.style.animationDelay = `${index * 50}ms`;
                        });
                    } else {
                        previewElement.style.animation = "none";
                        void previewElement.offsetWidth;
                        previewElement.style.animation = `amb-${style} ${duration}ms ${easing} both`;
                    }
                });
            });
            
            // Hide all sections and show detail
            document.querySelectorAll('.amb-content-section').forEach(el => el.classList.remove('active'));
            animDetailSection.classList.add('active');
        };
        
        backToGridBtn.addEventListener('click', () => {
            document.querySelectorAll('.amb-content-section').forEach(el => el.classList.remove('active'));
            document.querySelector(`.amb-section-${previousSection}`).classList.add('active');
            currentDetailStyle = null;
        });

        // Animation Style Cards Generator
        const createAnimStyleCard = (style, label, targetGridId) => {
            const animDescriptions = {
                "fade": "Yavaşça görünür",
                "slide-up": "Aşağıdan yukarı kayarak gelir",
                "slide-down": "Yukarıdan aşağı kayarak gelir",
                "slide-left": "Sağdan sola kayarak gelir",
                "slide-right": "Soldan sağa kayarak gelir",
                "scale": "Küçükten büyüyerek görünür",
                "blur": "Bulanıklaşarak netleşir",
                "flip": "Dönerek görünür",
                "spring": "Yaylanarak görünür",
                "bounce": "Zıplayarak görünür",
                "elastic": "Elastik şekilde görünür",
                "rotate": "Dönerek görünür",
                "pulse": "Nabız gibi atar",
                "shake": "Sallanarak görünür",
                "jelly": "Jeli gibi sallanır",
                "zoom-in": "Uzaklaşarak görünür",
                "zoom-out": "Yakınlaşarak görünür",
                "slide-fade": "Kayarak ve soluklaşarak görünür",
                "pop": "Patlayarak görünür"
            };
            
            const card = document.createElement("div");
            card.className = "amb-style-card";
            card.innerHTML = `
                <div class="amb-style-preview">
                    <div class="amb-style-preview-box"></div>
                </div>
                <div class="amb-style-name">${label}</div>
                <div class="amb-style-desc">${animDescriptions[style] || ""}</div>
                <div class="amb-style-actions">
                    <button class="amb-style-btn preview-btn" title="Önizle">▶️</button>
                </div>
            `;
            
            const previewBox = card.querySelector('.amb-style-preview-box');
            const previewBtn = card.querySelector('.preview-btn');
            
            const triggerCardPreview = () => {
                previewBox.style.animation = "none";
                void previewBox.offsetWidth;
                if (style === "none") {
                    previewBox.style.opacity = "0";
                    return;
                }
                const easingMap = {
                    "spring": "cubic-bezier(.34,1.56,.64,1)",
                    "bounce": "cubic-bezier(.68,-0.55,.265,1.55)",
                    "elastic": "cubic-bezier(.68,-0.6,.32,1.6)",
                    "jelly": "cubic-bezier(.68,-0.55,.265,1.55)",
                    "pop": "cubic-bezier(.68,-0.55,.265,1.55)",
                    "shake": "cubic-bezier(.36,.07,.19,.97)",
                    "fade": "cubic-bezier(.4,0,.2,1)",
                    "slide-up": "cubic-bezier(.25,1,.5,1)",
                    "slide-down": "cubic-bezier(.25,1,.5,1)",
                    "slide-left": "cubic-bezier(.25,1,.5,1)",
                    "slide-right": "cubic-bezier(.25,1,.5,1)",
                    "scale": "cubic-bezier(.34,1.56,.64,1)",
                    "blur": "cubic-bezier(.4,0,.2,1)",
                    "flip": "cubic-bezier(.68,-0.55,.265,1.55)",
                    "rotate": "cubic-bezier(.68,-0.55,.265,1.55)",
                    "pulse": "cubic-bezier(.4,0,.6,1)",
                    "zoom-in": "cubic-bezier(.34,1.56,.64,1)",
                    "zoom-out": "cubic-bezier(.34,1.56,.64,1)",
                    "slide-fade": "cubic-bezier(.25,1,.5,1)"
                };
                const easing = easingMap[style] || "cubic-bezier(.22,.68,0,1.2)";
                const durationMap = {
                    "spring": 800,
                    "bounce": 900,
                    "elastic": 1000,
                    "jelly": 850,
                    "pop": 700,
                    "shake": 600,
                    "fade": 500,
                    "slide-up": 600,
                    "slide-down": 600,
                    "slide-left": 600,
                    "slide-right": 600,
                    "scale": 700,
                    "blur": 500,
                    "flip": 800,
                    "rotate": 900,
                    "pulse": 800,
                    "zoom-in": 600,
                    "zoom-out": 600,
                    "slide-fade": 700
                };
                const duration = durationMap[style] || 600;
                previewBox.style.animation = `amb-${style} ${duration}ms ${easing} both`;
            };
            
            card.addEventListener('mouseenter', triggerCardPreview);
            previewBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                triggerCardPreview();
            });
            
            // Card click to show detail
            card.addEventListener('click', () => {
                previousSection = activeSection;
                showAnimDetail(style, label);
            });
            
            return card;
        };
        
        // Populate animation grids
        const allAnimGrid = homeSection.querySelector('#allAnimGrid');
        ANIM_STYLES.forEach(style => {
            if (style !== "none") {
                allAnimGrid.appendChild(createAnimStyleCard(style, ANIM_STYLE_LABELS[style], 'allAnimGrid'));
            }
        });
        
        // Populate other grids with relevant animations
        const messagesAnimGrid = messagesSection.querySelector('#messagesAnimGrid');
        ANIM_STYLES.slice(0, 10).forEach(style => {
            if (style !== "none") {
                messagesAnimGrid.appendChild(createAnimStyleCard(style, ANIM_STYLE_LABELS[style], 'messagesAnimGrid'));
            }
        });
        
        const modalsAnimGrid = modalsSection.querySelector('#modalsAnimGrid');
        ANIM_STYLES.slice(0, 12).forEach(style => {
            if (style !== "none") {
                modalsAnimGrid.appendChild(createAnimStyleCard(style, ANIM_STYLE_LABELS[style], 'modalsAnimGrid'));
            }
        });
        
        const tooltipsAnimGrid = tooltipsSection.querySelector('#tooltipsAnimGrid');
        ANIM_STYLES.slice(0, 8).forEach(style => {
            if (style !== "none") {
                tooltipsAnimGrid.appendChild(createAnimStyleCard(style, ANIM_STYLE_LABELS[style], 'tooltipsAnimGrid'));
            }
        });
        
        const menusAnimGrid = menusSection.querySelector('#menusAnimGrid');
        ANIM_STYLES.slice(0, 8).forEach(style => {
            if (style !== "none") {
                menusAnimGrid.appendChild(createAnimStyleCard(style, ANIM_STYLE_LABELS[style], 'menusAnimGrid'));
            }
        });

        // Settings Section Content
        const glassSliders = [
            {key:"blurStrength",   label:"Cam Bulanıklığı",         desc:"Profil kartının arkasındaki blur efekti. Daha yüksek değer daha fazla bulanıklık.",       min:0,  max:60, step:1},
            {key:"innerBlur",      label:"İç Katman Bulanıklığı",   desc:"Profil içindeki panellerin blur değeri. Daha düşük değer daha net görünür.", min:0,  max:30, step:1},
            {key:"panelAlpha",     label:"Arka Plan Saydamlığı",    desc:"Profil kartının arka plan saydamlığı. 0 = tam saydam, 1 = tam opak.",      min:0,  max:1,  step:0.01},
            {key:"glowOpacity",    label:"Glow Yoğunluğu",         desc:"Profil etrafındaki ambient ışık efektinin yoğunluğu.",    min:0,  max:1,  step:0.01},
            {key:"sheenOpacity",   label:"Parlaklık (Sheen)",       desc:"Profil üzerinde kayan parlaklık efektinin yoğunluğu.", min:0,  max:1,  step:0.01},
            {key:"edgeAlpha",      label:"Kenar Işığı",             desc:"Profil kartının kenar çerçevesinin parlaklığı.",       min:0,  max:1,  step:0.01},
            {key:"animationSpeed", label:"Glow Animasyon Hızı",    desc:"Glow efektinin animasyon hızı. 1x = varsayılan hız.",                min:0.1,max:3,  step:0.1},
        ];

        const mkPremiumSlider = (label, desc, min, max, step, val, onChange) => {
            const row = document.createElement("div"); row.className = "amb-setter-row";
            row.innerHTML = `
                <div class="amb-setter-top">
                    <span class="amb-setter-lbl">${label}</span>
                    <span class="amb-setter-val">${val}</span>
                </div>
                <div class="amb-setter-desc">${desc}</div>
                <input type="range" min="${min}" max="${max}" step="${step}" value="${val}">
            `;
            const input = row.querySelector('input[type="range"]');
            const indicator = row.querySelector('.amb-setter-val');
            input.addEventListener("input", () => {
                const v = parseFloat(input.value);
                indicator.textContent = step < 1 ? v.toFixed(2) : String(v);
                onChange(v);
            });
            return row;
        };

        settingsSection.innerHTML = `
            <h2 class="amb-section-title">Genel Ayarlar</h2>
            <p class="amb-section-desc">Cam efektleri, glow ve diğer görsel ayarları buradan yapılandırabilirsiniz.</p>
        `;
        
        for (const cfg of glassSliders) {
            settingsSection.appendChild(mkPremiumSlider(cfg.label, cfg.desc, cfg.min, cfg.max, cfg.step, s[cfg.key], (v) => {
                const cur = this.getSettings(); cur[cfg.key] = v; this.saveSettings(cur); this.applySettingsToCSS(cur);
            }));
        }

        // Sıfırlama Butonu
        const resetBtn = document.createElement("button");
        resetBtn.className = "amb-btn-reset"; resetBtn.textContent = "Varsayılana Sıfırla";
        resetBtn.addEventListener("click", () => {
            this.saveSettings(JSON.parse(JSON.stringify(DEFAULT_SETTINGS)));
            this.applySettingsToCSS(this.getSettings());
            this.toast("Eklenti ayarları fabrika ayarlarına döndürüldü.", "success");
            const parent = wrap.parentElement;
            if (parent) { wrap.remove(); parent.appendChild(this.getSettingsPanel()); }
        });
        settingsSection.appendChild(resetBtn);

        return document.createElement("div"); // Return empty div for BetterDiscord
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
        allStop: {
            BdApi.DOM.removeStyle("AmbientProfileCSS");
            BdApi.DOM.removeStyle("AmbientAnimCSS");
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
    }

    // ─── Animation system ────────────────────────────────────────────────────────

    injectAnimCSS(s) {
        const rules = [`
        @keyframes amb-fade        { from{opacity:0} to{opacity:1} }
        @keyframes amb-slide-up    { from{opacity:0;transform:translateY(24px)} to{opacity:1;transform:translateY(0)} }
        @keyframes amb-slide-down  { from{opacity:0;transform:translateY(-24px)} to{opacity:1;transform:translateY(0)} }
        @keyframes amb-slide-left  { from{opacity:0;transform:translateX(30px)} to{opacity:1;transform:translateX(0)} }
        @keyframes amb-slide-right { from{opacity:0;transform:translateX(-30px)} to{opacity:1;transform:translateX(0)} }
        @keyframes amb-scale       { from{opacity:0;transform:scale(0.85)} to{opacity:1;transform:scale(1)} }
        @keyframes amb-blur        { from{opacity:0;filter:blur(12px)} to{opacity:1;filter:blur(0)} }
        @keyframes amb-flip        { from{opacity:0;transform:perspective(600px) rotateX(12deg)} to{opacity:1;transform:perspective(600px) rotateX(0)} }
        @keyframes amb-spring      { 0%{opacity:0;transform:scale(0.75)} 50%{opacity:1;transform:scale(1.08)} 75%{transform:scale(0.98)} 100%{transform:scale(1)} }
        @keyframes amb-bounce      { 0%{opacity:0;transform:translateY(40px)} 25%{opacity:1;transform:translateY(-15px)} 50%{transform:translateY(8px)} 75%{transform:translateY(-4px)} 100%{transform:translateY(0)} }
        @keyframes amb-elastic     { 0%{opacity:0;transform:scale(0)} 25%{opacity:1;transform:scale(1.3)} 50%{transform:scale(0.8)} 75%{transform:scale(1.1)} 100%{transform:scale(1)} }
        @keyframes amb-rotate      { from{opacity:0;transform:rotate(-120deg) scale(0.5)} to{opacity:1;transform:rotate(0) scale(1)} }
        @keyframes amb-pulse       { 0%{opacity:0;transform:scale(0.9)} 50%{opacity:1;transform:scale(1.05)} 100%{opacity:1;transform:scale(1)} }
        @keyframes amb-shake       { 0%,100%{opacity:1;transform:translateX(0)} 12.5%,37.5%,62.5%,87.5%{transform:translateX(-5px)} 25%,50%,75%{transform:translateX(5px)} }
        @keyframes amb-jelly       { 0%{opacity:0;transform:scale(1,1)} 25%{transform:scale(1.3,0.7)} 37.5%{transform:scale(0.7,1.3)} 50%{transform:scale(1.2,0.8)} 62.5%{transform:scale(0.9,1.1)} 75%{transform:scale(1.05,0.95)} 100%{transform:scale(1,1)} }
        @keyframes amb-zoom-in     { from{opacity:0;transform:scale(0.2)} to{opacity:1;transform:scale(1)} }
        @keyframes amb-zoom-out    { from{opacity:0;transform:scale(1.8)} to{opacity:1;transform:scale(1)} }
        @keyframes amb-slide-fade  { from{opacity:0;transform:translateY(30px) scale(0.9)} to{opacity:1;transform:translateY(0) scale(1)} }
        @keyframes amb-pop         { 0%{opacity:0;transform:scale(0.4)} 50%{opacity:1;transform:scale(1.15)} 100%{transform:scale(1)} }
        `];

        for (const [areaKey, cfg] of Object.entries(s.anim)) {
            if (!cfg.enabled || cfg.style === "none") continue;
            const easingMap = {
                "spring": "cubic-bezier(.34,1.56,.64,1)",
                "bounce": "cubic-bezier(.68,-0.55,.265,1.55)",
                "elastic": "cubic-bezier(.68,-0.6,.32,1.6)",
                "jelly": "cubic-bezier(.68,-0.55,.265,1.55)",
                "pop": "cubic-bezier(.68,-0.55,.265,1.55)",
                "shake": "cubic-bezier(.36,.07,.19,.97)"
            };
            const easing = easingMap[cfg.style] || "cubic-bezier(.22,.68,0,1.2)";
            rules.push(`.ambient-anim-${areaKey}{animation:amb-${cfg.style} ${cfg.duration}ms ${easing} both;will-change:transform,opacity;}`);
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
            void el.offsetWidth;
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
        
        // Geliştirilmiş 'hideTyping' kuralı: Hem yazı alanlarını hem de profil avatarı üstündeki dot maskelerini uçurur.
        const typingCSS=s.hideTyping?`
            [class*="typing_"],[class*="typingDots_"],[class*="typingUsers_"]{display:none!important;visibility:hidden!important;opacity:0!important;pointer-events:none!important;}
            [class*="avatar-"] [class*="dots-"], [class*="member-"] [class*="dots-"], foreignObject[mask*="typing"], [class*="typingDots-"] { display: none !important; }
            mask[id*="typing"] foreignObject { mask: none !important; }
        `:"";

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
