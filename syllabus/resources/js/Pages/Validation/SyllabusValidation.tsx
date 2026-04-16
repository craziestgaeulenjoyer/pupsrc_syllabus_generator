export const validateStep1 = (data: any) => {
    const errors: Record<string, string> = {};

    if (!data.course_code) {
        errors.course_code = "Course code is required.";
    }

    if (!data.course_title) {
        errors.course_title = "Course title is required.";
    }

    const isEmptyDescription =
        !data.course_description ||
        data.course_description === "<p><br></p>" ||
        data.course_description === "<p></p>" ||
        data.course_description.replace(/<(.|\n)*?>/g, "").trim() === "";

    if (isEmptyDescription) {
        errors.course_description = "Course description is required.";
    }

    return errors;
};

export const validateCourse = (
    course_code: string,
    course_title: string,
    course_description: string
) => {
    if (!course_code || !course_title || !course_description) {
        return {
            isValid: false,
            message: "All fields in course overview are required",
        };
    }

    return {
        isValid: true,
        message: "",
    };
};