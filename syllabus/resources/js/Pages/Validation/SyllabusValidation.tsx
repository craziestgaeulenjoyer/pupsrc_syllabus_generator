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

interface ValidationResult {
    isValid: boolean;
    message?: string;
    errors?: Record<string, string>;
}

export const validateStep5 = (data: any): ValidationResult => {
    const {
        classInfo = {},
        facultyInfo = {},
        signatories = []
    } = data;

    const errors: Record<string, string> = {};

    // --- CLASS INFO ---
    if (!classInfo.section?.trim()) {
        errors.section = "Enter a section";
    }

    if (!classInfo.semester?.trim()) {
        errors.semester = "Enter a Semester and Academic Year";
    }

    if (!classInfo.time?.trim()) {
        errors.time = "Enter a class time";
    }

    if (!classInfo.room?.trim()) {
        errors.room = "Enter a room number";
    }

    // --- FACULTY INFO ---
    if (!facultyInfo.name?.trim()) {
        errors.name = "Enter a faculty name";
    }

    if (!facultyInfo.consultation?.trim()) {
        errors.consultation = "Enter a consultation time";
    }

    if (!facultyInfo.contact?.trim()) {
        errors.contact = "Enter a contact number";
    } else {
        const contact = facultyInfo.contact.replace(/\D/g, '');
        if (contact.length !== 11) {
            errors.contact = "Contact number must be exactly 11 digits.";
        }
    }

    if (!facultyInfo.email?.trim()) {
        errors.email = "Enter an email address";
    } else {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(facultyInfo.email)) {
            errors.email = "Invalid email format.";
        }
    }

    // --- SIGNATORIES VALIDATION ---
    if (!signatories.length) {
        errors.signatories = "At least one signatory is required.";
    } else {
        signatories.forEach((sig: any) => {

              if (!sig.role?.trim()) {
                errors[`signatory_role_${sig.id}`] = "Enter a role";
            }

            // NAME (required)
            if (!sig.name?.trim()) {
                errors[`signatory_name_${sig.id}`] = "Enter a name";
            }

            // TITLE (required)
            if (!sig.title?.trim()) {
                errors[`signatory_title_${sig.id}`] = "Enter a position";
            }

            // ROLE = optional (no validation)
            // SIGNATURE = optional (no validation)
        });
    }

    // --- FINAL RESPONSE ---
    if (Object.keys(errors).length > 0) {
        return {
            isValid: false,
            message: "Please fix the errors before proceeding.",
            errors
        };
    }

    return {
        isValid: true
    };
};