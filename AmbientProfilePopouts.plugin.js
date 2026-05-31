/**
 * @name AmbientProfilePopouts
 * @author s7lace
 * @version 1.6.7
 * @description Adds adaptive ambient glow, profile tools, and per-area animation system to Discord with a premium live-preview settings dashboard. animasyon stilleri ve hızları için canlı önizleme sistemi içeren gelişmiş bir profil kartı eklentisi.
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
    'img[src*="i.scdn.co"]', 'img[src*="spotify"]',
    'svg foreignObject img', 'img[class*="avatar"]',
    '[class*="avatar_"] img', '[class*="banner_"] img', '[class*="profileBanner_"] img'
].join(",");

const LINK_SCOPE_SELECTORS = [
    '[id^="chat-messages-"]', '[class*="message_"]', '[class*="embed_"]'
].join(",");

const SUSPICIOUS_DOMAINS = new Set([
    "bit.ly", "tinyurl.com", "t.co", "goo.gl", "is.gd",
    "cutt.ly", "rb.gy", "shorturl.at", "grabify.link", "iplogger.org", "2no.co"
]);

// ─── Animation definitions ───────────────────────────────────────────────────

const ANIM_STYLES = [
    "none", "fade", "slide-up", "slide-down", "slide-left", "slide-right", "scale", "blur", "flip",
    "spring", "bounce", "elastic", "rotate", "pulse", "shake", "jelly", "zoom-in", "zoom-out",
    "slide-fade", "pop", "typewriter", "glitch", "morph", "wave", "reveal", "stagger", "swing", "ripple"
];

const ANIM_STYLE_LABELS = {
    none: "Kapalı", fade: "Fade (Soluklaşma)",
    "slide-up": "Slide Yukarı", "slide-down": "Slide Aşağı",
    "slide-left": "Slide Sol", "slide-right": "Slide Sağ",
    scale: "Scale / Zoom", blur: "Blur", flip: "Flip", spring: "Spring / Bounce",
    bounce: "Bounce", elastic: "Elastic", rotate: "Rotate", pulse: "Pulse",
    shake: "Shake", jelly: "Jelly", "zoom-in": "Zoom In", "zoom-out": "Zoom Out",
    "slide-fade": "Slide + Fade", pop: "Pop",
    typewriter: "Typewriter (Daktilo)", glitch: "Glitch (Bozulma)", morph: "Morph (Şekil)",
    wave: "Wave (Dalga)", reveal: "Reveal (Perde)", stagger: "Stagger (Basamaklı)",
    swing: "Swing (Sallanma)", ripple: "Ripple (Su Dalgası)"
};

const ANIM_AREAS = {
    messages: { label: "Mesaj Girişi", selector: '[id^="chat-messages-"] [class*="message_"]:not(.amb-done)' },
    channelSwitch: { label: "Kanal Değiştirme", selector: '[class*="chat_"],[class*="chatContent_"]' },
    serverSwitch: { label: "Sunucu Değiştirme", selector: '[class*="guilds_"],[class*="guildsList_"]' },
    sidebar: { label: "Sidebar", selector: '[class*="sidebar_"],[class*="panels_"]' },
    memberSidebar: { label: "Member Sidebar", selector: '[class*="membersWrap_"],[class*="members_"]' },
    modals: { label: "Modal & Popout", selector: '[class*="modal_"],[class*="layer_"],[class*="userPopoutOuter_"]' },
    emojiPicker: { label: "Emoji & Reaction Picker", selector: '[class*="emojiPicker_"],[class*="reactionPicker_"]' },
    toasts: { label: "Bildirim Toast\'ları", selector: '[class*="toast_"],[class*="toastItem_"],[class*="notice_"]' },
    contextMenu: { label: "Sağ Tık Menüsü", selector: '[class*="menu_"][role="menu"]' },
    channelList: { label: "Kanal Listesi", selector: '[class*="channel_"],[class*="containerDefault_"]' },
    memberList: { label: "Üye Listesi", selector: '[class*="member_"],[class*="memberInner_"]' },
    searchResults: { label: "Arama Sonuçları", selector: '[class*="searchResult_"],[class*="searchResultGroup_"]' },
    userProfile: { label: "Kullanıcı Profil Kartı", selector: '[class*="userProfileOuter_"],[class*="profileOuter_"]' },
    statusBar: { label: "Durum Çubuğu", selector: '[class*="panels_"] > [class*="container_"]' }
};

const LAYOUT_ANIM_AREAS = new Set([
    "channelSwitch", "serverSwitch", "sidebar", "memberSidebar",
    "channelList", "memberList", "searchResults", "userProfile", "statusBar"
]);

const DEFAULT_SETTINGS = {
    blurStrength: 8,
    panelAlpha: 0.22,
    glowOpacity: 0.82,
    innerBlur: 4,
    sheenOpacity: 0.62,
    edgeAlpha: 0.52,
    globalGlassSurfaces: false,
    glassSaturation: 120,
    glassDarkness: 0.34,
    animationSpeed: 1.5,
    motionQuality: "balanced",
    quickPreview: true,
    respectReducedMotion: true,
    layoutAnimationsEnabled: false,
    maxAnimatedChildren: 36,
    hideTypingIndicator: false,
    invisibleTyping: false,
    activePreset: "default",
    anim: {
        messages: { style: "fade", duration: 320, enabled: true, delay: 0, stagger: 0 },
        channelSwitch: { style: "fade", duration: 260, enabled: true, delay: 0, stagger: 0 },
        serverSwitch: { style: "fade", duration: 120, enabled: false, delay: 0, stagger: 0 },
        sidebar: { style: "fade", duration: 210, enabled: false, delay: 0, stagger: 0 },
        memberSidebar: { style: "fade", duration: 180, enabled: false, delay: 0, stagger: 0 },
        modals: { style: "fade", duration: 400, enabled: true, delay: 0, stagger: 0 },
        emojiPicker: { style: "fade", duration: 220, enabled: true, delay: 0, stagger: 0 },
        toasts: { style: "fade", duration: 300, enabled: true, delay: 0, stagger: 0 },
        contextMenu: { style: "fade", duration: 230, enabled: true, delay: 0, stagger: 0 },
        channelList: { style: "fade", duration: 250, enabled: false, delay: 0, stagger: 30 },
        memberList: { style: "fade", duration: 250, enabled: false, delay: 0, stagger: 30 },
        searchResults: { style: "slide-up", duration: 300, enabled: true, delay: 0, stagger: 50 },
        userProfile: { style: "zoom-in", duration: 400, enabled: true, delay: 0, stagger: 0 },
        statusBar: { style: "slide-up", duration: 200, enabled: true, delay: 0, stagger: 0 },
    }
};

const PRESETS = {
    default: {
        name: "Varsayılan",
        anim: DEFAULT_SETTINGS.anim
    },
    minimal: {
        name: "Minimal (Hızlı & Yumuşak)",
        anim: {
            messages: { style: "fade", duration: 200, enabled: true, delay: 0, stagger: 0 },
            channelSwitch: { style: "fade", duration: 150, enabled: true, delay: 0, stagger: 0 },
            serverSwitch: { style: "fade", duration: 150, enabled: true, delay: 0, stagger: 0 },
            sidebar: { style: "fade", duration: 200, enabled: true, delay: 0, stagger: 0 },
            memberSidebar: { style: "fade", duration: 200, enabled: true, delay: 0, stagger: 0 },
            modals: { style: "scale", duration: 200, enabled: true, delay: 0, stagger: 0 },
            emojiPicker: { style: "fade", duration: 150, enabled: true, delay: 0, stagger: 0 },
            toasts: { style: "fade", duration: 200, enabled: true, delay: 0, stagger: 0 },
            contextMenu: { style: "fade", duration: 150, enabled: true, delay: 0, stagger: 0 },
            channelList: { style: "fade", duration: 150, enabled: true, delay: 0, stagger: 10 },
            memberList: { style: "fade", duration: 150, enabled: true, delay: 0, stagger: 10 },
            searchResults: { style: "fade", duration: 150, enabled: true, delay: 0, stagger: 20 },
            userProfile: { style: "fade", duration: 200, enabled: true, delay: 0, stagger: 0 },
            statusBar: { style: "fade", duration: 150, enabled: true, delay: 0, stagger: 0 }
        }
    },
    bouncy: {
        name: "Bouncy (Yaylanan)",
        anim: {
            messages: { style: "bounce", duration: 450, enabled: true, delay: 0, stagger: 0 },
            channelSwitch: { style: "spring", duration: 400, enabled: true, delay: 0, stagger: 0 },
            serverSwitch: { style: "spring", duration: 400, enabled: true, delay: 0, stagger: 0 },
            sidebar: { style: "spring", duration: 450, enabled: true, delay: 0, stagger: 0 },
            memberSidebar: { style: "spring", duration: 450, enabled: true, delay: 0, stagger: 0 },
            modals: { style: "bounce", duration: 500, enabled: true, delay: 0, stagger: 0 },
            emojiPicker: { style: "bounce", duration: 350, enabled: true, delay: 0, stagger: 0 },
            toasts: { style: "spring", duration: 400, enabled: true, delay: 0, stagger: 0 },
            contextMenu: { style: "spring", duration: 300, enabled: true, delay: 0, stagger: 0 },
            channelList: { style: "spring", duration: 350, enabled: true, delay: 0, stagger: 40 },
            memberList: { style: "spring", duration: 350, enabled: true, delay: 0, stagger: 40 },
            searchResults: { style: "bounce", duration: 450, enabled: true, delay: 0, stagger: 60 },
            userProfile: { style: "spring", duration: 550, enabled: true, delay: 0, stagger: 0 },
            statusBar: { style: "spring", duration: 300, enabled: true, delay: 0, stagger: 0 }
        }
    },
    dramatic: {
        name: "Dramatik (Dikkat Çekici)",
        anim: {
            messages: { style: "slide-fade", duration: 500, enabled: true, delay: 0, stagger: 0 },
            channelSwitch: { style: "blur", duration: 450, enabled: true, delay: 0, stagger: 0 },
            serverSwitch: { style: "jelly", duration: 600, enabled: true, delay: 0, stagger: 0 },
            sidebar: { style: "slide-fade", duration: 500, enabled: true, delay: 0, stagger: 0 },
            memberSidebar: { style: "slide-fade", duration: 500, enabled: true, delay: 0, stagger: 0 },
            modals: { style: "pop", duration: 600, enabled: true, delay: 0, stagger: 0 },
            emojiPicker: { style: "pop", duration: 400, enabled: true, delay: 0, stagger: 0 },
            toasts: { style: "swing", duration: 500, enabled: true, delay: 0, stagger: 0 },
            contextMenu: { style: "flip", duration: 400, enabled: true, delay: 0, stagger: 0 },
            channelList: { style: "stagger", duration: 400, enabled: true, delay: 0, stagger: 50 },
            memberList: { style: "stagger", duration: 400, enabled: true, delay: 0, stagger: 50 },
            searchResults: { style: "slide-fade", duration: 500, enabled: true, delay: 0, stagger: 70 },
            userProfile: { style: "reveal", duration: 700, enabled: true, delay: 0, stagger: 0 },
            statusBar: { style: "slide-up", duration: 300, enabled: true, delay: 0, stagger: 0 }
        }
    }
};

module.exports = class AmbientProfilePopouts {

    // ─── Settings ────────────────────────────────────────────────────────────────

    getSettings() {
        const saved = BdApi.Data.load(PLUGIN_NAME, "settings") || {};
        const base = Object.assign({}, DEFAULT_SETTINGS, saved);
        base.anim = {};
        for (const k of Object.keys(DEFAULT_SETTINGS.anim))
            base.anim[k] = Object.assign({}, DEFAULT_SETTINGS.anim[k], saved.anim?.[k] || {});
        return base;
    }

    saveSettings(s) { BdApi.Data.save(PLUGIN_NAME, "settings", s); }

    getPreviewContent(type) {
        switch (type) {
            case 'messages':
            case 'messagesAnimGrid':
                return `
                    <div class="amb-animated-preview-item" style="background: #313338; border-radius: 8px; padding: 8px 12px; width: 80%; max-width: 200px; opacity: 0; display:flex; gap: 8px; align-items: center; box-shadow: 0 4px 12px rgba(0,0,0,0.15);">
                        <div style="width: 24px; height: 24px; background: #5865f2; border-radius: 50%; flex-shrink: 0;"></div>
                        <div style="flex: 1;">
                            <div style="height: 8px; background: #4e5058; border-radius: 4px; margin-bottom: 4px; width: 80%;"></div>
                            <div style="height: 8px; background: #4e5058; border-radius: 4px; width: 60%;"></div>
                        </div>
                    </div>
                `;
            case 'channelSwitch':
                return `
                    <div class="amb-animated-preview-item" style="background: #313338; border-radius: 8px; width: 100%; height: 100%; opacity: 0; display: flex; flex-direction: column; padding: 12px; gap: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15);">
                        <div style="height: 12px; background: #4e5058; border-radius: 4px; width: 40%;"></div>
                        <div style="height: 8px; background: #4e5058; border-radius: 4px; width: 80%;"></div>
                        <div style="height: 8px; background: #4e5058; border-radius: 4px; width: 60%;"></div>
                    </div>
                `;
            case 'serverSwitch':
                return `
                    <div style="display: flex; gap: 8px; align-items: center;">
                        <div class="amb-animated-preview-item" style="width: 32px; height: 32px; background: #5865f2; border-radius: 10px; opacity: 0;"></div>
                        <div class="amb-animated-preview-item" style="width: 32px; height: 32px; background: #313338; border-radius: 50%; opacity: 0;"></div>
                        <div class="amb-animated-preview-item" style="width: 32px; height: 32px; background: #313338; border-radius: 50%; opacity: 0;"></div>
                    </div>
                `;
            case 'sidebar':
                return `
                    <div style="display: flex; align-items: stretch; justify-content: flex-start; width: 100%; height: 100%;">
                        <div class="amb-animated-preview-item" style="width: 60px; height: 100%; background: #2b2d31; border-radius: 6px; opacity: 0; display: flex; flex-direction: column; gap: 6px; padding: 8px;">
                            <div style="height: 6px; background: #4e5058; border-radius: 3px; width: 80%;"></div>
                            <div style="height: 6px; background: #4e5058; border-radius: 3px; width: 60%;"></div>
                            <div style="height: 6px; background: #4e5058; border-radius: 3px; width: 90%;"></div>
                        </div>
                    </div>
                `;
            case 'memberSidebar':
                return `
                    <div style="display: flex; align-items: stretch; justify-content: flex-end; width: 100%; height: 100%;">
                        <div class="amb-animated-preview-item" style="width: 70px; height: 100%; background: #2b2d31; border-radius: 6px; opacity: 0; display: flex; flex-direction: column; gap: 8px; padding: 8px;">
                            <div style="display: flex; gap: 4px; align-items: center;">
                                <div style="width: 12px; height: 12px; background: #5865f2; border-radius: 50%; flex-shrink: 0;"></div>
                                <div style="height: 4px; background: #4e5058; border-radius: 2px; flex: 1;"></div>
                            </div>
                            <div style="display: flex; gap: 4px; align-items: center;">
                                <div style="width: 12px; height: 12px; background: #313338; border-radius: 50%; flex-shrink: 0;"></div>
                                <div style="height: 4px; background: #4e5058; border-radius: 2px; flex: 1;"></div>
                            </div>
                        </div>
                    </div>
                `;
            case 'modals':
            case 'modalsAnimGrid':
                return `
                    <div class="amb-animated-preview-item" style="width: 140px; height: 70px; background: #313338; border-radius: 8px; opacity: 0; display: flex; flex-direction: column; padding: 10px; gap: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.2);">
                        <div style="height: 8px; background: #dbdee1; border-radius: 4px; width: 50%;"></div>
                        <div style="height: 6px; background: #4e5058; border-radius: 3px; width: 100%;"></div>
                        <div style="height: 6px; background: #4e5058; border-radius: 3px; width: 80%;"></div>
                        <div style="margin-top: auto; display: flex; gap: 4px; justify-content: flex-end;">
                            <div style="width: 30px; height: 12px; background: #5865f2; border-radius: 2px;"></div>
                        </div>
                    </div>
                `;
            case 'emojiPicker':
                return `
                    <div class="amb-animated-preview-item" style="width: 120px; height: 80px; background: #2b2d31; border-radius: 8px; opacity: 0; padding: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.2); display: flex; flex-direction: column; gap: 6px;">
                        <div style="height: 12px; background: #1e1f22; border-radius: 4px; width: 100%;"></div>
                        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 4px; flex: 1;">
                            <div style="background: #eeb428; border-radius: 50%;"></div>
                            <div style="background: #eeb428; border-radius: 50%;"></div>
                            <div style="background: #eeb428; border-radius: 50%;"></div>
                            <div style="background: #eeb428; border-radius: 50%;"></div>
                        </div>
                    </div>
                `;
            case 'toasts':
            case 'tooltipsAnimGrid':
                return `
                    <div style="display: flex; align-items: flex-end; justify-content: flex-end; width: 100%; height: 100%;">
                        <div class="amb-animated-preview-item" style="width: 160px; height: 32px; background: #23a559; border-radius: 4px; opacity: 0; display: flex; align-items: center; padding: 0 8px; gap: 6px; box-shadow: 0 2px 8px rgba(0,0,0,0.2);">
                            <div style="width: 12px; height: 12px; background: #fff; border-radius: 50%; opacity: 0.8; flex-shrink: 0;"></div>
                            <div style="height: 6px; background: #fff; border-radius: 3px; width: 60%; opacity: 0.9;"></div>
                        </div>
                    </div>
                `;
            case 'contextMenu':
            case 'menusAnimGrid':
                return `
                    <div class="amb-animated-preview-item" style="width: 110px; background: #111214; border-radius: 4px; opacity: 0; padding: 6px; display: flex; flex-direction: column; gap: 4px; box-shadow: 0 4px 12px rgba(0,0,0,0.3);">
                        <div style="height: 12px; background: #5865f2; border-radius: 2px; width: 100%;"></div>
                        <div style="height: 12px; background: #2b2d31; border-radius: 2px; width: 100%;"></div>
                        <div style="height: 1px; background: #1e1f22; width: 100%; margin: 2px 0;"></div>
                        <div style="height: 12px; background: #2b2d31; border-radius: 2px; width: 100%;"></div>
                    </div>
                `;
            case 'channelList':
                return `
                    <div style="display: flex; flex-direction: column; gap: 4px; width: 100%;">
                        <div class="amb-animated-preview-item" style="height: 16px; background: #2b2d31; border-radius: 4px; width: 70%; opacity: 0; display: flex; align-items: center; padding: 0 6px; gap: 6px;">
                            <div style="width: 8px; height: 8px; background: #80848e; border-radius: 50%; flex-shrink: 0;"></div>
                            <div style="height: 4px; background: #80848e; border-radius: 2px; width: 60%;"></div>
                        </div>
                        <div class="amb-animated-preview-item" style="height: 16px; background: #2b2d31; border-radius: 4px; width: 85%; opacity: 0; display: flex; align-items: center; padding: 0 6px; gap: 6px;">
                            <div style="width: 8px; height: 8px; background: #80848e; border-radius: 50%; flex-shrink: 0;"></div>
                            <div style="height: 4px; background: #80848e; border-radius: 2px; width: 50%;"></div>
                        </div>
                        <div class="amb-animated-preview-item" style="height: 16px; background: #2b2d31; border-radius: 4px; width: 60%; opacity: 0; display: flex; align-items: center; padding: 0 6px; gap: 6px;">
                            <div style="width: 8px; height: 8px; background: #80848e; border-radius: 50%; flex-shrink: 0;"></div>
                            <div style="height: 4px; background: #80848e; border-radius: 2px; width: 70%;"></div>
                        </div>
                    </div>
                `;
            case 'memberList':
                return `
                    <div style="display: flex; flex-direction: column; gap: 4px; align-items: flex-end; width: 100%;">
                        <div class="amb-animated-preview-item" style="height: 24px; background: #2b2d31; border-radius: 12px; width: 80%; opacity: 0; display: flex; align-items: center; padding: 0 6px; gap: 6px;">
                            <div style="width: 14px; height: 14px; background: #5865f2; border-radius: 50%; flex-shrink: 0;"></div>
                            <div style="height: 6px; background: #dbdee1; border-radius: 3px; width: 50%;"></div>
                        </div>
                        <div class="amb-animated-preview-item" style="height: 24px; background: #2b2d31; border-radius: 12px; width: 90%; opacity: 0; display: flex; align-items: center; padding: 0 6px; gap: 6px;">
                            <div style="width: 14px; height: 14px; background: #f23f43; border-radius: 50%; flex-shrink: 0;"></div>
                            <div style="height: 6px; background: #dbdee1; border-radius: 3px; width: 60%;"></div>
                        </div>
                    </div>
                `;
            case 'searchResults':
                return `
                    <div style="display: flex; flex-direction: column; gap: 6px; width: 100%; height: 100%; overflow: hidden;">
                        <div class="amb-animated-preview-item" style="background: #2b2d31; border-radius: 4px; padding: 6px; opacity: 0; border-left: 2px solid #5865f2;">
                            <div style="height: 4px; background: #949ba4; border-radius: 2px; width: 40%; margin-bottom: 4px;"></div>
                            <div style="height: 6px; background: #dbdee1; border-radius: 3px; width: 80%;"></div>
                        </div>
                        <div class="amb-animated-preview-item" style="background: #2b2d31; border-radius: 4px; padding: 6px; opacity: 0; border-left: 2px solid #5865f2;">
                            <div style="height: 4px; background: #949ba4; border-radius: 2px; width: 30%; margin-bottom: 4px;"></div>
                            <div style="height: 6px; background: #dbdee1; border-radius: 3px; width: 90%;"></div>
                        </div>
                    </div>
                `;
            case 'statusBar':
                return `
                    <div style="display: flex; align-items: flex-end; justify-content: center; width: 100%; height: 100%;">
                        <div class="amb-animated-preview-item" style="width: 100%; height: 20px; background: #232428; border-radius: 4px; opacity: 0; display: flex; align-items: center; padding: 0 8px; justify-content: space-between;">
                            <div style="display: flex; gap: 6px; align-items: center;">
                                <div style="width: 12px; height: 12px; background: #5865f2; border-radius: 50%;"></div>
                                <div style="height: 6px; background: #dbdee1; border-radius: 3px; width: 40px;"></div>
                            </div>
                            <div style="display: flex; gap: 4px;">
                                <div style="width: 10px; height: 10px; background: #4e5058; border-radius: 50%;"></div>
                                <div style="width: 10px; height: 10px; background: #4e5058; border-radius: 50%;"></div>
                            </div>
                        </div>
                    </div>
                `;
            case 'userProfile':
            case 'allAnimGrid':
            default:
                return `
                    <div class="amb-animated-preview-item" style="width: 120px; height: 80px; background: #232428; border-radius: 8px; opacity: 0; position: relative; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.3);">
                        <div style="height: 28px; background: #5865f2;"></div>
                        <div style="position: absolute; top: 12px; left: 8px; width: 24px; height: 24px; background: #111214; border-radius: 50%; border: 2px solid #232428;"></div>
                        <div style="padding: 14px 8px 6px; display: flex; flex-direction: column; gap: 4px;">
                            <div style="height: 6px; background: #dbdee1; border-radius: 3px; width: 60%;"></div>
                            <div style="height: 4px; background: #4e5058; border-radius: 2px; width: 80%;"></div>
                            <div style="height: 4px; background: #4e5058; border-radius: 2px; width: 70%;"></div>
                        </div>
                    </div>
                `;
        }
    }

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
            width: min(1480px, 96vw);
            height: min(920px, 94vh);
            min-width: 0;
            min-height: 0;
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

            .amb-modal-container {
                box-shadow: 0 24px 80px rgba(0,0,0,.55), 0 0 0 1px rgba(255,255,255,.06);
            }
            .amb-modal-btn:disabled,
            .amb-toggle-btn:disabled,
            .amb-style-btn:disabled {
                opacity: .55;
                cursor: not-allowed;
                transform: none !important;
            }
            
            /* Sidebar */
            .amb-sidebar {
                width: clamp(220px, 22vw, 320px);
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
                padding: 12px 16px; border-radius: 8px; cursor: pointer;
                font-size: 14px; font-weight: 600; color: #b5bac1;
                transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1); display: flex; align-items: center; gap: 12px;
                margin-bottom: 4px;
            }
            .amb-sidebar-item:hover { 
                background: linear-gradient(135deg, #3f4147 0%, #36373c 100%); 
                color: #dbdee1;
                transform: translateX(4px);
            }
            .amb-sidebar-item.active { 
                background: linear-gradient(135deg, #5865f2 0%, #4752c4 100%); 
                color: #fff;
                box-shadow: 0 4px 12px rgba(88, 101, 242, 0.3);
            }
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
                font-size: 24px; font-weight: 700; color: #fff; margin-bottom: 8px;
                text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
            }
            .amb-section-desc { 
                font-size: 14px; color: #b5bac1; margin-bottom: 24px; line-height: 1.5;
                padding: 12px 16px;
                background: linear-gradient(135deg, #2b2d31 0%, #232428 100%);
                border-radius: 8px;
                border: 1px solid #1f2023;
            }
            
            /* Animation Grid */
            .amb-anim-grid {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
                gap: 20px;
                margin-top: 20px;
            }
            
            /* Animation Style Cards */
            .amb-style-card {
                background: linear-gradient(135deg, #2b2d31 0%, #232428 100%); 
                border: 1px solid #1f2023; border-radius: 8px; 
                padding: 20px; display: flex; flex-direction: column; gap: 12px; 
                transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1); cursor: pointer;
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
                min-width: 0;
            }
            .amb-style-card:hover { 
                border-color: #5865f2; 
                transform: translateY(-2px);
                box-shadow: 0 4px 16px rgba(88, 101, 242, 0.2);
            }
            .amb-style-card.selected { 
                border-color: #5865f2; 
                background: linear-gradient(135deg, #3f4147 0%, #36373c 100%);
                box-shadow: 0 0 0 2px rgba(88, 101, 242, 0.3), 0 4px 16px rgba(88, 101, 242, 0.2);
            }
            
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
                background: radial-gradient(circle at 50% 50%, rgba(88,101,242,0.15) 0%, transparent 70%);
                pointer-events: none;
            }
            .amb-style-preview-box {
                width: 50px; height: 35px; background: linear-gradient(135deg, #5865f2 0%, #7289da 100%); 
                border-radius: 8px; opacity: 0;
                box-shadow: 0 4px 20px rgba(88,101,242,0.4);
            }
            .amb-preview-toolbar {
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 12px;
                margin: 0 0 18px;
                padding: 12px;
                background: #232428;
                border: 1px solid #1f2023;
                border-radius: 8px;
            }
            .amb-preview-toolbar-title {
                font-size: 13px;
                font-weight: 700;
                color: #dbdee1;
            }
            .amb-preview-toolbar-sub {
                margin-top: 3px;
                font-size: 12px;
                color: #949ba4;
            }
            .amb-segmented {
                display: flex;
                gap: 4px;
                padding: 4px;
                background: #1e1f22;
                border: 1px solid #111214;
                border-radius: 8px;
            }
            .amb-segmented button {
                border: 0;
                border-radius: 6px;
                padding: 7px 10px;
                color: #b5bac1;
                background: transparent;
                font-size: 12px;
                font-weight: 700;
                cursor: pointer;
            }
            .amb-segmented button.active {
                color: #fff;
                background: #5865f2;
            }
            
            .amb-style-name { font-size: 14px; font-weight: 600; color: #dbdee1; text-align: center; }
            .amb-style-desc { font-size: 12px; color: #949ba4; text-align: center; margin-top: 4px; line-height: 1.3; }
            .amb-active-badges { display: flex; flex-wrap: wrap; gap: 6px; justify-content: center; margin-top: 8px; }
            .amb-badge { font-size: 10px; font-weight: 600; color: #fff; background: linear-gradient(135deg, #5865f2 0%, #4752c4 100%); padding: 2px 8px; border-radius: 10px; text-transform: uppercase; letter-spacing: 0.5px; }
            .amb-style-actions { display: flex; gap: 8px; justify-content: center; margin-top: 4px; }
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
                background: linear-gradient(135deg, #2b2d31 0%, #232428 100%); 
                padding: 20px; border-radius: 12px; border: 1px solid #1f2023;
                margin-bottom: 12px;
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
                transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
            }
            .amb-setter-row:hover {
                border-color: #3f4147;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            }
            .amb-setter-top { display: flex; justify-content: space-between; align-items: center; }
            .amb-setter-lbl { font-size: 14px; font-weight: 600; color: #dbdee1; }
            .amb-setter-val { font-size: 14px; font-weight: 600; color: #5865f2; background: #5865f220; padding: 2px 8px; border-radius: 4px; }
            .amb-setter-desc { font-size: 13px; color: #949ba4; line-height: 1.4; }
            
            /* Modal Buttons (reused for detail section) */
            .amb-modal-btn {
                padding: 12px 20px; border: 0; border-radius: 8px;
                font-size: 14px; font-weight: 600; cursor: pointer;
                transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
            }
            .amb-modal-btn-primary {
                background: linear-gradient(135deg, #5865f2 0%, #4752c4 100%);
                color: #fff;
            }
            .amb-modal-btn-primary:hover { 
                background: linear-gradient(135deg, #4752c4 0%, #3c45a0 100%);
                transform: translateY(-1px);
                box-shadow: 0 4px 12px rgba(88, 101, 242, 0.3);
            }
            .amb-modal-btn-secondary {
                background: linear-gradient(135deg, #4e5058 0%, #3f4147 100%);
                color: #dbdee1;
            }
            .amb-modal-btn-secondary:hover { 
                background: linear-gradient(135deg, #6d6f78 0%, #5f6166 100%);
                transform: translateY(-1px);
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            }
            
            .amb-settings-panel input[type="range"] {
                width: 100%; height: 8px; -webkit-appearance: none; 
                background: linear-gradient(90deg, #4e5058 0%, #5865f2 100%); 
                border-radius: 4px; outline: none; margin-top: 8px; cursor: pointer;
                box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.2);
            }
            .amb-settings-panel input[type="range"]::-webkit-slider-thumb {
                -webkit-appearance: none; width: 20px; height: 20px; border-radius: 50%; 
                background: linear-gradient(135deg, #5865f2, #7289da); 
                cursor: pointer; transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1); 
                box-shadow: 0 2px 8px rgba(88, 101, 242, 0.4), 0 0 0 3px rgba(88, 101, 242, 0.1);
            }
            .amb-settings-panel input[type="range"]::-webkit-slider-thumb:hover { 
                transform: scale(1.15);
                box-shadow: 0 4px 12px rgba(88, 101, 242, 0.5), 0 0 0 4px rgba(88, 101, 242, 0.2);
            }
            
            .amb-toggle-row { 
                display: flex; justify-content: space-between; align-items: center; 
                background: linear-gradient(135deg, #2b2d31 0%, #232428 100%); 
                padding: 16px; border-radius: 12px; border: 1px solid #1f2023;
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
            }
            .amb-toggle-btn {
                width: 48px; height: 26px; border: 0; border-radius: 13px; cursor: pointer; position: relative; 
                transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1); background: #4e5058;
                box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.2);
            }
            .amb-toggle-dot {
                position: absolute; top: 3px; left: 3px; width: 20px; height: 20px; border-radius: 50%; 
                background: #fff; transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1); 
                box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
            }
            
            .amb-select-el {
                background: #1e1f22; 
                border: 1px solid #1f2023; border-radius: 4px; 
                color: #dbdee1; padding: 8px 12px; font-size: 14px; font-weight: 500; 
                cursor: pointer; outline: none; width: 100%;
            }
            .amb-select-el:hover { border-color: #5865f2; }
            .amb-select-el option { background: #1e1f22; color: #dbdee1; }
            .amb-style-select {
                background: linear-gradient(135deg, #2b2d31 0%, #232428 100%);
                border: 1px solid #1f2023;
                border-radius: 8px;
                color: #dbdee1;
                padding: 10px 14px;
                font-size: 13px;
                font-weight: 600;
                cursor: pointer;
                outline: none;
                width: 100%;
                transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
            }
            .amb-style-select:hover {
                border-color: #5865f2;
                box-shadow: 0 4px 12px rgba(88, 101, 242, 0.2);
            }
            .amb-style-select option {
                background: #1e1f22;
                color: #dbdee1;
                padding: 8px;
            }
            .amb-style-bar {
                display: flex;
                flex-wrap: wrap;
                gap: 6px;
                padding: 8px;
                background: linear-gradient(135deg, #2b2d31 0%, #232428 100%);
                border: 1px solid #1f2023;
                border-radius: 8px;
                overflow-x: auto;
                overflow-y: hidden;
                max-height: 80px;
            }
            .amb-style-bar::-webkit-scrollbar { width: 6px; height: 6px; }
            .amb-style-bar::-webkit-scrollbar-track { background: #2b2d31; }
            .amb-style-bar::-webkit-scrollbar-thumb { background: #1a1b1e; border-radius: 3px; }
            .amb-style-item {
                flex-shrink: 0;
                padding: 6px 12px;
                border-radius: 6px;
                background: #3f4147;
                color: #b5bac1;
                font-size: 11px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
                border: 1px solid transparent;
                white-space: nowrap;
            }
            .amb-style-item:hover {
                background: #4f545c;
                color: #dbdee1;
                transform: translateY(-1px);
                border-color: #5865f2;
            }
            .amb-style-item.active {
                background: linear-gradient(135deg, #5865f2 0%, #4752c4 100%);
                color: #fff;
                border-color: #5865f2;
                box-shadow: 0 2px 8px rgba(88, 101, 242, 0.3);
            }
            
            .amb-btn-reset {
                padding: 10px 16px; border: 1px solid #ed4245; border-radius: 4px; 
                background: transparent; 
                color: #ed4245; font-size: 14px; font-weight: 500; cursor: pointer; 
                transition: all 0.15s ease; margin-top: 16px;
            }
            .amb-btn-reset:hover { 
                background: #ed4245; color: #fff;
            }
            @media (max-width: 980px) {
                .amb-settings-panel { flex-direction: column; }
                .amb-sidebar {
                    width: auto;
                    max-height: 160px;
                    border-right: 0;
                    border-bottom: 1px solid #1f2023;
                    flex-direction: row;
                    flex-wrap: wrap;
                }
                .amb-sidebar-item { padding: 9px 12px; }
                .amb-main-content { padding: 20px; }
                .amb-anim-grid { grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); }
                .amb-preview-toolbar { align-items: stretch; flex-direction: column; }
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
                // Reset scroll position
                mainContent.scrollTop = 0;
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
            <div class="amb-preview-toolbar">
                <div>
                    <div class="amb-preview-toolbar-title">Canli onizleme</div>
                    <div class="amb-preview-toolbar-sub">Kartlarin uzerine gelince animasyon otomatik oynar; kalite modu Discord icindeki animasyon yogunlugunu belirler.</div>
                </div>
                <div class="amb-segmented" id="motionQualityPicker">
                    <button type="button" data-quality="performance">Performans</button>
                    <button type="button" data-quality="balanced">Dengeli</button>
                    <button type="button" data-quality="cinematic">Sinematik</button>
                </div>
            </div>

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

            Object.assign(areaLabels, {
                channelList: "Kanal & DM Listesi",
                memberList: "Uye Listesi",
                searchResults: "Arama Sonuclari",
                userProfile: "Profil Kartlari",
                statusBar: "Alt Kullanici Paneli"
            });
            Object.assign(areaDescriptions, {
                channelList: "Kanal listesi ve DM satirlari. Cok hareketli hissettirebildigi icin layout toggle kapaliyken calismaz.",
                memberList: "Sag uye listesi satirlari. Layout toggle kapaliyken calismaz.",
                searchResults: "Arama sonuclari ve gruplari. Layout toggle kapaliyken calismaz.",
                userProfile: "Profil kartlari. Layout toggle kapaliyken calismaz.",
                statusBar: "Sol alttaki kullanici paneli. Layout toggle kapaliyken calismaz."
            });

            // Create settings for each area
            for (const [areaKey, areaLabel] of Object.entries(areaLabels)) {
                if (cur.anim[areaKey]) {
                    const areaSettings = document.createElement('div');
                    areaSettings.className = 'amb-setter-row';
                    const currentDuration = cur.anim[areaKey].duration || 300;
                    const isApplied = cur.anim[areaKey].style === style;
                    const isEnabled = cur.anim[areaKey].enabled !== false;
                    const isLayoutArea = LAYOUT_ANIM_AREAS.has(areaKey);
                    const isLayoutBlocked = isLayoutArea && !cur.layoutAnimationsEnabled;

                    // Area-specific preview design
                    const getAreaPreviewHTML = (area) => {
                        return `
                            <div class="amb-style-preview" style="height: 100px; margin: 8px 0; background: #1e1f22; border-radius: 8px; padding: 12px; display: flex; align-items: center; justify-content: center;">
                                ${this.getPreviewContent(area)}
                            </div>
                        `;
                    };

                    const currentDelay = cur.anim[areaKey].delay || 0;
                    const currentStagger = cur.anim[areaKey].stagger || 0;

                    const currentStyle = cur.anim[areaKey].style || 'none';
                    const currentStyleLabel = currentStyle === 'none' ? 'Kapalı' : (ANIM_STYLE_LABELS[currentStyle] || currentStyle);
                    
                    areaSettings.innerHTML = `
                        <div class="amb-setter-top">
                            <span class="amb-setter-lbl">${areaLabel}</span>
                            <div style="display: flex; align-items: center; gap: 12px;">
                                <span class="amb-style-badge" style="font-size: 11px; font-weight: 600; color: #fff; background: linear-gradient(135deg, #5865f2 0%, #4752c4 100%); padding: 3px 10px; border-radius: 12px; text-transform: uppercase; letter-spacing: 0.5px;">${currentStyleLabel}</span>
                                <button class="amb-toggle-btn area-toggle-btn" data-area="${areaKey}" style="width: 40px; height: 20px; border: 0; border-radius: 10px; cursor: pointer; position: relative; transition: all 0.2s ease; background: ${isEnabled ? '#5865f2' : '#4e5058'};">
                                    <span class="amb-toggle-dot" style="position: absolute; top: 2px; left: ${isEnabled ? '20px' : '2px'}; width: 16px; height: 16px; border-radius: 50%; background: #fff; transition: all 0.2s ease; box-shadow: 0 2px 4px rgba(0,0,0,0.2);"></span>
                                </button>
                            </div>
                        </div>
                        <div class="amb-setter-desc">${areaDescriptions[areaKey] || ''}</div>
                        <div class="amb-setter-subdesc" id="desc-${areaKey}" style="font-size: 12px; color: ${isLayoutBlocked ? '#ffd166' : '#949ba4'}; margin-top: 4px;">${isLayoutBlocked ? 'Layout animasyonlari kapali oldugu icin bu alan Discord icinde oynatilmaz. Ayarlar > Genis Layout Animasyonlari ile acabilirsin.' : (isEnabled ? (isApplied ? 'Bu animasyon su an bu alana uygulanmis.' : 'Onizleyebilir veya bu stili alana uygulayabilirsin.') : 'Bu animasyon kapali. Toggle butonuna basarak acin.')}</div>
                        
                        <div style="margin-top: 12px;">
                            <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
                                <span style="font-size:12px; font-weight:600; color:#b5bac1;">Animasyon Stili</span>
                            </div>
                            <div class="amb-style-bar" data-area="${areaKey}" ${!isEnabled ? 'style="opacity:0.5; pointer-events:none;"' : ''}>
                                ${ANIM_STYLES.map(s => `<div class="amb-style-item ${currentStyle === s ? 'active' : ''}" data-style="${s}" title="${ANIM_STYLE_LABELS[s] || s}">${ANIM_STYLE_LABELS[s] || s}</div>`).join('')}
                            </div>
                        </div>
                        
                        ${getAreaPreviewHTML(areaKey)}
                        
                        <div style="margin-top: 16px;">
                            <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
                                <span style="font-size:12px; font-weight:600; color:#b5bac1;">Süre (Duration)</span>
                                <span style="font-size:12px; font-weight:600; color:#b5bac1;" id="dur-val-${areaKey}">${currentDuration}ms</span>
                            </div>
                            <input type="range" min="80" max="1500" step="10" value="${currentDuration}" class="area-speed-slider" data-area="${areaKey}" ${!isEnabled ? 'disabled' : ''}>
                        </div>
                        
                        <div style="margin-top: 12px;">
                            <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
                                <span style="font-size:12px; font-weight:600; color:#b5bac1;">Gecikme (Delay)</span>
                                <span style="font-size:12px; font-weight:600; color:#b5bac1;" id="del-val-${areaKey}">${currentDelay}ms</span>
                            </div>
                            <input type="range" min="0" max="1000" step="10" value="${currentDelay}" class="area-delay-slider" data-area="${areaKey}" ${!isEnabled ? 'disabled' : ''}>
                        </div>
                        
                        <div style="margin-top: 12px; ${['messages', 'channelList', 'memberList', 'searchResults'].includes(areaKey) ? '' : 'display:none;'}">
                            <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
                                <span style="font-size:12px; font-weight:600; color:#b5bac1;">Basamaklı Gecikme (Stagger)</span>
                                <span style="font-size:12px; font-weight:600; color:#b5bac1;" id="stag-val-${areaKey}">${currentStagger}ms</span>
                            </div>
                            <input type="range" min="0" max="200" step="5" value="${currentStagger}" class="area-stagger-slider" data-area="${areaKey}" ${!isEnabled ? 'disabled' : ''}>
                        </div>

                        <div style="display: flex; gap: 8px; margin-top: 16px;">
                            <button class="amb-modal-btn amb-modal-btn-primary apply-anim-btn" data-area="${areaKey}" style="flex: 1;" ${!isEnabled ? 'disabled' : ''}>${isApplied ? 'Bu stil aktif' : 'Bu stili uygula'}</button>
                            <button class="amb-modal-btn amb-modal-btn-secondary preview-area-btn" data-area="${areaKey}" style="flex: 1;" ${!isEnabled ? 'disabled' : ''}>Önizle</button>
                        </div>
                    `;
                    animDetailSettings.appendChild(areaSettings);
                }
            }

            // Add event listeners
            animDetailSettings.querySelectorAll('.area-toggle-btn').forEach(toggleBtn => {
                toggleBtn.addEventListener('click', (e) => {
                    const areaKey = e.currentTarget.dataset.area;
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
                    const delaySlider = animDetailSettings.querySelector(`.area-delay-slider[data-area="${areaKey}"]`);
                    const staggerSlider = animDetailSettings.querySelector(`.area-stagger-slider[data-area="${areaKey}"]`);
                    const applyBtn = animDetailSettings.querySelector(`.apply-anim-btn[data-area="${areaKey}"]`);
                    const previewBtn = animDetailSettings.querySelector(`.preview-area-btn[data-area="${areaKey}"]`);
                    const subdesc = animDetailSettings.querySelector(`#desc-${areaKey}`);
                    const styleBar = animDetailSettings.querySelector(`.amb-style-bar[data-area="${areaKey}"]`);

                    const st = cur.anim[areaKey].enabled;
                    slider.disabled = !st;
                    if (delaySlider) delaySlider.disabled = !st;
                    if (staggerSlider) staggerSlider.disabled = !st;
                    applyBtn.disabled = !st;
                    previewBtn.disabled = !st;
                    if (styleBar) {
                        styleBar.style.opacity = st ? '1' : '0.5';
                        styleBar.style.pointerEvents = st ? 'auto' : 'none';
                    }

                    if (st) {
                        subdesc.textContent = cur.anim[areaKey].style === style ? 'Bu animasyon şu an bu alana uygulanmış.' : 'Hız ayarlayın ve uygula butonuna basın.';
                    } else {
                        subdesc.textContent = 'Bu animasyon kapalı. Toggle butonuna basarak açın.';
                    }

                    this.toast(`${areaLabel} animasyonu ${st ? 'açık' : 'kapalı'}.`, "success");
                });
            });

            // Style bar event listeners
            animDetailSettings.querySelectorAll('.amb-style-bar').forEach(bar => {
                bar.querySelectorAll('.amb-style-item').forEach(item => {
                    item.addEventListener('click', (e) => {
                        const areaKey = bar.dataset.area;
                        const newStyle = e.target.dataset.style;
                        const cur = this.getSettings();
                        cur.anim[areaKey].style = newStyle;
                        this.saveSettings(cur);
                        this.applySettingsToCSS(cur);
                        
                        // Update active state
                        bar.querySelectorAll('.amb-style-item').forEach(i => i.classList.remove('active'));
                        e.target.classList.add('active');
                        
                        // Update badge
                        const badge = bar.parentElement.parentElement.querySelector('.amb-style-badge');
                        if (badge) {
                            const newStyleLabel = newStyle === 'none' ? 'Kapalı' : (ANIM_STYLE_LABELS[newStyle] || newStyle);
                            badge.textContent = newStyleLabel;
                        }
                        
                        // Update description
                        const subdesc = animDetailSettings.querySelector(`#desc-${areaKey}`);
                        if (subdesc) {
                            subdesc.textContent = 'Hız ayarlayın ve uygula butonuna basın.';
                        }
                        
                        this.toast(`Animasyon stili değiştirildi: ${ANIM_STYLE_LABELS[newStyle] || newStyle}`, "success");
                    });
                });
            });

            animDetailSettings.querySelectorAll('.area-speed-slider').forEach(slider => {
                slider.addEventListener('input', (e) => {
                    const valSpan = animDetailSettings.querySelector(`#dur-val-${e.target.dataset.area}`);
                    if (valSpan) valSpan.textContent = `${e.target.value}ms`;
                });
            });
            animDetailSettings.querySelectorAll('.area-delay-slider').forEach(slider => {
                slider.addEventListener('input', (e) => {
                    const valSpan = animDetailSettings.querySelector(`#del-val-${e.target.dataset.area}`);
                    if (valSpan) valSpan.textContent = `${e.target.value}ms`;
                });
            });
            animDetailSettings.querySelectorAll('.area-stagger-slider').forEach(slider => {
                slider.addEventListener('input', (e) => {
                    const valSpan = animDetailSettings.querySelector(`#stag-val-${e.target.dataset.area}`);
                    if (valSpan) valSpan.textContent = `${e.target.value}ms`;
                });
            });

            animDetailSettings.querySelectorAll('.apply-anim-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const areaKey = e.currentTarget.dataset.area;
                    const slider = animDetailSettings.querySelector(`.area-speed-slider[data-area="${areaKey}"]`);
                    const delaySlider = animDetailSettings.querySelector(`.area-delay-slider[data-area="${areaKey}"]`);
                    const staggerSlider = animDetailSettings.querySelector(`.area-stagger-slider[data-area="${areaKey}"]`);

                    const duration = parseInt(slider.value);
                    const delay = delaySlider ? parseInt(delaySlider.value) : 0;
                    const stagger = staggerSlider ? parseInt(staggerSlider.value) : 0;

                    const cur = this.getSettings();
                    cur.anim[areaKey].style = style;
                    cur.anim[areaKey].duration = duration;
                    cur.anim[areaKey].delay = delay;
                    cur.anim[areaKey].stagger = stagger;

                    this.saveSettings(cur);
                    this.applySettingsToCSS(cur);

                    e.currentTarget.textContent = 'Bu stil aktif';
                    e.currentTarget.style.background = 'linear-gradient(135deg, #3ba55c, #2d7d46)';

                    const valSpan = animDetailSettings.querySelector(`#val-${areaKey}`);
                    if (valSpan) valSpan.textContent = `${duration}ms ✓`;

                    const desc = animDetailSettings.querySelector(`#desc-${areaKey}`);
                    if (desc) desc.textContent = 'Bu animasyon şu an bu alana uygulanmış.';

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
                    const previewElements = e.target.parentElement.parentElement.querySelectorAll('.amb-animated-preview-item');

                    if (style === "none") {
                        previewElements.forEach(el => el.style.opacity = "0");
                        return;
                    }
                    this.playPreviewElements(previewElements, style, duration, areaKey, 50);
                });
            });

            // Hide all sections and show detail
            document.querySelectorAll('.amb-content-section').forEach(el => el.classList.remove('active'));
            animDetailSection.classList.add('active');
            // Reset scroll position
            mainContent.scrollTop = 0;
        };

        backToGridBtn.addEventListener('click', () => {
            document.querySelectorAll('.amb-content-section').forEach(el => el.classList.remove('active'));
            document.querySelector(`.amb-section-${previousSection}`).classList.add('active');
            currentDetailStyle = null;
            // Reset scroll position
            mainContent.scrollTop = 0;
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
                "pop": "Patlayarak görünür",
                "typewriter": "Yazı yazıyormuş gibi belirir",
                "glitch": "Sayısal bozulma (glitch) efekti ile gelir",
                "morph": "Şekil değiştirerek gelir",
                "wave": "Dalgalanarak gelir",
                "reveal": "Perde açılır gibi gelir",
                "stagger": "Basamaklı (stagger) efekt ile gelir",
                "swing": "Sarkaç gibi sallanarak gelir",
                "ripple": "Su dalgası (ripple) efekti ile gelir"
            };

            const card = document.createElement("div");
            card.className = "amb-style-card";
            
            // Get current settings to show which areas use this animation
            const cur = this.getSettings();
            const activeAreas = [];
            for (const [areaKey, areaCfg] of Object.entries(cur.anim)) {
                if (areaCfg.style === style && areaCfg.enabled && (!LAYOUT_ANIM_AREAS.has(areaKey) || cur.layoutAnimationsEnabled)) {
                    activeAreas.push(areaKey);
                }
            }
            
            const areaLabels = {
                messages: "Mesaj",
                channelSwitch: "Kanal",
                serverSwitch: "Sunucu",
                sidebar: "Sidebar",
                memberSidebar: "Member",
                modals: "Modal",
                emojiPicker: "Emoji",
                toasts: "Toast",
                contextMenu: "Menü"
            };
            Object.assign(areaLabels, {
                channelList: "Kanal",
                memberList: "Uye",
                searchResults: "Arama",
                userProfile: "Profil",
                statusBar: "Panel"
            });

            const activeBadges = activeAreas.length > 0 ? 
                `<div class="amb-active-badges">${activeAreas.map(area => `<span class="amb-badge">${areaLabels[area] || area}</span>`).join('')}</div>` : '';
            
            card.innerHTML = `
                <div class="amb-style-preview">
                    ${this.getPreviewContent(targetGridId)}
                </div>
                <div class="amb-style-name">${label}</div>
                <div class="amb-style-desc">${animDescriptions[style] || ""}</div>
                ${activeBadges}
                <div class="amb-style-actions">
                    <button class="amb-style-btn preview-btn" title="Önizle">▶️</button>
                </div>
            `;

            const previewItems = card.querySelectorAll('.amb-animated-preview-item');
            const previewBtn = card.querySelector('.preview-btn');

            const triggerCardPreview = () => {
                this.playPreviewElements(previewItems, style, this.getPreviewDuration(style), "", 50);
            };

            card.addEventListener('mouseenter', () => {
                if (this.getSettings().quickPreview !== false) triggerCardPreview();
            });
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
        const qualityPicker = homeSection.querySelector('#motionQualityPicker');
        const syncQualityPicker = () => {
            const current = this.getSettings().motionQuality || "balanced";
            qualityPicker?.querySelectorAll('button[data-quality]').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.quality === current);
            });
        };
        qualityPicker?.addEventListener('click', (event) => {
            const btn = event.target.closest?.('button[data-quality]');
            if (!btn) return;
            const cur = this.getSettings();
            cur.motionQuality = btn.dataset.quality;
            if (cur.motionQuality === "performance") {
                cur.maxAnimatedChildren = Math.min(cur.maxAnimatedChildren || 24, 12);
            } else if (cur.motionQuality === "cinematic") {
                cur.maxAnimatedChildren = Math.max(cur.maxAnimatedChildren || 24, 36);
            }
            this.saveSettings(cur);
            this.applySettingsToCSS(cur);
            syncQualityPicker();
            this.toast(`Animasyon kalite modu: ${btn.textContent}`, "success");
        });
        syncQualityPicker();
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
        ANIM_STYLES.forEach(style => {
            if (style !== "none") {
                menusAnimGrid.appendChild(createAnimStyleCard(style, ANIM_STYLE_LABELS[style], 'menusAnimGrid'));
            }
        });

        // Settings Section Content
        const glassSliders = [
            { key: "blurStrength", label: "Cam Bulanıklığı", desc: "Profil kartının arkasındaki blur efekti. Daha yüksek değer daha fazla bulanıklık.", min: 0, max: 60, step: 1 },
            { key: "innerBlur", label: "İç Katman Bulanıklığı", desc: "Profil içindeki panellerin blur değeri. Daha düşük değer daha net görünür.", min: 0, max: 30, step: 1 },
            { key: "panelAlpha", label: "Arka Plan Saydamlığı", desc: "Profil kartının arka plan saydamlığı. 0 = tam saydam, 1 = tam opak.", min: 0, max: 1, step: 0.01 },
            { key: "glowOpacity", label: "Glow Yoğunluğu", desc: "Profil etrafındaki ambient ışık efektinin yoğunluğu.", min: 0, max: 1, step: 0.01 },
            { key: "sheenOpacity", label: "Parlaklık (Sheen)", desc: "Profil üzerinde kayan parlaklık efektinin yoğunluğu.", min: 0, max: 1, step: 0.01 },
            { key: "edgeAlpha", label: "Kenar Işığı", desc: "Profil kartının kenar çerçevesinin parlaklığı.", min: 0, max: 1, step: 0.01 },
            { key: "glassSaturation", label: "Cam Renk Doygunluğu", desc: "Cam yüzeylerin arka plan rengini ne kadar canlı göstereceğini belirler.", min: 80, max: 220, step: 5 },
            { key: "glassDarkness", label: "Cam Koyuluk Dengesi", desc: "Profil camının okunabilirlik için ne kadar karartılacağını ayarlar.", min: 0.18, max: 0.82, step: 0.01 },
            { key: "animationSpeed", label: "Glow Animasyon Hızı", desc: "Glow efektinin animasyon hızı. 1x = varsayılan hız.", min: 0.1, max: 3, step: 0.1 },
            { key: "maxAnimatedChildren", label: "Maksimum Toplu Animasyon", desc: "Tek DOM güncellemesinde kaç öğeye kadar animasyon uygulanacağını sınırlar. Düşük değer daha akıcıdır.", min: 6, max: 60, step: 1 },
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

        const mkPresetSelector = () => {
            const s = this.getSettings();
            const row = document.createElement("div"); row.className = "amb-setter-row";
            row.style.marginBottom = "24px";
            row.innerHTML = `
                <div class="amb-setter-top">
                    <span class="amb-setter-lbl">Hazır Paket (Preset) Seçimi</span>
                </div>
                <div class="amb-setter-desc">Animasyonları tek tıkla belirli bir stile ayarlayın.</div>
                <select class="amb-select-el" style="margin-top:12px;">
                    ${Object.entries(PRESETS).map(([k, p]) => `<option value="${k}" ${s.activePreset === k ? 'selected' : ''}>${p.name}</option>`).join('')}
                </select>
            `;
            const select = row.querySelector('select');
            select.addEventListener('change', (e) => {
                const presetKey = e.target.value;
                const preset = PRESETS[presetKey];
                if (preset) {
                    const cur = this.getSettings();
                    cur.activePreset = presetKey;
                    cur.anim = JSON.parse(JSON.stringify(preset.anim)); // Deep copy
                    this.saveSettings(cur);
                    this.applySettingsToCSS(cur);
                    this.toast(`${preset.name} paketi başarıyla uygulandı!`, "success");

                    // Trigger a re-render by "re-opening" the settings section
                    setTimeout(() => {
                        const evt = new MouseEvent("click", {
                            bubbles: true,
                            cancelable: true,
                            view: window
                        });
                        document.querySelector('.amb-sidebar-item[data-section="settings"]').dispatchEvent(evt);
                    }, 200);
                }
            });
            return row;
        };

        const mkAnimationModePanel = () => {
            const row = document.createElement("div");
            row.className = "amb-setter-row";
            row.innerHTML = `
                <div class="amb-setter-top">
                    <span class="amb-setter-lbl">Basit Animasyon Modları</span>
                </div>
                <div class="amb-setter-desc">Kafa karışıklığı olmadan hızlı başlangıç: güvenli mod sadece mesaj, modal, menü ve küçük popout yüzeylerini oynatır. Kanal/üye/profil listeleri ayrı toggle açılmadıkça animasyon yemez.</div>
                <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px;margin-top:12px;">
                    <button class="amb-modal-btn amb-modal-btn-secondary" type="button" data-mode="calm">Sakin</button>
                    <button class="amb-modal-btn amb-modal-btn-primary" type="button" data-mode="safe">Güvenli</button>
                    <button class="amb-modal-btn amb-modal-btn-secondary" type="button" data-mode="off">Hepsi Kapalı</button>
                </div>
            `;
            row.querySelectorAll("button[data-mode]").forEach(btn => {
                btn.addEventListener("click", () => {
                    const cur = this.getSettings();
                    cur.layoutAnimationsEnabled = false;
                    for (const key of Object.keys(cur.anim)) {
                        cur.anim[key].enabled = false;
                        cur.anim[key].delay = 0;
                        cur.anim[key].stagger = 0;
                    }
                    if (btn.dataset.mode !== "off") {
                        const calm = btn.dataset.mode === "calm";
                        cur.anim.messages = { style: calm ? "fade" : "slide-up", duration: calm ? 180 : 260, enabled: true, delay: 0, stagger: 0 };
                        cur.anim.modals = { style: calm ? "scale" : "spring", duration: calm ? 190 : 320, enabled: true, delay: 0, stagger: 0 };
                        cur.anim.contextMenu = { style: "scale", duration: calm ? 140 : 180, enabled: true, delay: 0, stagger: 0 };
                        cur.anim.emojiPicker = { style: "scale", duration: calm ? 160 : 220, enabled: true, delay: 0, stagger: 0 };
                        cur.anim.toasts = { style: "slide-right", duration: calm ? 200 : 280, enabled: true, delay: 0, stagger: 0 };
                    }
                    this.saveSettings(cur);
                    this.applySettingsToCSS(cur);
                    this.toast(btn.dataset.mode === "off" ? "Tüm animasyonlar kapatıldı." : `${btn.textContent} animasyon modu uygulandı.`, "success");
                });
            });
            return row;
        };

        settingsSection.innerHTML = `
            <h2 class="amb-section-title">Genel Ayarlar</h2>
            <p class="amb-section-desc">Animasyon paketleri, cam efektleri, glow ve diğer görsel ayarları buradan yapılandırabilirsiniz.</p>
        `;

        settingsSection.appendChild(mkPresetSelector());
        settingsSection.appendChild(mkAnimationModePanel());

        for (const cfg of glassSliders) {
            settingsSection.appendChild(mkPremiumSlider(cfg.label, cfg.desc, cfg.min, cfg.max, cfg.step, s[cfg.key], (v) => {
                const cur = this.getSettings(); cur[cfg.key] = v; this.saveSettings(cur); this.applySettingsToCSS(cur);
            }));
        }

        const mkQualitySelector = () => {
            const cur = this.getSettings();
            const row = document.createElement("div"); row.className = "amb-setter-row";
            row.innerHTML = `
                <div class="amb-setter-top">
                    <span class="amb-setter-lbl">Animasyon Kalite Modu</span>
                    <span class="amb-setter-val">${cur.motionQuality || "balanced"}</span>
                </div>
                <div class="amb-setter-desc">Performans modu süreleri kısaltır, sinematik mod daha uzun ve gösterişli önizlemeler kullanır.</div>
                <select class="amb-select-el" style="margin-top:12px;">
                    <option value="performance" ${(cur.motionQuality || "balanced") === "performance" ? "selected" : ""}>Performans</option>
                    <option value="balanced" ${(cur.motionQuality || "balanced") === "balanced" ? "selected" : ""}>Dengeli</option>
                    <option value="cinematic" ${(cur.motionQuality || "balanced") === "cinematic" ? "selected" : ""}>Sinematik</option>
                </select>
            `;
            const select = row.querySelector("select");
            const val = row.querySelector(".amb-setter-val");
            select.addEventListener("change", () => {
                const next = this.getSettings();
                next.motionQuality = select.value;
                this.saveSettings(next);
                this.applySettingsToCSS(next);
                val.textContent = select.value;
            });
            return row;
        };
        settingsSection.appendChild(mkQualitySelector());

        // ─── Typing Ayarları Bölümü ───────────────────────────────────────────────

        const mkTypingToggle = (labelText, descText, settingKey, onChangeCb) => {
            const row = document.createElement("div");
            row.className = "amb-setter-row";
            row.innerHTML = `
                <div class="amb-setter-top" style="align-items:flex-start;">
                    <div style="flex:1;">
                        <span class="amb-setter-lbl">${labelText}</span>
                        <div class="amb-setter-desc" style="margin-top:6px;">${descText}</div>
                    </div>
                    <button class="amb-toggle-btn" type="button" style="flex-shrink:0;margin-left:16px;">
                        <span class="amb-toggle-dot"></span>
                    </button>
                </div>
                <div class="amb-setter-subdesc" style="font-size:12px;color:#949ba4;margin-top:6px;"></div>
            `;
            const btn = row.querySelector('.amb-toggle-btn');
            const dot = row.querySelector('.amb-toggle-dot');
            const status = row.querySelector('.amb-setter-subdesc');
            dot.style.transition = "left 0.2s cubic-bezier(0.4,0,0.2,1)";
            let state = this.getSettings()[settingKey] || false;

            const updateUI = () => {
                btn.style.background = state
                    ? "linear-gradient(135deg,#5865f2 0%,#4752c4 100%)"
                    : "linear-gradient(135deg,#4e5058 0%,#3f4147 100%)";
                dot.style.left = state ? "25px" : "3px";
                status.textContent = state ? "✅ Aktif" : "⭕ Kapalı";
            };
            updateUI();

            btn.addEventListener("click", () => {
                state = !state;
                updateUI();
                const cur = this.getSettings();
                cur[settingKey] = state;
                this.saveSettings(cur);
                if (onChangeCb) onChangeCb(state, cur);
            });
            return row;
        };

        settingsSection.appendChild(mkTypingToggle(
            "Canlı Kart Önizlemesi",
            "Animasyon kartlarının üzerine gelince önizlemeyi otomatik oynatır. Kapalıyken sadece oynat düğmesi çalışır.",
            "quickPreview",
            (state, cur) => {
                this.saveSettings(cur);
                this.toast(state ? "Canlı önizleme açıldı." : "Canlı önizleme kapatıldı.", "success");
            }
        ));

        settingsSection.appendChild(mkTypingToggle(
            "Sistem Hareket Tercihine Uyum",
            "İşletim sisteminde hareket azaltma açıksa Discord içi animasyonları otomatik sadeleştirir.",
            "respectReducedMotion",
            (state, cur) => {
                this.applySettingsToCSS(cur);
                this.toast(state ? "Hareket tercihi dikkate alınacak." : "Hareket tercihi yok sayılacak.", "success");
            }
        ));

        settingsSection.appendChild(mkTypingToggle(
            "Geniş Layout Animasyonları",
            "Kanal değişimi, profil kartları, kanal listesi, üye listesi, DM kutuları ve sidebar gibi büyük Discord parçalarını da animasyon sistemine dahil eder. Varsayılan kapalıdır.",
            "layoutAnimationsEnabled",
            (state, cur) => {
                this.applySettingsToCSS(cur);
                this.toast(state ? "Geniş layout animasyonları açıldı." : "Geniş layout animasyonları kapatıldı.", "success");
            }
        ));

        settingsSection.appendChild(mkTypingToggle(
            "Global Cam Yüzeyler",
            "Menü, tooltip ve picker gibi Discord yüzeylerine cam görünümü uygular. Tema çakışması yaşarsan kapalı kalması daha iyi olur.",
            "globalGlassSurfaces",
            (state, cur) => {
                this.applySettingsToCSS(cur);
                this.toast(state ? "Global cam yüzeyler açıldı." : "Global cam yüzeyler kapatıldı.", "success");
            }
        ));

        // Toggle 1: Yazdığını başkalarından gizle (InvisibleTyping)
        const invisTypingRow = mkTypingToggle(
            "🫥 Yazdığını Gizle (Invisible Typing)",
            "Yazarken Discord'un sunucuya <b>\u0022X yaz\u0131yor...\u0022</b> sinyali göndermesini engeller. Sadece <b>senin</b> yazma durumun gizlenir; başkalarının yazıyor göstergesi etkilenmez.",
            "invisibleTyping",
            (state, cur) => {
                this.applySettingsToCSS(cur);
                this.patchInvisibleTyping();
                this.toast(state ? "Artık yazdığın gizleniyor 🫥" : "Yazıyor göstergesi tekrar aktif.", "success");
            }
        );
        settingsSection.appendChild(invisTypingRow);

        // Toggle 2: Başkalarının yazıyor göstergesini gizle (CSS)
        const hideTypingRow = mkTypingToggle(
            "🙈 Yazıyor Göstergelerini Gizle",
            "Başkalarının <b>&quot;yazıyor...&quot;</b> yazısını ve simgesini Discord arayüzünde gizler. Chat altı yazı, member listesi ve DM listesindeki tüm yazıyor göstergeleri kaybolur.",
            "hideTypingIndicator",
            (state, cur) => {
                this.applySettingsToCSS(cur);
                this.toast(state ? "Yazıyor göstergeleri gizlendi 🙈" : "Yazıyor göstergeleri görünür 👁️", "success");
            }
        );
        settingsSection.appendChild(hideTypingRow);

        // Sıfırlama Butonu
        const resetBtn = document.createElement("button");
        resetBtn.className = "amb-btn-reset"; resetBtn.textContent = "Varsayılana Sıfırla";
        resetBtn.addEventListener("click", () => {
            this.saveSettings(JSON.parse(JSON.stringify(DEFAULT_SETTINGS)));
            this.applySettingsToCSS(this.getSettings());
            this.toast("Eklenti ayarları fabrika ayarlarına döndürüldü.", "success");
            modalOverlay.remove();
            this.getSettingsPanel();
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

    // ─── Invisible Typing (Yazdığını Gizle) ─────────────────────────────────────

    shouldReduceMotion(settings = this.getSettings()) {
        return settings.respectReducedMotion !== false && window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    }

    getMotionEasing(style, areaKey = "") {
        const base = {
            spring: "cubic-bezier(.34,1.56,.64,1)",
            bounce: "cubic-bezier(.34,1.56,.64,1)",
            elastic: "cubic-bezier(.5,0,.1,1.35)",
            jelly: "cubic-bezier(.34,1.56,.64,1)",
            pop: "cubic-bezier(.34,1.56,.64,1)",
            shake: "cubic-bezier(.36,.07,.19,.97)",
            fade: "cubic-bezier(.4,0,.2,1)",
            "slide-up": "cubic-bezier(.25,1,.5,1)",
            "slide-down": "cubic-bezier(.25,1,.5,1)",
            "slide-left": "cubic-bezier(.25,1,.5,1)",
            "slide-right": "cubic-bezier(.25,1,.5,1)",
            scale: "cubic-bezier(.34,1.28,.64,1)",
            blur: "cubic-bezier(.4,0,.2,1)",
            flip: "cubic-bezier(.34,1.28,.64,1)",
            rotate: "cubic-bezier(.34,1.28,.64,1)",
            pulse: "cubic-bezier(.4,0,.6,1)",
            "zoom-in": "cubic-bezier(.34,1.28,.64,1)",
            "zoom-out": "cubic-bezier(.34,1.28,.64,1)",
            "slide-fade": "cubic-bezier(.25,1,.5,1)",
            typewriter: "steps(36, end)",
            glitch: "cubic-bezier(.25,1,.5,1)",
            morph: "cubic-bezier(.34,1.28,.64,1)",
            wave: "cubic-bezier(.25,1,.5,1)",
            reveal: "cubic-bezier(.25,1,.5,1)",
            stagger: "cubic-bezier(.25,1,.5,1)",
            swing: "cubic-bezier(.25,1,.5,1)",
            ripple: "cubic-bezier(.25,1,.5,1)"
        };
        if (areaKey === "messages" && ["spring", "bounce", "jelly", "pop", "scale", "zoom-in", "zoom-out"].includes(style)) {
            return "cubic-bezier(.25,1,.5,1)";
        }
        return base[style] || "cubic-bezier(.22,.68,0,1)";
    }

    getQualityScale(settings = this.getSettings()) {
        return settings.motionQuality === "performance" ? 0.72 : settings.motionQuality === "cinematic" ? 1.16 : 1;
    }

    getPreviewDuration(style, settings = this.getSettings()) {
        const durationMap = {
            spring: 760, bounce: 820, elastic: 920, jelly: 780, pop: 620, shake: 520,
            fade: 460, "slide-up": 560, "slide-down": 560, "slide-left": 560, "slide-right": 560,
            scale: 620, blur: 480, flip: 720, rotate: 760, pulse: 720, "zoom-in": 560,
            "zoom-out": 560, "slide-fade": 620, typewriter: 760, glitch: 420, morph: 560,
            wave: 640, reveal: 560, stagger: 500, swing: 720, ripple: 640
        };
        return Math.round((durationMap[style] || 560) * this.getQualityScale(settings));
    }

    playPreviewElements(elements, style, duration, areaKey = "", stagger = 50) {
        const items = Array.from(elements || []);
        items.forEach(el => { el.style.animation = "none"; el.style.opacity = "0"; });
        if (!items.length || style === "none") return;
        void items[0].offsetWidth;
        const easing = this.getMotionEasing(style, areaKey);
        items.forEach((el, index) => {
            el.style.animation = `amb-${style} ${duration}ms ${easing} both`;
            el.style.animationDelay = `${index * stagger}ms`;
        });
    }

    patchInvisibleTyping() {
        // Önceki patch varsa temizle
        if (this._typingPatch) { this._typingPatch(); this._typingPatch = null; }

        const s = this.getSettings();
        if (!s.invisibleTyping) return; // kapalıysa patch etme

        try {
            const TypingModule = BdApi.Webpack.getByKeys("startTyping");
            if (!TypingModule) {
                console.warn(`${PLUGIN_NAME}: TypingModule bulunamadı, invisibleTyping çalışmıyor.`);
                return;
            }
            const original = TypingModule.startTyping.bind(TypingModule);
            TypingModule.startTyping = function () { /* gizlendi — hiçbir şey gönderilmez */ };
            this._typingPatch = () => { TypingModule.startTyping = original; };
        } catch (err) {
            console.error(`${PLUGIN_NAME}: patchInvisibleTyping hata:`, err);
        }
    }


    start() {
        try {
            this.colorRefreshTimers = new WeakMap();
            this.handleShiftClickCopy = this.handleShiftClickCopy.bind(this);
            document.addEventListener("click", this.handleShiftClickCopy, true);
            this.checkForUpdates();
            this.updateInterval = setInterval(() => this.checkForUpdates(true), UPDATE_CHECK_INTERVAL);
            const s = this.getSettings();
            this.injectCSS(s);
            this.injectAnimCSS(s);
            this.patchInvisibleTyping();
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
            this.observer.observe(appMount, { childList: true, subtree: true, attributes: true, attributeFilter: ["class", "src"] });
        } catch (err) {
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
            document.querySelectorAll(".ambient-profile-container,.ambient-profile-tools,.ambient-profile-note,.ambient-link-tools,.ambient-code-copy,.ambient-profile-tags").forEach(el => el.remove());
            document.querySelectorAll(".ambient-enhanced-link").forEach(el => { el.classList.remove("ambient-enhanced-link"); el.removeAttribute("data-ambient-domain"); el.removeAttribute("data-ambient-risk"); });
            document.querySelectorAll(".ambient-enhanced-code").forEach(el => el.classList.remove("ambient-enhanced-code"));
            document.querySelectorAll(".ambient-spotify-card").forEach(el => el.classList.remove("ambient-spotify-card"));
            document.querySelectorAll(".ambient-profile-root").forEach(el => el.classList.remove("ambient-profile-root"));
            document.querySelectorAll(".amb-done").forEach(el => el.classList.remove("amb-done"));
            for (const k of Object.keys(ANIM_AREAS))
                document.querySelectorAll(`.ambient-anim-${k}`).forEach(el => el.classList.remove(`ambient-anim-${k}`));
            // Invisible typing patch'i geri al
            if (this._typingPatch) { this._typingPatch(); this._typingPatch = null; }
        }
    }

    // ─── Animation system ────────────────────────────────────────────────────────

    injectAnimCSS(s) {
        if (this.shouldReduceMotion(s)) {
            BdApi.DOM.addStyle("AmbientAnimCSS", `
                .ambient-anim-messages,.ambient-anim-channelSwitch,.ambient-anim-serverSwitch,.ambient-anim-sidebar,
                .ambient-anim-memberSidebar,.ambient-anim-modals,.ambient-anim-emojiPicker,.ambient-anim-toasts,
                .ambient-anim-contextMenu,.ambient-anim-channelList,.ambient-anim-memberList,.ambient-anim-searchResults,
                .ambient-anim-userProfile,.ambient-anim-statusBar{animation:amb-fade 120ms ease-out both!important;}
                @keyframes amb-fade{from{opacity:0}to{opacity:1}}
            `);
            return;
        }
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
        @keyframes amb-typewriter  { from{opacity:0;clip-path:inset(0 100% 0 0)} to{opacity:1;clip-path:inset(0 0 0 0)} }
        @keyframes amb-glitch      { 0%{clip-path:inset(20% 0 80% 0);transform:translate(-2px,1px)} 20%{clip-path:inset(60% 0 10% 0);transform:translate(2px,-1px)} 40%{clip-path:inset(40% 0 50% 0);transform:translate(-2px,2px)} 60%{clip-path:inset(80% 0 5% 0);transform:translate(2px,-2px)} 80%{clip-path:inset(10% 0 70% 0);transform:translate(-1px,1px)} 100%{clip-path:inset(0 0 0 0);transform:translate(0)} }
        @keyframes amb-morph       { 0%{opacity:0;border-radius:50%;transform:scale(0.5) rotate(-45deg)} 100%{opacity:1;border-radius:inherit;transform:scale(1) rotate(0)} }
        @keyframes amb-wave        { 0%{opacity:0;transform:translateY(20px) skewY(5deg)} 50%{opacity:1;transform:translateY(-5px) skewY(-3deg)} 100%{transform:translateY(0) skewY(0)} }
        @keyframes amb-reveal      { 0%{opacity:0;clip-path:inset(100% 0 0 0);transform:translateY(20px)} 100%{opacity:1;clip-path:inset(0 0 0 0);transform:translateY(0)} }
        @keyframes amb-stagger     { 0%{opacity:0;transform:translateY(15px) scale(0.95)} 100%{opacity:1;transform:translateY(0) scale(1)} }
        @keyframes amb-swing       { 0%{opacity:0;transform:rotateX(-100deg);transform-origin:top} 40%{transform:rotateX(20deg);transform-origin:top} 60%{transform:rotateX(-10deg);transform-origin:top} 80%{transform:rotateX(5deg);transform-origin:top} 100%{opacity:1;transform:rotateX(0);transform-origin:top} }
        @keyframes amb-ripple      { 0%{opacity:0;transform:scale(0.8);box-shadow:0 0 0 0 rgba(var(--ambient-bright,255,255,255), 0.7)} 70%{opacity:1;transform:scale(1.05);box-shadow:0 0 0 10px rgba(var(--ambient-bright,255,255,255), 0)} 100%{transform:scale(1);box-shadow:0 0 0 0 rgba(var(--ambient-bright,255,255,255), 0)} }
        `];

        for (const [areaKey, cfg] of Object.entries(s.anim)) {
            if (!cfg.enabled || cfg.style === "none") continue;
            if (LAYOUT_ANIM_AREAS.has(areaKey) && !s.layoutAnimationsEnabled) continue;
            const easing = this.getMotionEasing(cfg.style, areaKey);
            const duration = Math.max(80, Math.round((cfg.duration || 300) * this.getQualityScale(s)));
            const delayCSS = cfg.delay > 0 ? `animation-delay:${cfg.delay}ms;` : '';
            rules.push(`.ambient-anim-${areaKey}{animation:amb-${cfg.style} ${duration}ms ${easing} both;${delayCSS}will-change:transform,opacity,clip-path;backface-visibility:hidden;transform-origin:center;}`);
        }

        BdApi.DOM.addStyle("AmbientAnimCSS", rules.join("\n"));
    }

    animateNode(node) {
        const s = this.getSettings();
        if (node.closest?.(".amb-modal-overlay,.amb-settings-panel")) return;
        const maxChildren = Math.max(1, Number(s.maxAnimatedChildren) || 24);
        for (const [areaKey, areaMeta] of Object.entries(ANIM_AREAS)) {
            const cfg = s.anim[areaKey];
            if (!cfg?.enabled || cfg.style === "none") continue;
            if (LAYOUT_ANIM_AREAS.has(areaKey) && !s.layoutAnimationsEnabled) continue;
            const cls = `ambient-anim-${areaKey}`;

            // Tekil node kontrolü
            if (node.matches?.(areaMeta.selector)) {
                this.applyAnim(node, areaKey, cls, cfg.stagger, 0);
            }

            // Çocuk elemanlar kontrolü (stagger mantığı ile)
            const children = node.querySelectorAll?.(areaMeta.selector);
            if (children && children.length > 0) {
                let index = 0;
                Array.from(children).slice(0, maxChildren).forEach(el => {
                    this.applyAnim(el, areaKey, cls, cfg.stagger, index);
                    index++;
                });
            }
        }
    }

    applyAnim(el, areaKey, cls, staggerMs = 0, index = 0) {
        if (el.classList.contains("amb-done")) return;
        if (el.closest?.(".amb-modal-overlay,.amb-settings-panel")) return;

        el.classList.remove(cls);
        requestAnimationFrame(() => {
            if (!document.body.contains(el) || el.classList.contains("amb-done")) return;
            void el.offsetWidth;
            el.classList.add(cls);
        });

        if (staggerMs > 0 && index > 0) {
            el.style.animationDelay = `${(parseFloat(el.style.animationDelay) || 0) + (staggerMs * index)}ms`;
        }

        el.addEventListener("animationend", () => {
            if (areaKey !== "messages" && staggerMs === 0) el.classList.remove(cls);
            el.classList.add("amb-done");
            el.style.animationDelay = '';
        }, { once: true });
    }

    // ─── Update ──────────────────────────────────────────────────────────────────

    async checkForUpdates(silent = false) {
        if (this.isCheckingForUpdates) return;
        this.isCheckingForUpdates = true;
        try {
            const fs = require("fs"), path = require("path");
            const addon = BdApi.Plugins.get(PLUGIN_NAME);
            const fileName = addon?.filename || PLUGIN_FILE;
            const targetPath = path.join(BdApi.Plugins.folder, fileName);
            const localContent = fs.existsSync(targetPath) ? fs.readFileSync(targetPath, "utf8") : "";
            const currentVersion = addon?.version || this.getMetaValue(localContent, "version");
            if (!currentVersion) throw new Error("Local version could not be read.");
            const response = await BdApi.Net.fetch(this.withCacheBuster(UPDATE_URL), { headers: { "Cache-Control": "no-cache", "Pragma": "no-cache" }, timeout: 15000 });
            if (!response?.ok) throw new Error(`HTTP ${response?.status || "?"}`);
            const remoteContent = await response.text();
            const remoteName = this.getMetaValue(remoteContent, "name");
            const remoteVersion = this.getMetaValue(remoteContent, "version");
            this.validateUpdate(remoteContent, remoteName, remoteVersion);
            if (!this.isNewerVersion(remoteVersion, currentVersion)) return;
            const tempPath = targetPath + ".download";
            fs.writeFileSync(tempPath, remoteContent, "utf8");
            fs.renameSync(tempPath, targetPath);
            BdApi.UI?.showToast?.(`${PLUGIN_NAME} ${remoteVersion} downloaded. Reload Discord.`, { type: "success" });
        } catch (err) {
            if (!silent) console.error(`${PLUGIN_NAME} update check failed:`, err);
        } finally { this.isCheckingForUpdates = false; }
    }

    withCacheBuster(url) { return url + (url.includes("?") ? "&" : "?") + "t=" + Date.now(); }

    validateUpdate(content, name, version) {
        if (name !== PLUGIN_NAME) throw new Error("Remote plugin name does not match.");
        if (!version || !/^\d+(?:\.\d+){1,3}$/.test(version)) throw new Error("Remote plugin version is invalid.");
        if (!content.includes("module.exports")) throw new Error("Remote file does not look like a plugin.");
        if (content.length < 1000) throw new Error("Remote file looks unexpectedly short.");
    }

    getMetaValue(content, key) { const m = content.match(new RegExp("^\\s*\\*\\s*@" + key + "\\s+(.+)$", "mi")); return m ? m[1].trim() : ""; }

    isNewerVersion(remote, current) {
        const r = remote.split(".").map(p => parseInt(p, 10) || 0);
        const c = current.split(".").map(p => parseInt(p, 10) || 0);
        for (let i = 0; i < Math.max(r.length, c.length); i++) { const ri = r[i] || 0, ci = c[i] || 0; if (ri > ci) return true; if (ri < ci) return false; }
        return false;
    }

    // ─── CSS ─────────────────────────────────────────────────────────────────────

    injectCSS(s = DEFAULT_SETTINGS) {
        const bp = `${s.blurStrength}px`, ibp = `${s.innerBlur}px`;
        const sp = s.animationSpeed;
        const panelAlpha = Math.max(0, Math.min(1, Number(s.panelAlpha) || 0));
        const glowOpacity = Math.max(0, Math.min(1, Number(s.glowOpacity) || 0));
        const sheenOpacity = Math.max(0, Math.min(1, Number(s.sheenOpacity) || 0));
        const edgeAlpha = Math.max(0, Math.min(1, Number(s.edgeAlpha) || 0));
        const glassSaturation = Math.max(80, Math.min(220, Number(s.glassSaturation) || 145));
        const glassDarkness = Math.max(0.18, Math.min(0.82, Number(s.glassDarkness) || 0.52));

        // hideTypingIndicator CSS — sadece "typing" içeren class'ları hedef alır.
        // "dots", "avatar", "svg foreignObject" gibi geniş seçiciler KULLANILMAZ
        // çünkü Discord bu isimleri profil fotoğrafı ve sunucu simgelerinde de kullanır.
        const typingCSS = s.hideTypingIndicator ? `
            /* ── Chat alt alanı: "X yazıyor..." yazısı ve kapsayıcısı ── */
            [class*="typing"]{display:none!important;visibility:hidden!important;pointer-events:none!important;}
            [class*="typingIndicator"]{display:none!important;}
            [class*="typingUsers"]{display:none!important;}
            [class*="typingText"]{display:none!important;}
            /* ── SVG mask ile gösterilen yazıyor simgesi (avatar üstü) ── */
            foreignObject[mask*="typing"]{display:none!important;}
            mask[id*="typing"]{display:none!important;}
        `: "";

        const globalGlassCSS = s.globalGlassSurfaces ? `
        .ambient-glass-surface,
        [class*="menu_"][role="menu"],
        [class*="submenu_"][role="menu"],
        [class*="tooltip_"],
        [class*="picker_"][class*="popout_"],
        [class*="autocomplete_"]{
            background-color:rgba(18,18,24,.72)!important;
            border:1px solid rgba(255,255,255,.08)!important;
            box-shadow:0 18px 48px rgba(0,0,0,.42),0 0 28px rgba(114,137,218,.08)!important;
            -webkit-backdrop-filter:blur(18px) saturate(${glassSaturation}%);
            backdrop-filter:blur(18px) saturate(${glassSaturation}%);
        }
        [class*="menu_"][role="menu"] [class*="item_"]:hover,
        [class*="submenu_"][role="menu"] [class*="item_"]:hover{background-color:rgba(114,137,218,.18)!important;}
        ` : "";

        BdApi.DOM.addStyle("AmbientProfileCSS", `
            ${typingCSS}
        .ambient-profile-root{
            --ambient-base:114,137,218;--ambient-bright:153,170,255;--ambient-soft:230,235,255;
            --ambient-panel-alpha:${panelAlpha};--ambient-edge-alpha:${edgeAlpha};
            position:relative!important;overflow:hidden!important;isolation:isolate!important;border-radius:inherit;background-clip:padding-box!important;
            background-color:rgba(12,12,16,var(--ambient-panel-alpha))!important;
            background-image:linear-gradient(160deg,rgba(var(--ambient-base),.20),rgba(12,12,16,${glassDarkness}) 44%,rgba(0,0,0,.42))!important;
            box-shadow:0 18px 46px rgba(0,0,0,.38),0 0 24px rgba(var(--ambient-base),.14)!important;
            -webkit-backdrop-filter:blur(${bp}) saturate(${glassSaturation}%)!important;
            backdrop-filter:blur(${bp}) saturate(${glassSaturation}%)!important;
        }
        .ambient-profile-root>:not(.ambient-profile-container){position:relative!important;z-index:2!important;}
        .ambient-profile-root > [class*="userProfileInner_"],
        .ambient-profile-root > [class*="profileInner_"],
        .ambient-profile-root [class*="overlayBackground_"]{
            background-color:rgba(8,8,12,${Math.min(0.58, panelAlpha * 0.56 + 0.12)})!important;
            background-image:linear-gradient(180deg,rgba(255,255,255,.035),rgba(0,0,0,.06))!important;
            -webkit-backdrop-filter:blur(${ibp}) saturate(${Math.max(100, glassSaturation - 20)}%);
            backdrop-filter:blur(${ibp}) saturate(${Math.max(100, glassSaturation - 20)}%);
        }
        .ambient-profile-root > [class*="userProfileInner_"]::before,
        .ambient-profile-root > [class*="profileInner_"]::before{opacity:.12!important;}
        .ambient-profile-container{position:absolute;inset:0;border-radius:inherit;overflow:hidden;pointer-events:none;z-index:0;background:radial-gradient(circle at 18% 18%,rgba(var(--ambient-soft),.22),transparent 34%),radial-gradient(circle at 82% 12%,rgba(var(--ambient-bright),.20),transparent 32%),linear-gradient(135deg,rgba(var(--ambient-base),.16),transparent 54%);}
        .ambient-glow-main{position:absolute;inset:-42%;background:radial-gradient(circle at 30% 35%,rgba(var(--ambient-base),.70),transparent 46%),radial-gradient(circle at 72% 70%,rgba(var(--ambient-bright),.38),transparent 42%),conic-gradient(from 120deg,rgba(var(--ambient-base),.12),rgba(var(--ambient-bright),.26),rgba(var(--ambient-soft),.10),rgba(var(--ambient-base),.12));background-size:150% 150%;filter:blur(30px) saturate(145%);opacity:${glowOpacity};animation:ambientGlowMove ${(18 / sp).toFixed(1)}s ease-in-out infinite alternate;}
        .ambient-glow-pop{position:absolute;top:18%;left:50%;width:92%;height:68%;transform:translate(-50%,-50%) scale(1);background:radial-gradient(circle,rgba(var(--ambient-bright),.58),transparent 58%);opacity:.48;filter:blur(42px);animation:neonPulse ${(9 / sp).toFixed(1)}s ease-in-out infinite alternate;}
        .ambient-glow-sheen{position:absolute;inset:-2px;background:linear-gradient(115deg,transparent 0%,rgba(255,255,255,.16) 38%,transparent 58%),linear-gradient(180deg,rgba(var(--ambient-soft),.10),transparent 42%);mix-blend-mode:screen;opacity:${sheenOpacity};animation:ambientSheen ${(12 / sp).toFixed(1)}s ease-in-out infinite;}
        .ambient-profile-root::after{content:'';position:absolute;inset:0;border-radius:inherit;padding:1px;background:linear-gradient(135deg,rgba(var(--ambient-soft),.34),rgba(var(--ambient-bright),var(--ambient-edge-alpha)) 34%,transparent 62%,rgba(var(--ambient-base),.34));background-size:200% 200%;-webkit-mask:linear-gradient(#fff 0 0) content-box,linear-gradient(#fff 0 0);-webkit-mask-composite:xor;mask-composite:exclude;pointer-events:none;z-index:4;animation:borderRotate ${(7 / sp).toFixed(1)}s linear infinite;}
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
        ${globalGlassCSS}
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

    scanExistingProfiles() { for (const p of document.querySelectorAll(PROFILE_SELECTORS)) this.addAmbientGlow(p); }
    findProfileRoots(node) { const s = new Set(); if (node.matches?.(PROFILE_SELECTORS)) s.add(node); node.querySelectorAll?.(PROFILE_SELECTORS).forEach(p => s.add(p)); return s; }

    addAmbientGlow(popout) {
        if (!popout) return;
        if (popout.querySelector(".ambient-profile-container")) {
            popout.classList.add("ambient-profile-root");
            this.queueColorRefresh(popout); this.ensureProfileTools(popout); this.renderProfileTags(popout); this.polishSpotifyCards(popout); return;
        }
        setTimeout(() => {
            if (!document.body.contains(popout) || popout.querySelector(".ambient-profile-container")) return;
            popout.classList.add("ambient-profile-root");
            const c = document.createElement("div"); c.className = "ambient-profile-container";
            for (const cls of ["ambient-glow-main", "ambient-glow-pop", "ambient-glow-sheen"]) { const d = document.createElement("div"); d.className = cls; c.appendChild(d); }
            popout.insertBefore(c, popout.firstChild);
            this.updateProfileColors(popout); this.ensureProfileTools(popout); this.renderProfileTags(popout); this.polishSpotifyCards(popout);
        }, 180);
    }

    queueColorRefresh(popout) {
        const t = this.colorRefreshTimers?.get(popout); if (t) clearTimeout(t);
        this.colorRefreshTimers?.set(popout, setTimeout(() => { this.colorRefreshTimers?.delete(popout); if (document.body.contains(popout)) this.updateProfileColors(popout); }, 180));
    }

    updateProfileColors(p) { this.applyFallbackColors(p); this.applyImageColors(p); }

    applyFallbackColors(popout) {
        const cs = getComputedStyle(popout);
        const rgb = ["--profile-gradient-primary-color", "--profile-gradient-secondary-color", "--brand-500", "--background-accent", "--interactive-active"].map(p => this.parseCssColor(cs.getPropertyValue(p))).find(Boolean) || [114, 137, 218];
        this.setAmbientColors(popout, rgb);
    }

    applyImageColors(popout) {
        const img = this.pickBestImage(popout); if (!img?.src) return;
        const probe = new Image(); probe.crossOrigin = "Anonymous";
        probe.onload = () => { const rgb = this.sampleImageColor(probe); if (rgb) this.setAmbientColors(popout, rgb); };
        probe.onerror = () => { }; probe.src = this.normalizeImageUrl(img.src);
    }

    pickBestImage(popout) {
        const imgs = Array.from(popout.querySelectorAll(IMAGE_SELECTORS)).filter(i => i.src);
        return imgs.find(i => i.src.includes("i.scdn.co") || i.src.includes("spotify")) || imgs.find(i => i.width >= 64 || i.height >= 64) || imgs[0];
    }

    normalizeImageUrl(src) {
        if (!src.includes("cdn.discordapp.com") && !src.includes("media.discordapp.net")) return src;
        return src.split("?")[0] + "?size=128";
    }

    sampleImageColor(img) {
        try {
            const c = document.createElement("canvas"); c.width = c.height = 12;
            const ctx = c.getContext("2d", { willReadFrequently: true }); ctx.drawImage(img, 0, 0, 12, 12);
            const px = ctx.getImageData(0, 0, 12, 12).data; let r = 0, g = 0, b = 0, n = 0;
            for (let i = 0; i < px.length; i += 4) { if (px[i + 3] < 90) continue; const br = (px[i] + px[i + 1] + px[i + 2]) / 3; if (br < 18 || br > 242) continue; r += px[i]; g += px[i + 1]; b += px[i + 2]; n++; }
            return n ? [Math.round(r / n), Math.round(g / n), Math.round(b / n)] : null;
        } catch { return null; }
    }

    setAmbientColors(popout, rgb) {
        const base = this.boostColor(rgb);
        popout.style.setProperty("--ambient-base", base.join(", "));
        popout.style.setProperty("--ambient-bright", this.mixColor(base, [255, 255, 255], .28).join(", "));
        popout.style.setProperty("--ambient-soft", this.mixColor(base, [255, 255, 255], .58).join(", "));
    }

    boostColor(rgb) { const mx = Math.max(...rgb); const sc = mx < 150 ? 150 / Math.max(mx, 1) : 1; return rgb.map(v => Math.max(36, Math.min(255, Math.round(v * sc)))); }
    mixColor(a, b, t) { return a.map((v, i) => Math.round(v + (b[i] - v) * t)); }

    // ─── Profile tools ───────────────────────────────────────────────────────────

    ensureProfileTools(popout) {
        if (popout.querySelector(".ambient-profile-tools")) { this.updateProfileTools(popout); return; }
        const tools = document.createElement("div"); tools.className = "ambient-profile-tools";
        const b = (l, t, fn) => this.createToolButton(l, t, fn);
        tools.append(
            b("ID", "Copy user ID", () => { const d = this.getProfileData(popout); d.id ? this.copyText(d.id, "User ID copied.") : this.toast("User ID not found.", "error"); }),
            b("User", "Copy username", () => { const d = this.getProfileData(popout); d.username ? this.copyText(d.username, "Username copied.") : this.toast("Username not found.", "error"); }),
            b("Link", "Copy profile link", () => { const d = this.getProfileData(popout); d.id ? this.copyText(`https://discord.com/users/${d.id}`, "Profile link copied.") : this.toast("Profile link needs a user ID.", "error"); }),
            b("Avatar", "View avatar", () => this.openProfileImage(popout, "avatar")),
            b("Banner", "View banner", () => this.openProfileImage(popout, "banner")),
            b("Song", "Open Spotify link", () => { const l = this.getSpotifyLink(popout); l ? window.open(l, "_blank") : this.toast("Spotify link not found.", "error"); }),
            b("Note", "Private local note", () => this.toggleNotePanel(popout)),
            b("Tag", "Private local tags", () => this.toggleNotePanel(popout))
        );
        popout.appendChild(tools); this.updateProfileTools(popout);
    }

    updateProfileTools(popout) {
        const d = this.getProfileData(popout); const tools = popout.querySelector(".ambient-profile-tools"); if (!tools) return;
        const [ci, cn, cl, av, bn, sp] = tools.querySelectorAll(".ambient-profile-tool");
        if (ci) ci.disabled = !d.id; if (cn) cn.disabled = !d.username; if (cl) cl.disabled = !d.id;
        if (av) av.disabled = !this.getProfileImageUrl(popout, "avatar");
        if (bn) bn.disabled = !this.getProfileImageUrl(popout, "banner");
        if (sp) sp.disabled = !this.getSpotifyLink(popout);
    }

    createToolButton(label, title, onClick) {
        const b = document.createElement("button"); b.className = "ambient-profile-tool"; b.type = "button"; b.textContent = label; b.title = title;
        b.addEventListener("click", e => { e.preventDefault(); e.stopPropagation(); onClick(); }); return b;
    }

    openProfileImage(popout, type) {
        const url = this.getProfileImageUrl(popout, type);
        if (!url) {
            this.toast(`${type === "banner" ? "Banner" : "Avatar"} not found.`, "error");
            return;
        }
        window.open(url, "_blank");
    }

    getProfileImageUrl(popout, type = "avatar") {
        const el = type === "banner" ? this.findProfileBannerElement(popout) : this.findProfileAvatarElement(popout);
        const url = this.extractImageUrl(el);
        return url ? this.upscaleDiscordImage(url) : "";
    }

    findProfileAvatarElement(popout) {
        return this.findFirstMatchingElement(popout, [
            '[class*="avatar_"] img[src]',
            '[class*="avatarWrapper_"] img[src]',
            '[class*="userAvatar_"] img[src]',
            'svg foreignObject img[src]',
            'img[class*="avatar"][src]',
            'img[src*="/avatars/"]'
        ]);
    }

    findProfileBannerElement(popout) {
        return this.findFirstMatchingElement(popout, [
            '[class*="profileBanner_"] img[src]',
            '[class*="banner_"] img[src]',
            '[class*="profileBanner_"][style*="url("]',
            '[class*="banner_"][style*="url("]',
            '[style*="/banners/"]',
            'img[src*="/banners/"]'
        ]);
    }

    findFirstMatchingElement(root, selectors) {
        for (const selector of selectors) {
            const el = root.querySelector?.(selector);
            if (el) return el;
        }
        return null;
    }

    extractImageUrl(el) {
        if (!el) return "";
        if (el.currentSrc || el.src) return el.currentSrc || el.src;
        const srcset = el.getAttribute?.("srcset");
        if (srcset) return srcset.split(",").map(part => part.trim().split(/\s+/)[0]).filter(Boolean).pop() || "";
        const style = el.getAttribute?.("style") || "";
        const match = style.match(/url\((['"]?)(.*?)\1\)/i);
        return match?.[2] || "";
    }

    upscaleDiscordImage(url) {
        try {
            const u = new URL(url, location.href);
            if (u.hostname.includes("discordapp.") || u.hostname.includes("discordapp.net") || u.hostname.includes("discord.com")) {
                u.searchParams.set("size", "4096");
                return u.href;
            }
        } catch { }
        return url;
    }

    // ─── Note panel ──────────────────────────────────────────────────────────────

    toggleNotePanel(popout) {
        let p = popout.querySelector(".ambient-profile-note"); if (!p) p = this.createNotePanel(popout);
        p.hidden = !p.hidden; this.renderProfileTags(popout); if (!p.hidden) p.querySelector("textarea")?.focus();
    }

    createNotePanel(popout) {
        const panel = document.createElement("div"); panel.className = "ambient-profile-note"; panel.hidden = true;
        const ta = document.createElement("textarea"); ta.spellcheck = false; ta.placeholder = "Private note for this profile...";
        const ti = document.createElement("input"); ti.className = "ambient-profile-tag-input"; ti.type = "text"; ti.spellcheck = false; ti.placeholder = "tags: friend, staff, trade";
        const tl = document.createElement("label"); tl.className = "ambient-profile-note-label"; tl.textContent = "Local tags";
        const footer = document.createElement("div"); footer.className = "ambient-profile-note-footer";
        const status = document.createElement("span"); status.textContent = "Saved locally";
        const clear = document.createElement("button"); clear.className = "ambient-profile-note-clear"; clear.type = "button"; clear.textContent = "Clear";
        footer.append(status, clear); panel.append(ta, tl, ti, footer); popout.appendChild(panel);
        const refresh = () => { const k = this.getNoteKey(popout); ta.value = k ? this.getNotes()[k] || "" : ""; ti.value = k ? (this.getTags()[k] || []).join(", ") : ""; ta.disabled = ti.disabled = !k; status.textContent = k ? "Saved locally" : "Profile key not found"; };
        ta.addEventListener("input", () => { const k = this.getNoteKey(popout); if (!k) return; const n = this.getNotes(); const v = ta.value.trim(); v ? n[k] = ta.value : delete n[k]; this.saveNotes(n); status.textContent = "Saved"; });
        ti.addEventListener("input", () => { const k = this.getNoteKey(popout); if (!k) return; const t = this.getTags(); const v = this.parseTags(ti.value); v.length ? t[k] = v : delete t[k]; this.saveTags(t); this.renderProfileTags(popout); status.textContent = "Saved"; });
        clear.addEventListener("click", () => { const k = this.getNoteKey(popout); if (!k) return; const n = this.getNotes(), t = this.getTags(); delete n[k]; delete t[k]; this.saveNotes(n); this.saveTags(t); ta.value = ti.value = ""; this.renderProfileTags(popout); status.textContent = "Cleared"; });
        refresh(); return panel;
    }

    getProfileData(p) { return { id: this.extractUserId(p), username: this.extractUsername(p) }; }

    extractUserId(popout) {
        const vals = [];
        popout.querySelectorAll("img[src],source[srcset],a[href]").forEach(el => vals.push(el.src, el.srcset, el.href));
        popout.querySelectorAll("[style]").forEach(el => vals.push(el.getAttribute("style")));
        for (const v of vals.filter(Boolean)) { const m = String(v).match(/(?:avatars|banners)\/(\d{16,22})\//); if (m) return m[1]; }
        return "";
    }

    extractUsername(popout) {
        for (const sel of ['[class*="nickname_"]', '[class*="username_"]', '[class*="userTag_"]', 'h1', '[aria-label*="profile"]']) {
            const el = popout.querySelector(sel); const text = el?.textContent?.trim(); if (text && text.length <= 80) return text;
            const label = el?.getAttribute?.("aria-label")?.trim(); if (label && label.length <= 80) return label;
        }
        return "";
    }

    getSpotifyLink(p) { return p.querySelector('a[href*="open.spotify.com"],a[href*="spotify.link"]')?.href || ""; }
    getNoteKey(p) { const d = this.getProfileData(p); return d.id ? `id:${d.id}` : d.username ? `name:${d.username.toLowerCase()}` : ""; }
    getNotes() { return BdApi.Data.load(PLUGIN_NAME, "profileNotes") || {}; }
    saveNotes(n) { BdApi.Data.save(PLUGIN_NAME, "profileNotes", n); }
    getTags() { return BdApi.Data.load(PLUGIN_NAME, "profileTags") || {}; }
    saveTags(t) { BdApi.Data.save(PLUGIN_NAME, "profileTags", t); }
    parseTags(v) { return Array.from(new Set(String(v).split(",").map(t => t.trim()).filter(Boolean).map(t => t.slice(0, 20)))).slice(0, 6); }

    renderProfileTags(popout) {
        popout.querySelector(".ambient-profile-tags")?.remove();
        const panel = popout.querySelector(".ambient-profile-note"); if (panel && !panel.hidden) return;
        const key = this.getNoteKey(popout); const tags = key ? this.getTags()[key] || [] : []; if (!tags.length) return;
        const row = document.createElement("div"); row.className = "ambient-profile-tags";
        for (const tag of tags) { const chip = document.createElement("span"); chip.className = "ambient-profile-tag"; chip.textContent = chip.title = tag; row.appendChild(chip); }
        popout.appendChild(row);
    }

    polishSpotifyCards(popout) {
        popout.querySelectorAll('img[src*="i.scdn.co"],img[src*="spotify"]').forEach(img => {
            const card = this.findSpotifyCard(img, popout); if (card) card.classList.add("ambient-spotify-card");
        });
    }

    findSpotifyCard(img, popout) {
        let best = img.parentElement, cur = img.parentElement;
        for (let i = 0; i < 8 && cur && cur !== popout; i++) {
            const text = (cur.textContent || "").toLowerCase(), rect = cur.getBoundingClientRect?.();
            if (text.includes("spotify") || text.includes("dinliyor") || (rect && rect.width > 220 && rect.height > 70)) best = cur;
            cur = cur.parentElement;
        }
        return best && best !== img.parentElement ? best : img.closest('[class*="activity_"],[class*="card_"],[class*="section_"]') || best;
    }

    // ─── Message enhancements ────────────────────────────────────────────────────

    scanExistingMessageEnhancements() { this.enhanceMessageNode(document); }
    enhanceMessageNode(root) { this.enhanceLinks(root); this.enhanceCodeBlocks(root); }

    enhanceLinks(root) {
        const anchors = [];
        if (root.matches?.("a[href]")) anchors.push(root);
        root.querySelectorAll?.("a[href]").forEach(a => anchors.push(a));
        for (const a of anchors) this.enhanceLink(a);
    }

    enhanceLink(anchor) {
        if (anchor.classList.contains("ambient-enhanced-link")) return;
        if (!anchor.closest(LINK_SCOPE_SELECTORS)) return;
        if (anchor.closest(".ambient-link-tools,.ambient-profile-tools,.ambient-profile-note")) return;
        if (anchor.querySelector("img,video,canvas,svg")) return;
        const url = this.parseHttpUrl(anchor.href); if (!url) return;
        const domain = this.getDisplayDomain(url); if (!domain || domain === "discord.com") return;
        const risk = this.getLinkRisk(url);
        anchor.classList.add("ambient-enhanced-link"); anchor.dataset.ambientDomain = domain; anchor.dataset.ambientRisk = risk;
        const tools = document.createElement("span"); tools.className = "ambient-link-tools"; tools.contentEditable = "false";
        const badge = document.createElement("span"); badge.className = "ambient-link-domain"; badge.dataset.ambientRisk = risk;
        badge.textContent = risk === "safe" ? domain : `! ${domain}`; badge.title = this.getLinkRiskTitle(url, risk);
        const copy = document.createElement("button"); copy.className = "ambient-link-copy"; copy.type = "button"; copy.textContent = "Copy"; copy.title = "Copy link";
        copy.addEventListener("click", e => { e.preventDefault(); e.stopPropagation(); this.copyText(url.href, "Link copied."); });
        tools.append(badge, copy); anchor.insertAdjacentElement("afterend", tools);
    }

    parseHttpUrl(href) { try { const u = new URL(href); return (u.protocol === "http:" || u.protocol === "https:") ? u : null; } catch { return null; } }
    getDisplayDomain(url) { return url.hostname.replace(/^www\./i, "").toLowerCase(); }
    getLinkRisk(url) { const d = this.getDisplayDomain(url); if (SUSPICIOUS_DOMAINS.has(d)) return "danger"; if (d.startsWith("xn--")) return "warn"; if (/^\d{1,3}(?:\.\d{1,3}){3}$/.test(d)) return "warn"; if (d.split(".").length > 3) return "warn"; return "safe"; }
    getLinkRiskTitle(url, risk) { if (risk === "danger") return `Risky shortener/logger style domain: ${url.href}`; if (risk === "warn") return `Check this domain before opening: ${url.href}`; return url.href; }

    enhanceCodeBlocks(root) {
        const blocks = []; if (root.matches?.("pre")) blocks.push(root); root.querySelectorAll?.("pre").forEach(b => blocks.push(b));
        for (const block of blocks) {
            if (!block.closest(LINK_SCOPE_SELECTORS)) continue; if (block.classList.contains("ambient-enhanced-code")) continue;
            const text = this.extractCodeText(block); if (!text) continue;
            block.classList.add("ambient-enhanced-code");
            const btn = document.createElement("button"); btn.className = "ambient-code-copy"; btn.type = "button"; btn.textContent = "Copy"; btn.title = "Copy code block";
            btn.addEventListener("click", e => { e.preventDefault(); e.stopPropagation(); this.copyText(this.extractCodeText(block), "Code copied."); });
            block.appendChild(btn);
        }
    }

    extractCodeText(block) { const code = block.querySelector("code"); const src = code || block.cloneNode(true); src.querySelector?.(".ambient-code-copy")?.remove(); return this.normalizeCopiedText(src.innerText || src.textContent || ""); }

    handleShiftClickCopy(event) {
        if (!event.shiftKey || event.button !== 0) return; if (this.isInteractiveTarget(event.target)) return;
        const msg = event.target?.closest?.('[id^="chat-messages-"],[class*="message_"]');
        if (!msg || msg.closest('[class*="messagesPopout_"],[class*="searchResult_"]')) return;
        const content = this.extractMessageText(msg); if (!content) return;
        event.preventDefault(); event.stopPropagation(); this.copyText(content, "Message copied.");
    }

    isInteractiveTarget(target) { return Boolean(target?.closest?.("a,button,input,textarea,select,[role='button'],[contenteditable='true'],.ambient-profile-tools,.ambient-profile-note")); }

    extractMessageText(message) {
        const c = message.querySelector('[class*="messageContent_"]');
        if (c) return this.normalizeCopiedText(c.innerText || c.textContent || "");
        return Array.from(message.querySelectorAll('[class*="markup_"],[class*="embedDescription_"],[class*="embedTitle_"]')).map(el => this.normalizeCopiedText(el.innerText || el.textContent || "")).filter(Boolean).join("\n");
    }

    normalizeCopiedText(text) { return text.replace(/\u200B/g, "").replace(/\n{3,}/g, "\n\n").trim(); }

    async copyText(text, message) {
        try { await navigator.clipboard.writeText(text); }
        catch { const ta = document.createElement("textarea"); ta.value = text; ta.style.cssText = "position:fixed;opacity:0;"; document.body.appendChild(ta); ta.select(); document.execCommand("copy"); ta.remove(); }
        this.toast(message, "success");
    }

    toast(message, type = "info") { BdApi.UI?.showToast?.(message, { type }); }

    parseCssColor(value) {
        if (!value || value.includes("transparent")) return null;
        const m = value.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i); if (m) return m.slice(1, 4).map(Number);
        const h = value.trim().match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i); if (!h) return null;
        const hex = h[1].length === 3 ? h[1].split("").map(c => c + c).join("") : h[1];
        return [0, 2, 4].map(i => parseInt(hex.slice(i, i + 2), 16));
    }
};
