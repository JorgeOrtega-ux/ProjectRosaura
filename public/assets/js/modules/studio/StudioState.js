export class StudioState {
    constructor() {
        this.currentVideos = new Map();
        this.selectedVideoId = null;
        this.selectedManageVideoId = null;
    }

    getVideo(id) {
        return this.currentVideos.get(String(id));
    }

    setVideo(id, data) {
        this.currentVideos.set(String(id), data);
    }

    deleteVideo(id) {
        this.currentVideos.delete(String(id));
    }

    clear() {
        this.currentVideos.clear();
    }
}

export const studioState = new StudioState();