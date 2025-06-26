# Visualizer Block

An interactive particle system WordPress block with real-time controls and canvas rendering. Create stunning animated particle visualizations that your visitors can customize in real-time.

## Features

- **Interactive Particle System**: Advanced particle effects with customizable shapes and behaviors
- **Multiple Particle Shapes**: Circles, squares, triangles, and stars
- **Mouse Interaction Modes**: Attract, repel, orbit, or no interaction
- **Real-time Controls**: Visitors can customize colors, animation speed, particle count, and effects
- **Canvas-Based Rendering**: Smooth 60fps animations using HTML5 Canvas API
- **Responsive Design**: Automatically adapts to container width with configurable aspect ratio
- **Trail Effects**: Optional particle trails with transparency
- **Connection Lines**: Dynamic connections between nearby particles
- **Gutenberg Integration**: Full block editor support with live preview
- **Modern WordPress Standards**: Built with block.json API v2 and follows WordPress coding standards

## Demo

See it in action at [chubes.net/visualizer](https://chubes.net/visualizer)

## Installation

### From WordPress Admin (Recommended)

1. Download the latest release ZIP file
2. Go to `Plugins > Add New > Upload Plugin`
3. Upload the ZIP file and activate the plugin
4. The "Particle System" block will be available in the block editor

### Manual Installation

1. Download or clone this repository
2. Upload the `visualizer-block` folder to `/wp-content/plugins/`
3. Activate the plugin through the 'Plugins' menu in WordPress

### Development Installation

```bash
# Clone the repository
git clone https://github.com/chubes4/visualizer-block.git
cd visualizer-block

# Install dependencies
npm install

# Build the block assets
npm run build

# Create distribution package
npm run dist
```

## Usage

### Adding the Block

1. Create a new post or page
2. Click the "+" to add a new block
3. Search for "Particle System" or find it in the Widgets category
4. Insert the block

### Block Settings

The particle system automatically takes the full width of its container. Configure these settings in the block inspector:

- **Aspect Ratio**: Controls the height-to-width ratio of the visualization (default: 0.75)
- **Colors**: Background, particle, and connection line colors
- **Animation Speed**: Control the speed of animations (0.1x to 3x)
- **Particle Count**: Number of particles in the system (10-500)
- **Particle Size**: Size of individual particles
- **Particle Shape**: Choose from circles, squares, triangles, or stars
- **Connection Distance**: How close particles need to be to connect
- **Mouse Interaction**: How particles respond to mouse movement (attract, repel, orbit, none)
- **Show Trails**: Enable particle trail effects
- **Show Controls**: Toggle whether visitors can customize the visualization

### Frontend Interaction

When frontend controls are enabled, visitors can:

- Change particle shapes in real-time
- Switch between mouse interaction modes
- Adjust colors using color pickers
- Control animation speed, particle count, and size
- Enable/disable trail effects
- Click to create particle bursts
- See changes applied immediately

### Mouse Interactions

- **Attract**: Particles are drawn toward the mouse cursor
- **Repel**: Particles move away from the mouse cursor  
- **Orbit**: Particles orbit around the mouse cursor
- **None**: No mouse interaction

## Technical Features

### Responsive Design
- Automatically calculates canvas dimensions based on container width
- Maintains aspect ratio across different screen sizes
- Minimum height enforcement for very narrow containers
- Proper canvas scaling for high-DPI displays

### Performance Optimizations
- Uses `requestAnimationFrame` for smooth 60fps animations
- Dynamic asset loading - frontend assets only load when block is present
- Efficient particle system with proper cleanup
- Memory management for trails and particle bursts

### WordPress Integration
- Modern block development with block.json API v2
- Dynamic asset versioning using `filemtime()`
- Proper sanitization and security measures
- Accessibility considerations
- Clean, semantic HTML output

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

/* Make canvas take full width */
.wp-block-visualizer-block-visualizer {
    width: 100%;
}
```

## Development

### Requirements

- WordPress 5.0+
- PHP 7.4+
- Node.js 16+ (for development)

### File Structure

```
visualizer-block/
├── visualizer-block.php          # Main plugin file
├── block.json                    # Block configuration
├── src/
│   ├── index.js                  # Editor JavaScript
│   ├── editor.css                # Editor styles
│   ├── style.css                 # Frontend styles
│   └── visualizer.js             # Frontend particle system
├── build/                        # Compiled assets (generated)
├── dist/                         # Distribution package (generated)
├── package.json                  # Build configuration
├── webpack.config.js             # Webpack configuration
├── build-dist.sh                 # Distribution build script
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

# Create distribution package
npm run dist

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
```

## Browser Support

- Chrome 60+
- Firefox 55+
- Safari 12+
- Edge 79+

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

GPL v2 or later

## Author

Created by Chris Huber (https://chubes.net)

## Version

1.0.0 

## Recent Fixes

### Audio Sync Collision Detection (Latest)
Fixed an issue where collision detection was inaccurate when audio sync was enabled:

- **Problem**: Collision hitboxes used base particle size while rendering used audio-enlarged size
- **Solution**: Enhanced collision detection to account for audio size multipliers
- **Impact**: Collision detection now matches visual particle size during audio swelling
- **Files modified**: `src/physics/collision-detector.js`

The collision detector now includes a `getEffectiveParticleSize()` method that applies the same audio size multiplier used in rendering, ensuring collision accuracy when particles swell with bass/volume.

### Magnetic Burst Effects (New Feature)
Added dramatic cluster breakup effects when magnetism and audio sync are both enabled:

- **Feature**: Audio spikes temporarily convert magnetism from attraction to repulsion with enhanced range and power
- **Effect**: Creates explosive "burst" effects that break up magnetic clusters and scatter particles
- **Trigger**: Volume spikes above 75% threshold with 1.5x volume increase over previous level
- **Duration**: 400ms burst duration with 300ms cooldown between bursts
- **Parameters**: 
  - **Range multiplier**: 2.5x normal magnetic range during burst
  - **Power multiplier**: 3x normal magnetic strength during burst
  - **Conversion**: Attraction becomes repulsion for dramatic scatter effect
- **Files modified**: `src/audio/audio-effects.js`, `src/physics/physics-effects.js`

This creates a spectacular effect where tight magnetic clusters explode outward on music peaks, then reform as the burst fades, adding rhythmic drama to magnetism visualizations.

### 3-Tier Magnetic Inversion System (Latest)
Replaced simple magnetic bursts with a sophisticated tolerance-based inversion system:

- **Concept**: Audio volume spikes dynamically adjust the attraction/repulsion "tolerance level"
- **Effect**: Creates nuanced burst patterns where closer particles repel while distant ones still attract
- **Enhanced Sensitivity**: 20% more responsive with lower thresholds and stronger effects
- **3-Tier System**:
  - **Tier 1 (55-65% volume)**: 36% tolerance reduction, 1.44x power boost - gentle burst effects
  - **Tier 2 (65-75% volume)**: 72% tolerance reduction, 2.16x power boost - moderate cluster breakup  
  - **Tier 3 (75%+ volume)**: 100% tolerance reduction, 3.0x power boost - dramatic explosions
- **Smart Timing**: 420ms duration per tier, 160ms cooldown between tier changes
- **Dynamic Range**: Each tier creates different visual patterns based on how close particles are
- **Files modified**: `src/audio/audio-effects.js`, `src/physics/physics-effects.js`

This creates incredibly sophisticated burst effects where the intensity and pattern of cluster breakup varies smoothly with music dynamics, from subtle ripples to explosive scattering.

## Performance Optimizations

### Frame Rate Management
- **Adaptive processing**: Audio, physics, and collision systems scale processing frequency based on particle count
- **Smart batching**: Color and opacity-based particle rendering batches
- **Early culling**: Distance and opacity thresholds prevent unnecessary calculations

### Collision Detection
- **Spatial partitioning**: O(n²) to O(n) collision detection optimization
- **Forward neighbor checking**: Eliminates duplicate collision checks
- **Audio-aware grid sizing**: Spatial grid adapts to audio-enlarged particle sizes

### Audio Processing
- **Efficient FFT**: 256-sample analysis for balance of resolution and performance
- **Smoothed responses**: Prevents jarring visual changes
- **Magnetism compatibility**: Audio effects adapt behavior when other physics are active

## Architecture

### Modular Design
- `src/core/` - Main visualizer logic
- `src/audio/` - Audio analysis and effects
- `src/physics/` - Collision detection and physics
- `src/rendering/` - Connection and particle rendering
- `src/visual-effects/` - Color effects and visual enhancements
- `src/interaction/` - Mouse and fullscreen management
- `src/ui/` - Control center interface

### Performance Philosophy
Built on KISS (Keep It Simple, Stupid) and DRY (Don't Repeat Yourself) principles with aggressive performance optimization. All effects scale gracefully from low-end to high-end hardware.

### Audio-Reactive Visualizations
- **Real-time microphone analysis** with frequency separation (bass, mid, high)
- **Audio-reactive color waves** with 128-color spectrum system
- **Motion effects**: Beat detection, volume peaks, frequency-based turbulence
- **Audio + collision integration**: Particle collision history offsets position in global audio wave
- **Accurate collision detection**: Hitboxes match visual size when audio sync is enabled
- **3-tier magnetic inversion**: Sophisticated volume-based tolerance adjustment creating nuanced burst patterns

## Recent Fixes

### Audio Sync Collision Detection (Latest)
Fixed an issue where collision detection was inaccurate when audio sync was enabled:

- **Problem**: Collision hitboxes used base particle size while rendering used audio-enlarged size
- **Solution**: Enhanced collision detection to account for audio size multipliers
- **Impact**: Collision detection now matches visual particle size during audio swelling
- **Files modified**: `src/physics/collision-detector.js`

The collision detector now includes a `getEffectiveParticleSize()` method that applies the same audio size multiplier used in rendering, ensuring collision accuracy when particles swell with bass/volume.

### Magnetic Burst Effects (New Feature)
Added dramatic cluster breakup effects when magnetism and audio sync are both enabled:

- **Feature**: Audio spikes temporarily convert magnetism from attraction to repulsion with enhanced range and power
- **Effect**: Creates explosive "burst" effects that break up magnetic clusters and scatter particles
- **Trigger**: Volume spikes above 75% threshold with 1.5x volume increase over previous level
- **Duration**: 400ms burst duration with 300ms cooldown between bursts
- **Parameters**: 
  - **Range multiplier**: 2.5x normal magnetic range during burst
  - **Power multiplier**: 3x normal magnetic strength during burst
  - **Conversion**: Attraction becomes repulsion for dramatic scatter effect
- **Files modified**: `src/audio/audio-effects.js`, `src/physics/physics-effects.js`

This creates a spectacular effect where tight magnetic clusters explode outward on music peaks, then reform as the burst fades, adding rhythmic drama to magnetism visualizations.

### 3-Tier Magnetic Inversion System (Latest)
Replaced simple magnetic bursts with a sophisticated tolerance-based inversion system:

- **Concept**: Audio volume spikes dynamically adjust the attraction/repulsion "tolerance level"
- **Effect**: Creates nuanced burst patterns where closer particles repel while distant ones still attract
- **Enhanced Sensitivity**: 20% more responsive with lower thresholds and stronger effects
- **3-Tier System**:
  - **Tier 1 (55-65% volume)**: 36% tolerance reduction, 1.44x power boost - gentle burst effects
  - **Tier 2 (65-75% volume)**: 72% tolerance reduction, 2.16x power boost - moderate cluster breakup  
  - **Tier 3 (75%+ volume)**: 100% tolerance reduction, 3.0x power boost - dramatic explosions
- **Smart Timing**: 420ms duration per tier, 160ms cooldown between tier changes
- **Dynamic Range**: Each tier creates different visual patterns based on how close particles are
- **Files modified**: `src/audio/audio-effects.js`, `src/physics/physics-effects.js`

This creates incredibly sophisticated burst effects where the intensity and pattern of cluster breakup varies smoothly with music dynamics, from subtle ripples to explosive scattering.

## Performance Optimizations

### Frame Rate Management
- **Adaptive processing**: Audio, physics, and collision systems scale processing frequency based on particle count
- **Smart batching**: Color and opacity-based particle rendering batches
- **Early culling**: Distance and opacity thresholds prevent unnecessary calculations

### Collision Detection
- **Spatial partitioning**: O(n²) to O(n) collision detection optimization
- **Forward neighbor checking**: Eliminates duplicate collision checks
- **Audio-aware grid sizing**: Spatial grid adapts to audio-enlarged particle sizes

### Audio Processing
- **Efficient FFT**: 256-sample analysis for balance of resolution and performance
- **Smoothed responses**: Prevents jarring visual changes
- **Magnetism compatibility**: Audio effects adapt behavior when other physics are active

## Architecture

### Modular Design
- `src/core/` - Main visualizer logic
- `src/audio/` - Audio analysis and effects
- `src/physics/` - Collision detection and physics
- `src/rendering/` - Connection and particle rendering
- `src/visual-effects/` - Color effects and visual enhancements
- `src/interaction/` - Mouse and fullscreen management
- `src/ui/` - Control center interface

### Performance Philosophy
Built on KISS (Keep It Simple, Stupid) and DRY (Don't Repeat Yourself) principles with aggressive performance optimization. All effects scale gracefully from low-end to high-end hardware.

### Audio-Reactive Visualizations
- **Real-time microphone analysis** with frequency separation (bass, mid, high)
- **Audio-reactive color waves** with 128-color spectrum system
- **Motion effects**: Beat detection, volume peaks, frequency-based turbulence
- **Audio + collision integration**: Particle collision history offsets position in global audio wave
- **Accurate collision detection**: Hitboxes match visual size when audio sync is enabled
- **3-tier magnetic inversion**: Sophisticated volume-based tolerance adjustment creating nuanced burst patterns 