import { jsx as _jsx, Fragment as _Fragment } from "react/jsx-runtime";
import { Composition } from "remotion";
import { Main } from "./main";
import { COMP_NAME } from "../../../../constants";
// Default configuration values - these should be configurable in a real implementation
const DEFAULT_FPS = 30;
const DEFAULT_DURATION_IN_FRAMES = 900; // 30 seconds at 30fps
const DEFAULT_VIDEO_WIDTH = 1920;
const DEFAULT_VIDEO_HEIGHT = 1080;
/**
 * Root component for the Remotion project.
 * Sets up the composition and provides default props.
 */
export const Root = () => {
    // Default props for the Main component
    const defaultProps = {
        overlays: [],
        selectedOverlayId: null,
        durationInFrames: DEFAULT_DURATION_IN_FRAMES,
        fps: DEFAULT_FPS,
        width: DEFAULT_VIDEO_WIDTH,
        height: DEFAULT_VIDEO_HEIGHT,
        setSelectedOverlayId: () => { },
        changeOverlay: () => { },
    };
    return (_jsx(_Fragment, { children: _jsx(Composition, { id: COMP_NAME, component: Main, durationInFrames: DEFAULT_DURATION_IN_FRAMES, fps: DEFAULT_FPS, width: DEFAULT_VIDEO_WIDTH, height: DEFAULT_VIDEO_HEIGHT, 
            /**
             * Dynamically calculates the video metadata based on the composition props.
             * These values will be reflected in the Remotion player/preview.
             * When the composition renders, it will use these dimensions and duration.
             *
             * @param props - The composition props passed to the component
             * @returns An object containing the video dimensions and duration
             */
            calculateMetadata: async ({ props }) => {
                return {
                    durationInFrames: props.durationInFrames,
                    width: props.width,
                    height: props.height,
                };
            }, defaultProps: defaultProps }) }));
};
