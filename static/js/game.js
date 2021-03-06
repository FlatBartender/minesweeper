let game = {};
let game_status = "running";

let status = document.getElementById('status');
let field = document.getElementById("game");

let messages = document.getElementById('messages');

const socket = io();
socket.on('discovered', (discovered) => {
    for (let d of discovered) {
        let {x, y, cell} = d;
        let field_cell = game.table[y][x];
        let field_elem = document.querySelector(`td[data-x="${x}"][data-y="${y}"]`);
        if (cell.mine) {
            field_elem.classList.add("mine");
            return;
        }
        field_elem.innerText = cell.neighbors > 0 ? cell.neighbors:"";
        field_elem.classList.add("discovered");
        game.table[y][x] = cell;
    }
});
socket.on('flagged', (flagged) => {
    for (let f of flagged) {
        let {x, y, cell} = f;
        let field_cell = game.table[y][x];
        let field_elem = document.querySelector(`td[data-x="${x}"][data-y="${y}"]`);
        field_elem.classList.toggle("flagged");
        game.table[y][x] = cell;
    }
});
socket.on('game over', () => {
    game_status = "end";
    status.innerText = "You lost! You will be redirected to the lobby in 5 seconds.";

    setTimeout(() => {
        window.location.replace("/lobby");
    }, 5000);
});
socket.on('game params', (params) => {
    let {width, height} = params;
    game.width = width;
    game.height = height;
    game.table = [];
    for (let y = 0; y < height; y++) {
        game.table[y] = [];
        let row = document.createElement("tr");
        for (let x = 0; x < width; x++) {
            let cell = document.createElement("td");
            game.table[y][x] = {discovered: false};
            row.appendChild(cell);
            cell.setAttribute("data-x", x);
            cell.setAttribute("data-y", y);
            cell.addEventListener('click', handle_left_click);
            cell.addEventListener('contextmenu', handle_right_click);
        }
        field.appendChild(row);
    }
});
socket.on('win', () => {
    game_status = "end";
    status.innerText = "You won! You will be redirected to the lobby in 5 seconds.";
    setTimeout(() => {
        window.location.replace("/lobby");
    }, 5000);
});
socket.on('disconnect', (reason) => {
    status.innerText = "You've been disconnected from the server! Please refresh the page.";
});
socket.on('chat message', (message) => {
    let {user, content} = message;
    let ctn_elem = document.createElement("span");
    let usr_elem = document.createElement("span");
    let msg_elem = document.createElement("div");
    msg_elem.classList.add("message");
    ctn_elem.innerText = content;
    usr_elem.innerText = user;
    ctn_elem.classList.add("content");
    usr_elem.classList.add("user");
    msg_elem.appendChild(usr_elem);
    msg_elem.appendChild(ctn_elem);
    messages.appendChild(msg_elem);
});

socket.emit('join', game_id);

let message_username = document.getElementById("username");
let message_text = document.getElementById("message_text");

document.getElementById("send_message").addEventListener("click", send_message);

function send_message(event) {
    let content = message_text.value;
    message_text.value = "";
    let user = message_username.value;
    socket.emit('chat message', {user, content, game_id});
}

function handle_left_click(event) {
    if (game_status == "end") return;
    let x = parseInt(this.getAttribute("data-x"));
    let y = parseInt(this.getAttribute("data-y"));
    if (game.table[y][x].discovered) return;
    switch (event.button) {
        case 0: // "main" button, usually left
             socket.emit('discover', {x, y});
            break;
    }
    event.preventDefault();
}
function handle_right_click(event) {
    if (game_status == "end") return;
    let x = parseInt(this.getAttribute("data-x"));
    let y = parseInt(this.getAttribute("data-y"));
    if (game.table[y][x].discovered) return;
    socket.emit('flag', {x, y});
    event.preventDefault();
}
