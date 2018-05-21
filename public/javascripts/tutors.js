var socket = io.connect();
var tutors = [];
var ele = {
    total: document.querySelector('.right span.count .number'),
    tutorTmp: document.querySelector('.right a.tutor'),
    tutorsList: document.querySelector('.right .online')
};


function createTutorEle(tutor) {
    var tutorEle = ele.tutorTmp.cloneNode(true);
    tutorEle.classList.remove('hide');
    tutorEle.href = tutor.link;
    console.log(tutorEle);
    tutorEle.querySelector('img.img').src = tutor.imgUrl;
    tutorEle.querySelector('.name').innerText = tutor.name;
    
    var subjEle = tutorEle.querySelector('.subjects');
    tutor.subjects.forEach(function(subj){
        var span = document.createElement('span');
        span.classList.add('subj');
        span.innerText = subj
        subjEle.appendChild(span);
    });

    return tutorEle;
}

function renderTutors(data) {
    tutors = data;
    ele.total.innerText = data.length;
    var frag = document.createDocumentFragment();
    tutors.forEach(function(tutor){
        frag.appendChild(createTutorEle(tutor));
    });
    ele.tutorsList.innerHTML = '';
    ele.tutorsList.appendChild(frag); 
}
socket.on('connect', () => {
    console.log('connected getting all available tutors');
    socket.emit('getTutors');
});

socket.on('tutorsChanged', function(data){
    console.log('got tutors changed')
    console.log(data);
    renderTutors(data);
});