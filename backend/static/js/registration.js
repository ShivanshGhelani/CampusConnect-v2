// Form validation and dynamic features
document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('registrationForm');
    const semesterInput = document.getElementById('semester');
    const yearSpan = document.getElementById('year');

    console.log('Form elements found:', {
        form: !!form,
        semesterInput: !!semesterInput,
        yearSpan: !!yearSpan
    });

    // Function to calculate year from semester (matches backend calculation)
    function calculateYear(semester) {
        if (!semester || semester < 1 || semester > 8) {
            console.log('Invalid semester value:', semester);
            return '-';
        }
        const year = Math.floor((semester - 1) / 2) + 1;
        console.log('Calculated year:', { semester, year });
        return year;
    }

    // Function to update year display
    function updateYearDisplay() {
        if (semesterInput && yearSpan) {
            const semester = parseInt(semesterInput.value);
            const year = calculateYear(semester);
            yearSpan.textContent = year;
            console.log('Updated year display:', { semester, year, yearSpanText: yearSpan.textContent });
        } else {
            console.log('Missing elements:', { semesterInput: !!semesterInput, yearSpan: !!yearSpan });
        }
    }

    // Update year when semester changes
    if (semesterInput && yearSpan) {
        console.log('Initial semester value:', semesterInput.value);
        
        // Update year immediately if semester is already selected
        if (semesterInput.value) {
            updateYearDisplay();
        }
        
        // Update year when semester value changes
        semesterInput.addEventListener('change', function(e) {
            console.log('Semester changed:', e.target.value);
            updateYearDisplay();
        });
    }

    // Real-time validation
    if (form) {
        const inputs = form.querySelectorAll('input, select');
        inputs.forEach(input => {
            input.addEventListener('blur', function() {
                validateField(this);
            });
        });

        form.addEventListener('submit', function(e) {
            e.preventDefault();
            if (validateForm()) {
                this.submit();
            }
        });
    }

    // Field validation functions
    function validateField(field) {
        const fieldName = field.name;
        const value = field.value.trim();
        let isValid = true;
        let errorMessage = '';

        switch (fieldName) {
            case 'full_name':
                isValid = value.length >= 2;
                errorMessage = 'Full name must be at least 2 characters long';
                break;

            case 'enrollment_no':
                isValid = /^\d{2}[A-Z]{2,4}\d{5}$/.test(value);
                errorMessage = 'Invalid enrollment number format (e.g., 21BECE40015)';
                break;

            case 'email':
                isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
                errorMessage = 'Please enter a valid email address';
                break;

            case 'mobile_no':
                isValid = /^[0-9]{10}$/.test(value);
                errorMessage = 'Mobile number must be 10 digits';
                break;

            case 'semester':
                const semValue = parseInt(value);
                isValid = semValue >= 1 && semValue <= 8;
                errorMessage = 'Semester must be between 1 and 8';
                break;

            case 'department':
                isValid = value.length > 0;
                errorMessage = 'Please select your department';
                break;

            case 'gender':
                isValid = ['male', 'female', 'other'].includes(value.toLowerCase());
                errorMessage = 'Please select your gender';
                break;

            case 'date_of_birth':
                isValid = /^\d{4}-\d{2}-\d{2}$/.test(value);
                errorMessage = 'Please enter a valid date in YYYY-MM-DD format';
                break;
        }

        const errorElement = field.nextElementSibling;
        if (!isValid && value !== '') {
            field.classList.add('border-red-500');
            if (errorElement && errorElement.classList.contains('error-message')) {
                errorElement.textContent = errorMessage;
                errorElement.style.display = 'block';
            }
        } else {
            field.classList.remove('border-red-500');
            if (errorElement && errorElement.classList.contains('error-message')) {
                errorElement.style.display = 'none';
            }
        }

        return isValid;
    }

    // Form validation
    function validateForm() {
        let isValid = true;
        const inputs = form.querySelectorAll('input, select');
        
        inputs.forEach(input => {
            if (!validateField(input)) {
                isValid = false;
            }
        });

        return isValid;
    }
});
