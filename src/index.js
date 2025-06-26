/**
 * WordPress dependencies
 */
import { __ } from '@wordpress/i18n';
import { 
    useBlockProps,
    InspectorControls
} from '@wordpress/block-editor';
import { 
    PanelBody, 
    RangeControl, 
    SelectControl,
    ToggleControl
} from '@wordpress/components';
import { registerBlockType } from '@wordpress/blocks';

/**
 * Internal dependencies
 */
import './editor.css';

/**
 * Block edit function
 */
function Edit({ attributes, setAttributes }) {
    const {
        backgroundColor,
        primaryColor,
        secondaryColor,
        animationSpeed,
        particleCount,
        particleSize,
        connectionDistance,
        mouseInteraction,
        bounceOffWalls,
        rubberizeParticles,
        particleMagnetism,
        collisionColorChange,
        audioSync,
        glowEffect,
        showControls
    } = attributes;

    const blockProps = useBlockProps({
        className: 'visualizer-block-editor'
    });

    const mouseInteractionOptions = [
        { label: __('None', 'visualizer-block'), value: 'none' },
        { label: __('Attract', 'visualizer-block'), value: 'attract' },
        { label: __('Repel', 'visualizer-block'), value: 'repel' },
        { label: __('Orbital', 'visualizer-block'), value: 'push' }
    ];

    return (
        <>
            <InspectorControls>
                <PanelBody title={__('Core Settings', 'visualizer-block')} initialOpen={true}>
                    <RangeControl
                        label={__('Particle Count', 'visualizer-block')}
                        value={particleCount}
                        onChange={(value) => setAttributes({ particleCount: value })}
                        min={10}
                        max={1000}
                        step={10}
                    />
                    <RangeControl
                        label={__('Particle Size', 'visualizer-block')}
                        value={particleSize}
                        onChange={(value) => setAttributes({ particleSize: value })}
                        min={1}
                        max={10}
                        step={0.5}
                    />
                    <RangeControl
                        label={__('Animation Speed', 'visualizer-block')}
                        value={animationSpeed}
                        onChange={(value) => setAttributes({ animationSpeed: value })}
                        min={0.1}
                        max={5}
                        step={0.1}
                    />
                </PanelBody>

                <PanelBody title={__('Connection Settings', 'visualizer-block')} initialOpen={false}>
                    <RangeControl
                        label={__('Connection Distance', 'visualizer-block')}
                        value={connectionDistance}
                        onChange={(value) => setAttributes({ connectionDistance: value })}
                        min={0}
                        max={300}
                        step={10}
                    />
                </PanelBody>

                <PanelBody title={__('Colors', 'visualizer-block')} initialOpen={false}>
                    <div className="color-control">
                        <label>{__('Background Color', 'visualizer-block')}</label>
                        <input
                            type="color"
                            value={backgroundColor}
                            onChange={(e) => setAttributes({ backgroundColor: e.target.value })}
                        />
                    </div>
                    <div className="color-control">
                        <label>{__('Primary Color', 'visualizer-block')}</label>
                        <input
                            type="color"
                            value={primaryColor}
                            onChange={(e) => setAttributes({ primaryColor: e.target.value })}
                        />
                    </div>
                    <div className="color-control">
                        <label>{__('Secondary Color', 'visualizer-block')}</label>
                        <input
                            type="color"
                            value={secondaryColor}
                            onChange={(e) => setAttributes({ secondaryColor: e.target.value })}
                        />
                    </div>
                </PanelBody>

                <PanelBody title={__('Physics & Effects', 'visualizer-block')} initialOpen={false}>
                    <SelectControl
                        label={__('Mouse Interaction', 'visualizer-block')}
                        value={mouseInteraction}
                        options={mouseInteractionOptions}
                        onChange={(value) => setAttributes({ mouseInteraction: value })}
                    />
                    <ToggleControl
                        label={__('Bounce Off Walls', 'visualizer-block')}
                        checked={bounceOffWalls}
                        onChange={(value) => setAttributes({ bounceOffWalls: value })}
                    />
                    <ToggleControl
                        label={__('Rubberize Particles', 'visualizer-block')}
                        checked={rubberizeParticles}
                        onChange={(value) => setAttributes({ rubberizeParticles: value })}
                    />
                    <ToggleControl
                        label={__('Particle Magnetism', 'visualizer-block')}
                        checked={particleMagnetism}
                        onChange={(value) => setAttributes({ particleMagnetism: value })}
                    />
                    <ToggleControl
                        label={__('Collision Color Change', 'visualizer-block')}
                        checked={collisionColorChange}
                        onChange={(value) => setAttributes({ collisionColorChange: value })}
                    />
                    <ToggleControl
                        label={__('Audio Sync', 'visualizer-block')}
                        checked={audioSync}
                        onChange={(value) => setAttributes({ audioSync: value })}
                    />
                    <ToggleControl
                        label={__('Glow Effect', 'visualizer-block')}
                        checked={glowEffect}
                        onChange={(value) => setAttributes({ glowEffect: value })}
                    />
                </PanelBody>

                <PanelBody title={__('Display Settings', 'visualizer-block')} initialOpen={false}>
                    <ToggleControl
                        label={__('Show Controls', 'visualizer-block')}
                        checked={showControls}
                        onChange={(value) => setAttributes({ showControls: value })}
                    />
                </PanelBody>
            </InspectorControls>

            <div {...blockProps}>
                <div className="visualizer-block-preview">
                    <div className="preview-header">
                        <h3>{__('Particle Visualizer', 'visualizer-block')}</h3>
                        <p>{__(`${particleCount} circle particles`, 'visualizer-block')}</p>
                    </div>
                    <div className="preview-canvas">
                        <div style={{
                            backgroundColor: backgroundColor,
                            minHeight: '200px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: primaryColor,
                            border: `2px solid ${primaryColor}20`
                        }}>
                            {__('Particle visualization will appear here', 'visualizer-block')}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}

/**
 * Save function (returns null for dynamic block)
 */
function Save() {
    return null;
}

/**
 * Register the block
 */
registerBlockType('visualizer-block/visualizer', {
    edit: Edit,
    save: Save,
}); 