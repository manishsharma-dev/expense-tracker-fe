import { Country } from './expense.model';

export type UserGender = 'female' | 'male' | 'non_binary' | 'prefer_not_to_say' | 'other';

export type UserProfile = {
    _id: string;
    name?: string;
    email?: string;
    phone?: string;
    gender?: UserGender;
    dateOfBirth?: string;
    country?: Country;
    isActive?: boolean;
    profileReminderDismissedAt?: string;
    profileComplete?: boolean;
    shouldPromptProfile?: boolean;
};

export type OtpRequest = {
    identifier: string;
};

export type LoginResponse = {
    csrfToken?: string;
    sessionId?: string;
    user?: UserProfile;
};

export type OtpRequestResponse = {
    deliveryMethod: 'email' | 'phone';
    expiresIn: number;
    otp?: string;
};

export type OtpVerifyRequest = {
    identifier: string;
    otp: string;
    deviceId?: string;
};

export type UpdateProfileRequest = {
    name?: string;
    email?: string;
    phone?: string;
    gender?: UserGender | '';
    dateOfBirth?: string;
    country?: string;
};
