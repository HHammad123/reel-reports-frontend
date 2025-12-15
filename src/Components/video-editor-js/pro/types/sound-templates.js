/**
 * Sound categories for organization
 */
export const soundCategories = [
    'Background Music',
    'Sound Effects',
    'Ambient',
    'Transitions',
    'Voice Over'
];
/**
 * Default sound templates (placeholders)
 * In a real implementation, these would reference actual audio files
 */
export const defaultSoundTemplates = [
    {
        id: 'upbeat-1',
        name: 'Upbeat Energy',
        category: 'Background Music',
        duration: 120,
        url: 'https://www.soundjay.com/misc/sounds/bell-ringing-05.wav', // Sample URL
        description: 'Energetic background music perfect for promotional content',
        tags: ['upbeat', 'energetic', 'commercial']
    },
    {
        id: 'ambient-1',
        name: 'Peaceful Ambient',
        category: 'Ambient',
        duration: 180,
        url: 'https://www.soundjay.com/misc/sounds/bell-ringing-05.wav', // Sample URL
        description: 'Calm ambient sounds for relaxation content',
        tags: ['calm', 'peaceful', 'meditation']
    },
    {
        id: 'transition-1',
        name: 'Swoosh Transition',
        category: 'Transitions',
        duration: 2,
        url: 'https://www.soundjay.com/misc/sounds/bell-ringing-05.wav', // Sample URL
        description: 'Quick transition sound effect',
        tags: ['transition', 'swoosh', 'quick']
    },
    {
        id: 'click-1',
        name: 'Button Click',
        category: 'Sound Effects',
        duration: 0.5,
        url: 'https://www.soundjay.com/misc/sounds/bell-ringing-05.wav', // Sample URL
        description: 'Clean button click sound',
        tags: ['click', 'button', 'ui']
    },
    {
        id: 'notification-1',
        name: 'Notification Bell',
        category: 'Sound Effects',
        duration: 1,
        url: 'https://www.soundjay.com/misc/sounds/bell-ringing-05.wav', // Sample URL
        description: 'Gentle notification sound',
        tags: ['notification', 'bell', 'alert']
    }
];
