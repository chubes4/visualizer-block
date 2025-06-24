/**
 * Interactive Particle System
 * Advanced particle effects with mouse interaction, shapes, and trails
 */

class ParticleSystem {
    constructor(container, config) {
        this.container = container;
        this.config = {
            aspectRatio: 0.75, // Height as ratio of width (3:4 by default)
            backgroundColor: '#000000',
            primaryColor: '#00ff00',
            secondaryColor: '#ff0000',
            animationSpeed: 1,
            particleCount: 100,
            particleSize: 3,
            particleShape: 'circle',
            connectionDistance: 100,
            mouseInteraction: 'attract',
            showTrails: false,
            showControls: true,
            ...config
        };
        
        this.canvas = null;
        this.ctx = null;
        this.animationId = null;
        this.particles = [];
        this.time = 0;
        this.mouse = { x: 0, y: 0, isActive: false };
        this.trails = [];
        
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
        this.setupControls();
        this.initializeParticles();
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
        // Mouse tracking
        this.canvas.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const scaleX = this.canvasWidth / rect.width;
            const scaleY = this.canvasHeight / rect.height;
            
            this.mouse.x = (e.clientX - rect.left) * scaleX;
            this.mouse.y = (e.clientY - rect.top) * scaleY;
            this.mouse.isActive = true;
        });
        
        this.canvas.addEventListener('mouseleave', () => {
            this.mouse.isActive = false;
        });
        
        // Click to spawn particles
        this.canvas.addEventListener('click', (e) => {
            this.spawnParticleBurst(this.mouse.x, this.mouse.y);
        });
        
        // Window resize
        window.addEventListener('resize', () => this.handleResize());
    }
    
    setupControls() {
        if (!this.config.showControls) return;
        
        const controlsContainer = document.createElement('div');
        controlsContainer.className = 'visualizer-controls';
        controlsContainer.innerHTML = this.getControlsHTML();
        
        this.container.appendChild(controlsContainer);
        this.bindControlEvents(controlsContainer);
    }
    
    getControlsHTML() {
        return `
            <h3 class="visualizer-controls__title">Particle System Controls</h3>
            <div class="visualizer-controls__grid">
                <div class="visualizer-control-group">
                    <label class="visualizer-control-group__label">Particle Shape</label>
                    <select class="visualizer-control-select" data-control="particleShape">
                        <option value="circle" ${this.config.particleShape === 'circle' ? 'selected' : ''}>Circles</option>
                        <option value="square" ${this.config.particleShape === 'square' ? 'selected' : ''}>Squares</option>
                        <option value="triangle" ${this.config.particleShape === 'triangle' ? 'selected' : ''}>Triangles</option>
                        <option value="star" ${this.config.particleShape === 'star' ? 'selected' : ''}>Stars</option>
                    </select>
                </div>
                
                <div class="visualizer-control-group">
                    <label class="visualizer-control-group__label">Mouse Interaction</label>
                    <select class="visualizer-control-select" data-control="mouseInteraction">
                        <option value="none" ${this.config.mouseInteraction === 'none' ? 'selected' : ''}>None</option>
                        <option value="attract" ${this.config.mouseInteraction === 'attract' ? 'selected' : ''}>Attract</option>
                        <option value="repel" ${this.config.mouseInteraction === 'repel' ? 'selected' : ''}>Repel</option>
                        <option value="orbit" ${this.config.mouseInteraction === 'orbit' ? 'selected' : ''}>Orbit</option>
                    </select>
                </div>
                
                <div class="visualizer-control-group">
                    <label class="visualizer-control-group__label">Particle Color</label>
                    <div class="visualizer-color-control">
                        <input type="color" class="visualizer-color-input" value="${this.config.primaryColor}" data-control="primaryColor">
                    </div>
                </div>
                
                <div class="visualizer-control-group">
                    <label class="visualizer-control-group__label">Connection Color</label>
                    <div class="visualizer-color-control">
                        <input type="color" class="visualizer-color-input" value="${this.config.secondaryColor}" data-control="secondaryColor">
                    </div>
                </div>
                
                <div class="visualizer-control-group">
                    <label class="visualizer-control-group__label">Background Color</label>
                    <div class="visualizer-color-control">
                        <input type="color" class="visualizer-color-input" value="${this.config.backgroundColor}" data-control="backgroundColor">
                    </div>
                </div>
                
                <div class="visualizer-control-group">
                    <label class="visualizer-control-group__label">Particle Count</label>
                    <div class="visualizer-range-control">
                        <input type="range" class="visualizer-range-input" min="10" max="500" step="10" value="${this.config.particleCount}" data-control="particleCount">
                        <div class="visualizer-range-value">${this.config.particleCount}</div>
                    </div>
                </div>
                
                <div class="visualizer-control-group">
                    <label class="visualizer-control-group__label">Particle Size</label>
                    <div class="visualizer-range-control">
                        <input type="range" class="visualizer-range-input" min="1" max="10" step="0.5" value="${this.config.particleSize}" data-control="particleSize">
                        <div class="visualizer-range-value">${this.config.particleSize}</div>
                    </div>
                </div>
                
                <div class="visualizer-control-group">
                    <label class="visualizer-control-group__label">Animation Speed</label>
                    <div class="visualizer-range-control">
                        <input type="range" class="visualizer-range-input" min="0.1" max="3" step="0.1" value="${this.config.animationSpeed}" data-control="animationSpeed">
                        <div class="visualizer-range-value">${this.config.animationSpeed}</div>
                    </div>
                </div>
                
                <div class="visualizer-control-group">
                    <label class="visualizer-control-group__label">Connection Distance</label>
                    <div class="visualizer-range-control">
                        <input type="range" class="visualizer-range-input" min="50" max="200" step="10" value="${this.config.connectionDistance}" data-control="connectionDistance">
                        <div class="visualizer-range-value">${this.config.connectionDistance}</div>
                    </div>
                </div>
                
                <div class="visualizer-control-group">
                    <label class="visualizer-control-group__label">Effects</label>
                    <label class="visualizer-checkbox-control">
                        <input type="checkbox" ${this.config.showTrails ? 'checked' : ''} data-control="showTrails">
                        Show Particle Trails
                    </label>
                </div>
            </div>
        `;
    }
    
    bindControlEvents(container) {
        const controls = container.querySelectorAll('[data-control]');
        
        controls.forEach(control => {
            const property = control.dataset.control;
            
            control.addEventListener('change', (e) => {
                let value = e.target.value;
                
                // Convert numeric values
                if (['animationSpeed', 'particleCount', 'particleSize', 'connectionDistance'].includes(property)) {
                    value = parseFloat(value);
                }
                
                // Convert boolean values
                if (property === 'showTrails') {
                    value = e.target.checked;
                }
                
                this.config[property] = value;
                this.updateParticleSystem();
                
                // Update range value display
                const valueDisplay = control.parentNode.querySelector('.visualizer-range-value');
                if (valueDisplay) {
                    valueDisplay.textContent = value;
                }
            });
        });
    }
    
    initializeParticles() {
        this.particles = [];
        
        for (let i = 0; i < this.config.particleCount; i++) {
            this.particles.push(this.createParticle());
        }
    }
    
    createParticle(x = null, y = null) {
        return {
            x: x !== null ? x : Math.random() * this.canvasWidth,
            y: y !== null ? y : Math.random() * this.canvasHeight,
            vx: (Math.random() - 0.5) * 2,
            vy: (Math.random() - 0.5) * 2,
            originalVx: (Math.random() - 0.5) * 2,
            originalVy: (Math.random() - 0.5) * 2,
            size: this.config.particleSize * (0.5 + Math.random() * 0.5),
            opacity: Math.random() * 0.8 + 0.2,
            angle: Math.random() * Math.PI * 2,
            rotationSpeed: (Math.random() - 0.5) * 0.1,
            life: 1,
            maxLife: 1
        };
    }
    
    spawnParticleBurst(x, y) {
        const burstCount = 20;
        for (let i = 0; i < burstCount; i++) {
            const angle = (Math.PI * 2 * i) / burstCount;
            const speed = 2 + Math.random() * 3;
            const particle = this.createParticle(x, y);
            particle.vx = Math.cos(angle) * speed;
            particle.vy = Math.sin(angle) * speed;
            particle.life = 1;
            particle.maxLife = 0.5 + Math.random() * 0.5;
            this.particles.push(particle);
        }
    }
    
    updateParticleSystem() {
        // Adjust particle count
        while (this.particles.length < this.config.particleCount) {
            this.particles.push(this.createParticle());
        }
        while (this.particles.length > this.config.particleCount) {
            this.particles.pop();
        }
        
        // Update existing particles with new size
        this.particles.forEach(particle => {
            if (particle.life === 1) { // Only update permanent particles
                particle.size = this.config.particleSize * (0.5 + Math.random() * 0.5);
            }
        });
    }
    
    startAnimation() {
        const animate = () => {
            this.time += 0.016 * this.config.animationSpeed;
            this.update();
            this.render();
            this.animationId = requestAnimationFrame(animate);
        };
        animate();
    }
    
    update() {
        this.particles.forEach((particle, index) => {
            // Handle mouse interaction
            if (this.mouse.isActive && this.config.mouseInteraction !== 'none') {
                this.applyMouseInteraction(particle);
            } else {
                // Return to original motion when mouse is not active
                particle.vx += (particle.originalVx - particle.vx) * 0.01;
                particle.vy += (particle.originalVy - particle.vy) * 0.01;
            }
            
            // Update position
            particle.x += particle.vx * this.config.animationSpeed;
            particle.y += particle.vy * this.config.animationSpeed;
            particle.angle += particle.rotationSpeed;
            
            // Handle life cycle for burst particles
            if (particle.life < 1) {
                particle.life -= 0.01;
                if (particle.life <= 0) {
                    this.particles.splice(index, 1);
                    return;
                }
            }
            
            // Wrap around edges
            if (particle.x < 0) particle.x = this.canvasWidth;
            if (particle.x > this.canvasWidth) particle.x = 0;
            if (particle.y < 0) particle.y = this.canvasHeight;
            if (particle.y > this.canvasHeight) particle.y = 0;
            
            // Add to trails
            if (this.config.showTrails) {
                this.trails.push({
                    x: particle.x,
                    y: particle.y,
                    life: 1,
                    size: particle.size * 0.5
                });
            }
        });
        
        // Update trails
        if (this.config.showTrails) {
            this.trails = this.trails.filter(trail => {
                trail.life -= 0.02;
                return trail.life > 0;
            });
        }
    }
    
    applyMouseInteraction(particle) {
        const dx = this.mouse.x - particle.x;
        const dy = this.mouse.y - particle.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const maxDistance = 150;
        
        if (distance < maxDistance) {
            const force = (maxDistance - distance) / maxDistance;
            const angle = Math.atan2(dy, dx);
            
            switch (this.config.mouseInteraction) {
                case 'attract':
                    particle.vx += Math.cos(angle) * force * 0.3;
                    particle.vy += Math.sin(angle) * force * 0.3;
                    break;
                    
                case 'repel':
                    particle.vx -= Math.cos(angle) * force * 0.3;
                    particle.vy -= Math.sin(angle) * force * 0.3;
                    break;
                    
                case 'orbit':
                    const perpAngle = angle + Math.PI / 2;
                    particle.vx += Math.cos(perpAngle) * force * 0.2;
                    particle.vy += Math.sin(perpAngle) * force * 0.2;
                    particle.vx += Math.cos(angle) * force * 0.1;
                    particle.vy += Math.sin(angle) * force * 0.1;
                    break;
            }
        }
    }
    
    render() {
        // Clear canvas with trail effect or solid background
        if (this.config.showTrails) {
            this.ctx.fillStyle = this.config.backgroundColor + '20'; // Semi-transparent
            this.ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);
        } else {
            this.ctx.fillStyle = this.config.backgroundColor;
            this.ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);
        }
        
        // Render trails
        if (this.config.showTrails) {
            this.trails.forEach(trail => {
                this.ctx.save();
                this.ctx.globalAlpha = trail.life * 0.3;
                this.ctx.fillStyle = this.config.primaryColor;
                this.ctx.beginPath();
                this.ctx.arc(trail.x, trail.y, trail.size, 0, Math.PI * 2);
                this.ctx.fill();
                this.ctx.restore();
            });
        }
        
        // Render connections
        this.renderConnections();
        
        // Render particles
        this.particles.forEach(particle => {
            this.renderParticle(particle);
        });
        
        // Render mouse cursor effect
        if (this.mouse.isActive && this.config.mouseInteraction !== 'none') {
            this.renderMouseEffect();
        }
    }
    
    renderConnections() {
        this.particles.forEach((particle, index) => {
            this.particles.slice(index + 1).forEach(otherParticle => {
                const dx = particle.x - otherParticle.x;
                const dy = particle.y - otherParticle.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < this.config.connectionDistance) {
                    const opacity = (this.config.connectionDistance - distance) / this.config.connectionDistance;
                    
                    this.ctx.save();
                    this.ctx.globalAlpha = opacity * 0.3 * Math.min(particle.life, otherParticle.life);
                    this.ctx.strokeStyle = this.config.secondaryColor;
                    this.ctx.lineWidth = 1 + opacity;
                    this.ctx.beginPath();
                    this.ctx.moveTo(particle.x, particle.y);
                    this.ctx.lineTo(otherParticle.x, otherParticle.y);
                    this.ctx.stroke();
                    this.ctx.restore();
                }
            });
        });
    }
    
    renderParticle(particle) {
        this.ctx.save();
        this.ctx.translate(particle.x, particle.y);
        this.ctx.rotate(particle.angle);
        this.ctx.globalAlpha = particle.opacity * particle.life;
        this.ctx.fillStyle = this.config.primaryColor;
        
        switch (this.config.particleShape) {
            case 'circle':
                this.ctx.beginPath();
                this.ctx.arc(0, 0, particle.size, 0, Math.PI * 2);
                this.ctx.fill();
                break;
                
            case 'square':
                this.ctx.fillRect(-particle.size, -particle.size, particle.size * 2, particle.size * 2);
                break;
                
            case 'triangle':
                this.ctx.beginPath();
                this.ctx.moveTo(0, -particle.size);
                this.ctx.lineTo(-particle.size, particle.size);
                this.ctx.lineTo(particle.size, particle.size);
                this.ctx.closePath();
                this.ctx.fill();
                break;
                
            case 'star':
                this.drawStar(0, 0, 5, particle.size, particle.size * 0.5);
                this.ctx.fill();
                break;
        }
        
        this.ctx.restore();
    }
    
    drawStar(cx, cy, spikes, outerRadius, innerRadius) {
        let rot = Math.PI / 2 * 3;
        let x = cx;
        let y = cy;
        const step = Math.PI / spikes;
        
        this.ctx.beginPath();
        this.ctx.moveTo(cx, cy - outerRadius);
        
        for (let i = 0; i < spikes; i++) {
            x = cx + Math.cos(rot) * outerRadius;
            y = cy + Math.sin(rot) * outerRadius;
            this.ctx.lineTo(x, y);
            rot += step;
            
            x = cx + Math.cos(rot) * innerRadius;
            y = cy + Math.sin(rot) * innerRadius;
            this.ctx.lineTo(x, y);
            rot += step;
        }
        
        this.ctx.lineTo(cx, cy - outerRadius);
        this.ctx.closePath();
    }
    
    renderMouseEffect() {
        this.ctx.save();
        this.ctx.globalAlpha = 0.3;
        this.ctx.strokeStyle = this.config.secondaryColor;
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.arc(this.mouse.x, this.mouse.y, 30, 0, Math.PI * 2);
        this.ctx.stroke();
        
        // Pulsing effect
        const pulseRadius = 30 + Math.sin(this.time * 5) * 10;
        this.ctx.globalAlpha = 0.1;
        this.ctx.beginPath();
        this.ctx.arc(this.mouse.x, this.mouse.y, pulseRadius, 0, Math.PI * 2);
        this.ctx.stroke();
        this.ctx.restore();
    }
    
    handleResize() {
        // Recalculate dimensions based on new container size
        this.updateCanvasDimensions();
        
        // Update canvas element dimensions
        this.canvas.width = this.canvasWidth;
        this.canvas.height = this.canvasHeight;
        
        // Canvas always takes full width of container
        this.canvas.style.width = '100%';
        this.canvas.style.height = 'auto';
        
        // Reinitialize particles with new canvas dimensions
        this.initializeParticles();
    }
    
    destroy() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
        window.removeEventListener('resize', this.handleResize);
    }
}

// Initialize particle systems when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    const visualizerBlocks = document.querySelectorAll('.wp-block-visualizer-block-visualizer');
    
    visualizerBlocks.forEach(block => {
        // Extract configuration from block attributes (set by PHP render)
        const config = JSON.parse(block.dataset.config || '{}');
        
        // Initialize the particle system
        new ParticleSystem(block, config);
    });
}); 