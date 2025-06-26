/**
 * Mouse Interaction Module
 * Handles all mouse-based particle interactions and behaviors
 */
window.VisualizerMouseInteraction = class MouseInteraction {
    constructor(visualizer) {
        this.visualizer = visualizer;
        this.mouse = { x: 0, y: 0, isActive: false };
        this.ripples = []; // Store active ripples
        
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        // Mouse tracking
        this.visualizer.canvas.addEventListener('mousemove', (e) => {
            const rect = this.visualizer.canvas.getBoundingClientRect();
            const scaleX = this.visualizer.canvasWidth / rect.width;
            const scaleY = this.visualizer.canvasHeight / rect.height;
            
            this.mouse.x = (e.clientX - rect.left) * scaleX;
            this.mouse.y = (e.clientY - rect.top) * scaleY;
            this.mouse.isActive = true;
        });
        
        this.visualizer.canvas.addEventListener('mouseleave', () => {
            this.mouse.isActive = false;
        });
        
        // Click to create ripple effect
        this.visualizer.canvas.addEventListener('click', (e) => {
            // Create ripple effect
            this.createRipple(this.mouse.x, this.mouse.y);
        });
    }
    
    /**
     * Apply mouse interaction to a particle based on the current interaction mode
     */
    applyMouseInteraction(particle) {
        // Early return optimizations
        if (!this.mouse.isActive || this.visualizer.config.mouseInteraction === 'none') {
            return;
        }
        
        const influenceRadius = 150;
        const dx = particle.x - this.mouse.x;
        const dy = particle.y - this.mouse.y;
        
        // Ultra-fast bounding box pre-check with larger safety margin
        const fastCheckRadius = influenceRadius + 50; // Larger margin for faster elimination
        if (Math.abs(dx) > fastCheckRadius || Math.abs(dy) > fastCheckRadius) {
            return; // Skip - definitely outside influence area
        }
        
        // More precise bounding box check
        if (Math.abs(dx) > influenceRadius || Math.abs(dy) > influenceRadius) {
            return; // Skip - outside influence area
        }
        
        const distanceSquared = dx * dx + dy * dy;
        const influenceRadiusSquared = influenceRadius * influenceRadius;
        
        if (distanceSquared < influenceRadiusSquared) {
            // Calculate actual distance only when within influence radius
            const distance = Math.sqrt(distanceSquared);
            
            if (distance > 0) {
                const force = (influenceRadius - distance) / influenceRadius;
                const forceX = (dx / distance) * force * 0.15;
                const forceY = (dy / distance) * force * 0.15;
                
                switch (this.visualizer.config.mouseInteraction) {
                    case 'attract':
                        particle.vx -= forceX;
                        particle.vy -= forceY;
                        break;
                    case 'repel':
                        particle.vx += forceX;
                        particle.vy += forceY;
                        break;
                    case 'push':
                        // Fixed orbital mode: Creates stable circular orbits around cursor
                        const minOrbitRadius = 50; // Minimum safe distance for stable orbits
                        const maxOrbitRadius = 140; // Maximum influence radius for orbits
                        
                        if (distance > minOrbitRadius && distance < maxOrbitRadius) {
                            // First, dampen existing velocity to create stable orbits
                            const dampening = 0.95; // Gentle velocity dampening
                            particle.vx *= dampening;
                            particle.vy *= dampening;
                            
                            // Normalize the radius vector
                            const unitDx = dx / distance;
                            const unitDy = dy / distance;
                            
                            // Calculate ideal orbital velocity for stable circular motion
                            const orbitalSpeed = 0.12; // Increased from 0.08 for faster orbits
                            
                            // Tangential velocity (perpendicular to radius, counterclockwise)
                            const tangentialVx = -unitDy * orbitalSpeed;
                            const tangentialVy = unitDx * orbitalSpeed;
                            
                            // Gentle centripetal acceleration toward cursor
                            const centripetalAccel = 0.015;
                            const centripetalVx = -unitDx * centripetalAccel;
                            const centripetalVy = -unitDy * centripetalAccel;
                            
                            // Gravitational pull - allows moving the orbital system around
                            const gravitationalPull = 0.035; // HAND OF GOD - massively increased from 0.008
                            const gravityVx = -unitDx * gravitationalPull;
                            const gravityVy = -unitDy * gravitationalPull;
                            
                            // Distance-based strength for natural orbital decay
                            const orbitalStrength = (maxOrbitRadius - distance) / (maxOrbitRadius - minOrbitRadius);
                            
                            // Apply combined orbital forces (tangential + centripetal + gravitational)
                            particle.vx += (tangentialVx + centripetalVx + gravityVx) * orbitalStrength;
                            particle.vy += (tangentialVy + centripetalVy + gravityVy) * orbitalStrength;
                            
                        } else if (distance <= minOrbitRadius && distance > 0) {
                            // Too close - gentle push away to establish orbital distance
                            const pushStrength = 0.1;
                            particle.vx += (dx / distance) * pushStrength;
                            particle.vy += (dy / distance) * pushStrength;
                        }
                        // Beyond maxOrbitRadius: no orbital effect (particles are free)
                        break;
                }
            }
        }
    }
    
    /**
     * Check if mouse is currently active in the canvas area
     */
    isMouseActive() {
        return this.mouse.isActive;
    }
    
    /**
     * Get current mouse position
     */
    getMousePosition() {
        return { x: this.mouse.x, y: this.mouse.y };
    }
    
    /**
     * Cleanup event listeners
     */
    destroy() {
        // Event listeners are automatically cleaned up when canvas is removed
        // But we can reset the mouse state
        this.mouse.isActive = false;
    }
    
    /**
     * Create ripple effect - Poseidon's hammer: powerful center, natural falloff
     */
    createRipple(clickX, clickY) {
        // IMMEDIATE BLAST: Launch central particles faster than wave expansion
        const immediateBlastRadius = 40; // Particles within this radius get instant launch
        const waveSpeed = 5; // Wave expands at this speed
        const escapeVelocity = 8; // Particles need this speed to stay ahead of wave
        
        this.visualizer.particles.forEach(particle => {
            const dx = particle.x - clickX;
            const dy = particle.y - clickY;
            const distanceSquared = dx * dx + dy * dy;
            const blastRadiusSquared = immediateBlastRadius * immediateBlastRadius;
            
            if (distanceSquared <= blastRadiusSquared && distanceSquared > 0) {
                const distance = Math.sqrt(distanceSquared);
                const normalizedDx = dx / distance;
                const normalizedDy = dy / distance;
                
                // Closer particles get MORE velocity (inverse distance scaling)
                const proximityFactor = (immediateBlastRadius - distance) / immediateBlastRadius;
                const launchVelocity = escapeVelocity * (1 + proximityFactor * 2); // Up to 3x escape velocity for center hits
                
                // Enhanced force for magnetic systems that need extra oomph
                const magnetismBonus = this.visualizer.config.particleMagnetism ? 1.5 : 1.0;
                const finalVelocity = launchVelocity * magnetismBonus;
                
                // LAUNCH particles faster than wave expansion
                particle.vx += normalizedDx * finalVelocity;
                particle.vy += normalizedDy * finalVelocity;
            }
        });
        
        // Create the expanding wave (this hits particles that weren't in immediate blast)
        const ripple = {
            x: clickX,
            y: clickY,
            radius: immediateBlastRadius, // Start wave AFTER immediate blast zone
            maxRadius: 180, // Generous coverage area
            speed: waveSpeed, // Wave expansion speed
            opacity: 1,
            life: 1,
            force: 4.0, // Strong base force for wave
            decay: 0.02
        };
        
        this.ripples.push(ripple);
    }
    
    /**
     * Update all active ripples
     */
    updateRipples() {
        this.ripples = this.ripples.filter(ripple => {
            // Expand ripple
            ripple.radius += ripple.speed;
            
            // Fade ripple as it expands
            ripple.life = 1 - (ripple.radius / ripple.maxRadius);
            ripple.opacity = ripple.life;
            
            // Apply ripple force to particles using distance squared optimization
            this.applyRippleForce(ripple);
            
            // Remove ripple when it reaches max size
            return ripple.radius < ripple.maxRadius;
        });
    }
    
    /**
     * Apply Poseidon's hammer wave force - strongest at center, natural falloff outward
     */
    applyRippleForce(ripple) {
        const waveThickness = 30; // Thick, impactful wave
        const baseForceStrength = ripple.force;
        
        // Enhanced force for magnetic systems
        const magnetismMultiplier = this.visualizer.config.particleMagnetism ? 2.0 : 1.0;
        const maxForce = baseForceStrength * magnetismMultiplier;
        
        const maxRippleDistance = ripple.radius + waveThickness;
        
        this.visualizer.particles.forEach(particle => {
            const dx = particle.x - ripple.x;
            const dy = particle.y - ripple.y;
            
            // Bounding box pre-check: Skip obviously distant particles
            if (Math.abs(dx) > maxRippleDistance || Math.abs(dy) > maxRippleDistance) {
                return; // Skip - outside ripple influence area
            }
            
            const distanceSquared = dx * dx + dy * dy;
            
            // Check if particle is within the wave thickness using distance squared
            const waveFrontSquared = ripple.radius * ripple.radius;
            const waveBackSquared = (ripple.radius - waveThickness) * (ripple.radius - waveThickness);
            
            if (distanceSquared >= waveBackSquared && distanceSquared <= waveFrontSquared && distanceSquared > 0) {
                // Calculate actual distance only when within wave thickness
                const distance = Math.sqrt(distanceSquared);
                
                if (distance > 0) {
                    // Poseidon's hammer effect: force decreases naturally with distance from center
                    const distanceFromCenter = Math.sqrt((particle.x - ripple.x) ** 2 + (particle.y - ripple.y) ** 2);
                    
                    // Natural inverse-square-like falloff: strongest at center, weaker further out
                    const centerDistance = Math.max(distanceFromCenter, 20); // Prevent division by near-zero
                    const falloffFactor = Math.min(1, (100 * 100) / (centerDistance * centerDistance)); // Inverse square falloff
                    
                    // Direction from center outward
                    const normalizedDx = dx / distance;
                    const normalizedDy = dy / distance;
                    
                    // Final force: combines wave life, distance falloff, and magnetism scaling
                    const finalForce = maxForce * ripple.life * falloffFactor;
                    
                    particle.vx += normalizedDx * finalForce;
                    particle.vy += normalizedDy * finalForce;
                }
            }
        });
    }
    
    /**
     * Render all ripples - Clean, elegant visual
     */
    renderRipples(ctx) {
        this.ripples.forEach(ripple => {
            ctx.save();
            ctx.globalAlpha = ripple.opacity * 0.8;
            ctx.strokeStyle = this.visualizer.config.secondaryColor;
            ctx.lineWidth = 2;
            
            ctx.beginPath();
            ctx.arc(ripple.x, ripple.y, ripple.radius, 0, Math.PI * 2);
            ctx.stroke();
            
            // Add inner ripple for more visual depth
            if (ripple.radius > 20) {
                ctx.globalAlpha = ripple.opacity * 0.4;
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.arc(ripple.x, ripple.y, ripple.radius - 12, 0, Math.PI * 2);
                ctx.stroke();
            }
            
            ctx.restore();
        });
    }
}; 