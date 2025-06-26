/**
 * Optimized Glow Effect Module
 * High-impact glow with minimal performance cost using smart Canvas 2D techniques
 * Better than basic glow, much faster than multi-layer bloom
 */
window.VisualizerOptimizedGlowEffect = class OptimizedGlowEffect {
    constructor(visualizer) {
        this.visualizer = visualizer;
        this.isEnabled = false;
        
        // Performance-first glow configuration
        this.glowConfig = {
            // Smart single-layer glow with enhanced gradients
            baseIntensity: 0.5,
            baseSize: 8,                    // Smaller base size for performance
            audioReactiveSize: true,        // Size reacts to audio
            audioReactiveColor: true,       // Color shifts with audio
            
            // Performance optimizations
            renderEveryNthFrame: 1,         // Can increase for more performance
            maxGlowRadius: 30,              // Much smaller max radius
            adaptiveQuality: true,
            batchRendering: true,           // Group similar glows together
            
            // Enhanced visual tricks (low cost, high impact)
            dynamicOpacity: true,           // Opacity varies with audio
            pulseEffect: true,              // Subtle pulse animation
            colorShiftIntensity: 20,        // Degrees of hue shift (reduced from 45)
        };
        
        // Animation and performance state
        this.animationPhase = 0;
        this.frameCounter = 0;
        this.lastRenderTime = 0;
        this.avgRenderTime = 8; // Target under 8ms
        
        // Pre-calculated performance optimizations
        this.gradientCache = new Map(); // Cache gradients
        this.colorCache = new Map();    // Cache shifted colors
        this.lastCacheClean = 0;        // Clean caches periodically
    }
    
    initialize() {
        console.log('Optimized Glow Effect initialized - performance-first approach');
        return true;
    }
    
    enable() {
        this.isEnabled = true;
        // Clear caches when enabling
        this.gradientCache.clear();
        this.colorCache.clear();
        console.log('Optimized Glow Effect enabled');
    }
    
    disable() {
        this.isEnabled = false;
        // Clear caches to free memory
        this.gradientCache.clear();
        this.colorCache.clear();
        console.log('Optimized Glow Effect disabled');
    }
    
    update(deltaTime) {
        if (!this.isEnabled) return;
        
        // Update animation phase (much simpler than before)
        this.animationPhase += 0.008 * deltaTime; // Slower for subtlety
        if (this.animationPhase > Math.PI * 2) {
            this.animationPhase -= Math.PI * 2;
        }
        
        this.frameCounter++;
        
        // Clean caches every 5 seconds to prevent memory buildup
        const now = performance.now();
        if (now - this.lastCacheClean > 5000) {
            this.cleanCaches();
            this.lastCacheClean = now;
        }
    }
    
    /**
     * OPTIMIZED: Single-pass glow with smart batching and caching
     */
    renderGlow(ctx, particles) {
        if (!this.isEnabled) return;
        
        const startTime = performance.now();
        
        // Adaptive frame skipping based on performance
        const shouldSkip = this.shouldSkipFrame();
        if (shouldSkip) return;
        
        // Get audio data once
        const audioData = this.getAudioData();
        
        // Store original canvas state
        const originalCompositeOperation = ctx.globalCompositeOperation;
        const originalAlpha = ctx.globalAlpha;
        
        // Use screen blend mode for glow effect
        ctx.globalCompositeOperation = 'screen';
        
        // PERFORMANCE OPTIMIZATION: Batch particles by similar glow properties
        if (this.glowConfig.batchRendering) {
            this.renderBatchedGlow(ctx, particles, audioData);
        } else {
            this.renderIndividualGlow(ctx, particles, audioData);
        }
        
        // Restore canvas state
        ctx.globalCompositeOperation = originalCompositeOperation;
        ctx.globalAlpha = originalAlpha;
        
        // Track performance
        const renderTime = performance.now() - startTime;
        this.avgRenderTime = this.avgRenderTime * 0.9 + renderTime * 0.1;
    }
    
    /**
     * PERFORMANCE WINNER: Batch similar glows together
     */
    renderBatchedGlow(ctx, particles, audioData) {
        // Group particles by similar glow characteristics
        const batches = new Map();
        
        particles.forEach(particle => {
            // Calculate glow properties
            const glowRadius = this.calculateGlowRadius(particle, audioData);
            const glowColor = this.getGlowColor(particle, audioData);
            const glowOpacity = this.calculateGlowOpacity(particle, audioData);
            
            // Skip tiny or invisible glows
            if (glowRadius < 3 || glowOpacity < 0.1) return;
            
            // Create batch key (rounded values for grouping)
            const radiusKey = Math.round(glowRadius / 2) * 2; // Round to nearest 2
            const opacityKey = Math.round(glowOpacity * 10); // Round to nearest 0.1
            const colorKey = glowColor; // Colors are already discrete
            
            const batchKey = `${radiusKey}-${opacityKey}-${colorKey}`;
            
            if (!batches.has(batchKey)) {
                batches.set(batchKey, {
                    radius: radiusKey,
                    opacity: opacityKey / 10,
                    color: colorKey,
                    particles: []
                });
            }
            
            batches.get(batchKey).particles.push(particle);
        });
        
        // Render each batch efficiently
        batches.forEach(batch => {
            if (batch.particles.length === 0) return;
            
            // Get or create cached gradient
            const gradient = this.getCachedGradient(batch.radius, batch.color);
            
            ctx.globalAlpha = batch.opacity;
            ctx.fillStyle = gradient;
            
            // Single beginPath for entire batch
            ctx.beginPath();
            batch.particles.forEach(particle => {
                ctx.moveTo(particle.x + batch.radius, particle.y);
                ctx.arc(particle.x, particle.y, batch.radius, 0, Math.PI * 2);
            });
            ctx.fill();
        });
    }
    
    /**
     * Fallback individual rendering (still optimized)
     */
    renderIndividualGlow(ctx, particles, audioData) {
        particles.forEach(particle => {
            const glowRadius = this.calculateGlowRadius(particle, audioData);
            const glowColor = this.getGlowColor(particle, audioData);
            const glowOpacity = this.calculateGlowOpacity(particle, audioData);
            
            // Skip tiny or invisible glows
            if (glowRadius < 3 || glowOpacity < 0.1) return;
            
            // Get cached gradient
            const gradient = this.getCachedGradient(glowRadius, glowColor);
            
            ctx.globalAlpha = glowOpacity;
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(particle.x, particle.y, glowRadius, 0, Math.PI * 2);
            ctx.fill();
        });
    }
    
    /**
     * Smart gradient caching - major performance boost
     */
    getCachedGradient(radius, color) {
        const cacheKey = `${Math.round(radius)}-${color}`;
        
        if (this.gradientCache.has(cacheKey)) {
            return this.gradientCache.get(cacheKey);
        }
        
        // Create optimized gradient (single calculation)
        const canvas = document.createElement('canvas');
        const size = radius * 2 + 2;
        canvas.width = canvas.height = size;
        const ctx = canvas.getContext('2d');
        
        const gradient = ctx.createRadialGradient(
            size/2, size/2, 0,
            size/2, size/2, radius
        );
        
        // Optimized gradient stops (fewer stops = better performance)
        gradient.addColorStop(0, color);
        gradient.addColorStop(0.4, `${color}99`); // 60% opacity
        gradient.addColorStop(0.8, `${color}33`); // 20% opacity
        gradient.addColorStop(1, 'transparent');
        
        // Cache the gradient
        this.gradientCache.set(cacheKey, gradient);
        
        return gradient;
    }
    
    /**
     * Calculate glow radius with audio reactivity
     */
    calculateGlowRadius(particle, audioData) {
        let radius = particle.size * this.glowConfig.baseSize;
        
        // Audio size multiplier (sync with particle sizing)
        if (this.glowConfig.audioReactiveSize && this.visualizer.audioEffectMultipliers?.size) {
            radius *= this.visualizer.audioEffectMultipliers.size;
        }
        
        // Subtle pulse effect (low cost)
        if (this.glowConfig.pulseEffect && audioData.isActive) {
            const pulseAmount = Math.sin(this.animationPhase) * 0.15 * audioData.volume;
            radius *= (1 + pulseAmount);
        }
        
        return Math.min(radius, this.glowConfig.maxGlowRadius);
    }
    
    /**
     * Calculate glow opacity with audio reactivity
     */
    calculateGlowOpacity(particle, audioData) {
        let opacity = this.glowConfig.baseIntensity;
        
        // Audio intensity boost (but capped)
        if (this.glowConfig.dynamicOpacity && audioData.isActive) {
            opacity *= (1 + audioData.volume * 0.4); // Less aggressive than before
        }
        
        return Math.min(opacity, 0.8); // Cap at 80% to prevent overwhelming
    }
    
    /**
     * Get glow color with smart caching
     */
    getGlowColor(particle, audioData) {
        // Get base color
        let baseColor = this.visualizer.visualEffects ? 
            this.visualizer.visualEffects.getParticleColor(particle) : 
            this.visualizer.config.primaryColor;
        
        // No audio color shifting if not active or disabled
        if (!this.glowConfig.audioReactiveColor || !audioData.isActive) {
            return baseColor;
        }
        
        // Calculate hue shift (simplified)
        const hueShift = (audioData.bass * 0.3 + audioData.high * 0.7) * this.glowConfig.colorShiftIntensity;
        
        // Check cache first
        const cacheKey = `${baseColor}-${Math.round(hueShift)}`;
        if (this.colorCache.has(cacheKey)) {
            return this.colorCache.get(cacheKey);
        }
        
        // Calculate and cache
        const shiftedColor = this.shiftHue(baseColor, hueShift);
        this.colorCache.set(cacheKey, shiftedColor);
        
        return shiftedColor;
    }
    
    /**
     * Get audio data (simplified)
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
     * Performance-based frame skipping
     */
    shouldSkipFrame() {
        // Skip frames if performance is poor
        if (this.avgRenderTime > 10) {
            return this.frameCounter % 2 !== 0; // Skip every other frame
        }
        
        if (this.avgRenderTime > 15) {
            return this.frameCounter % 3 !== 0; // Skip 2 out of 3 frames
        }
        
        return false; // Don't skip
    }
    
    /**
     * Clean caches to prevent memory buildup
     */
    cleanCaches() {
        // Keep only the most recent 50 gradients and colors
        if (this.gradientCache.size > 50) {
            const entries = Array.from(this.gradientCache.entries());
            this.gradientCache.clear();
            // Keep last 25
            entries.slice(-25).forEach(([key, value]) => {
                this.gradientCache.set(key, value);
            });
        }
        
        if (this.colorCache.size > 100) {
            const entries = Array.from(this.colorCache.entries());
            this.colorCache.clear();
            // Keep last 50
            entries.slice(-50).forEach(([key, value]) => {
                this.colorCache.set(key, value);
            });
        }
    }
    
    /**
     * Optimized hue shifting (same as before, but cached)
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
    
    /**
     * Get performance stats for debugging
     */
    getPerformanceStats() {
        return {
            avgRenderTime: this.avgRenderTime.toFixed(2) + 'ms',
            gradientCacheSize: this.gradientCache.size,
            colorCacheSize: this.colorCache.size,
            frameSkipping: this.avgRenderTime > 10
        };
    }
    
    destroy() {
        this.disable();
        this.gradientCache.clear();
        this.colorCache.clear();
        this.visualizer = null;
    }
}; 