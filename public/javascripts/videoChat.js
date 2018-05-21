var socket = io.connect();

socket.on("connect", function (data) {
  console.log("sending event: going live");
  socket.emit("goingLive");
});

socket.on("sessionRequest", function (data) {
  var pop = confirm(
    data.name + " is requesting tutoring for: " + data.minutes + " minutes?"
  );
  if (pop) {
    socket.emit("sessionAccepted", data.id);
  } else {
    socket.emit("sessionRejected", data.id);
  }
});

socket.on("sessionStart", function (data) {
  setupWebRTC(data.initiator);
});

class SignalingCtrl {
  constructor() {
    this.onmessage = null;
    socket.on("message", d => this.onmessage(d));
  }

  send(type, data) {
    socket.emit("message", { type: type, data: data });
  }
}

async function setupWebRTC(initiator) {
  let remote_v = document.getElementById("rtc_video");
  let local_v = document.getElementById("my_video");
  let configuration = {
    iceServers: [
      {
        urls: "stun:numb.viagenie.ca",
        username: "myemailum14@gmail.com",
        credential: "thunder1111"
      },
      {
        urls: "stun:stun1.l.google.com:19302"
      },
      //  {
      //   urls: "stun:stun2.l.google.com:19302"
      // }, 
      // {
      //   urls: "stun:stun3.l.google.com:19302"
      // }, {
      //   urls: "stun:stun4.l.google.com:19302"
      // },
      {
        urls: "turn:numb.viagenie.ca",
        username: "myemailum14@gmail.com",
        credential: "thunder1111"
      }
    ]
  };


  let rpc = new SignalingCtrl();
  let pc = null;
  let stream = null;
  let mediaConstraints = {
    video: true,
    audio: true
  };
  let sdpConstraints = {
    offerToReceiveAudio: true,
    offerToReceiveVideo: true
  };

  rpc.onmessage = function (msg) {
    console.log(`got msg ${msg.type}`);
    switch (msg.type) {
      case "SDPoffer":
        handleOffer(msg.data);
        break;
      case "SDPanswer":
        addAnswer(msg.data);
        break;
      case "icecandidate":
        addRICE(msg.data);
        break;
      default:
        console.log("unknown message", msg.type);
        break;
    }
  };



  if (initiator) {
    stream = await navigator.mediaDevices.getUserMedia(mediaConstraints);
    pc = new RTCPeerConnection(configuration);
    stream.getTracks().forEach(track => pc.addTrack(track, stream));
    local_v.srcObject = stream;

    pc.onicecandidate = handleICEcandidate;
    pc.oniceconnectionstatechange = e => console.log("ice state: ", pc.iceConnectionState);
    pc.onnegotiationneeded = createOffer;
    pc.ontrack = e => {
      console.log(e.streams);
      remote_v.srcObject = e.streams[0];
    };
  }



  async function createOffer() {
    if (!initiator) return;
    await pc.setLocalDescription(await pc.createOffer(sdpConstraints));
    rpc.send("SDPoffer", { sdp: pc.localDescription });
  }

  function handleICEcandidate(evt) {
    if (!evt.candidate) return;
    console.log("adding ice for self", evt.target.iceGatheringState);
    rpc.send("icecandidate", { candidate: evt.candidate });
  }

  async function addRICE(d) {
    console.log("adding remote ice");
    await pc.addIceCandidate(new RTCIceCandidate(d.candidate));
  }

  async function handleOffer(data) {
    console.log("got remote offer");
    if (!pc) {
      pc = new RTCPeerConnection(configuration);
      pc.onicecandidate = handleICEcandidate;
      pc.oniceconnectionstatechange = e => console.log("ice state: ", pc.iceConnectionState);
      pc.onnegotiationneeded = createOffer;
      pc.ontrack = e => {
        console.log(e.streams);
        remote_v.srcObject = e.streams[0];
      };
    }
    try {
      await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
      debugger;
      stream = await navigator.mediaDevices.getUserMedia(mediaConstraints);
      stream.getTracks().forEach(track => pc.addTrack(track, stream));
      local_v.srcObject = stream;
      await pc.setLocalDescription(await pc.createAnswer(sdpConstraints));
      console.log('answer sent');
      rpc.send("SDPanswer", { sdp: pc.localDescription });
    } catch (error) {
      console.log(error);
    }
  }

  async function addAnswer(answer) {
    console.log("got answer");
    await pc.setRemoteDescription(new RTCSessionDescription(answer.sdp));
  }


}

// function setupWebRTC(initiator) {
//     let v = document.getElementById('rtc_video');
//     let me = document.getElementById('my_video');
//     let signalCtrl = new SignalingCtrl();
//     let configuration = { 'iceServers': [{ 'urls': 'stun:stun.example.org' }] };
//     let pc = new RTCPeerConnection(configuration);
//     let stack = [];
//     window.pc = pc;
//     function unloadStack() {
//         let t = null;
//         while (t = stack.shift()) {
//             console.log('added ice from stack');
//             pc.e => pc.addIceCandidate(e)Candidate(new RTCIceCandidate(t.candidate)).catch(logErr);
//         }
//     }

