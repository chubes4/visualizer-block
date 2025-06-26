/**
 * Physics Effects Module
 * Handles all physics-based particle interactions and behaviors
 */
window.VisualizerPhysicsEffects = class PhysicsEffects {
    constructor(visualizer) {
        this.visualizer = visualizer;
        this.collisionCallback = null;
    }
    
    /**
     * Initialize physics effects and subscribe to collision events
     */
    initialize(collisionDetector) {
        this.collisionDetector = collisionDetector;
        
        // Subscribe to collision events for rubberization
        this.collisionCallback = (particle1, particle2, collisionData) => {
            if (this.visualizer.config.rubberizeParticles) {
                this.handleParticleCollision(particle1, particle2, collisionData);
            }
        };
        
        this.collisionDetector.subscribe(this.collisionCallback);
    }
    
    /**
     * Apply all enabled physics effects to particles
     */
    applyPhysicsEffects(particles) {
        particles.forEach((particle, index) => {
            // Handle wall bouncing
            if (this.visualizer.config.bounceOffWalls) {
                this.handleWallBouncing(particle);
            } else {
                this.handleEdgeWrapping(particle);
            }
        });
        
        // Handle particle magnetism if enabled
        if (this.visualizer.config.particleMagnetism) {
            this.handleParticleMagnetism(particles);
        }
    }
    
    /**
     * Handle collision response for rubberization (called by collision detector)
     */
    handleParticleCollision(particle1, particle2, collisionData) {
        // Use the collision data provided by the detector
        const { dx, dy, distance, minDistance } = collisionData;
        
        this.resolveParticleCollision(particle1, particle2, dx, dy, distance, minDistance);
    }
    
    /**
     * Handle particle bouncing off canvas walls with realistic energy loss
     * Enhanced to prevent large particle perimeter orbiting with added randomness
     */
    handleWallBouncing(particle) {
        // Calculate where particle will be next frame
        const nextX = particle.x + particle.vx * this.visualizer.config.animationSpeed;
        const nextY = particle.y + particle.vy * this.visualizer.config.animationSpeed;
        
        // Conditional energy loss based on active physics effects
        let wallRestitution;
        if (this.visualizer.config.rubberizeParticles) {
            // With rubberization: Need energy loss to prevent perimeter orbits
            const massFactor = window.VisualizerSizeScale.getMass(particle);
            const energyLoss = 0.85 - (massFactor * 0.01); // Large particles lose more energy (0.75-0.85 range)
            wallRestitution = Math.max(0.65, Math.min(0.85, energyLoss)); // Clamp between reasonable values
        } else {
            // Without rubberization: Maintain most energy to keep system lively
            wallRestitution = 0.95; // High energy retention for pure wall bouncing
        }
        
        // Random deflection angle system - chance to deflect at random angle instead of normal physics
        // More likely with rubberize enabled to break orbital patterns
        const randomDeflectionChance = this.visualizer.config.rubberizeParticles ? 0.3 : 0.1; // 30% or 10% chance
        const shouldRandomDeflect = Math.random() < randomDeflectionChance;
        
        // Calculate current speed to preserve energy
        const currentSpeed = Math.sqrt(particle.vx * particle.vx + particle.vy * particle.vy);
        
        // Wall spring effect - small push away from walls to prevent sticking/repetitive bouncing
        const wallSpringForce = 0.3; // Small but effective push away from walls
        
        // Additional orbital pattern breaking for rubberized particles
        const isLikelyOrbiting = this.visualizer.config.rubberizeParticles && 
                                (Math.abs(particle.vx) > 0.5 || Math.abs(particle.vy) > 0.5);
        
        // Predictive collision detection - check if particle WOULD hit wall
        
        // Left wall collision
        if (nextX - particle.size <= 0) {
            particle.x = particle.size;
            
            if (shouldRandomDeflect || isLikelyOrbiting) {
                // Random deflection angle pointing AWAY from left wall (rightward hemisphere)
                const randomAngle = (Math.random() - 0.5) * Math.PI; // -π/2 to π/2 (pointing right)
                particle.vx = Math.cos(randomAngle) * currentSpeed * wallRestitution;
                particle.vy = Math.sin(randomAngle) * currentSpeed * wallRestitution;
            } else {
                // Normal physics bounce
                particle.vx = -particle.vx * wallRestitution;
            }
            // Wall spring effect - push away from left wall
            particle.vx += wallSpringForce;
        }
        
        // Right wall collision  
        if (nextX + particle.size >= this.visualizer.canvasWidth) {
            particle.x = this.visualizer.canvasWidth - particle.size;
            
            if (shouldRandomDeflect || isLikelyOrbiting) {
                // Random deflection angle pointing AWAY from right wall (leftward hemisphere)
                const randomAngle = Math.PI + (Math.random() - 0.5) * Math.PI; // π/2 to 3π/2 (pointing left)
                particle.vx = Math.cos(randomAngle) * currentSpeed * wallRestitution;
                particle.vy = Math.sin(randomAngle) * currentSpeed * wallRestitution;
            } else {
                // Normal physics bounce
                particle.vx = -particle.vx * wallRestitution;
            }
            // Wall spring effect - push away from right wall
            particle.vx -= wallSpringForce;
        }
        
        // Top wall collision
        if (nextY - particle.size <= 0) {
            particle.y = particle.size;
            
            if (shouldRandomDeflect || isLikelyOrbiting) {
                // Random deflection angle pointing AWAY from top wall (downward hemisphere)
                const randomAngle = (Math.random() * Math.PI); // 0 to π (pointing down)
                particle.vx = Math.cos(randomAngle) * currentSpeed * wallRestitution;
                particle.vy = Math.sin(randomAngle) * currentSpeed * wallRestitution;
            } else {
                // Normal physics bounce
                particle.vy = -particle.vy * wallRestitution;
            }
            // Wall spring effect - push away from top wall
            particle.vy += wallSpringForce;
        }
        
        // Bottom wall collision
        if (nextY + particle.size >= this.visualizer.canvasHeight) {
            particle.y = this.visualizer.canvasHeight - particle.size;
            
            if (shouldRandomDeflect || isLikelyOrbiting) {
                // Random deflection angle pointing AWAY from bottom wall (upward hemisphere)
                const randomAngle = Math.PI + (Math.random() * Math.PI); // π to 2π (pointing up)
                particle.vx = Math.cos(randomAngle) * currentSpeed * wallRestitution;
                particle.vy = Math.sin(randomAngle) * currentSpeed * wallRestitution;
            } else {
                // Normal physics bounce
                particle.vy = -particle.vy * wallRestitution;
            }
            // Wall spring effect - push away from bottom wall
            particle.vy -= wallSpringForce;
        }
    }
    
    /**
     * Handle particle wrapping around canvas edges
     * Fixed to account for particle radius - eliminates off-screen buffer
     */
    handleEdgeWrapping(particle) {
        // Account for particle radius to prevent visual cut-off and eliminate off-screen buffer
        if (particle.x < -particle.size) {
            particle.x = this.visualizer.canvasWidth + particle.size;
        }
        if (particle.x > this.visualizer.canvasWidth + particle.size) {
            particle.x = -particle.size;
        }
        if (particle.y < -particle.size) {
            particle.y = this.visualizer.canvasHeight + particle.size;
        }
        if (particle.y > this.visualizer.canvasHeight + particle.size) {
            particle.y = -particle.size;
        }
    }
    
    /**
     * Resolve elastic collision between two particles - ELIMINATED ALL Math.sqrt operations
     */
    resolveParticleCollision(particle1, particle2, dx, dy, distance, minDistance) {
        // Normalize collision vector using provided distance (avoid recalculating)
        const nx = dx / distance;
        const ny = dy / distance;
        
        // Separate particles to prevent overlap
        const overlap = minDistance - distance;
        const separateX = nx * overlap * 0.5;
        const separateY = ny * overlap * 0.5;
        
        particle1.x -= separateX;
        particle1.y -= separateY;
        particle2.x += separateX;
        particle2.y += separateY;
        
        // Use size-scale utility for mass calculations
        const massData = window.VisualizerSizeScale.getMassRatios(particle1, particle2);
        
        // ELIMINATED Math.sqrt! Use velocity squared for speed calculations
        const speedSquared1 = particle1.vx * particle1.vx + particle1.vy * particle1.vy;
        const speedSquared2 = particle2.vx * particle2.vx + particle2.vy * particle2.vy;
        
        // Calculate relative velocity along collision normal
        const rvx = particle2.vx - particle1.vx;
        const rvy = particle2.vy - particle1.vy;
        const relativeSpeed = rvx * nx + rvy * ny;
        
        // Don't resolve if velocities are separating
        if (relativeSpeed > 0) return;
        
        // Enhanced rubberization: Calculate size similarity factor
        const sizeRatio = window.VisualizerSizeScale.getSizeRatio(particle1, particle2);
        const sizeSimilarity = 1 / sizeRatio; // 1.0 = identical sizes, approaches 0 for very different sizes
        
        // Enhanced coefficient of restitution for similar-sized particles
        // Base elasticity increases for similar sizes, maintaining existing behavior for different sizes
        const baseElasticity = 0.8; // Standard elastic collision
        const similarSizeBonus = sizeSimilarity * 0.2; // Reduced from 0.3 to make less predictable
        const randomElasticityVariation = (Math.random() - 0.5) * 0.1; // Add small random variation
        const coefficientOfRestitution = Math.min(baseElasticity + similarSizeBonus + randomElasticityVariation, 1.05); // Reduced cap
        
        // Calculate velocity changes along collision normal with enhanced elasticity
        const velocityChange1 = relativeSpeed * massData.ratio1 * coefficientOfRestitution;
        const velocityChange2 = relativeSpeed * massData.ratio2 * coefficientOfRestitution;
        
        // Apply velocity changes along collision normal
        particle1.vx += velocityChange1 * nx;
        particle1.vy += velocityChange1 * ny;
        particle2.vx -= velocityChange2 * nx;
        particle2.vy -= velocityChange2 * ny;
        
        // Random angle deflection for particle collisions to prevent predictable patterns
        const collisionDeflectionChance = this.visualizer.config.rubberizeParticles ? 0.15 : 0.05; // 15% or 5% chance
        
        if (Math.random() < collisionDeflectionChance) {
            // Apply random deflection to both particles while preserving their speeds
            const speed1 = Math.sqrt(particle1.vx * particle1.vx + particle1.vy * particle1.vy);
            const speed2 = Math.sqrt(particle2.vx * particle2.vx + particle2.vy * particle2.vy);
            
            // Calculate collision normal to avoid deflecting back towards each other
            const collisionAngle = Math.atan2(dy, dx); // Angle from particle1 to particle2
            
            // Random deflection angles in hemispheres pointing away from each other
            const deflectionRange = Math.PI * 0.8; // 80% of hemisphere for some randomness
            const deflectionAngle1 = collisionAngle + Math.PI + (Math.random() - 0.5) * deflectionRange; // Away from particle2
            const deflectionAngle2 = collisionAngle + (Math.random() - 0.5) * deflectionRange; // Away from particle1
            
            // Apply random directions while preserving speeds
            particle1.vx = Math.cos(deflectionAngle1) * speed1;
            particle1.vy = Math.sin(deflectionAngle1) * speed1;
            particle2.vx = Math.cos(deflectionAngle2) * speed2;
            particle2.vy = Math.sin(deflectionAngle2) * speed2;
        }
        
        // ELIMINATED Math.sqrt! Calculate new speeds squared
        const newSpeedSquared1 = particle1.vx * particle1.vx + particle1.vy * particle1.vy;
        const newSpeedSquared2 = particle2.vx * particle2.vx + particle2.vy * particle2.vy;
        
        // Apply speed adjustments using squared calculations
        const energyTransfer = window.VisualizerSizeScale.getEnergyTransferFactor(particle1, particle2);
        
        // Enhanced rubberization: Add bounce energy for similar-sized particles
        const bounceEnergyFactor = 1 + (sizeSimilarity * 0.15); // Up to 15% energy boost for similar sizes
        
        if (newSpeedSquared1 > 0) {
            // Enhanced speed blending for similar sizes
            const blendFactor = 0.1 + (sizeSimilarity * 0.1); // 10-20% blending based on size similarity
            const targetSpeedSquared1 = speedSquared1 * (1 - massData.ratio1 * blendFactor) + 
                                       newSpeedSquared1 * (massData.ratio1 * blendFactor) * bounceEnergyFactor;
            const speedScale1 = Math.sqrt(targetSpeedSquared1 / newSpeedSquared1); // Only ONE Math.sqrt per collision
            particle1.vx *= speedScale1;
            particle1.vy *= speedScale1;
        }
        
        if (newSpeedSquared2 > 0) {
            // Energy boost for smaller particles (existing system) + similar size bonus
            const traditionalEnergyBoost = massData.mass1 > massData.mass2 ? (1 + energyTransfer * 0.1) : 1;
            const combinedEnergyBoost = traditionalEnergyBoost * bounceEnergyFactor;
            
            const blendFactor = 0.1 + (sizeSimilarity * 0.1); // 10-20% blending based on size similarity
            const targetSpeedSquared2 = (speedSquared2 * (1 - massData.ratio2 * blendFactor) + 
                                        newSpeedSquared2 * (massData.ratio2 * blendFactor)) * 
                                        combinedEnergyBoost * combinedEnergyBoost;
            const speedScale2 = Math.sqrt(targetSpeedSquared2 / newSpeedSquared2); // Only ONE Math.sqrt per collision
            particle2.vx *= speedScale2;
            particle2.vy *= speedScale2;
        }
        
        // Apply maximum speed limit using squared calculations
        this.limitParticleSpeedSquared(particle1);
        this.limitParticleSpeedSquared(particle2);
    }
    
    /**
     * Limit particle speed using squared calculations - ELIMINATED Math.sqrt!
     */
    limitParticleSpeedSquared(particle) {
        const baseMaxSpeed = 6; // Base maximum pixels per frame
        const maxSpeed = baseMaxSpeed * this.visualizer.config.animationSpeed;
        const maxSpeedSquared = maxSpeed * maxSpeed;
        const currentSpeedSquared = particle.vx * particle.vx + particle.vy * particle.vy;
        
        if (currentSpeedSquared > maxSpeedSquared) {
            const scale = Math.sqrt(maxSpeedSquared / currentSpeedSquared); // Only ONE Math.sqrt when limiting needed
            particle.vx *= scale;
            particle.vy *= scale;
        }
    }
    
    /**
     * Check if any physics effects are enabled or if edge wrapping is needed
     */
    hasActiveEffects() {
        // Always return true since we always need either edge wrapping or wall bouncing
        return true;
    }
    
    /**
     * Cleanup - unsubscribe from collision events
     */
    destroy() {
        if (this.collisionDetector && this.collisionCallback) {
            this.collisionDetector.unsubscribe(this.collisionCallback);
        }
    }
    
    /**
     * Apply magnetic attraction using spatial partitioning - MASSIVE O(n²) to O(n) optimization
     * Fixed magnetic force strength and proper size-based behavior
     * ENHANCED: Includes audio beat pulse effects and 3-tier magnetic inversion system
     */
    handleParticleMagnetism(particles) {
        if (!this.visualizer.config.particleMagnetism) {
            // Even if regular magnetism is disabled, check for audio pulse effects
            this.handleAudioMagneticPulse(particles);
            return;
        }
        
        // Check for active 3-tier magnetic inversion system
        const hasInversion = this.visualizer.audioMagneticInversion && this.visualizer.audioMagneticInversion.active;
        
        let maxMagneticDistance = this.visualizer.config.connectionDistance;
        let baseMagneticStrength = 0.25; // Increased from 0.08 for orbital dynamics
        let repulsionThreshold = 0; // NEW: Distance threshold where attraction becomes repulsion
        
        // ENHANCED: Apply 3-tier magnetic inversion for sophisticated tolerance adjustment
        if (hasInversion) {
            const inversion = this.visualizer.audioMagneticInversion;
            
            // Calculate repulsion threshold based on tier
            // Higher tolerance reduction = larger repulsion zone
            repulsionThreshold = maxMagneticDistance * inversion.toleranceReduction;
            
            // Apply tier-specific power multiplier
            baseMagneticStrength *= inversion.powerMultiplier;
        }
        
        const maxMagneticDistanceSquared = maxMagneticDistance * maxMagneticDistance;
        const repulsionThresholdSquared = repulsionThreshold * repulsionThreshold;
        
        // Apply audio effect multipliers if available (normal magnetism effects)
        if (this.visualizer.audioEffectMultipliers && this.visualizer.audioEffectMultipliers.magnetism) {
            baseMagneticStrength *= this.visualizer.audioEffectMultipliers.magnetism;
        }
        
        const particleCount = particles.length;
        
        // Particle count scaling: gentler reduction to maintain liquidization effect
        const countScaling = Math.max(0.5, 1 / Math.sqrt(particleCount / 100)); // Less aggressive scaling
        const scaledMagneticStrength = baseMagneticStrength * countScaling;
        
        // Use spatial partitioning for massive performance improvement
        // Grid size adapts to magnetic range for optimal performance
        const gridSize = Math.max(80, maxMagneticDistance * 1.2);
        const gridCols = Math.ceil(this.visualizer.canvasWidth / gridSize);
        const gridRows = Math.ceil(this.visualizer.canvasHeight / gridSize);
        const spatialGrid = new Map();
        
        // Build spatial grid
        particles.forEach((particle, index) => {
            const gridX = Math.floor(particle.x / gridSize);
            const gridY = Math.floor(particle.y / gridSize);
            const gridKey = gridY * gridCols + gridX;
            
            if (!spatialGrid.has(gridKey)) {
                spatialGrid.set(gridKey, []);
            }
            spatialGrid.get(gridKey).push({ particle, index });
        });
        
        // Process each grid cell with forward neighbor checking (avoids duplicates)
        spatialGrid.forEach((cellParticles, gridKey) => {
            const gridX = gridKey % gridCols;
            const gridY = Math.floor(gridKey / gridCols);
            
            // Forward neighbor directions (right, down, down-right, down-left)
            const forwardDirections = [[1, 0], [0, 1], [1, 1], [-1, 1]];
            
            // Within-cell magnetism (use index ordering)
            cellParticles.forEach(({ particle: particle1, index: index1 }) => {
                cellParticles.forEach(({ particle: particle2, index: index2 }) => {
                    if (index1 >= index2) return; // Avoid duplicates
                    
                    this.applyMagneticForce(particle1, particle2, maxMagneticDistance, 
                                          maxMagneticDistanceSquared, scaledMagneticStrength, repulsionThresholdSquared);
                });
            });
            
            // Cross-cell magnetism (only forward neighbors)
            cellParticles.forEach(({ particle: particle1 }) => {
                forwardDirections.forEach(([dx, dy]) => {
                    const newX = gridX + dx;
                    const newY = gridY + dy;
                    
                    if (newX >= 0 && newX < gridCols && newY >= 0 && newY < gridRows) {
                        const neighborKey = newY * gridCols + newX;
                        const neighborParticles = spatialGrid.get(neighborKey);
                        if (!neighborParticles) return;
                        
                        neighborParticles.forEach(({ particle: particle2 }) => {
                            this.applyMagneticForce(particle1, particle2, maxMagneticDistance,
                                                  maxMagneticDistanceSquared, scaledMagneticStrength, repulsionThresholdSquared);
                        });
                    }
                });
            });
        });
        
        // Apply audio magnetic pulse effects
        this.handleAudioMagneticPulse(particles);
    }
    
    /**
     * Apply magnetic force between two particles - ENHANCED with tolerance-based inversion
     * NEW: Supports 3-tier magnetic inversion system for sophisticated burst effects
     * NEW: Dynamic similarity threshold for starburst kaleidoscope effects
     */
    applyMagneticForce(particle1, particle2, maxMagneticDistance, maxMagneticDistanceSquared, baseMagneticStrength, repulsionThresholdSquared = 0) {
        const dx = particle2.x - particle1.x;
        const dy = particle2.y - particle1.y;
        
        // Bounding box pre-check - ELIMINATED Math.abs for performance
        const absDx = dx < 0 ? -dx : dx; // Faster than Math.abs(dx)
        const absDy = dy < 0 ? -dy : dy; // Faster than Math.abs(dy)
        
        if (absDx > maxMagneticDistance || absDy > maxMagneticDistance) {
            return;
        }
        
        const distanceSquared = dx * dx + dy * dy;
        
        if (distanceSquared < maxMagneticDistanceSquared && distanceSquared > 0) {
            // Calculate distance only when needed for size-based magnetic force
            const distance = Math.sqrt(distanceSquared);
            
            // NEW: Determine if this should be attraction or repulsion based on tolerance threshold
            let forceDirection = 1; // 1 = attraction, -1 = repulsion
            
            if (repulsionThresholdSquared > 0 && distanceSquared < repulsionThresholdSquared) {
                // Within repulsion threshold - particles repel each other
                forceDirection = -1;
            }
            
            // NEW: Calculate dynamic similarity threshold for starburst effects during audio bursts
            let similarityThreshold = 0.15; // Default threshold (15% size difference)
            
            // Check if magnetic inversion is active (audio bursts)
            if (this.visualizer.audioMagneticInversion && this.visualizer.audioMagneticInversion.active) {
                const inversion = this.visualizer.audioMagneticInversion;
                
                // Increase similarity threshold based on tier - more particles considered "similar"
                // This creates starburst separations and kaleidoscope effects
                switch (inversion.tier) {
                    case 1:
                        similarityThreshold = 0.25; // 25% threshold - gentle starburst
                        break;
                    case 2:
                        similarityThreshold = 0.40; // 40% threshold - moderate starburst  
                        break;
                    case 3:
                        similarityThreshold = 0.60; // 60% threshold - dramatic starburst kaleidoscope
                        break;
                }
            }
            
            // Use the sophisticated size-based magnetic force calculation with dynamic threshold
            const magneticForce = window.VisualizerSizeScale.calculateMagneticForce(
                particle1, particle2, distance, maxMagneticDistance, baseMagneticStrength * forceDirection, similarityThreshold
            );
            
            // Apply the calculated forces (velocity boost now handled globally by audio effects)
            particle1.vx += magneticForce.fx;
            particle1.vy += magneticForce.fy;
            particle2.vx -= magneticForce.fx;
            particle2.vy -= magneticForce.fy;
        }
    }
    
    /**
     * Handle audio beat magnetic pulse effects
     * SIMPLIFIED: Only runs when regular magnetism is disabled
     */
    handleAudioMagneticPulse(particles) {
        if (!this.visualizer.audioMagneticPulse || !this.visualizer.audioMagneticPulse.active) {
            return;
        }
        
        const now = Date.now();
        const pulse = this.visualizer.audioMagneticPulse;
        
        // Check if pulse is still active
        if (now > pulse.endTime) {
            pulse.active = false;
            return;
        }
        
        // Calculate pulse fade (starts strong, fades out)
        const pulseProgress = (now - (pulse.endTime - 300)) / 300; // 300ms duration
        const pulseIntensity = Math.max(0, 1 - pulseProgress) * pulse.strength;
        
        // Apply repulsion pulse (only used when magnetism is disabled)
        this.applyRepulsionPulse(particles, pulseIntensity);
    }
    
    /**
     * Apply repulsion pulse from center (only used when magnetism is disabled)
     */
    applyRepulsionPulse(particles, intensity) {
        // Apply repulsion force to all particles from center
        const centerX = this.visualizer.canvasWidth / 2;
        const centerY = this.visualizer.canvasHeight / 2;
        const maxPulseDistance = Math.min(this.visualizer.canvasWidth, this.visualizer.canvasHeight) * 0.7;
        
        particles.forEach(particle => {
            const dx = particle.x - centerX;
            const dy = particle.y - centerY;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance > 0 && distance < maxPulseDistance) {
                // Stronger force closer to center, fades with distance
                const distanceRatio = 1 - (distance / maxPulseDistance);
                const forceStrength = intensity * distanceRatio * 2; // Base force multiplier
                
                // Normalize direction and apply force
                const forceX = (dx / distance) * forceStrength;
                const forceY = (dy / distance) * forceStrength;
                
                particle.vx += forceX;
                particle.vy += forceY;
            }
        });
    }
}; 