# Visualizer Block

A dynamic data visualization WordPress block with interactive controls and real-time canvas rendering. Create stunning animated visualizations that your visitors can customize in real-time.

## Features

- **Multiple Visualization Types**: Particles, wave patterns, geometric shapes, and data flows
- **Interactive Frontend Controls**: Visitors can customize colors, animation speed, and particle count
- **Canvas-Based Rendering**: Smooth 60fps animations using HTML5 Canvas API
- **Gutenberg Integration**: Full block editor support with live preview
- **Responsive Design**: Automatically adapts to different screen sizes
- **Modern WordPress Standards**: Built with block.json and follows WordPress coding standards

## Demo

See it in action at [chubes.net/visualizer](https://chubes.net/visualizer)

## Installation

### From WordPress Admin (Recommended)

1. Download the latest release ZIP file
2. Go to `Plugins > Add New > Upload Plugin`
3. Upload the ZIP file and activate the plugin
4. The "Data Visualizer" block will be available in the block editor

### Manual Installation

1. Download or clone this repository
2. Upload the `visualizer-block` folder to `/wp-content/plugins/`
3. Activate the plugin through the 'Plugins' menu in WordPress

### Development Installation

```bash
# Clone the repository
git clone https://github.com/chubes/visualizer-block.git
cd visualizer-block

# Install dependencies (if you plan to build from source)
npm install

# Build the block assets
npm run build
```

## Usage

### Adding the Block

1. Create a new post or page
2. Click the "+" to add a new block
3. Search for "Data Visualizer" or find it in the Widgets category
4. Insert the block

### Block Settings

Use the block inspector (sidebar) to configure:

- **Visualization Type**: Choose from particles, waves, geometry, or data flow
- **Canvas Dimensions**: Set width and height (400-1200px width, 300-800px height)
- **Colors**: Customize background, primary, and secondary colors
- **Animation Speed**: Control the speed of animations (0.1x to 3x)
- **Particle Count**: Adjust the number of particles (10-500)
- **Frontend Controls**: Toggle whether visitors can customize the visualization

### Frontend Interaction

When frontend controls are enabled, visitors can:

- Change visualization types in real-time
- Adjust colors using color pickers
- Control animation speed and particle count
- See changes applied immediately

## Visualization Types

### Particles
Interactive particle system with connections between nearby particles. Great for network visualizations and abstract backgrounds.

### Wave Pattern
Animated sine waves with multiple layers. Perfect for audio visualizations and flowing designs.

### Geometric Shapes
Rotating geometric patterns with customizable colors. Ideal for modern, abstract designs.

### Data Flow
Vertical data streams with animated nodes and connections. Excellent for representing data movement or processes.

## Customization

### CSS Styling

The plugin uses modular CSS classes you can override:

```css
/* Customize the canvas container */
.visualizer-canvas-container {
    border-radius: 16px;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
}

/* Style the controls panel */
.visualizer-controls {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
}
```

### JavaScript Extension

Extend the visualizer with custom rendering:

```javascript
// Add custom visualization type
document.addEventListener('DOMContentLoaded', function() {
    // Access the VisualizerRenderer class
    const originalRender = VisualizerRenderer.prototype.render;
    
    VisualizerRenderer.prototype.render = function() {
        if (this.config.visualizationType === 'custom') {
            // Your custom rendering logic
            this.renderCustomVisualization();
        } else {
            originalRender.call(this);
        }
    };
});
```

## Development

### Requirements

- WordPress 6.0+
- PHP 8.0+
- Node.js 16+ (for development)

### File Structure

```
visualizer-block/
├── visualizer-block.php          # Main plugin file
├── blocks/visualizer/
│   ├── block.json                # Block configuration
│   ├── index.js                  # Editor JavaScript
│   ├── editor.css                # Editor styles
│   ├── style.css                 # Frontend styles
│   └── visualizer.js             # Frontend rendering
├── package.json                  # Build configuration
└── README.md                     # Documentation
```

### Building from Source

```bash
# Install dependencies
npm install

# Development build with watch
npm run start

# Production build
npm run build

# Lint code
npm run lint
```

### WordPress Hooks

The plugin provides several hooks for customization:

```php
// Modify default block attributes
add_filter('visualizer_block_default_attributes', function($attributes) {
    $attributes['primaryColor'] = '#ff6b6b';
    return $attributes;
});

// Add custom visualization types
add_filter('visualizer_block_types', function($types) {
    $types['spiral'] = __('Spiral Pattern', 'visualizer-block');
    return $types;
});
```

## Performance

- **Optimized Rendering**: Uses requestAnimationFrame for smooth 60fps animations
- **Dynamic Loading**: Frontend assets only load when block is present
- **Responsive Canvas**: Automatically scales for different screen sizes
- **Memory Efficient**: Proper cleanup of animation loops and event listeners

## Browser Support

- Chrome 60+
- Firefox 55+
- Safari 12+
- Edge 79+

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/new-visualization`
3. Make your changes and test thoroughly
4. Commit your changes: `git commit -am 'Add new visualization type'`
5. Push to the branch: `git push origin feature/new-visualization`
6. Submit a pull request

### Coding Standards

- Follow WordPress PHP coding standards
- Use ESLint configuration for JavaScript
- Write meaningful commit messages
- Include tests for new features

## License

This project is licensed under the GPL v2 or later - see the [LICENSE](LICENSE) file for details.

## Credits

- **Author**: [Chris Huber](https://chubes.net)
- **Canvas API**: HTML5 Canvas for rendering
- **WordPress**: Built for the WordPress block editor

## Support

- **Issues**: [GitHub Issues](https://github.com/chubes/visualizer-block/issues)
- **Documentation**: This README and inline code comments
- **Community**: WordPress.org support forums

## Changelog

### 1.0.0
- Initial release
- Four visualization types: particles, waves, geometry, data flow
- Full Gutenberg editor integration
- Interactive frontend controls
- Responsive design
- Modern WordPress standards compliance

---

Made with ❤️ for the WordPress community 