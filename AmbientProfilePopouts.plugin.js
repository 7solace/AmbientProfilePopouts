/**
 * @name AmbientProfilePopouts
 * @author s7lace
 * @version 1.1.7
 * @description bombo bir profil popout deneyimi için ışık efektleri ekler
 * @updateUrl https://raw.githubusercontent.com/7solace/AmbientProfilePopouts/main/AmbientProfilePopouts.plugin.js
 * @downloadUrl https://raw.githubusercontent.com/7solace/AmbientProfilePopouts/main/AmbientProfilePopouts.plugin.js
 */


module.exports = class AmbientProfilePopouts {
    start() {
        try {
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
        } catch (err) {
            console.error("AmbientProfilePopouts başlatılırken hata oluştu:", err);
        }
    }

    stop() {
        BdApi.DOM.removeStyle("AmbientProfileCSS");
        if (this.observer) this.observer.disconnect();
        document.querySelectorAll('.ambient-profile-container').forEach(el => el.remove());
    }

    injectCSS() {
        const css = `
        /* 1. ADIM: İnatçı Tema Değişkenlerini Nötralize Et */
        [class*="userProfileOuter_"] {
            --profile-gradient-primary-color: transparent !important;
            --profile-gradient-secondary-color: transparent !important;
            --profile-avatar-border-color: transparent !important;
            --profile-body-background-color: rgba(0, 0, 0, 0.4) !important;
            
            background: rgba(10, 10, 10, 0.6) !important;
            backdrop-filter: blur(25px) saturate(150%) !important;
            position: relative !important;
            overflow: hidden !important;
            border-radius: 12px;
            box-shadow: 0 0 30px rgba(0, 0, 0, 0.8) !important;
            z-index: 1;
        }

        /* 2. ADIM: İç Katmanlardaki Katı Renkleri Zorla Gizle */
        [class*="userProfileInner_"] {
            background: transparent !important;
            position: relative;
            z-index: 2 !important;
        }
        
        [class*="userProfileInner_"]::before {
            display: none !important; 
        }

        /* 3. ADIM: Gösterişli Işık Katmanları */
        .ambient-profile-container {
            position: absolute;
            inset: 0;
            z-index: 0;
            pointer-events: none;
            overflow: hidden;
            border-radius: inherit;
        }

        .ambient-glow-main {
            position: absolute;
            inset: -50%;
            background: radial-gradient(circle at 50% 50%, var(--ambient-color, rgba(114, 137, 218, 0.5)) 0%, transparent 60%);
            background-size: 150% 150%;
            opacity: 0.8;
            animation: ambientGlowMove 15s ease-in-out infinite alternate;
        }

        .ambient-glow-pop {
            position: absolute;
            top: 20%; left: 50%;
            width: 80%; height: 80%;
            transform: translate(-50%, -50%) scale(1);
            background: radial-gradient(circle, var(--ambient-color-bright, rgba(114, 137, 218, 0.7)) 0%, transparent 50%);
            opacity: 0.6;
            filter: blur(40px);
            animation: neonPulse 8s ease-in-out infinite alternate;
        }

        /* Kenar Sızması */
        [class*="userProfileOuter_"]::after {
            content: '';
            position: absolute;
            inset: -2px;
            border-radius: inherit;
            padding: 2px;
            background: linear-gradient(135deg, transparent 40%, var(--ambient-color-bright, rgba(114, 137, 218, 0.5)) 50%, transparent 60%);
            background-size: 200% 200%;
            -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
            -webkit-mask-composite: xor;
            mask-composite: exclude;
            pointer-events: none;
            z-index: 5;
            animation: borderRotate 6s linear infinite;
        }

        @keyframes ambientGlowMove {
            0% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
            100% { background-position: 0% 50%; }
        }

        @keyframes neonPulse {
            0% { transform: translate(-50%, -50%) scale(1); opacity: 0.3; }
            100% { transform: translate(-50%, -50%) scale(1.1); opacity: 0.6; }
        }

        @keyframes borderRotate {
            0% { background-position: 0% 0%; }
            100% { background-position: 200% 200%; }
        }
        `;
        BdApi.DOM.addStyle("AmbientProfileCSS", css);
    }

    addAmbientGlow(popout) {
        if (popout.querySelector('.ambient-profile-container')) return;

        setTimeout(() => {
            let imgUrl = null;
            const activityImg = popout.querySelector('img[src*="i.scdn.co"], img[src*="spotify"]');
            const avatarImg = popout.querySelector('svg foreignObject img, img[class*="avatar"]');

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
                    
                    const br = Math.min(255, Math.floor(r * 1.4));
                    const bg = Math.min(255, Math.floor(g * 1.4));
                    const bb = Math.min(255, Math.floor(b * 1.4));
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

                    popout.style.setProperty('--ambient-color-bright', "rgba(" + br + ", " + bg + ", " + bb + ", 1)");
                    
                    popout.insertBefore(containerDiv, popout.firstChild);
                } catch (e) {}
            };
        }, 200); 
    }
};
