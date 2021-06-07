var app = require("express")();
var express = require("express");
var http = require("http").createServer(app);
var io = require("socket.io")(http);
const fs = require("fs");
let port = process.env.PORT || 8000;
app.use("/", express.static(__dirname + "/public"));

let rooms = {};
let creators = {};
let start = [];
let qCount;

//get questions
function loadQuestions() {
  let ques = fs.readFileSync("ques.txt", (err, data) => {
    return data;
  });
  ques = ques.toString();
  start = ques.split("\n");
}

io.on("connection", function (socket) {
  socket.on("create", function (data) {
    if (rooms[data.r]) {
      io.to(`${data.id}`).emit("err", "room already exists");
    } else {
      create(data);
      io.to(`${data.id}`).emit("created");
      let players = [];
      for (i in rooms[data.r].names) {
        players.push(rooms[data.r].names[i]);
      }
      for (let i = 0; i < rooms[data.r].members.length; i++) {
        io.to(`${rooms[data.r].members[i]}`).emit("pincreased", players);
      }
    }
  });

  socket.on("join", function (data) {
    if (rooms[data.r]) {
      if (rooms[data.r].pass == data.p) {
        if (rooms[data.r].started) {
          io.to(`${data.id}`).emit("err", "game has already started");
        } else {
          join(data);
          io.to(`${data.id}`).emit("joined");
          let players = [];
          for (i in rooms[data.r].names) {
            players.push(rooms[data.r].names[i]);
          }
          for (let i = 0; i < rooms[data.r].members.length; i++) {
            io.to(`${rooms[data.r].members[i]}`).emit("pincreased", players);
          }
        }
      } else {
        io.to(`${data.id}`).emit("err", "password incorrect");
      }
    } else {
      io.to(`${data.id}`).emit("err", "room does not exist");
    }
  });

  socket.on("start", function (data) {
    if (rooms[data.r].creator == data.id) {
      rooms[data.r].started = true;
      let question = buildQuestion(data.r);
      for (let i = 0; i < rooms[data.r].members.length; i++) {
        io.to(`${rooms[data.r].members[i]}`).emit("started", question);
      }
    } else {
      io.to(`${data.id}`).emit("err", "you are not the creator");
    }
  });

  socket.on("sub", function (data) {
    rooms[data.r].answers[data.id] = data.a;
    rooms[data.r].counter++;
    if (rooms[data.r].counter == rooms[data.r].members.length) {
      let answers = [];
      for (i in rooms[data.r].answers) {
        answers.push(rooms[data.r].answers[i]);
      }
      rooms[data.r].counter = 0;
      for (let i = 0; i < rooms[data.r].members.length; i++) {
        io.to(`${rooms[data.r].members[i]}`).emit("votescreen", answers);
      }
    }
  });

  socket.on("vote", function (data) {
    rooms[data.r].counter++;
    for (i in rooms[data.r].answers) {
      if (rooms[data.r].answers[i] == data.a) {
        rooms[data.r].scores[i] += 2;
      }
    }

    if (rooms[data.r].counter == rooms[data.r].members.length) {
      rooms[data.r].counter = 0;
      let scores = [];
      for (i in rooms[data.r].answers) {
        scores.push(`${rooms[data.r].names[i]}  :  ${rooms[data.r].scores[i]}`);
      }
      for (let i = 0; i < rooms[data.r].members.length; i++) {
        io.to(`${rooms[data.r].members[i]}`).emit("voted", scores);
      }
      for (i in rooms[data.r].answers) {
        rooms[data.r].answers[i] = "";
      }
    }
  });

  socket.on("next", function (data) {
    if (rooms[data.r].creator == data.id) {
      rooms[data.r].currentRound++;
    }
    if (rooms[data.r].currentRound < rooms[data.r].rounds) {
      rooms[data.r].counter++;
      if (rooms[data.r].counter == rooms[data.r].members.length) {
        rooms[data.r].counter = 0;
        let question = buildQuestion(data.r);
        for (let i = 0; i < rooms[data.r].members.length; i++) {
          io.to(`${rooms[data.r].members[i]}`).emit("nextround", question);
        }
      }
    } else {
      for (let i = 0; i < rooms[data.r].members.length; i++) {
        io.to(`${rooms[data.r].members[i]}`).emit(
          "err",
          "all rounds completed"
        );
      }
      delete creators[rooms[data.r].creator];
      delete rooms[data.r];
    }
  });

  socket.on("disconnect", function () {
    if (creators[socket.id]) {
      delete rooms[creators[socket.id]];
      delete creators[socket.id];
    }
  });
  //socket.broadcast.emit('draw',pos);
});

http.listen(port, function () {
  loadQuestions();
});

function create(data) {
  let obj = {
    rounds: data.ro,
    pass: data.p,
    members: [data.id],
    creator: data.id,
    names: [],
    scores: [],
    started: false,
    answers: [],
    counter: 0,
    currentRound: 0,
  };
  obj.names[data.id] = data.n;
  obj.scores[data.id] = 0;
  obj.answers[data.id] = "";
  rooms[data.r] = obj;
  creators[data.id] = data.r;
}

function join(data) {
  rooms[data.r].members.push(data.id);
  rooms[data.r].names[data.id] = data.n;
  rooms[data.r].scores[data.id] = 0;
  rooms[data.r].answers[data.id] = "";
}

function buildQuestion(d) {
  let ran = Math.floor(Math.random() * rooms[d].members.length);
  let c = 0;
  let n;
  for (i in rooms[d].names) {
    if (ran == c) {
      n = rooms[d].names[i];
      c++;
    } else c++;
  }
  if (qCount < start.length - 1) {
    qCount++;
  } else {
    qCount = 0;
  }
  return start[qCount].replace("name", n);
}
