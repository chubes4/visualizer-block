/**
 * Fullscreen Manager Module
 * Handles native fullscreen functionality for the visualizer with mobile support
 */
window.VisualizerFullscreenManager = class FullscreenManager {
    constructor(visualizer) {
        this.visualizer = visualizer;
        this.isFullscreen = false;
        this.fullscreenExitButton = null;
        this.mouseHideTimeout = null;
        this.originalCanvasSize = { width: 0, height: 0 };
        this.originalConnectionDistance = 0;
        
        // Mobile detection and fullscreen capability
        this.isMobile = this.detectMobile();
        this.fullscreenCapable = this.detectFullscreenCapability();
        
        this.bindEvents();
    }
    
    /**
     * Detect if device is mobile
     */
    detectMobile() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
               (window.innerWidth <= 768) ||
               ('ontouchstart' in window);
    }
    
    /**
     * Detect if browser supports fullscreen API
     */
    detectFullscreenCapability() {
        const element = document.documentElement;
        return !!(
            element.requestFullscreen ||
            element.webkitRequestFullscreen ||
            element.webkitRequestFullScreen || // iOS specific
            element.mozRequestFullScreen ||
            element.msRequestFullscreen
        );
    }
    
    bindEvents() {
        // Listen for fullscreen change events (multiple browser prefixes)
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
        
        // Mobile-specific: Handle orientation change
        if (this.isMobile) {
            window.addEventListener('orientationchange', () => {
                if (this.isFullscreen) {
                    setTimeout(() => this.updateFullscreenDimensions(), 200);
                }
            });
        }
    }
    
    async enterFullscreen() {
        try {
            // Store original canvas dimensions and connection distance BEFORE any changes
            this.originalCanvasSize = {
                width: this.visualizer.canvasWidth,
                height: this.visualizer.canvasHeight
            };
            this.originalConnectionDistance = this.visualizer.config.connectionDistance;
            
            // Mobile-specific handling
            if (this.isMobile && !this.fullscreenCapable) {
                // Fallback for iOS Safari and other browsers without fullscreen API
                this.enterMobileFullscreen();
                return;
            }
            
            // Request native fullscreen with comprehensive browser support
            const element = this.visualizer.container;
            if (element.requestFullscreen) {
                await element.requestFullscreen();
            } else if (element.webkitRequestFullscreen) {
                // Chrome, Safari (desktop)
                await element.webkitRequestFullscreen();
            } else if (element.webkitRequestFullScreen) {
                // iOS Safari (when supported)
                await element.webkitRequestFullScreen();
            } else if (element.mozRequestFullScreen) {
                // Firefox
                await element.mozRequestFullScreen();
            } else if (element.msRequestFullscreen) {
                // IE/Edge
                await element.msRequestFullscreen();
            } else {
                // Fallback for browsers without fullscreen support
                this.enterMobileFullscreen();
            }
        } catch (error) {
            // If native fullscreen fails, try mobile fallback
            console.log('Native fullscreen failed, using mobile fallback');
            this.enterMobileFullscreen();
        }
    }
    
    /**
     * Mobile fullscreen fallback for browsers without fullscreen API
     */
    enterMobileFullscreen() {
        // Hide browser UI by scrolling and using viewport meta changes
        this.hideMobileBrowserUI();
        
        // Manually trigger fullscreen state
        this.onEnterFullscreen();
    }
    
    /**
     * Hide mobile browser UI elements
     */
    hideMobileBrowserUI() {
        // Scroll to top to hide address bar
        window.scrollTo(0, 1);
        setTimeout(() => window.scrollTo(0, 0), 100);
        
        // Add mobile fullscreen class for CSS-based UI hiding
        document.body.classList.add('visualizer-mobile-fullscreen');
        
        // Lock viewport to prevent zooming
        let viewport = document.querySelector('meta[name=viewport]');
        if (viewport) {
            this.originalViewport = viewport.getAttribute('content');
            viewport.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no');
        } else {
            // Create viewport meta tag if it doesn't exist
            viewport = document.createElement('meta');
            viewport.name = 'viewport';
            viewport.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no';
            document.head.appendChild(viewport);
            this.createdViewport = true;
        }
    }
    
    exitFullscreen() {
        // Handle mobile fallback exit
        if (this.isMobile && !this.fullscreenCapable) {
            this.exitMobileFullscreen();
            return;
        }
        
        // Try native fullscreen exit with comprehensive browser support
        if (document.exitFullscreen) {
            document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
            document.webkitExitFullscreen();
        } else if (document.webkitCancelFullScreen) {
            // iOS Safari (when supported)
            document.webkitCancelFullScreen();
        } else if (document.mozCancelFullScreen) {
            document.mozCancelFullScreen();
        } else if (document.msExitFullscreen) {
            document.msExitFullscreen();
        } else {
            // Fallback for browsers without fullscreen support
            this.exitMobileFullscreen();
        }
    }
    
    /**
     * Exit mobile fullscreen fallback
     */
    exitMobileFullscreen() {
        // Restore mobile browser UI
        this.restoreMobileBrowserUI();
        
        // Manually trigger fullscreen exit
        this.onExitFullscreen();
    }
    
    /**
     * Restore mobile browser UI elements
     */
    restoreMobileBrowserUI() {
        // Remove mobile fullscreen class
        document.body.classList.remove('visualizer-mobile-fullscreen');
        
        // Restore original viewport
        const viewport = document.querySelector('meta[name=viewport]');
        if (viewport) {
            if (this.originalViewport) {
                viewport.setAttribute('content', this.originalViewport);
                this.originalViewport = null;
            } else if (this.createdViewport) {
                viewport.remove();
                this.createdViewport = false;
            }
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
        
        // Hide controls completely
        this.visualizer.controlCenter.hide();
        
        // Create exit button (hidden by default on desktop, visible on mobile)
        this.createFullscreenExitButton();
        
        // Set up resize listener for fullscreen mode
        this.fullscreenResizeHandler = () => {
            if (this.isFullscreen) {
                this.updateFullscreenDimensions();
            }
        };
        window.addEventListener('resize', this.fullscreenResizeHandler);
        
        // Update canvas for fullscreen
        this.updateFullscreenDimensions();
        
        // Set up pull-up tray system
        this.setupPullUpTray();
        
        // Mobile-specific: Show controls immediately for better UX
        if (this.isMobile) {
            // Show exit button immediately on mobile
            setTimeout(() => this.showExitButton(), 100);
            // Show tray handle immediately on mobile
            setTimeout(() => this.showTrayHandle(), 100);
        }
    }
    
    onExitFullscreen() {
        this.isFullscreen = false;
        
        // Remove fullscreen classes
        this.visualizer.container.classList.remove('visualizer-fullscreen');
        document.body.classList.remove('visualizer-fullscreen-active');
        
        // Clean up fullscreen resize listener
        if (this.fullscreenResizeHandler) {
            window.removeEventListener('resize', this.fullscreenResizeHandler);
            this.fullscreenResizeHandler = null;
        }
        
        // Show controls
        this.visualizer.controlCenter.show();
        
        // Remove exit button and tray
        if (this.fullscreenExitButton) {
            this.fullscreenExitButton.remove();
            this.fullscreenExitButton = null;
        }
        
        // Clear pull-up tray system
        this.cleanupPullUpTray();
        
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
        
        // Enhanced mobile support for exit button
        const handleExitFullscreen = (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.exitFullscreen();
        };
        
        // Add both click and touch events
        this.fullscreenExitButton.addEventListener('click', handleExitFullscreen);
        this.fullscreenExitButton.addEventListener('touchstart', handleExitFullscreen);
        
        // Add visual feedback for mobile touches
        if (this.isMobile) {
            this.fullscreenExitButton.addEventListener('touchstart', () => {
                this.fullscreenExitButton.style.backgroundColor = 'rgba(220, 38, 38, 0.8)';
                this.fullscreenExitButton.style.transform = 'scale(1.1)';
            });
            
            this.fullscreenExitButton.addEventListener('touchend', () => {
                setTimeout(() => {
                    this.fullscreenExitButton.style.backgroundColor = '';
                    this.fullscreenExitButton.style.transform = '';
                }, 150);
            });
        }
        
        this.visualizer.container.appendChild(this.fullscreenExitButton);
    }
    
    /**
     * Set up the pull-up tray system for fullscreen controls
     */
    setupPullUpTray() {
        // Create the control tray handle (always visible at bottom)
        this.createControlTrayHandle();
        
        if (this.isMobile) {
            // Mobile: Use touch events for better responsiveness
            this.trayTouchDetection = (e) => this.handleTrayTouch(e);
            this.exitButtonTouchDetection = (e) => this.handleExitButtonTouch(e);
            document.addEventListener('touchstart', this.trayTouchDetection);
            document.addEventListener('touchmove', this.trayTouchDetection);
            document.addEventListener('touchstart', this.exitButtonTouchDetection);
            document.addEventListener('touchmove', this.exitButtonTouchDetection);
        } else {
            // Desktop: Use mouse events
            this.trayMouseDetection = (e) => this.handleTrayMouseMove(e);
            this.exitButtonMouseDetection = (e) => this.handleExitButtonMouseMove(e);
            document.addEventListener('mousemove', this.trayMouseDetection);
            document.addEventListener('mousemove', this.exitButtonMouseDetection);
        }
        
        // Track tray state
        this.trayVisible = false;
        this.controlPanelOpen = false;
        this.exitButtonVisible = false;
    }
    
    /**
     * Clean up pull-up tray system
     */
    cleanupPullUpTray() {
        if (this.trayMouseDetection) {
            document.removeEventListener('mousemove', this.trayMouseDetection);
            this.trayMouseDetection = null;
        }
        
        if (this.exitButtonMouseDetection) {
            document.removeEventListener('mousemove', this.exitButtonMouseDetection);
            this.exitButtonMouseDetection = null;
        }
        
        // Clean up mobile touch events
        if (this.trayTouchDetection) {
            document.removeEventListener('touchstart', this.trayTouchDetection);
            document.removeEventListener('touchmove', this.trayTouchDetection);
            this.trayTouchDetection = null;
        }
        
        if (this.exitButtonTouchDetection) {
            document.removeEventListener('touchstart', this.exitButtonTouchDetection);
            document.removeEventListener('touchmove', this.exitButtonTouchDetection);
            this.exitButtonTouchDetection = null;
        }
        
        if (this.controlTrayHandle) {
            this.controlTrayHandle.remove();
            this.controlTrayHandle = null;
        }
        
        this.trayVisible = false;
        this.controlPanelOpen = false;
        this.exitButtonVisible = false;
    }
    
    /**
     * Handle touch events for mobile tray detection
     */
    handleTrayTouch(e) {
        if (!this.isFullscreen) return;
        
        const touch = e.touches[0] || e.changedTouches[0];
        if (!touch) return;
        
        const windowHeight = window.innerHeight;
        const bottomZone = windowHeight * 0.875; // Bottom 1/8th (87.5% down)
        
        // Show tray handle when touch is in bottom zone
        if (touch.clientY >= bottomZone) {
            this.showTrayHandle();
        } else {
            // Hide tray handle (but not control panel if it's open)
            this.hideTrayHandle();
        }
    }
    
    /**
     * Handle touch events for mobile exit button detection
     */
    handleExitButtonTouch(e) {
        if (!this.isFullscreen) return;
        
        const touch = e.touches[0] || e.changedTouches[0];
        if (!touch) return;
        
        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;
        const topRightZoneX = windowWidth * 0.875; // Right 1/8th (87.5% across)
        const topRightZoneY = windowHeight * 0.125; // Top 1/8th (12.5% down)
        
        // Show exit button when touch is in top-right zone
        if (touch.clientX >= topRightZoneX && touch.clientY <= topRightZoneY) {
            this.showExitButton();
        } else {
            this.hideExitButton();
        }
    }
    
    /**
     * Create the control tray handle that appears at bottom of screen
     */
    createControlTrayHandle() {
        this.controlTrayHandle = document.createElement('div');
        this.controlTrayHandle.className = 'visualizer-control-tray-handle visualizer-control-tray-handle-hidden';
        this.controlTrayHandle.innerHTML = `
            <div class="tray-handle-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6-6 6z"/>
                </svg>
                <span>Controls</span>
            </div>
        `;
        
        // Enhanced mobile support for tray handle
        const handleTrayToggle = (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.toggleControlPanel();
        };
        
        // Add both click and touch events
        this.controlTrayHandle.addEventListener('click', handleTrayToggle);
        this.controlTrayHandle.addEventListener('touchstart', handleTrayToggle);
        
        // Add visual feedback for mobile touches
        if (this.isMobile) {
            this.controlTrayHandle.addEventListener('touchstart', () => {
                this.controlTrayHandle.style.backgroundColor = 'rgba(59, 130, 246, 0.9)';
            });
            
            this.controlTrayHandle.addEventListener('touchend', () => {
                setTimeout(() => {
                    this.controlTrayHandle.style.backgroundColor = '';
                }, 150);
            });
        }
        
        this.visualizer.container.appendChild(this.controlTrayHandle);
    }
    
    /**
     * Handle mouse movement for tray detection
     */
    handleTrayMouseMove(e) {
        if (!this.isFullscreen) return;
        
        const windowHeight = window.innerHeight;
        const bottomZone = windowHeight * 0.875; // Bottom 1/8th (87.5% down)
        
        // Show tray handle when mouse is in bottom zone
        if (e.clientY >= bottomZone) {
            this.showTrayHandle();
        } else {
            // Hide tray handle (but not control panel if it's open)
            this.hideTrayHandle();
        }
    }
    
    /**
     * Handle mouse movement for exit button detection (top-right 1/8th of screen)
     */
    handleExitButtonMouseMove(e) {
        if (!this.isFullscreen) return;
        
        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;
        const rightZone = windowWidth * 0.875; // Right 1/8th (87.5% across)
        const topZone = windowHeight * 0.125;  // Top 1/8th (12.5% down)
        
        // Show exit button when mouse is in top-right 1/8th zone
        if (e.clientX >= rightZone && e.clientY <= topZone) {
            this.showExitButton();
        } else {
            // Hide exit button (unless control panel is open)
            this.hideExitButton();
        }
    }
    
    /**
     * Show the tray handle
     */
    showTrayHandle() {
        if (!this.trayVisible && this.controlTrayHandle) {
            this.controlTrayHandle.classList.remove('visualizer-control-tray-handle-hidden');
            this.trayVisible = true;
        }
    }
    
    /**
     * Hide the tray handle (only if control panel isn't open)
     */
    hideTrayHandle() {
        if (this.trayVisible && !this.controlPanelOpen && this.controlTrayHandle) {
            this.controlTrayHandle.classList.add('visualizer-control-tray-handle-hidden');
            this.trayVisible = false;
        }
    }
    
    /**
     * Show the exit button
     */
    showExitButton() {
        if (!this.exitButtonVisible && this.fullscreenExitButton) {
            this.fullscreenExitButton.classList.remove('visualizer-fullscreen-exit-hidden');
            this.exitButtonVisible = true;
        }
    }
    
    /**
     * Hide the exit button (only if control panel isn't open)
     */
    hideExitButton() {
        if (this.exitButtonVisible && !this.controlPanelOpen && this.fullscreenExitButton) {
            this.fullscreenExitButton.classList.add('visualizer-fullscreen-exit-hidden');
            this.exitButtonVisible = false;
        }
    }
    
    /**
     * Toggle the control panel open/closed
     */
    toggleControlPanel() {
        if (this.controlPanelOpen) {
            this.closeControlPanel();
        } else {
            this.openControlPanel();
        }
    }
    
    /**
     * Open the control panel
     */
    openControlPanel() {
        this.controlPanelOpen = true;
        
        // Show the control center
        this.visualizer.controlCenter.show();
        
        // Add close button to control center
        this.addControlPanelCloseButton();
        
        // Show exit button when control panel is open
        this.showExitButton();
        
        // Keep tray handle visible while panel is open
        this.showTrayHandle();
    }
    
    /**
     * Close the control panel
     */
    closeControlPanel() {
        this.controlPanelOpen = false;
        
        // Hide the control center
        this.visualizer.controlCenter.hide();
        
        // Remove close button from control center
        this.removeControlPanelCloseButton();
        
        // Let exit button hide naturally if mouse is not in top-right zone
        // (hideExitButton will only hide if control panel is closed and mouse not in zone)
        this.hideExitButton();
        
        // Let tray handle hide naturally if mouse moves away
        this.hideTrayHandle();
    }
    
    /**
     * Add close button to control panel
     */
    addControlPanelCloseButton() {
        const controlPanel = this.visualizer.controlCenter.container;
        if (!controlPanel || this.controlPanelCloseButton) return;
        
        this.controlPanelCloseButton = document.createElement('button');
        this.controlPanelCloseButton.className = 'visualizer-control-panel-close';
        this.controlPanelCloseButton.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
            </svg>
        `;
        
        // Enhanced mobile support for close button
        const handleClosePanel = (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.closeControlPanel();
        };
        
        // Add both click and touch events
        this.controlPanelCloseButton.addEventListener('click', handleClosePanel);
        this.controlPanelCloseButton.addEventListener('touchstart', handleClosePanel);
        
        // Add visual feedback for mobile touches
        if (this.isMobile) {
            this.controlPanelCloseButton.addEventListener('touchstart', () => {
                this.controlPanelCloseButton.style.backgroundColor = 'rgba(220, 38, 38, 0.2)';
                this.controlPanelCloseButton.style.transform = 'scale(1.1)';
            });
            
            this.controlPanelCloseButton.addEventListener('touchend', () => {
                setTimeout(() => {
                    this.controlPanelCloseButton.style.backgroundColor = '';
                    this.controlPanelCloseButton.style.transform = '';
                }, 150);
            });
        }
        
        // Insert at the beginning of the control panel
        controlPanel.insertBefore(this.controlPanelCloseButton, controlPanel.firstChild);
    }
    
    /**
     * Remove close button from control panel
     */
    removeControlPanelCloseButton() {
        if (this.controlPanelCloseButton) {
            this.controlPanelCloseButton.remove();
            this.controlPanelCloseButton = null;
        }
    }
    
    updateFullscreenDimensions() {
        // Get actual viewport dimensions
        const newWidth = window.innerWidth;
        const newHeight = window.innerHeight;
        
        // Simply update canvas dimensions without complex particle scaling
        this.visualizer.canvasWidth = newWidth;
        this.visualizer.canvasHeight = newHeight;
        this.visualizer.canvas.width = newWidth;
        this.visualizer.canvas.height = newHeight;
        
        // Set canvas to fill viewport exactly
        this.visualizer.canvas.style.width = newWidth + 'px';
        this.visualizer.canvas.style.height = newHeight + 'px';
        this.visualizer.canvas.style.position = 'absolute';
        this.visualizer.canvas.style.top = '0';
        this.visualizer.canvas.style.left = '0';
        
        // Scale connection distance to maintain visual density
        const scaleFactor = Math.sqrt((newWidth * newHeight) / (this.originalCanvasSize.width * this.originalCanvasSize.height));
        const newConnectionDistance = Math.round(this.originalConnectionDistance * scaleFactor);
        this.visualizer.config.connectionDistance = newConnectionDistance;
        
        // Update connection distance display
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
        this.visualizer.canvas.width = this.originalCanvasSize.width;
        this.visualizer.canvas.height = this.originalCanvasSize.height;
        
        // Remove fullscreen styling to restore normal layout
        this.visualizer.canvas.style.width = '100%';
        this.visualizer.canvas.style.height = 'auto';
        this.visualizer.canvas.style.removeProperty('position');
        this.visualizer.canvas.style.removeProperty('top');
        this.visualizer.canvas.style.removeProperty('left');
        
        // Update connection distance display
        this.updateConnectionDistanceDisplay();
    }
    
    destroy() {
        this.cleanupPullUpTray();
        
        if (this.isFullscreen) {
            this.exitFullscreen();
        }
    }
}; 