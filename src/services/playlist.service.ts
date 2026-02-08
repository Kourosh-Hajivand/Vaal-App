import { axiosInstance } from "@/src/utils/axios-instance";
import { routes } from "@/src/routes/routes";
import type { PlaylistDetailResponse } from "@/src/types/api.types";

/**
 * Playlist Service
 * تمام API calls مربوط به playlists
 */

export const playlistService = {
    /**
     * Display the specified playlist
     */
    getById: async (id: string) => {
        const response = await axiosInstance.get<PlaylistDetailResponse>(routes.playlists.getById(id));
        return response.data;
    },
};
