#!/bin/bash
set -e

PLUGIN_SLUG="visualizer-block"
DIST_DIR="dist"

# Clean previous build
echo "🧹 Cleaning previous build..."
rm -rf "$DIST_DIR"
mkdir "$DIST_DIR"

# Build assets first
echo "🔨 Building assets..."
npm run build

# Copy only production files
echo "📦 Copying production files..."
rsync -av --exclude='node_modules' \
          --exclude='src' \
          --exclude='.git' \
          --exclude='.DS_Store' \
          --exclude='.gitignore' \
          --exclude='.cursor' \
          --exclude='*.log' \
          --exclude='webpack.config.js' \
          --exclude='package.json' \
          --exclude='package-lock.json' \
          --exclude='build-dist.sh' \
          --exclude='dist' \
          --exclude='*.zip' \
          --exclude='README.md' \
          --exclude='readme.txt' \
          ./ "$DIST_DIR/$PLUGIN_SLUG"

# Clean up development files that might have been copied
echo "🧽 Cleaning up development files..."
rm -rf "$DIST_DIR/$PLUGIN_SLUG/src"
rm -rf "$DIST_DIR/$PLUGIN_SLUG/node_modules"

# Create a readme for the distribution
echo "📝 Creating distribution README..."
cat > "$DIST_DIR/$PLUGIN_SLUG/README.md" << 'EOF'
# Visualizer Block

A Gutenberg block for creating interactive canvas visualizations with customizable particle systems, shapes, and real-time controls.

## Features

- Interactive particle system with multiple shapes (circles, squares, triangles, stars)
- Mouse interaction modes: attract, repel, orbit
- Real-time controls for users to customize the visualization
- Responsive design that adapts to container width
- Multiple color customization options
- Trail effects and particle connections
- Smooth animations with configurable speed
- Mobile responsive with touch support
- Clean, modern interface

## Installation

1. Upload the visualizer-block folder to /wp-content/plugins/
2. Activate the plugin through the 'Plugins' menu in WordPress
3. Add visualizer blocks to your posts and pages using the Gutenberg editor

## Usage

1. Add a "Particle System" block in the Gutenberg editor
2. The visualization will automatically take full width of its container
3. Visitors can interact with the visualization using the provided controls
4. Customize colors, particle count, animation speed, and effects
5. Mouse interaction adds engaging user experience

## Block Settings

- **Aspect Ratio**: Controls the height-to-width ratio of the visualization
- **Colors**: Background, particle, and connection colors
- **Particle Count**: Number of particles in the system (10-500)
- **Particle Size**: Size of individual particles
- **Animation Speed**: Speed of the animation
- **Mouse Interaction**: How particles respond to mouse movement
- **Show Trails**: Enable particle trail effects
- **Show Controls**: Display user controls on the frontend

## Technical Features

- Canvas-based rendering for smooth performance
- Responsive design with automatic container width detection
- Dynamic asset versioning using filemtime()
- Modern WordPress block development practices
- Accessibility considerations
- Clean, semantic HTML output

## Author

Created by Chris Huber (https://chubes.net)

## Version

1.0.0
EOF

# Zip it up
echo "🗜️ Zipping plugin..."
cd "$DIST_DIR"
zip -r "${PLUGIN_SLUG}.zip" "$PLUGIN_SLUG"
cd ..

echo "✅ Build complete: $DIST_DIR/${PLUGIN_SLUG}.zip"
echo "📁 Distribution folder: $DIST_DIR/$PLUGIN_SLUG"
echo "🚀 Ready for WordPress upload!" 