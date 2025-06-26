<?php
/**
 * Plugin Name: Visualizer Block
 * Plugin URI: https://chubes.net
 * Description: Interactive canvas visualizations with customizable patterns and real-time controls.
 * Version: 1.0.0
 * Author: Chris Huber
 * Author URI: https://chubes.net
 * License: GPL v2 or later
 * License URI: https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain: visualizer-block
 * Domain Path: /languages
 * Requires at least: 5.0
 * Tested up to: 6.4
 * Requires PHP: 7.4
 * Network: false
 *
 * @package VisualizerBlock
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

/**
 * Main Visualizer Block Plugin Class
 */
class VisualizerBlock {
    
    /**
     * Plugin instance
     * @var VisualizerBlock
     */
    private static $instance = null;
    
    /**
     * Plugin version
     * @var string
     */
    const VERSION = '1.0.0';
    
    /**
     * Get plugin instance (singleton)
     */
    public static function getInstance() {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }
    
    /**
     * Constructor
     */
    private function __construct() {
        add_action('init', [$this, 'registerBlock']);
        add_action('wp_enqueue_scripts', [$this, 'enqueueFrontendAssets']);
        add_action('enqueue_block_editor_assets', [$this, 'enqueueEditorAssets']);
    }
    
    /**
     * Register the block type
     */
    public function registerBlock() {
        register_block_type(__DIR__ . '/block.json', [
            'render_callback' => [$this, 'renderBlock']
        ]);
    }
    
    /**
     * Render block callback
     */
    public function renderBlock($attributes, $content, $block) {
        // Sanitize and prepare configuration
        $config = array(
            'backgroundColor' => sanitize_hex_color($attributes['backgroundColor'] ?? '#0a0a0a'),
            'primaryColor' => sanitize_text_field($attributes['primaryColor'] ?? '#64ffda'),
            'secondaryColor' => sanitize_text_field($attributes['secondaryColor'] ?? '#ff6b9d'),
            'animationSpeed' => floatval($attributes['animationSpeed'] ?? 1),
            'particleCount' => intval($attributes['particleCount'] ?? 150),
            'particleSize' => floatval($attributes['particleSize'] ?? 3),
            'connectionDistance' => intval($attributes['connectionDistance'] ?? 100),
            'mouseInteraction' => sanitize_text_field($attributes['mouseInteraction'] ?? 'none'),
            'bounceOffWalls' => (bool)($attributes['bounceOffWalls'] ?? false),
            'rubberizeParticles' => (bool)($attributes['rubberizeParticles'] ?? false),
            'particleMagnetism' => (bool)($attributes['particleMagnetism'] ?? false),
            'collisionColorChange' => (bool)($attributes['collisionColorChange'] ?? false),
            'audioSync' => (bool)($attributes['audioSync'] ?? false),
            'glowEffect' => (bool)($attributes['glowEffect'] ?? false),
            'showControls' => (bool)($attributes['showControls'] ?? true)
        );
        
        $config = wp_json_encode($config);
        
        $wrapper_attributes = get_block_wrapper_attributes([
            'class' => 'visualizer-block-container',
            'data-config' => esc_attr($config)
        ]);
        
        return sprintf(
            '<div %s></div>',
            $wrapper_attributes
        );
    }
    
