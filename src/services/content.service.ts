import { axiosInstance } from "@/src/utils/axios-instance";
import { routes } from "@/src/routes/routes";
import type { ContentDetailResponse } from "@/src/types/api.types";

/**
 * Content Service
 * تمام API calls مربوط به content
 */

export const contentService = {
    /**
     * Display the specified content item
     */
    getById: async (id: string) => {
        const response = await axiosInstance.get<ContentDetailResponse>(routes.content.getById(id));
        return response.data;
    },
};
