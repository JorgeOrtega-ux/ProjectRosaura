// public/assets/js/core/api-routes.js

export const ApiRoutes = {
    Auth: {
        Login: 'auth.login',
        RegisterStep1: 'auth.register.step1',
        RegisterStep2: 'auth.register.step2',
        RegisterVerify: 'auth.register.verify',
        Logout: 'auth.logout',
        ForgotPassword: 'auth.forgot_password',
        ResetPassword: 'auth.reset_password'
    },
    Settings: {
        UpdateAvatar: 'settings.update_avatar',
        DeleteAvatar: 'settings.delete_avatar',
        UpdateUsername: 'settings.update_username',
        RequestEmailCode: 'settings.request_email_code',
        VerifyEmailCode: 'settings.verify_email_code',
        UpdateEmail: 'settings.update_email',
        // NUEVO:
        UpdatePreferences: 'settings.update_preferences'
    }
};