import { getLocalSessionVideoAdaptor } from './local-session-video-adaptor';

/**
 * Helper function to get default video adaptors
 * This includes the local session video adaptor that provides videos from window.__SESSION_MEDIA_FILES
 * Similar to how default audio adaptors provide audio tracks
 */
export const getDefaultVideoAdaptors = () => {
    return [getLocalSessionVideoAdaptor()];
};

