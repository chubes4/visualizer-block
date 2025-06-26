/**
 * LED Glow Effect Module
 * Makes particles themselves look like glowing LED bulbs by modifying their rendering
 * No separate layers - just enhanced particle appearance with radial gradients
 */
window.VisualizerLEDGlowEffect = class LEDGlowEffect {
    constructor(visualizer) {
        this.visualizer = visualizer;
        this.isEnabled = false;
        
        // LED glow configuration
        this.glowConfig = {
            // LED appearance settings
            coreIntensity: 1.0,        // Brightness of LED core (100%)
            haloSize: 2.5,             // Halo size multiplier (2.5x particle size)
            haloIntensity: 0.4,        // Halo brightness (40%)
            
            // Audio reactivity
            audioReactiveIntensity: true,  // Brightness reacts to audio
            audioReactiveColor: true,      // Color shifts with audio
            colorShiftAmount: 15,          // Degrees of hue shift
            
            // Performance
            useSimpleGradient: false,      // Use simpler gradient for performance
        };
        
        // Animation state
        this.animationPhase = 0;
        this.frameCounter = 0;
        
        // Gradient cache for performance
        this.gradientCache = new Map();
        this.lastCacheClean = 0;
    }
    
    initialize() {
        console.log('LED Glow Effect initialized - particle-based rendering');
        return true;
    }
    
    enable() {
        this.isEnabled = true;
        this.gradientCache.clear();
        console.log('LED Glow Effect enabled - particles will render as LED bulbs');
    }
    
    disable() {
        this.isEnabled = false;
        this.gradientCache.clear();
        console.log('LED Glow Effect disabled - back to normal particle rendering');
    }
    
    update(deltaTime) {
        if (!this.isEnabled) return;
        
        // Simple animation phase for subtle pulsing
        this.animationPhase += 0.01 * deltaTime;
        if (this.animationPhase > Math.PI * 2) {
            this.animationPhase -= Math.PI * 2;
        }
        
        this.frameCounter++;
        
        // Clean cache periodically
        const now = performance.now();
        if (now - this.lastCacheClean > 10000) { // Every 10 seconds
            this.cleanCache();
            this.lastCacheClean = now;
        }
    }
    
    /**
     * MAIN FUNCTION: Render particle as LED bulb
     * Called from the main particle rendering loop
     */
    renderLEDParticle(ctx, particle, audioData = null) {
        if (!this.isEnabled) {
            // Fallback to normal particle rendering
            this.renderNormalParticle(ctx, particle);
            return;
        }
        
        // Get audio data if not provided
        if (!audioData) {
            audioData = this.getAudioData();
        }
        
        // Calculate LED properties
        const ledRadius = this.calculateLEDRadius(particle, audioData);
        const ledColor = this.getLEDColor(particle, audioData);
        const ledIntensity = this.calculateLEDIntensity(particle, audioData);
        
        // DEBUGGING: Log first few particles to see what's happening
        if (this.frameCounter < 5 && Math.random() < 0.1) {
            console.log('LED Particle:', {
                radius: ledRadius,
                color: ledColor,
                intensity: ledIntensity,
                position: { x: particle.x, y: particle.y }
            });
        }
        
        // Create LED gradient for this specific particle
        const gradient = ctx.createRadialGradient(
            particle.x, particle.y, 0,
            particle.x, particle.y, ledRadius
        );
        
        // SIMPLIFIED: Start with basic glow to ensure it works
        gradient.addColorStop(0, ledColor);
        gradient.addColorStop(0.4, ledColor + '99'); // 60% opacity
        gradient.addColorStop(0.8, ledColor + '33'); // 20% opacity  
        gradient.addColorStop(1, 'transparent');
        
        // Render LED particle
        ctx.globalAlpha = particle.opacity * particle.life;
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, ledRadius, 0, Math.PI * 2);
        ctx.fill();
        
        // Reset alpha to prevent affecting other particles
        ctx.globalAlpha = 1.0;
    }
    
    /**
     * Calculate LED radius (includes halo)
     */
    calculateLEDRadius(particle, audioData) {
        let radius = particle.size * this.glowConfig.haloSize;
        
        // Audio size multiplier (sync with existing particle sizing)
        if (this.visualizer.audioEffectMultipliers?.size) {
            radius *= this.visualizer.audioEffectMultipliers.size;
        }
        
        // Subtle pulse effect
        if (audioData.isActive) {
            const pulseAmount = Math.sin(this.animationPhase) * 0.1 * audioData.volume;
            radius *= (1 + pulseAmount);
        }
        
        return radius;
    }
    
    /**
     * Calculate LED intensity based on audio
     */
    calculateLEDIntensity(particle, audioData) {
        let intensity = 1.0; // Base LED intensity
        
        // Audio intensity boost
        if (this.glowConfig.audioReactiveIntensity && audioData.isActive) {
            intensity *= (1 + audioData.volume * 0.5); // Up to 50% brighter
        }
        
        return Math.min(intensity, 1.5); // Cap at 150%
    }
    
    /**
     * Get LED color with audio-reactive hue shifting
     */
    getLEDColor(particle, audioData) {
        // Get base particle color
        let baseColor = this.visualizer.visualEffects ? 
            this.visualizer.visualEffects.getParticleColor(particle) : 
            this.visualizer.config.primaryColor;
        
        // No audio color shifting if not active or disabled
        if (!this.glowConfig.audioReactiveColor || !audioData.isActive) {
            return baseColor;
        }
        
        // Calculate hue shift based on audio frequencies
        const bassShift = audioData.bass * this.glowConfig.colorShiftAmount * 0.5;   // Bass = warm
        const highShift = audioData.high * this.glowConfig.colorShiftAmount * -0.5;  // High = cool
        const totalShift = bassShift + highShift;
        
        return this.shiftHue(baseColor, totalShift);
    }
    
    /**
     * Fallback normal particle rendering
     */
    renderNormalParticle(ctx, particle) {
        const color = this.visualizer.visualEffects ? 
            this.visualizer.visualEffects.getParticleColor(particle) : 
            this.visualizer.config.primaryColor;
        
        ctx.globalAlpha = particle.opacity * particle.life;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fill();
    }
    
    /**
     * Get audio data
     */
    getAudioData() {
        if (!this.visualizer.audioAnalyzer?.isActive) {
            return { isActive: false, volume: 0, bass: 0, high: 0 };
        }
        
        const audioData = this.visualizer.audioAnalyzer.analyzeAudio();
        return {
            isActive: true,
            volume: audioData.volume,
            bass: audioData.bass,
            high: audioData.high
        };
    }
    
    /**
     * Check if LED rendering is enabled
     */
    isLEDRenderingEnabled() {
        return this.isEnabled;
    }
    
    /**
     * Clean gradient cache
     */
    cleanCache() {
        if (this.gradientCache.size > 30) {
            const entries = Array.from(this.gradientCache.entries());
            this.gradientCache.clear();
            // Keep last 15
            entries.slice(-15).forEach(([key, value]) => {
                this.gradientCache.set(key, value);
            });
        }
    }
    
    /**
     * Hue shifting function
     */
    shiftHue(hexColor, degrees) {
        const r = parseInt(hexColor.slice(1, 3), 16) / 255;
        const g = parseInt(hexColor.slice(3, 5), 16) / 255;
        const b = parseInt(hexColor.slice(5, 7), 16) / 255;
        
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const diff = max - min;
        const add = max + min;
        const l = add * 0.5;
        
        let s, h;
        if (diff === 0) {
            s = h = 0;
        } else {
            s = l < 0.5 ? diff / add : diff / (2 - add);
            
            switch (max) {
                case r: h = ((g - b) / diff) + (g < b ? 6 : 0); break;
                case g: h = (b - r) / diff + 2; break;
                case b: h = (r - g) / diff + 4; break;
            }
            h /= 6;
        }
        
        h = (h + degrees / 360) % 1;
        if (h < 0) h += 1;
        
        let newR, newG, newB;
        if (s === 0) {
            newR = newG = newB = l;
        } else {
            const hue2rgb = (p, q, t) => {
                if (t < 0) t += 1;
                if (t > 1) t -= 1;
                if (t < 1/6) return p + (q - p) * 6 * t;
                if (t < 1/2) return q;
                if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
                return p;
            };
            
            const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
            const p = 2 * l - q;
            newR = hue2rgb(p, q, h + 1/3);
            newG = hue2rgb(p, q, h);
            newB = hue2rgb(p, q, h - 1/3);
        }
        
        const toHex = (c) => {
            const hex = Math.round(c * 255).toString(16);
            return hex.length === 1 ? '0' + hex : hex;
        };
        
        return `#${toHex(newR)}${toHex(newG)}${toHex(newB)}`;
    }
    
    destroy() {
        this.disable();
        this.gradientCache.clear();
        this.visualizer = null;
    }
}; 