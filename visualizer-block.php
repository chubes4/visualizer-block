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
        $config = wp_json_encode([
            'aspectRatio' => floatval($attributes['aspectRatio'] ?? 0.75),
            'backgroundColor' => sanitize_hex_color($attributes['backgroundColor'] ?? '#000000'),
            'primaryColor' => sanitize_hex_color($attributes['primaryColor'] ?? '#00ff00'),
            'secondaryColor' => sanitize_hex_color($attributes['secondaryColor'] ?? '#ff0000'),
            'animationSpeed' => floatval($attributes['animationSpeed'] ?? 1),
            'particleCount' => intval($attributes['particleCount'] ?? 100),
            'particleSize' => floatval($attributes['particleSize'] ?? 3),
            'particleShape' => sanitize_text_field($attributes['particleShape'] ?? 'circle'),
            'connectionDistance' => intval($attributes['connectionDistance'] ?? 100),
            'mouseInteraction' => sanitize_text_field($attributes['mouseInteraction'] ?? 'attract'),
            'showTrails' => boolval($attributes['showTrails'] ?? false),
            'showControls' => boolval($attributes['showControls'] ?? true)
        ]);
        
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
            wp_enqueue_style(
                'visualizer-block-style',
                plugin_dir_url(__FILE__) . 'src/style.css',
                [],
                filemtime(plugin_dir_path(__FILE__) . 'src/style.css')
            );
            
            wp_enqueue_script(
                'visualizer-block-frontend',
                plugin_dir_url(__FILE__) . 'src/visualizer.js',
                [],
                filemtime(plugin_dir_path(__FILE__) . 'src/visualizer.js'),
                true
            );
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