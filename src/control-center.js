/**
 * Control Center Module
 * Handles UI controls, HTML generation, and user interaction
 */
window.VisualizerControlCenter = class ControlCenter {
    constructor(visualizer) {
        this.visualizer = visualizer;
        this.container = null;
        this.isVisible = true;
        
        this.init();
    }
    
    init() {
        if (!this.visualizer.config.showControls) return;
        
        this.createControls();
        this.bindEvents();
    }
    
    createControls() {
        this.container = document.createElement('div');
        this.container.className = 'visualizer-controls';
        this.container.innerHTML = this.getControlsHTML();
        
        this.visualizer.container.appendChild(this.container);
    }
    
    getControlsHTML() {
        const config = this.visualizer.config;
        
        return `
            <h3 class="visualizer-controls__title">Particle System Controls</h3>
            <div class="visualizer-controls__grid">
                <div class="visualizer-control-group">
                    <label class="visualizer-control-group__label">Particle Shape</label>
                    <select class="visualizer-control-select" data-control="particleShape">
                        <option value="circle" ${config.particleShape === 'circle' ? 'selected' : ''}>Circles</option>
                        <option value="square" ${config.particleShape === 'square' ? 'selected' : ''}>Squares</option>
                        <option value="triangle" ${config.particleShape === 'triangle' ? 'selected' : ''}>Triangles</option>
                        <option value="star" ${config.particleShape === 'star' ? 'selected' : ''}>Stars</option>
                    </select>
                </div>
                
                <div class="visualizer-control-group">
                    <label class="visualizer-control-group__label">Mouse Interaction</label>
                    <select class="visualizer-control-select" data-control="mouseInteraction">
                        <option value="none" ${config.mouseInteraction === 'none' ? 'selected' : ''}>None</option>
                        <option value="attract" ${config.mouseInteraction === 'attract' ? 'selected' : ''}>Attract</option>
                        <option value="repel" ${config.mouseInteraction === 'repel' ? 'selected' : ''}>Repel</option>
                        <option value="orbit" ${config.mouseInteraction === 'orbit' ? 'selected' : ''}>Orbit</option>
                    </select>
                </div>
                
                <div class="visualizer-control-group">
                    <label class="visualizer-control-group__label">Particle Color</label>
                    <div class="visualizer-color-control">
                        <input type="color" class="visualizer-color-input" value="${config.primaryColor}" data-control="primaryColor">
                    </div>
                </div>
                
                <div class="visualizer-control-group">
                    <label class="visualizer-control-group__label">Connection Color</label>
                    <div class="visualizer-color-control">
                        <input type="color" class="visualizer-color-input" value="${config.secondaryColor}" data-control="secondaryColor">
                    </div>
                </div>
                
                <div class="visualizer-control-group">
                    <label class="visualizer-control-group__label">Background Color</label>
                    <div class="visualizer-color-control">
                        <input type="color" class="visualizer-color-input" value="${config.backgroundColor}" data-control="backgroundColor">
                    </div>
                </div>
                
                <div class="visualizer-control-group">
                    <label class="visualizer-control-group__label">Particle Count</label>
                    <div class="visualizer-range-control">
                        <input type="range" class="visualizer-range-input" min="10" max="500" step="10" value="${config.particleCount}" data-control="particleCount">
                        <div class="visualizer-range-value">${config.particleCount}</div>
                    </div>
                </div>
                
                <div class="visualizer-control-group">
                    <label class="visualizer-control-group__label">Particle Size</label>
                    <div class="visualizer-range-control">
                        <input type="range" class="visualizer-range-input" min="1" max="10" step="0.5" value="${config.particleSize}" data-control="particleSize">
                        <div class="visualizer-range-value">${config.particleSize}</div>
                    </div>
                </div>
                
                <div class="visualizer-control-group">
                    <label class="visualizer-control-group__label">Animation Speed</label>
                    <div class="visualizer-range-control">
                        <input type="range" class="visualizer-range-input" min="0.1" max="3" step="0.1" value="${config.animationSpeed}" data-control="animationSpeed">
                        <div class="visualizer-range-value">${config.animationSpeed}</div>
                    </div>
                </div>
                
                <div class="visualizer-control-group">
                    <label class="visualizer-control-group__label">Connection Distance</label>
                    <div class="visualizer-range-control">
                        <input type="range" class="visualizer-range-input" min="50" max="200" step="10" value="${config.connectionDistance}" data-control="connectionDistance">
                        <div class="visualizer-range-value">${config.connectionDistance}</div>
                    </div>
                </div>
            </div>
            
            <div class="visualizer-fullscreen-controls">
                <button class="visualizer-fullscreen-btn" data-action="fullscreen">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/>
                    </svg>
                    Go Fullscreen
                </button>
            </div>
        `;
    }
    
    bindEvents() {
        if (!this.container) return;
        
        const controls = this.container.querySelectorAll('[data-control]');
        
        controls.forEach(control => {
            const property = control.dataset.control;
            
            control.addEventListener('change', (e) => {
                this.handleControlChange(property, e.target.value, e.target);
            });
        });
        
        // Fullscreen button
        const fullscreenBtn = this.container.querySelector('[data-action="fullscreen"]');
        if (fullscreenBtn) {
            fullscreenBtn.addEventListener('click', () => {
                this.visualizer.fullscreenManager.enterFullscreen();
            });
        }
    }
    
    handleControlChange(property, value, element) {
        // Convert numeric values
        if (['animationSpeed', 'particleCount', 'particleSize', 'connectionDistance'].includes(property)) {
            value = parseFloat(value);
        }
        
        // Update config
        this.visualizer.config[property] = value;
        
        // Notify visualizer of change
        this.visualizer.onConfigChange(property, value);
        
        // Update range value display
        const valueDisplay = element.parentNode.querySelector('.visualizer-range-value');
        if (valueDisplay) {
            valueDisplay.textContent = value;
        }
    }
    
    updateControlValue(property, value) {
        if (!this.container) return;
        
        const control = this.container.querySelector(`[data-control="${property}"]`);
        const valueDisplay = this.container.querySelector(`[data-control="${property}"]`)?.parentNode?.querySelector('.visualizer-range-value');
        
        if (control) {
            control.value = value;
        }
        if (valueDisplay) {
            valueDisplay.textContent = value;
        }
    }
    
    show() {
        if (this.container) {
            this.container.classList.remove('visualizer-controls-hidden');
            this.isVisible = true;
        }
    }
    
    hide() {
        if (this.container) {
            this.container.classList.add('visualizer-controls-hidden');
            this.isVisible = false;
        }
    }
    
    destroy() {
        if (this.container) {
            this.container.remove();
            this.container = null;
        }
    }
}; 