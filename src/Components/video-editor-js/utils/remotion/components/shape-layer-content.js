import { jsx as _jsx } from "react/jsx-runtime";
import { useMemo } from "react";

/**
 * ShapeLayerContent Component
 *
 * Renders different types of shapes (circle, square, rectangle, triangle, etc.)
 * as SVG elements in the Remotion video composition.
 */
export const ShapeLayerContent = ({ overlay }) => {
    const shapeType = overlay?.shapeType || 'circle';
    const styles = overlay?.styles || {};
    const fill = styles.fill || '#3b82f6';
    const stroke = styles.stroke || '#1e40af';
    const strokeWidth = styles.strokeWidth || 2;
    const opacity = styles.opacity !== undefined ? styles.opacity : 1;
    
    const shapeStyle = useMemo(() => ({
        fill,
        stroke,
        strokeWidth,
        opacity,
    }), [fill, stroke, strokeWidth, opacity]);
    
    const renderShape = () => {
        const size = Math.min(overlay.width || 200, overlay.height || 200);
        const centerX = (overlay.width || 200) / 2;
        const centerY = (overlay.height || 200) / 2;
        const radius = size / 2;
        
        switch (shapeType) {
            case 'circle':
                return (
                    <circle
                        cx={centerX}
                        cy={centerY}
                        r={radius - strokeWidth / 2}
                        style={shapeStyle}
                    />
                );
            
            case 'square':
                const squareSize = size - strokeWidth;
                const squareX = (overlay.width || 200) / 2 - squareSize / 2;
                const squareY = (overlay.height || 200) / 2 - squareSize / 2;
                return (
                    <rect
                        x={squareX}
                        y={squareY}
                        width={squareSize}
                        height={squareSize}
                        style={shapeStyle}
                    />
                );
            
            case 'rectangle':
                const rectWidth = (overlay.width || 300) - strokeWidth;
                const rectHeight = (overlay.height || 150) - strokeWidth;
                const rectX = (overlay.width || 300) / 2 - rectWidth / 2;
                const rectY = (overlay.height || 150) / 2 - rectHeight / 2;
                return (
                    <rect
                        x={rectX}
                        y={rectY}
                        width={rectWidth}
                        height={rectHeight}
                        style={shapeStyle}
                    />
                );
            
            case 'triangle':
                const triangleSize = size - strokeWidth;
                const trianglePoints = [
                    `${centerX},${centerY - triangleSize / 2}`,
                    `${centerX - triangleSize / 2},${centerY + triangleSize / 2}`,
                    `${centerX + triangleSize / 2},${centerY + triangleSize / 2}`
                ].join(' ');
                return (
                    <polygon
                        points={trianglePoints}
                        style={shapeStyle}
                    />
                );
            
            case 'hexagon':
                const hexSize = size - strokeWidth;
                const hexPoints = [];
                for (let i = 0; i < 6; i++) {
                    const angle = (Math.PI / 3) * i;
                    const x = centerX + (hexSize / 2) * Math.cos(angle);
                    const y = centerY + (hexSize / 2) * Math.sin(angle);
                    hexPoints.push(`${x},${y}`);
                }
                return (
                    <polygon
                        points={hexPoints.join(' ')}
                        style={shapeStyle}
                    />
                );
            
            case 'heart':
                // Heart shape using path
                const heartSize = size * 0.8;
                const heartPath = `
                    M ${centerX},${centerY + heartSize * 0.3}
                    C ${centerX},${centerY} ${centerX - heartSize * 0.5},${centerY - heartSize * 0.2} ${centerX - heartSize * 0.5},${centerY}
                    C ${centerX - heartSize * 0.5},${centerY + heartSize * 0.3} ${centerX},${centerY + heartSize * 0.6} ${centerX},${centerY + heartSize * 0.9}
                    C ${centerX},${centerY + heartSize * 0.6} ${centerX + heartSize * 0.5},${centerY + heartSize * 0.3} ${centerX + heartSize * 0.5},${centerY}
                    C ${centerX + heartSize * 0.5},${centerY - heartSize * 0.2} ${centerX},${centerY} ${centerX},${centerY + heartSize * 0.3}
                    Z
                `;
                return (
                    <path
                        d={heartPath}
                        style={shapeStyle}
                    />
                );
            
            case 'star':
                // 5-pointed star
                const starSize = size * 0.8;
                const starPoints = [];
                const outerRadius = starSize / 2;
                const innerRadius = outerRadius * 0.4;
                for (let i = 0; i < 10; i++) {
                    const angle = (Math.PI / 5) * i - Math.PI / 2;
                    const radius = i % 2 === 0 ? outerRadius : innerRadius;
                    const x = centerX + radius * Math.cos(angle);
                    const y = centerY + radius * Math.sin(angle);
                    starPoints.push(`${x},${y}`);
                }
                return (
                    <polygon
                        points={starPoints.join(' ')}
                        style={shapeStyle}
                    />
                );
            
            default:
                // Default to circle
                return (
                    <circle
                        cx={centerX}
                        cy={centerY}
                        r={radius - strokeWidth / 2}
                        style={shapeStyle}
                    />
                );
        }
    };
    
    return (
        <svg
            width={overlay.width || 200}
            height={overlay.height || 200}
            style={{
                width: '100%',
                height: '100%',
            }}
        >
            {renderShape()}
        </svg>
    );
};

