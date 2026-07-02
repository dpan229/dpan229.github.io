const canvas = document.getElementById("turmiteCanvas");
const ctx = canvas.getContext("2d");

const STATE_CAP = 26;
const GROUND_CAP = 12;

const GROUND_COLORS = [
    "#000000", // 0: black
    "#FFFFFF", // 1: white
    "#00BBFF", // 2: light blue
    "#BB0000", // 3: red
    "#00BB00", // 4: green
    "#0000FF", // 5: blue
    "#DD7700", // 6: orange
    "#DDDD00", // 7: yellow
    "#FFBBBB", // 8: pink
    "#663300", // 9: brown
    "#6600FF", // 10: violet
    "#DD00DD"  // 11: magenta
];

const GROUND_COLORS_CONTRAST = [
    "#FFFFFF", // 0: black      -> white
    "#000000", // 1: white      -> black
    "#000000", // 2: light blue -> black
    "#FFFFFF", // 3: red        -> white
    "#000000", // 4: green      -> black
    "#FFFFFF", // 5: blue       -> white
    "#000000", // 6: orange     -> black
    "#000000", // 7: yellow     -> black
    "#000000", // 8: pink       -> black
    "#FFFFFF", // 9: brown      -> white
    "#FFFFFF", // 10: violet    -> white
    "#FFFFFF"  // 11: magenta   -> white
];

NEIGHBOR_OFFSETS = [
    [-1, -1], [0, -1], [1, -1],
    [-1, 0],           [1, 0],
    [-1, 1],  [0, 1],  [1, 1]
]

function mod(x, m) {
    return ((x % m) + m) % m;
}

function state_label(n) {
    // 0 -> A, 1 -> B, 2 -> C, ...
    return String.fromCodePoint(n + 65);
}

ACTION_LABELS = [
    "Turn left",
    "Turn right",
    "Go straight",
    "Turn around"
];

function action_label(n) {
    return ACTION_LABELS[n];
}

class Action {
    constructor(new_state=0, new_ground=0, turn_type=0) {
        this.new_state = new_state;
        this.new_ground = new_ground;
        this.turn_type = turn_type;
    }
}

class Ruleset {
    constructor(num_states=1, num_grounds=1) {
        // num_states x num_grounds array of new Actions
        this.rules = Array.from(
            { length: num_states }, 
            () => Array.from(
                { length: num_grounds },
                () => new Action()
            )
        );
        this.num_states = num_states;
        this.num_grounds = num_grounds;
    }

    read_ruleset_string(s) {
        const elems = s.split(",").map(num => parseInt(num, 10));
        if (elems.length < 2) {
            return;
        }
        this.num_states = elems[0];
        this.num_grounds = elems[1];
        this.rules = Array.from(
            { length: this.num_states }, 
            () => Array.from(
                { length: this.num_grounds },
                () => new Action()
            )
        );
        for (let i = 0; i < elems.length - 2; i++) {
            const state = Math.floor(i / (3 * this.num_grounds));
            const ground = Math.floor(i / 3) % this.num_grounds;
            switch (i % 3) {
                case 0:
                    this.set_new_state(state, ground, elems[i + 2]);
                    break;
                case 1:
                    this.set_new_ground(state, ground, elems[i + 2]);
                    break;
                case 2:
                    this.set_turn_type(state, ground, elems[i + 2]);
                    break;
            }
        }
    }

    get_ruleset_string() {
        const elems = [this.num_states, this.num_grounds];
        for (const row of this.rules) {
            for (const action of row) {
                elems.push(
                    action.new_state, 
                    action.new_ground, 
                    action.turn_type
                );
            }
        }
        return elems.join(",");
    }

    add_state() {
        this.rules.push(Array.from(
            { length: this.num_grounds }, 
            () => new Action()
        ));
        this.num_states++;
    }

    add_ground() {
        for (const row of this.rules) {
            row.push(new Action());
        }
        this.num_grounds++;
    }

