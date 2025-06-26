/**
 * Visual Effects Module
 * Handles visual enhancements like color changes, particle effects, etc.
 */
window.VisualizerVisualEffects = class VisualEffects {
    constructor(visualizer) {
        this.visualizer = visualizer;
        this.collisionCallback = null;
        
        // Color cache for performance optimization
        this.colorCache = {
            primary: {},    // Cached rotated primary colors
            secondary: {}   // Cached rotated secondary colors
        };
        this.cacheInitialized = false;
        
        // High-performance color interpolation system (replaces expensive canvas gradients)
        this.colorInterpolationCache = new Map(); // Cache interpolated colors
        this.useColorInterpolation = true; // Much faster than canvas gradients
        
        // Collision cooldown to prevent multiple changes per collision
        this.collisionCooldowns = new Map(); // particle.id -> timestamp
        this.cooldownDuration = 50; // milliseconds - reduced for more responsive color changes
    }
    
    /**
     * Initialize visual effects and subscribe to collision events
     */
    initialize(collisionDetector) {
        this.collisionDetector = collisionDetector;
        
        // Subscribe to collision events for color changes
        this.collisionCallback = (particle1, particle2, collisionData) => {
            if (this.visualizer.config.collisionColorChange) {
                this.onParticleCollision(particle1);
                this.onParticleCollision(particle2);
            }
        };
        
        this.collisionDetector.subscribe(this.collisionCallback);
    }
    
    /**
     * Pre-calculate all possible colors for performance - EXPANDED to 128 amazing colors
     */
    initializeColorCache() {
        if (this.cacheInitialized) return;
        
        const primaryColor = this.visualizer.config.primaryColor;
        const secondaryColor = this.visualizer.config.secondaryColor;
        
        // Pre-calculate all 128 possible colors (2.8-degree increments for smooth spectrum)
        for (let i = 0; i < 128; i++) {
            const degrees = (i / 128) * 360; // Smooth 360-degree spectrum
            this.colorCache.primary[Math.round(degrees)] = this.rotateHue(primaryColor, degrees);
            this.colorCache.secondary[Math.round(degrees)] = this.rotateHue(secondaryColor, degrees);
        }
        
        this.cacheInitialized = true;
    }
    
    /**
     * Clear color cache when colors change
     */
    clearColorCache() {
        this.colorCache.primary = {};
        this.colorCache.secondary = {};
        this.cacheInitialized = false;
        
        // Also clear interpolation cache when base colors change
        this.colorInterpolationCache.clear();
    }
    
    /**
     * Initialize particle color tracking for hue rotation
     * OPTIMIZED: Only process new particles, not all particles every frame
     */
    initializeParticleColors(particles) {
        // Fast return if collision colors are disabled
        if (!this.visualizer.config.collisionColorChange) {
            return;
        }
        
        // Initialize color cache if collision colors are enabled
        this.initializeColorCache();
        
        // Only process particles that haven't been initialized yet (major optimization)
        let newParticles = 0;
        particles.forEach(particle => {
            if (!particle.hasOwnProperty('hueRotation')) {
                particle.hueRotation = 0; // Track total hue rotation
                particle.currentColor = this.visualizer.config.primaryColor; // Current display color
                particle.currentConnectionColor = this.visualizer.config.secondaryColor; // Current connection color
                particle.colorCacheValid = true; // Track if cached color is still valid
                
                // Generate unique ID for cooldown tracking
                particle.id = `p${newParticles++}_${Date.now()}_${Math.random()}`;
            }
        });
        
        // Periodic cooldown cleanup to prevent memory buildup
        if (Math.random() < 0.001) { // 0.1% chance per frame to clean up
            this.cleanupCooldowns();
        }
    }
    
    /**
     * Check if particle is in collision cooldown
     */
    isInCooldown(particle) {
        const now = Date.now();
        const lastCollision = this.collisionCooldowns.get(particle.id);
        
        if (!lastCollision) return false;
        
        return (now - lastCollision) < this.cooldownDuration;
    }
    
    /**
     * Set collision cooldown for particle
     */
    setCooldown(particle) {
        this.collisionCooldowns.set(particle.id, Date.now());
    }
    
    /**
     * Handle collision color change with cooldown - rotate hue by 2.8 degrees (128 colors total)
     * ENHANCED: Works smoothly with audio colors when both are active
     */
    onParticleCollision(particle) {
        if (!this.visualizer.config.collisionColorChange) return;
        
        // Ensure particle has been initialized
        if (!particle.hasOwnProperty('hueRotation')) {
            particle.hueRotation = 0;
            particle.id = `p${Math.random()}_${Date.now()}`;
        }
        
        // Check cooldown to prevent multiple changes per collision
        if (this.isInCooldown(particle)) {
            return;
        }
        
        // Set cooldown for this particle
        this.setCooldown(particle);
        
        // Ensure color cache is initialized
        if (!this.cacheInitialized) {
            this.initializeColorCache();
        }
        
        // Increment hue rotation by 2.8 degrees (128 colors total for smooth spectrum)
        particle.hueRotation = (particle.hueRotation + 2.8125) % 360; // 360/128 = 2.8125
        const roundedRotation = Math.round(particle.hueRotation);
        
        // Use cached colors for instant lookup (much faster than calculation)
        // Ensure we have the color in cache, fallback to calculation if needed
        if (this.colorCache.primary[roundedRotation]) {
            particle.currentColor = this.colorCache.primary[roundedRotation];
            particle.currentConnectionColor = this.colorCache.secondary[roundedRotation];
        } else {
            // Fallback: calculate color if not in cache
            particle.currentColor = this.rotateHue(this.visualizer.config.primaryColor, particle.hueRotation);
            particle.currentConnectionColor = this.rotateHue(this.visualizer.config.secondaryColor, particle.hueRotation);
            
            // Cache the calculated colors for future use
            this.colorCache.primary[roundedRotation] = particle.currentColor;
            this.colorCache.secondary[roundedRotation] = particle.currentConnectionColor;
        }
        
        // Mark color cache as valid
        particle.colorCacheValid = true;
    }
    
    /**
     * Rotate hue of a hex color by specified degrees
     * (Only used for cache initialization now)
     */
    rotateHue(hexColor, degrees) {
        // Convert hex to RGB
        const r = parseInt(hexColor.slice(1, 3), 16) / 255;
        const g = parseInt(hexColor.slice(3, 5), 16) / 255;
        const b = parseInt(hexColor.slice(5, 7), 16) / 255;
        
        // Convert RGB to HSL
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
        
        // Rotate hue
        h = (h + degrees / 360) % 1;
        
        // Convert HSL back to RGB
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
    
    /**
     * Get particle color - ULTRA-FAST with caching
     */
    getParticleColor(particle) {
        // Priority 1: Check for audio color override
        if (particle.audioColorOverride && particle.audioColorOverride.color) {
            return particle.audioColorOverride.color;
        }
        
        // Priority 2: Fast path for collision colors disabled
        if (!this.visualizer.config.collisionColorChange) {
            return this.visualizer.config.primaryColor;
        }
        
        // Priority 3: Fast path for cached collision color
        if (particle.colorCacheValid && particle.currentColor) {
            return particle.currentColor;
        }
        
        // Priority 4: Fallback to primary color
        return particle.currentColor || this.visualizer.config.primaryColor;
    }
    
    /**
     * Get particle connection color - ULTRA-FAST with caching
     */
    getParticleConnectionColor(particle) {
        // Priority 1: Check for audio color override
        if (particle.audioColorOverride && particle.audioColorOverride.color) {
            return particle.audioColorOverride.color;
        }
        
        // Priority 2: Fast path for collision colors disabled
        if (!this.visualizer.config.collisionColorChange) {
            return this.visualizer.config.secondaryColor;
        }
        
        // Priority 3: Fast path for cached collision color
        if (particle.colorCacheValid && particle.currentConnectionColor) {
            return particle.currentConnectionColor;
        }
        
        // Priority 4: Fallback to secondary color
        return particle.currentConnectionColor || this.visualizer.config.secondaryColor;
    }
    
    /**
     * Handle configuration updates (especially color changes)
     */
    updateConfig() {
        // Clear cache when colors might have changed
        this.clearColorCache();
        
        // Re-initialize cache if collision colors are enabled
        if (this.visualizer.config.collisionColorChange) {
            this.initializeColorCache();
            
            // Update all existing particles with new color scheme
            this.refreshParticleColors();
        }
    }
    
    /**
     * Refresh all particle colors after config change
     */
    refreshParticleColors() {
        if (!this.visualizer.particles) return;
        
        this.visualizer.particles.forEach(particle => {
            if (particle.hasOwnProperty('hueRotation')) {
                // Recalculate particle colors based on current hue rotation using new cache
                particle.currentColor = this.colorCache.primary[particle.hueRotation];
                particle.currentConnectionColor = this.colorCache.secondary[particle.hueRotation];
            } else {
                // For particles that haven't been initialized yet
                particle.currentColor = this.visualizer.config.primaryColor;
                particle.currentConnectionColor = this.visualizer.config.secondaryColor;
            }
        });
    }
    
    /**
     * Clean up expired cooldowns periodically
     */
    cleanupCooldowns() {
        const now = Date.now();
        for (const [particleId, timestamp] of this.collisionCooldowns) {
            if (now - timestamp > this.cooldownDuration) {
                this.collisionCooldowns.delete(particleId);
            }
        }
    }
    
    /**
     * Cleanup
     */
    destroy() {
        if (this.collisionDetector && this.collisionCallback) {
            this.collisionDetector.unsubscribe(this.collisionCallback);
        }
        
        // Clear all caches and cooldowns
        this.clearColorCache();
        this.collisionCooldowns.clear();
        this.colorInterpolationCache.clear();
    }
    
    /**
     * Create connection color (ultra-fast interpolation instead of gradients)
     */
    createConnectionGradient(ctx, particle1, particle2) {
        if (!this.visualizer.config.collisionColorChange) {
            // Use static secondary color if collision colors are disabled
            return this.visualizer.config.secondaryColor;
        }
        
        // Get current connection colors for both particles
        const color1 = this.getParticleConnectionColor(particle1);
        const color2 = this.getParticleConnectionColor(particle2);
        
        // If colors are identical, return solid color (fastest path)
        if (color1 === color2) {
            return color1;
        }
        
        // Use fast color interpolation instead of expensive canvas gradients
        if (this.useColorInterpolation) {
            return this.getInterpolatedColor(color1, color2, 0.5); // Mid-point blend
        }
        
        // Fallback to gradient (should rarely be needed now)
        return this.createCanvasGradient(ctx, particle1, particle2, color1, color2);
    }
    
    /**
     * Get interpolated color between two colors (much faster than gradients)
     */
    getInterpolatedColor(color1, color2, ratio = 0.5) {
        // Create cache key
        const cacheKey = `${color1}|${color2}|${ratio}`;
        
        // Check cache first
        if (this.colorInterpolationCache.has(cacheKey)) {
            return this.colorInterpolationCache.get(cacheKey);
        }
        
        // Parse colors to RGB
        const rgb1 = this.hexToRgb(color1);
        const rgb2 = this.hexToRgb(color2);
        
        if (!rgb1 || !rgb2) {
            return color1; // Fallback
        }
        
        // Linear interpolation
        const r = Math.round(rgb1.r + (rgb2.r - rgb1.r) * ratio);
        const g = Math.round(rgb1.g + (rgb2.g - rgb1.g) * ratio);
        const b = Math.round(rgb1.b + (rgb2.b - rgb1.b) * ratio);
        
        // Convert back to hex
        const interpolatedColor = this.rgbToHex(r, g, b);
        
        // Cache the result
        if (this.colorInterpolationCache.size < 200) {
            this.colorInterpolationCache.set(cacheKey, interpolatedColor);
        }
        
        return interpolatedColor;
    }
    
    /**
     * Convert RGB values to hex string
     */
    rgbToHex(r, g, b) {
        const toHex = (c) => {
            const hex = Math.max(0, Math.min(255, c)).toString(16);
            return hex.length === 1 ? '0' + hex : hex;
        };
        return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
    }
    
    /**
     * Create canvas gradient (fallback method)
     */
    createCanvasGradient(ctx, particle1, particle2, color1, color2) {
        // Check if colors are visually similar (avoid gradients for tiny differences)
        if (this.areColorsSimilar(color1, color2)) {
            return color1; // Use first color, difference is negligible
        }
        
        // Create linear gradient from particle1 to particle2
        const gradient = ctx.createLinearGradient(
            particle1.x, particle1.y,
            particle2.x, particle2.y
        );
        
        gradient.addColorStop(0, color1);
        gradient.addColorStop(1, color2);
        
        return gradient;
    }
    
    /**
     * Check if two hex colors are visually similar enough to skip gradient creation
     * This prevents expensive gradient creation for minor color differences
     */
    areColorsSimilar(color1, color2, threshold = 30) {
        // Quick string comparison first
        if (color1 === color2) return true;
        
        // Parse hex colors to RGB
        const rgb1 = this.hexToRgb(color1);
        const rgb2 = this.hexToRgb(color2);
        
        if (!rgb1 || !rgb2) return false;
        
        // Calculate color distance using simple Euclidean distance
        const rDiff = rgb1.r - rgb2.r;
        const gDiff = rgb1.g - rgb2.g;
        const bDiff = rgb1.b - rgb2.b;
        
        const distance = Math.sqrt(rDiff * rDiff + gDiff * gDiff + bDiff * bDiff);
        
        return distance < threshold;
    }
    
    /**
     * Convert hex color to RGB object
     */
    hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;
    }
}; 