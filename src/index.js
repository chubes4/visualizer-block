/**
 * WordPress dependencies
 */
import { __ } from '@wordpress/i18n';
import { 
    useBlockProps,
    InspectorControls,
    PanelColorSettings 
} from '@wordpress/block-editor';
import { 
    PanelBody, 
    RangeControl, 
    SelectControl,
    ToggleControl,
    Card,
    CardBody 
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
        canvasWidth,
        canvasHeight,
        backgroundColor,
        primaryColor,
        secondaryColor,
        animationSpeed,
        particleCount,
        particleSize,
        particleShape,
        connectionDistance,
        mouseInteraction,
        showTrails,
        showControls
    } = attributes;

    const blockProps = useBlockProps({
        className: 'visualizer-block-editor'
    });

    const particleShapes = [
        { label: __('Circles', 'visualizer-block'), value: 'circle' },
        { label: __('Squares', 'visualizer-block'), value: 'square' },
        { label: __('Triangles', 'visualizer-block'), value: 'triangle' },
        { label: __('Stars', 'visualizer-block'), value: 'star' }
    ];

    const mouseInteractionTypes = [
        { label: __('None', 'visualizer-block'), value: 'none' },
        { label: __('Attract', 'visualizer-block'), value: 'attract' },
        { label: __('Repel', 'visualizer-block'), value: 'repel' },
        { label: __('Orbit', 'visualizer-block'), value: 'orbit' }
    ];

    return (
        <>
            <InspectorControls>
                <PanelBody title={__('Canvas Settings', 'visualizer-block')} initialOpen={true}>
                    <RangeControl
                        label={__('Canvas Width', 'visualizer-block')}
                        value={canvasWidth}
                        onChange={(value) => setAttributes({ canvasWidth: value })}
                        min={400}
                        max={1200}
                        step={50}
                    />
                    
                    <RangeControl
                        label={__('Canvas Height', 'visualizer-block')}
                        value={canvasHeight}
                        onChange={(value) => setAttributes({ canvasHeight: value })}
                        min={300}
                        max={800}
                        step={50}
                    />
                    
                    <ToggleControl
                        label={__('Show Frontend Controls', 'visualizer-block')}
                        checked={showControls}
                        onChange={(value) => setAttributes({ showControls: value })}
                        help={__('Allow visitors to customize the particles', 'visualizer-block')}
                    />
                </PanelBody>

                <PanelColorSettings
                    title={__('Color Settings', 'visualizer-block')}
                    colorSettings={[
                        {
                            value: backgroundColor,
                            onChange: (value) => setAttributes({ backgroundColor: value }),
                            label: __('Background Color', 'visualizer-block')
                        },
                        {
                            value: primaryColor,
                            onChange: (value) => setAttributes({ primaryColor: value }),
                            label: __('Particle Color', 'visualizer-block')
                        },
                        {
                            value: secondaryColor,
                            onChange: (value) => setAttributes({ secondaryColor: value }),
                            label: __('Connection Color', 'visualizer-block')
                        }
                    ]}
                />

                <PanelBody title={__('Particle Settings', 'visualizer-block')} initialOpen={false}>
                    <RangeControl
                        label={__('Particle Count', 'visualizer-block')}
                        value={particleCount}
                        onChange={(value) => setAttributes({ particleCount: value })}
                        min={10}
                        max={500}
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
                    
                    <SelectControl
                        label={__('Particle Shape', 'visualizer-block')}
                        value={particleShape}
                        options={particleShapes}
                        onChange={(value) => setAttributes({ particleShape: value })}
                    />

                    <RangeControl
                        label={__('Connection Distance', 'visualizer-block')}
                        value={connectionDistance}
                        onChange={(value) => setAttributes({ connectionDistance: value })}
                        min={50}
                        max={200}
                        step={10}
                        help={__('Distance at which particles connect', 'visualizer-block')}
                    />
                </PanelBody>

                <PanelBody title={__('Animation & Effects', 'visualizer-block')} initialOpen={false}>
                    <RangeControl
                        label={__('Animation Speed', 'visualizer-block')}
                        value={animationSpeed}
                        onChange={(value) => setAttributes({ animationSpeed: value })}
                        min={0.1}
                        max={3}
                        step={0.1}
                    />

                    <SelectControl
                        label={__('Mouse Interaction', 'visualizer-block')}
                        value={mouseInteraction}
                        options={mouseInteractionTypes}
                        onChange={(value) => setAttributes({ mouseInteraction: value })}
                    />

                    <ToggleControl
                        label={__('Show Particle Trails', 'visualizer-block')}
                        checked={showTrails}
                        onChange={(value) => setAttributes({ showTrails: value })}
                        help={__('Add motion blur trails to particles', 'visualizer-block')}
                    />
                </PanelBody>
            </InspectorControls>

            <div {...blockProps}>
                <Card>
                    <CardBody>
                        <div className="visualizer-preview">
                            <canvas
                                width={canvasWidth}
                                height={canvasHeight}
                                style={{
                                    backgroundColor: backgroundColor,
                                    maxWidth: '100%',
                                    height: 'auto',
                                    border: '2px dashed #ccc'
                                }}
                            />
                            <div className="visualizer-preview-overlay">
                                <h3>{__('Interactive Particle System', 'visualizer-block')}</h3>
                                <p>{__(`${particleCount} ${particleShape} particles`, 'visualizer-block')}</p>
                                <p>{__(`Dimensions: ${canvasWidth}x${canvasHeight}`, 'visualizer-block')}</p>
                                <p>{__(`Mouse: ${mouseInteraction}`, 'visualizer-block')}</p>
                                <small>{__('Live animation will appear on frontend', 'visualizer-block')}</small>
                            </div>
                        </div>
                    </CardBody>
                </Card>
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