    set_new_state(state, ground, new_state) {
        this.rules[state][ground].new_state = new_state;
    }

    set_new_ground(state, ground, new_ground) {
        this.rules[state][ground].new_ground = new_ground;
    }

    set_turn_type(state, ground, turn_type) {
        this.rules[state][ground].turn_type = turn_type;
    }

    set_rule(state, ground, new_state, new_ground, turn_type) {
        this.set_new_state(state, ground, new_state);
        this.set_new_ground(state, ground, new_ground);
        this.set_turn_type(state, ground, turn_type);
    }

    get_rule(state, ground) {
        return this.rules[state][ground];
    }

    html_table() {
        const table = document.createElement("table");

        const header_row = document.createElement("tr");
        const subheader_row = document.createElement("tr");
        const padder_cell = document.createElement("th");
        padder_cell.appendChild(Object.assign(
            document.createElement("div"),
            { style: "width:60px" }
        ));
        header_row.appendChild(padder_cell);
        subheader_row.appendChild(document.createElement("th"));
        for (let ground = 0; ground < this.num_grounds; ground++) {
            const ground_header = document.createElement("th");
            ground_header.setAttribute("scope", "col");
            ground_header.setAttribute("colspan", 3);
            ground_header.setAttribute("style", `background-color:${GROUND_COLORS[ground]}; color:${GROUND_COLORS_CONTRAST[ground]}`);
            ground_header.textContent = `Ground ${ground}`;
            header_row.appendChild(ground_header);

            for (const s of ["New<br>state", "New<br>ground", "Action"]) {
                const subheader = document.createElement("th");
                subheader.setAttribute("scope", "col");
                subheader.innerHTML = s;
                subheader_row.appendChild(subheader);
            }
        }
        table.appendChild(header_row);
        table.appendChild(subheader_row);

        for (let state = 0; state < this.num_states; state++) {
            const row = document.createElement("tr");
            table.appendChild(row);
            const row_header = document.createElement("th");
            row_header.setAttribute("scope", "row");
            row_header.innerHTML = `State ${state_label(state)}`;
            row.appendChild(row_header);
            for (let ground = 0; ground < this.num_grounds; ground++) {
                const action = this.get_rule(state, ground);

                const state_cell = document.createElement("td");
                state_cell.setAttribute("class", "table_cell");
                const state_select = document.createElement("select");
                state_select.setAttribute("id", `state ${state} ground ${ground} state`)
                state_select.setAttribute("class", "table_select");
                state_select.setAttribute("data-state", state);
                state_select.setAttribute("data-ground", ground);
                state_select.setAttribute("data-select-type", "new_state");
                for (let box_state = 0; box_state < this.num_states; box_state++) {
                    const state_option = document.createElement("option");
                    state_option.setAttribute("value", box_state);
                    state_option.textContent = state_label(box_state);
                    if (box_state == action.new_state) {
                        state_option.setAttribute("selected", "selected");
                    }
                    state_select.appendChild(state_option);
                }
                state_cell.appendChild(state_select);
                row.appendChild(state_cell);

                const ground_cell = document.createElement("td");
                ground_cell.setAttribute("class", "table_cell");
                const ground_select = document.createElement("select");
                ground_select.setAttribute("id", `state ${state} ground ${ground} ground`);
                ground_select.setAttribute("class", "table_select");
                ground_select.setAttribute("data-state", state);
                ground_select.setAttribute("data-ground", ground);
                ground_select.setAttribute("data-select-type", "new_ground");
                for (let box_ground = 0; box_ground < this.num_grounds; box_ground++) {
                    const ground_option = document.createElement("option");
                    ground_option.setAttribute("value", box_ground);
                    ground_option.textContent = box_ground;
                    if (box_ground == action.new_ground) {
                        ground_option.setAttribute("selected", "selected");
                        ground_select.value = box_ground;
                    }
                    ground_select.appendChild(ground_option);
                }
                ground_cell.appendChild(ground_select);
                row.appendChild(ground_cell);

                const action_cell = document.createElement("td");
                action_cell.setAttribute("class", "table_cell");
                const action_select = document.createElement("select");
                action_select.setAttribute("id", `state ${state} ground ${ground} turn`);
                action_select.setAttribute("class", "table_select turn_select");
                action_select.setAttribute("data-state", state);
                action_select.setAttribute("data-ground", ground);
                action_select.setAttribute("data-select-type", "action");
                for (const turn of [0, 1, 2, 3]) {
                    const turn_option = document.createElement("option");
                    turn_option.setAttribute("value", turn);
                    turn_option.textContent = action_label(turn);
                    if (turn == action.turn_type) {
                        turn_option.setAttribute("selected", "selected");
                        action_select.value = turn;
                    }
                    action_select.appendChild(turn_option);
                }
                action_cell.appendChild(action_select);
                row.appendChild(action_cell);
            }
        }
        return table;
    }
}

