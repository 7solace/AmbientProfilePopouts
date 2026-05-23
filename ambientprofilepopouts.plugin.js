/**
 * @name AmbientProfilePopouts
 * @author s7lace
 * @version 1.0.8
 * @description bombo
 * @updateUrl https://raw.githubusercontent.com/7solace/ambientprofilepopouts.plugin/main/AmbientProfilePopouts.plugin.js
 * @downloadUrl https://raw.githubusercontent.com/7solace/ambientprofilepopouts.plugin/main/AmbientProfilePopouts.plugin.js
 */

module.exports = class AmbientProfilePopouts {
    start() {
        this.injectCSS();
        
        this.observer = new MutationObserver((mutations) => {
            for (const m of mutations) {
                for (const node of m.addedNodes) {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        if (node.matches && node.matches('[class*="userProfileOuter_"]')) {
                            this.addAmbientGlow(node);
                        } else if (node.querySelector) {
                            const popout = node.querySelector('[class*="userProfileOuter_"]');
                            if (popout) this.addAmbientGlow(popout);
                        }
                    }
                }
            }
        });

        const appMount = document.getElementById("app-mount") || document.body;
        this.observer.observe(appMount, { childList: true, subtree: true });
    }

    stop() {
        BdApi.DOM.removeStyle("AmbientProfileCSS");
        if (this.observer) this.observer.disconnect();
        document.querySelectorAll('.ambient-profile-container').forEach(el => el.remove());
    }

    injectCSS() {
        const css = `
        /* Koyu Temalar İçin Cam Efekti */
        .theme-dark [class*="userProfileOuter_"] {
            background: rgba(10, 10, 10, 0.6) !important;
            box-shadow: 0 0 30px rgba(0, 0, 0, 0.5), inset 0 0 1px 1px var(--background-modifier-accent, rgba(255,255,255,0.05));
        }

        /* Açık Temalar İçin Cam Efekti */
        .theme-light [class*="userProfileOuter_"] {
            background: rgba(255, 255, 255, 0.4) !important;
            box-shadow: 0 0 30px rgba(0, 0, 0, 0.1), inset 0 0 1px 1px var(--background-modifier-accent, rgba(0,0,0,0.05));
        }

        /* Ortak Ana Çerçeve Ayarları */
        [class*="userProfileOuter_"] {
            backdrop-filter: blur(20px) saturate(150%) !important;
            position: relative !important;
            overflow: hidden !important;
            z-index: 1;
            border-radius: 12px;
        }

        /* Gösterişli ışık konteyneri */
        .ambient-profile-container {
            position: absolute;
            inset: 0;
            z-index: 0;
            pointer-events: none;
            overflow: hidden;
        }

        /* Katman 1: Ana arka plan parlaması (Her temada güvenli opacity) */
        .ambient-glow-main {
            position: absolute;
            inset: -50%;
            background: radial-gradient(circle at 50% 50%, var(--ambient-color, rgba(114, 137, 218, 0.5)) 0%, transparent 60%);
            background-size: 150% 150%;
            opacity: 0.5;
            animation: ambientGlowMove 15s ease-in-out infinite alternate;
        }

        /* Katman 2: Ekstra neon parlama patlaması */
        .ambient-glow-pop {
            position: absolute;
            top: 20%; left: 50%;
            width: 80%; height: 80%;
            transform: translate(-50%, -50%) scale(1);
            background: radial-gradient(circle, var(--ambient-color-bright, rgba(114, 137, 218, 0.7)) 0%, transparent 50%);
            opacity: 0.35;
            filter: blur(50px);
            animation: neonPulse 8s ease-in-out infinite alternate;
        }

        /* Kenar Neon Efekti */
        [class*="userProfileOuter_"]::after {
            content: '';
            position: absolute;
            inset: -2px;
            border-radius: inherit;
            padding: 2px;
            background: linear-gradient(135deg, transparent 40%, var(--ambient-color-bright, rgba(114, 137, 218, 0.3)) 50%, transparent 60%);
            background-size: 200% 200%;
            -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
            -webkit-mask-composite: xor;
            mask-composite: exclude;
            pointer-events: none;
            z-index: 5;
            animation: borderRotate 6s linear infinite;
        }

        /* Animasyonlar */
        @keyframes ambientGlowMove {
            0% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
            100% { background-position: 0% 50%; }
        }

        @keyframes neonPulse {
            0% { transform: translate(-50%, -50%) scale(1) rotate(0deg); opacity: 0.2; }
            50% { opacity: 0.5; }
            100% { transform: translate(-50%, -50%) scale(1.1) rotate(180deg); opacity: 0.2; }
        }

        @keyframes borderRotate {
            0% { background-position: 0% 0%; }
            100% { background-position: 200% 200%; }
        }

        /* İçeriği ışığın üstünde net tut */
        [class*="userProfileInner_"] {
            position: relative;
            z-index: 2;
            background: transparent !important;
        }
        `;
        BdApi.DOM.addStyle("AmbientProfileCSS", css);
    }

    addAmbientGlow(popout) {
        if (popout.querySelector('.ambient-profile-container')) return;

        setTimeout(() => {
            let imgUrl = null;
            const activityImg = popout.querySelector('img[src*="i.scdn.co"], img[src*="spotify"]');
            const avatarImg = popout.querySelector('img[class*="avatar_"], svg foreignObject img');

            if (activityImg) {
                imgUrl = activityImg.src;
            } else if (avatarImg) {
                imgUrl = avatarImg.src;
            }

            if (!imgUrl) return;

            const cleanUrl = imgUrl.split('?')[0] + '?size=128';
            
            const img = new Image();
            img.crossOrigin = "Anonymous";
            img.src = cleanUrl;
            
            img.onload = () => {
                try {
                    const canvas = document.createElement('canvas');
                    canvas.width = 1; canvas.height = 1;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, 1, 1);
                    const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
                    
                    const baseColor = "rgb(" + r + ", " + g + ", " + b + ")";
                    
                    // Renk parlaklığını artır
                    const br = Math.min(255, Math.floor(r * 1.3));
                    const bg = Math.min(255, Math.floor(g * 1.3));
                    const bb = Math.min(255, Math.floor(b * 1.3));
                    const brightColor = "rgb(" + br + ", " + bg + ", " + bb + ")";
                    
                    const containerDiv = document.createElement('div');
                    containerDiv.className = 'ambient-profile-container';
                    
                    const mainGlow = document.createElement('div');
                    mainGlow.className = 'ambient-glow-main';
                    mainGlow.style.setProperty('--ambient-color', baseColor);
                    containerDiv.appendChild(mainGlow);

                    const popGlow = document.createElement('div');
                    popGlow.className = 'ambient-glow-pop';
                    popGlow.style.setProperty('--ambient-color-bright', brightColor);
                    containerDiv.appendChild(popGlow);

                    popout.style.setProperty('--ambient-color-bright', "rgba(" + br + ", " + bg + ", " + bb + ", 0.9)");
                    
                    popout.insertBefore(containerDiv, popout.firstChild);
                } catch (e) {}
            };
        }, 200); 
    }
};
