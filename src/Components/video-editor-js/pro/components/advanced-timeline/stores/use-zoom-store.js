import { create } from "zustand";
import { persist } from "zustand/middleware";
import { ZOOM_CONSTRAINTS } from "../constants";
const useZoomStore = create()(persist((set) => ({
    zoomState: {
        scale: ZOOM_CONSTRAINTS.default,
        scroll: 0,
    },
    timelineRef: null,
    setZoomState: (zoomState) => {
        set({ zoomState });
    },
    setTimelineRef: (timelineRef) => {
        set({ timelineRef });
    },
}), {
    name: "advanced-timeline-zoom-store",
    partialize: (state) => ({ zoomState: state.zoomState }),
}));
export default useZoomStore;
