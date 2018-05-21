var element = document.querySelector('input[type="checkbox"][name="tutor"]');
var tutorForm = document.querySelector('#tutorForm');
tutorForm.style.display = 'none';

element.onchange = toggleTutorForm;

toggleTutorForm();


function toggleTutorForm() {
    if (element.checked) {
        tutorForm.style.display = 'block';
    } else {
        tutorForm.style.display = 'none';
    }
}