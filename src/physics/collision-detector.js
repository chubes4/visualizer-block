/**
 * Collision Detector Module
 * Spatial partitioning for ultra-fast collision detection
 */
window.VisualizerCollisionDetector = class CollisionDetector {
    constructor(visualizer) {
        this.visualizer = visualizer;
        this.collisionSubscribers = [];
        
        // Spatial partitioning for collision detection
        this.spatialGrid = new Map();
        this.gridSize = 40; // Smaller grid for collision detection (particles are small)
        this.gridCols = 0;
        this.gridRows = 0;
    }
    
    /**
     * Subscribe to collision events
     * @param {Function} callback - Function to call when collision occurs
     */
    subscribe(callback) {
        this.collisionSubscribers.push(callback);
    }
    
    /**
     * Unsubscribe from collision events
     * @param {Function} callback - Function to remove from subscribers
     */
    unsubscribe(callback) {
        const index = this.collisionSubscribers.indexOf(callback);
        if (index > -1) {
            this.collisionSubscribers.splice(index, 1);
        }
    }
    
    /**
     * Notify all subscribers of a collision
     */
    notifyCollision(particle1, particle2, collisionData) {
        this.collisionSubscribers.forEach(callback => {
            callback(particle1, particle2, collisionData);
        });
    }
    
    /**
     * Update grid size based on average particle size - optimized for performance with logarithmic scaling
     * ENHANCED: Now accounts for audio size multipliers for optimal spatial partitioning
     */
    updateGridSize() {
        // Use logarithmic scaling to match particle size system
        const scaledParticleSize = Math.log(this.visualizer.config.particleSize + 1) * 2;
        
        // Account for audio size multiplier to ensure grid remains efficient
        let effectiveParticleSize = scaledParticleSize;
        if (this.visualizer.audioEffectMultipliers && this.visualizer.audioEffectMultipliers.size) {
            effectiveParticleSize *= this.visualizer.audioEffectMultipliers.size;
        }
        
        // PERFORMANCE OPTIMIZATION: Grid size based on effective particle size
        // Grid size should be 2-3x particle diameter, but capped at 120 for optimal performance
        const optimalGridSize = effectiveParticleSize * 6;
        this.gridSize = Math.min(120, Math.max(20, optimalGridSize));
        
        this.gridCols = Math.ceil(this.visualizer.canvasWidth / this.gridSize);
        this.gridRows = Math.ceil(this.visualizer.canvasHeight / this.gridSize);
    }
    
    /**
     * Get numeric grid key
     */
    getGridKey(x, y) {
        const gridX = Math.floor(x / this.gridSize);
        const gridY = Math.floor(y / this.gridSize);
        return gridY * this.gridCols + gridX;
    }
    
    /**
     * Get forward neighbor cells to naturally avoid duplicate collision checks
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
     * Build spatial grid
     */
    buildSpatialGrid(particles) {
        this.spatialGrid.clear();
        
        particles.forEach((particle, index) => {
            const gridKey = this.getGridKey(particle.x, particle.y);
            
            if (!this.spatialGrid.has(gridKey)) {
                this.spatialGrid.set(gridKey, []);
            }
            
            this.spatialGrid.get(gridKey).push({ particle, index });
        });
    }
    
    /**
     * Detect collisions using spatial partitioning - O(n²) to O(n) optimization
     * Enhanced with adaptive particle count scaling for performance
     */
    detectCollisions(particles) {
        const particleCount = particles.length;
        
        // Adaptive skip factor based on particle count for performance
        let skipFactor = 1;
        if (particleCount > 200) {
            skipFactor = 2; // Check every 2nd particle
        } else if (particleCount > 300) {
            skipFactor = 3; // Check every 3rd particle
        }
        
        // Use optimized spatial partitioning
        this.detectCollisionsOptimized(particles, skipFactor);
    }
    
    /**
     * Optimized collision detection using forward neighbor checking - NO expensive Set operations!
     * Enhanced with skip factor for performance scaling
     */
    detectCollisionsOptimized(particles, skipFactor = 1) {
        this.updateGridSize();
        this.buildSpatialGrid(particles);
        
        // ELIMINATED expensive Set operations! Use forward neighbor checking instead
        
        // Process each grid cell with duplicate-free algorithm
        this.spatialGrid.forEach((cellParticles, gridKey) => {
            
            // STEP 1: Process collisions within the same cell (use index ordering to avoid duplicates)
            cellParticles.forEach(({ particle: particle1, index: index1 }) => {
                // Apply skip factor for performance scaling
                if (skipFactor > 1 && index1 % skipFactor !== 0) return;
                
                cellParticles.forEach(({ particle: particle2, index: index2 }) => {
                    // Only process each pair once using index ordering
                    if (index1 >= index2) return;
                    
                    this.checkParticleCollision(particle1, particle2);
                });
            });
            
            // STEP 2: Process collisions to "forward" neighbor cells (naturally duplicate-free)
            const forwardKeys = this.getForwardNeighborKeys(gridKey);
            cellParticles.forEach(({ particle: particle1, index: index1 }) => {
                // Apply skip factor for performance scaling
                if (skipFactor > 1 && index1 % skipFactor !== 0) return;
                
                forwardKeys.forEach(forwardKey => {
                    const forwardParticles = this.spatialGrid.get(forwardKey);
                    if (!forwardParticles) return;
                    
                    forwardParticles.forEach(({ particle: particle2 }) => {
                        // No index check needed - different cells, naturally unique
                        this.checkParticleCollision(particle1, particle2);
                    });
                });
            });
        });
    }
    
    /**
     * Get effective particle size including audio effects
     */
    getEffectiveParticleSize(particle) {
        let effectiveSize = particle.size;
        
        // Apply audio size multiplier if available
        if (this.visualizer.audioEffectMultipliers && this.visualizer.audioEffectMultipliers.size) {
            effectiveSize *= this.visualizer.audioEffectMultipliers.size;
        }
        
        return effectiveSize;
    }
    
    /**
     * Check collision between two specific particles - ELIMINATED Math.atan2 for performance
     * ENHANCED: Now accounts for audio size multipliers for accurate collision detection
     */
    checkParticleCollision(particle1, particle2) {
        // Calculate distance components
                const dx = particle2.x - particle1.x;
                const dy = particle2.y - particle1.y;
        
        // Combined radius for collision check - now includes audio size effects
        const particle1Size = this.getEffectiveParticleSize(particle1);
        const particle2Size = this.getEffectiveParticleSize(particle2);
        const combinedRadius = particle1Size + particle2Size;
        
        // Bounding box pre-check - ELIMINATED Math.abs for performance
        const absDx = dx < 0 ? -dx : dx; // Faster than Math.abs(dx)
        const absDy = dy < 0 ? -dy : dy; // Faster than Math.abs(dy)
        
        if (absDx > combinedRadius || absDy > combinedRadius) {
            return; // No collision possible
        }
        
        // Calculate distance squared for performance
                const distanceSquared = dx * dx + dy * dy;
        const combinedRadiusSquared = combinedRadius * combinedRadius;
                
        // Check for collision
        if (distanceSquared < combinedRadiusSquared && distanceSquared > 0) {
                    // Calculate actual distance only when collision is confirmed
                    const distance = Math.sqrt(distanceSquared);
                    
            // Create collision data object - ELIMINATED Math.atan2 for performance
                    const collisionData = {
                        dx,
                        dy,
                        distance,
                minDistance: combinedRadius,
                overlap: combinedRadius - distance,
                        relativeVelocity: {
                            x: particle2.vx - particle1.vx,
                            y: particle2.vy - particle1.vy
                        }
                    };
                    
                    // Notify all subscribers
                    this.notifyCollision(particle1, particle2, collisionData);
        }
    }
    
    /**
     * Check if collision detection should run
     */
    shouldDetectCollisions() {
        return this.visualizer.config.rubberizeParticles || 
               this.visualizer.config.collisionColorChange;
    }
    
    /**
     * Cleanup
     */
    destroy() {
        this.collisionSubscribers = [];
        this.spatialGrid.clear();
    }
}; 