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
const ROTATE_FRAME_COUNT = 80;
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

    for (let i = 1; i <= ROTATE_FRAME_COUNT; i++) {
        const img = new Image();
        const frameNum = i.toString().padStart(4, '0');
        img.src = `${PATH_ROTATE}${frameNum}.webp`;
        
        const p = img.decode().then(() => {
            updateProgress();
        }).catch((e) => {
            console.warn(`Failed to decode frame ${i}`, e);
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
    const img2 = imagesRotate[index2];
    if (img2 && index2 !== index1) {
        context.globalAlpha = progress;
        drawImageProp(context, img2);
        context.globalAlpha = 1.0; // Reset
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
    
    // Play Video
    video.play().then(() => {
        // Video playing
    }).catch(err => {
        console.error("Video autoplay failed", err);
        // Fallback: Skip video, show canvas
        unlockScroll();
        initScrollSequence();
    });

    // Enhancement: CSS Filters for blur/darkness on video as requested
    // "au début l’image est zoomée + floue + sombre" -> applied to video via GSAP
    gsap.set(video, { filter: "blur(10px) brightness(0.5) scale(1.1)" });
    
    // Clear up video filters
    gsap.to(video, {
        filter: "blur(0px) brightness(1) scale(1)",
        duration: 3,
        ease: "power2.out"
    });

    // Listen for video end
    video.addEventListener('ended', () => {
        // Fade out video to reveal canvas (which is already displaying frame 0)
        gsap.to(video, {
            opacity: 0,
            duration: 0.5,
            onComplete: () => {
                video.style.display = 'none'; // Remove from DOM flow if needed, or just keep hidden
                
                // Main content is now visible by default
                
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

        // Calculate Target Frame based on step
        // 80 frames / 4 steps = 20 frames per step roughly
        // Step 0=0, Step 1=20, Step 2=40, Step 3=60, Step 4=79
        const targetFrame = Math.min(index * 20, ROTATE_FRAME_COUNT - 1);

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
        onDown: () => {
            // Si on est à la fin (étape 4)
            if (currentStep === totalSteps) {
                // STABILISATION : On ne déclenche la suite que si on scrolle vraiment
                // (pour éviter les faux positifs ou les enchaînements trop rapides)
                
                // On n'a pas besoin de faire disparaitre le texte ici, 
                // c'est le scroll natif de Lenis qui le fera disparaitre en montant le contenu par dessus.
                
                observer.disable();
                lenis.start();
                // On retire l'auto-scroll qui faisait "sauter" le texte
                // lenis.scrollTo("#services", { offset: -50, duration: 1.5 }); 
                
                // On laisse l'utilisateur scroller naturellement pour découvrir la suite
                initSectionAnimations();
            }
            else if (!isAnimating && currentStep < totalSteps) {
                goToStep(currentStep + 1);
            }
        },
        onUp: () => {
            if (!isAnimating && currentStep > 0) {
                goToStep(currentStep - 1);
            }
        }
    });

    // On écoute le scroll Lenis pour réactiver le piège si on remonte tout en haut
    lenis.on('scroll', ({ scroll }) => {
        if (scroll <= 5 && currentStep === totalSteps) {
            // Réactiver le piège si on est tout en haut
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
    // Animations désactivées pour l'instant pour garantir l'affichage
    console.log("Sections ready");
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
