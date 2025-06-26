/**
 * Connection Renderer Module
 * Spatial partitioning for ultra-fast connection rendering
 */
window.VisualizerConnectionRenderer = class ConnectionRenderer {
    constructor(visualizer) {
        this.visualizer = visualizer;
        this.ctx = visualizer.ctx;
        this.spatialGrid = new Map(); // Spatial partitioning grid - uses numeric keys
        this.gridSize = 120; // Default grid cell size
        this.gridCols = 0; // Number of grid columns
        this.gridRows = 0; // Number of grid rows
        
        // 128-color discrete palette for ultra-fast batching (doubled from 64)
        this.colorPalette = []; 
        this.lastConfigHash = ''; // Track config changes
        
        // Pre-calculated thickness levels for ultra-fast batching (reverted for performance)
        this.thicknessLevels = [0.8, 1.2]; // Reverted to performant thicknesses
        
        // Dynamic connection thickness that scales with particle size
        this.updateConnectionThickness();
        
        // Pre-calculated opacity levels for ultra-fast batching (eliminates Math.round)
        this.opacityLevels = [];
        for (let i = 0; i <= 20; i++) {
            this.opacityLevels[i] = i / 20; // 0.0, 0.05, 0.10, ... 1.0
        }
        
        // Pre-calculated fast clamp lookup table (eliminates Math.min/Math.max)
        this.fastClamp = [];
        for (let i = -100; i <= 120; i++) {
            if (i < 0) this.fastClamp[i + 100] = 0;
            else if (i > 20) this.fastClamp[i + 100] = 20;
            else this.fastClamp[i + 100] = i;
        }
        
        // NO MORE PAIR TRACKING! Eliminated 125KB-1MB memory usage and 150,000 operations per frame
    }
    
    /**
     * Generate 128 discrete colors using SAME algorithm as visual effects module
     */
    updateColorPalette() {
        this.colorPalette = [];
        
        const secondaryColor = this.visualizer.config.secondaryColor;
        
        // Generate 128 colors using SAME algorithm as visual effects (perfect sync)
        for (let i = 0; i < 128; i++) {
            const degrees = (i / 128) * 360; // Same calculation as visual effects
            this.colorPalette.push(this.rotateHue(secondaryColor, degrees));
        }
    }
    
    /**
     * Rotate hue of a hex color by specified degrees - SAME as visual effects module
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
     * Get discrete color index for ultra-fast batching (0-127) - SYNCHRONIZED with particle colors
     */
    getColorIndex(particle) {
        if (!this.visualizer.config.collisionColorChange) {
            return 0; // Use first color for non-collision mode
        }
        
        // Use the same hue rotation system as particles for perfect synchronization
        if (particle.hasOwnProperty('hueRotation')) {
            // Map the particle's hue rotation (0-360) to color index (0-127)
            const normalizedHue = particle.hueRotation / 360; // 0.0 to 1.0
            return Math.floor(normalizedHue * 128) % 128; // Map to 0-127
        }
        
        return 0; // Default color for uninitialized particles
    }
    
    /**
     * Update connection thickness based on particle size for proportional scaling
     * Optimized for performance - uses logarithmic scaling to match particle sizes
     */
    updateConnectionThickness() {
        // Use logarithmic scaling to match particle size system
        const scaledParticleSize = Math.log(this.visualizer.config.particleSize + 1) * 2;
        
        // Cap thickness to prevent performance issues with large particle sizes
        const maxThickness = 1.8; // Slightly higher cap since logarithmic scaling is more conservative
        
        // Proportional scaling with performance limit using logarithmic base
        const rawThickness = scaledParticleSize * 0.15; // Reduced multiplier for logarithmic scale
        this.connectionThickness = Math.min(rawThickness, maxThickness);
        
        // Simplified thickness index for better batching (reverted to thinner for performance)
        if (this.connectionThickness <= 1.0) {
            this.thicknessIndex = 0; // Thin: up to 1.0px
            this.connectionThickness = 0.8; // Back to thin for performance
        } else {
            this.thicknessIndex = 1; // Thick: 1.0+ px 
            this.connectionThickness = 1.2; // Moderate thickness for performance
        }
    }
    
    /**
     * Optimized grid size calculation that prevents breakdown at large distances
     */
    updateGridSize() {
        const connectionDistance = this.visualizer.config.connectionDistance;
        const canvasWidth = this.visualizer.canvasWidth;
        const canvasHeight = this.visualizer.canvasHeight;
        
        // OPTIMIZATION 1: Smart grid scaling prevents breakdown at large connection distances
        if (connectionDistance >= 150) {
            // At large distances, use smaller grids to maintain efficiency
            // Target: 20-30 particles per cell maximum
            const targetParticlesPerCell = 25;
            const particleCount = this.visualizer.particles ? this.visualizer.particles.length : 150;
            const totalCells = Math.max(8, Math.ceil(particleCount / targetParticlesPerCell));
            
            // Calculate optimal grid size for target cell count
            const cellArea = (canvasWidth * canvasHeight) / totalCells;
            this.gridSize = Math.sqrt(cellArea);
        } else {
            // At small distances, use connection distance for optimal partitioning
            this.gridSize = Math.max(80, connectionDistance * 1.2);
        }
        
        // Cache grid dimensions for numeric key calculation
        this.gridCols = Math.ceil(canvasWidth / this.gridSize);
        this.gridRows = Math.ceil(canvasHeight / this.gridSize);
    }
    
    /**
     * OPTIMIZATION 3: Numeric grid key - eliminates string operations
     */
    getGridKey(x, y) {
        const gridX = Math.floor(x / this.gridSize);
        const gridY = Math.floor(y / this.gridSize);
        
        // Use numeric key instead of string concatenation
        return gridY * this.gridCols + gridX;
    }
    
    /**
     * Get "forward" neighbor cells to naturally avoid duplicate connections
     * Only checks right, down, down-right, down-left to prevent processing same pair twice
     */
    getForwardNeighborKeys(gridKey) {
        const gridX = gridKey % this.gridCols;
        const gridY = Math.floor(gridKey / this.gridCols);
        
        const forwardNeighbors = [];
        
        // Only check "forward" directions to avoid duplicates:
        // Right, Down, Down-Right, Down-Left
        const directions = [
            [1, 0],   // Right
            [0, 1],   // Down  
            [1, 1],   // Down-Right
            [-1, 1]   // Down-Left
        ];
        
        directions.forEach(([dx, dy]) => {
            const newX = gridX + dx;
            const newY = gridY + dy;
            
            if (newX >= 0 && newX < this.gridCols && newY >= 0 && newY < this.gridRows) {
                forwardNeighbors.push(newY * this.gridCols + newX);
            }
        });
        
        return forwardNeighbors;
    }
    
    /**
     * Build spatial partitioning grid from particles
     */
    buildSpatialGrid(particles) {
        this.spatialGrid.clear();
        
        particles.forEach((particle, index) => {
            const gridKey = this.getGridKey(particle.x, particle.y);
            
            if (!this.spatialGrid.has(gridKey)) {
                this.spatialGrid.set(gridKey, []);
            }
            
            // Store particle with its original index
            this.spatialGrid.get(gridKey).push({ particle, index });
        });
    }
    
    /**
     * Render connections using duplicate-free algorithm - no pair tracking needed!
     */
    renderConnections(particles) {
        // Skip if no particles or no connection distance
        if (particles.length === 0 || this.visualizer.config.connectionDistance === 0) {
            return;
        }

        // Check if config changed and update lookups if needed
        this.updateLookupsIfNeeded();

        // Update grid size based on connection distance
        this.updateGridSize();

        // Build spatial partitioning grid
        this.buildSpatialGrid(particles);

        // Pre-calculate values for performance
        const connectionDistance = this.visualizer.config.connectionDistance;
        const connectionDistanceSquared = connectionDistance * connectionDistance;
        
        // ULTRA-FAST BATCHING: Group by discrete color index and thickness
        const connectionBatches = new Map();

        // DUPLICATE-FREE ALGORITHM: Process each grid cell
        this.spatialGrid.forEach((cellParticles, gridKey) => {
            
            // STEP 1: Process connections within the same cell (use index ordering to avoid duplicates)
            cellParticles.forEach(({ particle, index }) => {
                cellParticles.forEach(({ particle: otherParticle, index: otherIndex }) => {
                    // Only process each pair once using index ordering
                    if (index >= otherIndex) return;
                    
                    this.processConnectionFast(particle, otherParticle, connectionDistance, 
                                             connectionDistanceSquared, connectionBatches);
                });
            });
            
            // STEP 2: Process connections to "forward" neighbor cells (naturally duplicate-free)
            const forwardKeys = this.getForwardNeighborKeys(gridKey);
            cellParticles.forEach(({ particle }) => {
                forwardKeys.forEach(forwardKey => {
                    const forwardParticles = this.spatialGrid.get(forwardKey);
                    if (!forwardParticles) return;
                    
                    forwardParticles.forEach(({ particle: otherParticle }) => {
                        // No index check needed - different cells, naturally unique
                        this.processConnectionFast(particle, otherParticle, connectionDistance,
                                                  connectionDistanceSquared, connectionBatches);
                    });
                });
            });
        });

        // Render all connection batches (optimized canvas batching)
        connectionBatches.forEach(batch => {
            if (batch.lines.length === 0) return;

            // Set canvas state once per batch - minimized state changes
            this.ctx.globalAlpha = batch.opacity;
            this.ctx.strokeStyle = batch.color;
            this.ctx.lineWidth = batch.thickness;

            // Single path for lines in batch - HUGE performance gain
            this.ctx.beginPath();
            for (let i = 0; i < batch.lines.length; i++) {
                const line = batch.lines[i];
                this.ctx.moveTo(line.x1, line.y1);
                this.ctx.lineTo(line.x2, line.y2);
            }
            this.ctx.stroke();
        });
        
        // Reset canvas state once after all batches
        this.ctx.globalAlpha = 1.0;
        this.ctx.lineWidth = 1.0;
    }
    
    /**
     * Check if config changed and update lookup tables if needed
     */
    updateLookupsIfNeeded() {
        const configHash = `${this.visualizer.config.particleSize}_${this.visualizer.config.collisionColorChange}`;
        
        if (this.lastConfigHash !== configHash) {
            this.updateColorPalette();
            this.updateConnectionThickness(); // Update thickness when particle size changes
            this.lastConfigHash = configHash;
        }
    }
    
    /**
     * ULTRA-FAST connection processing using pre-calculated lookups
     */
    processConnectionFast(particle, otherParticle, connectionDistance, connectionDistanceSquared, connectionBatches) {
        
        // PERFORMANCE: Early distance culling before any calculations
        const dx = particle.x - otherParticle.x;
        const dy = particle.y - otherParticle.y;
        
        // Ultra-fast bounding box pre-check - ELIMINATED Math.abs for performance
        const absDx = dx < 0 ? -dx : dx; 
        const absDy = dy < 0 ? -dy : dy; 
        
        // Early exit if definitely too far (major performance boost)
        if (absDx > connectionDistance || absDy > connectionDistance) {
            return;
        }
        
        const distanceSquared = dx * dx + dy * dy;
        
        // Apply standard distance check
        if (distanceSquared < connectionDistanceSquared) {
            // PERFORMANCE: Skip very faint connections early
            const normalizedDistanceSquared = distanceSquared / connectionDistanceSquared;
            let baseOpacity = (1 - normalizedDistanceSquared) * 0.661 * Math.min(particle.life, otherParticle.life);
            
            // Early opacity culling - increased threshold for better performance
            if (baseOpacity < 0.04) return; // Increased from 0.02 to 0.04
            
            // Apply audio effect multipliers if available
            if (this.visualizer.audioEffectMultipliers && this.visualizer.audioEffectMultipliers.connections) {
                baseOpacity *= this.visualizer.audioEffectMultipliers.connections;
                // Re-check opacity after audio effects
                if (baseOpacity < 0.03) return;
            }
            
            // Simple center-to-center connections (particles render on top to mask endpoints)
            const startX = particle.x;
            const startY = particle.y;
            const endX = otherParticle.x;
            const endY = otherParticle.y;
            
            // ULTRA-FAST: Get discrete color from 128-color palette or audio override
            let colorIndex, connectionColor;
            
            // Check if either particle has audio color override
            const particle1HasAudio = particle.audioColorOverride && particle.audioColorOverride.color;
            const particle2HasAudio = otherParticle.audioColorOverride && otherParticle.audioColorOverride.color;
            
            if (particle1HasAudio || particle2HasAudio) {
                // Use audio colors for connections when available
                if (particle1HasAudio && particle2HasAudio) {
                    // Both have audio colors - blend them
                    const color1 = particle.audioColorOverride.color;
                    const color2 = otherParticle.audioColorOverride.color;
                    connectionColor = this.blendConnectionColors(color1, color2);
                    // Use average hue rotation for batching
                    const hue1 = particle.audioColorOverride.hueRotation || 0;
                    const hue2 = otherParticle.audioColorOverride.hueRotation || 0;
                    colorIndex = Math.floor(((hue1 + hue2) / 2) / 360 * 128) % 128;
                } else if (particle1HasAudio) {
                    // Only first particle has audio color
                    connectionColor = particle.audioColorOverride.color;
                    colorIndex = Math.floor((particle.audioColorOverride.hueRotation || 0) / 360 * 128) % 128;
                } else {
                    // Only second particle has audio color
                    connectionColor = otherParticle.audioColorOverride.color;
                    colorIndex = Math.floor((otherParticle.audioColorOverride.hueRotation || 0) / 360 * 128) % 128;
                }
            } else {
                // No audio colors - use collision/default system
                colorIndex = this.visualizer.config.collisionColorChange ? 
                    this.getColorIndex(particle) : 0;
                connectionColor = this.visualizer.config.collisionColorChange ?
                    this.colorPalette[colorIndex] : this.visualizer.config.secondaryColor;
            }
            
            // ULTRA-FAST BATCHING: Pre-calculated opacity for maximum batching efficiency
            // ELIMINATED Math.min, Math.max, Math.round! Use bit operations for integer conversion
            const opacityRaw = (baseOpacity * 20 + 0.5) | 0; // Bit operation for fast floor
            const opacityIndex = this.fastClamp[opacityRaw + 100]; // Fast clamp using lookup table
            const opacity = this.opacityLevels[opacityIndex];
            
            // ULTRA-FAST NUMERIC BATCH KEY: Use simplified thickness for optimal batching
            // Only 2 thickness levels (0.8, 1.2) mapped to (0, 1) for better performance
            const thicknessIndex = this.thicknessIndex;
            const batchKey = (colorIndex << 8) | (opacityIndex << 1) | thicknessIndex; // More efficient packing
            
            if (!connectionBatches.has(batchKey)) {
                connectionBatches.set(batchKey, {
                    color: connectionColor,
                    opacity: opacity,
                    thickness: this.connectionThickness,
                    lines: []
                });
            }
            
            connectionBatches.get(batchKey).lines.push({
                x1: startX,
                y1: startY,
                x2: endX,
                y2: endY
            });
        }
    }
    
    /**
     * Update configuration when settings change
     */
    updateConfig() {
        this.updateGridSize();
        // Force lookup table refresh on next render
        this.lastConfigHash = '';
        this.updateConnectionThickness();
    }
    
    /**
     * Initialize lookup tables (call this when visualizer starts)
     */
    init() {
        this.updateColorPalette();
        this.lastConfigHash = `${this.visualizer.config.particleSize}_${this.visualizer.config.collisionColorChange}`;
    }
    
    /**
     * Cleanup
     */
    destroy() {
        this.spatialGrid.clear();
        this.colorPalette = [];
        this.ctx = null;
        this.visualizer = null;
    }
    
    /**
     * Blend two hex colors for connection rendering (simple midpoint blend)
     */
    blendConnectionColors(color1, color2) {
        // Parse hex colors to RGB
        const rgb1 = this.hexToRgb(color1);
        const rgb2 = this.hexToRgb(color2);
        
        if (!rgb1 || !rgb2) return color1; // Fallback
        
        // Simple midpoint blend
        const r = Math.round((rgb1.r + rgb2.r) / 2);
        const g = Math.round((rgb1.g + rgb2.g) / 2);
        const b = Math.round((rgb1.b + rgb2.b) / 2);
        
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