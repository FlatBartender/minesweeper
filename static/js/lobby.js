let button = document.getElementById("new_game");
let width  = document.getElementById("width");
let height = document.getElementById("height");
let mines  = document.getElementById("mines");

button.addEventListener("click", () => {
    window.location.assign(`/create-${width.value}-${height.value}-${mines.value}`);
});
