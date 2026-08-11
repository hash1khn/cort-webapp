/** Response from a delete endpoint that may defer to a super-admin approval request instead of deleting immediately. */
export interface DeleteRecordResult {
    message: string;
    requiresApproval: boolean;
    requestId?: number;
}

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
