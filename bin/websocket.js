let io = require("socket.io")();
let session = null;
let connections = [];

let Tutor = require("../models/Tutor");
let User = require("../models/User");
let TutorSession = require("../models/Session");

let Payment = require("../controllers/Payment");

io.use((socket, next) => {
  session(socket.request, socket.request.res, next);
});

io.sockets.on("connection", connectHandler);

(async function cleanUncleanedSessions() {
  await TutorSession.find({status: 'insession'}).remove();
})();

async function connectHandler(socket) {
  if (!socket.request.session.passport) return;
  await prepareSocket(socket);

  //remove dead connections fast
  for (let i = connections.length - 1; i >= 0; i--) {
    let sc = connections[i];
    if (sc.disconnected) {
      connections.splice(i, 1);
      sc.disconnect(true);
    }
  }

  //attach event handlers
  socket.on("disconnect", disconnected);
  socket.on("getTutors", sendLiveTutors);
  socket.on("goingLive", goLive);

  // --- webrtc only handlers
  socket.on("message", relayMsg);
  socket.on("sessionRejected", sessionRejected);
  socket.on("sessionAccepted", sessionAccepted);

  connections.push(socket);
}

async function prepareSocket(s) {
  let email = s.request.session.passport.user;
  let user = await User.findOne({ email });

  if (user.tutor) {
    user.status = "offline";
    await user.save();
  }

  s.info = {
    role: user.tutor ? "tutor" : "user",
    id: user.id,
    live: false
  };
}

async function requestTutor(tutor_id, user_id, len, price, stripeToken) {
  let ts = new TutorSession();
  ts.tutor_id = tutor_id;
  ts.user_id = user_id;
  ts.duration = len;
  ts.price = price;
  ts.stripeToken = stripeToken;
  await ts.setStatus("pending");
  await ts.save();

  var t_socket = connections.find(s => {
    return s.info.id == tutor_id && s.info.live;
  });

  if (!t_socket) return;
  let userFirstName = (await User.findById(user_id)).firstName;
  t_socket.emit("sessionRequest", {
    name: userFirstName,
    minutes: ts.duration,
    id: ts.id
  });
}

async function sessionAccepted(id, cb) {
  console.log("accepted");
  //end all previous active sessions
  let combined =  await TutorSession.find({ status: "insession" }).or([
    { tutor_id: this.info.id },
    { user_id: this.info.id }
  ]);

  for (let s of combined) {
    await s.setStatus("finished");
  }

  //end all pending ones too.
  let combined_pend = await TutorSession.find({ status: "pending" }).or([
    { user_id: this.info.id },
    { tutor_id: this.info.id }
  ]);

  for (let s of combined_pend) {
    if (s.id == id) continue;
    await s.remove();
  }

  let tutor = await Tutor.findById(this.info.id);
  await tutor.setStatus("busy");

  let ts = await TutorSession.findById(id);
  await ts.setStatus("insession");

  let amount = Math.ceil(Number(ts.price) * Number(ts.duration)/60) * 100;
  Payment.charge(ts.stripeToken, amount);

  startWebRTC(ts);
}

async function sessionRejected(ts_id, cb) {
  console.log("rejected");

  let tutor = await Tutor.findById(this.info.id);
  let ts = await TutorSession.findById(ts_id);

  await tutor.setStatus("available");
  await ts.remove();

  let user_socket = connections.find(
    c => c.info.id == ts.user_id && c.info.live
  );

  user_socket.emit("redirect", "/tutors");
}

async function disconnected() {
  let index = connections.indexOf(this);
  if (index) {
    connections.splice(index, 1);
  } else {
    console.log("Couldn't find the socket that just disconnected");
  }

  let user = await User.findById(this.info.id);
  let ts = await getLiveTutorSession(user.id);

  if (ts) {
    console.log('found session to delete');
    if (user.tutor) {
      let tutor = await Tutor.findById(this.info.id);
      await tutor.setStatus("offline");
    }

    let other_id = user.tutor ? ts.user_id : ts.tutor_id;
    let other_socket = connections.find(
      c => c.info.id == other_id && c.info.live
    );
    
    if (ts.status == "pending" || !!other_socket) {
      console.log('session removed');
      await ts.remove();
    }
  }
  sendLiveTutors();
}

async function getLiveTutorSession(id) {

  let ts = await TutorSession.find({ status: "insession" }).or([
    { tutor_id: id },
    { user_id: id }
  ]);
  // console.log(ts[0]);
  return ts[0];
}

async function relayMsg(data) {
  let user = await User.findById(this.info.id);
  let ts = await getLiveTutorSession(user.id);

  let other_id = user.tutor ? ts.user_id : ts.tutor_id;
  let other_socket = connections.find(
    c => c.info.id == other_id && c.info.live
  );

  other_socket.emit("message", data);

  console.log(data.type, "message sent");
  console.log(`from ${this.info.role} to ${other_socket.info.id}`);
  console.log(user.id, other_id);
}

async function sendLiveTutors() {
  let arr = [];
  let tutors = connections.filter(
    c => c.info.id && c.info.live && c.info.role == "tutor"
  );

  for (let t of tutors) {
    let tutor = await Tutor.findById(t.info.id);
    if (tutor.status != "available") continue;

    let link = `/tutors/${tutor.id}`,
      name = `${tutor.firstName} ${tutor.lastName}`,
      imgUrl = tutor.picture,
      subjects = tutor.subjects;

    arr.push({ link, name, imgUrl, subjects });
  }
  io.emit("tutorsChanged", arr);
}

function startWebRTC(ts) {
  console.log("startWebRTC called");
  let sockets = connections.filter(
    s => [ts.user_id, ts.tutor_id].includes(s.info.id) && s.info.live
  );

  let user_socket = sockets.find(s => s.info.role == "user");
  let tutor_socket = sockets.find(s => s.info.role == "tutor");

  if (user_socket && tutor_socket) {
    console.log(user_socket.info.id, tutor_socket.info.id);
    user_socket.emit("sessionStart", { initiator: false });
    tutor_socket.emit("sessionStart", { initiator: true });
  } else {
    console.log(
      "error couldnt find the user or tutor to bad session",
      user_socket,
      tutor_socket
    );
  }
}

async function goLive(data) {
  /*   if tutor in session connect
  if user in session connect
  if tutor go live
  if user and not in session do nothing.
  should be able to go live once only 
*/

  try {
    let user = await User.findById(this.info.id);
    let ts = await getLiveTutorSession(user.id);

    //should be able to go live with one connection, so remove all previous ones.
    connections.filter(c => c.info.live && c.info.id == user.id).forEach(c => {
      connections.splice(connections.indexOf(c), 1);
    });

    this.info.live = true;

    if (ts) {
      if (user.tutor) {
        await user.setStatus("busy");
      }
      startWebRTC(ts);
    } else if (user.tutor) {
      await user.setStatus("available");
      sendLiveTutors();
    }
  } catch (err) {
    console.log(err);
  }
}

module.exports = {
  attachServer: async server => {
    io.listen(server);
  },
  attachSession: s => (session = s),
  requestTutor: requestTutor
};

/*
  Facts

  User can have multiple sockets
  Tutor can have multiple sockets

  User can have one active session
  Tutor can have one active session

  Session can have one user socket
  Session can have one tutor socket


  Flow

  On Accept create session
  On reject do nothing
  On go live see if there is active session then join it, if not create and join it

  If either end it by clicking then end it
  If both leave then end session

*/
