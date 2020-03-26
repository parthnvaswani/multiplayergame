class info{
    name;
    room;
    password;
    rounds;

    create(name,room,password,rounds) {
        this.name=name;
        this.room=room;
        this.password=password;
        this.rounds=rounds;
        //send to server
        socket.emit('create', {id:socket.id,n:name,r:room,p:password,ro:rounds});
    }

    join(name,room,password){
        this.name=name;
        this.room=room;
        this.password=password;
        //send to server
        socket.emit('join', {id:socket.id,n:name,r:room,p:password});
    }

    start(){
        socket.emit('start',{id:socket.id,r:this.room})
    }

    submit(ans){
        socket.emit('sub',{r:this.room,a:ans,id:socket.id});
    }

    vote(ans){
        socket.emit('vote',{r:this.room,a:ans})
    }

    next(){
        socket.emit('next',{r:this.room,id:socket.id})
    }
}


let socket=io(window.location.hostname);

let obj=new info()


//create room
document.querySelector('#create').addEventListener('click',()=>{
    let n=document.querySelector('#name').value.trim();
    let r=document.querySelector('#room').value.trim();
    let p=document.querySelector('#password').value.trim();
    let ro=document.querySelector('#rounds').value.trim();
    if(n!=''&&r!=''&&p!=''&&ro!=''&&ro>0){
        obj.create(n,r,p,ro)
    }
    else alert('enter valid details');
})

//join room
document.querySelector('#join').addEventListener('click',()=>{
    let n=document.querySelector('#name').value;
    let r=document.querySelector('#room').value;
    let p=document.querySelector('#password').value;
    if(n!=''&&r!=''&&p!=''){
        obj.join(n,r,p)
    }
    else alert('enter valid details');
})

//on joined and created
socket.on('created', function(){
    document.querySelector('.login').style.display='none';
    document.querySelector('#start').style.display='block';
});
socket.on('joined', function(){
    document.querySelector('.login').style.display='none';
    document.querySelector('#waits').style.display='block';
});


//start
document.querySelector('#start').addEventListener('click',function() {
    obj.start();
})


//started
socket.on('started', function(que){
    document.querySelector('#waits').style.display='none';
    document.querySelector('#start').style.display='none';
    document.querySelector('.main').style.display='block';
    document.querySelector('.que').innerHTML=que;
});

//submit answer
document.querySelector('#submit').addEventListener('click',function() {
    let ans=document.querySelector('#answer').value.trim();
    if(ans!=''){
        obj.submit(ans)
        document.querySelector('.main').style.display='none';
        document.querySelector('#waitc').style.display='block';
    }
    else alert('first enter an answer')
})

//vote screen
socket.on('votescreen', function(answers){
    console.log(answers);
    document.querySelector('#waitc').style.display='none';
    document.querySelector('.options').style.display='block';
    for(let i=0;i<answers.length;i++){
        document.querySelector('.opt').innerHTML+=`<li id="ans">${answers[i]}</li>`;
    }
    document.querySelectorAll('#ans').forEach(e=>{e.addEventListener('click',e=>{
        obj.vote(e.target.innerHTML)
        document.querySelector('.opt').innerHTML='';
        document.querySelector('.options').style.display='none';
        document.querySelector('#waitc').style.display='block';
    })});
});


//voted
socket.on('voted', function(scores){
    document.querySelector('#waitc').style.display='none';
    document.querySelector('.scoreboard').style.display='block';
    for(let i=0;i<scores.length;i++){
        document.querySelector('.list').innerHTML+=`<li>${scores[i]}</li>`;
    }
});

//new round
document.querySelector('#next').addEventListener('click',()=>{
    document.querySelector('.list').innerHTML='';
    obj.next()
    document.querySelector('.scoreboard').style.display='none';
    document.querySelector('#waitc').style.display='block';
});

//new round started
socket.on('nextround', function(que){
    document.querySelector('#waitc').style.display='none';
    document.querySelector('.main').style.display='block';
    document.querySelector('.que').innerHTML=que;
});

socket.on('err', function(err){
    alert(err)
    if('all rounds completed'==err){
        window.location.reload();
    }
});
