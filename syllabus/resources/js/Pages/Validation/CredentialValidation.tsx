//Validation for Login
export const validateEmail = (email: string): string | null => {
    if (!email) {
        return "Email is empty. Please enter your email address";
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email)) {
        return "Please enter a valid email address";
    }

    return null;
};

export const validateLogin = (email: string, password: string) => {
    if (!email && !password) {
        return {
            isValid: false,
            message: "Email and password are required",
        };
    }

    if (!email) {
        return {
            isValid: false,
            message: "Email is required",
        };
    }

    if (!password) {
        return {
            isValid: false,
            message: "Password is required",
        };
    }

    const emailError = validateEmail(email);

    if (emailError) {
        return {
            isValid: false,
            message: emailError,
        };
    }

    return {
        isValid: true,
        message: "",
    };
};

//Validation for Forgot Password 
export const validateForgotPassword = (email: string) => {
    if (!email) {
        return {
            isValid: false,
            message: "Email is required",
        };
    }

    const emailError = validateEmail(email);

    if (emailError) {
        return {
            isValid: false,
            message: emailError,
        };
    }

    return {
        isValid: true,
        message: "",
    };
};

//Validation for OTP
export const validateOTP = (code: string) => {
    if (!code) {
        return {
            isValid: false,
            message: "Verification code is required",
        };
    }

    if (code.length !== 6) {
        return {
            isValid: false,
            message: "Please enter the 6-digit code",
        };
    }

    if (!/^\d{6}$/.test(code)) {
        return {
            isValid: false,
            message: "Code must contain only numbers",
        };
    }

    return {
        isValid: true,
        message: "",
    };
};

//Validation for Reset Password
export const validateResetPassword = (
    password: string,
    confirmPassword: string
) => {
    if (!password && !confirmPassword) {
        return {
            isValid: false,
            message: "Password and confirmation are required",
        };
    }

    if (!password) {
        return {
            isValid: false,
            message: "Password is required",
        };
    }

    if (!confirmPassword) {
        return {
            isValid: false,
            message: "Please confirm your password",
        };
    }

    // ✅ FIRST: check match
    if (password !== confirmPassword) {
        return {
            isValid: false,
            message: "Passwords do not match",
        };
    }

    // ✅ THEN: check strength/length
    if (password.length < 6) {
        return {
            isValid: false,
            message: "Password must be at least 6 characters",
        };
    }

    return {
        isValid: true,
        message: "",
    };
};