function apply_turn(direction, turn_type) {
    switch (turn_type) {
        case 0:
            // turn left
            [direction[0], direction[1]] = [direction[1], -direction[0]];
            break;
        case 1:
            // turn right
            [direction[0], direction[1]] = [-direction[1], direction[0]];
            break;
        case 2:
            // go straight
            break;
        case 3:
            // turn around
            [direction[0], direction[1]] = [-direction[0], -direction[1]];
            break;
        default:
            break;
    }
}

class Turmite {
    constructor(ruleset, x=0, y=0, initial_state=0, direction=null) {
        this.ruleset = ruleset;
        this.x = x;
        this.y = y;
        this.state = initial_state;
        this.direction = this.direction ?? [0, -1];
    }

    /**
     * Advance one time step, given that the turmite is on top of the
     * given ground color. Returns what ground color should be changed
     * to.
     * @param {Number} ground 
     * @returns {Number} new ground color
     */
    step(ground) {
        const action = this.ruleset.get_rule(this.state, ground);
        this.state = action.new_state;
        apply_turn(this.direction, action.turn_type);
        this.x += this.direction[0];
        this.y += this.direction[1];
        return action.new_ground;
    }
}

class TurmiteWorld {
    constructor(width, height, ctx) {
        this.width = width;
        this.height = height;
        this.ground = Array.from({length: height}, () => Array(width).fill(0));
        this.turmites = [];

        this.ctx = ctx;
        this.x0 = 0;
        this.y0 = 0;
        this.scale = 1.0;

        this.show_ground_numbers = true;
        this.show_turmite_state = true;
        this.show_turmite_orientation = true;
    }

    add_turmite(turmite) {
        this.turmites.push(turmite);
    }

    set_ground(x, y, ground) {
        this.ground[y][x] = ground;
    }

    get_ground(x, y) {
        return this.ground[y][x];
    }

    /**
     * Reset all cells to ground 0
     */
    reset_ground() {
        for (const row of this.ground) {
            row.fill(0);
        }
    }

    /**
     * Advance one time step and update display.
     */
    step() {
        for (const turmite of this.turmites) {
            const x = mod(turmite.x, this.width);
            const y = mod(turmite.y, this.height);
            const ground = this.get_ground(x, y);
            const new_ground = turmite.step(ground);
            this.set_ground(x, y, new_ground);
            this.update_display(x, y);
            this.draw_turmites();
        }
    }

    /**
     * Returns the canvas coordinates of the top left corner of the
     * cell at (`x`, `y`) using the current view parameters.
     * @param {Number} x 
     * @param {Number} y 
     * @returns {Array<Number>} An array with two values [`dispx`, `dispy`]
     */
    get_display_coords(x, y) {
        return [
            (x - this.x0) * this.scale,
            (y - this.y0) * this.scale
        ]
    }

