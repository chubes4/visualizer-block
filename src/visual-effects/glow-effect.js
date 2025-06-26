/**
 * Glow Effect Module
 * Creates a standalone particle glow effect using efficient canvas rendering
 * Can work independently or with audio sync for intensity control
 */
window.VisualizerGlowEffect = class GlowEffect {
    constructor(visualizer) {
        this.visualizer = visualizer;
        this.isEnabled = false;
        this.audioIntensity = null; // Reference to audio intensity system
        
        // Glow configuration
        this.glowConfig = {
            // Base glow settings (completely standalone)
            baseIntensity: 0.6,         // Glow intensity (0-1)
            baseSize: 12,               // Reduced glow radius multiplier
            pulseSpeed: 0.01,           // Slower, more subtle pulsing (audio mode only)
            
            // Visual configuration
            glowColor: '#64ffda',       // Cyan glow color (matches primary)
            glowOpacity: 0.3,           // Base glow opacity
            
            // Performance settings
            renderEveryNthFrame: 1      // Render every frame by default
        };
        
        // Animation state
        this.animationPhase = 0;        // Phase for subtle pulsing animation
        this.frameCounter = 0;          // For frame skipping
    }
    
    /**
     * Initialize the glow effect
     */
    initialize() {
        // Get reference to audio intensity system if available
        if (this.visualizer.audioIntensity) {
            this.audioIntensity = this.visualizer.audioIntensity;
        }
        
        console.log('Glow Effect initialized with efficient canvas rendering');
        return true;
    }
    
    /**
     * Enable the glow effect
     */
    enable() {
        this.isEnabled = true;
        console.log('Glow Effect enabled');
    }
    
    /**
     * Disable the glow effect
     */
    disable() {
        this.isEnabled = false;
        console.log('Glow Effect disabled');
    }
    
    /**
     * Update glow animation (call this every frame)
     */
    update(deltaTime) {
        if (!this.isEnabled) return;
        
        // Update animation phase for subtle pulsing
        this.animationPhase += this.glowConfig.pulseSpeed * deltaTime;
        if (this.animationPhase > Math.PI * 2) {
            this.animationPhase -= Math.PI * 2;
        }
        
        this.frameCounter++;
    }
    
    /**
     * Calculate glow intensity for current frame
     */
    calculateGlowIntensity() {
        if (!this.isEnabled) return 0;
        
        let intensity = this.glowConfig.baseIntensity;
        
        // Check if audio effects are active and sync with particle size pulsing
        if (this.visualizer.audioEffectMultipliers && this.visualizer.audioEffectMultipliers.size) {
            // Use the same size multiplier that affects particles for glow intensity
            const sizeMultiplier = this.visualizer.audioEffectMultipliers.size;
            
            // Scale intensity with the size multiplier (when particles get bigger, glow gets brighter)
            intensity *= sizeMultiplier;
            
            // Cap the intensity to prevent it from getting too bright
            intensity = Math.min(1.0, intensity);
        }
        // Otherwise, keep steady intensity (no pulsing for regular mode)
        
        return intensity;
    }
    
    /**
     * Calculate glow radius multiplier based on audio effects
     */
    calculateGlowRadius(baseRadius) {
        let radiusMultiplier = 1.0;
        
        // Check if audio effects are active and sync with particle size pulsing
        if (this.visualizer.audioEffectMultipliers && this.visualizer.audioEffectMultipliers.size) {
            // Use the same size multiplier that affects particles for glow radius
            radiusMultiplier = this.visualizer.audioEffectMultipliers.size;
        }
        
        return baseRadius * radiusMultiplier;
    }
    
    /**
     * Render glow effects using super efficient approach
     */
    renderGlow(ctx, particles) {
        if (!this.isEnabled) return;
        
        // Skip frames for performance if needed
        if (this.frameCounter % this.glowConfig.renderEveryNthFrame !== 0) return;
        
        const intensity = this.calculateGlowIntensity();
        if (intensity < 0.1) return; // Skip if too dim
        
        // Store original canvas state
        const originalCompositeOperation = ctx.globalCompositeOperation;
        const originalAlpha = ctx.globalAlpha;
        
        // Use screen blending for glow effect
        ctx.globalCompositeOperation = 'screen';
        
        // Calculate glow properties
        const glowOpacity = this.glowConfig.glowOpacity * intensity;
        
        // Render glow for each particle - SIMPLE AND FAST
        ctx.globalAlpha = glowOpacity;
        
        particles.forEach(particle => {
            const glowRadius = this.calculateGlowRadius(particle.size * this.glowConfig.baseSize * intensity);
            
            // Create simple radial gradient - MUCH faster than multiple shadows
            const gradient = ctx.createRadialGradient(
                particle.x, particle.y, 0,
                particle.x, particle.y, glowRadius
            );
            
            // Use the particle's color or default glow color
            const glowColor = this.getParticleGlowColor(particle);
            gradient.addColorStop(0, glowColor);
            gradient.addColorStop(0.4, `${glowColor}66`); // 40% opacity
            gradient.addColorStop(1, 'transparent');
            
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(particle.x, particle.y, glowRadius, 0, Math.PI * 2);
            ctx.fill();
        });
        
        // Restore original canvas state
        ctx.globalCompositeOperation = originalCompositeOperation;
        ctx.globalAlpha = originalAlpha;
    }
    
    /**
     * Get glow color for a particle
     */
    getParticleGlowColor(particle) {
        // Use the particle's current color if it has one, otherwise use default glow color
        if (particle.color) {
            return particle.color;
        }
        
        // Get color from visual effects system
        if (this.visualizer.visualEffects) {
            return this.visualizer.visualEffects.getParticleColor(particle);
        }
        
        return this.glowConfig.glowColor;
    }
    
    /**
     * Update configuration
     */
    updateConfig(newConfig) {
        if (newConfig) {
            Object.assign(this.glowConfig, newConfig);
        }
    }
    
    /**
     * Get current glow status for debugging
     */
    getStatus() {
        return {
            isEnabled: this.isEnabled,
            currentIntensity: this.calculateGlowIntensity(),
            config: this.glowConfig,
            renderingMethod: 'Canvas'
        };
    }
    
    /**
     * Cleanup
     */
    destroy() {
        this.disable();
        this.audioIntensity = null;
        this.visualizer = null;
    }
}; 