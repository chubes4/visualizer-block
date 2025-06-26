/**
 * Audio Intensity Module
 * Centralized volume-spike detector and loudness scale for all audio effects
 * Provides standardized intensity values for size, glow, velocity, and magnetic effects
 */
window.VisualizerAudioIntensity = class AudioIntensity {
    constructor(visualizer) {
        this.visualizer = visualizer;
        this.audioAnalyzer = null;
        this.isEnabled = false;
        
        // Intensity calculation parameters - ENHANCED for better sensitivity and nuance
        this.intensityParams = {
            // Volume scaling - IMPROVED sensitivity with higher threshold
            volumeThreshold: 0.08,       // INCREASED: 8% minimum to avoid ambient audio (was 2%)
            volumeRange: 0.82,           // ADJUSTED: 8%-90% scaling range
            
            // ENHANCED SPIKE DETECTION - Multiple time windows for better musical response
            spikeThreshold: 1.1,         // 10% above average (reduced from 1.2 for more sensitivity)
            spikeMinimum: 0.05,          // Minimum spike intensity to register (reduced from 0.1)
            spikeMaxAccumulation: 1.5,   // Maximum accumulated spike intensity
            
            // OUTLIER FILTERING - NEW: Prevents sneezes/door slams from triggering spikes
            outlierThreshold: 2.5,       // Spikes above 2.5x average are considered outliers (was 3.0)
            outlierWindow: 180,          // 3 seconds of data for outlier detection (at 60fps)
            outlierPercentile: 90,       // Use 90th percentile for outlier detection baseline
            outlierRecoveryFrames: 120,  // 2 seconds to recover from outlier detection
            
            // Multiple time windows for more musical detection
            shortWindow: 15,             // 15 frames (~250ms) for immediate beats
            mediumWindow: 30,            // 30 frames (~500ms) for rhythm patterns
            longWindow: 60,              // 60 frames (~1s) for overall dynamics
            
            // FLUID SPIKE DECAY - More musical envelope following
            spikeAttack: 0.8,            // How fast spikes rise (0-1, higher = faster)
            spikeRelease: 0.08,          // How fast spikes decay (0-1, lower = slower)
            spikeSmoothing: 0.3,         // Smoothing factor for spike calculation
            
            // Smoothing - REFINED for better response
            smoothingFactor: 0.25,       // INCREASED: faster response to changes (was 0.2)
            
            // AUTO-GAIN CONTROL - NEW: Prevents saturation at high volumes
            autoGainEnabled: true,       // Enable automatic volume normalization
            targetLevel: 0.6,            // Target average level (60%)
            gainAdjustSpeed: 0.02,       // How fast to adjust gain (slower = more stable)
            maxGain: 2.0,                // Maximum gain multiplier
            minGain: 0.1,                // Minimum gain multiplier
        };
        
        // State tracking
        this.currentIntensity = 0;       // Current smoothed intensity (0-1)
        this.rawIntensity = 0;           // Raw calculated intensity (0-1)
        this.spikeIntensity = 0;         // Additional spike intensity (0-1)
        
        // ENHANCED SPIKE DETECTION state
        this.volumeHistory = [];         // Recent volume levels for spike detection
        this.shortAverage = 0;           // Short-term average
        this.mediumAverage = 0;          // Medium-term average  
        this.longAverage = 0;            // Long-term average
        this.targetSpikeIntensity = 0;   // Target spike intensity (before smoothing)
        
        // OUTLIER FILTERING state - NEW
        this.outlierHistory = [];        // Extended history for outlier detection
        this.outlierBaseline = 0;        // Baseline level for outlier detection (90th percentile)
        this.outlierSuppression = 0;     // Frames remaining in outlier suppression
        this.recentOutliers = 0;         // Count of recent outliers
        
        // AUTO-GAIN CONTROL state
        this.currentGain = 1.0;          // Current gain multiplier
        this.recentLevels = [];          // Recent volume levels for auto-gain
        this.gainAdjustCounter = 0;      // Counter for gain adjustment frequency
        
        // Ramp-up mechanism to prevent immediate size jumps
        this.rampUpFrames = 0;           // Frames since enabling
        this.rampUpDuration = 60;        // 60 frames (~1 second at 60fps) ramp up
    }
    
    /**
     * Initialize with audio analyzer
     */
    initialize(audioAnalyzer) {
        this.audioAnalyzer = audioAnalyzer;
        return true;
    }
    
    /**
     * Enable intensity tracking
     */
    enable() {
        if (!this.audioAnalyzer) return false;
        this.isEnabled = true;
        this.rampUpFrames = 0; // Reset ramp-up when enabling
        
        // Reset auto-gain control
        this.currentGain = 1.0;
        this.recentLevels = [];
        this.gainAdjustCounter = 0;
        
        // Reset spike detection state
        this.volumeHistory = [];
        this.shortAverage = 0;
        this.mediumAverage = 0;
        this.longAverage = 0;
        this.targetSpikeIntensity = 0;
        
        // Reset outlier filtering state - NEW
        this.outlierHistory = [];
        this.outlierBaseline = 0;
        this.outlierSuppression = 0;
        this.recentOutliers = 0;
        
        console.log('Audio Intensity enabled with ramp-up, auto-gain, and outlier filtering');
        return true;
    }
    
    /**
     * Disable intensity tracking
     */
    disable() {
        this.isEnabled = false;
        this.currentIntensity = 0;
        this.rawIntensity = 0;
        this.spikeIntensity = 0;
        this.rampUpFrames = 0; // Reset ramp-up when disabling
        
        // Reset auto-gain control
        this.currentGain = 1.0;
        this.recentLevels = [];
        this.gainAdjustCounter = 0;
        
        // Reset spike detection state
        this.volumeHistory = [];
        this.shortAverage = 0;
        this.mediumAverage = 0;
        this.longAverage = 0;
        this.targetSpikeIntensity = 0;
        
        // Reset outlier filtering state - NEW
        this.outlierHistory = [];
        this.outlierBaseline = 0;
        this.outlierSuppression = 0;
        this.recentOutliers = 0;
        
        console.log('Audio Intensity disabled');
    }
    
    /**
     * Update intensity calculations - call this every frame
     */
    updateIntensity() {
        if (!this.isEnabled || !this.audioAnalyzer || !this.audioAnalyzer.isActive) {
            // Fade out when audio is disabled
            this.currentIntensity *= 0.9;
            this.rawIntensity = 0;
            this.spikeIntensity *= this.intensityParams.spikeRelease;
            return;
        }
        
        // Increment ramp-up counter
        if (this.rampUpFrames < this.rampUpDuration) {
            this.rampUpFrames++;
        }
        
        // Calculate ramp-up factor (0 to 1 over rampUpDuration frames)
        const rampUpFactor = Math.min(1, this.rampUpFrames / this.rampUpDuration);
        
        const audioData = this.audioAnalyzer.analyzeAudio();
        let volume = audioData.volume;
        
        // AUTO-GAIN CONTROL: Adjust volume to prevent saturation
        if (this.intensityParams.autoGainEnabled) {
            volume = this.applyAutoGain(volume);
        }
        
        // Calculate raw intensity from volume (0-1 scale)
        this.rawIntensity = Math.max(0, Math.min(1, 
            (volume - this.intensityParams.volumeThreshold) / this.intensityParams.volumeRange
        ));
        
        // Apply ramp-up factor to prevent immediate size jumps
        this.rawIntensity *= rampUpFactor;
        
        // Smooth the intensity changes
        this.currentIntensity = this.lerp(
            this.currentIntensity,
            this.rawIntensity,
            this.intensityParams.smoothingFactor
        );
        
        // Spike detection handles its own envelope following now
        this.detectVolumeSpikes(volume);
    }
    
    /**
     * Apply automatic gain control to prevent saturation
     */
    applyAutoGain(rawVolume) {
        // Track recent volume levels for gain calculation
        this.recentLevels.push(rawVolume);
        if (this.recentLevels.length > 120) { // Keep 2 seconds of history at 60fps
            this.recentLevels.shift();
        }
        
        // Adjust gain every 30 frames (twice per second) for stability
        this.gainAdjustCounter++;
        if (this.gainAdjustCounter >= 30 && this.recentLevels.length > 60) {
            this.gainAdjustCounter = 0;
            
            // Calculate average of recent levels
            const sum = this.recentLevels.reduce((a, b) => a + b, 0);
            const averageLevel = sum / this.recentLevels.length;
            
            // Calculate desired gain adjustment
            if (averageLevel > 0.01) { // Only adjust if there's actual audio
                const targetGain = this.intensityParams.targetLevel / averageLevel;
                const desiredGain = Math.max(this.intensityParams.minGain, 
                                           Math.min(this.intensityParams.maxGain, targetGain));
                
                // Gradually adjust current gain toward desired gain
                this.currentGain = this.lerp(this.currentGain, desiredGain, this.intensityParams.gainAdjustSpeed);
                
                // Debug logging (occasionally)
                if (Math.random() < 0.05) { // 5% chance (reduced from 10%)
                    console.log(`Auto-gain: avg=${(averageLevel*100).toFixed(1)}%, gain=${this.currentGain.toFixed(2)}x`);
                }
            }
        }
        
        // Apply gain to volume
        return Math.min(1.0, rawVolume * this.currentGain);
    }
    
    /**
     * ENHANCED spike detection with outlier filtering and proper sliding windows
     */
    detectVolumeSpikes(volume) {
        // Add new volume to outlier history first
        this.outlierHistory.push(volume);
        if (this.outlierHistory.length > this.intensityParams.outlierWindow) {
            this.outlierHistory.shift();
        }
        
        // Update outlier baseline using percentile method
        if (this.outlierHistory.length >= 30) { // Need minimum data for percentile
            const sortedHistory = [...this.outlierHistory].sort((a, b) => a - b);
            const percentileIndex = Math.floor(sortedHistory.length * this.intensityParams.outlierPercentile / 100);
            this.outlierBaseline = sortedHistory[percentileIndex] || 0;
        }
        
        // OUTLIER DETECTION: Check if current volume is an extreme outlier
        const isOutlier = this.outlierBaseline > 0 && 
                         volume > this.outlierBaseline * this.intensityParams.outlierThreshold;
        
        if (isOutlier) {
            this.recentOutliers++;
            this.outlierSuppression = this.intensityParams.outlierRecoveryFrames;
            
            // Log outlier detection for debugging
            if (Math.random() < 0.1) { // 10% chance to log
                console.log(`Outlier detected: ${(volume*100).toFixed(1)}% vs baseline ${(this.outlierBaseline*100).toFixed(1)}%`);
            }
            
            // Skip spike detection for this frame
            return;
        }
        
        // Reduce outlier suppression over time
        if (this.outlierSuppression > 0) {
            this.outlierSuppression--;
            // During outlier suppression, reduce spike sensitivity
            if (this.outlierSuppression > this.intensityParams.outlierRecoveryFrames * 0.5) {
                return; // Skip entirely for first half of recovery
            }
            // Gradual recovery in second half
            volume *= (1 - this.outlierSuppression / (this.intensityParams.outlierRecoveryFrames * 0.5));
        }
        
        // Add volume to spike detection history (only if not an outlier)
        this.volumeHistory.push(volume);
        
        // Maintain max window size (long window)
        if (this.volumeHistory.length > this.intensityParams.longWindow) {
            this.volumeHistory.shift();
        }
        
        // Need minimum history to start detecting
        const historyLength = this.volumeHistory.length;
        if (historyLength < this.intensityParams.shortWindow) {
            return;
        }
        
        // Calculate sliding window averages efficiently
        // Short window: last N items
        let shortSum = 0;
        const shortStart = Math.max(0, historyLength - this.intensityParams.shortWindow);
        for (let i = shortStart; i < historyLength; i++) {
            shortSum += this.volumeHistory[i];
        }
        this.shortAverage = shortSum / (historyLength - shortStart);
        
        // Medium window: last N items  
        let mediumSum = 0;
        const mediumStart = Math.max(0, historyLength - this.intensityParams.mediumWindow);
        for (let i = mediumStart; i < historyLength; i++) {
            mediumSum += this.volumeHistory[i];
        }
        this.mediumAverage = mediumSum / (historyLength - mediumStart);
        
        // Long window: all items
        let longSum = 0;
        for (let i = 0; i < historyLength; i++) {
            longSum += this.volumeHistory[i];
        }
        this.longAverage = longSum / historyLength;
        
        // MULTI-WINDOW SPIKE DETECTION: Check against multiple timeframes
        let detectedSpike = 0;
        
        // Primary spike detection: Current volume vs short-term average (most sensitive)
        if (volume > this.shortAverage * this.intensityParams.spikeThreshold) {
            const shortSpike = (volume - this.shortAverage) / Math.max(0.01, this.shortAverage);
            detectedSpike = Math.max(detectedSpike, shortSpike); // Full weight
        }
        
        // Secondary spike detection: Current volume vs medium-term average (rhythm sensitivity)
        if (volume > this.mediumAverage * this.intensityParams.spikeThreshold) {
            const mediumSpike = (volume - this.mediumAverage) / Math.max(0.01, this.mediumAverage);
            detectedSpike = Math.max(detectedSpike, mediumSpike * 0.7); // 70% weight
        }
        
        // Tertiary spike detection: Current volume vs long-term average (dynamic changes)
        if (volume > this.longAverage * this.intensityParams.spikeThreshold) {
            const longSpike = (volume - this.longAverage) / Math.max(0.01, this.longAverage);
            detectedSpike = Math.max(detectedSpike, longSpike * 0.4); // 40% weight
        }
        
        // Apply minimum threshold and limit maximum
        detectedSpike = detectedSpike < this.intensityParams.spikeMinimum ? 0 : 
                       Math.min(detectedSpike, this.intensityParams.spikeMaxAccumulation);
        
        // ENVELOPE FOLLOWING: Smooth spike changes with attack/release
        const lerpFactor = detectedSpike > this.targetSpikeIntensity ? 
                          this.intensityParams.spikeAttack : 
                          this.intensityParams.spikeRelease;
        
        this.targetSpikeIntensity = this.lerp(this.targetSpikeIntensity, detectedSpike, lerpFactor);
        
        // Final smoothing for fluid response
        this.spikeIntensity = this.lerp(
            this.spikeIntensity,
            this.targetSpikeIntensity,
            this.intensityParams.spikeSmoothing
        );
    }
    
    /**
     * Get current intensity values for different effects
     */
    getIntensity() {
        const baseIntensity = this.currentIntensity;
        const totalIntensity = Math.min(1, baseIntensity + this.spikeIntensity * 0.7); // ENHANCED: Spikes add up to 70% extra (was 50%)
        
        const result = {
            // Raw values
            raw: this.rawIntensity,
            base: baseIntensity,
            spike: this.spikeIntensity,
            total: totalIntensity,
            
            // Effect multipliers (ready to use) - ENHANCED for more dramatic, nuanced effects
            size: 1.0 + (Math.max(0, totalIntensity - 0.1) * 2.5),  // MUCH MORE DRAMATIC: starts at 10% intensity, 1.0x to 3.5x (250% larger, very obvious pulses)
            velocity: 1.0 + (totalIntensity * 0.8),     // 1.0x to 1.8x (80% faster - unchanged)
            
            // Convenience flags - ENHANCED sensitivity
            isActive: totalIntensity > 0.02,            // REDUCED: Above 2% threshold (was 5% - more sensitive)
            isSpike: this.spikeIntensity > 0.15,        // REDUCED: Spike threshold (was 0.2 - more sensitive)
            isLoud: totalIntensity > 0.6,               // REDUCED: Above 60% intensity (was 70% - more responsive)
            isPeak: totalIntensity > 0.85               // REDUCED: Above 85% intensity (was 90% - more responsive)
        };
        
        // Debug logging for development (only log significant changes)
        if (result.isActive && Math.random() < 0.005) { // 0.5% chance to log when active (reduced from 1%)
            console.log('Audio Intensity:', {
                total: Math.round(result.total * 100) + '%',
                size: result.size.toFixed(2) + 'x',
                velocity: result.velocity.toFixed(2) + 'x',
                flags: {
                    spike: result.isSpike,
                    loud: result.isLoud,
                    peak: result.isPeak
                }
            });
        }
        
        return result;
    }
    
    /**
     * Get intensity specifically for magnetic inversion tiers
     */
    getMagneticTier() {
        const intensity = this.getIntensity();
        
        // Map intensity to magnetic tiers (based on original thresholds)
        if (intensity.total >= 0.57) return 3;         // 57%+ = Tier 3
        if (intensity.total >= 0.47) return 2;         // 47-57% = Tier 2  
        if (intensity.total >= 0.38) return 1;         // 38-47% = Tier 1
        return 0;                                      // Below 38% = No tier
    }
    
    /**
     * Linear interpolation utility
     */
    lerp(a, b, factor) {
        return a + (b - a) * factor;
    }
    
    /**
     * Get current status for debugging
     */
    getStatus() {
        return {
            isEnabled: this.isEnabled,
            hasAnalyzer: !!this.audioAnalyzer,
            intensity: this.getIntensity(),
            magneticTier: this.getMagneticTier(),
            volumeAverage: this.longAverage,
            outlierBaseline: this.outlierBaseline,
            outlierSuppression: this.outlierSuppression,
            recentOutliers: this.recentOutliers
        };
    }
    
    /**
     * Cleanup
     */
    destroy() {
        this.disable();
        this.audioAnalyzer = null;
        this.visualizer = null;
    }
}; 