    /**
     * Refresh the display of the cell at (`x`, `y`) and all of its neighbors
     * to eliminate any possible spillover of turmite's circle, etc.
     * @param {Number} x 
     * @param {Number} y 
     */
    update_display(x, y) {
        for (const [dx, dy] of NEIGHBOR_OFFSETS) {
            this.update_single(x + dx, y + dy);
        }
        this.update_single(x, y);
    }

    /**
     * Redraws the single cell at (`x`, `y`) to the canvas, leaving the
     * rest of the canvas unchanged
     * @param {Number} x 
     * @param {Number} y 
     */
    update_single(x, y) {
        x = mod(x, this.width);
        y = mod(y, this.height);
        const [dispx, dispy] = this.get_display_coords(x, y);
        const ground = this.get_ground(x, y);
        // fill in pixel
        this.ctx.fillStyle = GROUND_COLORS[ground];
        this.ctx.fillRect(Math.floor(dispx), Math.floor(dispy), Math.ceil(this.scale), Math.ceil(this.scale));

        // only show ground text above a certain zoom level
        if (this.show_ground_numbers && this.scale >= 6) {
            this.ctx.fillStyle = GROUND_COLORS_CONTRAST[ground];
            this.ctx.font = `${Math.floor(this.scale * 0.6)}px monospace`;
            this.ctx.textAlign = "center";
            this.ctx.textBaseline = "middle";
            this.ctx.fillText(ground, dispx + this.scale / 2, dispy + this.scale / 2);
        }
    }

    /**
     * Draws all turmites to the canvas
     */
    draw_turmites() {
        for (const turmite of this.turmites) {
            const x = mod(turmite.x, this.width);
            const y = mod(turmite.y, this.height);
            const ground = this.get_ground(x, y);
            const color_1 = "#FFFFFF";
            const color_2 = "#000000";
            const [dispx, dispy] = this.get_display_coords(x + 0.5, y + 0.5);

            // draw circle
            this.ctx.beginPath();
            this.ctx.arc(dispx, dispy, this.scale * 0.45, 0, 2 * Math.PI);
            this.ctx.fillStyle = color_1;
            this.ctx.fill();
            this.ctx.strokeStyle = color_2;
            this.ctx.stroke();

            // draw state letter
            if (this.show_turmite_state) {
                this.ctx.fillStyle = color_2;
                this.ctx.font = `${Math.floor(this.scale * 0.5)}px monospace`;
                this.ctx.textAlign = "center";
                this.ctx.textBaseline = "middle";
                this.ctx.fillText(state_label(turmite.state), dispx, dispy);
            }

            // draw direction arrow
            if (this.show_turmite_orientation) {
                this.ctx.strokeStyle = color_2;
                const d = turmite.direction;
                this.ctx.beginPath();
                this.ctx.moveTo(
                    dispx + this.scale * (d[0] * 0.2 + d[1] * 0.2), 
                    dispy + this.scale * (d[1] * 0.2 - d[0] * 0.2)
                );
                this.ctx.lineTo(
                    dispx + this.scale * (d[0] * 0.4),
                    dispy + this.scale * (d[1] * 0.4)
                );
                this.ctx.lineTo(
                    dispx + this.scale * (d[0] * 0.2 - d[1] * 0.2), 
                    dispy + this.scale * (d[1] * 0.2 + d[0] * 0.2)
                );
                this.ctx.stroke();
            }
        }
    }

    /**
     * Redraw all visible display elements
     */
    refresh_display() {
        const min_x = Math.max(0, Math.floor(this.x0));
        const max_x = Math.min(this.width - 1, Math.floor(this.x0 + 800 / this.scale));
        const min_y = Math.max(0, Math.floor(this.y0));
        const max_y = Math.min(this.height - 1, Math.floor(this.y0 + 800 / this.scale));

        ctx.clearRect(0, 0, 800, 800);
        for (let y = min_y; y <= max_y; y++) {
            for (let x = min_x; x <= max_x; x++) {
                this.update_single(x, y);
            }
        }
        this.draw_turmites();
    }

