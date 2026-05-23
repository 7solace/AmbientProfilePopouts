/**
 * @name AmbientProfilePopouts
 * @author s7lace
 * @version 1.0.6
 * @description Profil kartlarına avatar ve etkinlik kapaklarına göre dinamik, GPU dostu ortam ışığı/gradyan ekler.
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
        document.querySelectorAll('.ambient-profile-bg').forEach(el => el.remove());
    }

    injectCSS() {
        const css = `
        [class*="userProfileOuter_"] {
            background: rgba(15, 15, 15, 0.70) !important;
            backdrop-filter: blur(15px) !important;
            position: relative !important;
            overflow: hidden !important;
            z-index: 1;
        }

        .ambient-profile-bg {
            position: absolute;
            inset: -50%;
            z-index: 0;
            pointer-events: none;
            background: radial-gradient(circle at 50% 50%, var(--ambient-color, rgba(114, 137, 218, 0.5)) 0%, transparent 65%);
            background-size: 150% 150%;
            opacity: 0.6;
            animation: ambientPulse 5s ease-in-out infinite alternate;
            mix-blend-mode: screen;
        }

        @keyframes ambientPulse {
            0% { opacity: 0.4; transform: scale(1); }
            100% { opacity: 0.8; transform: scale(1.05); }
        }

        [class*="userProfileInner_"] {
            position: relative;
            z-index: 2;
            background: transparent !important;
        }
        `;
        BdApi.DOM.addStyle("AmbientProfileCSS", css);
    }

    addAmbientGlow(popout) {
        if (popout.querySelector('.ambient-profile-bg')) return;

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
                    
                    const glowDiv = document.createElement('div');
                    glowDiv.className = 'ambient-profile-bg';
                    glowDiv.style.setProperty('--ambient-color', "rgb(" + r + ", " + g + ", " + b + ")");
                    
                    popout.insertBefore(glowDiv, popout.firstChild);
                } catch (e) {}
            };
        }, 200); 
    }
};