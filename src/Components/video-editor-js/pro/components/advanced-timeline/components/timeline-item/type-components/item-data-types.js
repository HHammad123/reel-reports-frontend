// Type-specific data interfaces for timeline items
// Type guard functions to check item data types
export const isVideoItemData = (data) => {
    return data && (data.thumbnailUrl !== undefined || data.fps !== undefined || data.codec !== undefined);
};
export const isAudioItemData = (data) => {
    return data && (data.waveformData !== undefined || data.isLoadingWaveform !== undefined || data.volume !== undefined || data.channels !== undefined);
};
export const isTextItemData = (data) => {
    return data && (data.text !== undefined || data.fontSize !== undefined || data.fontFamily !== undefined);
};
export const isCaptionItemData = (data) => {
    return data && (data.wordTimings !== undefined || data.language !== undefined || data.speaker !== undefined);
};
export const isImageItemData = (data) => {
    return data && (data.width !== undefined || data.height !== undefined || data.format !== undefined);
};
export const isStickerItemData = (data) => {
    return data && (data.stickerUrl !== undefined || data.isAnimated !== undefined || data.tags !== undefined);
};
