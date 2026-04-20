export const validateStep1 = (data: any) => {
    const errors: Record<string, string> = {};

    if (!data.course_code) {
        errors.course_code = "Enter course code e.g., COMP 001 ";
    }

    if (!data.course_title) {
        errors.course_title = "Enter course title e.g., Introduction to Computing";
    }

    const isEmptyDescription =
        !data.course_description ||
        data.course_description === "<p><br></p>" ||
        data.course_description === "<p></p>" ||
        data.course_description.replace(/<(.|\n)*?>/g, "").trim() === "";

    if (isEmptyDescription) {
        errors.course_description = "Enter course description.";
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

export const validateStep2 = (
    plos: { id: number; label: string }[],
    clos: { id: number; text: string }[],
    iloMapping: Record<string, boolean>,
    ploMapping: Record<string, string | null>
): Record<string, string> => {

    const errors: Record<string, string> = {};

    // ✅ PLO validation
    plos.forEach((plo, idx) => {
        if (!plo.label.trim()) {
            errors[`plo_${idx}`] = "Enter a PLO description";
        }

        const hasMapping = Object.keys(iloMapping).some(
            key => key.startsWith(`${plo.id}-`) && iloMapping[key]
        );

        if (!hasMapping) {
            errors[`plo_map_${idx}`] = "Select at least one ILO";
        }
    });

clos.forEach((clo, idx) => {
    if (!clo.text.trim()) {
        errors[`clo_${idx}`] = "Enter a CLO description";
    }

    // ✅ Check if at least ONE PLO mapping exists in this row
    const hasAtLeastOneMapping = plos.some((plo) => {
        const value = ploMapping[`${clo.id}-${plo.id}`];

        return (
            value &&
            (
                ['L', 'P', 'O'].includes(value.toUpperCase()) ||
                /^\(?\d+\)?$/.test(value)
            )
        );
    });

    if (!hasAtLeastOneMapping) {
        errors[`clo_map_${idx}`] = "Select at least one PLO mapping";
    }
});
    return errors;
};