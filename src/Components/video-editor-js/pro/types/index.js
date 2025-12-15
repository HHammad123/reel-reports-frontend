import { z } from "zod";
// Define overlay types enum
export var OverlayType;
(function (OverlayType) {
    OverlayType["TEXT"] = "text";
    OverlayType["IMAGE"] = "image";
    OverlayType["SHAPE"] = "shape";
    OverlayType["VIDEO"] = "video";
    OverlayType["SOUND"] = "sound";
    OverlayType["CAPTION"] = "caption";
    OverlayType["LOCAL_DIR"] = "local-dir";
    OverlayType["STICKER"] = "sticker";
    OverlayType["TEMPLATE"] = "TEMPLATE";
    OverlayType["SETTINGS"] = "settings";
})(OverlayType || (OverlayType = {}));
// Zod schema for composition props
export const CompositionProps = z.object({
    overlays: z.array(z.any()), // Replace with your actual Overlay type
    durationInFrames: z.number(),
    width: z.number(),
    height: z.number(),
    fps: z.number(),
    src: z.string(),
});
// Other types remain the same
export const RenderRequest = z.object({
    id: z.string(),
    inputProps: CompositionProps,
});
export const ProgressRequest = z.object({
    bucketName: z.string(),
    id: z.string(),
});
