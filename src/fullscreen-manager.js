/**
 * Fullscreen Manager Module
 * Handles native fullscreen functionality for the visualizer
 */
window.VisualizerFullscreenManager = class FullscreenManager {
    constructor(visualizer) {
        this.visualizer = visualizer;
        this.isFullscreen = false;
        this.fullscreenExitButton = null;
        this.mouseHideTimeout = null;
        this.originalCanvasSize = { width: 0, height: 0 };
        this.originalConnectionDistance = 0;
        
        this.bindEvents();
    }
    
    bindEvents() {
        // Listen for fullscreen change events
        document.addEventListener('fullscreenchange', () => this.handleFullscreenChange());
        document.addEventListener('webkitfullscreenchange', () => this.handleFullscreenChange());
        document.addEventListener('mozfullscreenchange', () => this.handleFullscreenChange());
        document.addEventListener('MSFullscreenChange', () => this.handleFullscreenChange());
        
        // ESC key handling
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isFullscreen) {
                this.exitFullscreen();
            }
        });
    }
    
    async enterFullscreen() {
        try {
            // Store original canvas dimensions and connection distance
            this.originalCanvasSize = {
                width: this.visualizer.canvasWidth,
                height: this.visualizer.canvasHeight
            };
            this.originalConnectionDistance = this.visualizer.config.connectionDistance;
            
            // Request native fullscreen
            const element = this.visualizer.container;
            if (element.requestFullscreen) {
                await element.requestFullscreen();
            } else if (element.webkitRequestFullscreen) {
                await element.webkitRequestFullscreen();
            } else if (element.mozRequestFullScreen) {
                await element.mozRequestFullScreen();
            } else if (element.msRequestFullscreen) {
                await element.msRequestFullscreen();
            }
        } catch (error) {
            console.warn('Fullscreen request failed:', error);
        }
    }
    
    exitFullscreen() {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
            document.webkitExitFullscreen();
        } else if (document.mozCancelFullScreen) {
            document.mozCancelFullScreen();
        } else if (document.msExitFullscreen) {
            document.msExitFullscreen();
        }
    }
    
    handleFullscreenChange() {
        const isCurrentlyFullscreen = !!(
            document.fullscreenElement ||
            document.webkitFullscreenElement ||
            document.mozFullScreenElement ||
            document.msFullscreenElement
        );
        
        if (isCurrentlyFullscreen && !this.isFullscreen) {
            this.onEnterFullscreen();
        } else if (!isCurrentlyFullscreen && this.isFullscreen) {
            this.onExitFullscreen();
        }
    }
    
    onEnterFullscreen() {
        this.isFullscreen = true;
        
        // Add fullscreen classes
        this.visualizer.container.classList.add('visualizer-fullscreen');
        document.body.classList.add('visualizer-fullscreen-active');
        
        // Hide controls and exit button by default
        this.visualizer.controlCenter.hide();
        
        // Create exit button (hidden by default)
        this.createFullscreenExitButton();
        
        // Update canvas for fullscreen
        this.updateFullscreenDimensions();
        
        // Set up mouse movement detection
        this.setupMouseDetection();
    }
    
    onExitFullscreen() {
        this.isFullscreen = false;
        
        // Remove fullscreen classes
        this.visualizer.container.classList.remove('visualizer-fullscreen');
        document.body.classList.remove('visualizer-fullscreen-active');
        
        // Show controls
        this.visualizer.controlCenter.show();
        
        // Remove exit button
        if (this.fullscreenExitButton) {
            this.fullscreenExitButton.remove();
            this.fullscreenExitButton = null;
        }
        
        // Clear mouse detection
        this.cleanupMouseDetection();
        
        // Restore original dimensions
        this.restoreOriginalDimensions();
    }
    
    createFullscreenExitButton() {
        this.fullscreenExitButton = document.createElement('button');
        this.fullscreenExitButton.className = 'visualizer-fullscreen-exit visualizer-fullscreen-exit-hidden';
        this.fullscreenExitButton.innerHTML = `
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
            </svg>
        `;
        this.fullscreenExitButton.addEventListener('click', () => this.exitFullscreen());
        this.visualizer.container.appendChild(this.fullscreenExitButton);
    }
    
    setupMouseDetection() {
        this.mouseDetection = (e) => this.handleMouseMove(e);
        document.addEventListener('mousemove', this.mouseDetection);
        this.startMouseHideTimer();
    }
    
    cleanupMouseDetection() {
        if (this.mouseDetection) {
            document.removeEventListener('mousemove', this.mouseDetection);
            this.mouseDetection = null;
        }
        
        if (this.mouseHideTimeout) {
            clearTimeout(this.mouseHideTimeout);
            this.mouseHideTimeout = null;
        }
    }
    
    handleMouseMove() {
        if (!this.isFullscreen) return;
        
        // Show controls and exit button
        this.visualizer.controlCenter.show();
        if (this.fullscreenExitButton) {
            this.fullscreenExitButton.classList.remove('visualizer-fullscreen-exit-hidden');
        }
        
        // Reset hide timer
        this.startMouseHideTimer();
    }
    
    startMouseHideTimer() {
        if (this.mouseHideTimeout) {
            clearTimeout(this.mouseHideTimeout);
        }
        
        this.mouseHideTimeout = setTimeout(() => {
            if (this.isFullscreen) {
                this.visualizer.controlCenter.hide();
                if (this.fullscreenExitButton) {
                    this.fullscreenExitButton.classList.add('visualizer-fullscreen-exit-hidden');
                }
            }
        }, 3000);
    }
    
    updateFullscreenDimensions() {
        const newWidth = window.innerWidth;
        const newHeight = window.innerHeight;
        
        // Calculate scaling factor based on canvas area increase
        const originalArea = this.originalCanvasSize.width * this.originalCanvasSize.height;
        const newArea = newWidth * newHeight;
        const scaleFactor = Math.sqrt(newArea / originalArea);
        
        // Update canvas dimensions
        this.visualizer.canvasWidth = newWidth;
        this.visualizer.canvasHeight = newHeight;
        this.visualizer.canvas.width = newWidth;
        this.visualizer.canvas.height = newHeight;
        
        // Scale connection distance proportionally to maintain visual density
        this.visualizer.config.connectionDistance = Math.round(this.originalConnectionDistance * scaleFactor);
        
        // Reinitialize particles with new dimensions
        this.visualizer.initializeParticles();
        
        // Update the connection distance control display
        this.updateConnectionDistanceDisplay();
    }
    
    updateConnectionDistanceDisplay() {
        this.visualizer.controlCenter.updateControlValue('connectionDistance', this.visualizer.config.connectionDistance);
    }
    
    restoreOriginalDimensions() {
        // Restore original connection distance
        this.visualizer.config.connectionDistance = this.originalConnectionDistance;
        
        // Restore canvas dimensions
        this.visualizer.canvasWidth = this.originalCanvasSize.width;
        this.visualizer.canvasHeight = this.originalCanvasSize.height;
        this.visualizer.handleResize();
        
        // Update the connection distance control display
        this.updateConnectionDistanceDisplay();
    }
    
    destroy() {
        this.cleanupMouseDetection();
        
        if (this.isFullscreen) {
            this.exitFullscreen();
        }
    }
}; 