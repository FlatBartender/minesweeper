const crypto    = require("crypto")
const mustache  = require("mustache-express")
const express   = require("express")
const path      = require("path")
const fs        = require("fs")
const socketio  = require("socket.io")
const http      = require("http")
const logger = require("morgan")

const app    = express()
const server = http.Server(app)
const io     = socketio(server)

let SETTINGS
try {
    SETTINGS = JSON.parse(fs.readFileSync("settings.json"))
} catch (err) {
    SETTINGS = {}
    console.log(err)
}
const GAME_TIMEOUT = SETTINGS.timeout || 60*1000*5
const INITIAL_AREA = SETTINGS.initial_area || 2


app.engine("mustache", mustache())
app.set("view engine", "mustache")
app.set("views", path.join(__dirname, "views"))
app.use(logger("dev"))

app.use(express.static(path.join(__dirname, "static")))

let games = {}

app.use("/game/:id", function (req, res) {
    let id = req.params.id
    if (!games[id]) {
        res.render("game_404", {id}, (err, html) => {
            res.status(404).send(html)
        })
        return
    }

    res.render("game", {id}, (err, html) => {
        res.send(html)
    })
})

app.use("/lobby", function (req, res) {
    res.render("lobby", games, (err, html) => {
        res.send(html)
    })
})

app.use("/create-:width-:height-:mines", function (req, res) {
    let width  = parseInt(req.params.width)
    let height = parseInt(req.params.height)
    let mines  = parseInt(req.params.mines)

    if (isNaN(height)     || isNaN(width) || isNaN(mines) ||
        height <= 0       || width <= 0   || mines <= 0   ||
        height >  500     || width >  500) {
        res.render("error_create", {reason: "At least one of your parameters is invalid."}, (err, html) => {
            res.status(400).send(html)
        })
        return
    }

    if (mines+9 >= width * height) {
        res.render("error_create", {reason: `Can't have more mines than cells - ${Math.pow(INITIAL_AREA+1, 2)+1}`}, (err, html) => {
            res.status(400).send(html)
        })
        return
    }
    
    let id
    while (games[id = crypto.randomBytes(4).toString("hex")]);
    games[id] = {width, height, mines}
    let game = games[id]
    reset_timeout(id)

    res.redirect(`/game/${id}`)
})


// ADD ROUTES BEFORE THIS
app.get("*", (req, res) => {
    res.redirect("/lobby")
})
io.on('connection', (socket) => {
    socket.on('join', (id) => {
        if (!games[id]) {
            socket.send({error: 404, description: "Can't find game"})
            return
        }
        
        let game = games[id]

        socket.join(id)

        socket.emit('game params', {width: game.width, height: game.height})
        
        let flagged = []
        let discovered = []
        if (game.table) {
            for (let y = 0; y < game.height; y++) {
                for (let x = 0; x < game.width; x++) {
                    let cell = game.table[y][x]
                    if (cell.discovered) {
                        discovered.push({x, y, cell})
                    }
                    if (cell.flagged) {
                        flagged.push({x, y, cell: clean_cell(cell)})
                    }
                }
            }

            socket.emit('discovered', discovered)
            socket.emit('flagged', flagged)
        }
        socket.on('discover', (coords) => {
            let {x, y} = coords = {x: parseInt(coords.x), y: parseInt(coords.y)}
            let game = games[id]
            if (!game) return
            if (!game.table) generate_table(id, coords)
            if (game.table[y][x].flagged) return
            reset_timeout(id)

            // Classif BFS: 
            // push discovered cell
            // while the stack is not empty
            //     pop stack
            //     discover cell
            //     send message "discovered" with cell
            //     if cell has "neighbors == 0" push non-discovered neighbors

            let discovered = []
            let stack = []
            stack.push(coords)
            while (stack.length > 0) {
                let {x, y} = stack.shift()
                let cell = game.table[y][x]
                cell.discovered = true
                discovered.push({x, y, cell})
                if (cell.mine) {
                    io.to(id).emit('discovered', discovered)
                    io.to(id).emit('game over')
                    game_over(id)
                    return
                }

                if (cell.neighbors === 0) {
                    for (let j = max(0, y-1); j < min(game.height, y+2); j++) {
                        for (let i = max(0, x-1); i < min(game.width, x+2); i++) {
                            let cell = game.table[j][i]
                            if (cell.discovered) continue
                            cell.discovered = true
                            discovered.push({x: i, y: j, cell})
                            if (cell.neighbors === 0) stack.push({x: i, y: j})
                        }
                    }
                }
            }

            io.to(id).emit('discovered', discovered)

            if (win_condition(id)) {
                io.to(id).emit('win')
                game_over(id)
            }
        })

        socket.on('flag', ({x, y}) => {
            if (!games[id]) return
            clearTimeout(game.timeout)
            reset_timeout(id)
            let cell = games[id].table[y][x]
            cell.flagged = cell.flagged ? false : true
            io.to(id).emit('flagged', [{x, y, cell: clean_cell(cell)}])

            if (win_condition(id)) {
                io.to(id).emit('win')
                game_over(id)
            }
        })

        socket.on('chat message', ({user, content, game_id}) => {
            if (!(games[game_id] && content != "" && user != "")) return
            io.to(game_id).emit('chat message', {user, content})
        })
    })
})


const CLEAN_PROPERTIES = [
    "discovered",
    "flagged"
]

function clean_cell(cell) {
    if (cell.discovered) return cell
    let clean = Object.keys(cell)
                      .filter(key => CLEAN_PROPERTIES.includes(key))
                      .reduce((obj, key) => {
                          obj[key] = cell[key]
                          return obj
                      }, {})

    return clean
}

function game_over(id) {
    let game = games[id]
    if (game.timeout) clearTimeout(game.timeout)

    delete_game(id)
}

function reset_timeout(id) {
    let game = games[id]
    if (game.timeout) clearTimeout(game.timeout)
    game.timeout = setTimeout(() => delete_game(id), GAME_TIMEOUT)
}

function delete_game(id) {
    delete games[id]
}

function min(a, b) {
    return a < b ? a: b
}

function win_condition(id) {
    let game = games[id]
    return !game.table.some((row) => {
        return row.some((cell) => {
            return (!cell.flagged && cell.mine) || (cell.flagged && !cell.mine)
        })
    })
}

function max(a, b) {
    return a > b ? a: b
}

function log_game(id) {
    let game = games[id]
    console.log()
    for (let line of game.table) {
        console.log(line.map((cell) => cell.mine ? "X" : cell.neighbors).reduce((str, elem) => str + elem, ""))
    }
}

function generate_table(id, coords) {
    let game = games[id]
    let {width, height, mines} = game
    let mine_positions = []
    let table = new Array(height)
    for (let j = 0; j < height; j++) {
        table[j] = new Array(width)
        for (let i = 0; i < width; i++) {
            table[j][i] = {neighbors: 0, discovered: false}
            if (Math.abs(i - coords.x) >= INITIAL_AREA ||
                Math.abs(j - coords.y) >= INITIAL_AREA) {
                mine_positions.push({x: i, y: j})
            }
        }
    }

    for (let m = 0; m < mines; m++) {
        let {x, y} = mine_positions.splice(Math.floor(Math.random() * mine_positions.length), 1)[0]
        table[y][x].mine = true;
        for (let j = max(0, y-1); j < min(height, y+2); j++) {
            for (let i = max(0, x-1); i < min(width, x+2); i++) {
                table[j][i].neighbors++
            }
        }
    }
    
    game.table = table
    log_game(id)
}

server.listen(SETTINGS.listen_port || 3000)