    /**
     * Enqueue frontend assets
     */
    public function enqueueFrontendAssets() {
        // Only enqueue if block is present on the page
        if (has_block('visualizer-block/visualizer')) {
            // Check if we have the separate frontend bundle (production)
            $has_frontend_bundle = file_exists(plugin_dir_path(__FILE__) . 'build/frontend.js');
            
            if ($has_frontend_bundle) {
                // PRODUCTION: Use compiled frontend bundle
                wp_enqueue_style(
                    'visualizer-block-style',
                    plugin_dir_url(__FILE__) . 'build/style-frontend.css',
                    [],
                    filemtime(plugin_dir_path(__FILE__) . 'build/style-frontend.css')
                );
                
                wp_enqueue_script(
                    'visualizer-block-frontend',
                    plugin_dir_url(__FILE__) . 'build/frontend.js',
                    [],
                    filemtime(plugin_dir_path(__FILE__) . 'build/frontend.js'),
                    true
                );
            } else {
                // DEVELOPMENT: Use individual source files
                wp_enqueue_style(
                    'visualizer-block-style',
                    plugin_dir_url(__FILE__) . 'src/style.css',
                    [],
                    filemtime(plugin_dir_path(__FILE__) . 'src/style.css')
                );
                
                // Enqueue size-scale utility first (no dependencies) - moved to rendering/
                wp_enqueue_script(
                    'visualizer-block-size-scale',
                    plugin_dir_url(__FILE__) . 'src/rendering/size-scale.js',
                    [],
                    filemtime(plugin_dir_path(__FILE__) . 'src/rendering/size-scale.js'),
                    true
                );
                
                // Enqueue connection renderer (depends on visual effects) - rendering/
                wp_enqueue_script(
                    'visualizer-block-connection-renderer',
                    plugin_dir_url(__FILE__) . 'src/rendering/connection-renderer.js',
                    [],
                    filemtime(plugin_dir_path(__FILE__) . 'src/rendering/connection-renderer.js'),
                    true
                );
                
                // Enqueue collision detector (no dependencies) - moved to physics/
                wp_enqueue_script(
                    'visualizer-block-collision-detector',
                    plugin_dir_url(__FILE__) . 'src/physics/collision-detector.js',
                    [],
                    filemtime(plugin_dir_path(__FILE__) . 'src/physics/collision-detector.js'),
                    true
                );
                
                // Enqueue visual effects (no dependencies) - moved to visual-effects/
                wp_enqueue_script(
                    'visualizer-block-visual-effects',
                    plugin_dir_url(__FILE__) . 'src/visual-effects/visual-effects.js',
                    [],
                    filemtime(plugin_dir_path(__FILE__) . 'src/visual-effects/visual-effects.js'),
                    true
                );
                
                // Enqueue LED glow effect module (particle-based rendering)
                wp_enqueue_script(
                    'visualizer-block-glow-effect',
                    plugin_dir_url(__FILE__) . 'src/visual-effects/led-glow-effect.js',
                    [],
                    filemtime(plugin_dir_path(__FILE__) . 'src/visual-effects/led-glow-effect.js'),
                    true
                );
                
                // Enqueue individual modules - moved to interaction/
                wp_enqueue_script(
                    'visualizer-block-fullscreen-manager',
                    plugin_dir_url(__FILE__) . 'src/interaction/fullscreen-manager.js',
                    [],
                    filemtime(plugin_dir_path(__FILE__) . 'src/interaction/fullscreen-manager.js'),
                    true
                );
                
                wp_enqueue_script(
                    'visualizer-block-mouse-interaction',
                    plugin_dir_url(__FILE__) . 'src/interaction/mouse-interaction.js',
                    [],
                    filemtime(plugin_dir_path(__FILE__) . 'src/interaction/mouse-interaction.js'),
                    true
                );
                
                wp_enqueue_script(
                    'visualizer-block-physics-effects',
                    plugin_dir_url(__FILE__) . 'src/physics/physics-effects.js',
                    ['visualizer-block-size-scale'], // Depends on size-scale utility
                    filemtime(plugin_dir_path(__FILE__) . 'src/physics/physics-effects.js'),
                    true
                );
                
                wp_enqueue_script(
                    'visualizer-block-control-center',
                    plugin_dir_url(__FILE__) . 'src/ui/control-center.js',
                    [],
                    filemtime(plugin_dir_path(__FILE__) . 'src/ui/control-center.js'),
                    true
                );
                
                // Enqueue audio modules
                wp_enqueue_script(
                    'visualizer-block-audio-analyzer',
                    plugin_dir_url(__FILE__) . 'src/audio/audio-analyzer.js',
                    [],
                    filemtime(plugin_dir_path(__FILE__) . 'src/audio/audio-analyzer.js'),
                    true
                );
                
                // NEW: Enqueue audio intensity module (centralized volume-spike detector)
                wp_enqueue_script(
                    'visualizer-block-audio-intensity',
                    plugin_dir_url(__FILE__) . 'src/audio/audio-intensity.js',
                    [],
                    filemtime(plugin_dir_path(__FILE__) . 'src/audio/audio-intensity.js'),
                    true
                );
                
                wp_enqueue_script(
                    'visualizer-block-audio-color-effects',
                    plugin_dir_url(__FILE__) . 'src/audio/audio-color-effects.js',
                    [],
                    filemtime(plugin_dir_path(__FILE__) . 'src/audio/audio-color-effects.js'),
                    true
                );
                
                wp_enqueue_script(
                    'visualizer-block-audio-effects',
                    plugin_dir_url(__FILE__) . 'src/audio/audio-effects.js',
                    ['visualizer-block-audio-analyzer', 'visualizer-block-audio-intensity', 'visualizer-block-audio-color-effects'],
                    filemtime(plugin_dir_path(__FILE__) . 'src/audio/audio-effects.js'),
                    true
                );
                
                // Enqueue main visualizer (depends on modules) - moved to core/
                wp_enqueue_script(
                    'visualizer-block-frontend',
                    plugin_dir_url(__FILE__) . 'src/core/visualizer.js',
                    ['visualizer-block-fullscreen-manager', 'visualizer-block-mouse-interaction', 'visualizer-block-collision-detector', 'visualizer-block-visual-effects', 'visualizer-block-glow-effect', 'visualizer-block-physics-effects', 'visualizer-block-control-center', 'visualizer-block-connection-renderer', 'visualizer-block-audio-analyzer', 'visualizer-block-audio-intensity', 'visualizer-block-audio-color-effects', 'visualizer-block-audio-effects'],
                    filemtime(plugin_dir_path(__FILE__) . 'src/core/visualizer.js'),
                    true
                );
            }
        }
    }
    
    /**
     * Enqueue editor assets
     */
    public function enqueueEditorAssets() {
        // Enqueue built editor script and styles
        if (file_exists(plugin_dir_path(__FILE__) . 'build/index.js')) {
            wp_enqueue_script(
                'visualizer-block-editor',
                plugin_dir_url(__FILE__) . 'build/index.js',
                ['wp-blocks', 'wp-element', 'wp-editor', 'wp-components'],
                filemtime(plugin_dir_path(__FILE__) . 'build/index.js'),
                true
            );
        }
        
        if (file_exists(plugin_dir_path(__FILE__) . 'build/index.css')) {
            wp_enqueue_style(
                'visualizer-block-editor-style',
                plugin_dir_url(__FILE__) . 'build/index.css',
                ['wp-edit-blocks'],
                filemtime(plugin_dir_path(__FILE__) . 'build/index.css')
            );
        }
    }
    
    /**
     * Plugin activation
     */
    public static function activate() {
        // Flush rewrite rules
        flush_rewrite_rules();
    }
    
    /**
     * Plugin deactivation
     */
    public static function deactivate() {
        // Clean up if needed
        flush_rewrite_rules();
    }
}

// Initialize the plugin
VisualizerBlock::getInstance();

// Register activation/deactivation hooks
register_activation_hook(__FILE__, ['VisualizerBlock', 'activate']);
register_deactivation_hook(__FILE__, ['VisualizerBlock', 'deactivate']); 