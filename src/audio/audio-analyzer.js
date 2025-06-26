/**
 * Audio Analyzer Module
 * Handles microphone input and real-time audio frequency analysis for particle sync
 */
window.VisualizerAudioAnalyzer = class AudioAnalyzer {
    constructor(visualizer) {
        this.visualizer = visualizer;
        this.audioContext = null;
        this.analyser = null;
        this.microphone = null;
        this.mediaStream = null;  // Store the original media stream
        this.isActive = false;
        this.isInitialized = false;
        this.forceRecreateContext = false; // Flag for nuclear option
        
        // Frequency analysis data
        this.frequencyData = null;
        this.frequencyBinCount = 0;
        
        // Audio response ranges (frequency bins)
        this.bassRange = { start: 0, end: 0 };
        this.midRange = { start: 0, end: 0 };
        this.highRange = { start: 0, end: 0 };
        
        // Smoothed audio values for stable particle response
        this.smoothedBass = 0;
        this.smoothedMid = 0;
        this.smoothedHigh = 0;
        this.smoothedVolume = 0;
        
        // Smoothing factor for audio response (0-1, higher = more responsive)
        this.smoothingFactor = 0.3;
        
        // Beat detection
        this.lastBeatTime = 0;
        this.beatThreshold = 0.7; // Relative volume threshold for beat detection
        this.beatCooldown = 200; // Minimum ms between beats
        
        // Permission state tracking
        this.permissionGranted = false;
        this.permissionDenied = false;
    }
    
    /**
     * Initialize audio context and frequency ranges
     */
    async initialize() {
        if (this.isInitialized) return true;
        
        try {
            // Create audio context
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            
            // Create analyser node
            this.analyser = this.audioContext.createAnalyser();
            this.analyser.fftSize = 256; // Good balance of frequency resolution and performance
            this.analyser.smoothingTimeConstant = 0.8;
            
            // Initialize frequency data array
            this.frequencyBinCount = this.analyser.frequencyBinCount;
            this.frequencyData = new Uint8Array(this.frequencyBinCount);
            
            // Calculate frequency ranges for different audio components
            this.calculateFrequencyRanges();
            
            this.isInitialized = true;
            return true;
        } catch (error) {
            console.error('Failed to initialize audio analyzer:', error);
            return false;
        }
    }
    
    /**
     * Calculate frequency bin ranges for bass, mid, and high frequencies
     */
    calculateFrequencyRanges() {
        const sampleRate = this.audioContext.sampleRate;
        const nyquist = sampleRate / 2;
        const binSize = nyquist / this.frequencyBinCount;
        
        // Define frequency ranges (Hz)
        const bassMax = 250;   // Bass: 0-250 Hz
        const midMax = 4000;   // Mid: 250-4000 Hz
        const highMax = nyquist; // High: 4000Hz-Nyquist
        
        // Convert to bin indices
        this.bassRange = {
            start: 0,
            end: Math.floor(bassMax / binSize)
        };
        
        this.midRange = {
            start: this.bassRange.end,
            end: Math.floor(midMax / binSize)
        };
        
        this.highRange = {
            start: this.midRange.end,
            end: this.frequencyBinCount
        };
    }
    
    /**
     * Request microphone permission and start audio analysis
     */
    async startAudioSync() {
        // If context was destroyed, force reinitialization
        if (this.forceRecreateContext || !this.audioContext) {
            this.isInitialized = false;
            this.forceRecreateContext = false;
            console.log('Recreating audio context after previous destruction');
        }
        
        if (!this.isInitialized) {
            const initialized = await this.initialize();
            if (!initialized) return false;
        }
        
        if (this.isActive) return true;
        
        try {
            // Resume audio context if it was suspended
            if (this.audioContext && this.audioContext.state === 'suspended') {
                await this.audioContext.resume();
                console.log('Audio context resumed');
            }
            
            // Request microphone access
            const stream = await navigator.mediaDevices.getUserMedia({ 
                audio: {
                    echoCancellation: false,
                    noiseSuppression: false,
                    autoGainControl: false
                } 
            });
            
            console.log('Microphone access granted');
            
            // Create microphone source
            this.microphone = this.audioContext.createMediaStreamSource(stream);
            this.microphone.connect(this.analyser);
            // Note: NOT connecting to destination - we're analyzing only, not playing back
            
            // Ensure analyser is properly set up (in case it was disconnected)
            this.analyser.fftSize = 256;
            this.analyser.smoothingTimeConstant = 0.8;
            
            this.mediaStream = stream;  // Store the original media stream
            
            this.isActive = true;
            this.isStarting = false;
            this.permissionGranted = true;
            this.permissionDenied = false;
            
            console.log('Audio sync started successfully');
            return true;
            
        } catch (error) {
            console.error('Microphone access denied or failed:', error);
            this.permissionDenied = true;
            this.permissionGranted = false;
            return false;
        }
    }
    
    /**
     * Stop audio analysis and release microphone
     */
    stopAudioSync() {
        if (!this.isActive) return;
        
        console.log('Stopping audio sync and releasing microphone...');
        
        // Immediately stop all media stream tracks first (most critical)
        if (this.mediaStream) {
            this.mediaStream.getTracks().forEach(track => {
                console.log(`Stopping ${track.kind} track (state: ${track.readyState})`);
                if (track.readyState === 'live') {
                    track.stop();
                    console.log(`Track stopped (new state: ${track.readyState})`);
                }
            });
        }
        
        // Disconnect audio nodes
        if (this.microphone) {
            this.microphone.disconnect();
            this.microphone = null;
            console.log('Microphone source node disconnected');
        }
        
        // Disconnect analyser to break audio graph completely
        if (this.analyser) {
            this.analyser.disconnect();
            console.log('Analyser node disconnected');
        }
        
        // Clear media stream reference
        if (this.mediaStream) {
            this.mediaStream = null;
            console.log('Media stream reference cleared');
        }
        
        // Suspend audio context to release audio resources
        if (this.audioContext && this.audioContext.state !== 'closed' && this.audioContext.state !== 'suspended') {
            this.audioContext.suspend().then(() => {
                console.log('Audio context suspended');
                
                // Nuclear option: completely close the audio context to force microphone release
                return this.audioContext.close();
            }).then(() => {
                console.log('Audio context closed - microphone should be fully released');
                this.audioContext = null;
                this.analyser = null;
                this.frequencyData = null;
                this.isInitialized = false;
                this.forceRecreateContext = true;
            }).catch(err => {
                console.warn('Failed to close audio context:', err);
            });
        }
        
        this.isActive = false;
        console.log('Audio sync stopped');
        
        // Force browser to process the release using requestAnimationFrame
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                console.log('Microphone release complete - browser should update tab indicator');
                // Force garbage collection if available (Chrome DevTools)
                if (window.gc) {
                    window.gc();
                    console.log('Garbage collection forced');
                }
            });
        });
    }
    
    /**
     * Analyze current audio input and return processed values
     */
    analyzeAudio() {
        if (!this.isActive || !this.analyser) {
            return {
                bass: 0,
                mid: 0,
                high: 0,
                volume: 0,
                beat: false
            };
        }
        
        // Get current frequency data
        this.analyser.getByteFrequencyData(this.frequencyData);
        
        // Calculate average values for each frequency range
        const rawBass = this.getAverageFrequency(this.bassRange);
        const rawMid = this.getAverageFrequency(this.midRange);
        const rawHigh = this.getAverageFrequency(this.highRange);
        const rawVolume = this.getOverallVolume();
        
        // Apply smoothing for stable particle response
        this.smoothedBass = this.lerp(this.smoothedBass, rawBass, this.smoothingFactor);
        this.smoothedMid = this.lerp(this.smoothedMid, rawMid, this.smoothingFactor);
        this.smoothedHigh = this.lerp(this.smoothedHigh, rawHigh, this.smoothingFactor);
        this.smoothedVolume = this.lerp(this.smoothedVolume, rawVolume, this.smoothingFactor);
        
        // Detect beats based on bass/volume spikes
        const beat = this.detectBeat(rawVolume, rawBass);
        
        return {
            bass: this.smoothedBass / 255,    // Normalize to 0-1
            mid: this.smoothedMid / 255,      // Normalize to 0-1
            high: this.smoothedHigh / 255,    // Normalize to 0-1
            volume: this.smoothedVolume / 255, // Normalize to 0-1
            beat: beat
        };
    }
    
    /**
     * Calculate average frequency value for a given range
     */
    getAverageFrequency(range) {
        let sum = 0;
        let count = 0;
        
        for (let i = range.start; i < range.end && i < this.frequencyBinCount; i++) {
            sum += this.frequencyData[i];
            count++;
        }
        
        return count > 0 ? sum / count : 0;
    }
    
    /**
     * Calculate overall volume (RMS of all frequencies)
     */
    getOverallVolume() {
        let sum = 0;
        for (let i = 0; i < this.frequencyBinCount; i++) {
            sum += this.frequencyData[i] * this.frequencyData[i];
        }
        return Math.sqrt(sum / this.frequencyBinCount);
    }
    
    /**
     * Simple beat detection based on volume and bass spikes
     */
    detectBeat(currentVolume, currentBass) {
        const now = Date.now();
        
        // Check cooldown period
        if (now - this.lastBeatTime < this.beatCooldown) {
            return false;
        }
        
        // Beat detection: volume spike above threshold
        const volumeRatio = currentVolume / (this.smoothedVolume + 1); // Avoid division by zero
        const bassRatio = currentBass / (this.smoothedBass + 1);
        
        if (volumeRatio > this.beatThreshold && bassRatio > this.beatThreshold) {
            this.lastBeatTime = now;
            return true;
        }
        
        return false;
    }
    
    /**
     * Linear interpolation for smoothing
     */
    lerp(a, b, factor) {
        return a + (b - a) * factor;
    }
    
    /**
     * Get current audio analysis status
     */
    getStatus() {
        return {
            isActive: this.isActive,
            isInitialized: this.isInitialized,
            permissionGranted: this.permissionGranted,
            permissionDenied: this.permissionDenied
        };
    }
    
    /**
     * Update configuration
     */
    updateConfig(config) {
        if (config.hasOwnProperty('smoothingFactor')) {
            this.smoothingFactor = Math.max(0, Math.min(1, config.smoothingFactor));
        }
        
        if (config.hasOwnProperty('beatThreshold')) {
            this.beatThreshold = Math.max(0.1, Math.min(2.0, config.beatThreshold));
        }
        
        if (config.hasOwnProperty('beatCooldown')) {
            this.beatCooldown = Math.max(50, Math.min(1000, config.beatCooldown));
        }
    }
    
    /**
     * Cleanup and destroy audio analyzer
     */
    destroy() {
        console.log('Destroying audio analyzer...');
        
        // Stop audio sync first (this handles media stream cleanup)
        this.stopAudioSync();
        
        // Close audio context completely
        if (this.audioContext && this.audioContext.state !== 'closed') {
            this.audioContext.close().then(() => {
                console.log('Audio context closed');
            }).catch(err => {
                console.warn('Failed to close audio context:', err);
            });
        }
        
        // Clear all references
        this.audioContext = null;
        this.analyser = null;
        this.frequencyData = null;
        this.mediaStream = null;
        this.microphone = null;
        this.visualizer = null;
        
        console.log('Audio analyzer destroyed');
    }
}; 