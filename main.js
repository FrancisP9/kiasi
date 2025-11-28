import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { TextPlugin } from "gsap/TextPlugin";
import { Observer } from "gsap/Observer";
import Lenis from 'lenis';

gsap.registerPlugin(ScrollTrigger, TextPlugin, Observer);

// Init Lenis (Start stopped)
const lenis = new Lenis({
    duration: 1.2,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), // easeOutExpo
    orientation: 'vertical',
    gestureOrientation: 'vertical',
    smoothWheel: true,
    wheelMultiplier: 1,
    smoothTouch: false,
    touchMultiplier: 2,
});
lenis.stop(); // We control when it starts

// Force scroll to top on refresh
if (history.scrollRestoration) {
    history.scrollRestoration = 'manual';
}
window.scrollTo(0, 0);

function raf(time) {
    lenis.raf(time);
    requestAnimationFrame(raf);
}

requestAnimationFrame(raf);

// Connect Lenis to ScrollTrigger
// lenis.on('scroll', ScrollTrigger.update); // Not strictly necessary with latest GSAP but good practice
gsap.ticker.add((time) => {
    lenis.raf(time * 1000);
});
gsap.ticker.lagSmoothing(0);

// CONFIG
const isMobile = window.innerWidth < 768;
const ROTATE_FRAME_COUNT = isMobile ? 40 : 80; // Moins de frames sur mobile
const FRAME_STEP = isMobile ? 2 : 1; // On saute 1 frame sur 2 si mobile
const PATH_ROTATE = '/frames/rotate/rotate-';

const canvas = document.getElementById("hero-canvas");
const context = canvas.getContext("2d");
const video = document.getElementById("intro-video");

const imagesRotate = [];

const appState = {
    currentFrame: 0, 
    sequence: 'rotate' // Only rotate is handled by canvas now
};

// 1. PRELOADER LOGIC
function preloadImages() {
    // Only preload rotate frames. Video buffers automatically.
    const totalImages = ROTATE_FRAME_COUNT;
    let loadedCount = 0;

    const updateProgress = () => {
        loadedCount++;
        const percent = Math.round((loadedCount / totalImages) * 100);
        document.getElementById("percentage").innerText = `${percent}%`;
        document.getElementById("progress-fill").style.width = `${percent}%`;

        if (loadedCount === totalImages) {
            onImagesLoaded();
        }
    };

    // Load Rotate Frames
    const loadPromises = [];

    // Boucle adaptée : On charge i de 1 à 80, mais on saute si mobile
    // Ou mieux : on charge de 1 à ROTATE_FRAME_COUNT et on mappe les noms de fichiers
    
    for (let i = 0; i < ROTATE_FRAME_COUNT; i++) {
        const img = new Image();
        
        // Calcul du numéro de fichier réel (1 à 80)
        // Si mobile (40 frames) : i=0 -> file=1, i=1 -> file=3, i=2 -> file=5...
        // Formule : (i * FRAME_STEP) + 1
        const fileIndex = (i * FRAME_STEP) + 1;
        
        const frameNum = fileIndex.toString().padStart(4, '0');
        img.src = `${PATH_ROTATE}${frameNum}.webp`;
        
        const p = img.decode().then(() => {
            updateProgress();
        }).catch((e) => {
            console.warn(`Failed to decode frame ${fileIndex}`, e);
            updateProgress();
        });
        loadPromises.push(p);

        imagesRotate.push(img);
    }
}

// 2. CANVAS RENDERING
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    render(); // Re-render current frame on resize
}

window.addEventListener('resize', resizeCanvas);

function render() {
    // Clear
    context.clearRect(0, 0, canvas.width, canvas.height);

    const current = appState.currentFrame;
    const index1 = Math.floor(current);
    const index2 = Math.min(index1 + 1, ROTATE_FRAME_COUNT - 1);
    const progress = current - index1; // 0.0 to 0.999

    // Draw first frame full opacity
    const img1 = imagesRotate[index1];
    if (img1) {
        drawImageProp(context, img1);
    }

    // Draw next frame with opacity = progress for interpolation
    // OPTIMISATION MOBILE : Pas d'interpolation sur petit écran pour perf
    const isMobile = window.innerWidth < 768;
    
    const img2 = imagesRotate[index2];
    if (img2 && index2 !== index1) {
        if (!isMobile) {
            context.globalAlpha = progress;
            drawImageProp(context, img2);
            context.globalAlpha = 1.0; // Reset
        }
        // Sur mobile, on ne dessine pas l'image intermédiaire floue, on saute direct à la frame
    }
}

