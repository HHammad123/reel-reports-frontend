import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { memo, useRef, useEffect } from 'react';
import { Volume2, Loader2 } from 'lucide-react';
import { TimelineItemLabel } from './timeline-item-label';
// High-performance Canvas-based waveform renderer
const AudioWaveform = memo(({ waveformData, itemWidth, itemHeight }) => {
    const canvasRef = useRef(null);
    useEffect(() => {
        var _a;
        const canvas = canvasRef.current;
        if (!canvas || !((_a = waveformData === null || waveformData === void 0 ? void 0 : waveformData.peaks) === null || _a === void 0 ? void 0 : _a.length) || itemWidth < 10)
            return;
        const ctx = canvas.getContext('2d');
        if (!ctx)
            return;
        // Set canvas size
        const dpr = window.devicePixelRatio || 1;
        canvas.width = itemWidth * dpr;
        canvas.height = itemHeight * dpr;
        ctx.scale(dpr, dpr);
        canvas.style.width = `${itemWidth}px`;
        canvas.style.height = `${itemHeight}px`;
        // Clear canvas
        ctx.clearRect(0, 0, itemWidth, itemHeight);
        // Calculate bar dimensions
        const peaks = waveformData.peaks;
        const barCount = Math.min(peaks.length, Math.floor(itemWidth / 2)); // 2px per bar minimum
        const barWidth = itemWidth / barCount;
        const centerY = itemHeight / 2;
        // Draw waveform bars
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        for (let i = 0; i < barCount; i++) {
            const peakIndex = Math.floor((i / barCount) * peaks.length);
            const amplitude = peaks[peakIndex] || 0;
            const barHeight = Math.max(2, amplitude * itemHeight * 0.8);
            const x = i * barWidth + barWidth * 0.2;
            const y = centerY - barHeight / 2;
            const width = barWidth * 0.6;
            ctx.fillRect(x, y, width, barHeight);
        }
    }, [waveformData, itemWidth, itemHeight]);
    return (_jsx("canvas", { ref: canvasRef, className: "w-full h-full", style: { imageRendering: 'crisp-edges' } }));
});
AudioWaveform.displayName = "AudioWaveform";
export const AudioItemContent = ({ label, data, itemWidth, itemHeight, isHovering = false }) => {
    const iconClassName = `w-3 h-3 ${(data === null || data === void 0 ? void 0 : data.isMuted) ? 'text-red-400' : 'text-white/80'}`;
    return (_jsxs("div", { className: "relative h-full w-full overflow-hidden", children: [(data === null || data === void 0 ? void 0 : data.waveformData) && !(data === null || data === void 0 ? void 0 : data.isLoadingWaveform) ? (_jsx("div", { className: "absolute inset-0", children: _jsx(AudioWaveform, { waveformData: data.waveformData, itemWidth: itemWidth, itemHeight: itemHeight }) })) : (data === null || data === void 0 ? void 0 : data.isLoadingWaveform) ? (_jsx("div", { className: "absolute inset-0 flex items-center justify-center bg-blue-500/20", children: _jsxs("div", { className: "flex items-center gap-2 px-2 py-1 bg-black/30 rounded backdrop-blur-sm", children: [_jsx(Loader2, { className: "w-3 h-3 animate-spin text-white/80" }), _jsx("span", { className: "text-xs text-white/80", children: "Loading..." })] }) })) : (_jsx("div", { className: "absolute inset-0 flex items-center justify-center bg-blue-500/30", children: _jsx("span", { className: "text-xs text-white/60", children: "No waveform" }) })), _jsx("div", { className: "absolute inset-0 flex items-center justify-start z-10 px-2", children: _jsx(TimelineItemLabel, { icon: Volume2, label: label, defaultLabel: "AUDIO", iconClassName: iconClassName, isHovering: isHovering, showBackground: true }) })] }));
};
