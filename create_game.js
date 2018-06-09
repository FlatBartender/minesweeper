const STATUS = Object.freeze({"lobby": 1, "starting": 2, "running": 3, "paused": 4, "ended": 5})
const TYPE   = Object.freeze({"chaos": 1, "team_chaos": 2})
const CLEAN_TILE_PROPS = Object.freeze([
    "discovered",
    "flagged"
])


class Tile {
    constructor() {
        this.neighbors = 0
        this.discovered = false
    }

    clean() {
        if (this.discovered) return this

        let clean = Object.keys(this)
            .filter(key => CLEAN_TILE_PROPS.includes(key))
            .reduce((obj, key) => {
                obj[key] = this[key]
                return obj
            }, {})

        return clean
    }
}

class Game {
    constructor(owner, width, height, mines, type = TYPE.chaos) {
        this.width      = width
        this.height     = height
        this.mines      = mines
        
        // @TODO add timeout

        this.init_field(width, height)

        this.status = STATUS.lobby

        this.type = type

        this.teams = []
        if (this.type == TYPE.team_chaos) {
            this.teams[0] = [owner]
            this.teams[1] = []
        }

        if (this.type == TYPE.chaos) {
            this.teams[0] = [owner]
        }

        this.owner = owner
    }
    
    join(user) {
        let min_team
        for (let team in this.teams) {
            if (min_team === undefined) {
                min_team = team
                continue
            }
            if (this.teams[team].length > this.teams[min_team].length) min_team = team
        }
    }

    set_team(user, new_team) {
        if (team >= this.teams.length) return;
        for (let team of this.teams) {
            let index = team.indexOf(new_team)
            if (index !== -1) {
                team.splice(index, 1)
                break
            }
        }
        this.teams[new_team].push(user)
    }

    init_field(width, height) {
        let mine_positions = []
        let field = new Array(height)
        for (let row in field) {
            field[row] = new Array(width)
            for (let tile in field[row]) {
                field[row][tile] = new Tile()
                mine_positions.push({x: tile, y: row})
            }
        }
        this.mine_positions = mine_positions
        this.field = field
    }

    restrict_coords(coords, min_distance) {
        this.mine_positions = this.mine_positions.filter((tile) => {
            if (Math.abs(tile.x - coords.x) >= min_distance ||
                Math.abs(tile.y - coords.y) >= min_distance)
                    return true
            return false
        })
    }

    place_mines() {
        if (mines > this.mine_positions.length) throw "More mines than available positions"
        while(mines-- > 0) {
            let {x, y} = this.mine_positions.splice(Math.floor(Math.random() * mine_positions.length), 1)[0]
            this.field[y][x].mine()
            
            let min_j = max(0, y-1)
            let max_j = min(this.height, y+2)
            let min_i = max(0, x-1)
            let max_i = min(this.width, x+2)

            for (let j = min_j; j < max_j; j++) {
                for (let i = min_i; i < max_i; i++) {
                    this.field[j][i].neighbors++
                }
            }
        }
    }

    is_finished() {
        return !game.table.some((row) => {
            return row.some((tile) => {
                return !(tile.mine ? cell.flagged || !cell.discovered : cell.discovered)
            })
        })
    }
    
    summary() {
        if (this.status == STATUS.lobby) {
            return summary_lobby()
        } else {
            return summary_ingame()
        }
    }
    
    summary_lobby() {
        return {teams: this.teams.map((user) => user.nickname)}
    }

    summary_ingame() {
        let flagged    = []
        let discovered = []

        for (let row in this.field) {
            for (let tile in this.field[row]) {
                if (tile.flagged)       flagged.push({x: tile, y: row, tile: this.field[row][tile].clean()})
                if (tile.discovered) discovered.push({x: tile, y: row, tile: this.field[row][tile]})
            }
        }

        return {flagged, discovered}
    }

    discover(coords) {
        if (this.status != STATUS.running) return
    }

    flag(coords) {
        if (this.status != STATUS.running) return
    }
}
Game.STATUS = STATUS
Game.TYPE   = TYPE

function min(a, b) {
    return a < b ? a: b
}

function max(a, b) {
    return a > b ? a: b
}
