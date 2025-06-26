/**
 * Audio Color Effects Module
 * Creates audio-reactive color waves that sweep through the particle field
 * Uses the existing 128-color spectrum system for consistency
 */
window.VisualizerAudioColorEffects = class AudioColorEffects {
    constructor(visualizer) {
        this.visualizer = visualizer;
        this.audioAnalyzer = null;
        this.isEnabled = false;
        
        // Color wave state
        this.colorWavePosition = 0; // Current position in the color spectrum (0-127)
        this.waveDirection = 1; // Direction of wave movement
        this.waveSpeed = 0.5; // Base speed of color wave movement
        
        // Audio response configuration
        this.audioResponse = {
            volumeToWaveSpeed: 2.0,     // Volume affects wave speed
            bassToWaveIntensity: 1.5,   // Bass affects color intensity/saturation
            midToWaveDirection: 0.8,    // Mid frequencies affect wave direction changes
            highToWaveScatter: 0.3      // High frequencies create color scatter effects
        };
        
        // Color wave parameters
        this.waveParams = {
            baseWaveLength: 100,        // Base wavelength in pixels
            waveAmplitude: 30,          // How many colors the wave spans
            smoothingFactor: 0.15,      // How smoothly colors transition
            enableScatter: true,       // Enable high-frequency scatter effects
            scatterRadius: 50          // Radius for scatter effects
        };
        
        // Performance optimization
        this.lastUpdateTime = 0;
        this.updateInterval = 16; // ~60fps updates
        
        // Color spectrum cache (matches existing 128-color system)
        this.colorSpectrum = [];
        this.initializeColorSpectrum();
    }
    
    /**
     * Initialize the 128-color spectrum using same algorithm as visual effects
     */
    initializeColorSpectrum() {
        this.colorSpectrum = [];
        const baseColor = this.visualizer.config.primaryColor;
        
        // Generate 128 colors using same rotation as collision system
        for (let i = 0; i < 128; i++) {
            const degrees = (i / 128) * 360; // Same calculation as existing system
            this.colorSpectrum.push(this.rotateHue(baseColor, degrees));
        }
    }
    
    /**
     * Rotate hue of a hex color (same algorithm as visual effects module)
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
     * Initialize audio color effects
     */
    initialize(audioAnalyzer) {
        this.audioAnalyzer = audioAnalyzer;
        return true;
    }
    
    /**
     * Enable audio-reactive color waves
     */
    enable() {
        if (!this.audioAnalyzer) {
            return false;
        }
        
        this.isEnabled = true;
        return true;
    }
    
    /**
     * Disable audio-reactive color waves
     */
    disable() {
        this.isEnabled = false;
        
        // Reset all particles to their collision-based colors or default
        if (this.visualizer.particles) {
            this.visualizer.particles.forEach(particle => {
                // Remove audio color override, let collision system take over
                delete particle.audioColorOverride;
            });
        }
    }
    
    /**
     * Apply audio-reactive color waves to particles
     */
    applyColorWaves() {
        if (!this.isEnabled || !this.audioAnalyzer || !this.audioAnalyzer.isActive) {
            return;
        }
        
        // Throttle updates for performance
        const now = Date.now();
        if (now - this.lastUpdateTime < this.updateInterval) {
            return;
        }
        this.lastUpdateTime = now;
        
        // Get current audio analysis
        const audioData = this.audioAnalyzer.analyzeAudio();
        
        // Update wave parameters based on audio
        this.updateWaveParameters(audioData);
        
        // Apply color waves to particles
        this.applyWaveToParticles(audioData);
    }
    
    /**
     * Update wave parameters based on audio analysis
     */
    updateWaveParameters(audioData) {
        // Only move the wave if there's actual audio volume (balanced threshold for normal music)
        if (audioData.volume > 0.08) { // Lowered from 0.3 to 0.08 - responds to normal music, filters fan noise
            // Volume affects wave speed
            const volumeMultiplier = 1.0 + (audioData.volume * this.audioResponse.volumeToWaveSpeed);
            const currentWaveSpeed = this.waveSpeed * volumeMultiplier;
            
            // Update wave position ONLY when audio is present
            this.colorWavePosition += currentWaveSpeed * this.waveDirection;
        }
        // If no audio (muted or silent), wave position stays frozen
        
        // Mid frequencies can reverse wave direction (only when audio is present)
        if (audioData.volume > 0.08 && audioData.mid > 0.7 && Math.random() < 0.1) {
            this.waveDirection *= -1;
        }
        
        // Wrap around the color spectrum
        if (this.colorWavePosition >= 128) {
            this.colorWavePosition = 0;
        } else if (this.colorWavePosition < 0) {
            this.colorWavePosition = 127;
        }
    }
    
    /**
     * Apply color wave to all particles based on their position
     * ELEGANT: Each particle's collision rotation offsets its audio wave position
     */
    applyWaveToParticles(audioData) {
        if (!this.visualizer.particles) return;
        
        // If no audio, don't apply any color effects
        if (audioData.volume <= 0.08) { // Lowered from 0.3 to 0.08 to match wave threshold
            // Remove audio color overrides when audio is silent/muted
            this.visualizer.particles.forEach(particle => {
                delete particle.audioColorOverride;
            });
            return;
        }
        
        const canvasWidth = this.visualizer.canvasWidth;
        const canvasHeight = this.visualizer.canvasHeight;
        
        this.visualizer.particles.forEach(particle => {
            // Calculate particle's spatial position in the wave
            const spatialWavePosition = this.calculateWavePosition(particle, canvasWidth, canvasHeight);
            
            // Get collision rotation offset (0-360 degrees)
            let collisionOffset = 0;
            if (this.visualizer.config.collisionColorChange && particle.hasOwnProperty('hueRotation')) {
                collisionOffset = particle.hueRotation; // Use current collision rotation as offset
            }
            
            // Convert collision offset to color spectrum position (0-127)
            const collisionColorOffset = (collisionOffset / 360) * 128;
            
            // ELEGANT FORMULA: Audio wave position + collision offset + spatial position
            let finalColorIndex = Math.floor((
                this.colorWavePosition +           // Global audio wave position
                collisionColorOffset +             // Particle's collision offset
                spatialWavePosition                // Particle's spatial position
            ) % 128);
            
            // Add scatter effect based on high frequencies
            if (this.waveParams.enableScatter && audioData.high > 0.5) {
                const scatterAmount = audioData.high * this.audioResponse.highToWaveScatter * 20;
                const scatter = (Math.random() - 0.5) * scatterAmount;
                finalColorIndex = Math.floor((finalColorIndex + scatter) % 128);
                if (finalColorIndex < 0) finalColorIndex += 128;
            }
            
            // Get the final color from spectrum
            const finalColor = this.colorSpectrum[finalColorIndex];
            
            // Apply bass intensity (optional color enhancement)
            const bassIntensity = 1.0 + (audioData.bass * this.audioResponse.bassToWaveIntensity * 0.3);
            
            // Set simple, clean audio color override
            particle.audioColorOverride = {
                color: finalColor,
                intensity: bassIntensity,
                hueRotation: (finalColorIndex / 128) * 360 // For connection consistency
            };
        });
    }
    
    /**
     * Calculate wave position for a particle based on its spatial location
     */
    calculateWavePosition(particle, canvasWidth, canvasHeight) {
        // Create wave based on horizontal position with some vertical influence
        const horizontalWave = (particle.x / canvasWidth) * this.waveParams.baseWaveLength;
        const verticalInfluence = (particle.y / canvasHeight) * 20; // Subtle vertical component
        
        return (horizontalWave + verticalInfluence) % this.waveParams.waveAmplitude;
    }
    
    /**
     * Get audio-modified color for a particle
     */
    getParticleAudioColor(particle) {
        if (!this.isEnabled || !particle.audioColorOverride) {
            return null; // Let normal color system handle it
        }
        
        return particle.audioColorOverride.color;
    }
    
    /**
     * Get status of audio color effects
     */
    getStatus() {
        return {
            isEnabled: this.isEnabled,
            hasAnalyzer: !!this.audioAnalyzer,
            analyzerActive: this.audioAnalyzer ? this.audioAnalyzer.isActive : false,
            currentWavePosition: this.colorWavePosition,
            waveDirection: this.waveDirection,
            activeParticles: this.visualizer.particles ? 
                this.visualizer.particles.filter(p => p.audioColorOverride).length : 0
        };
    }
    
    /**
     * Update color spectrum when base color changes
     */
    updateColorSpectrum() {
        this.initializeColorSpectrum();
    }
    
    /**
     * Update configuration
     */
    updateConfig(newConfig) {
        Object.assign(this.audioResponse, newConfig.audioResponse || {});
        Object.assign(this.waveParams, newConfig.waveParams || {});
        this.updateColorSpectrum();
    }
    
    /**
     * Cleanup and destroy
     */
    destroy() {
        this.disable();
        this.audioAnalyzer = null;
        this.visualizer = null;
        this.colorSpectrum = [];
    }
    
    /**
     * Blend two hex colors with specified ratio
     * @param {string} color1 - First hex color
     * @param {string} color2 - Second hex color  
     * @param {number} ratio - Blend ratio (0-1, where 1 is all color1)
     */
    blendColors(color1, color2, ratio = 0.5) {
        // Parse hex colors to RGB
        const rgb1 = this.hexToRgb(color1);
        const rgb2 = this.hexToRgb(color2);
        
        if (!rgb1 || !rgb2) return color1; // Fallback
        
        // Linear interpolation
        const r = Math.round(rgb1.r * ratio + rgb2.r * (1 - ratio));
        const g = Math.round(rgb1.g * ratio + rgb2.g * (1 - ratio));
        const b = Math.round(rgb1.b * ratio + rgb2.b * (1 - ratio));
        
        // Convert back to hex
        return this.rgbToHex(r, g, b);
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
}; 