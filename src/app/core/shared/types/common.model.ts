export type CommonResponse<T> = {
    success: boolean;
    data: T;
    message?: string;
};

export interface Notification {
  id: string;
  title: string;
  message: string;
  time: string;
  read: boolean;
  icon: string;
  iconColor: string;
}