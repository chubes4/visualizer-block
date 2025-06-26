/**
 * Audio Effects Module
 * Translates audio analysis into particle behavior modifications
 * REFACTORED: Now uses centralized AudioIntensity module for standardized effects
 */
window.VisualizerAudioEffects = class AudioEffects {
    constructor(visualizer) {
        this.visualizer = visualizer;
        this.audioAnalyzer = null;
        this.isEnabled = false;
        
        // Initialize audio intensity module (centralized volume-spike detector)
        this.audioIntensity = new window.VisualizerAudioIntensity(visualizer);
        
        // Initialize audio color effects module
        this.audioColorEffects = new window.VisualizerAudioColorEffects(visualizer);
        
        // Base configuration values (stored to restore after audio effects)
        this.baseConfig = {};
        this.configBackedUp = false;
        
        // SIMPLIFIED: Audio response configuration - now uses centralized intensity
        this.responseMultipliers = {
            // Core effects (controlled by centralized intensity)
            enableSizeEffects: true,        // Particles get bigger at peaks
            enableVelocityEffects: true,    // Particles get faster at peaks
            enableMagneticEffects: true,    // Magnetic logic responds to peaks
            
            // Color effects
            enableColorWaves: true,         // Audio-reactive color waves
            
            // Magnetic inversion system parameters (now driven by centralized intensity)
            magneticBurstDuration: 495,     // Duration of magnetic burst effects (ms)
            magneticBurstCooldown: 100,     // Cooldown between bursts (ms)
            
            // Tier-specific parameters (multipliers applied to centralized intensity)
            tier1ToleranceReduction: 0.48,  // Tier 1 tolerance reduction
            tier1PowerMultiplier: 1.91,     // Tier 1 power multiplier
            tier2ToleranceReduction: 0.96,  // Tier 2 tolerance reduction  
            tier2PowerMultiplier: 2.88,     // Tier 2 power multiplier
            tier3ToleranceReduction: 1.0,   // Tier 3 tolerance reduction
            tier3PowerMultiplier: 4.0       // Tier 3 power multiplier
        };
        
        // Magnetic inversion state (now simplified - driven by centralized intensity)
        this.magneticInversion = {
            currentTier: 0,              // Current active tier (0-3)
            tierStartTime: 0,            // When current tier started
            lastTierChange: 0            // When tier last changed
        };
    }
    
    /**
     * Initialize audio effects with audio analyzer
     */
    initialize(audioAnalyzer) {
        this.audioAnalyzer = audioAnalyzer;
        
        // Initialize sub-modules
        this.audioIntensity.initialize(audioAnalyzer);
        this.audioColorEffects.initialize(audioAnalyzer);
        
        return true;
    }
    
    /**
     * Enable audio-reactive effects
     */
    enable() {
        if (!this.audioAnalyzer) {
            return false;
        }
        
        // Backup original configuration values
        if (!this.configBackedUp) {
            this.backupBaseConfig();
        }
        
        this.isEnabled = true;
        
        // Enable sub-modules
        this.audioIntensity.enable();
        
        if (this.responseMultipliers.enableColorWaves) {
            this.audioColorEffects.enable();
        }
        
        return true;
    }
    
    /**
     * Disable audio-reactive effects and restore original values
     */
    disable() {
        if (!this.isEnabled) return;
        
        this.isEnabled = false;
        this.restoreBaseConfig();
        
        // Disable sub-modules
        this.audioIntensity.disable();
        this.audioColorEffects.disable();
    }
    
    /**
     * Backup original configuration values
     */
    backupBaseConfig() {
        this.baseConfig = {
            particleMagnetism: this.visualizer.config.particleMagnetism,
            animationSpeed: this.visualizer.config.animationSpeed,
            connectionOpacity: this.visualizer.config.connectionOpacity || 0.3,
            particleSize: this.visualizer.config.particleSize
        };
        this.configBackedUp = true;
    }
    
    /**
     * Restore original configuration values
     */
    restoreBaseConfig() {
        if (!this.configBackedUp) return;
        
        // Clear audio effect multipliers
        this.visualizer.audioEffectMultipliers = null;
        this.visualizer.currentAnimationSpeed = null;
        this.visualizer.audioMagneticInversion = null;
    }
    
    /**
     * Apply audio-reactive effects to particle system
     * REFACTORED: Now uses centralized intensity system
     */
    applyAudioEffects() {
        if (!this.isEnabled || !this.audioAnalyzer || !this.audioAnalyzer.isActive) {
            return;
        }
        
        // Update centralized intensity calculations
        this.audioIntensity.updateIntensity();
        
        // Get standardized intensity values
        const intensity = this.audioIntensity.getIntensity();
        
        // Apply effects based on centralized intensity
        this.applyIntensityEffects(intensity);
        
        // Handle magnetic inversion system
        if (this.responseMultipliers.enableMagneticEffects && this.visualizer.config.particleMagnetism) {
            this.updateMagneticInversion();
        }
        
        // Apply audio color waves if enabled
        if (this.responseMultipliers.enableColorWaves) {
            this.audioColorEffects.applyColorWaves();
        }
    }
    
    /**
     * Apply effects based on centralized intensity values
     */
    applyIntensityEffects(intensity) {
        // Store standardized effect multipliers for other modules to use
        this.visualizer.audioEffectMultipliers = {
            // Core effects driven by centralized intensity
            size: this.responseMultipliers.enableSizeEffects ? intensity.size : 1.0,
            velocity: this.responseMultipliers.enableVelocityEffects ? intensity.velocity : 1.0,
            
            // Legacy compatibility
            magnetism: 1.0,         // No longer used - magnetic effects handled separately
            connections: 1.0        // No connection effects currently
        };
        
        // Apply velocity multiplier to animation speed
        if (this.responseMultipliers.enableVelocityEffects) {
            const baseSpeed = this.baseConfig.animationSpeed || 1.0;
            this.visualizer.currentAnimationSpeed = baseSpeed * intensity.velocity;
        }
    }
    
    /**
     * Update magnetic inversion system using centralized intensity
     */
    updateMagneticInversion() {
        const now = Date.now();
        const targetTier = this.audioIntensity.getMagneticTier();
        
        // Check if we should activate a new tier
        const canChangeTier = (now - this.magneticInversion.lastTierChange) > this.responseMultipliers.magneticBurstCooldown;
        
        if (targetTier > this.magneticInversion.currentTier && canChangeTier) {
            // Activate new tier
            this.magneticInversion.currentTier = targetTier;
            this.magneticInversion.tierStartTime = now;
            this.magneticInversion.lastTierChange = now;
        }
        
        // Check if current tier should expire
        if (this.magneticInversion.currentTier > 0) {
            const tierAge = now - this.magneticInversion.tierStartTime;
            if (tierAge > this.responseMultipliers.magneticBurstDuration) {
                this.magneticInversion.currentTier = 0; // Deactivate
            }
        }
        
        // Store magnetic inversion data for physics system
        this.updateMagneticInversionData();
    }
    
    /**
     * Update magnetic inversion data for physics system
     */
    updateMagneticInversionData() {
        const tier = this.magneticInversion.currentTier;
        
        if (tier === 0) {
            // No inversion active
            this.visualizer.audioMagneticInversion = null;
            return;
        }
        
        // Get tier-specific parameters
        let toleranceReduction, powerMultiplier;
        
        switch (tier) {
            case 1:
                toleranceReduction = this.responseMultipliers.tier1ToleranceReduction;
                powerMultiplier = this.responseMultipliers.tier1PowerMultiplier;
                break;
            case 2:
                toleranceReduction = this.responseMultipliers.tier2ToleranceReduction;
                powerMultiplier = this.responseMultipliers.tier2PowerMultiplier;
                break;
            case 3:
                toleranceReduction = this.responseMultipliers.tier3ToleranceReduction;
                powerMultiplier = this.responseMultipliers.tier3PowerMultiplier;
                break;
            default:
                toleranceReduction = 0;
                powerMultiplier = 1;
        }
        
        // Store inversion data for physics system
        this.visualizer.audioMagneticInversion = {
            active: true,
            tier: tier,
            toleranceReduction: toleranceReduction,
            powerMultiplier: powerMultiplier,
            startTime: this.magneticInversion.tierStartTime,
            duration: this.responseMultipliers.magneticBurstDuration
        };
    }
    
    /**
     * Get current audio effect status and values
     */
    getStatus() {
        return {
            isEnabled: this.isEnabled,
            hasAnalyzer: !!this.audioAnalyzer,
            analyzerActive: this.audioAnalyzer ? this.audioAnalyzer.isActive : false,
            intensity: this.audioIntensity ? this.audioIntensity.getStatus() : null,
            magneticTier: this.magneticInversion.currentTier,
            responseMultipliers: { ...this.responseMultipliers }
        };
    }
    
    /**
     * Update response multiplier configuration
     */
    updateResponseMultipliers(multipliers) {
        Object.assign(this.responseMultipliers, multipliers);
    }
    
    /**
     * Cleanup and destroy audio effects
     */
    destroy() {
        this.disable();
        
        if (this.audioIntensity) {
            this.audioIntensity.destroy();
        }
        
        if (this.audioColorEffects) {
            this.audioColorEffects.destroy();
        }
        
        this.audioAnalyzer = null;
        this.visualizer = null;
    }
}; 