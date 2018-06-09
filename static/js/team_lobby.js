let game = {};
let game_status = "lobby";

let status = document.getElementById('status');
let field = document.getElementById("game");

let messages = document.getElementById('messages');

const socket = io();
socket.on('chat message', (message) => {
    let {user, content, team} = message;
    let ctn_elem = document.createElement("span");
    let usr_elem = document.createElement("span");
    let msg_elem = document.createElement("div");
    msg_elem.classList.add("message");
    ctn_elem.innerText = content;
    usr_elem.innerText = user;
    ctn_elem.classList.add("content");
    ctn_elem.classList.add(team);
    usr_elem.classList.add("user");
    msg_elem.appendChild(usr_elem);
    msg_elem.appendChild(ctn_elem);
    messages.appendChild(msg_elem);
});

socket.emit('join lobby', game_id);

let message_text = document.getElementById("message_text");

document.getElementById("send_message").addEventListener("click", send_message);
document.getElementsByClassName("set_team").forEach((elem) => {
    elem.addEventListener("click", set_team);
})

function send_message(event) {
    let team = document.querySelector("#id>option[selected]").value;
    let content = message_text.value;
    message_text.value = "";
    let user = message_username.value;
    socket.emit('chat message', {user, content, game_id, team});
}

function set_team(event) {
    let team
    switch (this.parentNode.id) {
        case "red_team":
            team = "red";
            break;
        case "blue_team":
            team = "blue";
            break;
        case "no_team":
            team = "none";
            break;
    }
    socket.emit("set team", {team, game_id})
}
