/**
 * Enhanced Glow Effect Module
 * Multi-layer bloom system with audio-reactive color shifting and dynamic patterns
 * Matches the sophistication of the orbital mouse effects and audio analysis
 */
window.VisualizerEnhancedGlowEffect = class EnhancedGlowEffect {
    constructor(visualizer) {
        this.visualizer = visualizer;
        this.isEnabled = false;
        
        // Enhanced glow configuration
        this.glowConfig = {
            // Multi-layer bloom settings
            layers: [
                { size: 1.5, opacity: 0.8, blur: 'inner' },      // Tight inner glow
                { size: 3.0, opacity: 0.4, blur: 'mid' },        // Medium bloom
                { size: 6.0, opacity: 0.2, blur: 'outer' },      // Outer atmospheric glow
                { size: 12.0, opacity: 0.1, blur: 'atmosphere' }  // Distant atmosphere
            ],
            
            // Audio-reactive color shifting
            colorShift: {
                enabled: true,
                bassShift: 30,      // Degrees of hue shift for bass
                midShift: 15,       // Degrees for mid frequencies  
                highShift: 45,      // Degrees for high frequencies
                speed: 0.02         // Color transition speed
            },
            
            // Dynamic glow patterns
            patterns: {
                pulse: true,        // Pulse with audio intensity
                flicker: true,      // Subtle flicker on audio spikes
                corona: true,       // Corona effect around particles
                trails: true        // Brief glow trails on fast movement
            },
            
            // Performance optimization
            renderEveryNthFrame: 1,
            maxGlowRadius: 50,      // Cap for performance
            adaptiveQuality: true   // Reduce quality at high particle counts
        };
        
        // Animation state
        this.animationPhase = 0;
        this.frameCounter = 0;
        this.colorShiftPhase = 0;
        
        // Performance tracking
        this.lastRenderTime = 0;
        this.avgRenderTime = 16; // Start with 16ms assumption
    }
    
    initialize() {
        console.log('Enhanced Glow Effect initialized with multi-layer bloom');
        return true;
    }
    
    enable() {
        this.isEnabled = true;
        console.log('Enhanced Glow Effect enabled');
    }
    
    disable() {
        this.isEnabled = false;
        console.log('Enhanced Glow Effect disabled');
    }
    
    update(deltaTime) {
        if (!this.isEnabled) return;
        
        // Update animation phases
        this.animationPhase += 0.01 * deltaTime;
        this.colorShiftPhase += this.glowConfig.colorShift.speed * deltaTime;
        this.frameCounter++;
        
        // Wrap phases
        if (this.animationPhase > Math.PI * 2) this.animationPhase -= Math.PI * 2;
        if (this.colorShiftPhase > Math.PI * 2) this.colorShiftPhase -= Math.PI * 2;
    }
    
    /**
     * ENHANCED: Multi-layer bloom rendering with audio-reactive colors
     */
    renderGlow(ctx, particles) {
        if (!this.isEnabled) return;
        
        const startTime = performance.now();
        
        // Skip frames for performance if needed
        if (this.frameCounter % this.glowConfig.renderEveryNthFrame !== 0) return;
        
        // Adaptive quality based on particle count and performance
        const quality = this.calculateAdaptiveQuality(particles.length);
        
        // Store original canvas state
        const originalCompositeOperation = ctx.globalCompositeOperation;
        const originalAlpha = ctx.globalAlpha;
        
        // Get audio data for reactive effects
        const audioData = this.getAudioReactiveData();
        
        // Render each glow layer (back to front)
        this.glowConfig.layers.forEach((layer, layerIndex) => {
            this.renderGlowLayer(ctx, particles, layer, layerIndex, audioData, quality);
        });
        
        // Render special effects
        if (this.glowConfig.patterns.corona) {
            this.renderCoronaEffect(ctx, particles, audioData, quality);
        }
        
        if (this.glowConfig.patterns.trails) {
            this.renderGlowTrails(ctx, particles, audioData, quality);
        }
        
        // Restore canvas state
        ctx.globalCompositeOperation = originalCompositeOperation;
        ctx.globalAlpha = originalAlpha;
        
        // Track performance
        const renderTime = performance.now() - startTime;
        this.avgRenderTime = this.avgRenderTime * 0.9 + renderTime * 0.1;
    }
    
    /**
     * Render individual glow layer with audio-reactive properties
     */
    renderGlowLayer(ctx, particles, layer, layerIndex, audioData, quality) {
        // Use additive blending for bloom effect
        ctx.globalCompositeOperation = layerIndex === 0 ? 'screen' : 'lighter';
        
        particles.forEach(particle => {
            // Calculate layer-specific properties
            const baseRadius = particle.size * layer.size;
            const glowRadius = this.calculateLayerRadius(baseRadius, layer, audioData);
            
            // Skip if too small for performance
            if (glowRadius < 2 * quality) return;
            
            // Calculate audio-reactive opacity
            const opacity = this.calculateLayerOpacity(layer, audioData, particle);
            if (opacity < 0.05) return;
            
            // Get audio-reactive color
            const glowColor = this.getAudioReactiveColor(particle, audioData, layerIndex);
            
            // Create enhanced gradient based on layer type
            const gradient = this.createLayerGradient(ctx, particle, glowRadius, glowColor, layer);
            
            ctx.globalAlpha = opacity;
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(particle.x, particle.y, glowRadius, 0, Math.PI * 2);
            ctx.fill();
        });
    }
    
    /**
     * Create sophisticated gradients for different layer types
     */
    createLayerGradient(ctx, particle, radius, color, layer) {
        const gradient = ctx.createRadialGradient(
            particle.x, particle.y, 0,
            particle.x, particle.y, radius
        );
        
        switch (layer.blur) {
            case 'inner':
                // Tight, bright inner glow
                gradient.addColorStop(0, color);
                gradient.addColorStop(0.3, `${color}CC`); // 80% opacity
                gradient.addColorStop(0.7, `${color}66`); // 40% opacity
                gradient.addColorStop(1, 'transparent');
                break;
                
            case 'mid':
                // Soft medium bloom
                gradient.addColorStop(0, `${color}99`); // 60% opacity
                gradient.addColorStop(0.4, `${color}66`); // 40% opacity
                gradient.addColorStop(0.8, `${color}33`); // 20% opacity
                gradient.addColorStop(1, 'transparent');
                break;
                
            case 'outer':
                // Wide atmospheric glow
                gradient.addColorStop(0, `${color}66`); // 40% opacity
                gradient.addColorStop(0.3, `${color}33`); // 20% opacity
                gradient.addColorStop(0.7, `${color}1A`); // 10% opacity
                gradient.addColorStop(1, 'transparent');
                break;
                
            case 'atmosphere':
                // Distant atmospheric effect
                gradient.addColorStop(0, `${color}33`); // 20% opacity
                gradient.addColorStop(0.5, `${color}1A`); // 10% opacity
                gradient.addColorStop(1, 'transparent');
                break;
        }
        
        return gradient;
    }
    
    /**
     * Audio-reactive color shifting (matches your sophisticated audio analysis)
     */
    getAudioReactiveColor(particle, audioData, layerIndex) {
        // Get base particle color
        let baseColor = this.visualizer.visualEffects ? 
            this.visualizer.visualEffects.getParticleColor(particle) : 
            this.visualizer.config.primaryColor;
        
        if (!this.glowConfig.colorShift.enabled || !audioData.isActive) {
            return baseColor;
        }
        
        // Calculate hue shifts based on audio frequencies
        let totalShift = 0;
        totalShift += audioData.bass * this.glowConfig.colorShift.bassShift;
        totalShift += audioData.mid * this.glowConfig.colorShift.midShift; 
        totalShift += audioData.high * this.glowConfig.colorShift.highShift;
        
        // Add layer-specific variation
        totalShift += layerIndex * 10; // Each layer slightly different hue
        
        // Add time-based subtle shifting
        totalShift += Math.sin(this.colorShiftPhase) * 5;
        
        return this.shiftHue(baseColor, totalShift);
    }
    
    /**
     * Calculate layer radius with audio reactivity
     */
    calculateLayerRadius(baseRadius, layer, audioData) {
        let radius = baseRadius;
        
        // Audio size multiplier (sync with particle sizing)
        if (this.visualizer.audioEffectMultipliers && this.visualizer.audioEffectMultipliers.size) {
            radius *= this.visualizer.audioEffectMultipliers.size;
        }
        
        // Layer-specific audio reactivity
        if (audioData.isActive) {
            // Outer layers react more to bass
            const bassMultiplier = layer.size > 4 ? 1 + (audioData.bass * 0.3) : 1;
            radius *= bassMultiplier;
            
            // Pulse effect
            if (this.glowConfig.patterns.pulse) {
                const pulseAmount = Math.sin(this.animationPhase) * 0.1 * audioData.volume;
                radius *= (1 + pulseAmount);
            }
        }
        
        return Math.min(radius, this.glowConfig.maxGlowRadius);
    }
    
    /**
     * Calculate layer opacity with audio reactivity
     */
    calculateLayerOpacity(layer, audioData, particle) {
        let opacity = layer.opacity;
        
        // Audio intensity boost
        if (audioData.isActive) {
            opacity *= (1 + audioData.volume * 0.5);
            
            // Flicker effect on audio spikes
            if (this.glowConfig.patterns.flicker && audioData.spike) {
                opacity *= (1 + Math.random() * 0.3);
            }
        }
        
        return Math.min(opacity, 1.0);
    }
    
    /**
     * Corona effect - ring-like glow around particles
     */
    renderCoronaEffect(ctx, particles, audioData, quality) {
        if (!audioData.isActive || audioData.volume < 0.3) return;
        
        ctx.globalCompositeOperation = 'lighter';
        
        particles.forEach(particle => {
            const coronaRadius = particle.size * (8 + audioData.bass * 4);
            const coronaWidth = 3 * quality;
            
            ctx.globalAlpha = audioData.volume * 0.2;
            ctx.strokeStyle = this.getAudioReactiveColor(particle, audioData, 0);
            ctx.lineWidth = coronaWidth;
            ctx.beginPath();
            ctx.arc(particle.x, particle.y, coronaRadius, 0, Math.PI * 2);
            ctx.stroke();
        });
    }
    
    /**
     * Glow trails for fast-moving particles
     */
    renderGlowTrails(ctx, particles, audioData, quality) {
        ctx.globalCompositeOperation = 'lighter';
        
        particles.forEach(particle => {
            const speed = Math.sqrt(particle.vx * particle.vx + particle.vy * particle.vy);
            if (speed < 2) return; // Only show trails for fast particles
            
            const trailLength = Math.min(speed * 3, 20);
            const trailOpacity = Math.min(speed * 0.1, 0.3);
            
            // Calculate trail direction (opposite of velocity)
            const angle = Math.atan2(particle.vy, particle.vx);
            const trailEndX = particle.x - Math.cos(angle) * trailLength;
            const trailEndY = particle.y - Math.sin(angle) * trailLength;
            
            // Create trail gradient
            const gradient = ctx.createLinearGradient(
                particle.x, particle.y,
                trailEndX, trailEndY
            );
            
            const trailColor = this.getAudioReactiveColor(particle, audioData, 1);
            gradient.addColorStop(0, `${trailColor}${Math.round(trailOpacity * 255).toString(16).padStart(2, '0')}`);
            gradient.addColorStop(1, 'transparent');
            
            ctx.globalAlpha = 1;
            ctx.strokeStyle = gradient;
            ctx.lineWidth = particle.size * 2 * quality;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(particle.x, particle.y);
            ctx.lineTo(trailEndX, trailEndY);
            ctx.stroke();
        });
    }
    
    /**
     * Get audio data for reactive effects
     */
    getAudioReactiveData() {
        if (!this.visualizer.audioAnalyzer || !this.visualizer.audioAnalyzer.isActive) {
            return { isActive: false, volume: 0, bass: 0, mid: 0, high: 0, spike: false };
        }
        
        const audioData = this.visualizer.audioAnalyzer.analyzeAudio();
        
        // Check for spikes using your sophisticated spike detection
        const spike = this.visualizer.audioIntensity ? 
            this.visualizer.audioIntensity.getSpikeIntensity() > 0.3 : false;
        
        return {
            isActive: true,
            volume: audioData.volume,
            bass: audioData.bass,
            mid: audioData.mid,
            high: audioData.high,
            spike: spike
        };
    }
    
    /**
     * Calculate adaptive quality based on performance
     */
    calculateAdaptiveQuality(particleCount) {
        if (!this.glowConfig.adaptiveQuality) return 1.0;
        
        // Reduce quality if too many particles or slow performance
        if (particleCount > 100 || this.avgRenderTime > 8) {
            return 0.5; // Half quality
        }
        
        if (particleCount > 200 || this.avgRenderTime > 12) {
            return 0.25; // Quarter quality
        }
        
        return 1.0; // Full quality
    }
    
    /**
     * Shift hue of a color by specified degrees
     */
    shiftHue(hexColor, degrees) {
        // Convert hex to HSL, shift hue, convert back
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
        
        // Shift hue
        h = (h + degrees / 360) % 1;
        if (h < 0) h += 1;
        
        // Convert back to RGB
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
        
        // Convert back to hex
        const toHex = (c) => {
            const hex = Math.round(c * 255).toString(16);
            return hex.length === 1 ? '0' + hex : hex;
        };
        
        return `#${toHex(newR)}${toHex(newG)}${toHex(newB)}`;
    }
    
    destroy() {
        this.disable();
        this.visualizer = null;
    }
}; 