// Helper to contain/cover image in canvas
function drawImageProp(ctx, img, x, y, w, h, offsetX, offsetY) {
    if (arguments.length === 2) {
        x = y = 0;
        w = ctx.canvas.width;
        h = ctx.canvas.height;
    }

    offsetX = typeof offsetX === 'number' ? offsetX : 0.5;
    offsetY = typeof offsetY === 'number' ? offsetY : 0.5;

    if (offsetX < 0) offsetX = 0;
    if (offsetX > 1) offsetX = 1;
    if (offsetY < 0) offsetY = 0;
    if (offsetY > 1) offsetY = 1;

    var iw = img.width,
        ih = img.height,
        r = Math.min(w / iw, h / ih),
        nw = iw * r,   
        nh = ih * r,  
        cx, cy, cw, ch, ar = 1;
  
    if (nw < w) ar = w / nw;                             
    if (Math.abs(ar - 1) < 1e-14 && nh < h) ar = h / nh;
    nw *= ar;
    nh *= ar;

    cw = iw / (nw / w);
    ch = ih / (nh / h);

    cx = (iw - cw) * offsetX;
    cy = (ih - ch) * offsetY;

    if (cx < 0) cx = 0;
    if (cy < 0) cy = 0;
    if (cw > iw) cw = iw;
    if (ch > ih) ch = ih;

    ctx.drawImage(img, cx, cy, cw, ch,  x, y, w, h);
}

// 3. ANIMATION LOGIC
function onImagesLoaded() {
    resizeCanvas();
    
    // Lock scroll initially
    document.body.classList.add('no-scroll');
    
    // Pre-render the first frame of rotation so it's ready behind the video
    appState.currentFrame = 0;
    render();
    
    // Ensure canvas is hidden initially (behind video) or visible if video fails
    gsap.set(canvas, { opacity: 0 }); // Hide canvas initially

    // Hide Preloader
    gsap.to("#preloader", {
        y: "-100%",
        duration: 1,
        ease: "power2.inOut",
        onComplete: startVideoSequence
    });
}

function startVideoSequence() {
    // Accélérer la vidéo (1.5x = 50% plus rapide, 2.0 = 2x plus rapide)
    video.playbackRate = 2.0;
    
    // Ensure video is visible
    video.style.opacity = 1;
    
    // Play Video
    video.play().then(() => {
        // Video playing
        // Reveal canvas just before video ends to ensure seamless transition
    }).catch(err => {
        console.error("Video autoplay failed", err);
        // Fallback: Skip video, show canvas
        gsap.set(canvas, { opacity: 1 });
        video.style.opacity = 0;
        unlockScroll();
        initScrollSequence();
    });

    // Enhancement: CSS Filters for blur/darkness on video as requested
    gsap.set(video, { filter: "blur(10px) brightness(0.5) scale(1.1)" });
    
    // Clear up video filters
    gsap.to(video, {
        filter: "blur(0px) brightness(1) scale(1)",
        duration: 3,
        ease: "power2.out"
    });

    // Listen for video end
    video.addEventListener('ended', () => {
        // Show canvas NOW
        gsap.set(canvas, { opacity: 1 });
        
        // Fade out video to reveal canvas
        gsap.to(video, {
            opacity: 0,
            duration: 0.5,
            onComplete: () => {
                video.style.display = 'none'; // Remove from DOM flow if needed, or just keep hidden
                
                // Show Welcome Text
                gsap.to("#welcome-text", { opacity: 1, duration: 1, ease: "power2.out" });
                
                unlockScroll();
                initScrollSequence();
            }
        });
    });
}

function unlockScroll() {
    document.body.classList.remove('no-scroll');
}

