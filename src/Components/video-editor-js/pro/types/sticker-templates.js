/**
 * Default sticker template configurations organized by category
 */
export const defaultStickerTemplateConfigs = {
    "Shapes": [
        {
            id: "circle-basic",
            name: "Circle",
            category: "Shapes",
            layout: "single",
            defaultProps: {
                durationInFrames: 150,
                styles: {
                    fill: "#3b82f6",
                    opacity: 1,
                    scale: 1,
                },
            },
        },
        {
            id: "square-basic",
            name: "Square",
            category: "Shapes",
            layout: "single",
            defaultProps: {
                durationInFrames: 150,
                styles: {
                    fill: "#ef4444",
                    opacity: 1,
                    scale: 1,
                },
            },
        },
        {
            id: "triangle-basic",
            name: "Triangle",
            category: "Shapes",
            layout: "single",
            defaultProps: {
                durationInFrames: 150,
                styles: {
                    fill: "#10b981",
                    opacity: 1,
                    scale: 1,
                },
            },
        },
        {
            id: "star-basic",
            name: "Star",
            category: "Shapes",
            layout: "single",
            defaultProps: {
                durationInFrames: 150,
                styles: {
                    fill: "#f59e0b",
                    opacity: 1,
                    scale: 1,
                },
            },
        },
    ],
    "Emojis": [
        {
            id: "emoji-smile",
            name: "Smile",
            category: "Emojis",
            layout: "single",
            defaultProps: {
                durationInFrames: 150,
                styles: {
                    opacity: 1,
                    scale: 1,
                },
            },
        },
        {
            id: "emoji-heart",
            name: "Heart",
            category: "Emojis",
            layout: "single",
            defaultProps: {
                durationInFrames: 150,
                styles: {
                    opacity: 1,
                    scale: 1,
                },
            },
        },
        {
            id: "emoji-fire",
            name: "Fire",
            category: "Emojis",
            layout: "single",
            defaultProps: {
                durationInFrames: 150,
                styles: {
                    opacity: 1,
                    scale: 1,
                },
            },
        },
    ],
    "Reviews": [
        {
            id: "star-rating",
            name: "Star Rating",
            category: "Reviews",
            layout: "double",
            defaultProps: {
                durationInFrames: 150,
                styles: {
                    fill: "#f59e0b",
                    opacity: 1,
                    scale: 1,
                },
            },
        },
        {
            id: "thumbs-up",
            name: "Thumbs Up",
            category: "Reviews",
            layout: "single",
            defaultProps: {
                durationInFrames: 150,
                styles: {
                    opacity: 1,
                    scale: 1,
                },
            },
        },
    ],
    "Discounts": [
        {
            id: "percent-off",
            name: "Percent Off",
            category: "Discounts",
            layout: "single",
            defaultProps: {
                durationInFrames: 150,
                styles: {
                    fill: "#dc2626",
                    stroke: "#ffffff",
                    strokeWidth: 2,
                    opacity: 1,
                    scale: 1,
                },
            },
        },
        {
            id: "sale-badge",
            name: "Sale Badge",
            category: "Discounts",
            layout: "single",
            defaultProps: {
                durationInFrames: 150,
                styles: {
                    fill: "#dc2626",
                    opacity: 1,
                    scale: 1,
                },
            },
        },
    ],
    "Default": [
        {
            id: "default-sticker",
            name: "Default",
            category: "Default",
            layout: "single",
            defaultProps: {
                durationInFrames: 150,
                styles: {
                    opacity: 1,
                    scale: 1,
                },
            },
        },
    ],
};
/**
 * Get all available sticker categories
 */
export const getStickerCategories = () => {
    return Object.keys(defaultStickerTemplateConfigs);
};
/**
 * Get template configs by category
 */
export const getTemplateConfigsByCategory = (category) => {
    return defaultStickerTemplateConfigs[category] || [];
};
/**
 * Content mapping for sticker templates
 */
export const stickerContentMap = {
    "circle-basic": "●",
    "square-basic": "■",
    "triangle-basic": "▲",
    "star-basic": "★",
    "emoji-smile": "😀",
    "emoji-heart": "❤️",
    "emoji-fire": "🔥",
    "star-rating": "⭐⭐⭐⭐⭐",
    "thumbs-up": "👍",
    "percent-off": "50% OFF",
    "sale-badge": "SALE",
    "default-sticker": "🔸",
};
/**
 * Animation type mapping for stickers
 */
export const stickerAnimationMap = {
    "emoji-heart": "pulse",
    "emoji-fire": "bounce",
    "percent-off": "pulse",
};
