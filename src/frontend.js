/**
 * Frontend Assets Entry Point
 * This file imports all the visualizer modules for the frontend
 */

// Import all frontend modules in the correct dependency order

// Utilities and core components first
import './rendering/size-scale.js';
import './rendering/connection-renderer.js';
import './physics/collision-detector.js';

// Visual effects
import './visual-effects/visual-effects.js';
import './visual-effects/led-glow-effect.js';

// Interaction modules
import './interaction/fullscreen-manager.js';
import './interaction/mouse-interaction.js';

// Physics
import './physics/physics-effects.js';

// UI
import './ui/control-center.js';

// Audio modules
import './audio/audio-analyzer.js';
import './audio/audio-intensity.js';
import './audio/audio-color-effects.js';
import './audio/audio-effects.js';

// Main visualizer (must be last)
import './core/visualizer.js';

// Import frontend styles
import './style.css'; 