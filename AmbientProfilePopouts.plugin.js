/**
 * @name AmbientProfilePopouts
 * @author s7lace
 * @version 2.4.0
 * @description New: Adds adaptive ambient glow, profile tools, per-area animation system, and optional platform (desktop/mobile/web) indicators to Discord with a premium live-preview settings dashboard. animasyon stilleri ve hızları için canlı önizleme sistemi içeren gelişmiş bir profil kartı eklentisi.
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

// ─── Platform Indicators (APlatformIndicators entegrasyonu) ─────────────────
// Kullanıcının o an hangi cihazdan (masaüstü/mobil/web) bağlı olduğunu Discord'un
// kendi PresenceStore'undan (clientStatus) okuyup küçük ikonlarla gösterir.

const MESSAGE_ROW_SELECTOR = '[id^="chat-messages-"] [class*="message_"]';

const PLATFORM_ORDER = ["desktop", "mobile", "web"];

const PLATFORM_LABELS = { desktop: "Masaüstü", mobile: "Mobil", web: "Web / Tarayıcı" };

const PLATFORM_STATUS_LABELS = { online: "çevrimiçi", idle: "boşta", dnd: "rahatsız etmeyin", offline: "çevrimdışı", invisible: "görünmez" };

// Basit, orijinal geometrik SVG glyph'ler (herhangi bir ikon setinden kopyalanmadı).
const PLATFORM_ICONS = {
    desktop: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="2.5" y="4" width="19" height="13" rx="1.6"></rect><rect x="8.5" y="19" width="7" height="1.6" rx="0.8"></rect></svg>',
    mobile: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="7" y="2" width="10" height="20" rx="2.4"></rect></svg>',
    web: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9.2"></circle><ellipse cx="12" cy="12" rx="4.4" ry="9.2" fill="none" stroke="currentColor" stroke-width="1.4" opacity="0.6"></ellipse><rect x="2.8" y="11.2" width="18.4" height="1.5" opacity="0.6"></rect></svg>'
};

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

// ANIM_AREAS and LAYOUT_ANIM_AREAS are derived from AREA_CONFIG (defined below)
// See AREA_CONFIG for selector, label, and metadata per area

const AREA_CONFIG = {
    messages: {
        label: "Mesaj Girişi", shortLabel: "Mesaj",
        description: "Sohbet mesajlarının görünme animasyonu",
        selector: '[id^="chat-messages-"] [class*="message_"]:not(.amb-done)',
        supportsStagger: true, previewType: "messages", group: "home"
    },
    channelSwitch: {
        label: "Kanal Değiştirme", shortLabel: "Kanal",
        description: "Kanal değiştirirken geçiş animasyonu",
        selector: '[class*="chat_"],[class*="chatContent_"]',
        supportsStagger: false, previewType: "channelSwitch", group: "layout"
    },
    serverSwitch: {
        label: "Sunucu Değiştirme", shortLabel: "Sunucu",
        description: "Sunucu değiştirirken geçiş animasyonu",
        selector: '[class*="guilds_"],[class*="guildsList_"]',
        supportsStagger: false, previewType: "serverSwitch", group: "layout"
    },
    sidebar: {
        label: "Sidebar", shortLabel: "Sidebar",
        description: "Sol sidebar'ın görünüme animasyonu",
        selector: '[class*="sidebar_"],[class*="panels_"]',
        supportsStagger: false, previewType: "sidebar", group: "layout"
    },
    memberSidebar: {
        label: "Member Sidebar", shortLabel: "Member",
        description: "Sağ member sidebar'ın görünüme animasyonu",
        selector: '[class*="membersWrap_"],[class*="members_"]',
        supportsStagger: false, previewType: "memberSidebar", group: "layout"
    },
    modals: {
        label: "Modal & Popout", shortLabel: "Modal",
        description: "Modal pencerelerinin ve profil popout'ların animasyonu",
        selector: '[class*="modal_"],[class*="layer_"],[class*="userPopoutOuter_"]',
        supportsStagger: false, previewType: "modals", group: "surfaces"
    },
    emojiPicker: {
        label: "Emoji & Reaction Picker", shortLabel: "Emoji",
        description: "Emoji picker ve reaction picker'ın animasyonu",
        selector: '[class*="emojiPicker_"],[class*="reactionPicker_"]',
        supportsStagger: false, previewType: "emojiPicker", group: "surfaces"
    },
    toasts: {
        label: "Bildirim Toast'ları", shortLabel: "Toast",
        description: "Bildirim toast'larının (sağ üst bildirimler) animasyonu",
        selector: '[class*="toast_"],[class*="toastItem_"],[class*="notice_"]',
        supportsStagger: false, previewType: "toasts", group: "surfaces"
    },
    contextMenu: {
        label: "Sağ Tık Menüsü", shortLabel: "Menü",
        description: "Sağ tık menülerinin açılış animasyonu",
        selector: '[class*="menu_"][role="menu"]',
        supportsStagger: false, previewType: "contextMenu", group: "surfaces"
    },
    channelList: {
        label: "Kanal Listesi", shortLabel: "Kanal",
        description: "Kanal listesi ve DM satirlari. Cok hareketli hissettirebildigi icin layout toggle kapaliyken calismaz.",
        selector: '[class*="channel_"],[class*="containerDefault_"]',
        supportsStagger: false, previewType: "channelList", group: "layout"
    },
    memberList: {
        label: "Üye Listesi", shortLabel: "Uye",
        description: "Sag uye listesi satirlari. Layout toggle kapaliyken calismaz.",
        selector: '[class*="member_"],[class*="memberInner_"]',
        supportsStagger: false, previewType: "memberList", group: "layout"
    },
    searchResults: {
        label: "Arama Sonuçları", shortLabel: "Arama",
        description: "Arama sonuclari ve gruplari. Layout toggle kapaliyken calismaz.",
        selector: '[class*="searchResult_"],[class*="searchResultGroup_"]',
        supportsStagger: false, previewType: "searchResults", group: "layout"
    },
    userProfile: {
        label: "Kullanıcı Profil Kartı", shortLabel: "Profil",
        description: "Profil kartlari. Layout toggle kapaliyken calismaz.",
        selector: '[class*="userProfileOuter_"],[class*="profileOuter_"]',
        supportsStagger: false, previewType: "userProfile", group: "surfaces"
    },
    statusBar: {
        label: "Durum Çubuğu", shortLabel: "Panel",
        description: "Sol alttaki kullanici paneli. Layout toggle kapaliyken calismaz.",
        selector: '[class*="panels_"] > [class*="container_"]',
        supportsStagger: false, previewType: "statusBar", group: "layout"
    }
};

// Derive ANIM_AREAS as a simple Set of area keys for backward compat
const ANIM_AREAS = new Set(Object.keys(AREA_CONFIG));

// Derive layout areas from AREA_CONFIG entries where group === "layout"
const LAYOUT_ANIM_AREAS = new Set(
    Object.entries(AREA_CONFIG).filter(([, cfg]) => cfg.group === "layout").map(([key]) => key)
);

// Direction mappings for enter/exit animations
const ENTER_DIR_MAP = { vertical: "slide-up", horizontal: "slide-right" };
const EXIT_DIR_MAP = { vertical: "slide-down", horizontal: "slide-left" };

// Discord tarafından açılış anında ölçülüp konumlandırılan popout alanları.
// Animasyonun 0% karesindeki transform (scale vb.) getBoundingClientRect ölçümünü
// bozup menünün yanlış yerde belirmesine yol açar; bu alanlarda animasyon
// 1 frame gecikmeli başlatılır ve o sırada element opacity:0 ile gizlenir.
const POSITION_SENSITIVE_AREAS = new Set(["contextMenu", "emojiPicker", "modals", "userProfile"]);

const PREVIEW_TEMPLATES = {
    messages: `
        <div class="amb-animated-preview-item" style="opacity:0; display:flex; align-items:flex-start; gap:10px; padding:8px 12px; background:#2b2d31; border-radius:8px; margin-bottom:6px; width:300px;">
            <div style="width:36px; height:36px; border-radius:50%; background:#5865f2; flex-shrink:0;"></div>
            <div style="flex:1;">
                <div style="height:10px; width:80px; background:#b5bac1; border-radius:4px; margin-bottom:6px;"></div>
                <div style="height:8px; width:180px; background:#6d6f78; border-radius:4px; margin-bottom:4px;"></div>
                <div style="height:8px; width:140px; background:#6d6f78; border-radius:4px;"></div>
            </div>
        </div>
        <div class="amb-animated-preview-item" style="opacity:0; display:flex; align-items:flex-start; gap:10px; padding:8px 12px; background:#2b2d31; border-radius:8px; margin-bottom:6px; width:300px;">
            <div style="width:36px; height:36px; border-radius:50%; background:#eb4549; flex-shrink:0;"></div>
            <div style="flex:1;">
                <div style="height:10px; width:100px; background:#b5bac1; border-radius:4px; margin-bottom:6px;"></div>
                <div style="height:8px; width:160px; background:#6d6f78; border-radius:4px; margin-bottom:4px;"></div>
                <div style="height:8px; width:120px; background:#6d6f78; border-radius:4px;"></div>
            </div>
        </div>
        <div class="amb-animated-preview-item" style="opacity:0; display:flex; align-items:flex-start; gap:10px; padding:8px 12px; background:#2b2d31; border-radius:8px; width:300px;">
            <div style="width:36px; height:36px; border-radius:50%; background:#57f287; flex-shrink:0;"></div>
            <div style="flex:1;">
                <div style="height:10px; width:90px; background:#b5bac1; border-radius:4px; margin-bottom:6px;"></div>
                <div style="height:8px; width:200px; background:#6d6f78; border-radius:4px;"></div>
            </div>
        </div>
    `,
    channelSwitch: `
        <div class="amb-animated-preview-item" style="opacity:0; display:flex; gap:0; width:320px; height:140px; border-radius:8px; overflow:hidden; box-shadow:0 4px 16px rgba(0,0,0,0.25);">
            <div style="width:60px; background:#2b2d31; display:flex; flex-direction:column; gap:6px; padding:10px 6px; align-items:stretch;">
                <div style="height:6px; background:#5865f2; border-radius:3px; width:80%; margin:0 auto;"></div>
                <div style="height:4px; background:#4e5058; border-radius:2px; width:70%; margin:0 auto;"></div>
                <div style="height:4px; background:#4e5058; border-radius:2px; width:60%; margin:0 auto;"></div>
                <div style="height:4px; background:#4e5058; border-radius:2px; width:75%; margin:0 auto;"></div>
            </div>
            <div style="flex:1; background:#313338; padding:12px; display:flex; flex-direction:column; gap:8px;">
                <div style="height:12px; background:#b5bac1; border-radius:4px; width:50%;"></div>
                <div style="height:8px; background:#6d6f78; border-radius:4px; width:85%;"></div>
                <div style="height:8px; background:#6d6f78; border-radius:4px; width:70%;"></div>
                <div style="height:8px; background:#6d6f78; border-radius:4px; width:60%;"></div>
            </div>
        </div>
    `,
    serverSwitch: `
        <div style="display:flex; gap:10px; align-items:center;">
            <div class="amb-animated-preview-item" style="opacity:0; width:48px; height:48px; background:#5865f2; border-radius:14px; box-shadow:0 2px 8px rgba(88,101,242,0.4);"></div>
            <div class="amb-animated-preview-item" style="opacity:0; width:48px; height:48px; background:#313338; border-radius:50%;"></div>
            <div class="amb-animated-preview-item" style="opacity:0; width:48px; height:48px; background:#313338; border-radius:14px;"></div>
            <div class="amb-animated-preview-item" style="opacity:0; width:48px; height:48px; background:#2b2d31; border-radius:50%;"></div>
        </div>
    `,
    sidebar: `
        <div style="display:flex; align-items:stretch; justify-content:flex-start; width:100%; height:100%;">
            <div class="amb-animated-preview-item" style="opacity:0; width:80px; height:100%; background:#2b2d31; border-radius:6px; display:flex; flex-direction:column; gap:8px; padding:10px;">
                <div style="height:8px; background:#b5bac1; border-radius:4px; width:80%;"></div>
                <div style="height:6px; background:#4e5058; border-radius:3px; width:60%;"></div>
                <div style="height:6px; background:#4e5058; border-radius:3px; width:90%;"></div>
                <div style="height:6px; background:#4e5058; border-radius:3px; width:70%;"></div>
                <div style="height:6px; background:#4e5058; border-radius:3px; width:50%;"></div>
            </div>
        </div>
    `,
    memberSidebar: `
        <div style="display:flex; align-items:stretch; justify-content:flex-end; width:100%; height:100%;">
            <div class="amb-animated-preview-item" style="opacity:0; width:90px; height:100%; background:#2b2d31; border-radius:6px; display:flex; flex-direction:column; gap:10px; padding:10px;">
                <div style="display:flex; gap:6px; align-items:center;">
                    <div style="width:20px; height:20px; background:#5865f2; border-radius:50%; flex-shrink:0;"></div>
                    <div style="height:6px; background:#b5bac1; border-radius:3px; flex:1;"></div>
                </div>
                <div style="display:flex; gap:6px; align-items:center;">
                    <div style="width:20px; height:20px; background:#eb4549; border-radius:50%; flex-shrink:0;"></div>
                    <div style="height:6px; background:#b5bac1; border-radius:3px; flex:1;"></div>
                </div>
                <div style="display:flex; gap:6px; align-items:center;">
                    <div style="width:20px; height:20px; background:#57f287; border-radius:50%; flex-shrink:0;"></div>
                    <div style="height:6px; background:#b5bac1; border-radius:3px; flex:1;"></div>
                </div>
            </div>
        </div>
    `,
    modals: `
        <div class="amb-animated-preview-item" style="opacity:0; width:260px; background:#313338; border-radius:8px; overflow:hidden; box-shadow:0 8px 24px rgba(0,0,0,0.4);">
            <div style="height:32px; background:#2b2d31; display:flex; align-items:center; padding:0 12px;">
                <div style="height:8px; width:60px; background:#b5bac1; border-radius:4px;"></div>
            </div>
            <div style="padding:12px;">
                <div style="height:8px; width:90%; background:#6d6f78; border-radius:4px; margin-bottom:6px;"></div>
                <div style="height:8px; width:70%; background:#6d6f78; border-radius:4px; margin-bottom:12px;"></div>
                <div style="display:flex; gap:6px; justify-content:flex-end;">
                    <div style="height:24px; width:50px; background:#4e5058; border-radius:4px;"></div>
                    <div style="height:24px; width:50px; background:#5865f2; border-radius:4px;"></div>
                </div>
            </div>
        </div>
    `,
    emojiPicker: `
        <div class="amb-animated-preview-item" style="opacity:0; width:200px; height:160px; background:#2b2d31; border-radius:8px; padding:10px; box-shadow:0 4px 16px rgba(0,0,0,0.3); display:flex; flex-direction:column; gap:8px;">
            <div style="height:20px; background:#1e1f22; border-radius:4px; width:100%;"></div>
            <div style="display:grid; grid-template-columns:repeat(6,1fr); gap:4px; flex:1;">
                <div style="background:#eeb428; border-radius:4px; aspect-ratio:1;"></div>
                <div style="background:#ed4245; border-radius:4px; aspect-ratio:1;"></div>
                <div style="background:#57f287; border-radius:4px; aspect-ratio:1;"></div>
                <div style="background:#5865f2; border-radius:4px; aspect-ratio:1;"></div>
                <div style="background:#eb4549; border-radius:4px; aspect-ratio:1;"></div>
                <div style="background:#fee75c; border-radius:4px; aspect-ratio:1;"></div>
                <div style="background:#5865f2; border-radius:4px; aspect-ratio:1;"></div>
                <div style="background:#ed4245; border-radius:4px; aspect-ratio:1;"></div>
                <div style="background:#57f287; border-radius:4px; aspect-ratio:1;"></div>
                <div style="background:#eeb428; border-radius:4px; aspect-ratio:1;"></div>
                <div style="background:#fee75c; border-radius:4px; aspect-ratio:1;"></div>
                <div style="background:#eb4549; border-radius:4px; aspect-ratio:1;"></div>
            </div>
        </div>
    `,
    toasts: `
        <div style="display:flex; align-items:flex-end; justify-content:flex-end; width:100%; height:100%;">
            <div class="amb-animated-preview-item" style="opacity:0; width:220px; background:#23a559; border-radius:6px; display:flex; align-items:center; padding:8px 12px; gap:8px; box-shadow:0 4px 12px rgba(0,0,0,0.3);">
                <div style="width:18px; height:18px; background:#fff; border-radius:50%; opacity:0.9; flex-shrink:0;"></div>
                <div style="flex:1;">
                    <div style="height:8px; background:#fff; border-radius:4px; width:80%; opacity:0.95; margin-bottom:4px;"></div>
                    <div style="height:6px; background:#fff; border-radius:3px; width:60%; opacity:0.7;"></div>
                </div>
            </div>
        </div>
    `,
    contextMenu: `
        <div class="amb-animated-preview-item" style="opacity:0; width:160px; background:#111214; border-radius:6px; padding:6px; display:flex; flex-direction:column; gap:2px; box-shadow:0 8px 24px rgba(0,0,0,0.4);">
            <div style="height:20px; background:#5865f2; border-radius:3px; width:100%; display:flex; align-items:center; padding:0 8px;"><div style="height:6px; width:60%; background:#fff; border-radius:3px; opacity:0.9;"></div></div>
            <div style="height:20px; background:transparent; border-radius:3px; width:100%; display:flex; align-items:center; padding:0 8px;"><div style="height:6px; width:70%; background:#b5bac1; border-radius:3px;"></div></div>
            <div style="height:1px; background:#2b2d31; width:100%; margin:2px 0;"></div>
            <div style="height:20px; background:transparent; border-radius:3px; width:100%; display:flex; align-items:center; padding:0 8px;"><div style="height:6px; width:50%; background:#b5bac1; border-radius:3px;"></div></div>
            <div style="height:20px; background:transparent; border-radius:3px; width:100%; display:flex; align-items:center; padding:0 8px;"><div style="height:6px; width:65%; background:#b5bac1; border-radius:3px;"></div></div>
        </div>
    `,
    channelList: `
        <div style="display:flex; flex-direction:column; gap:4px; width:100%;">
            <div class="amb-animated-preview-item" style="opacity:0; height:24px; background:#2b2d31; border-radius:4px; width:75%; display:flex; align-items:center; padding:0 8px; gap:8px;">
                <div style="width:12px; height:12px; background:#80848e; border-radius:50%; flex-shrink:0;"></div>
                <div style="height:6px; background:#80848e; border-radius:3px; width:60%;"></div>
            </div>
            <div class="amb-animated-preview-item" style="opacity:0; height:24px; background:#2b2d31; border-radius:4px; width:90%; display:flex; align-items:center; padding:0 8px; gap:8px;">
                <div style="width:12px; height:12px; background:#80848e; border-radius:50%; flex-shrink:0;"></div>
                <div style="height:6px; background:#80848e; border-radius:3px; width:50%;"></div>
            </div>
            <div class="amb-animated-preview-item" style="opacity:0; height:24px; background:#2b2d31; border-radius:4px; width:65%; display:flex; align-items:center; padding:0 8px; gap:8px;">
                <div style="width:12px; height:12px; background:#80848e; border-radius:50%; flex-shrink:0;"></div>
                <div style="height:6px; background:#80848e; border-radius:3px; width:70%;"></div>
            </div>
        </div>
    `,
    memberList: `
        <div style="display:flex; flex-direction:column; gap:6px; align-items:flex-end; width:100%;">
            <div class="amb-animated-preview-item" style="opacity:0; height:32px; background:#2b2d31; border-radius:16px; width:85%; display:flex; align-items:center; padding:0 8px; gap:8px;">
                <div style="width:20px; height:20px; background:#5865f2; border-radius:50%; flex-shrink:0;"></div>
                <div style="height:8px; background:#b5bac1; border-radius:4px; width:50%;"></div>
            </div>
            <div class="amb-animated-preview-item" style="opacity:0; height:32px; background:#2b2d31; border-radius:16px; width:95%; display:flex; align-items:center; padding:0 8px; gap:8px;">
                <div style="width:20px; height:20px; background:#ed4245; border-radius:50%; flex-shrink:0;"></div>
                <div style="height:8px; background:#b5bac1; border-radius:4px; width:60%;"></div>
            </div>
            <div class="amb-animated-preview-item" style="opacity:0; height:32px; background:#2b2d31; border-radius:16px; width:80%; display:flex; align-items:center; padding:0 8px; gap:8px;">
                <div style="width:20px; height:20px; background:#57f287; border-radius:50%; flex-shrink:0;"></div>
                <div style="height:8px; background:#b5bac1; border-radius:4px; width:45%;"></div>
            </div>
        </div>
    `,
    searchResults: `
        <div style="display:flex; flex-direction:column; gap:8px; width:100%; height:100%; overflow:hidden;">
            <div class="amb-animated-preview-item" style="opacity:0; background:#2b2d31; border-radius:6px; padding:10px; border-left:3px solid #5865f2;">
                <div style="height:6px; background:#949ba4; border-radius:3px; width:40%; margin-bottom:6px;"></div>
                <div style="height:8px; background:#dbdee1; border-radius:4px; width:85%; margin-bottom:4px;"></div>
                <div style="height:8px; background:#dbdee1; border-radius:4px; width:60%;"></div>
            </div>
            <div class="amb-animated-preview-item" style="opacity:0; background:#2b2d31; border-radius:6px; padding:10px; border-left:3px solid #5865f2;">
                <div style="height:6px; background:#949ba4; border-radius:3px; width:30%; margin-bottom:6px;"></div>
                <div style="height:8px; background:#dbdee1; border-radius:4px; width:90%; margin-bottom:4px;"></div>
                <div style="height:8px; background:#dbdee1; border-radius:4px; width:70%;"></div>
            </div>
        </div>
    `,
    statusBar: `
        <div style="display:flex; align-items:flex-end; justify-content:center; width:100%; height:100%;">
            <div class="amb-animated-preview-item" style="opacity:0; width:100%; height:28px; background:#232428; border-radius:4px; display:flex; align-items:center; padding:0 10px; justify-content:space-between;">
                <div style="display:flex; gap:8px; align-items:center;">
                    <div style="width:16px; height:16px; background:#5865f2; border-radius:50%;"></div>
                    <div style="height:6px; background:#dbdee1; border-radius:3px; width:50px;"></div>
                </div>
                <div style="display:flex; gap:6px;">
                    <div style="width:12px; height:12px; background:#4e5058; border-radius:50%;"></div>
                    <div style="width:12px; height:12px; background:#4e5058; border-radius:50%;"></div>
                    <div style="width:12px; height:12px; background:#4e5058; border-radius:50%;"></div>
                </div>
            </div>
        </div>
    `,
    userProfile: `
        <div class="amb-animated-preview-item" style="opacity:0; width:220px; background:#232428; border-radius:8px; overflow:hidden; box-shadow:0 8px 24px rgba(0,0,0,0.4);">
            <div style="height:60px; background:linear-gradient(135deg,#5865f2,#eb4549);"></div>
            <div style="position:relative; padding:16px 12px 12px;">
                <div style="position:absolute; top:-20px; left:12px; width:40px; height:40px; background:#111214; border-radius:50%; border:3px solid #232428;"></div>
                <div style="display:flex; flex-direction:column; gap:6px; margin-top:8px;">
                    <div style="height:10px; background:#dbdee1; border-radius:4px; width:60%;"></div>
                    <div style="height:8px; background:#6d6f78; border-radius:4px; width:80%;"></div>
                    <div style="height:8px; background:#6d6f78; border-radius:4px; width:50%;"></div>
                </div>
            </div>
        </div>
    `
};

const SETTINGS_SECTIONS = [
    { id: "home", label: "Ana Sayfa", icon: "home", description: "Animasyonlara genel bakış ve tüm stiller" },
    { id: "servers", label: "Sunucular", icon: "servers", description: "Sunucu bazlı animasyon profilleri" },
    { id: "settings", label: "Genel Ayarlar", icon: "settings", description: "Genel animasyon ve görünüm ayarları" },
];

const SETTINGS_CSS = `
            .amb-settings-panel {
    --amb-card-bg: linear-gradient(135deg, #2b2d31 0%, #232428 100%);
    --amb-accent-bg: linear-gradient(135deg, #5865f2 0%, #4752c4 100%);
    display: flex;

    width: 100%;
    height: 100%;

    overflow: hidden;

    font-family: var(--font-primary, 'gg sans', sans-serif);
    color: #dbdee1;
    background: #2b2d31;

    position: relative;
}
.amb-settings-panel :focus-visible {
    outline: 2px solid #5865f2;
    outline-offset: 2px;
}
.amb-settings-panel :focus:not(:focus-visible) {
    outline: none;
}
.amb-settings-panel ::-webkit-scrollbar { width: 8px; }
.amb-settings-panel ::-webkit-scrollbar-track { background: #2b2d31; }
.amb-settings-panel ::-webkit-scrollbar-thumb { background: #1a1b1e; border-radius: 4px; }

            .amb-modal-container {
                box-shadow: 0 24px 80px rgba(0,0,0,.55), 0 0 0 1px rgba(255,255,255,.06);
            }
            .amb-modal-btn:disabled,
            .amb-toggle-btn:disabled {
                opacity: .55;
                cursor: not-allowed;
                transform: none !important;
            }
            .amb-style-preview {
                border-radius: 8px;
                display: flex;
                align-items: center;
                justify-content: center;
                overflow: hidden;
                position: relative;
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
            .amb-sidebar::-webkit-scrollbar { width: 0; }
            .amb-sidebar::-webkit-scrollbar-track { background: transparent; }
            .amb-sidebar::-webkit-scrollbar-thumb { background: transparent; }
            
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
            .amb-main-content::-webkit-scrollbar { width: 0; }
            .amb-main-content::-webkit-scrollbar-track { background: transparent; }
            .amb-main-content::-webkit-scrollbar-thumb { background: transparent; }
            
            /* Content Sections */
            .amb-content-section { display: none; position: relative; }
            .amb-content-section.active { display: block; }
            
            .amb-section-title {
                font-size: 24px; font-weight: 700; color: #fff; margin-bottom: 8px;
                text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
            }
            .amb-section-desc { 
                font-size: 14px; color: #b5bac1; margin-bottom: 24px; line-height: 1.5;
                padding: 12px 16px 12px 20px;
                background: var(--amb-card-bg);
                border-radius: 8px;
                border: 1px solid #1f2023;
                border-left: 3px solid #5865f2;
            }
            
            /* Area Dropdown List */
            .amb-area-list {
                display: flex;
                flex-direction: column;
                gap: 8px;
                margin-top: 16px;
            }
            .amb-area-row {
                display: flex;
                align-items: center;
                gap: 16px;
                padding: 14px 18px;
                background: var(--amb-card-bg);
                border: 1px solid #1f2023;
                border-radius: 10px;
                transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
            }
            .amb-area-row:hover {
                border-color: #3f4147;
                box-shadow: 0 2px 8px rgba(0,0,0,0.25);
            }
            .amb-area-row-info {
                flex: 1;
                min-width: 0;
            }
            .amb-area-row-label {
                font-size: 14px;
                font-weight: 600;
                color: #dbdee1;
            }
            .amb-area-row-desc {
                font-size: 12px;
                color: #949ba4;
                margin-top: 2px;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }
            .amb-area-row-controls {
                display: flex;
                align-items: center;
                gap: 10px;
                flex-shrink: 0;
            }
            .amb-area-row .amb-style-select {
                width: 200px;
                padding: 8px 12px;
                font-size: 13px;
            }
            .amb-area-row .amb-detail-btn {
                padding: 6px 14px;
                border: 0;
                border-radius: 6px;
                background: #3f4147;
                color: #b5bac1;
                font-size: 12px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.15s ease;
                white-space: nowrap;
            }
            .amb-area-row .amb-detail-btn:hover {
                background: #5865f2;
                color: #fff;
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
                border-radius: 8px;
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
            

            
            /* Settings Elements */
            .amb-setter-row { 
                display: flex; flex-direction: column; gap: 8px; 
                background: var(--amb-card-bg); 
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
                background: var(--amb-accent-bg);
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
            .amb-modal-btn.amb-active {
                background: var(--amb-accent-bg) !important;
                color: #fff !important;
                box-shadow: 0 4px 14px rgba(88, 101, 242, 0.45) !important;
                border-color: rgba(88, 101, 242, 0.6) !important;
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
                background: var(--amb-card-bg); 
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
                background: var(--amb-card-bg);
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
                background: var(--amb-card-bg);
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
                border-radius: 8px;
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
                background: var(--amb-accent-bg);
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

            /* Enter/Exit Config Panel */
            .amb-enter-exit-container {
                display: flex;
                gap: 16px;
                margin-top: 16px;
            }
            .amb-enter-panel,
            .amb-exit-panel {
                flex: 1;
                background: var(--amb-card-bg);
                border: 1px solid #1f2023;
                border-radius: 12px;
                padding: 18px;
                box-shadow: 0 2px 8px rgba(0,0,0,0.2);
                transition: border-color 0.2s ease;
            }
            .amb-enter-panel:hover,
            .amb-exit-panel:hover {
                border-color: #3f4147;
            }
            .amb-enter-panel .amb-panel-header,
            .amb-exit-panel .amb-panel-header {
                font-size: 13px;
                font-weight: 700;
                color: #dbdee1;
                margin-bottom: 14px;
                padding-bottom: 10px;
                border-bottom: 1px solid #1f2023;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }
            .amb-enter-panel .amb-panel-header { color: #57f287; }
            .amb-exit-panel .amb-panel-header { color: #ed4245; }
            .amb-control-row {
                display: flex;
                flex-direction: column;
                gap: 6px;
                margin-bottom: 14px;
            }
            .amb-control-row:last-child { margin-bottom: 0; }
            .amb-control-label {
                font-size: 12px;
                font-weight: 600;
                color: #b5bac1;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            .amb-control-label .amb-val {
                font-weight: 600;
                color: #5865f2;
                background: #5865f220;
                padding: 1px 6px;
                border-radius: 4px;
                font-size: 11px;
            }
            .amb-direction-select,
            .amb-easing-select {
                background: #1e1f22;
                border: 1px solid #1f2023;
                border-radius: 6px;
                color: #dbdee1;
                padding: 7px 10px;
                font-size: 12px;
                font-weight: 500;
                cursor: pointer;
                outline: none;
                width: 100%;
                transition: border-color 0.15s ease;
            }
            .amb-direction-select:hover,
            .amb-easing-select:hover {
                border-color: #5865f2;
            }
            .amb-direction-select:focus,
            .amb-easing-select:focus {
                border-color: #5865f2;
                box-shadow: 0 0 0 2px rgba(88,101,242,0.15);
            }
            .amb-direction-select option,
            .amb-easing-select option {
                background: #1e1f22;
                color: #dbdee1;
            }
            .amb-overflow-check {
                display: flex;
                align-items: center;
                gap: 8px;
                cursor: pointer;
                font-size: 12px;
                color: #b5bac1;
                user-select: none;
            }
            .amb-overflow-check input[type="checkbox"] {
                appearance: none;
                -webkit-appearance: none;
                width: 16px;
                height: 16px;
                border: 2px solid #4e5058;
                border-radius: 4px;
                background: #1e1f22;
                cursor: pointer;
                position: relative;
                transition: all 0.15s ease;
                flex-shrink: 0;
            }
            .amb-overflow-check input[type="checkbox"]:checked {
                background: #5865f2;
                border-color: #5865f2;
            }
            .amb-overflow-check input[type="checkbox"]:checked::after {
                content: "✓";
                position: absolute;
                top: -1px;
                left: 2px;
                font-size: 11px;
                color: #fff;
                font-weight: 700;
            }
            .amb-area-header-bar {
                display: flex;
                align-items: center;
                gap: 12px;
                padding: 14px 18px;
                background: var(--amb-card-bg);
                border: 1px solid #1f2023;
                border-radius: 10px;
                margin-bottom: 16px;
            }
            .amb-area-header-bar .amb-area-name {
                flex: 1;
            }
            .amb-area-header-bar .amb-area-name .amb-area-label {
                font-size: 15px;
                font-weight: 700;
                color: #fff;
            }
            .amb-area-header-bar .amb-area-name .amb-area-desc {
                font-size: 12px;
                color: #949ba4;
                margin-top: 2px;
            }
            .amb-bottom-actions {
                display: flex;
                gap: 10px;
                margin-top: 16px;
                align-items: stretch;
            }
            .amb-bottom-actions .amb-preview-wrap {
                flex: 1;
                background: radial-gradient(ellipse at 50% 40%, #232428 0%, #1a1b1e 100%);
                border: 1px solid #2f3136;
                border-radius: 12px;
                overflow: visible;
                display: flex;
                align-items: center;
                justify-content: center;
                flex-direction: column;
                gap: 6px;
                min-height: 200px;
                padding: 20px;
                box-shadow: inset 0 2px 12px rgba(0,0,0,0.3), 0 1px 0 rgba(255,255,255,0.03);
                position: relative;
            }
            .amb-preview-wrap::before {
                content: '';
                position: absolute;
                inset: 0;
                border-radius: 12px;
                background: radial-gradient(circle at 50% 0%, rgba(88,101,242,0.04) 0%, transparent 60%);
                pointer-events: none;
            }
            .amb-bottom-actions .amb-btn-wrap {
                display: flex;
                flex-direction: column;
                gap: 8px;
                flex-shrink: 0;
                min-width: 120px;
            }
            @media (max-width: 700px) {
                .amb-enter-exit-container { flex-direction: column; }
                .amb-bottom-actions { flex-direction: column; }
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
                .amb-area-list { gap: 6px; }
                .amb-preview-toolbar { align-items: stretch; flex-direction: column; }
            }
`;

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
    platformIndicatorsEnabled: false,
    platformIndicatorsProfile: true,
    platformIndicatorsMessages: true,
    platformIndicatorsMemberList: true,
    platformIndicatorsDmList: true,
    serverWhitelist: { enabled: false, guildIds: [] },
    activePreset: "default",
    serverAnimProfiles: {},
    anim: {
        messages: { style: "slide-up", duration: 300, enabled: true, delay: 0, stagger: 30, enterDuration: 300, exitDuration: 200, enterDirection: "auto", exitDirection: "auto", enterEasing: "auto", exitEasing: "auto", enterOverflow: false, exitOverflow: false },
        channelSwitch: { style: "blur", duration: 240, enabled: true, delay: 0, stagger: 0, enterDuration: 240, exitDuration: 160, enterDirection: "auto", exitDirection: "auto", enterEasing: "auto", exitEasing: "auto", enterOverflow: false, exitOverflow: false },
        serverSwitch: { style: "spring", duration: 380, enabled: true, delay: 0, stagger: 0, enterDuration: 380, exitDuration: 220, enterDirection: "auto", exitDirection: "auto", enterEasing: "auto", exitEasing: "auto", enterOverflow: false, exitOverflow: false },
        sidebar: { style: "slide-right", duration: 260, enabled: true, delay: 0, stagger: 0, enterDuration: 260, exitDuration: 180, enterDirection: "auto", exitDirection: "auto", enterEasing: "auto", exitEasing: "auto", enterOverflow: false, exitOverflow: false },
        memberSidebar: { style: "slide-left", duration: 260, enabled: true, delay: 0, stagger: 0, enterDuration: 260, exitDuration: 180, enterDirection: "auto", exitDirection: "auto", enterEasing: "auto", exitEasing: "auto", enterOverflow: false, exitOverflow: false },
        modals: { style: "spring", duration: 360, enabled: true, delay: 0, stagger: 0, enterDuration: 360, exitDuration: 220, enterDirection: "auto", exitDirection: "auto", enterEasing: "auto", exitEasing: "auto", enterOverflow: false, exitOverflow: false },
        emojiPicker: { style: "scale", duration: 220, enabled: true, delay: 0, stagger: 0, enterDuration: 220, exitDuration: 150, enterDirection: "auto", exitDirection: "auto", enterEasing: "auto", exitEasing: "auto", enterOverflow: false, exitOverflow: false },
        toasts: { style: "slide-right", duration: 300, enabled: true, delay: 0, stagger: 0, enterDuration: 300, exitDuration: 200, enterDirection: "auto", exitDirection: "auto", enterEasing: "auto", exitEasing: "auto", enterOverflow: false, exitOverflow: false },
        contextMenu: { style: "scale", duration: 190, enabled: true, delay: 0, stagger: 0, enterDuration: 190, exitDuration: 130, enterDirection: "auto", exitDirection: "auto", enterEasing: "auto", exitEasing: "auto", enterOverflow: false, exitOverflow: false },
        channelList: { style: "slide-up", duration: 240, enabled: true, delay: 0, stagger: 25, enterDuration: 240, exitDuration: 160, enterDirection: "auto", exitDirection: "auto", enterEasing: "auto", exitEasing: "auto", enterOverflow: false, exitOverflow: false },
        memberList: { style: "slide-up", duration: 240, enabled: true, delay: 0, stagger: 25, enterDuration: 240, exitDuration: 160, enterDirection: "auto", exitDirection: "auto", enterEasing: "auto", exitEasing: "auto", enterOverflow: false, exitOverflow: false },
        searchResults: { style: "slide-up", duration: 300, enabled: true, delay: 0, stagger: 45, enterDuration: 300, exitDuration: 200, enterDirection: "auto", exitDirection: "auto", enterEasing: "auto", exitEasing: "auto", enterOverflow: false, exitOverflow: false },
        userProfile: { style: "zoom-in", duration: 380, enabled: true, delay: 0, stagger: 0, enterDuration: 380, exitDuration: 240, enterDirection: "auto", exitDirection: "auto", enterEasing: "auto", exitEasing: "auto", enterOverflow: false, exitOverflow: false },
        statusBar: { style: "slide-up", duration: 200, enabled: true, delay: 0, stagger: 0, enterDuration: 200, exitDuration: 140, enterDirection: "auto", exitDirection: "auto", enterEasing: "auto", exitEasing: "auto", enterOverflow: false, exitOverflow: false },
    }
};

const PRESETS = {
    default: {
        name: "Varsayılan",
        anim: JSON.parse(JSON.stringify(DEFAULT_SETTINGS.anim))
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

// ─── Static Keyframe CSS (injected once, never regenerated) ─────────────────
const ANIM_KEYFRAMES_CSS = `
    /* ── Upgraded: multi-step with subtle overshoot ── */
    @keyframes amb-fade        { 0%{opacity:0;transform:scale(0.97)} 60%{opacity:1;transform:scale(1.01)} 100%{opacity:1;transform:scale(1)} }
    @keyframes amb-slide-up    { 0%{opacity:0;transform:translateY(24px) scale(0.98)} 65%{opacity:1;transform:translateY(-3px) scale(1.01)} 100%{opacity:1;transform:translateY(0) scale(1)} }
    @keyframes amb-slide-down  { 0%{opacity:0;transform:translateY(-24px) scale(0.98)} 65%{opacity:1;transform:translateY(3px) scale(1.01)} 100%{opacity:1;transform:translateY(0) scale(1)} }
    @keyframes amb-slide-left  { 0%{opacity:0;transform:translateX(24px) scale(0.98)} 65%{opacity:1;transform:translateX(-3px) scale(1.01)} 100%{opacity:1;transform:translateX(0) scale(1)} }
    @keyframes amb-slide-right { 0%{opacity:0;transform:translateX(-24px) scale(0.98)} 65%{opacity:1;transform:translateX(3px) scale(1.01)} 100%{opacity:1;transform:translateX(0) scale(1)} }
    @keyframes amb-scale       { 0%{opacity:0;transform:scale(0.8)} 65%{opacity:1;transform:scale(1.08)} 85%{transform:scale(0.98)} 100%{opacity:1;transform:scale(1)} }
    @keyframes amb-blur        { 0%{opacity:0;filter:blur(10px);transform:scale(0.95)} 70%{opacity:1;filter:blur(1px);transform:scale(1.02)} 100%{opacity:1;filter:blur(0);transform:scale(1)} }
    /* ── Unchanged keyframes ── */
    @keyframes amb-flip        { from{opacity:0;transform:perspective(600px) rotateX(12deg)} to{opacity:1;transform:perspective(600px) rotateX(0)} }
    @keyframes amb-spring      { 0%{opacity:0;transform:scale(0.75)} 50%{opacity:1;transform:scale(1.15)} 75%{transform:scale(0.97)} 100%{transform:scale(1)} }
    @keyframes amb-bounce      { 0%{opacity:0;transform:translateY(40px)} 25%{opacity:1;transform:translateY(-48px)} 50%{transform:translateY(8px)} 75%{transform:translateY(-4px)} 100%{transform:translateY(0)} }
    @keyframes amb-elastic     { 0%{opacity:0;transform:scale(0)} 25%{opacity:1;transform:scale(1.4)} 50%{transform:scale(0.8)} 75%{transform:scale(1.1)} 100%{transform:scale(1)} }
    @keyframes amb-rotate      { from{opacity:0;transform:rotate(-120deg) scale(0.5)} to{opacity:1;transform:rotate(0) scale(1)} }
    @keyframes amb-pulse       { 0%{opacity:0;transform:scale(0.9)} 50%{opacity:1;transform:scale(1.05)} 100%{opacity:1;transform:scale(1)} }
    /* ── Fixed: amb-shake now has proper opacity ramp ── */
    @keyframes amb-shake       { 0%{opacity:0;transform:translateX(0)} 10%{opacity:0.5} 20%{opacity:0.8;transform:translateX(-8px)} 30%{opacity:1} 40%{transform:translateX(8px)} 50%{transform:translateX(-6px)} 60%{transform:translateX(4px)} 70%{transform:translateX(-2px)} 80%{transform:translateX(2px)} 100%{opacity:1;transform:translateX(0)} }
    /* ── Enhanced: more pronounced squash/stretch ── */
    @keyframes amb-jelly       { 0%{opacity:0;transform:scale(1,1)} 25%{transform:scale(1.25,0.75)} 37.5%{transform:scale(0.75,1.25)} 50%{transform:scale(1.25,0.75)} 62.5%{transform:scale(0.9,1.1)} 75%{transform:scale(1.05,0.95)} 100%{transform:scale(1,1)} }
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
    /* ── Fixed: amb-ripple no longer ends at opacity:0 ── */
    @keyframes amb-ripple      { 0%{opacity:0;transform:scale(0.6)} 40%{opacity:1;transform:scale(1.15)} 70%{transform:scale(0.95)} 100%{opacity:1;transform:scale(1)} }
`;

module.exports = class AmbientProfilePopouts {

    // ─── Settings ────────────────────────────────────────────────────────────────

    getSettingsRef() {
        // Returns settings WITHOUT deep-clone — READ ONLY, do not mutate
        if (this._settingsCache !== null && this._settingsCache !== undefined) {
            return this._settingsCache;
        }
        const saved = BdApi.Data.load(PLUGIN_NAME, "settings") || {};
        const base = Object.assign({}, DEFAULT_SETTINGS, saved);
        base.anim = {};
        let needsMigration = false;
        for (const k of Object.keys(DEFAULT_SETTINGS.anim)) {
            base.anim[k] = Object.assign({}, DEFAULT_SETTINGS.anim[k], saved.anim?.[k] || {});
            if (base.anim[k].enterDuration === undefined) {
                base.anim[k].enterDuration = base.anim[k].duration || 180;
                base.anim[k].exitDuration = base.anim[k].duration || 180;
            }
            if (base.anim[k].enterDirection === undefined) base.anim[k].enterDirection = "auto";
            if (base.anim[k].exitDirection === undefined) base.anim[k].exitDirection = "auto";
            if (base.anim[k].enterEasing === undefined) base.anim[k].enterEasing = "auto";
            if (base.anim[k].exitEasing === undefined) base.anim[k].exitEasing = "auto";
            // Backward-compat: migrate legacy "ease-in-out" to "auto" so per-style curves are used
            if (base.anim[k].enterEasing === "ease-in-out") { base.anim[k].enterEasing = "auto"; needsMigration = true; }
            if (base.anim[k].exitEasing === "ease-in-out") { base.anim[k].exitEasing = "auto"; needsMigration = true; }
            if (base.anim[k].enterOverflow === undefined && base.anim[k].enableOverflow !== undefined) { base.anim[k].enterOverflow = base.anim[k].enableOverflow; needsMigration = true; }
            if (base.anim[k].exitOverflow === undefined && base.anim[k].enableOverflow !== undefined) { base.anim[k].exitOverflow = base.anim[k].enableOverflow; needsMigration = true; }
            if (base.anim[k].enterOverflow === undefined) base.anim[k].enterOverflow = false;
            if (base.anim[k].exitOverflow === undefined) base.anim[k].exitOverflow = false;
        }
        if (needsMigration) {
            BdApi.Data.save(PLUGIN_NAME, "settings", base);
        }
        base.serverWhitelist = Object.assign({ enabled: false, guildIds: [] }, DEFAULT_SETTINGS.serverWhitelist, saved.serverWhitelist || {});
        base.serverWhitelist.guildIds = Array.isArray(base.serverWhitelist.guildIds) ? base.serverWhitelist.guildIds.slice() : [];
        this._settingsCache = base;
        return base;
    }

    getSettings() {
        // Deep-clone for mutation safety; use getSettingsRef() for read-only access
        return JSON.parse(JSON.stringify(this.getSettingsRef()));
    }

    saveSettings(s) {
        // Undo/Redo history: save snapshot BEFORE clearing cache
        if (!this._undoStack) this._undoStack = [];
        if (!this._redoStack) this._redoStack = [];
        const current = BdApi.Data.load(PLUGIN_NAME, "settings") || {};
        this._undoStack.push(JSON.stringify(current));
        if (this._undoStack.length > 30) this._undoStack.shift(); // max 30 steps
        this._redoStack = []; // clear redo on new action
        // Clear caches AFTER snapshot
        this._settingsCache = null;
        this._guildAllowedCache = null;
        this._settingsVersion = (this._settingsVersion || 0) + 1;
        BdApi.Data.save(PLUGIN_NAME, "settings", s);
    }

    undo() {
        this._settingsCache = null;
        this._guildAllowedCache = null;
        if (!this._undoStack?.length) { this.toast("Geri alınacak bir değişiklik yok.", "info"); return; }
        const current = BdApi.Data.load(PLUGIN_NAME, "settings") || {};
        if (!this._redoStack) this._redoStack = [];
        this._redoStack.push(JSON.stringify(current));
        const prev = JSON.parse(this._undoStack.pop());
        BdApi.Data.save(PLUGIN_NAME, "settings", prev);
        const s = this.getSettings();
        this.applySettingsToCSS(s);
        this.patchInvisibleTyping();
        this.applyPlatformIndicatorSettings(s);
        this.toast("Değişiklik geri alındı.", "success");
    }

    redo() {
        this._settingsCache = null;
        this._guildAllowedCache = null;
        if (!this._redoStack?.length) { this.toast("İleri alınacak bir değişiklik yok.", "info"); return; }
        const current = BdApi.Data.load(PLUGIN_NAME, "settings") || {};
        this._undoStack.push(JSON.stringify(current));
        const next = JSON.parse(this._redoStack.pop());
        BdApi.Data.save(PLUGIN_NAME, "settings", next);
        const s = this.getSettings();
        this.applySettingsToCSS(s);
        this.patchInvisibleTyping();
        this.applyPlatformIndicatorSettings(s);
        this.toast("Değişiklik ileri alındı.", "success");
    }

    // Per-server animasyon profili: mevcut sunucu için kayıtlı özel profil varsa onu döner,
    // yoksa global ayarları döner. UI'daki tüm animasyon okumaları bunu kullanır.
    getEffectiveAnim(s = this.getSettingsRef()) {
        const guildId = this.getCurrentGuildId();
        if (guildId && s.serverAnimProfiles?.[guildId]) {
            return s.serverAnimProfiles[guildId];
        }
        return s.anim;
    }

    saveServerAnimProfile(guildId, animData) {
        const s = this.getSettings();
        if (!s.serverAnimProfiles) s.serverAnimProfiles = {};
        s.serverAnimProfiles[guildId] = JSON.parse(JSON.stringify(animData));
        this._commitSettings(s);
        this.toast(`Sunucu animasyon profili kaydedildi.`, "success");
    }

    deleteServerAnimProfile(guildId) {
        const s = this.getSettings();
        if (s.serverAnimProfiles?.[guildId]) {
            delete s.serverAnimProfiles[guildId];
            this._commitSettings(s);
            this.toast(`Sunucu animasyon profili silindi (global ayarlar kullanılıyor).`, "success");
        }
    }

    getPreviewContent(type) {
        return PREVIEW_TEMPLATES[type] || PREVIEW_TEMPLATES.userProfile || "";
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
        const cleanupModal = () => {
            document.removeEventListener('keydown', escHandler);
            if (this._previewLoopTimer) {
                clearTimeout(this._previewLoopTimer);
                this._previewLoopTimer = null;
            }
            if (this._rafAnimPending) { cancelAnimationFrame(this._rafAnimPending); this._rafAnimPending = null; }
            if (this._modalBodyObserver) { this._modalBodyObserver.disconnect(); this._modalBodyObserver = null; }
            this._previewAnimating = false;
        };
        const closeModal = () => {
            cleanupModal();
            this._lastActiveSection = "home";
            modalOverlay.remove();
        };
        modalCloseBtn.addEventListener("click", closeModal);
        const escHandler = (e) => { if (e.key === 'Escape') closeModal(); };
        document.addEventListener('keydown', escHandler);
        modalOverlay.addEventListener('click', (e) => { if (e.target === modalOverlay) closeModal(); });

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

        // Auto-close modal if its parent settings panel is removed from DOM
        const bodyObserver = new MutationObserver((muts) => {
            for (const m of muts) {
                for (const n of m.removedNodes) {
                    if (n === modalOverlay || (n.contains && n.contains(modalOverlay))) {
                        cleanupModal();
                        bodyObserver.disconnect();
                        return;
                    }
                }
            }
        });
        bodyObserver.observe(document.body, { childList: true });
        this._modalBodyObserver = bodyObserver;

        // BetterAnimations tarzı modern CSS
        const styleBlock = document.createElement("style");
        styleBlock.textContent = SETTINGS_CSS;
        wrap.appendChild(styleBlock);


        // Sidebar
        const sidebar = document.createElement("div");
        sidebar.className = "amb-sidebar";

        let activeSection = this._lastActiveSection || "home";
        let previousSection = 'home';
        let currentSectionEl = null;

        const showSection = (id) => {
            // Detach current section
            if (currentSectionEl && currentSectionEl.parentNode) {
                currentSectionEl.classList.remove('active');
                currentSectionEl.parentNode.removeChild(currentSectionEl);
            }
            let sectionEl;
            if (id === 'home') sectionEl = homeSection;
            else if (id === 'settings') sectionEl = settingsSection;
            else if (id === 'servers') sectionEl = serversSection;
            mainContent.appendChild(sectionEl);
            sectionEl.classList.add('active');
            currentSectionEl = sectionEl;
            activeSection = id;
            this._lastActiveSection = id;
            mainContent.scrollTop = 0;
        };

        SETTINGS_SECTIONS.forEach(item => {
            const btn = document.createElement("div");
            btn.className = `amb-sidebar-item ${item.id === activeSection ? 'active' : ''}`;
            btn.textContent = item.label;
            btn.dataset.section = item.id;
            btn.addEventListener("click", () => {
                document.querySelectorAll('.amb-sidebar-item').forEach(el => el.classList.remove('active'));
                btn.classList.add('active');
                previousSection = activeSection;
                showSection(item.id);
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
            <p class="amb-section-desc">Discord için gelişmiş animasyon ve profil efektleri eklentisi. Her alan için animasyon stilini aşağıdaki listeden seçebilirsiniz.</p>
            <div class="amb-preview-toolbar">
                <div>
                    <div class="amb-preview-toolbar-title">Animasyon Kalitesi</div>
                    <div class="amb-preview-toolbar-sub">Kalite modu Discord icindeki animasyon yogunlugunu belirler.</div>
                </div>
                <div class="amb-segmented" id="motionQualityPicker">
                    <button type="button" data-quality="performance">Performans</button>
                    <button type="button" data-quality="balanced">Dengeli</button>
                    <button type="button" data-quality="cinematic">Sinematik</button>
                </div>
            </div>

            <h3 style="font-size:18px; font-weight:700; color:#fff; margin:24px 0 12px;">🎬 Alan Animasyon Ayarları</h3>
            <div class="amb-area-list" id="areaList"></div>
        `;
        mainContent.appendChild(homeSection);
        currentSectionEl = homeSection;

        // ESC key to close modal — handled above via closeModal

        // Animation Detail Section (dynamic)
        const animDetailSection = document.createElement("div");
        animDetailSection.className = "amb-content-section amb-section-anim-detail";
        animDetailSection.innerHTML = `
            <button class="amb-modal-btn amb-modal-btn-secondary" id="backToGrid" style="margin-bottom: 20px;">← Grid'e Dön</button>
            <h2 class="amb-section-title" id="animDetailTitle">Animasyon Detayları</h2>
            <p class="amb-section-desc" id="animDetailDesc">Bu alanın giriş ve çıkış animasyon ayarlarını yapılandırın.</p>
            <div id="animDetailSettings"></div>
        `;
        mainContent.appendChild(animDetailSection);

        // Settings Section
        const settingsSection = document.createElement("div");
        settingsSection.className = "amb-content-section amb-section-settings";
        mainContent.appendChild(settingsSection);

        // Servers Section

        // ─── Servers Section (Sunucu Bazlı Yükleme / CPU tasarrufu) ──────────────
        const serversSection = document.createElement("div");
        serversSection.className = "amb-content-section amb-section-servers";
        serversSection.innerHTML = `
            <h2 class="amb-section-title">🖥️ Sunucu Bazlı Yükleme</h2>
            <p class="amb-section-desc">
                Aşağıdan işaretlediğin sunucular <b>dışındaki</b> sunucularda eklenti hiçbir işlem yapmaz
                (animasyonlar, profil parlaması, platform göstergesi vb. tamamen devre dışı kalır) — böylece
                takip etmediğin sunucular Discord'u kullanırken bilgisayarına ekstra yük bindirmez.
                Özellik kapalıyken veya hiçbir sunucu işaretli değilken eklenti her zamanki gibi tüm sunucularda çalışır.
            </p>
            <div class="amb-setter-row">
                <div class="amb-setter-top" style="align-items:flex-start;">
                    <div style="flex:1;">
                        <span class="amb-setter-lbl">Sunucu Bazlı Yüklemeyi Etkinleştir</span>
                        <div class="amb-setter-desc" style="margin-top:6px;">Açıldığında eklenti SADECE aşağıda işaretlediğin sunucularda çalışır; DM'ler bu kısıtlamadan etkilenmez.</div>
                    </div>
                    <button class="amb-toggle-btn" type="button" id="ambWlToggleBtn" style="flex-shrink:0;margin-left:16px;">
                        <span class="amb-toggle-dot" id="ambWlToggleDot"></span>
                    </button>
                </div>
            </div>
            <div class="amb-setter-row" style="margin-top:16px;">
                <div class="amb-setter-top">
                    <span class="amb-setter-lbl" id="ambGuildCountLbl">Sunucularım</span>
                    <span class="amb-setter-val" id="ambGuildSelectedCount">0 seçili</span>
                </div>
                <input type="text" id="ambGuildSearch" placeholder="Sunucu ara..." class="amb-select-el" style="margin-top:10px;" />
                <div style="display:flex; gap:8px; margin-top:10px;">
                    <button type="button" class="amb-modal-btn amb-modal-btn-secondary" id="ambSelectAllGuilds" style="flex:1;">Tümünü Seç</button>
                    <button type="button" class="amb-modal-btn amb-modal-btn-secondary" id="ambSelectNoneGuilds" style="flex:1;">Tümünü Kaldır</button>
                </div>
                <div id="ambGuildList" style="display:flex; flex-direction:column; gap:6px; margin-top:14px; max-height:420px; overflow-y:auto; padding-right:4px;"></div>
            </div>
        `;
        mainContent.appendChild(serversSection);

        // Sunucu listesi state ve olayları
        {
            const curWlS = this.getSettings();
            const wl = curWlS.serverWhitelist || { enabled: false, guildIds: [] };
            const guildList = this.getGuildList();

            const wlBtn = serversSection.querySelector("#ambWlToggleBtn");
            const wlDot = serversSection.querySelector("#ambWlToggleDot");
            wlDot.style.transition = "left 0.2s cubic-bezier(0.4,0,0.2,1)";
            let wlEnabled = !!wl.enabled;
            const updateWlUI = () => {
                wlBtn.style.background = wlEnabled
                    ? "var(--amb-accent-bg)"
                    : "linear-gradient(135deg,#4e5058 0%,#3f4147 100%)";
                wlDot.style.left = wlEnabled ? "25px" : "3px";
            };
            updateWlUI();
            wlBtn.addEventListener("click", () => {
                wlEnabled = !wlEnabled;
                updateWlUI();
                const next = this.getSettings();
                next.serverWhitelist = next.serverWhitelist || { enabled: false, guildIds: [] };
                next.serverWhitelist.enabled = wlEnabled;
                this.saveSettings(next);
                this._guildAllowedCache = null;
                if (this.isCurrentGuildAllowed()) {
                    this.injectAnimCSS(this.getSettingsRef());
                } else {
                    BdApi.DOM.removeStyle("AmbientAnimCSS");
                }
                this.toast(wlEnabled ? "Sunucu bazlı yükleme açıldı." : "Sunucu bazlı yükleme kapatıldı.", "success");
            });

            const listEl = serversSection.querySelector("#ambGuildList");
            const countLbl = serversSection.querySelector("#ambGuildSelectedCount");
            const titleLbl = serversSection.querySelector("#ambGuildCountLbl");
            titleLbl.textContent = `Sunucularım (${guildList.length})`;

            const selected = new Set(Array.isArray(wl.guildIds) ? wl.guildIds : []);
            const updateCount = () => { countLbl.textContent = `${selected.size} seçili`; };
            updateCount();

            const persistSelection = () => {
                const next = this.getSettings();
                next.serverWhitelist = next.serverWhitelist || { enabled: false, guildIds: [] };
                next.serverWhitelist.guildIds = Array.from(selected);
                this.saveSettings(next);
                this._guildAllowedCache = null;
                if (this.isCurrentGuildAllowed()) {
                    this.injectAnimCSS(this.getSettingsRef());
                } else {
                    BdApi.DOM.removeStyle("AmbientAnimCSS");
                }
                updateCount();
            };

            const renderGuildRows = (filter = "") => {
                listEl.innerHTML = "";
                const q = filter.trim().toLowerCase();
                const filtered = q ? guildList.filter(g => g.name.toLowerCase().includes(q)) : guildList;
                if (!filtered.length) {
                    listEl.innerHTML = `<div class="amb-setter-desc" style="text-align:center;padding:20px 0;">Sunucu bulunamadı.</div>`;
                    return;
                }
                for (const g of filtered) {
                    const row = document.createElement("label");
                    row.style.cssText = "display:flex;align-items:center;gap:10px;padding:8px 10px;border-radius:8px;background:#232428;cursor:pointer;border:1px solid #1f2023;transition:border-color .15s ease;";
                    row.innerHTML = `
                        <input type="checkbox" style="width:18px;height:18px;flex-shrink:0;accent-color:#5865f2;cursor:pointer;" ${selected.has(g.id) ? "checked" : ""}/>
                        ${g.iconURL
                            ? `<img src="${g.iconURL}" width="28" height="28" style="border-radius:50%;flex-shrink:0;" />`
                            : `<div style="width:28px;height:28px;border-radius:50%;background:#5865f2;color:#fff;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;flex-shrink:0;">${(g.name || "?").slice(0, 2).toUpperCase()}</div>`}
                        <span style="font-size:13px;color:#dbdee1;font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${g.name}</span>
                    `;
                    const cb = row.querySelector('input[type="checkbox"]');
                    cb.addEventListener("change", () => {
                        if (cb.checked) selected.add(g.id); else selected.delete(g.id);
                        persistSelection();
                    });
                    listEl.appendChild(row);
                }
            };
            renderGuildRows();

            serversSection.querySelector("#ambGuildSearch").addEventListener("input", (e) => renderGuildRows(e.target.value));
            serversSection.querySelector("#ambSelectAllGuilds").addEventListener("click", () => {
                guildList.forEach(g => selected.add(g.id));
                persistSelection();
                renderGuildRows(serversSection.querySelector("#ambGuildSearch").value);
            });
            serversSection.querySelector("#ambSelectNoneGuilds").addEventListener("click", () => {
                selected.clear();
                persistSelection();
                renderGuildRows(serversSection.querySelector("#ambGuildSearch").value);
            });
        }

        // ─── Per-Server Animasyon Profili UI ────────────────────────────────────
        {
            const currentGuildId = this.getCurrentGuildId();
            const currentGuild = currentGuildId ? this.getGuildList().find(g => g.id === currentGuildId) : null;
            const curS = this.getSettings();
            const hasProfile = currentGuildId && curS.serverAnimProfiles?.[currentGuildId];

            const profileRow = document.createElement("div");
            profileRow.className = "amb-setter-row";
            profileRow.style.marginTop = "16px";
            profileRow.innerHTML = `
                <div class="amb-setter-top">
                    <span class="amb-setter-lbl">🎯 Mevcut Sunucu Animasyon Profili</span>
                    <span class="amb-setter-val" style="font-size:12px;">${hasProfile ? "✅ Kayıtlı" : "—"}</span>
                </div>
                <div class="amb-setter-desc" style="margin-top:6px;">
                    ${currentGuild ? `Şu an <b>${currentGuild.name}</b> sunucusundasınız. Mevcut animasyon ayarlarını bu sunucuya özel kaydedebilirsiniz. Kaydedildikten sonra bu sunucuya girdiğinizde bu profil otomatik yüklenir.` : "Şu an bir sunucuda değilsiniz (DM veya arkadaş listesi). Sunucu bazlı profil kaydetmek için bir sunucuya girin."}
                </div>
                ${currentGuildId ? `
                <div style="display:flex; gap:8px; margin-top:12px;">
                    <button class="amb-modal-btn amb-modal-btn-primary" type="button" id="ambSaveServerProfile" style="flex:1;">💾 Bu Sunucuya Kaydet</button>
                    <button class="amb-modal-btn amb-modal-btn-secondary" type="button" id="ambDeleteServerProfile" style="flex:1;" ${!hasProfile ? 'disabled' : ''}>🗑️ Profili Sil</button>
                </div>
                ` : ''}
            `;
            serversSection.appendChild(profileRow);

            if (currentGuildId) {
                profileRow.querySelector("#ambSaveServerProfile")?.addEventListener("click", () => {
                    const s = this.getSettings();
                    this.saveServerAnimProfile(currentGuildId, s.anim);
                    profileRow.querySelector('.amb-setter-val').textContent = '✅ Kaydedildi';
                    profileRow.querySelector('#ambDeleteServerProfile').disabled = false;
                });
                profileRow.querySelector("#ambDeleteServerProfile")?.addEventListener("click", () => {
                    this.deleteServerAnimProfile(currentGuildId);
                    profileRow.querySelector('.amb-setter-val').textContent = '—';
                    profileRow.querySelector('#ambDeleteServerProfile').disabled = true;
                });
            }

            // Show which servers have profiles
            const profiles = curS.serverAnimProfiles || {};
            const profileGuildIds = Object.keys(profiles);
            if (profileGuildIds.length > 0) {
                const listRow = document.createElement("div");
                listRow.className = "amb-setter-row";
                listRow.style.marginTop = "12px";
                const guildMap = {};
                this.getGuildList().forEach(g => guildMap[g.id] = g.name);
                listRow.innerHTML = `
                    <div class="amb-setter-top">
                        <span class="amb-setter-lbl">📋 Kayıtlı Sunucu Profilleri (${profileGuildIds.length})</span>
                    </div>
                    <div style="display:flex; flex-direction:column; gap:4px; margin-top:8px;">
                        ${profileGuildIds.map(id => `
                            <div style="display:flex; align-items:center; justify-content:space-between; padding:6px 10px; background:#232428; border-radius:8px; border:1px solid #1f2023;">
                                <span style="font-size:13px; color:#dbdee1;">${guildMap[id] || `Sunucu (${id})`}</span>
                                <button class="amb-modal-btn amb-modal-btn-secondary" type="button" data-del-id="${id}" style="padding:4px 10px; font-size:11px;">Sil</button>
                            </div>
                        `).join('')}
                    </div>
                `;
                serversSection.appendChild(listRow);
                listRow.querySelectorAll('[data-del-id]').forEach(btn => {
                    btn.addEventListener("click", () => {
                        this.deleteServerAnimProfile(btn.dataset.delId);
                        btn.closest('div[style]').remove();
                    });
                });
            }
        }

        wrap.appendChild(mainContent);

        // Animation Detail Section functionality
        const backToGridBtn = animDetailSection.querySelector('#backToGrid');
        const animDetailTitle = animDetailSection.querySelector('#animDetailTitle');
        const animDetailDesc = animDetailSection.querySelector('#animDetailDesc');
        const animDetailSettings = animDetailSection.querySelector('#animDetailSettings');
        let currentDetailStyle = null;

        const showAnimDetail = (areaKey) => {
            const cfg = AREA_CONFIG[areaKey];
            if (!cfg) return;
            currentDetailStyle = null;
            animDetailTitle.textContent = `${cfg.label} - Animasyon Ayarları`;
            animDetailDesc.textContent = cfg.description;
            animDetailSettings.innerHTML = '';

            const cur = this.getSettingsRef();
            const a = cur.anim[areaKey] || {};
            const isEnabled = a.enabled !== false;
            const isLayoutArea = LAYOUT_ANIM_AREAS.has(areaKey);
            const isLayoutBlocked = isLayoutArea && !cur.layoutAnimationsEnabled;
            const currentStyle = a.style || 'none';
            const currentDuration = a.duration || 300;
            const currentDelay = a.delay || 0;
            const currentStagger = a.stagger || 0;
            const supportsStagger = cfg.supportsStagger || ['messages','channelList','memberList','searchResults'].includes(areaKey);

            const easingOpts = [
                { g: 'Linear', o: [['linear','linear']] },
                { g: 'Ease', o: [['ease','ease'],['ease-in','ease-in'],['ease-out','ease-out'],['ease-in-out','ease-in-out']] },
                { g: 'Bezier', o: [['cubic-bezier(0.4,0,0.2,1)','Material'],['cubic-bezier(0.22,1,0.36,1)','Smooth Out'],['cubic-bezier(0.65,0,0.35,1)','Sine In-Out']] },
                { g: 'Style', o: [['cubic-bezier(0.76,0,0.24,1)','Quart'],['cubic-bezier(0.83,0,0.17,1)','Quint'],['cubic-bezier(0.87,0,0.13,1)','Expo'],['cubic-bezier(0.85,0,0.15,1)','Circ'],['cubic-bezier(0.34,1.56,0.64,1)','Back'],['cubic-bezier(0.5,0,0.1,1.35)','Elastic'],['cubic-bezier(0.68,-0.55,0.27,1.55)','Bounce']] }
            ];
            const buildEasingOptions = (sel) => easingOpts.map(g =>
                `<optgroup label="${g.g}">${g.o.map(([v,l]) => `<option value="${v}" ${sel===v?'selected':''}>${l}</option>`).join('')}</optgroup>`
            ).join('');

            const wrap = document.createElement('div');
            wrap.innerHTML = `
                <div class="amb-area-header-bar">
                    <div class="amb-area-name">
                        <div class="amb-area-label">${cfg.label}</div>
                        <div class="amb-area-desc">${cfg.description}</div>
                    </div>
                    <span class="amb-style-badge" id="badge-${areaKey}" style="font-size:11px;font-weight:600;color:#fff;background:var(--amb-accent-bg);padding:3px 10px;border-radius:12px;text-transform:uppercase;letter-spacing:0.5px;">${currentStyle==='none'?'Kapalı':(ANIM_STYLE_LABELS[currentStyle]||currentStyle)}</span>
                    <button class="amb-toggle-btn area-toggle-btn" data-area="${areaKey}" type="button" style="width:40px;height:20px;border:0;border-radius:10px;cursor:pointer;position:relative;transition:all 0.2s ease;background:${isEnabled?'#5865f2':'#4e5058'};">
                        <span class="amb-toggle-dot" style="position:absolute;top:2px;left:${isEnabled?'20px':'2px'};width:16px;height:16px;border-radius:50%;background:#fff;transition:all 0.2s ease;box-shadow:0 2px 4px rgba(0,0,0,0.2);"></span>
                    </button>
                </div>
                ${isLayoutBlocked ? '<div style="font-size:12px;color:#ffd166;padding:8px 12px;background:#ffd16615;border:1px solid #ffd16630;border-radius:6px;margin-bottom:12px;">Layout animasyonları kapalı olduğu için bu alan Discord içinde oynatılmaz. Ayarlar &gt; Geniş Layout Animasyonları ile açabilirsin.</div>' : ''}

                <div style="margin-bottom:16px;">
                    <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
                        <span style="font-size:12px;font-weight:600;color:#b5bac1;">Animasyon Stili</span>
                    </div>
                    <div class="amb-style-bar" data-area="${areaKey}" ${!isEnabled?'style="opacity:0.5;pointer-events:none;"':''}>
                        ${ANIM_STYLES.map(s => `<div class="amb-style-item ${currentStyle===s?'active':''}" data-style="${s}" title="${ANIM_STYLE_LABELS[s]||s}">${ANIM_STYLE_LABELS[s]||s}</div>`).join('')}
                    </div>
                </div>

                <div class="amb-enter-exit-container">
                    <div class="amb-enter-panel">
                        <div class="amb-panel-header">▶ Giriş (Enter)</div>
                        <div class="amb-control-row">
                            <div class="amb-control-label"><span>Süre</span><span class="amb-val" id="enter-dur-val-${areaKey}">${a.enterDuration||180}ms</span></div>
                            <input type="range" min="50" max="1000" step="10" value="${a.enterDuration||180}" class="enter-dur-slider" data-area="${areaKey}" ${!isEnabled?'disabled':''}>
                        </div>
                        <div class="amb-control-row">
                            <div class="amb-control-label"><span>Yön</span></div>
                            <select class="amb-direction-select enter-dir-select" data-area="${areaKey}" ${!isEnabled?'disabled':''}>
                                <option value="auto" ${(a.enterDirection||'auto')==='auto'?'selected':''}>Otomatik</option>
                                <option value="vertical" ${a.enterDirection==='vertical'?'selected':''}>Dikey</option>
                                <option value="horizontal" ${a.enterDirection==='horizontal'?'selected':''}>Yatay</option>
                            </select>
                        </div>
                        <div class="amb-control-row">
                            <div class="amb-control-label"><span>Yumuşatma</span></div>
                            <select class="amb-easing-select enter-easing-select" data-area="${areaKey}" ${!isEnabled?'disabled':''}>${buildEasingOptions(a.enterEasing||'auto')}</select>
                        </div>
                        <div class="amb-control-row">
                            <label class="amb-overflow-check"><input type="checkbox" class="enter-overflow-check" data-area="${areaKey}" ${(a.enterOverflow !== undefined ? a.enterOverflow : a.enableOverflow)?'checked':''} ${!isEnabled?'disabled':''}><span>Taşma (Overflow)</span></label>
                        </div>
                    </div>
                    <div class="amb-exit-panel">
                        <div class="amb-panel-header">◀ Çıkış (Exit)</div>
                        <div class="amb-control-row">
                            <div class="amb-control-label"><span>Süre</span><span class="amb-val" id="exit-dur-val-${areaKey}">${a.exitDuration||180}ms</span></div>
                            <input type="range" min="50" max="1000" step="10" value="${a.exitDuration||180}" class="exit-dur-slider" data-area="${areaKey}" ${!isEnabled?'disabled':''}>
                        </div>
                        <div class="amb-control-row">
                            <div class="amb-control-label"><span>Yön</span></div>
                            <select class="amb-direction-select exit-dir-select" data-area="${areaKey}" ${!isEnabled?'disabled':''}>
                                <option value="auto" ${(a.exitDirection||'auto')==='auto'?'selected':''}>Otomatik</option>
                                <option value="vertical" ${a.exitDirection==='vertical'?'selected':''}>Dikey</option>
                                <option value="horizontal" ${a.exitDirection==='horizontal'?'selected':''}>Yatay</option>
                            </select>
                        </div>
                        <div class="amb-control-row">
                            <div class="amb-control-label"><span>Yumuşatma</span></div>
                            <select class="amb-easing-select exit-easing-select" data-area="${areaKey}" ${!isEnabled?'disabled':''}>${buildEasingOptions(a.exitEasing||'auto')}</select>
                        </div>
                        <div class="amb-control-row">
                            <label class="amb-overflow-check"><input type="checkbox" class="exit-overflow-check" data-area="${areaKey}" ${(a.exitOverflow !== undefined ? a.exitOverflow : a.enableOverflow)?'checked':''} ${!isEnabled?'disabled':''}><span>Taşma (Overflow)</span></label>
                        </div>
                    </div>
                </div>

                <div style="margin-top:16px;">
                    <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
                        <span style="font-size:12px;font-weight:600;color:#b5bac1;">Genel Süre (Duration)</span>
                        <span style="font-size:12px;font-weight:600;color:#b5bac1;" id="dur-val-${areaKey}">${currentDuration}ms</span>
                    </div>
                    <input type="range" min="80" max="1500" step="10" value="${currentDuration}" class="area-speed-slider" data-area="${areaKey}" ${!isEnabled?'disabled':''}>
                </div>
                <div style="margin-top:12px;">
                    <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
                        <span style="font-size:12px;font-weight:600;color:#b5bac1;">Gecikme (Delay)</span>
                        <span style="font-size:12px;font-weight:600;color:#b5bac1;" id="del-val-${areaKey}">${currentDelay}ms</span>
                    </div>
                    <input type="range" min="0" max="1000" step="10" value="${currentDelay}" class="area-delay-slider" data-area="${areaKey}" ${!isEnabled?'disabled':''}>
                </div>
                <div style="margin-top:12px;${supportsStagger?'':'display:none;'}">
                    <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
                        <span style="font-size:12px;font-weight:600;color:#b5bac1;">Basamaklı Gecikme (Stagger)</span>
                        <span style="font-size:12px;font-weight:600;color:#b5bac1;" id="stag-val-${areaKey}">${currentStagger}ms</span>
                    </div>
                    <input type="range" min="0" max="200" step="5" value="${currentStagger}" class="area-stagger-slider" data-area="${areaKey}" ${!isEnabled?'disabled':''}>
                </div>

                <div class="amb-bottom-actions">
                    <div class="amb-preview-wrap">${this.getPreviewContent(areaKey)}</div>
                    <div class="amb-btn-wrap">
                        <button class="amb-modal-btn amb-modal-btn-primary apply-anim-btn" data-area="${areaKey}" type="button" ${!isEnabled?'disabled':''}>Uygula</button>
                        <button class="amb-modal-btn amb-modal-btn-secondary preview-area-btn" data-area="${areaKey}" type="button" ${!isEnabled?'disabled':''}>Önizle</button>
                    </div>
                </div>
            `;
            animDetailSettings.appendChild(wrap);

            // --- Event listeners ---

            // Toggle
            const toggleBtn = animDetailSettings.querySelector('.area-toggle-btn');
            toggleBtn.addEventListener('click', () => {
                const s = this.getSettings();
                s.anim[areaKey].enabled = !(s.anim[areaKey].enabled !== false);
                this._commitSettings(s);
                const on = s.anim[areaKey].enabled;
                toggleBtn.style.background = on ? '#5865f2' : '#4e5058';
                toggleBtn.querySelector('.amb-toggle-dot').style.left = on ? '20px' : '2px';
                // Sync disabled state across all controls
                animDetailSettings.querySelectorAll('input[type="range"], select, input[type="checkbox"]').forEach(el => { el.disabled = !on; });
                const bar = animDetailSettings.querySelector('.amb-style-bar');
                if (bar) { bar.style.opacity = on ? '1' : '0.5'; bar.style.pointerEvents = on ? 'auto' : 'none'; }
                this.toast(`${cfg.label} animasyonu ${on?'açık':'kapalı'}.`, 'success');
            });

            // Style bar — delegated listener for all style items
            const styleBar = animDetailSettings.querySelector('.amb-style-bar');
            if (styleBar) {
                styleBar.addEventListener('click', (e) => {
                    const item = e.target.closest('.amb-style-item');
                    if (!item) return;
                    const ns = item.dataset.style;
                    const s = this.getSettings();
                    s.anim[areaKey].style = ns;
                    this._commitSettings(s);
                    styleBar.querySelectorAll('.amb-style-item').forEach(i => i.classList.remove('active'));
                    item.classList.add('active');
                    const badge = animDetailSettings.querySelector(`#badge-${areaKey}`);
                    if (badge) badge.textContent = ns==='none'?'Kapalı':(ANIM_STYLE_LABELS[ns]||ns);
                    this.toast(`Stil: ${ANIM_STYLE_LABELS[ns]||ns}`, 'success');
                    // Auto-play preview on style change for instant feedback
                    if (ns !== 'none') {
                        setTimeout(() => triggerPreview(null), 80);
                    }
                });
            }

            // Duration / general sliders — delegated input listener
            const sliderDisplayMap = {
                'enter-dur-slider': `#enter-dur-val-${areaKey}`,
                'exit-dur-slider': `#exit-dur-val-${areaKey}`,
                'area-speed-slider': `#dur-val-${areaKey}`,
                'area-delay-slider': `#del-val-${areaKey}`,
                'area-stagger-slider': `#stag-val-${areaKey}`
            };
            animDetailSettings.addEventListener('input', (e) => {
                const target = e.target;
                for (const [cls, sel] of Object.entries(sliderDisplayMap)) {
                    if (target.classList.contains(cls)) {
                        const v = animDetailSettings.querySelector(sel);
                        if (v) v.textContent = target.value + 'ms';
                        return;
                    }
                }
            });

            // Direction / easing selects & overflow checkboxes — delegated change listener
            const changeFieldMap = {
                'enter-dir-select': 'enterDirection',
                'exit-dir-select': 'exitDirection',
                'enter-easing-select': 'enterEasing',
                'exit-easing-select': 'exitEasing'
            };
            animDetailSettings.addEventListener('change', (e) => {
                const target = e.target;
                for (const [cls, field] of Object.entries(changeFieldMap)) {
                    if (target.classList.contains(cls)) {
                        const s = this.getSettings(); s.anim[areaKey][field] = target.value;
                        this._commitSettings(s);
                        return;
                    }
                }
                if (target.classList.contains('enter-overflow-check')) {
                    const s = this.getSettings(); s.anim[areaKey].enterOverflow = target.checked;
                    this._commitSettings(s);
                }
                if (target.classList.contains('exit-overflow-check')) {
                    const s = this.getSettings(); s.anim[areaKey].exitOverflow = target.checked;
                    this._commitSettings(s);
                }
            });

            // Apply button
            animDetailSettings.querySelector('.apply-anim-btn')?.addEventListener('click', (e) => {
                const s = this.getSettings();
                const durSlider = animDetailSettings.querySelector('.area-speed-slider');
                const delSlider = animDetailSettings.querySelector('.area-delay-slider');
                const stagSlider = animDetailSettings.querySelector('.area-stagger-slider');
                const enterDur = animDetailSettings.querySelector('.enter-dur-slider');
                const exitDur = animDetailSettings.querySelector('.exit-dur-slider');
                const enterDir = animDetailSettings.querySelector('.enter-dir-select');
                const exitDir = animDetailSettings.querySelector('.exit-dir-select');
                const enterEas = animDetailSettings.querySelector('.enter-easing-select');
                const exitEas = animDetailSettings.querySelector('.exit-easing-select');
                const enterOverflow = animDetailSettings.querySelector('.enter-overflow-check');
                const exitOverflow = animDetailSettings.querySelector('.exit-overflow-check');

                if (durSlider) s.anim[areaKey].duration = parseInt(durSlider.value);
                if (delSlider) s.anim[areaKey].delay = parseInt(delSlider.value);
                if (stagSlider) s.anim[areaKey].stagger = parseInt(stagSlider.value);
                if (enterDur) s.anim[areaKey].enterDuration = parseInt(enterDur.value);
                if (exitDur) s.anim[areaKey].exitDuration = parseInt(exitDur.value);
                if (enterDir) s.anim[areaKey].enterDirection = enterDir.value;
                if (exitDir) s.anim[areaKey].exitDirection = exitDir.value;
                if (enterEas) s.anim[areaKey].enterEasing = enterEas.value;
                if (exitEas) s.anim[areaKey].exitEasing = exitEas.value;
                if (enterOverflow) s.anim[areaKey].enterOverflow = enterOverflow.checked;
                if (exitOverflow) s.anim[areaKey].exitOverflow = exitOverflow.checked;

                this._commitSettings(s);
                e.currentTarget.textContent = 'Uygulandı ✓';
                e.currentTarget.style.background = 'linear-gradient(135deg, #3ba55c, #2d7d46)';
                setTimeout(() => { e.currentTarget.textContent = 'Uygula'; e.currentTarget.style.background = ''; }, 1500);
                this.toast(`${cfg.label} ayarları uygulandı.`, 'success');
            });

            // Preview button
            const previewBtn = animDetailSettings.querySelector('.preview-area-btn');
            const triggerPreview = (btn) => {
                // Stop existing animation first
                if (this._previewAnimating) {
                    this._previewAnimating = false;
                    if (this._previewLoopTimer) { clearTimeout(this._previewLoopTimer); this._previewLoopTimer = null; }
                    const prevEls = animDetailSettings.querySelectorAll('.amb-animated-preview-item');
                    prevEls.forEach(el => { el.style.animation = ''; el.style.opacity = '0'; });
                    if (btn) btn.textContent = 'Önizle';
                }
                const styleBar2 = animDetailSettings.querySelector('.amb-style-bar');
                const activeItem = styleBar2?.querySelector('.amb-style-item.active');
                const style = activeItem?.dataset.style || this.getSettingsRef().anim[areaKey]?.style || 'fade';
                const enterDurSlider = animDetailSettings.querySelector('.enter-dur-slider');
                const areaSpeedSlider = animDetailSettings.querySelector('.area-speed-slider');
                const duration = parseInt((enterDurSlider || areaSpeedSlider)?.value || '300');
                const enterEasingSelect = animDetailSettings.querySelector('.enter-easing-select');
                const userEasing = enterEasingSelect?.value || null;
                const previewEls = animDetailSettings.querySelectorAll('.amb-animated-preview-item');
                if (style === 'none') { previewEls.forEach(el => el.style.opacity = '0'); return; }
                this.playPreviewElements(previewEls, style, duration, areaKey, 50, userEasing, btn || previewBtn);
            };
            previewBtn?.addEventListener('click', (e) => triggerPreview(e.currentTarget));

            // Show detail section
            if (currentSectionEl && currentSectionEl.parentNode) {
                currentSectionEl.classList.remove('active');
                currentSectionEl.parentNode.removeChild(currentSectionEl);
            }
            mainContent.appendChild(animDetailSection);
            animDetailSection.classList.add('active');
            currentSectionEl = animDetailSection;
            mainContent.scrollTop = 0;

            // Auto-play preview when opening detail (BetterAnimations-style)
            if (currentStyle !== 'none' && isEnabled) {
                setTimeout(() => triggerPreview(null), 250);
            }
        };

        backToGridBtn.addEventListener('click', () => {
            if (currentSectionEl && currentSectionEl.parentNode) {
                currentSectionEl.classList.remove('active');
                currentSectionEl.parentNode.removeChild(currentSectionEl);
            }
            showSection(previousSection);
            currentDetailStyle = null;
        });

        // Quality picker
        const qualityPicker = homeSection.querySelector('#motionQualityPicker');
        const syncQualityPicker = () => {
            const current = this.getSettingsRef().motionQuality || "balanced";
            qualityPicker?.querySelectorAll('button[data-quality]').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.quality === current);
            });
        };
        qualityPicker?.addEventListener('click', (event) => {
            const btn = event.target.closest?.('button[data-quality]');
            if (!btn) return;
            const cur = this.getSettings();
            cur.motionQuality = btn.dataset.quality;
            this._commitSettings(cur);
            syncQualityPicker();
            this.toast(`Animasyon kalite modu: ${btn.textContent}`, "success");
        });
        syncQualityPicker();

        // Build area dropdown list
        const areaList = homeSection.querySelector('#areaList');
        const buildAreaList = () => {
            areaList.innerHTML = '';
            const cur = this.getSettingsRef();
            for (const [areaKey, cfg] of Object.entries(AREA_CONFIG)) {
                if (!cur.anim[areaKey]) continue;
                const currentStyle = cur.anim[areaKey].style || 'none';
                const row = document.createElement('div');
                row.className = 'amb-area-row';
                row.dataset.area = areaKey;
                row.innerHTML = `
                    <div class="amb-area-row-info">
                        <div class="amb-area-row-label">${cfg.label}</div>
                        <div class="amb-area-row-desc">${cfg.description}</div>
                    </div>
                    <div class="amb-area-row-controls">
                        <select class="amb-style-select" data-area="${areaKey}">
                            ${ANIM_STYLES.map(s => `<option value="${s}" ${currentStyle === s ? 'selected' : ''}>${ANIM_STYLE_LABELS[s] || s}</option>`).join('')}
                        </select>
                        <button class="amb-detail-btn" data-area="${areaKey}" type="button">Detaylar ⚙</button>
                    </div>
                `;
                areaList.appendChild(row);
            }
        };
        buildAreaList();

        // Event delegation on area list
        areaList.addEventListener('change', (e) => {
            const select = e.target.closest('.amb-style-select');
            if (!select) return;
            const areaKey = select.dataset.area;
            const newStyle = select.value;
            const cur = this.getSettings();
            cur.anim[areaKey].style = newStyle;
            this._commitSettings(cur);
            this.toast(`${AREA_CONFIG[areaKey]?.label || areaKey}: ${ANIM_STYLE_LABELS[newStyle] || newStyle}`, "success");
        });
        areaList.addEventListener('click', (e) => {
            const detailBtn = e.target.closest('.amb-detail-btn');
            if (!detailBtn) return;
            const areaKey = detailBtn.dataset.area;
            previousSection = activeSection;
            showAnimDetail(areaKey);
        });

        // Settings Section Content — delegated to sub-builders
        settingsSection.innerHTML = `
            <h2 class="amb-section-title">Genel Ayarlar</h2>
            <p class="amb-section-desc">Animasyon paketleri, cam efektleri, glow ve diğer görsel ayarları buradan yapılandırabilirsiniz.</p>
        `;
        settingsSection.append(
            this.buildPresetSelector(),
            this.buildGlassSliders(),
            this.buildQualitySelector(),
            this.buildAnimationToggles(),
            this.buildPlatformIndicatorToggles(),
            this.buildTypingToggles(),
            this.buildDataManagement(modalOverlay)
        );

        // Restore last active section if not home
        if (activeSection !== "home") {
            showSection(activeSection);
            document.querySelectorAll('.amb-sidebar-item').forEach(el => {
                el.classList.toggle('active', el.dataset.section === activeSection);
            });
        }

        return document.createElement("div"); // Return empty div for BetterDiscord
    }

    // ─── Settings Sub-Builders ─────────────────────────────────────────────────

    _buildToggle(labelText, descText, settingKey, onChangeCb) {
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
        let state = this.getSettingsRef()[settingKey] || false;
        const updateUI = (val) => {
            state = val;
            btn.style.background = val
                ? "var(--amb-accent-bg)"
                : "linear-gradient(135deg,#4e5058 0%,#3f4147 100%)";
            dot.style.left = val ? "25px" : "3px";
            status.textContent = val ? "✅ Aktif" : "⭕ Kapalı";
        };
        updateUI(state);
        btn.addEventListener("click", () => {
            const newVal = !(this.getSettingsRef()[settingKey] || false);
            updateUI(newVal);
            const cur = this.getSettings();
            cur[settingKey] = newVal;
            this.saveSettings(cur);
            if (onChangeCb) onChangeCb(newVal, cur);
        });
        return row;
    }

    buildPresetSelector() {
        const group = document.createElement("div");
        group.className = "amb-settings-group";

        // Preset dropdown
        const s = this.getSettingsRef();
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
                // Merge preset values OVER existing settings to preserve enter/exit fields
                for (const [areaKey, presetArea] of Object.entries(preset.anim)) {
                    if (cur.anim[areaKey]) {
                        Object.assign(cur.anim[areaKey], presetArea);
                        // Sync enter/exit duration from preset's base values
                        cur.anim[areaKey].enterDuration = presetArea.duration;
                        cur.anim[areaKey].exitDuration = Math.round(presetArea.duration * 0.7);
                        // Reset direction/easing/overflow to defaults
                        cur.anim[areaKey].enterDirection = "auto";
                        cur.anim[areaKey].exitDirection = "auto";
                        cur.anim[areaKey].enterEasing = "auto";
                        cur.anim[areaKey].exitEasing = "auto";
                        cur.anim[areaKey].enterOverflow = false;
                        cur.anim[areaKey].exitOverflow = false;
                    } else {
                        cur.anim[areaKey] = JSON.parse(JSON.stringify(presetArea));
                    }
                }
                this._commitSettings(cur);
                this.toast(`${preset.name} paketi başarıyla uygulandı!`, "success");
                setTimeout(() => {
                    const evt = new MouseEvent("click", { bubbles: true, cancelable: true, view: window });
                    document.querySelector('.amb-sidebar-item[data-section="settings"]').dispatchEvent(evt);
                }, 200);
            }
        });
        group.appendChild(row);

        // Animation mode quick-start panel
        const modeRow = document.createElement("div");
        modeRow.className = "amb-setter-row";

        // Detect initial active mode from current settings
        const allDisabled = Object.values(s.anim).every(a => !a.enabled);
        const msgStyle = s.anim.messages && s.anim.messages.style;
        const msgDur = s.anim.messages && s.anim.messages.duration;
        let initialMode = "safe";
        if (allDisabled) initialMode = "off";
        else if (msgStyle === "fade" && msgDur <= 200) initialMode = "calm";
        this._activeMode = initialMode;

        const modeBtnClass = (mode) => `amb-modal-btn ${mode === initialMode ? "amb-active" : "amb-modal-btn-secondary"}`;
        modeRow.innerHTML = `
            <div class="amb-setter-top">
                <span class="amb-setter-lbl">Basit Animasyon Modları</span>
            </div>
            <div class="amb-setter-desc">Kafa karışıklığı olmadan hızlı başlangıç: güvenli mod sadece mesaj, modal, menü ve küçük popout yüzeylerini oynatır. Kanal/üye/profil listeleri ayrı toggle açılmadıkça animasyon yemez.</div>
            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px;margin-top:12px;">
                <button class="${modeBtnClass("calm")}" type="button" data-mode="calm">Sakin</button>
                <button class="${modeBtnClass("safe")}" type="button" data-mode="safe">Güvenli</button>
                <button class="${modeBtnClass("off")}" type="button" data-mode="off">Hepsi Kapalı</button>
            </div>
        `;

        const syncModeButtons = () => {
            const buttons = modeRow.querySelectorAll("button[data-mode]");
            buttons.forEach(b => {
                if (b.dataset.mode === this._activeMode) {
                    b.classList.add("amb-active");
                    b.classList.remove("amb-modal-btn-secondary");
                    b.classList.add("amb-modal-btn-primary");
                } else {
                    b.classList.remove("amb-active");
                    b.classList.remove("amb-modal-btn-primary");
                    b.classList.add("amb-modal-btn-secondary");
                }
            });
        };

        modeRow.addEventListener("click", (e) => {
            const btn = e.target.closest("button[data-mode]");
            if (!btn) return;
            const cur = this.getSettings();

            // Disable only the 5 mode-controlled areas (preserve other area configs)
            const MODE_AREAS = ["messages", "modals", "contextMenu", "emojiPicker", "toasts"];
            for (const key of MODE_AREAS) {
                cur.anim[key].enabled = false;
                cur.anim[key].delay = 0;
                cur.anim[key].stagger = 0;
            }

            if (btn.dataset.mode === "off") {
                cur.layoutAnimationsEnabled = false;
            } else {
                const calm = btn.dataset.mode === "calm";
                const msgDur = calm ? 180 : 260;
                const modalDur = calm ? 190 : 320;
                const ctxDur = calm ? 140 : 180;
                const emojiDur = calm ? 160 : 220;
                const toastDur = calm ? 200 : 280;
                Object.assign(cur.anim.messages, { style: calm ? "fade" : "slide-up", duration: msgDur, enabled: true, delay: 0, stagger: 0, enterDuration: msgDur, exitDuration: Math.round(msgDur * 0.7) });
                Object.assign(cur.anim.modals, { style: calm ? "scale" : "spring", duration: modalDur, enabled: true, delay: 0, stagger: 0, enterDuration: modalDur, exitDuration: Math.round(modalDur * 0.7) });
                Object.assign(cur.anim.contextMenu, { style: "scale", duration: ctxDur, enabled: true, delay: 0, stagger: 0, enterDuration: ctxDur, exitDuration: Math.round(ctxDur * 0.7) });
                Object.assign(cur.anim.emojiPicker, { style: "scale", duration: emojiDur, enabled: true, delay: 0, stagger: 0, enterDuration: emojiDur, exitDuration: Math.round(emojiDur * 0.7) });
                Object.assign(cur.anim.toasts, { style: "slide-right", duration: toastDur, enabled: true, delay: 0, stagger: 0, enterDuration: toastDur, exitDuration: Math.round(toastDur * 0.7) });
            }

            this._activeMode = btn.dataset.mode;
            syncModeButtons();
            this._commitSettings(cur);
            this.toast(btn.dataset.mode === "off" ? "Tüm animasyonlar kapatıldı." : `${btn.textContent} animasyon modu uygulandı.`, "success");
        });
        group.appendChild(modeRow);

        return group;
    }

    buildGlassSliders() {
        const group = document.createElement("div");
        group.className = "amb-settings-group";
        const sliders = [
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
        const s = this.getSettingsRef();
        for (const cfg of sliders) {
            const row = document.createElement("div"); row.className = "amb-setter-row";
            row.innerHTML = `
                <div class="amb-setter-top">
                    <span class="amb-setter-lbl">${cfg.label}</span>
                    <span class="amb-setter-val">${s[cfg.key]}</span>
                </div>
                <div class="amb-setter-desc">${cfg.desc}</div>
                <input type="range" min="${cfg.min}" max="${cfg.max}" step="${cfg.step}" value="${s[cfg.key]}">
            `;
            const input = row.querySelector('input[type="range"]');
            const indicator = row.querySelector('.amb-setter-val');
            input.addEventListener("input", () => {
                const v = parseFloat(input.value);
                indicator.textContent = cfg.step < 1 ? v.toFixed(2) : String(v);
                if (!this._sliderDebounceTimers) this._sliderDebounceTimers = {};
                clearTimeout(this._sliderDebounceTimers[cfg.key]);
                this._sliderDebounceTimers[cfg.key] = setTimeout(() => {
                    // Live CSS update without pushing to undo stack
                    const ref = this.getSettingsRef();
                    ref[cfg.key] = v;
                    this._settingsCache = null;
                    this.applySettingsToCSS(ref);
                }, 120);
            });
            input.addEventListener("change", () => {
                // Push to undo stack only on slider release
                const v = parseFloat(input.value);
                const cur = this.getSettings();
                cur[cfg.key] = v;
                this._commitSettings(cur);
            });
            group.appendChild(row);
        }
        return group;
    }

    buildQualitySelector() {
        const group = document.createElement("div");
        group.className = "amb-settings-group";
        const cur = this.getSettingsRef();
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
            this._commitSettings(next);
            val.textContent = select.value;
        });
        group.appendChild(row);
        return group;
    }

    buildAnimationToggles() {
        const group = document.createElement("div");
        group.className = "amb-settings-group";
        group.append(
            this._buildToggle(
                "Canlı Kart Önizlemesi",
                "Animasyon kartlarının üzerine gelince önizlemeyi otomatik oynatır. Kapalıyken sadece oynat düğmesi çalışır.",
                "quickPreview",
                (state, cur) => {
                    this.toast(state ? "Canlı önizleme açıldı." : "Canlı önizleme kapatıldı.", "success");
                }
            ),
            this._buildToggle(
                "Sistem Hareket Tercihine Uyum",
                "İşletim sisteminde hareket azaltma açıksa Discord içi animasyonları otomatik sadeleştirir.",
                "respectReducedMotion",
                (state, cur) => {
                    this.applySettingsToCSS(cur);
                    this.toast(state ? "Hareket tercihi dikkate alınacak." : "Hareket tercihi yok sayılacak.", "success");
                }
            ),
            this._buildToggle(
                "Geniş Layout Animasyonları",
                "Kanal değişimi, profil kartları, kanal listesi, üye listesi, DM kutuları ve sidebar gibi büyük Discord parçalarını da animasyon sistemine dahil eder. Varsayılan kapalıdır.",
                "layoutAnimationsEnabled",
                (state, cur) => {
                    this.applySettingsToCSS(cur);
                    this.toast(state ? "Geniş layout animasyonları açıldı." : "Geniş layout animasyonları kapatıldı.", "success");
                }
            ),
            this._buildToggle(
                "Global Cam Yüzeyler",
                "Menü, tooltip ve picker gibi Discord yüzeylerine cam görünümü uygular. Tema çakışması yaşarsan kapalı kalması daha iyi olur.",
                "globalGlassSurfaces",
                (state, cur) => {
                    this.applySettingsToCSS(cur);
                    this.toast(state ? "Global cam yüzeyler açıldı." : "Global cam yüzeyler kapatıldı.", "success");
                }
            )
        );
        return group;
    }

    buildPlatformIndicatorToggles() {
        const group = document.createElement("div");
        group.className = "amb-settings-group";
        group.append(
            this._buildToggle(
                "🖥️ Platform Göstergeleri",
                "Kullanıcıların o anda hangi platformdan (Masaüstü, Mobil, Web) bağlı olduğunu küçük ikonlarla gösterir. Discord'un kendi durum verisini (presence) kullanır, ek bir izin ya da bağlantı gerektirmez.",
                "platformIndicatorsEnabled",
                (state, cur) => {
                    this.applyPlatformIndicatorSettings(cur);
                    this.toast(state ? "Platform göstergeleri açıldı." : "Platform göstergeleri kapatıldı.", "success");
                }
            ),
            this._buildToggle(
                "↳ Profil Kartında Göster",
                "Kullanıcı profil kartı / popout'unda ismin yanında platform ikonlarını gösterir.",
                "platformIndicatorsProfile",
                (state, cur) => {
                    this.applyPlatformIndicatorSettings(cur);
                    this.toast(state ? "Profil kartında platform ikonları açıldı." : "Profil kartında platform ikonları kapatıldı.", "success");
                }
            ),
            this._buildToggle(
                "↳ Mesajlarda Göster",
                "Bir mesaj grubunun başındaki kullanıcı adının yanında platform ikonlarını gösterir.",
                "platformIndicatorsMessages",
                (state, cur) => {
                    this.applyPlatformIndicatorSettings(cur);
                    this.toast(state ? "Mesajlarda platform ikonları açıldı." : "Mesajlarda platform ikonları kapatıldı.", "success");
                }
            ),
            this._buildToggle(
                "↳ Üye Listesinde Göster",
                "Sunucunun sağındaki üye listesindeki her kullanıcının yanında platform ikonlarını gösterir.",
                "platformIndicatorsMemberList",
                (state, cur) => {
                    this.applyPlatformIndicatorSettings(cur);
                    this.toast(state ? "Üye listesinde platform ikonları açıldı." : "Üye listesinde platform ikonları kapatıldı.", "success");
                }
            ),
            this._buildToggle(
                "↳ DM / Kanal Listesinde Göster",
                "Özel mesaj (DM) listesindeki kullanıcıların yanında platform ikonlarını gösterir.",
                "platformIndicatorsDmList",
                (state, cur) => {
                    this.applyPlatformIndicatorSettings(cur);
                    this.toast(state ? "DM listesinde platform ikonları açıldı." : "DM listesinde platform ikonları kapatıldı.", "success");
                }
            )
        );
        return group;
    }

    buildTypingToggles() {
        const group = document.createElement("div");
        group.className = "amb-settings-group";
        group.append(
            this._buildToggle(
                "🫥 Yazdığını Gizle (Invisible Typing)",
                "Yazarken Discord'un sunucuya <b>\u0022X yaz\u0131yor...\u0022</b> sinyali göndermesini engeller. Sadece <b>senin</b> yazma durumun gizlenir; başkalarının yazıyor göstergesi etkilenmez.",
                "invisibleTyping",
                (state, cur) => {
                    this.applySettingsToCSS(cur);
                    this.patchInvisibleTyping();
                    this.toast(state ? "Artık yazdığın gizleniyor 🫥" : "Yazıyor göstergesi tekrar aktif.", "success");
                }
            ),
            this._buildToggle(
                "🙈 Yazıyor Göstergelerini Gizle",
                "Başkalarının <b>&quot;yazıyor...&quot;</b> yazısını ve simgesini Discord arayüzünde gizler. Chat altı yazı, member listesi ve DM listesindeki tüm yazıyor göstergeleri kaybolur.",
                "hideTypingIndicator",
                (state, cur) => {
                    this.applySettingsToCSS(cur);
                    this.toast(state ? "Yazıyor göstergeleri gizlendi 🙈" : "Yazıyor göstergeleri görünür 👁️", "success");
                }
            )
        );
        return group;
    }

    buildDataManagement(modalOverlay) {
        const group = document.createElement("div");
        group.className = "amb-settings-group";

        // Undo / Redo Buttons
        const undoRedoRow = document.createElement("div");
        undoRedoRow.className = "amb-setter-row";
        undoRedoRow.innerHTML = `
            <div class="amb-setter-top">
                <span class="amb-setter-lbl">↩️ Değişiklik Geçmişi</span>
                <span class="amb-setter-desc" style="font-size:12px;">Son 30 ayar değişikliğini geri/ileri alabilirsiniz.</span>
            </div>
            <div style="display:flex; gap:8px; margin-top:10px;">
                <button class="amb-modal-btn amb-modal-btn-secondary" type="button" id="ambUndoBtn" style="flex:1;">← Geri Al</button>
                <button class="amb-modal-btn amb-modal-btn-secondary" type="button" id="ambRedoBtn" style="flex:1;">İleri Al →</button>
            </div>
        `;
        group.appendChild(undoRedoRow);
        undoRedoRow.querySelector("#ambUndoBtn").addEventListener("click", () => {
            this._lastActiveSection = activeSection;
            this.undo();
            cleanupModal();
            modalOverlay.remove();
            this.getSettingsPanel();
        });
        undoRedoRow.querySelector("#ambRedoBtn").addEventListener("click", () => {
            this._lastActiveSection = activeSection;
            this.redo();
            cleanupModal();
            modalOverlay.remove();
            this.getSettingsPanel();
        });

        // Export / Import Ayarlar
        const exportImportRow = document.createElement("div");
        exportImportRow.className = "amb-setter-row";
        exportImportRow.innerHTML = `
            <div class="amb-setter-top">
                <span class="amb-setter-lbl">💾 Ayarları Yedekle / Geri Yükle</span>
            </div>
            <div class="amb-setter-desc">Tüm eklenti ayarlarını bir JSON dosyası olarak dışa aktar veya daha önce dışa aktarılan bir dosyadan geri yükle.</div>
            <div style="display:flex; gap:8px; margin-top:12px;">
                <button class="amb-modal-btn amb-modal-btn-primary" type="button" id="ambExportBtn" style="flex:1;">📤 Dışa Aktar</button>
                <button class="amb-modal-btn amb-modal-btn-secondary" type="button" id="ambImportBtn" style="flex:1;">📥 İçe Aktar</button>
                <input type="file" accept=".json" id="ambImportFile" style="display:none;" />
            </div>
        `;
        group.appendChild(exportImportRow);
        exportImportRow.querySelector("#ambExportBtn").addEventListener("click", () => {
            const settings = this.getSettings();
            const blob = new Blob([JSON.stringify(settings, null, 2)], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `AmbientProfilePopouts-backup-${new Date().toISOString().slice(0, 10)}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            this.toast("Ayarlar başarıyla dışa aktarıldı.", "success");
        });
        const importFile = exportImportRow.querySelector("#ambImportFile");
        exportImportRow.querySelector("#ambImportBtn").addEventListener("click", () => importFile.click());
        importFile.addEventListener("change", (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (ev) => {
                try {
                    const imported = JSON.parse(ev.target.result);
                    if (!imported || typeof imported !== "object" || !imported.anim) {
                        throw new Error("Geçersiz ayar dosyası formatı.");
                    }
                    this._settingsCache = null;
                    this.saveSettings(imported);
                    const migrated = this.getSettings();
                    this.applySettingsToCSS(migrated);
                    this.patchInvisibleTyping();
                    this.applyPlatformIndicatorSettings(migrated);
                    this.toast("Ayarlar başarıyla geri yüklendi!", "success");
                    this._lastActiveSection = activeSection;
                    cleanupModal();
                    modalOverlay.remove();
                    this.getSettingsPanel();
                } catch (err) {
                    this.toast("Dosya okunamadı: " + err.message, "error");
                }
            };
            reader.readAsText(file);
        });

        // Sıfırlama Butonu
        const resetBtn = document.createElement("button");
        resetBtn.className = "amb-btn-reset"; resetBtn.textContent = "Varsayılana Sıfırla";
        resetBtn.addEventListener("click", () => {
            const resetS = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
            this.saveSettings(resetS);
            this.applySettingsToCSS(resetS);
            this.patchInvisibleTyping();
            this.applyPlatformIndicatorSettings(resetS);
            this.toast("Eklenti ayarları fabrika ayarlarına döndürüldü.", "success");
            this._lastActiveSection = activeSection;
            cleanupModal();
            modalOverlay.remove();
            this.getSettingsPanel();
        });
        group.appendChild(resetBtn);

        return group;
    }

    applySettingsToCSS(s) {
        BdApi.DOM.removeStyle("AmbientProfileCSS");
        BdApi.DOM.removeStyle("AmbientAnimCSS");
        this.injectCSS(s);
        this.injectAnimCSS(s);
        // Static keyframes are injected once via ANIM_KEYFRAMES_CSS and are NOT regenerated here
    }

    _commitSettings(s) {
        this.saveSettings(s);
        this.applySettingsToCSS(s);
    }

    // ─── Lifecycle ───────────────────────────────────────────────────────────────

    // ─── Invisible Typing (Yazdığını Gizle) ─────────────────────────────────────

    shouldReduceMotion(settings = this.getSettingsRef()) {
        return settings.respectReducedMotion !== false && window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    }

    getMotionEasing(style, areaKey = "") {
        const base = {
            spring: "cubic-bezier(.34,1.56,.64,1)",
            bounce: "cubic-bezier(0.68,-0.55,0.27,1.55)",
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
            glitch: "cubic-bezier(0.85,0.28,0.34,1.05)",
            morph: "cubic-bezier(.34,1.28,.64,1)",
            wave: "cubic-bezier(0.45,0.05,0.55,0.95)",
            reveal: "cubic-bezier(0.25,0.46,0.45,0.94)",
            stagger: "cubic-bezier(0.4,0,0.2,1)",
            swing: "cubic-bezier(0.68,-0.55,0.27,1.55)",
            ripple: "cubic-bezier(0.34,1.56,0.64,1)"
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

    playPreviewElements(elements, style, duration, areaKey = "", stagger = 50, userEasing = null, btnEl = null) {
        const items = Array.from(elements || []);
        if (!items.length || style === "none") return;

        // Stop any existing loop
        if (this._previewLoopTimer) {
            clearTimeout(this._previewLoopTimer);
            this._previewLoopTimer = null;
        }
        if (this._previewAnimating) {
            // Toggle off — reset elements
            this._previewAnimating = false;
            items.forEach(el => {
                el.style.animation = '';
                el.style.opacity = '0';
            });
            if (btnEl) btnEl.textContent = 'Önizle';
            return;
        }

        this._previewAnimating = true;
        if (btnEl) btnEl.textContent = 'Durdur';
        const easing = userEasing && userEasing !== 'auto' ? userEasing : this.getMotionEasing(style, areaKey);
        let cycles = 0;
        const maxCycles = 4;
        const exitDuration = Math.round(duration * 0.75);
        const holdTime = 700; // pause between enter and exit
        const gapTime = 400;  // pause between exit and next enter

        const playEnter = () => {
            if (!this._previewAnimating) return;
            items.forEach((el, i) => {
                el.style.animation = 'none';
                el.style.opacity = '0';
                void el.offsetWidth; // force reflow
                el.style.animation = `amb-${style} ${duration}ms ${easing} ${i * stagger}ms both`;
            });
        };

        const playExit = () => {
            if (!this._previewAnimating) return;
            items.forEach((el, i) => {
                el.style.animation = 'none';
                void el.offsetWidth; // force reflow
                el.style.animation = `amb-${style} ${exitDuration}ms ${easing} ${i * (stagger * 0.5)}ms reverse both`;
            });
        };

        const stopLoop = () => {
            this._previewAnimating = false;
            if (btnEl) btnEl.textContent = 'Önizle';
            // Leave items visible after final enter
            items.forEach(el => { el.style.animation = ''; el.style.opacity = '1'; });
        };

        // Start the enter→exit loop
        playEnter();

        const totalEnterTime = duration + (items.length - 1) * stagger;
        const totalExitTime = exitDuration + (items.length - 1) * (stagger * 0.5);

        const scheduleExit = () => {
            if (!this._previewAnimating) return;
            this._previewLoopTimer = setTimeout(() => {
                if (!this._previewAnimating) return;
                playExit();
                // After exit completes, schedule next enter
                this._previewLoopTimer = setTimeout(() => {
                    if (!this._previewAnimating) return;
                    cycles++;
                    if (cycles >= maxCycles) { stopLoop(); return; }
                    playEnter();
                    // After enter completes, schedule next exit
                    this._previewLoopTimer = setTimeout(scheduleExit, totalEnterTime + 50);
                }, totalExitTime + gapTime);
            }, holdTime);
        };

        // Wait for enter to finish, then start the exit cycle
        this._previewLoopTimer = setTimeout(scheduleExit, totalEnterTime + 50);
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

    // ─── Gerçek Çıkış Animasyonları (unmount geciktirme) ────────────────────────
    // BetterAnimations yaklaşımı: Discord'un kapatma aksiyonlarını patch'leyip
    // GERÇEK elementi önce animasyonla çıkarır, animasyon bitince orijinal
    // kapatma fonksiyonunu çağırır. Clone tabanlı sisteme göre çok daha
    // pürüzsüzdür çünkü element kaldırılıp kopyalanmaz.

    patchRealExitAnimations() {
        this._realExitPending = {};

        const patchClose = (moduleKeys, methodName, areaKey, selector) => {
            try {
                // Modül arama: önce tüm anahtarlarla, sonra tek anahtarla,
                // son çare olarak searchExports ile iç export'larda ara
                const mod = BdApi.Webpack.getByKeys(...moduleKeys)
                    || BdApi.Webpack.getByKeys(methodName)
                    || BdApi.Webpack.getModule(m => m && typeof m[methodName] === "function", { searchExports: true });
                if (!mod || typeof mod[methodName] !== "function") {
                    console.warn(`${PLUGIN_NAME}: ${methodName} modülü bulunamadı, ${areaKey} gerçek çıkış animasyonu devre dışı (clone sistemi kullanılacak).`);
                    return;
                }
                BdApi.Patcher.instead(PLUGIN_NAME, mod, methodName, (thisObj, args, original) => {
                    const scheduled = this._playRealExit(areaKey, selector, () => original.apply(thisObj, args));
                    if (!scheduled) return original.apply(thisObj, args);
                });
                console.log(`${PLUGIN_NAME}: gerçek çıkış animasyonu aktif → ${areaKey} (${methodName})`);
            } catch (err) {
                console.warn(`${PLUGIN_NAME}: ${areaKey} gerçek çıkış patch hatası:`, err);
            }
        };

        // Sağ tık menüleri
        patchClose(["closeContextMenu", "openContextMenu"], "closeContextMenu", "contextMenu", '[class*="menu_"][role="menu"]');
        // Modallar (en üstteki dialog hedeflenir)
        patchClose(["openModal", "closeModal"], "closeModal", "modals", '[class*="modal_"],[role="dialog"][class*="root_"]');
        // Emoji / expression picker
        patchClose(["closeExpressionPicker", "openExpressionPicker"], "closeExpressionPicker", "emojiPicker", '[class*="emojiPicker_"],[class*="expressionPicker"]');
    }

    _playRealExit(areaKey, selector, closeFn) {
        try {
            if (!this._realExitPending) this._realExitPending = {};
            // Aynı alan için bekleyen bir çıkış varsa hemen bitir (hızlı ardışık kapatmalar)
            if (this._realExitPending[areaKey]) this._realExitPending[areaKey]();

            const s = this.getSettingsRef();
            if (this.shouldReduceMotion(s)) return false;
            if (!this.isCurrentGuildAllowed()) return false;

            const effectiveAnim = this.getEffectiveAnim(s);
            const cfg = effectiveAnim?.[areaKey];
            if (!cfg || !cfg.enabled || cfg.style === "none") return false;
            if (LAYOUT_ANIM_AREAS.has(areaKey) && !s.layoutAnimationsEnabled) return false;

            // En üstteki (son) eşleşen elementi hedefle
            const els = document.querySelectorAll(selector);
            const el = els.length ? els[els.length - 1] : null;
            if (!el || el.classList.contains("amb-real-exit")) return false;
            if (el.closest?.(".amb-modal-overlay,.amb-settings-panel")) return false;

            const style = cfg.style || "fade";
            const exitDir = cfg.exitDirection || "auto";
            let exitKeyframe = style;
            if (exitDir !== "auto" && EXIT_DIR_MAP[exitDir] && style.startsWith("slide")) {
                exitKeyframe = EXIT_DIR_MAP[exitDir];
            }
            const qualityScale = this.getQualityScale(s);
            const exitDuration = Math.max(80, Math.round((cfg.exitDuration || cfg.duration || 180) * qualityScale));
            const exitEasing = (cfg.exitEasing && cfg.exitEasing !== "auto")
                ? cfg.exitEasing
                : this.getMotionEasing(style, areaKey);

            // Giriş animasyonu kalıntılarını temizle, elementi etkileşime kapat
            el.classList.remove(`ambient-anim-${areaKey}`);
            el.classList.add("amb-real-exit");
            el.style.animationDelay = "";
            el.style.pointerEvents = "none";
            el.style.animation = `amb-${exitKeyframe} ${exitDuration}ms ${exitEasing} reverse both`;

            let done = false;
            let safetyTimer = null;
            const finish = () => {
                if (done) return;
                done = true;
                if (safetyTimer) clearTimeout(safetyTimer);
                if (this._realExitPending) delete this._realExitPending[areaKey];
                // Element zaten React tarafından kaldırıldıysa (ör. yeni menü açıldı)
                // orijinal kapatmayı ÇAĞIRMA — yeni açılan öğeyi kapatabilir.
                if (document.body.contains(el)) {
                    try { closeFn(); } catch (err) { console.warn(`${PLUGIN_NAME}: gerçek çıkış kapatma hatası:`, err); }
                }
                // Güvenlik ağı: `reverse both` animasyon opacity:0'da biter. Kapatma
                // etkisiz kaldıysa (yanlış modül / node yeniden kullanıldı) element
                // kalıcı görünmez kalmasın — kısa süre sonra hâlâ DOM'daysa stilleri geri al.
                setTimeout(() => {
                    if (!document.body.contains(el)) return;
                    el.classList.remove("amb-real-exit");
                    el.style.animation = "";
                    el.style.pointerEvents = "";
                    el.style.opacity = "";
                }, 150);
            };
            this._realExitPending[areaKey] = finish;
            el.addEventListener("animationend", finish, { once: true });
            safetyTimer = setTimeout(finish, exitDuration + 120); // animationend gelmezse güvence
            return true;
        } catch (err) {
            console.warn(`${PLUGIN_NAME}: _playRealExit hatası:`, err);
            return false;
        }
    }


    // ─── Sunucu Bazlı Yükleme (Server Whitelist / Lazy Load) ────────────────────
    // Ayarlar panelinde işaretlenmeyen sunucularda eklentinin ağır DOM tarama
    // işlemlerini (animasyon, platform göstergesi, profil parlaması vb.)
    // tamamen atlamasını sağlar; böylece takip edilmeyen sunucular ekstra yük
    // bindirmez. Özellik kapalıyken (varsayılan) davranış hiç değişmez.

    getCurrentGuildId() {
        try {
            if (!this._selectedGuildStore) {
                this._selectedGuildStore = BdApi.Webpack.getStore("SelectedGuildStore") || null;
            }
            if (this._selectedGuildStore && typeof this._selectedGuildStore.getGuildId === "function") {
                return this._selectedGuildStore.getGuildId() || null; // DM'lerde/arkadaşlarda null döner
            }
        } catch (err) { console.warn(`${PLUGIN_NAME}: aktif sunucu okunamadı:`, err); }
        // Yedek yöntem: store bulunamazsa URL'den oku (/channels/{guildId}/{channelId})
        const m = location.pathname.match(/^\/channels\/(@me|\d+)/);
        if (m && m[1] !== "@me") return m[1];
        return null;
    }

    isCurrentGuildAllowed() {
        if (this._guildAllowedCache !== null && this._guildAllowedCache !== undefined) return this._guildAllowedCache;
        const s = this.getSettingsRef();
        const wl = s.serverWhitelist;
        if (!wl || !wl.enabled) { this._guildAllowedCache = true; return true; } // özellik kapalıysa her zaman çalış (eski davranış)
        const guildId = this.getCurrentGuildId();
        if (!guildId) { this._guildAllowedCache = true; return true; } // DM / arkadaş listesi "sunucu" sayılmaz, her zaman aktif kalır
        this._guildAllowedCache = Array.isArray(wl.guildIds) && wl.guildIds.includes(guildId);
        return this._guildAllowedCache;
    }

    getGuildList() {
        try {
            const store = BdApi.Webpack.getStore("GuildStore");
            if (!store || typeof store.getGuilds !== "function") return [];
            const guilds = store.getGuilds();
            return Object.values(guilds)
                .map(g => ({
                    id: g.id,
                    name: g.name || "Bilinmeyen Sunucu",
                    iconURL: g.icon
                        ? `https://cdn.discordapp.com/icons/${g.id}/${g.icon}.${g.icon.startsWith("a_") ? "gif" : "png"}?size=64`
                        : null
                }))
                .sort((a, b) => a.name.localeCompare(b.name, "tr"));
        } catch (err) {
            console.warn(`${PLUGIN_NAME}: sunucu listesi okunamadı:`, err);
            return [];
        }
    }

    start() {
        try {
            this.colorRefreshTimers = new WeakMap();
            this._sampleCanvas = document.createElement("canvas"); this._sampleCanvas.width = 12; this._sampleCanvas.height = 12;
            this._colorCache = new Map();
            this._lastActiveSection = "home";
            this._lastObservedGuildId = this.getCurrentGuildId();
            this.handleShiftClickCopy = this.handleShiftClickCopy.bind(this);
            document.addEventListener("click", this.handleShiftClickCopy, true);
            this.checkForUpdates();
            this.updateInterval = setInterval(() => this.checkForUpdates(true), UPDATE_CHECK_INTERVAL);
            const s = this.getSettings();
            BdApi.DOM.addStyle("AmbientAnimKeyframes", ANIM_KEYFRAMES_CSS);
            this.injectCSS(s);
            this.injectAnimCSS(s);
            this.patchInvisibleTyping();
            this.patchRealExitAnimations();
            if (this.isCurrentGuildAllowed()) {
                this.scanExistingProfiles();
                this.scanExistingMessageEnhancements();
            }
            if (s.platformIndicatorsEnabled) { this.subscribePresenceUpdates(); this.scanExistingPlatformIndicators(); this._schedulePlatformRescan(); }

            this._pendingMutations = [];
            this._rafId = null;
            this._isProcessingExit = false;
            this._processMutations = () => {
                this._rafId = null;
                const batch = this._pendingMutations;
                this._pendingMutations = [];
                if (!batch.length) return;
                for (const { addedNodes, removedNodes, target, rectCache } of batch) {
                    for (const node of removedNodes) {
                        if (node.nodeType !== Node.ELEMENT_NODE) continue;
                        for (const profile of this.findProfileRoots(node)) this.disconnectProfileAttrObserver(profile);
                        // Exit animation for removed nodes
                        if (!this._isProcessingExit && node.nodeType === 1) {
                            if (!node.classList?.contains('amb-exit-clone') && !node.closest?.('.amb-modal-overlay')) {
                                this._handleExitAnimation(node, target, rectCache);
                            }
                        }
                    }
                    for (const node of addedNodes) {
                        if (node.nodeType !== Node.ELEMENT_NODE) continue;
                        for (const profile of this.findProfileRoots(node)) this.addAmbientGlow(profile);
                        this.enhanceMessageNode(node);
                        this.animateNode(node);
                        this.scanPlatformIndicators(node);
                    }
                }
            };
            this.observer = new MutationObserver((mutations) => {
                const currentGuild = this.getCurrentGuildId();
                if (currentGuild !== this._lastObservedGuildId) {
                    this._lastObservedGuildId = currentGuild;
                    this._guildAllowedCache = null;
                    // Re-inject CSS for server-specific animation profile
                    if (this.isCurrentGuildAllowed()) {
                        this.injectAnimCSS(this.getSettingsRef());
                    }
                }
                if (!this.isCurrentGuildAllowed()) return;
                // Capture rects of removed elements before they're processed (Bug #8 fix)
                const rectCache = new WeakMap();
                for (const m of mutations) {
                    for (const rn of m.removedNodes) {
                        if (rn.nodeType !== 1) continue;
                        try {
                            const r = rn.getBoundingClientRect();
                            if (r && r.width > 0 && r.height > 0) rectCache.set(rn, { left: r.left, top: r.top, width: r.width, height: r.height });
                            rn.querySelectorAll?.('*')?.forEach?.(child => {
                                try {
                                    const cr = child.getBoundingClientRect();
                                    if (cr && cr.width > 0 && cr.height > 0) rectCache.set(child, { left: cr.left, top: cr.top, width: cr.width, height: cr.height });
                                } catch (e) { /* skip */ }
                            });
                        } catch (e) { /* skip */ }
                    }
                    this._pendingMutations.push({ addedNodes: m.addedNodes, removedNodes: m.removedNodes, target: m.target, rectCache });
                }
                if (!this._rafId) this._rafId = requestAnimationFrame(this._processMutations);
            });

            const appMount = document.getElementById("app-mount") || document.body;
            this.observer.observe(appMount, { childList: true, subtree: true });
        } catch (err) {
            console.error(`${PLUGIN_NAME} start failed:`, err);
        }
    }

    stop() {
        BdApi.DOM.removeStyle("AmbientProfileCSS");
        BdApi.DOM.removeStyle("AmbientAnimCSS");
        BdApi.DOM.removeStyle("AmbientAnimKeyframes");
        document.removeEventListener("click", this.handleShiftClickCopy, true);
        if (this.observer) this.observer.disconnect();
        if (this._profileAttrObservers) { for (const obs of this._profileAttrObservers.values()) obs.disconnect(); this._profileAttrObservers.clear(); }
        if (this.updateInterval) clearInterval(this.updateInterval);
        document.querySelectorAll(".amb-modal-overlay").forEach(el => el.remove());
        document.querySelectorAll(".ambient-profile-container,.ambient-profile-tools,.ambient-profile-note,.ambient-link-tools,.ambient-code-copy,.ambient-profile-tags,.ambient-platform-indicators").forEach(el => el.remove());
        this.unsubscribePresenceUpdates();
        document.querySelectorAll(".ambient-enhanced-link").forEach(el => { el.classList.remove("ambient-enhanced-link"); el.removeAttribute("data-ambient-domain"); el.removeAttribute("data-ambient-risk"); });
        document.querySelectorAll(".ambient-enhanced-code").forEach(el => el.classList.remove("ambient-enhanced-code"));
        document.querySelectorAll(".ambient-spotify-card").forEach(el => el.classList.remove("ambient-spotify-card"));
        document.querySelectorAll(".ambient-profile-root").forEach(el => {
            el.classList.remove("ambient-profile-root");
            if (el.dataset.ambientPosChecked) { delete el.dataset.ambientPosChecked; if (el.style.position === "relative") el.style.removeProperty("position"); }
        });
        document.querySelectorAll(".amb-done").forEach(el => el.classList.remove("amb-done"));
        document.querySelectorAll(".amb-exit-clone").forEach(el => el.remove());
        for (const k of ANIM_AREAS)
            document.querySelectorAll(`.ambient-anim-${k}`).forEach(el => el.classList.remove(`ambient-anim-${k}`));
        if (this._typingPatch) { this._typingPatch(); this._typingPatch = null; }
        BdApi.Patcher.unpatchAll(PLUGIN_NAME);
        if (this._realExitPending) {
            for (const fin of Object.values(this._realExitPending)) { try { fin(); } catch (e) { /* yok say */ } }
            this._realExitPending = null;
        }
        document.querySelectorAll(".amb-real-exit").forEach(el => {
            el.classList.remove("amb-real-exit");
            el.style.animation = "";
            el.style.pointerEvents = "";
        });
        if (this._rafId) cancelAnimationFrame(this._rafId);
        this._rafId = null;
        this._pendingMutations = null;
        this._pendingAnims = null;
        this._rafAnimPending = null;
        if (this._platformRescanTimers) { for (const id of this._platformRescanTimers) clearTimeout(id); this._platformRescanTimers = null; }
        if (this._modalBodyObserver) { this._modalBodyObserver.disconnect(); this._modalBodyObserver = null; }
        if (this._sliderDebounceTimers) { for (const t of Object.values(this._sliderDebounceTimers)) clearTimeout(t); this._sliderDebounceTimers = null; }
        this._isProcessingExit = false;
        this._colorCache = new Map();
        this._sampleCanvas = null;
    }

    // ─── Animation system ────────────────────────────────────────────────────────

    injectAnimCSS(s) {
        if (this.shouldReduceMotion(s)) {
            BdApi.DOM.addStyle("AmbientAnimCSS", `
                .ambient-anim-messages,.ambient-anim-channelSwitch,.ambient-anim-serverSwitch,.ambient-anim-sidebar,
                .ambient-anim-memberSidebar,.ambient-anim-modals,.ambient-anim-emojiPicker,.ambient-anim-toasts,
                .ambient-anim-contextMenu,.ambient-anim-channelList,.ambient-anim-memberList,.ambient-anim-searchResults,
                .ambient-anim-userProfile,.ambient-anim-statusBar{animation:amb-fade 120ms ease-out both!important;}
                .ambient-anim-messages.amb-exit,.ambient-anim-channelSwitch.amb-exit,.ambient-anim-serverSwitch.amb-exit,
                .ambient-anim-sidebar.amb-exit,.ambient-anim-memberSidebar.amb-exit,.ambient-anim-modals.amb-exit,
                .ambient-anim-emojiPicker.amb-exit,.ambient-anim-toasts.amb-exit,.ambient-anim-contextMenu.amb-exit,
                .ambient-anim-channelList.amb-exit,.ambient-anim-memberList.amb-exit,.ambient-anim-searchResults.amb-exit,
                .ambient-anim-userProfile.amb-exit,.ambient-anim-statusBar.amb-exit{animation:amb-fade 120ms ease-out reverse both!important;animation-delay:0ms!important;}
            `);
            return;
        }
        const effectiveAnim = this.getEffectiveAnim(s);
        this._activeAreasCache = [];
        const rules = [];

        // Areas where paint containment is safe (no child popups/submenus)
        const SAFE_PAINT_AREAS = new Set(["messages", "toasts", "statusBar"]);

        for (const [areaKey, cfg] of Object.entries(effectiveAnim)) {
            if (!cfg.enabled || cfg.style === "none") continue;
            if (LAYOUT_ANIM_AREAS.has(areaKey) && !s.layoutAnimationsEnabled) continue;

            const styleName = cfg.style;
            const defaultEasing = this.getMotionEasing(styleName, areaKey);
            const qualityScale = this.getQualityScale(s);

            // ── Enter animation settings (fallback to legacy fields) ──
            const enterDuration = Math.max(80, Math.round((cfg.enterDuration || cfg.duration || 300) * qualityScale));
            const enterEasing = (cfg.enterEasing && cfg.enterEasing !== "auto") ? cfg.enterEasing : defaultEasing;
            const enterDir = cfg.enterDirection || "auto";
            const enterDelay = cfg.delay > 0 ? `animation-delay:${cfg.delay}ms;` : '';

            // ── Exit animation settings (fallback to legacy fields) ──
            const exitDuration = Math.max(80, Math.round((cfg.exitDuration || cfg.duration || 300) * qualityScale));
            const exitEasing = (cfg.exitEasing && cfg.exitEasing !== "auto") ? cfg.exitEasing : defaultEasing;
            const exitDir = cfg.exitDirection || "auto";

            const enterOverflowVal = (cfg.enterOverflow !== undefined ? cfg.enterOverflow : cfg.enableOverflow) ? "visible" : "hidden";
            const exitOverflowVal = (cfg.exitOverflow !== undefined ? cfg.exitOverflow : cfg.enableOverflow) ? "visible" : "hidden";
            const containValue = SAFE_PAINT_AREAS.has(areaKey) ? "contain:layout style paint;" : "contain:layout style;";
            const blurWC = styleName === "blur" ? "will-change:filter;" : "";

            /* ── Cinematic mode enhancements ──
             * When qualityScale > 1.0 (cinematic tier):
             *  • Add subtle starting blur for dreamier, weightier transitions
             *    (only for non-blur styles to avoid conflicting with amb-blur keyframe)
             *  • Set --amb-quality-scale custom property for any CSS that wants to
             *    scale transform distances proportionally (e.g. calc(24px * var(--amb-quality-scale)))
             * The static keyframes in ANIM_KEYFRAMES_CSS already feel more dramatic
             * thanks to multi-step overshoot; this adds an extra cinematic polish layer.
             */
            const isCinematic = qualityScale > 1.0;
            const cinematicFilter = (isCinematic && styleName !== "blur")
                ? `filter:blur(0.5px);--amb-quality-scale:${qualityScale};` : "";

            // ── Enter keyframe name (direction override when not auto) ──
            let enterKeyframe = styleName;
            if (enterDir !== "auto" && ENTER_DIR_MAP[enterDir] && styleName.startsWith("slide")) {
                enterKeyframe = ENTER_DIR_MAP[enterDir];
            }

            // ── Exit keyframe name (direction override when not auto) ──
            let exitKeyframe = styleName;
            if (exitDir !== "auto" && EXIT_DIR_MAP[exitDir] && styleName.startsWith("slide")) {
                exitKeyframe = EXIT_DIR_MAP[exitDir];
            }

            // Enter rule — element appearing
            rules.push(
                `.ambient-anim-${areaKey}{` +
                `animation:amb-${enterKeyframe} ${enterDuration}ms ${enterEasing} both;` +
                `${enterDelay}` +
                `will-change:transform,opacity,clip-path;` +
                `backface-visibility:hidden;` +
                `transform-origin:center;` +
                `overflow:${enterOverflowVal};` +
                `${containValue}${blurWC}${cinematicFilter}}`
            );

            // Exit rule — element disappearing (reverse keyframe direction)
            rules.push(
                `.ambient-anim-${areaKey}.amb-exit{` +
                `animation-name:amb-${exitKeyframe};` +
                `animation-duration:${exitDuration}ms;` +
                `animation-timing-function:${exitEasing};` +
                `animation-direction:reverse;` +
                `animation-fill-mode:both;` +
                `animation-delay:0ms;` +
                `overflow:${exitOverflowVal};}`
            );

            this._activeAreasCache.push([areaKey, AREA_CONFIG[areaKey]]);
        }
        this._combinedSelectorCache = this._activeAreasCache.map(([, meta]) => meta.selector).join(",");
        BdApi.DOM.addStyle("AmbientAnimCSS", rules.join("\n"));
    }

    animateNode(node) {
        const s = this.getSettingsRef();
        if (node.closest?.(".amb-modal-overlay,.amb-settings-panel")) return;
        let maxChildren = Math.max(1, Number(s.maxAnimatedChildren) || 24);
        if (s.motionQuality === "performance") {
            maxChildren = Math.min(maxChildren, 12);
        } else if (s.motionQuality === "cinematic") {
            maxChildren = Math.max(maxChildren, 36);
        }

        const activeAreas = this._activeAreasCache;
        const effectiveAnim = this.getEffectiveAnim(s);
        if (!activeAreas || !activeAreas.length) return;
        const combinedSelector = this._combinedSelectorCache;
        const nodeMatches = node.matches?.(combinedSelector);
        if (!nodeMatches && !node.querySelector?.(combinedSelector)) return;

        for (const [areaKey, areaMeta] of activeAreas) {
            const cfg = effectiveAnim[areaKey];
            const cls = `ambient-anim-${areaKey}`;

            // Tekil node kontrolü — skip already-animated elements for non-messages areas
            if (areaKey !== "messages" && node.classList?.contains("amb-done")) continue;
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
        // Popout alanlarında Discord konumlandırmayı bitirene kadar elementi gizle
        // (opacity ölçümü etkilemez, transform etkiler — bu yüzden animasyon beklemeli)
        const positionSensitive = POSITION_SENSITIVE_AREAS.has(areaKey);
        if (positionSensitive) el.style.opacity = "0";
        if (!this._pendingAnims) this._pendingAnims = [];
        this._pendingAnims.push({ el, cls, prep: positionSensitive });
        if (!this._rafAnimPending) {
            this._rafAnimPending = requestAnimationFrame(() => {
                this._rafAnimPending = null;
                const batch = this._pendingAnims;
                this._pendingAnims = [];
                void document.body.offsetHeight;
                for (const { el: e, cls: c, prep } of batch) {
                    if (!document.body.contains(e) || e.classList.contains("amb-done")) {
                        if (prep) e.style.opacity = "";
                        continue;
                    }
                    if (prep) {
                        // Ekstra 1 frame: Discord bu sırada transform'suz elementi ölçüp konumlandırır
                        requestAnimationFrame(() => {
                            e.style.opacity = "";
                            if (!document.body.contains(e) || e.classList.contains("amb-done")) return;
                            e.classList.add(c);
                        });
                    } else {
                        e.classList.add(c);
                    }
                }
            });
        }

        if (staggerMs > 0 && index > 0) {
            el.style.animationDelay = `${(parseFloat(el.style.animationDelay) || 0) + (staggerMs * index)}ms`;
        }

        el.addEventListener("animationend", () => {
            if (areaKey !== "messages" && staggerMs === 0) el.classList.remove(cls);
            el.classList.add("amb-done");
            el.style.animationDelay = '';
            el.style.willChange = "auto";
        }, { once: true, passive: true });
    }

    _handleExitAnimation(removedNode, parentNode, rectCache) {
        // Gerçek çıkış animasyonu zaten oynatıldı — clone sistemi devreye girmesin
        if (removedNode.classList?.contains('amb-real-exit') || removedNode.querySelector?.('.amb-real-exit')) return;

        // Concurrency cap — skip if too many exit clones already exist
        const existingClones = document.querySelectorAll('.amb-exit-clone');
        if (existingClones.length >= 6) return;

        const s = this.getSettingsRef();
        if (!s || !s.anim) return;

        const activeAreas = this._activeAreasCache;
        if (!activeAreas || !activeAreas.length) return;

        // Collect matching elements across all active areas
        const matches = [];
        const effectiveAnim = this.getEffectiveAnim(s);

        for (const [areaKey, areaMeta] of activeAreas) {
            const animCfg = effectiveAnim[areaKey];
            if (!animCfg || !animCfg.enabled || animCfg.style === 'none') continue;

            const selector = areaMeta.selector;
            if (!selector) continue;

            // Check the removed node itself
            if (removedNode.matches?.(selector)) {
                matches.push({ el: removedNode, areaKey });
            }

            // Check children of the removed node
            const childMatches = removedNode.querySelectorAll?.(selector);
            if (childMatches) {
                childMatches.forEach(child => matches.push({ el: child, areaKey }));
            }
        }

        if (matches.length === 0) return;
        if (matches.length > 6) return; // Scroll virtualization detected

        // Process exit animations
        this._isProcessingExit = true;

        for (const { el, areaKey } of matches) {
            const animCfg = effectiveAnim[areaKey];
            const exitDuration = animCfg.exitDuration || animCfg.duration || 180;
            const style = animCfg.style || 'fade';

            // Apply exit direction mapping (same logic as injectAnimCSS)
            const exitDir = animCfg.exitDirection || 'auto';
            let exitKeyframe = style;
            if (exitDir !== 'auto' && EXIT_DIR_MAP[exitDir] && style.startsWith('slide')) {
                exitKeyframe = EXIT_DIR_MAP[exitDir];
            }

            try {
                // Clone the element
                const clone = el.cloneNode(true);
                clone.classList.add('amb-exit-clone', 'amb-exit');
                clone.style.position = 'absolute';
                clone.style.pointerEvents = 'none';
                clone.style.zIndex = '9999';

                // Position clone at original element's position
                const rect = (rectCache && rectCache.has(el)) ? rectCache.get(el) : (el.getBoundingClientRect?.());
                if (rect && rect.width > 0 && rect.height > 0 && parentNode && document.body.contains(parentNode)) {
                    const parentRect = parentNode.getBoundingClientRect();
                    clone.style.left = (rect.left - parentRect.left) + 'px';
                    clone.style.top = (rect.top - parentRect.top) + 'px';
                    clone.style.width = rect.width + 'px';
                    clone.style.height = rect.height + 'px';

                    if (!parentNode.style.position || parentNode.style.position === 'static') {
                        parentNode.style.position = 'relative';
                    }
                    parentNode.appendChild(clone);
                } else if (parentNode && document.body.contains(parentNode)) {
                    // Fallback: insert into mutation target parent with absolute positioning
                    if (!parentNode.style.position || parentNode.style.position === 'static') {
                        parentNode.style.position = 'relative';
                    }
                    clone.style.left = '0px';
                    clone.style.top = '0px';
                    parentNode.appendChild(clone);
                } else {
                    // Parent is gone too, skip
                    continue;
                }

                // Apply exit animation using reverse direction
                const exitEasing = animCfg.exitEasing === 'auto'
                    ? this.getMotionEasing(style, areaKey)
                    : (animCfg.exitEasing || 'ease-in-out');

                clone.style.animation = `amb-${exitKeyframe} ${exitDuration}ms ${exitEasing} reverse both`;

                // Remove clone after animation
                clone.addEventListener('animationend', () => {
                    clone.remove();
                }, { once: true });

                // Safety timeout in case animationend doesn't fire
                setTimeout(() => {
                    if (clone.parentNode) clone.remove();
                }, exitDuration + 100);

            } catch (e) {
                // Silently continue — exit animations are non-critical
            }
        }

        this._isProcessingExit = false;
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
            if (!silent) {
                BdApi.UI?.showToast?.(`${PLUGIN_NAME} ${remoteVersion} ready! Reload Discord to apply.`, { type: "success", timeout: 8000 });
            } else {
                BdApi.UI?.showToast?.(`${PLUGIN_NAME} ${remoteVersion} downloaded. Reload Discord.`, { type: "success" });
            }
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
            /* ── Chat alt alanı: yazıyor göstergeleri (daraltılmış seçiciler) ── */
            [class*="typing_"]{display:none!important;visibility:hidden!important;pointer-events:none!important;}
            foreignObject[mask*="typing_"],mask[id*="typing_"]{display:none!important;}
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
            /* ÖNEMLİ: "position" burada KASITLI olarak set edilmiyor / !important ile ezilmiyor.
               Bu sınıf, Discord'un floating popout'u ekranda konumlandırmak için kullandığı
               ASIL elemana (userPopoutOuter_ vb.) uygulanıyor. Discord o elemana inline
               "position:fixed" + hesaplanmış transform/top/left veriyor; buraya position
               yazıp !important eklersek (önceki sürümde olduğu gibi) o inline değeri eziriz
               ve popout yanlış yerde / normal akışta açılır. Konumlandırma gerekiyorsa
               (örn. bazı tam ekran modal varyantlarında position:static olabiliyor)
               bunu ensurePositionedRoot() JS tarafında, sadece gerektiğinde ve Discord'un
               kendi değerini ASLA ezmeyecek şekilde yapıyoruz. */
            overflow:hidden!important;isolation:isolate!important;border-radius:inherit;background-clip:padding-box;
            background-color:rgba(12,12,16,var(--ambient-panel-alpha))!important;
            background-image:linear-gradient(160deg,rgba(var(--ambient-base),.20),rgba(12,12,16,${glassDarkness}) 44%,rgba(0,0,0,.42))!important;
            box-shadow:0 18px 46px rgba(0,0,0,.38),0 0 24px rgba(var(--ambient-base),.14)!important;
            -webkit-backdrop-filter:blur(${bp}) saturate(${glassSaturation}%)!important;
            backdrop-filter:blur(${bp}) saturate(${glassSaturation}%)!important;
        }
        .ambient-profile-root>:not(.ambient-profile-container){position:relative!important;z-index:2;}
        .ambient-profile-root > [class*="userProfileInner_"],
        .ambient-profile-root > [class*="profileInner_"],
        .ambient-profile-root [class*="overlayBackground_"]{
            background-color:rgba(8,8,12,${Math.min(0.58, panelAlpha * 0.56 + 0.12)})!important;
            background-image:linear-gradient(180deg,rgba(255,255,255,.035),rgba(0,0,0,.06))!important;
            -webkit-backdrop-filter:blur(${ibp}) saturate(${Math.max(100, glassSaturation - 20)}%);
            backdrop-filter:blur(${ibp}) saturate(${Math.max(100, glassSaturation - 20)}%);
        }
        .ambient-profile-root > [class*="userProfileInner_"]::before,
        .ambient-profile-root > [class*="profileInner_"]::before{opacity:.12;}
        .ambient-profile-container{position:absolute;inset:0;border-radius:inherit;overflow:hidden;pointer-events:none;z-index:0;background:radial-gradient(circle at 18% 18%,rgba(var(--ambient-soft),.22),transparent 34%),radial-gradient(circle at 82% 12%,rgba(var(--ambient-bright),.20),transparent 32%),linear-gradient(135deg,rgba(var(--ambient-base),.16),transparent 54%);}
        .ambient-glow-main{position:absolute;inset:-42%;background:radial-gradient(circle at 30% 35%,rgba(var(--ambient-base),.70),transparent 46%),radial-gradient(circle at 72% 70%,rgba(var(--ambient-bright),.38),transparent 42%),conic-gradient(from 120deg,rgba(var(--ambient-base),.12),rgba(var(--ambient-bright),.26),rgba(var(--ambient-soft),.10),rgba(var(--ambient-base),.12));background-size:150% 150%;filter:blur(${s.motionQuality === "performance" ? 16 : 30}px) saturate(145%);opacity:${glowOpacity};animation:ambientGlowMove ${((s.motionQuality === "performance" ? 36 : 18) / sp).toFixed(1)}s ease-in-out infinite alternate;will-change:transform,opacity;}
        .ambient-glow-pop{position:absolute;top:18%;left:50%;width:92%;height:68%;transform:translate(-50%,-50%) scale(1);background:radial-gradient(circle,rgba(var(--ambient-bright),.58),transparent 58%);opacity:.48;filter:blur(${s.motionQuality === "performance" ? 20 : 42}px);will-change:transform,opacity;${s.motionQuality === "performance" ? "" : `animation:neonPulse ${(9 / sp).toFixed(1)}s ease-in-out infinite alternate;`}}
        .ambient-glow-sheen{position:absolute;inset:-2px;background:linear-gradient(115deg,transparent 0%,rgba(255,255,255,.16) 38%,transparent 58%),linear-gradient(180deg,rgba(var(--ambient-soft),.10),transparent 42%);${s.motionQuality === "performance" ? "" : "mix-blend-mode:screen;"}opacity:${sheenOpacity};will-change:transform,opacity;${s.motionQuality === "performance" ? "" : `animation:ambientSheen ${(12 / sp).toFixed(1)}s ease-in-out infinite;`}}
        .ambient-profile-root::after{content:'';position:absolute;inset:0;border-radius:inherit;padding:1px;background:linear-gradient(135deg,rgba(var(--ambient-soft),.34),rgba(var(--ambient-bright),var(--ambient-edge-alpha)) 34%,transparent 62%,rgba(var(--ambient-base),.34));background-size:200% 200%;-webkit-mask:linear-gradient(#fff 0 0) content-box,linear-gradient(#fff 0 0);-webkit-mask-composite:xor;mask-composite:exclude;pointer-events:none;z-index:4;animation:borderRotate ${(7 / sp).toFixed(1)}s linear infinite;}
        .ambient-profile-tools{position:absolute;right:44px;top:10px;z-index:6;display:flex;align-items:center;gap:6px;padding:5px;border:1px solid rgba(var(--ambient-soft),.20);border-radius:8px;background:rgba(12,12,16,.50);box-shadow:0 10px 26px rgba(0,0,0,.30);backdrop-filter:blur(14px) saturate(145%);pointer-events:auto;}
        .ambient-profile-root[class*="userProfileModalOuter_"] .ambient-profile-tools,.ambient-profile-root[class*="profileOuter_"] .ambient-profile-tools{top:12px;right:56px;}
        .ambient-profile-tool{height:28px;min-width:34px;padding:0 9px;border:0;border-radius:4px;color:var(--interactive-active,#fff);background:rgba(255,255,255,.08);font-size:12px;font-weight:700;line-height:28px;cursor:pointer;transition:background 160ms,color 160ms,transform 160ms;}
        .ambient-profile-tool:hover:not(:disabled){background:rgba(var(--ambient-bright),.24);color:#fff;transform:translateY(-1px);box-shadow:0 2px 8px rgba(var(--ambient-bright,88,101,242),.18);}
        .ambient-profile-tool:disabled{cursor:not-allowed;opacity:.42;}
        .ambient-profile-note{position:absolute;right:44px;top:52px;z-index:7;width:min(280px,calc(100% - 64px));padding:10px;border:1px solid rgba(var(--ambient-soft),.22);border-radius:8px;background:rgba(10,10,14,.86);box-shadow:0 16px 40px rgba(0,0,0,.42);backdrop-filter:blur(18px) saturate(145%);pointer-events:auto;}
        .ambient-profile-note[hidden]{display:none;}
        .ambient-profile-note textarea{box-sizing:border-box;width:100%;min-height:86px;resize:vertical;border:0;outline:none;border-radius:8px;padding:9px;color:var(--text-normal,#dbdee1);background:rgba(0,0,0,.32);font:500 12px/1.4 var(--font-primary,sans-serif);}
        .ambient-profile-note-label{display:block;margin:8px 0 5px;color:var(--text-muted,#949ba4);font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.04em;}
        .ambient-profile-note-footer{display:flex;justify-content:space-between;align-items:center;gap:8px;margin-top:8px;color:var(--text-muted,#949ba4);font-size:11px;}
        .ambient-profile-note-clear{border:0;border-radius:8px;padding:5px 8px;color:var(--interactive-normal,#b5bac1);background:rgba(255,255,255,.08);cursor:pointer;font-size:11px;}
        .ambient-profile-tag-input{box-sizing:border-box;width:100%;height:30px;margin-top:8px;border:0;outline:none;border-radius:8px;padding:0 9px;color:var(--text-normal,#dbdee1);background:rgba(255,255,255,.075);font:700 11px/30px var(--font-primary,sans-serif);}
        .ambient-profile-tags{position:absolute;right:44px;top:52px;z-index:5;display:flex;max-width:min(300px,calc(100% - 70px));flex-wrap:wrap;justify-content:flex-end;gap:5px;pointer-events:none;}
        .ambient-profile-note:not([hidden])~.ambient-profile-tags{display:none;}
        .ambient-profile-tag{max-width:116px;overflow:hidden;text-overflow:ellipsis;border:1px solid rgba(var(--ambient-soft),.20);border-radius:999px;padding:3px 7px;color:#fff;background:rgba(var(--ambient-base),.34);box-shadow:0 8px 18px rgba(0,0,0,.22);backdrop-filter:blur(10px);font-size:10px;font-weight:800;line-height:1;}
        ${globalGlassCSS}
        .ambient-enhanced-link{text-decoration-thickness:2px;text-underline-offset:2px;}
        .ambient-link-tools{display:inline-flex;align-items:center;gap:4px;margin-left:5px;vertical-align:baseline;white-space:nowrap;}
        .ambient-link-domain,.ambient-link-copy{display:inline-flex;align-items:center;height:18px;border:1px solid rgba(255,255,255,.10);border-radius:8px;color:var(--text-muted,#949ba4);background:rgba(255,255,255,.055);font-size:10px;font-weight:700;line-height:18px;}
        .ambient-link-domain{max-width:150px;padding:0 6px;overflow:hidden;text-overflow:ellipsis;}
        .ambient-link-copy{padding:0 6px;cursor:pointer;font-family:var(--font-primary,sans-serif);}
        .ambient-link-copy:hover{color:#fff;background:rgba(114,137,218,.22);}
        .ambient-enhanced-link[data-ambient-risk="warn"]{color:#ffd166;}
        .ambient-enhanced-link[data-ambient-risk="danger"]{color:#ff6b6b;}
        .ambient-link-domain[data-ambient-risk="warn"]{color:#ffd166;border-color:rgba(255,209,102,.32);background:rgba(255,209,102,.12);}
        .ambient-link-domain[data-ambient-risk="danger"]{color:#ffb3b3;border-color:rgba(255,107,107,.34);background:rgba(255,107,107,.14);}
        .ambient-enhanced-code{position:relative;}
        .ambient-code-copy{position:absolute;top:6px;right:6px;z-index:3;height:22px;min-width:38px;border:1px solid rgba(255,255,255,.10);border-radius:8px;color:var(--text-muted,#949ba4);background:rgba(12,12,16,.62);backdrop-filter:blur(10px);cursor:pointer;font-size:10px;font-weight:800;opacity:0;transform:scale(1);transition:opacity 140ms,background 140ms,color 140ms,transform 140ms;}
        .ambient-enhanced-code:hover .ambient-code-copy,.ambient-code-copy:focus-visible{opacity:1;}
        .ambient-code-copy:hover{color:#fff;background:rgba(114,137,218,.24);transform:scale(1.05);}
        .ambient-spotify-card{position:relative;overflow:hidden;border:1px solid rgba(30,215,96,.34);box-shadow:0 0 26px rgba(30,215,96,.14),inset 0 0 0 1px rgba(255,255,255,.03);}
        .ambient-spotify-card::after{content:'';position:absolute;inset:0;pointer-events:none;background:linear-gradient(120deg,rgba(30,215,96,.10),transparent 42%);opacity:.88;}
        .ambient-platform-indicators{display:inline-flex;align-items:center;gap:4px;margin-left:5px;vertical-align:middle;user-select:none;}
        .ambient-platform-icon{display:inline-flex;align-items:center;justify-content:center;width:13px;height:13px;flex-shrink:0;opacity:.92;}
        .ambient-platform-icon svg{width:100%;height:100%;fill:currentColor;}
        .ambient-platform-icon[data-status="online"]{color:#23a55a;}
        .ambient-platform-icon[data-status="idle"]{color:#f0b232;}
        .ambient-platform-icon[data-status="dnd"]{color:#f23f43;}
        .ambient-platform-icon[data-status="offline"],.ambient-platform-icon[data-status="invisible"]{color:#80848e;}
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
        this.ensureProfileAttrObserver(popout);
        if (popout.querySelector(".ambient-profile-container")) {
            popout.classList.add("ambient-profile-root");
            this.ensurePositionedRoot(popout);
            this.queueColorRefresh(popout); this.ensureProfileTools(popout); this.renderProfileTags(popout); this.polishSpotifyCards(popout); return;
        }
        setTimeout(() => {
            if (!document.body.contains(popout) || popout.querySelector(".ambient-profile-container")) return;
            popout.classList.add("ambient-profile-root");
            this.ensurePositionedRoot(popout);
            const c = document.createElement("div"); c.className = "ambient-profile-container";
            for (const cls of ["ambient-glow-main", "ambient-glow-pop", "ambient-glow-sheen"]) { const d = document.createElement("div"); d.className = cls; c.appendChild(d); }
            popout.insertBefore(c, popout.firstChild);
            this.updateProfileColors(popout); this.ensureProfileTools(popout); this.renderProfileTags(popout); this.polishSpotifyCards(popout);
        }, 180);
    }

    // Eskiden tüm uygulamayı (app-mount) class/src değişikliği için izleyen tek bir
    // MutationObserver kullanılıyordu — bu, profille hiç ilgisi olmayan binlerce
    // olayda (yazıyor animasyonu, hover durumları, üye listesindeki durum noktaları vb.)
    // da tetiklenip gereksiz CPU harcıyordu. Artık SADECE her açık profil popup'ının
    // kendi içini izleyen, küçük ve popup kapanınca otomatik temizlenen ayrı bir
    // gözlemci kullanılıyor; bu da genel akıcılığı belirgin şekilde artırır.
    ensureProfileAttrObserver(popout) {
        if (!this._profileAttrObservers) this._profileAttrObservers = new Map();
        if (this._profileAttrObservers.has(popout)) return;
        try {
            const obs = new MutationObserver(() => { this.queueColorRefresh(popout); this.polishSpotifyCards(popout); });
            obs.observe(popout, { subtree: true, attributes: true, attributeFilter: ["class", "src"] });
            this._profileAttrObservers.set(popout, obs);
        } catch (err) { console.warn(`${PLUGIN_NAME}: profil gözlemcisi oluşturulamadı:`, err); }
    }

    disconnectProfileAttrObserver(popout) {
        const obs = this._profileAttrObservers?.get(popout);
        if (obs) { obs.disconnect(); this._profileAttrObservers.delete(popout); }
    }

    // Discord'un popout'u konumlandırmak için kullandığı "position" değerini ASLA ezmez.
    // Yalnızca gerçekten "static" olduğu (örn. flex ile ortalanan tam ekran profil modalı gibi
    // floating olmayan varyantlar) durumlarda, iç glow/tools/note katmanlarının doğru
    // konumlanabilmesi için yerel bir "relative" ekler. Floating popout (userPopoutOuter_) zaten
    // Discord tarafından fixed/absolute + transform ile konumlandığından buraya hiç dokunulmaz —
    // bu da eklentinin popout'u yanlış yere taşıma hatasını kalıcı olarak engeller.
    ensurePositionedRoot(popout) {
        if (popout.dataset.ambientPosChecked === "1") return;
        popout.dataset.ambientPosChecked = "1";
        try {
            if (getComputedStyle(popout).position === "static") {
                popout.style.position = "relative";
            }
        } catch (err) {
            console.warn(`${PLUGIN_NAME}: ensurePositionedRoot kontrolü başarısız:`, err);
        }
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
        const normalizedSrc = this.normalizeImageUrl(img.src);
        if (this._colorCache && this._colorCache.has(normalizedSrc)) { const rgb = this._colorCache.get(normalizedSrc); this.setAmbientColors(popout, rgb); return; }
        const probe = new Image(); probe.crossOrigin = "Anonymous";
        probe.onload = () => { const rgb = this.sampleImageColor(probe, normalizedSrc); if (rgb) this.setAmbientColors(popout, rgb); };
        probe.onerror = () => { }; probe.src = normalizedSrc;
    }

    pickBestImage(popout) {
        const imgs = Array.from(popout.querySelectorAll(IMAGE_SELECTORS)).filter(i => i.src);
        return imgs.find(i => i.src.includes("i.scdn.co") || i.src.includes("spotify")) || imgs.find(i => i.width >= 64 || i.height >= 64) || imgs[0];
    }

    normalizeImageUrl(src) {
        if (!src.includes("cdn.discordapp.com") && !src.includes("media.discordapp.net")) return src;
        return src.split("?")[0] + "?size=128";
    }

    sampleImageColor(img, cacheKey) {
        try {
            if (cacheKey && this._colorCache && this._colorCache.has(cacheKey)) return this._colorCache.get(cacheKey);
            const ctx = this._sampleCanvas.getContext("2d", { willReadFrequently: true }); ctx.clearRect(0, 0, 12, 12); ctx.drawImage(img, 0, 0, 12, 12);
            const px = ctx.getImageData(0, 0, 12, 12).data; let r = 0, g = 0, b = 0, n = 0;
            for (let i = 0; i < px.length; i += 4) { if (px[i + 3] < 90) continue; const br = (px[i] + px[i + 1] + px[i + 2]) / 3; if (br < 18 || br > 242) continue; r += px[i]; g += px[i + 1]; b += px[i + 2]; n++; }
            const result = n ? [Math.round(r / n), Math.round(g / n), Math.round(b / n)] : null;
            if (result && cacheKey && this._colorCache) { if (this._colorCache.size >= 50) this._colorCache.delete(this._colorCache.keys().next().value); this._colorCache.set(cacheKey, result); }
            return result;
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
            b("Date", "Account creation date", () => { const d = this.getProfileData(popout); const date = this.getCreationDate(d.id); date ? this.toast(`Account created: ${date}`, "info") : this.toast("Could not determine creation date.", "error"); }),
            b("Note", "Private local note", () => this.toggleNotePanel(popout)),
            b("Tag", "Private local tags", () => this.toggleNotePanel(popout))
        );
        popout.appendChild(tools); this.updateProfileTools(popout);
    }

    getCreationDate(userId) {
        if (!userId || !/^\d{15,22}$/.test(userId)) return null;
        try {
            const timestamp = Number((BigInt(userId) >> 22n) + 1420070400000n);
            const date = new Date(timestamp);
            const now = new Date();
            const diffMs = now - date;
            const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
            const years = Math.floor(diffDays / 365);
            const months = Math.floor((diffDays % 365) / 30);
            const ageStr = years > 0 ? `${years}y ${months}m ago` : `${diffDays} days ago`;
            return `${date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })} (${ageStr})`;
        } catch { return null; }
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

    // Herhangi bir konteynerin içindeki avatar/banner img src, srcset, href veya
    // inline style'lardan Discord kullanıcı ID'sini çıkarır. Profil popout'u için
    // yazılmıştı; artık mesaj satırı, üye listesi satırı gibi herhangi bir avatar
    // içeren elemanda da (platform göstergeleri için) aynı mantıkla kullanılıyor.
    extractUserIdFromElement(el) {
        if (!el) return "";
        const vals = [];
        el.querySelectorAll?.("img[src],source[srcset],a[href]").forEach(node => vals.push(node.src, node.srcset, node.href));
        el.querySelectorAll?.("[style]").forEach(node => vals.push(node.getAttribute("style")));
        if (typeof el.getAttribute === "function") vals.push(el.getAttribute("style"));
        for (const v of vals.filter(Boolean)) { const m = String(v).match(/(?:avatars|banners)\/(\d{16,22})\//); if (m) return m[1]; }
        return "";
    }

    extractUserId(popout) { return this.extractUserIdFromElement(popout); }

    extractUsername(popout) {
        for (const sel of ['[class*="nickname_"]', '[class*="username_"]', '[class*="userTag_"]', 'h1', '[aria-label*="profile"]']) {
            const el = popout.querySelector(sel); const text = el?.textContent?.trim(); if (text && text.length <= 80) return text;
            const label = el?.getAttribute?.("aria-label")?.trim(); if (label && label.length <= 80) return label;
        }
        return "";
    }

    // ─── Platform Indicators (APlatformIndicators entegrasyonu) ─────────────────
    // Eski sürümdeki en büyük sorun: kullanıcı ID'si SADECE özel (custom) avatar/
    // banner CDN linkindeki sayılardan regex ile okunuyordu. Varsayılan (default)
    // avatarı olan kullanıcılarda bu linkte ID bulunmadığından rozet hiç görünmüyordu.
    // Bu sürüm önce Discord'un kendi React bileşen ağacından (fiber) doğrudan
    // user/message.author ID'sini okumayı dener; bu avatar tipinden bağımsız her
    // zaman çalışır. Sadece o da başarısız olursa eski regex yöntemine düşer.

    getPresenceStore() {
        // Başarısız arama ASLA kalıcı cache'lenmez: webpack modülleri Discord
        // açılışında henüz hazır olmayabilir, bu yüzden bulunana kadar her
        // çağrıda tekrar denenir. Bulunduktan sonra kalıcı olarak cache'lenir.
        if (this._presenceStore) return this._presenceStore;
        try { this._presenceStore = BdApi.Webpack.getStore("PresenceStore") || null; }
        catch (err) { console.warn(`${PLUGIN_NAME}: PresenceStore aranırken hata:`, err); this._presenceStore = null; }
        return this._presenceStore;
    }

    normalizeStatusValue(v) {
        if (!v) return null;
        if (typeof v === "string") return v;
        if (typeof v === "object" && typeof v.status === "string") return v.status;
        return null;
    }

    // Discord'un çeşitli sürümlerinde clientStatus verisi farklı metot/şekillerde
    // sunulabiliyor; hepsini sırayla dener, ilk geçerli (boş olmayan) sonucu kullanır.
    getClientStatusMap(userId) {
        if (!userId) return null;
        const store = this.getPresenceStore(); if (!store) return null;
        const tryMap = (obj) => {
            if (!obj || typeof obj !== "object") return null;
            const out = {}; let found = false;
            for (const platform of PLATFORM_ORDER) {
                const norm = this.normalizeStatusValue(obj[platform]);
                if (norm) { out[platform] = norm; found = true; }
            }
            return found ? out : null;
        };
        try {
            if (typeof store.getClientStatus === "function") {
                const cs = tryMap(store.getClientStatus(userId));
                if (cs) return cs;
            }
            if (typeof store.getClientStatuses === "function") {
                const all = store.getClientStatuses();
                const cs = tryMap(all?.[userId] ?? all?.get?.(userId));
                if (cs) return cs;
            }
            if (typeof store.getState === "function") {
                const bucket = store.getState()?.clientStatuses;
                const cs = tryMap(bucket?.[userId] ?? bucket?.get?.(userId));
                if (cs) return cs;
            }
            if (store.clientStatuses) {
                const cs = tryMap(store.clientStatuses[userId] ?? store.clientStatuses.get?.(userId));
                if (cs) return cs;
            }
        } catch (err) { console.warn(`${PLUGIN_NAME}: platform durumu okunamadı:`, err); }
        return null;
    }

    buildPlatformIndicatorsHTML(clientStatusMap) {
        const parts = [];
        for (const platform of PLATFORM_ORDER) {
            const status = clientStatusMap[platform];
            if (!status || status === "offline") continue;
            const statusLabel = PLATFORM_STATUS_LABELS[status] || status;
            parts.push(`<span class="ambient-platform-icon" data-platform="${platform}" data-status="${status}" title="${PLATFORM_LABELS[platform]} (${statusLabel})">${PLATFORM_ICONS[platform]}</span>`);
        }
        return parts.join("");
    }

    // Discord'un React bileşen ağacından (fiber) doğrudan user/author ID'si okur.
    // Discord güncellemeleri fiber yapısını sık değiştirdiğinden, geniş prop taraması
    // ve daha fazla hop ile çalışır. Tüm yollar başarısız olursa CDN regex yedeğine düşer.
    getFiberForElement(el) {
        if (!el) return null;
        try {
            if (BdApi?.ReactUtils?.getInternalInstance) {
                const fiber = BdApi.ReactUtils.getInternalInstance(el);
                if (fiber) return fiber;
            }
        } catch (err) { /* sessizce yedek yönteme geç */ }
        try {
            const key = Object.keys(el).find(k => k.startsWith("__reactFiber$") || k.startsWith("__reactInternalInstance$") || k.startsWith("__reactProps$"));
            if (key && key.startsWith("__reactProps$")) {
                // __reactProps$ doğrudan props objesidir, fiber değil; fiber anahtarını da ara
                const fiberKey = Object.keys(el).find(k => k.startsWith("__reactFiber$") || k.startsWith("__reactInternalInstance$"));
                if (fiberKey) return el[fiberKey];
            } else if (key) {
                return el[key];
            }
        } catch (err) { /* yok say */ }
        return null;
    }

    // Avatar tipinden (özel/varsayılan) tamamen bağımsız çalışan, önceliği fiber
    // taraması olan kullanıcı ID çözümleyici. Eski regex yöntemi sadece yedek.
    getPlatformUserId(el) {
        if (!el) return "";
        const startPoints = [el, el.parentElement, el.parentElement?.parentElement, el.parentElement?.parentElement?.parentElement].filter(Boolean);
        for (const start of startPoints) {
            let fiber = this.getFiberForElement(start);
            let hops = 0;
            while (fiber && hops < 30) {
                const props = fiber.memoizedProps || fiber.pendingProps;
                if (props) {
                    // Geniş prop taraması — Discord'un farklı sürümlerindeki tüm olası yollar
                    const candidate = props.user?.id
                        || props.author?.id
                        || props.message?.author?.id
                        || props.member?.user?.id
                        || props.user?.userId
                        || props.recipient?.id
                        || props.channel?.recipients?.[0]
                        || (typeof props.userId === "string" ? props.userId : null)
                        || (typeof props.authorId === "string" ? props.authorId : null);
                    if (candidate && /^\d{15,22}$/.test(String(candidate))) return String(candidate);
                }
                // stateNode'da da props olabilir (class components)
                const stateProps = fiber.stateNode?.props || fiber.stateNode?.memoizedProps;
                if (stateProps) {
                    const c2 = stateProps.user?.id || stateProps.author?.id || stateProps.message?.author?.id;
                    if (c2 && /^\d{15,22}$/.test(String(c2))) return String(c2);
                }
                fiber = fiber.return;
                hops++;
            }
        }
        return this.extractUserIdFromElement(el); // yedek: CDN linki regex'i
    }

    // anchorEl'in hemen ardına (afterend) platform ikon rozetini ekler/günceller/kaldırır.
    // Rozet zaten varsa (anchorEl.nextElementSibling) onu günceller; gösterilecek
    // platform yoksa veya ayar kapalıysa rozeti tamamen kaldırır.
    upsertPlatformBadge(anchorEl, userId) {
        try {
            if (!anchorEl || !anchorEl.parentNode || !document.body.contains(anchorEl)) return;
            const s = this.getSettings();
            const existing = anchorEl.nextElementSibling?.classList?.contains("ambient-platform-indicators") ? anchorEl.nextElementSibling : null;
            if (!s.platformIndicatorsEnabled || !userId) { existing?.remove(); return; }
            const cs = this.getClientStatusMap(userId);
            const html = cs ? this.buildPlatformIndicatorsHTML(cs) : "";
            if (!html) { existing?.remove(); return; }
            let badge = existing;
            if (!badge) {
                badge = document.createElement("span");
                badge.className = "ambient-platform-indicators";
                badge.contentEditable = "false";
                anchorEl.insertAdjacentElement("afterend", badge);
            }
            badge.dataset.ambientUid = userId;
            if (badge.dataset.ambientHtml !== html) { badge.innerHTML = html; badge.dataset.ambientHtml = html; }
        } catch (err) { console.warn(`${PLUGIN_NAME}: platform rozeti güncellenemedi:`, err); }
    }

    applyProfilePlatformIndicator(popout) {
        const userId = this.getPlatformUserId(popout); if (!userId) return;
        const anchor = popout.querySelector('[class*="nickname_"]') || popout.querySelector('[class*="username_"]') || popout.querySelector("h1");
        if (anchor) this.upsertPlatformBadge(anchor, userId);
    }

    applyPlatformIndicatorsForArea(root, rowSelector, nameSelectors) {
        try {
            const rows = new Set();
            if (root.matches?.(rowSelector)) rows.add(root);
            root.querySelectorAll?.(rowSelector).forEach(r => rows.add(r));
            for (const row of rows) {
                let anchor = null;
                for (const sel of nameSelectors) { anchor = row.querySelector(sel); if (anchor) break; }
                if (!anchor) continue;
                const userId = this.getPlatformUserId(row) || this.getPlatformUserId(anchor) || this.getPlatformUserId(anchor.parentElement);
                if (userId) this.upsertPlatformBadge(anchor, userId);
            }
        } catch (err) { console.warn(`${PLUGIN_NAME}: platform göstergesi taraması başarısız (${rowSelector}):`, err); }
    }

    // root: yeni eklenen bir DOM node'u ya da tüm document (ilk tarama için).
    scanPlatformIndicators(root) {
        try {
            const s = this.getSettings();
            if (!s.platformIndicatorsEnabled || !root) return;
            if (!this.isCurrentGuildAllowed()) return;
            if (s.platformIndicatorsProfile) {
                const popouts = new Set();
                if (root.matches?.(PROFILE_SELECTORS)) popouts.add(root);
                root.querySelectorAll?.(PROFILE_SELECTORS).forEach(p => popouts.add(p));
                popouts.forEach(p => this.applyProfilePlatformIndicator(p));
            }
            if (s.platformIndicatorsMessages) {
                this.applyPlatformIndicatorsForArea(root, MESSAGE_ROW_SELECTOR, ['[class*="username_"]', '[class*="nickname_"]', 'span[class*="name_"]']);
            }
            if (s.platformIndicatorsMemberList) {
                this.applyPlatformIndicatorsForArea(root, AREA_CONFIG.memberList.selector, ['[class*="username_"]', '[class*="nickname_"]', '[class*="name_"]', '[class*="roleColor_"]', 'span[class*="nameTag_"]']);
            }
            if (s.platformIndicatorsDmList) {
                this.applyPlatformIndicatorsForArea(root, AREA_CONFIG.channelList.selector, ['[class*="name_"]', '[class*="username_"]', '[class*="channelName_"]']);
            }
        } catch (err) { console.warn(`${PLUGIN_NAME}: scanPlatformIndicators hata:`, err); }
    }

    scanExistingPlatformIndicators() { this.scanPlatformIndicators(document); }

    // Discord açılışında React henüz tüm bileşenleri render etmemiş olabilir.
    // İlk taramada bulunamayan rozetleri yakalamak için kademeli yeniden tarama.
    _schedulePlatformRescan() {
        if (!this._platformRescanTimers) this._platformRescanTimers = [];
        const delays = [1500, 4000, 8000];
        for (const ms of delays) {
            const id = setTimeout(() => {
                if (!this.getSettings().platformIndicatorsEnabled || !this.isCurrentGuildAllowed()) return;
                this.scanExistingPlatformIndicators();
            }, ms);
            this._platformRescanTimers.push(id);
        }
    }

    // Discord'dan bir kullanıcının durumu değiştiğinde (çevrimiçi/boşta/dnd/platform
    // değişimi) PresenceStore bunu dispatch eder. Zaten sayfada duran rozetleri (DOM
    // taraması yapmadan, doğrudan kayıtlı user ID'leri üzerinden) güncelliyoruz —
    // böylece tüm sayfayı yeniden taramak zorunda kalmıyoruz.
    refreshAttachedPlatformIndicators() {
        if (!document.body) return;
        if (!this.isCurrentGuildAllowed()) return;
        document.querySelectorAll(".ambient-platform-indicators[data-ambient-uid]").forEach(badge => {
            const uid = badge.dataset.ambientUid;
            const anchor = badge.previousElementSibling;
            if (!anchor || !document.body.contains(badge)) { badge.remove(); return; }
            this.upsertPlatformBadge(anchor, uid);
        });
    }

    subscribePresenceUpdates() {
        if (this._presenceChangeHandler) return; // zaten abone
        const store = this.getPresenceStore();
        if (!store || typeof store.addChangeListener !== "function") {
            // Store henüz hazır değilse (Discord açılışında geç yüklenebilir) kısa
            // süre sonra tekrar dener; store bulunduğu an bu döngü kendiliğinden durur.
            clearTimeout(this._presenceSubscribeRetryTimer);
            this._presenceSubscribeRetryTimer = setTimeout(() => this.subscribePresenceUpdates(), 1500);
            return;
        }
        this._presenceChangeHandler = () => {
            clearTimeout(this._platformRefreshTimer);
            this._platformRefreshTimer = setTimeout(() => this.refreshAttachedPlatformIndicators(), 220);
            // Discord bir kullanıcının durumunu ancak "abone" olduğu an client'a gönderir
            // (arkadaşların, DM'lerin veya üye listesinde görünen kişilerin durumu anında
            // bilinir; kalabalık bir sunucuda hiç görmediğin biri için bu veri baştan yoktur
            // — native Discord'un kendi üye listesi de aynı kişiyi görene kadar gri gösterir).
            // Yeni gelen her durum verisiyle, daha önce rozet takılamamış mesaj yazarlarına
            // da (sadece görünür sohbet alanlarında, maliyeti sınırlı tutmak için) rozet
            // takılabiliyor mu diye ayrıca ve daha seyrek bir aralıkla bakıyoruz.
            clearTimeout(this._platformRescanTimer);
            this._platformRescanTimer = setTimeout(() => {
                if (!this.getSettings().platformIndicatorsEnabled || !this.isCurrentGuildAllowed()) return;
                document.querySelectorAll('[id^="chat-messages-"]').forEach(root => this.scanPlatformIndicators(root));
            }, 900);
        };
        store.addChangeListener(this._presenceChangeHandler);
    }

    unsubscribePresenceUpdates() {
        clearTimeout(this._presenceSubscribeRetryTimer);
        const store = this.getPresenceStore();
        if (store && this._presenceChangeHandler && typeof store.removeChangeListener === "function") {
            store.removeChangeListener(this._presenceChangeHandler);
        }
        this._presenceChangeHandler = null;
        clearTimeout(this._platformRefreshTimer);
        clearTimeout(this._platformRescanTimer);
    }

    // Ayarlar panelinden herhangi bir "platformIndicators*" toggle'ı değiştiğinde çağrılır.
    // Basitlik ve güvenilirlik için mevcut tüm rozetleri temizleyip, açık olan
    // alanlar için sıfırdan yeniden tarar (nadiren tetiklenen bir kullanıcı eylemi
    // olduğundan performans kaygısı yoktur).
    applyPlatformIndicatorSettings(s = this.getSettings()) {
        document.querySelectorAll(".ambient-platform-indicators").forEach(el => el.remove());
        if (!s.platformIndicatorsEnabled) { this.unsubscribePresenceUpdates(); return; }
        this.subscribePresenceUpdates();
        this.scanExistingPlatformIndicators();
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
