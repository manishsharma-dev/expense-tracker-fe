export type CommonResponse<T> = {
    success: boolean;
    data: T;
    message?: string;
};