    /**
     * Sets view parameters to be close to the given target values.
     * The actual view parameters are rounded to ensure that scale
     * is an integer and x0 and y0 are multiples of 1/16.
     * @param {Number} target_scale 
     * @param {Number} target_x0 
     * @param {Number} target_y0 
     */
    quantize_view_params(target_scale, target_x0, target_y0) {
        this.scale = Math.round(target_scale);
        this.x0 = Math.round(target_x0 * 16) / 16;
        this.y0 = Math.round(target_y0 * 16) / 16;
        this.refresh_display();
    }
}

const world = new TurmiteWorld(250, 250, ctx);

const r = new Ruleset(1, 12);
// set ruleset to Langton's ant
r.read_ruleset_string("1,2,0,1,0,0,0,1");

// set up rule table container
const table_container = document.getElementById("table_container");
table_container.addEventListener("change", function (e) {
    const state = parseInt(e.target.getAttribute("data-state"));
    const ground = parseInt(e.target.getAttribute("data-ground"));
    const value = parseInt(e.target.value);
    switch (e.target.getAttribute("data-select-type")) {
        case "new_state":
            r.set_new_state(state, ground, value);
            break;
        case "new_ground":
            r.set_new_ground(state, ground, value);
            break;
        case "action":
            r.set_turn_type(state, ground, value);
            break;
        default:
            break;
    }
});
table_container.appendChild(r.html_table());

const turmite = new Turmite(r, 125, 125);
world.add_turmite(turmite);

// initial zoom settings
let target_scale = 25.0;
let target_x0 = 115.5;
let target_y0 = 115.5;
world.quantize_view_params(target_scale, target_x0, target_y0);

// set up click and drag
let mouse_down = false;
canvas.addEventListener("mousedown", function (e) {
    mouse_down = true;
});
canvas.addEventListener("mouseup", function (e) {
    mouse_down = false;
});

let mouse_x = 0.0;
let mouse_y = 0.0;
canvas.addEventListener("mousemove", function (e) {
    const canvas_bounds = canvas.getBoundingClientRect();
    const new_mouse_x = e.clientX - canvas_bounds.left;
    const new_mouse_y = e.clientY - canvas_bounds.top;
    if (mouse_down) {
        target_x0 += (mouse_x - new_mouse_x) / target_scale;
        target_y0 += (mouse_y - new_mouse_y) / target_scale;
        world.quantize_view_params(
            target_scale,
            target_x0,
            target_y0
        );
    }
    mouse_x = new_mouse_x;
    mouse_y = new_mouse_y;
});

// set up zooming with mouse wheel
canvas.addEventListener("wheel", function (e) {
    e.preventDefault();

    const new_scale = Math.max(2.0, Math.min(50.0, target_scale * 1.003**-e.deltaY));
    target_x0 += mouse_x * (1/Math.round(target_scale) - 1/Math.round(new_scale));
    target_y0 += mouse_y * (1/Math.round(target_scale) - 1/Math.round(new_scale));
    target_scale = new_scale;

    world.quantize_view_params(target_scale, target_x0, target_y0);
});

// set up speed slider
let speed = 1.0;
const speed_slider = document.getElementById("speed");
const speed_text = document.getElementById("speed_text");
speed_slider.oninput = function() {
    const v = 10**(parseInt(this.value) / 10);
    speed = v;
    speed_text.innerHTML = v.toFixed(2);
};

// set up play/pause button
let playing = false;
const playpause = document.getElementById("playpause");
playpause.addEventListener("click", function (e) {
    playing = !playing;
    if (playing) {
        playpause.innerHTML = "Pause";
    } else {
        playpause.innerHTML = "Play";
    }
});

// set up step button
let frame = 0.0;
const frame_text = document.getElementById("frame");
document.getElementById("step").addEventListener("click", function (e) {
    if (!playing) {
        world.step();
        frame += 1.0;
        frame_text.innerHTML = Math.floor(frame);
    }
});

