export type OtpRequest = {
    identifier: string;
};

export type LoginResponse = {
    token: string;
    sessionId?: string;
    user?: unknown;
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
