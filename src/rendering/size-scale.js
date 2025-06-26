/**
 * Size Scale Utility Module
 * Centralizes all particle size-based calculations and scaling functions
 */
window.VisualizerSizeScale = class SizeScale {
    
    /**
     * Calculate mass based on particle size (volume in 2D)
     */
    static getMass(particle) {
        return particle.size * particle.size;
    }
    
    /**
     * Calculate mass ratio for two particles (how much each should be affected)
     */
    static getMassRatios(particle1, particle2) {
        const mass1 = this.getMass(particle1);
        const mass2 = this.getMass(particle2);
        const totalMass = mass1 + mass2;
        
        return {
            mass1,
            mass2,
            totalMass,
            ratio1: mass2 / totalMass, // particle1 affected by particle2's mass
            ratio2: mass1 / totalMass  // particle2 affected by particle1's mass
        };
    }
    
    /**
     * Calculate size ratio between two particles
     */
    static getSizeRatio(particle1, particle2) {
        const larger = Math.max(particle1.size, particle2.size);
        const smaller = Math.min(particle1.size, particle2.size);
        return larger / smaller;
    }
    
    /**
     * Calculate influence factor based on size difference
     * Returns 0-1 value where 1 = maximum influence, 0 = no influence
     */
    static getInfluenceFactor(sourceParticle, targetParticle, maxInfluenceRatio = 10) {
        const sizeRatio = sourceParticle.size / targetParticle.size;
        return Math.min(sizeRatio / maxInfluenceRatio, 1);
    }
    
    /**
     * Calculate magnetic strength based on particle size
     * Enhanced for orbital dynamics - larger particles create stronger fields
     */
    static getMagneticStrength(particle, baseStrength = 1) {
        return baseStrength * this.getMass(particle) * 0.07; // Increased from 0.05 for stronger orbital dynamics
    }
    
    /**
     * Calculate distance-based force falloff (inverse square law)
     */
    static getDistanceFalloff(distance, maxDistance) {
        if (distance >= maxDistance) return 0;
        const normalizedDistance = distance / maxDistance;
        return (1 - normalizedDistance) * (1 - normalizedDistance); // Quadratic falloff
    }
    
    /**
     * Get the larger and smaller particle from a pair
     */
    static getLargerSmaller(particle1, particle2) {
        if (particle1.size >= particle2.size) {
            return { larger: particle1, smaller: particle2 };
        } else {
            return { larger: particle2, smaller: particle1 };
        }
    }
    
    /**
     * Calculate energy transfer factor for collisions
     */
    static getEnergyTransferFactor(particle1, particle2) {
        const massRatios = this.getMassRatios(particle1, particle2);
        return Math.abs(massRatios.mass1 - massRatios.mass2) / massRatios.totalMass;
    }
    
    /**
     * Scale a value based on particle size relative to a reference size
     */
    static scaleBySize(value, particle, referenceSize = 3) {
        const sizeRatio = particle.size / referenceSize;
        return value * sizeRatio;
    }
    
    /**
     * Calculate attractive/repulsive force between two particles for magnetism
     * Same-size particles repel, different-size particles attract
     * Enhanced for dramatic size variety (0.15x to 2.0x range)
     * NEW: Support for dynamic similarity threshold during audio bursts
     */
    static calculateMagneticForce(particle1, particle2, distance, maxDistance, baseStrength = 0.01, similarityThreshold = 0.15) {
        if (distance >= maxDistance) return { fx: 0, fy: 0 };
        
        const strength1 = this.getMagneticStrength(particle1, baseStrength);
        const strength2 = this.getMagneticStrength(particle2, baseStrength);
        const combinedStrength = Math.sqrt(strength1 * strength2);
        
        const falloff = this.getDistanceFalloff(distance, maxDistance);
        
        // Calculate size difference to determine attraction vs repulsion
        const sizeDifference = Math.abs(particle1.size - particle2.size);
        const averageSize = (particle1.size + particle2.size) / 2;
        const sizeRatio = sizeDifference / averageSize;
        
        // Orbital dynamics: strong attraction for different sizes, moderate repulsion for similar sizes
        // NEW: Use dynamic similarity threshold (can be increased during audio bursts)
        let forceMultiplier;
        if (sizeRatio < similarityThreshold) {
            // Very similar sizes - moderate repel for polarization effect
            forceMultiplier = -1.1; // Increased from -0.8 for better separation
        } else if (sizeRatio < (similarityThreshold + 0.25)) {
            // Moderate size difference - transition from repel to attract
            const transitionFactor = (sizeRatio - similarityThreshold) / 0.25; // 0 to 1 over range
            forceMultiplier = -1.2 + (transitionFactor * 2.4); // -1.2 to +1.2
        } else if (sizeRatio < (similarityThreshold + 0.65)) {
            // Medium size differences - strong attraction for orbital dynamics
            forceMultiplier = 1.2; // Increased from 0.6 for orbit formation
        } else {
            // Very different sizes - strongest attraction (small orbiting large)
            forceMultiplier = 2.2; // Increased from 0.9 for clear orbital hierarchy
        }
        
        // Distance-based modulation: slight increase at close distances
        const distanceModulation = distance < (particle1.size + particle2.size) * 1.5 ? 1.1 : 1.0; // Reduced from 1.2
        const finalForceMultiplier = forceMultiplier * distanceModulation;
        
        const force = combinedStrength * falloff * finalForceMultiplier;
        
        // Limit maximum force per interaction to prevent extreme effects
        const maxForce = 1.2; // Increased from 0.5 for orbital dynamics
        const limitedForce = Math.max(-maxForce, Math.min(maxForce, force));
        
        // Direction from particle1 to particle2
        const dx = particle2.x - particle1.x;
        const dy = particle2.y - particle1.y;
        const normalizedDx = dx / distance;
        const normalizedDy = dy / distance;
        
        return {
            fx: normalizedDx * limitedForce,
            fy: normalizedDy * limitedForce
        };
    }
}; 