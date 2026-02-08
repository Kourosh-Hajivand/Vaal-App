import { axiosInstance } from "@/src/utils/axios-instance";
import { routes } from "@/src/routes/routes";
import type { AnnouncementDetailResponse } from "@/src/types/api.types";

/**
 * Announcement Service
 * تمام API calls مربوط به announcements
 */

export const announcementService = {
    /**
     * Get a single announcement by ID
     */
    getById: async (id: string) => {
        const response = await axiosInstance.get<AnnouncementDetailResponse>(routes.announcements.getById(id));
        return response.data;
    },
};
