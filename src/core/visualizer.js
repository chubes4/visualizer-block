/**
 * Interactive Particle System
 * Core particle effects with mouse interaction and rendering
 */

// Prevent class redeclaration
if (typeof window.ParticleSystem === 'undefined') {
    window.ParticleSystem = class ParticleSystem {
        constructor(container, config) {
            this.container = container;
            this.config = {
                aspectRatio: 0.75, // Height as ratio of width (3:4 by default)
                backgroundColor: '#0a0a0a',
                primaryColor: '#64ffda',
                secondaryColor: '#ff6b9d',
                animationSpeed: 1,
                particleCount: 150,
                particleSize: 3,
                connectionDistance: 100,
                mouseInteraction: 'none',
                bounceOffWalls: false,
                rubberizeParticles: false,
                particleMagnetism: false,
                collisionColorChange: false,
                audioSync: false,
                glowEffect: false,
                showControls: true,
                ...config
            };
            
            this.canvas = null;
            this.ctx = null;
            this.animationId = null;
            this.particles = [];
            this.time = 0;
            this.frameCount = 0;
            this.canvasWidth = 0;
            this.canvasHeight = 0;
            this.isInitialized = false;
            
            // Performance management
            this.performanceMode = 'auto'; // 'auto', 'performance', 'quality'
            this.lastFrameTime = 0;
            this.targetFrameTime = 16.67; // 60 FPS target
            this.adaptiveSkipFrames = 0;
            this.frameSkipCounter = 0;
            
            // Audio effect multipliers (for other modules to read)
            this.audioEffectMultipliers = null;
            this.currentAnimationSpeed = null;
            
            // Audio sync state
            this.audioSync = false;
            this.audioAnalyzer = null;
            this.audioEffects = null;
            
            // Calculate responsive dimensions
            this.updateCanvasDimensions();
            
            this.init();
        }
        
        updateCanvasDimensions() {
            const containerWidth = this.container.offsetWidth || 800;
            this.canvasWidth = containerWidth;
            this.canvasHeight = Math.round(containerWidth * this.config.aspectRatio);
            
            // Ensure minimum height
            if (this.canvasHeight < 300) {
                this.canvasHeight = 300;
            }
        }
        
        init() {
            this.createCanvas();
            this.initializeParticles();
            
            // Initialize modules AFTER canvas is created
            this.mouseInteraction = new window.VisualizerMouseInteraction(this);
            this.collisionDetector = new window.VisualizerCollisionDetector(this);
            this.physicsEffects = new window.VisualizerPhysicsEffects(this);
            this.visualEffects = new window.VisualizerVisualEffects(this);
            this.controlCenter = new window.VisualizerControlCenter(this);
            this.fullscreenManager = new window.VisualizerFullscreenManager(this);
            this.connectionRenderer = new window.VisualizerConnectionRenderer(this);
            
            // Initialize audio modules
            this.audioAnalyzer = new window.VisualizerAudioAnalyzer(this);
            this.audioEffects = new window.VisualizerAudioEffects(this);
            
            // Initialize LED glow effect module (particle-based rendering)
            this.glowEffect = new window.VisualizerLEDGlowEffect(this);
            
            // Initialize physics effects with collision detector
            this.physicsEffects.initialize(this.collisionDetector);
            
            // Initialize visual effects with collision detector
            this.visualEffects.initialize(this.collisionDetector);
            
            // Initialize audio effects with audio analyzer
            this.audioEffects.initialize(this.audioAnalyzer);
            
            // Initialize glow effect
            this.glowEffect.initialize();
            
            // Enable glow effect if configured
            if (this.config.glowEffect) {
                this.glowEffect.enable();
            }
            
            // Initialize connection renderer lookup tables
            this.connectionRenderer.init();
            
            this.setupEventListeners();
            this.startAnimation();
        }
        
        createCanvas() {
            const canvasContainer = document.createElement('div');
            canvasContainer.className = 'visualizer-canvas-container';
            
            this.canvas = document.createElement('canvas');
            this.canvas.className = 'visualizer-canvas';
            this.canvas.width = this.canvasWidth;
            this.canvas.height = this.canvasHeight;
            
            this.ctx = this.canvas.getContext('2d');
            
            canvasContainer.appendChild(this.canvas);
            this.container.appendChild(canvasContainer);
        }
        
        setupEventListeners() {
            // Window resize
            window.addEventListener('resize', () => this.handleResize());
        }
        
        onConfigChange(property, value) {
            // Handle specific config changes that require updates
            if (property === 'particleCount' || property === 'particleSize') {
                    this.updateParticleSystem();
            }
            
            // Handle color changes and collision color toggle
            if (property === 'primaryColor' || property === 'secondaryColor' || property === 'collisionColorChange') {
                if (this.visualEffects) {
                    this.visualEffects.updateConfig();
                }
                if (this.connectionRenderer) {
                    this.connectionRenderer.updateConfig();
                }
            }
            
            // Handle connection rendering changes
            if (property === 'connectionDistance') {
                if (this.connectionRenderer) {
                    this.connectionRenderer.updateConfig();
                }
            }
            
            // Handle audio sync toggle
            if (property === 'audioSync') {
                this.handleAudioSyncToggle(value);
            }
            
            // Handle glow effect toggle
            if (property === 'glowEffect') {
                this.handleGlowEffectToggle(value);
            }
        }
        
        initializeParticles() {
            this.particles = [];
            
            for (let i = 0; i < this.config.particleCount; i++) {
                this.particles.push(this.createParticle());
            }
        }
        
        createParticle(x = null, y = null) {
            // PERFORMANCE OPTIMIZATION: Much more conservative size variety for better performance
            // Reduced from 13x difference (15%-200%) to 3x difference (50%-150%)
            const sizeMultiplier = 0.5 + Math.random() * 1.0; // Moderate size variety: 50% to 150% (3x difference)
            
            // Apply logarithmic scaling to particle size for better performance at high scales
            // This allows scale 1-10 but keeps actual sizes more reasonable
            const scaledParticleSize = Math.log(this.config.particleSize + 1) * 2; // Logarithmic scaling
            
            return {
                x: x !== null ? x : Math.random() * this.canvasWidth,
                y: y !== null ? y : Math.random() * this.canvasHeight,
                vx: (Math.random() - 0.5) * 2,
                vy: (Math.random() - 0.5) * 2,
                originalVx: (Math.random() - 0.5) * 2,
                originalVy: (Math.random() - 0.5) * 2,
                size: scaledParticleSize * sizeMultiplier,
                sizeMultiplier: sizeMultiplier, // Store the multiplier for consistent scaling
                baseScaledSize: scaledParticleSize, // Store the scaled base size
                opacity: 1.0, // Fixed opacity for all particles
                angle: Math.random() * Math.PI * 2,
                rotationSpeed: (Math.random() - 0.5) * 0.1,
                life: 1,
                maxLife: 1
            };
        }
        
        updateParticleSystem() {
            // Adjust particle count
            while (this.particles.length < this.config.particleCount) {
                this.particles.push(this.createParticle());
            }
            while (this.particles.length > this.config.particleCount) {
                this.particles.pop();
            }
            
            // PERFORMANCE: Cache expensive logarithmic calculation
            const scaledParticleSize = Math.log(this.config.particleSize + 1) * 2;
            
            // Update existing particles with CONSISTENT logarithmic scaling (preserve their multiplier)
            // PERFORMANCE: Only update every few frames for high particle counts
            const shouldUpdateSizes = this.particles.length < 150 || this.frameCount % 5 === 0;
            
            if (shouldUpdateSizes) {
                this.particles.forEach(particle => {
                    if (particle.life === 1) { // Only update permanent particles
                        // Use the particle's original size multiplier with new logarithmic scaling
                        particle.baseScaledSize = scaledParticleSize;
                        particle.size = scaledParticleSize * particle.sizeMultiplier;
                    }
                });
            }
        }
        
        startAnimation() {
            this.isInitialized = true;
            this.animate();
        }
        
        animate() {
            if (!this.isInitialized) return;
            
            const currentTime = performance.now();
            const deltaTime = currentTime - this.lastFrameTime;
            
            // Adaptive performance management
            this.managePerformance(deltaTime);
            
            // Skip frames if performance is poor (adaptive throttling)
            if (this.frameSkipCounter < this.adaptiveSkipFrames) {
                this.frameSkipCounter++;
                this.animationId = requestAnimationFrame(() => this.animate());
                return;
            }
            this.frameSkipCounter = 0;
            
            this.frameCount++;
            this.lastFrameTime = currentTime;
            
            // Clear canvas
            this.ctx.fillStyle = this.config.backgroundColor;
            this.ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);
            
            // Reset canvas state to defaults
            this.ctx.globalAlpha = 1.0;
            this.ctx.globalCompositeOperation = 'source-over';
            
            // Update particles first
            this.updateParticles();
            
            // Update glow effect animation
            if (this.glowEffect) {
                this.glowEffect.update(deltaTime);
            }
            
            // Render connections FIRST (behind particles) - with performance culling
            if (this.config.connectionDistance > 0) {
                this.connectionRenderer.renderConnections(this.particles);
            }
            
            // Reset canvas state after connections (in case they modified it)
            this.ctx.globalAlpha = 1.0;
            
            // Draw particles (LED glow is built-in when enabled)
            this.drawParticles();
            
            // Apply audio effects (before physics to influence particle behavior)
            // Reduce frequency for performance with high particle counts
            const shouldProcessAudio = this.shouldProcessAudioThisFrame();
            if (this.audioEffects && shouldProcessAudio) {
                this.audioEffects.applyAudioEffects();
            }
            
            // Handle physics effects - adaptive frequency
            const shouldProcessPhysics = this.shouldProcessPhysicsThisFrame();
            if (this.physicsEffects.hasActiveEffects() && shouldProcessPhysics) {
                this.physicsEffects.applyPhysicsEffects(this.particles);
            }
            
            // Handle collision detection - adaptive frequency  
            const shouldProcessCollisions = this.shouldProcessCollisionsThisFrame();
            if (this.collisionDetector.shouldDetectCollisions() && shouldProcessCollisions) {
                this.collisionDetector.detectCollisions(this.particles);
            }
            
            // Update mouse interactions and ripples (always run for responsiveness)
            this.mouseInteraction.updateRipples();
            this.mouseInteraction.renderRipples(this.ctx);
            
            this.animationId = requestAnimationFrame(() => this.animate());
        }
        
        /**
         * Adaptive performance management based on frame time and particle count
         */
        managePerformance(deltaTime) {
            const particleCount = this.particles.length;
            const isHighLoad = particleCount > 150 || deltaTime > this.targetFrameTime * 1.5;
            
            if (this.performanceMode === 'auto') {
                if (isHighLoad && deltaTime > this.targetFrameTime * 2) {
                    // Performance is poor - increase frame skipping
                    this.adaptiveSkipFrames = Math.min(2, this.adaptiveSkipFrames + 1);
                } else if (!isHighLoad && deltaTime < this.targetFrameTime * 1.2) {
                    // Performance is good - reduce frame skipping
                    this.adaptiveSkipFrames = Math.max(0, this.adaptiveSkipFrames - 1);
                }
            }
        }
        
        /**
         * Determine if audio processing should run this frame (reduce frequency for performance)
         */
        shouldProcessAudioThisFrame() {
            const particleCount = this.particles.length;
            if (particleCount < 100) return true; // Always process for low counts
            if (particleCount < 200) return this.frameCount % 2 === 0; // Every 2nd frame
            return this.frameCount % 3 === 0; // Every 3rd frame for high counts
        }
        
        /**
         * Determine if physics should run this frame (adaptive frequency)
         */
        shouldProcessPhysicsThisFrame() {
            const particleCount = this.particles.length;
            if (particleCount < 150) return true; // Always process for reasonable counts
            if (particleCount < 250) return this.frameCount % 2 === 0; // Every 2nd frame
            return this.frameCount % 3 === 0; // Every 3rd frame for very high counts
        }
        
        /**
         * Determine if collision detection should run this frame (adaptive frequency)
         */
        shouldProcessCollisionsThisFrame() {
            const particleCount = this.particles.length;
            if (particleCount < 100) return true; // Always process for low counts
            if (particleCount < 200) return this.frameCount % 2 === 0; // Every 2nd frame
            return this.frameCount % 4 === 0; // Every 4th frame for high counts (collision less critical than physics)
        }
        
        updateParticles() {
            // Cache mouse state to avoid repeated checks (safe optimization)
            const mouseActive = this.mouseInteraction.isMouseActive();
            const bounceOffWalls = this.config.bounceOffWalls;
            
            // Use audio-modified animation speed if available, otherwise use config value
            let animationSpeed = this.currentAnimationSpeed || this.config.animationSpeed;
            
            // NEW: Apply global audio velocity multiplier for fluid speed changes
            if (this.audioEffectMultipliers && this.audioEffectMultipliers.velocity) {
                animationSpeed *= this.audioEffectMultipliers.velocity;
            }
            
            this.particles.forEach((particle, index) => {
                // Only apply mouse interaction if mouse is active (major optimization)
                if (mouseActive) {
                    this.mouseInteraction.applyMouseInteraction(particle);
                }
                
                // Return to original motion when mouse is not active AND bouncing is disabled
                if (!mouseActive && !bounceOffWalls) {
                    particle.vx += (particle.originalVx - particle.vx) * 0.01;
                    particle.vy += (particle.originalVy - particle.vy) * 0.01;
                }
                
                // Update position with audio-enhanced animation speed
                particle.x += particle.vx * animationSpeed;
                particle.y += particle.vy * animationSpeed;
                particle.angle += particle.rotationSpeed;
            });
            
            // Initialize particle colors for visual effects (ALWAYS run when collision colors enabled)
            if (this.config.collisionColorChange) {
                this.visualEffects.initializeParticleColors(this.particles);
            }
        }
        
        drawParticles() {
            // Check if LED glow rendering is enabled
            const useLEDRendering = this.glowEffect && this.glowEffect.isLEDRenderingEnabled();
            
            if (useLEDRendering) {
                // LED RENDERING: Each particle renders as LED bulb with built-in glow
                const audioData = this.glowEffect.getAudioData();
                
                this.particles.forEach(particle => {
                    this.glowEffect.renderLEDParticle(this.ctx, particle, audioData);
                });
                
                // Reset canvas state
                this.ctx.globalAlpha = 1.0;
                return;
            }
            
            // NORMAL RENDERING: Ultra-fast particle rendering with optimized batching
            const particleBatches = new Map();
            
            // Calculate volume pulse effects based on audio (size scaling only)
            let volumePulseMultiplier = 1.0;
            
            if (this.audioEffectMultipliers && this.audioEffectMultipliers.size) {
                // Smooth pulse multiplier: fluid scaling from 1.0x to size multiplier
                volumePulseMultiplier = this.audioEffectMultipliers.size;
            }
            
            // Group particles by color for batched rendering
            this.particles.forEach(particle => {
                const color = this.visualEffects.getParticleColor(particle);
                const opacity = particle.opacity * particle.life;
                
                // PERFORMANCE OPTIMIZATION: Use numeric batch key instead of string concatenation
                const roundedOpacity = Math.round(opacity * 10); // Integer 0-10
                const colorHash = this.hashColor(color); // Convert color to numeric hash
                const batchKey = (colorHash << 8) | roundedOpacity; // Numeric key (much faster)
                
                if (!particleBatches.has(batchKey)) {
                    particleBatches.set(batchKey, {
                        color: color,
                        opacity: roundedOpacity / 10, // Convert back to decimal
                        volumePulse: volumePulseMultiplier,
                        particles: []
                    });
                }
                
                particleBatches.get(batchKey).particles.push(particle);
            });
            
            // Render each batch with optimized single path approach
            particleBatches.forEach(batch => {
                if (batch.particles.length === 0) return;
                
                // Set canvas state once per batch
                this.ctx.globalAlpha = batch.opacity;
                this.ctx.fillStyle = batch.color;
                
                // Reset shadow properties (glow is handled separately now)
                this.ctx.shadowBlur = 0;
                this.ctx.shadowColor = 'transparent';
                this.ctx.shadowOffsetX = 0;
                this.ctx.shadowOffsetY = 0;
                
                // PERFORMANCE FIX: Single path for entire batch
                this.ctx.beginPath();
                batch.particles.forEach(particle => {
                    // Apply fluid volume pulse to particle size
                    const renderSize = particle.size * batch.volumePulse;
                    
                    // Each arc needs to be a separate subpath for proper filling
                    this.ctx.moveTo(particle.x + renderSize, particle.y);
                    this.ctx.arc(particle.x, particle.y, renderSize, 0, Math.PI * 2);
                });
                this.ctx.fill();
            });
            
            // Reset canvas state once after all batches
            this.ctx.globalAlpha = 1.0;
            this.ctx.shadowBlur = 0;
        }
        
        /**
         * Fast color hashing for numeric batch keys
         */
        hashColor(colorString) {
            // Simple hash function for color strings
            let hash = 0;
            for (let i = 0; i < colorString.length; i++) {
                const char = colorString.charCodeAt(i);
                hash = ((hash << 5) - hash) + char;
                hash = hash & hash; // Convert to 32-bit integer
            }
            return Math.abs(hash) & 0xFF; // Keep it small (0-255)
        }
        
        handleResize() {
            // Store previous dimensions for particle repositioning
            const oldWidth = this.canvasWidth;
            const oldHeight = this.canvasHeight;
            
            // Recalculate dimensions based on new container size
            this.updateCanvasDimensions();
            
            // Update canvas element dimensions
            this.canvas.width = this.canvasWidth;
            this.canvas.height = this.canvasHeight;
            
            // Canvas always takes full width of container
            this.canvas.style.width = '100%';
            this.canvas.style.height = 'auto';
            
            // Preserve existing particles and their colors by repositioning instead of recreating
            if (this.particles && this.particles.length > 0 && oldWidth > 0 && oldHeight > 0) {
                // Reposition existing particles proportionally to new canvas size
                const widthRatio = this.canvasWidth / oldWidth;
                const heightRatio = this.canvasHeight / oldHeight;
                
                this.particles.forEach(particle => {
                    // Scale positions proportionally
                    particle.x = Math.min(particle.x * widthRatio, this.canvasWidth - particle.size);
                    particle.y = Math.min(particle.y * heightRatio, this.canvasHeight - particle.size);
                    
                    // Ensure particles stay within bounds
                    particle.x = Math.max(particle.size, particle.x);
                    particle.y = Math.max(particle.size, particle.y);
                });
            } else {
                // Only recreate particles if none exist (initial setup)
                this.initializeParticles();
            }
        }
        
        destroy() {
            if (this.animationId) {
                cancelAnimationFrame(this.animationId);
            }
            
            // Clean up modules
            if (this.mouseInteraction) {
                this.mouseInteraction.destroy();
            }
            
            if (this.collisionDetector) {
                this.collisionDetector.destroy();
            }
            
            if (this.physicsEffects) {
                this.physicsEffects.destroy();
            }
            
            if (this.visualEffects) {
                this.visualEffects.destroy();
            }
            
            if (this.fullscreenManager) {
                this.fullscreenManager.destroy();
            }
            
            if (this.controlCenter) {
                this.controlCenter.destroy();
            }
            
            if (this.connectionRenderer) {
                this.connectionRenderer.destroy();
            }
            
            if (this.audioAnalyzer) {
                this.audioAnalyzer.destroy();
            }
            
            if (this.audioEffects) {
                this.audioEffects.destroy();
            }
            
            if (this.glowEffect) {
                this.glowEffect.destroy();
            }
            
            // Remove event listeners
            window.removeEventListener('resize', this.handleResize);
        }
        
        async handleAudioSyncToggle(enabled) {
            if (!this.audioAnalyzer || !this.audioEffects) {
                return false;
            }
            
            if (enabled) {
                // Start audio analysis
                const success = await this.audioAnalyzer.startAudioSync();
                if (success) {
                    // Enable audio effects
                    this.audioEffects.enable();
                    console.log('Audio sync enabled successfully');
                } else {
                    // Failed to start audio - disable the config option and update UI
                    this.config.audioSync = false;
                    
                    // Update the UI control to reflect the failed state
                    if (this.controlCenter) {
                        this.controlCenter.updateControlValue('audioSync', false);
                    }
                    
                    console.error('Failed to enable audio sync - microphone access denied or unavailable');
                    
                    // Could add user notification here
                    alert('Audio sync failed: Microphone access denied or unavailable. Please check your browser permissions.');
                }
            } else {
                // Stop audio analysis and disable effects
                this.audioAnalyzer.stopAudioSync();
                this.audioEffects.disable();
                console.log('Audio sync disabled');
            }
        }
        
        handleGlowEffectToggle(enabled) {
            if (!this.glowEffect) {
                return false;
            }
            
            if (enabled) {
                this.glowEffect.enable();
                console.log('Glow effect enabled');
            } else {
                this.glowEffect.disable();
                console.log('Glow effect disabled');
            }
        }
    };
}

// Initialize particle systems when DOM is ready (prevent duplicate declarations)
if (typeof window.ParticleSystemInitialized === 'undefined') {
    window.ParticleSystemInitialized = true;
    
    document.addEventListener('DOMContentLoaded', function() {
        // Use a more specific selector and avoid duplicates
        const visualizerBlocks = document.querySelectorAll('[data-config]');
        
        // Track initialized blocks to prevent duplicates
        const initializedBlocks = new Set();
        
        visualizerBlocks.forEach(block => {
            // Skip if already initialized
            if (initializedBlocks.has(block)) {
                return;
            }
            
            // Mark as initialized
            initializedBlocks.add(block);
            
            // Extract configuration from block attributes (set by PHP render)
            const config = JSON.parse(block.dataset.config || '{}');
            
            // Initialize the particle system using the window reference
            new window.ParticleSystem(block, config);
        });
    });
} 