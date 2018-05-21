var submit_btn = document.querySelector('.action'),
    form = document.getElementById('sessForm');

submit_btn.addEventListener('click', submitForm);

function submitForm(e) {
    form.submit();
}