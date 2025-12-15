import { jsx as _jsx } from "react/jsx-runtime";
import { memo, useMemo } from "react";
/**
 * WaveformVisualizer Component
 *
 * A memoized component that renders an audio waveform visualization.
 * Features:
 * - Responsive visualization that scales with the duration
 * - Automatic peak sampling for optimal display
 * - Visual representation of audio amplitude
 *
 * The component uses a logarithmic scale (power of 0.7) to better represent
 * the perceived loudness of the audio.
 *
 * @component
 * @param {WaveformVisualizerProps} props - Component properties
 * @returns {JSX.Element} Rendered waveform visualization
 */
const WaveformVisualizer = memo(({ waveformData, totalDuration, durationInFrames, }) => {
    const itemWidth = (durationInFrames / totalDuration) * 100;
    const peaksToShow = Math.min(waveformData.peaks.length, Math.max(50, Math.floor(itemWidth * 4)));
    const sampledPeaks = useMemo(() => waveformData.peaks.filter((_, index) => index % Math.ceil(waveformData.peaks.length / peaksToShow) === 0), [waveformData.peaks, peaksToShow]);
    return (_jsx("div", { className: "absolute inset-0 flex items-center justify-between px-2", children: sampledPeaks.map((peak, index) => {
            const height = Math.max(Math.pow(peak, 0.7) * 90, 4);
            return (_jsx("div", { className: "relative flex-1 mx-[0.5px]", style: { height: "100%" }, children: _jsx("div", { className: "absolute bottom-1/2 w-full bg-waveform-bar rounded-sm transform origin-center", style: {
                        height: `${height}%`,
                        transform: `translateY(50%)`,
                    } }) }, index));
        }) }));
});
WaveformVisualizer.displayName = "WaveformVisualizer";
export default WaveformVisualizer;