function initScrollSequence() {
    // Observer Logic for Step-by-Step Scroll
    
    const heroSection = document.getElementById("hero-sequence");
    let currentStep = 0;
    const totalSteps = 4; // 0 (Start) -> 1 (Text1) -> 2 (Text2) -> 3 (Text3) -> 4 (Final)
    let isAnimating = false;

    // Define Steps State
    // Step 0: Frame 0, No Text
    // Step 1: Frame 20, Text 1
    // Step 2: Frame 40, Text 2
    // Step 3: Frame 60, Text 3
    // Step 4: Frame 79, Final Hero

    function goToStep(index) {
        if (isAnimating) return;
        isAnimating = true;
        currentStep = index;

        // Calculate Target Frame based on step and total frames (responsive)
        const framesPerStep = Math.floor(ROTATE_FRAME_COUNT / totalSteps);
        const targetFrame = Math.min(index * framesPerStep, ROTATE_FRAME_COUNT - 1);

        // 1. Animate Canvas Frames
        gsap.to(appState, {
            currentFrame: targetFrame,
            duration: 1.5, // Fixed duration for consistent feel
            ease: "power2.inOut",
            onUpdate: render,
            onComplete: () => {
                isAnimating = false;
                // If we reached the end, unlock the page
                if (currentStep === totalSteps) {
                    releaseToSite();
                }
            }
        });

        // 2. Animate Texts
        // Hide all first
        gsap.to(".hero-overlay", { opacity: 0, duration: 0.5 });
        
        // Hide Welcome Text explicitly on first move
        if (index > 0) {
            gsap.to("#welcome-text", { opacity: 0, duration: 0.5 });
        } else {
            // If we go back to step 0, show welcome text again?
            // Yes, let's show it again if we scroll back up to the very start
            gsap.to("#welcome-text", { opacity: 1, duration: 0.5, delay: 0.5 });
        }
        
        if (index === 1) {
            gsap.to("#rotate-text-1", { opacity: 1, duration: 0.8, delay: 0.3 });
        } else if (index === 2) {
            gsap.to("#rotate-text-2", { opacity: 1, duration: 0.8, delay: 0.3 });
        } else if (index === 3) {
            gsap.to("#rotate-text-3", { opacity: 1, duration: 0.8, delay: 0.3 });
        } else if (index === 4) {
            gsap.to("#hero-final", { opacity: 1, duration: 1, pointerEvents: "all", delay: 0.3 });
            initDynamicText(); // Start text loop
        }
    }

    // Create Observer to hijack scroll
    const observer = Observer.create({
        id: "hero-observer",
        target: window,
        type: "wheel,touch,pointer",
        tolerance: 10,
        preventDefault: true,
        onChange: (self) => {
            // Direction universelle : deltaY > 0 => On descend (Next)
            let isScrollingDown = self.deltaY > 0;

            // FIX MOBILE INVERSÉ : Si c'est du touch, on inverse la logique si besoin
            // (Si l'utilisateur dit que c'est à l'envers sur mobile, on inverse ici)
            const isTouch = self.event.type.startsWith("touch") || self.event.type.startsWith("pointer");
            if (isTouch) {
                isScrollingDown = !isScrollingDown;
            }

            if (isScrollingDown) {
                // NEXT STEP
                if (currentStep === 0) gsap.to("#welcome-text", { opacity: 0, duration: 0.3 });

                if (currentStep === totalSteps) {
                    observer.disable();
                    document.body.classList.remove('no-scroll'); 
                    document.body.style.overflow = '';
                    lenis.start();
                    lenis.resize();
                    initSectionAnimations();
                }
                else if (!isAnimating && currentStep < totalSteps) {
                    goToStep(currentStep + 1);
                }
            } else {
                // PREV STEP
                if (!isAnimating && currentStep > 0) {
                    goToStep(currentStep - 1);
                }
            }
        }
    });

    // On écoute le scroll Lenis pour réactiver le piège si on remonte tout en haut
    lenis.on('scroll', ({ scroll, velocity }) => {
        // On ne réactive que si on remonte (velocity < 0) et qu'on est tout en haut
        if (scroll <= 2 && velocity < 0 && currentStep === totalSteps) {
            observer.enable();
        }
    });

    // Helper to release (Simplified)
    function releaseToSite() {
        // On laisse le texte visible, on ne force rien.
    }
}

function initDynamicText() {
    const dynamicTexts = [
        "les marques ambitieuses.",
        "les créateurs afropéens.",
        "les visionnaires de demain.",
        "les entrepreneurs africains."
    ];
    
    let textIndex = 0;
    const textEl = document.querySelector(".dynamic-text");
    if(textEl) {
        setInterval(() => {
            textIndex = (textIndex + 1) % dynamicTexts.length;
            gsap.to(textEl, { opacity: 0, duration: 0.5, onComplete: () => {
                textEl.innerText = `Un studio conçu pour ${dynamicTexts[textIndex]}`;
                gsap.to(textEl, { opacity: 1, duration: 0.5 });
            }});
        }, 3000);
    }
}

