export interface PaginatedResponse<T> {
    data: {
        data: T[];
        pagination: {
            total: number;
            pages: number;
            page: number;
            limit: number;
            hasNext: boolean;
            hasPrev: boolean;
        };
    };
    status: number;
    message: string;
}