// set up reset button
function reset_press() {
    world.reset_ground();
    for (const turmite of world.turmites) {
        turmite.state = 0;
        turmite.x = 125;
        turmite.y = 125;
        turmite.direction = [0, -1];
    }
    frame = 0.0;
    frame_text.innerHTML = 0;
    world.refresh_display();
}

document.getElementById("reset").addEventListener("click", reset_press);

// set up display settings
document.getElementById("ground_display").addEventListener("change", function (e) {
    world.show_ground_numbers = e.target.checked;
    world.refresh_display();
});
document.getElementById("state_display").addEventListener("change", function (e) {
    world.show_turmite_state = e.target.checked;
    world.refresh_display();
});
document.getElementById("orientation_display").addEventListener("change", function (e) {
    world.show_turmite_orientation = e.target.checked;
    world.refresh_display();
});

// set up randomize button
document.getElementById("randomize_actions").addEventListener("click", function (e) {
    for (let state = 0; state < r.num_states; state++) {
        for (let ground = 0; ground < r.num_grounds; ground++) {
            r.set_turn_type(state, ground, Math.floor(Math.random() * 4));
        }
    }
    table_container.innerHTML = "";
    table_container.appendChild(r.html_table());
});
document.getElementById("randomize_all").addEventListener("click", function (e) {
    for (let state = 0; state < r.num_states; state++) {
        for (let ground = 0; ground < r.num_grounds; ground++) {
            r.set_new_state(state, ground, Math.floor(Math.random() * r.num_states));
            r.set_new_ground(state, ground, Math.floor(Math.random() * r.num_grounds));
            r.set_turn_type(state, ground, Math.floor(Math.random() * 4));
        }
    }
    table_container.innerHTML = "";
    table_container.appendChild(r.html_table());
});

// set up + state button
const add_state_button = document.getElementById("add_state")
add_state_button.addEventListener("click", function (e) {
    if (r.num_states < STATE_CAP) {
        r.add_state();
        table_container.innerHTML = "";
        table_container.appendChild(r.html_table());
        if (r.num_states >= STATE_CAP) {
            add_state_button.disabled = true;
        }
    }
});
// set up + ground button
const add_ground_button = document.getElementById("add_ground")
add_ground_button.addEventListener("click", function (e) {
    if (r.num_grounds < GROUND_CAP) {
        r.add_ground();
        table_container.innerHTML = "";
        table_container.appendChild(r.html_table());
        if (r.num_grounds >= GROUND_CAP) {
            add_ground_button.disabled = true;
        }
    }
});

// set up example ruleset buttons
for (const preset_button of document.getElementsByClassName("preset_button")) {
    preset_button.addEventListener("click", function (e) {
        r.read_ruleset_string(preset_button.getAttribute("data-ruleset"));
        table_container.innerHTML = "";
        table_container.appendChild(r.html_table());
        if (r.num_states < STATE_CAP) {
            add_state_button.disabled = false;
        } else {
            add_state_button.disabled = true;
        }
        if (r.num_grounds < GROUND_CAP) {
            add_ground_button.disabled = false;
        } else {
            add_ground_button.disabled = true;
        }
        reset_press();
    });
}

// set up ruleset import / export
const ruleset_string_box = document.getElementById("ruleset_string_box");
document.getElementById("export_ruleset").addEventListener("click", function (e) {
    ruleset_string_box.value = r.get_ruleset_string();
});
document.getElementById("import_ruleset").addEventListener("click", function (e) {
    r.read_ruleset_string(ruleset_string_box.value);
    table_container.innerHTML = "";
    table_container.appendChild(r.html_table());
    reset_press();
});

function animate() {
    if (playing) {
        const prev_frame = Math.floor(frame);
        frame += speed;
        const new_frame = Math.floor(frame);
        for (let a = prev_frame; a < new_frame; a++) {
            world.step();
        }
        frame_text.innerHTML = new_frame;
    }

    requestAnimationFrame(animate);
}

animate();