function initSectionAnimations() {
    console.log("Sections ready");

    // 1. MANIFESTO : Advanced Scroll Reveal (Blur + Opacity + Rotation)
    const manifestoText = document.querySelector(".manifesto-text");
    if(manifestoText) {
        // 1. Split Text manually into words
        const textContent = manifestoText.innerText; // Get pure text
        const words = textContent.split(/(\s+)/); // Split keeping spaces
        
        manifestoText.innerHTML = ""; // Clear content
        
        words.forEach(word => {
            if(word.match(/^\s+$/)) {
                manifestoText.appendChild(document.createTextNode(word));
            } else {
                const span = document.createElement("span");
                span.classList.add("word");
                span.innerText = word;
                
                // RE-APPLY STYLE FOR KEYWORDS (Fix for lost spans)
                if (word.includes("l'héritage") || word.includes("culturel") || word.includes("l'excellence") || word.includes("digitale")) {
                    span.style.fontFamily = "'Playfair Display', serif";
                    span.style.fontStyle = "italic";
                    span.style.color = "#F5B75A"; // Gold
                }

                // Style initial pour animation
                span.style.opacity = "0.2";
                span.style.filter = "blur(4px)";
                span.style.display = "inline-block";
                span.style.willChange = "opacity, filter, transform";
                manifestoText.appendChild(span);
            }
        });

        // 2. Animate Words (Opacity + Blur)
        const wordElements = manifestoText.querySelectorAll(".word");
        
        gsap.to(wordElements, {
            scrollTrigger: {
                trigger: manifestoText,
                start: "top 80%",
                end: "bottom 60%",
                scrub: 1
            },
            opacity: 1,
            filter: "blur(0px)",
            stagger: 0.05,
            ease: "none"
        });

        // 3. Animate Container Rotation (Subtle 3D feel)
        gsap.fromTo(manifestoText, 
            { rotation: 3, transformOrigin: "0% 50%" },
            {
                rotation: 0,
                ease: "none",
                scrollTrigger: {
                    trigger: manifestoText,
                    start: "top bottom",
                    end: "bottom bottom",
                    scrub: 1
                }
            }
        );
    }

    // 2. EXPERTISES : Scroll Float Effect (Letters floating up with stretch)
    const expTitles = document.querySelectorAll(".exp-title");
    expTitles.forEach(title => {
        const chars = title.innerText.split("");
        title.innerHTML = "";
        
        chars.forEach(char => {
            const span = document.createElement("span");
            span.innerText = char === " " ? "\u00A0" : char;
            span.classList.add("char");
            span.style.display = "inline-block";
            span.style.willChange = "opacity, transform";
            title.appendChild(span);
        });
        
        const charElements = title.querySelectorAll(".char");
        
        gsap.fromTo(charElements, 
            {
                yPercent: 120,
                scaleY: 2.3,
                scaleX: 0.7,
                transformOrigin: "50% 0%",
                opacity: 0
            },
            {
                duration: 1,
                ease: "back.out(2)",
                yPercent: 0,
                scaleY: 1,
                scaleX: 1,
                opacity: 1,
                stagger: 0.05,
                scrollTrigger: {
                    trigger: title,
                    start: "top 90%",
                    end: "top 60%",
                    scrub: 1
                }
            }
        );
    });

    // 3. WORKS : SCROLL STACK EFFECT (Advanced)
    const cards = gsap.utils.toArray(".project-item");
    
    cards.forEach((card, i) => {
        if (i === cards.length - 1) return; // Pas d'effet sur la dernière

        gsap.to(card, {
            scale: 0.85, 
            opacity: 0, 
            scrollTrigger: {
                trigger: card,
                start: "top 15%", // Doit matcher le top: 15vh du CSS .project-item
                end: "bottom top", 
                scrub: true,
                // markers: true
            }
        });
    });

    // 4. FOUNDERS : Reveal (Disabled for stability)
    /*
    gsap.from(".founder-card", {
        scrollTrigger: {
            trigger: "#founders",
            start: "top 75%"
        },
        y: 50,
        opacity: 0,
        stagger: 0.2,
        duration: 1,
        ease: "power2.out"
    });
    */

    // 5. CONTACT : Reveal (Disabled for stability)
    /*
    gsap.from(".contact-left, .contact-right", {
        scrollTrigger: {
            trigger: "#contact",
            start: "top 75%"
        },
        y: 50,
        opacity: 0,
        stagger: 0.2,
        duration: 1,
        ease: "power2.out"
    });
    */
}

// Global Modal Functions
window.openVideoModal = function(src) {
    const modal = document.getElementById("video-modal");
    const video = document.getElementById("modal-video");
    
    if (modal && video) {
        video.src = src;
        modal.classList.add("active");
        video.play();
    }
}

window.closeVideoModal = function() {
    const modal = document.getElementById("video-modal");
    const video = document.getElementById("modal-video");
    
    if (modal && video) {
        modal.classList.remove("active");
        video.pause();
        video.currentTime = 0;
    }
}

// Start
window.addEventListener('load', preloadImages);
