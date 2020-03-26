var app = require('express')();
var express=require('express')
var http = require('http').createServer(app);
var io = require('socket.io')(http);
let port=process.env.PORT||3000;
app.use('/', express.static(__dirname + '/src'));

let rooms=[];

let start=['what if ','how much do '];
let end=[' became pm?',' earn?'];
let qcount;


io.on('connection', function(socket){
    console.log('a user connected');
    
    socket.on('create', function(data){
        if(rooms[data.r]){
            io.to(`${data.id}`).emit('err','room already exists')
        }else{
            create(data)
            io.to(`${data.id}`).emit('created')
        }
    });
    
    socket.on('join', function(data){
        if(rooms[data.r]){
            if(rooms[data.r].pass==data.p){
                if(rooms[data.r].started){
                    io.to(`${data.id}`).emit('err','game has already started')
                }
                else{ 
                    join(data)
                    io.to(`${data.id}`).emit('joined')
                }
            }
            else{
                io.to(`${data.id}`).emit('err','password incorrect')
            }
        }else{
            io.to(`${data.id}`).emit('err','room does not exist')
        }
    });

    socket.on('start',function(data) {
        if(rooms[data.r].creator==data.id){
            rooms[data.r].started=true;
            let question=buildques(data.r);
            for(let i=0;i<rooms[data.r].members.length;i++){
                io.to(`${rooms[data.r].members[i]}`).emit('started',question)
            }
        }
        else{
            io.to(`${data.id}`).emit('err','you are not the creator')
        }

    });

    socket.on('sub',function(data){
        rooms[data.r].answers[data.id]=data.a;
        rooms[data.r].counter++;
        if(rooms[data.r].counter==rooms[data.r].members.length){
            let answers=[];
            for(i in rooms[data.r].answers){
                answers.push(rooms[data.r].answers[i]);
            }
            rooms[data.r].counter=0;
            for(let i=0;i<rooms[data.r].members.length;i++){
                io.to(`${rooms[data.r].members[i]}`).emit('votescreen',answers)
            }
        }
    });

    socket.on('vote',function(data){
        rooms[data.r].counter++;
        for(i in rooms[data.r].answers){
            if(rooms[data.r].answers[i]==data.a){
                rooms[data.r].scores[i]+=2;
            }
        }
        
        if(rooms[data.r].counter==rooms[data.r].members.length){
            rooms[data.r].counter=0;
            let scores=[];
            for(i in rooms[data.r].answers){
                scores.push(`${rooms[data.r].names[i]}  :  ${rooms[data.r].scores[i]}`);
            }
            for(let i=0;i<rooms[data.r].members.length;i++){
                io.to(`${rooms[data.r].members[i]}`).emit('voted',scores)
            }
            for(i in rooms[data.r].answers){
                rooms[data.r].answers[i]='';
            }
        }
    });

    socket.on('next',function(data){
        if(rooms[data.r].creator==data.id){
            rooms[data.r].currentround++;
        }
        if(rooms[data.r].currentround<rooms[data.r].rounds){
            rooms[data.r].counter++;
            if(rooms[data.r].counter==rooms[data.r].members.length){
                rooms[data.r].counter=0;
                let question=buildques(data.r);
                for(let i=0;i<rooms[data.r].members.length;i++){
                    io.to(`${rooms[data.r].members[i]}`).emit('nextround',question)
                }
            }
        }
        else 
        {
            for(let i=0;i<rooms[data.r].members.length;i++){
                io.to(`${rooms[data.r].members[i]}`).emit('err','all rounds completed')
            }
            delete rooms[data.r]
        }
    });
    //socket.broadcast.emit('draw',pos);
});
   

http.listen(port, function(){
  console.log('listening on '+port);
});




function create(data) {
    let obj={
        rounds:data.ro,
        pass:data.p,
        members:[data.id],
        creator:data.id,
        names:[],
        scores:[],
        started:false,
        answers:[],
        counter:0,
        currentround:0
    }
    obj.names[data.id]=data.n;
    obj.scores[data.id]=0;
    obj.answers[data.id]='';
    rooms[data.r]=obj;
}

function join(data) {
    rooms[data.r].members.push(data.id);
    rooms[data.r].names[data.id]=data.n;
    rooms[data.r].scores[data.id]=0;
    rooms[data.r].answers[data.id]='';
}

function buildques(d) {
    let ran=Math.floor(Math.random()*rooms[d].names.length);
    let c=0;
    let n;
    for(i in rooms[d].names){
        if(ran==c){
            n=rooms[d].names[i];
        }else c++;
    }
    if(qcount<start.length-1){
        qcount++
    }else{
        qcount=0
    }
    return start[qcount]+n+end[qcount];
}