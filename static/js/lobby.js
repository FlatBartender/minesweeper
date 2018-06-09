let new_game = document.getElementById("new_game");
let width    = document.getElementById("width");
let height   = document.getElementById("height");
let mines    = document.getElementById("mines");

new_game.addEventListener("click", () => {
    window.location.assign(`/create-${width.value}-${height.value}-${mines.value}`);
});

let save_user = document.getElementById("save_user");
let nickname  = document.getElementById("nickname");

save_user.addEventListener("click", () => {
    let req = new XMLHttpRequest();
    req.open("POST", "/user-save", true);
    req.overrideMimeType("application/json");
    req.setRequestHeader('Content-Type', 'application/json');
    req.send(JSON.stringify({nickname: nickname.value}));
});
