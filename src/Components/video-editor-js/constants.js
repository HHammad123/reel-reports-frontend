// Shared constants for the compiled video editor bundle
export const FPS = 30;

export const DEFAULT_DIMENSIONS = {
  width: 1080,
  height: 1920,
};

// Default durations for still images when added to the timeline
export const DEFAULT_IMAGE_DURATION_FRAMES = FPS * 5; // 5 seconds at 30fps
export const IMAGE_DURATION_PERCENTAGE = 0.15; // 15% of total timeline if duration available

export const EXPORT_PRESETS = {
  fps: FPS,
  width: DEFAULT_DIMENSIONS.width,
  height: DEFAULT_DIMENSIONS.height,
};