//     //when get ice tell remote peer
//     pc.onicecandidate = e => {
//         if (!e || !e.candidate) return;
//         signalCtrl.send('icecandidate', { candidate: e.candidate })
//     };

//     pc.ontrack = e => v.srcObject = e.streams[0];
//     pc.oniceconnectionstatechange = e => console.log(pc.iceConnectionState);

//     if (initiator) {
//         console.log('im intiating');
//         pc.createOffer({ offerToReceiveAudio: 1, offerToReceiveVideo: 1 }).
//             then(offer => pc.setLocalDescription(offer)).
//             catch(logErr);
//     }

//     pc.onnegotiationneeded = e => {
//         if (initiator) {
//             console.log('sending sdp offer');
//             signalCtrl.send('SDPoffer', { sdp: pc.localDescription });
//         }
//     }

//     signalCtrl.onPeerICE = e => pc.addIceCandidate(e);   //when get ice from remote peer add it
//     signalCtrl.onSDPoffer = debounce(createAnswer);   //when and if get an offer reply with answer
//     signalCtrl.onSDPanswer = debounce(answerHandler);   //if get an answer add it

//     function addIce(e) {
//         console.log('got ice candidate');
//         if (pc.remoteDescription.sdp == '') {
//             stack.push(e); console.log('added to stack');
//         } else {
//             pc.addIceCandidate(new RTCIceCandidate(e.candidate)).catch(logErr);
//         }
//     };

//     function createAnswer(e) {
//         return new Promise((resolve, reject) => {
//             console.log('got offer', e.sdp);
//             pc.setRemoteDescription(new RTCSessionDescription(e.sdp))
//                 .then(() => pc.createAnswer({ offerToReceiveAudio: 1, offerToReceiveVideo: 1 }))
//                 .then(answer => pc.setLocalDescription(answer))
//                 .then(() => unloadStack())
//                 .then(() => signalCtrl.send('SDPanswer', { sdp: pc.localDescription }))
//                 .then(setTimeout(() => resolve(), 1000))
//                 .catch(logErr);
//         });
//     }

//     async function answerHandler(e) {
//         return new Promise((resolve, reject) => {
//             console.log('got answer');
//             console.log(e);
//             pc.setRemoteDescription(new RTCSessionDescription(e.sdp))
//                 .then(() => unloadStack())
//                 .catch(logErr);
//             resolve();
//         });
//     }

//     //get camera and add it to RTC connection
//     navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then((stream) => {
//         stream.getTracks().forEach(track => pc.addTrack(track, stream));
//         me.srcObject = stream;
//     }).catch(logErr);

// }

function debounce(func) {
  let p = Promise.resolve();

  return function (x) {
    p = p.then(() => func(x));
  };
}

function logErr(err) {
  console.log(err);
}
// var signalingChannel = new SignalingChannel();
// var configuration = {
//   'iceServers': [{'urls': 'stun:stun.example.org'}]
// };

// var pc;

// // call start() to initiate

// function start() {
//   pc = new RTCPeerConnection(configuration);

//   // send any ice candidates to the other peer
//   pc.onicecandidate = function (evt) {
//     if (evt.candidate)
//       signalingChannel.send(JSON.stringify({
//         'candidate': evt.candidate
//       }));
//   };

//   // let the 'negotiationneeded' event trigger offer generation
//   pc.onnegotiationneeded = function () {
//     pc.createOffer(localDescCreated, logError);
//   }

//   // once remote stream arrives, show it in the remote video element
//   pc.onaddstream = function (evt) {
//     remoteView.src = URL.createObjectURL(evt.stream);
//   };

//   // get a local stream, show it in a self-view and add it to be sent
//   navigator.getUserMedia({
//     'audio': true,
//     'video': true
//   }, function (stream) {
//     selfView.src = URL.createObjectURL(stream);
//     pc.addStream(stream);
//   }, logError);
// }

// function localDescCreated(desc) {
//   pc.setLocalDescription(desc, function () {
//     signalingChannel.send(JSON.stringify({
//       'sdp': pc.localDescription
//     }));
//   }, logError);
// }

// signalingChannel.onmessage = function (evt) {
//   if (!pc)
//     start();

//   var message = JSON.parse(evt.data);
//   if (message.sdp)
//     pc.setRemoteDescription(new RTCSessionDescription(message.sdp), function () {
//       // if we received an offer, we need to answer
//       if (pc.remoteDescription.type == 'offer')
//         pc.createAnswer(localDescCreated, logError);
//     }, logError);
//   else
//     pc.addIceCandidate(new RTCIceCandidate(message.candidate));
// };

// function logError(error) {
//   log(error.name + ': ' + error.message);
// }
