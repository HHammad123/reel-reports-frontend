import { jsx as _jsx } from "react/jsx-runtime";
import { memo, useCallback, useRef } from "react";
import { Player } from "@remotion/player";
import { Sequence } from "remotion";
import { OverlayType } from "../../../types";
// Wrapper component for sticker preview with static frame
const StickerPreview = memo(({ template, onClick }) => {
    var _a, _b;
    const playerRef = useRef(null);
    const { Component } = template;
    const stickerDuration = ((_a = template.config.defaultProps) === null || _a === void 0 ? void 0 : _a.durationInFrames) || 100;
    const previewProps = {
        overlay: {
            id: -1,
            type: OverlayType.STICKER,
            content: template.config.id,
            category: template.config.category,
            durationInFrames: stickerDuration,
            from: 0,
            height: 100,
            width: 200,
            left: 0,
            top: 0,
            row: 0,
            isDragging: false,
            rotation: 0,
            styles: {
                opacity: 1,
                ...(_b = template.config.defaultProps) === null || _b === void 0 ? void 0 : _b.styles,
            },
        },
        isSelected: false,
        ...template.config.defaultProps,
    };
    const MemoizedComponent = memo(Component);
    const PreviewComponent = () => (_jsx(Sequence, { from: 0, durationInFrames: stickerDuration, children: _jsx(MemoizedComponent, { ...previewProps }) }));
    const handleMouseEnter = useCallback(() => {
        if (playerRef.current) {
            playerRef.current.seekTo(0);
            playerRef.current.play();
        }
    }, []);
    const handleMouseLeave = useCallback(() => {
        if (playerRef.current) {
            playerRef.current.pause();
            playerRef.current.seekTo(15);
        }
    }, []);
    return (_jsx("button", { onClick: onClick, onMouseEnter: handleMouseEnter, onMouseLeave: handleMouseLeave, className: `
          group relative w-full h-full
          rounded-lg bg-white
          border border-[#E5E2FF]
          hover:border-[#13008B]
          hover:bg-[#E5E2FF]/30
          transition-all duration-200 overflow-hidden
          ${template.config.isPro ? "relative" : ""}
        `, children: _jsx("div", { className: "absolute inset-0 flex items-center justify-center", children: _jsx(Player, { ref: playerRef, component: PreviewComponent, durationInFrames: stickerDuration, compositionWidth: template.config.layout === "double" ? 400 : 200, compositionHeight: 200, fps: 30, initialFrame: 15, acknowledgeRemotionLicense: true, autoPlay: false, loop: true, controls: false, style: {
                    width: template.config.layout === "double" ? "100%" : "200px",
                    height: "200px",
                } }) }) }));
}, (prevProps, nextProps) => prevProps.template.config.id === nextProps.template.config.id);
StickerPreview.displayName = "StickerPreview";
export { StickerPreview };
