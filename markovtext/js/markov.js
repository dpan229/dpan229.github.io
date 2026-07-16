const markov_canvas = document.getElementById("markovCanvas");
const ctx = markov_canvas.getContext("2d");

const focus_header = document.getElementById("focusHeaderText");
const focus_left = document.getElementById("focusLeft");
const focus_right = document.getElementById("focusRight");

function escape_html(s) {
    return s.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

function add_colors(base, c1, w1, c2, w2) {
    return {
        r: Math.max(0, Math.min(255, Math.round(base.r + w1 * (c1.r - base.r) + w2 * (c2.r - base.r)))),
        g: Math.max(0, Math.min(255, Math.round(base.g + w1 * (c1.g - base.g) + w2 * (c2.g - base.g)))),
        b: Math.max(0, Math.min(255, Math.round(base.b + w1 * (c1.b - base.b) + w2 * (c2.b - base.b))))
    };
}

function color_string(c) {
    return `#${c.r.toString(16).padStart(2, "0")}${c.g.toString(16).padStart(2, "0")}${c.b.toString(16).padStart(2, "0")}`;
}

function get_default(map, k, d) {
    return map.has(k) ? map.get(k) : d;
}

// keep track of mouse position on canvas and whether the mouse is up or down
let mouse_down = false;
let dragging_node = null;
markov_canvas.addEventListener("mousedown", function (e) {
    const world_x = mouse_x / scale + x0;
    const world_y = mouse_y / scale + y0;
    const node = world.closest_node(world_x, world_y);
    dragging_node = node;
    if (!generating) {
        world.set_focus(node);
    }
    mouse_down = true;
});
markov_canvas.addEventListener("mouseup", function (e) {
    dragging_node = null;
    mouse_down = false;
});
let last_mouse_x = 0;
let last_mouse_y = 0;
let mouse_x = 0;
let mouse_y = 0;
markov_canvas.addEventListener("mousemove", function (e) {
    last_mouse_x = mouse_x;
    last_mouse_y = mouse_y;
    const canvas_bounds = markov_canvas.getBoundingClientRect();
    mouse_x = Math.round(e.clientX - canvas_bounds.left);
    mouse_y = Math.round(e.clientY - canvas_bounds.top);
});

/**
 * If the key `k` is present in the given map, increment the 
 * corresponding value in the map by 1, otherwise add it to the map
 * with a value of 1.
 * @param {Map} map 
 * @param {*} k 
 */
function increment_key(map, k) {
    if (map.has(k)) {
        map.set(k, map.get(k) + 1);
    } else {
        map.set(k, 1);
    }
}

class Node {
    constructor(x, y, label, context, static_label=false) {
        this.x = x;
        this.y = y;
        this.label = label;
        this.context = context;
        this.static_label = static_label

        this.vx = 0.0;
        this.vy = 0.0;
        this.primary_connections = new Map();
        this.secondary_connections = new Map();
    }

    add_connection(obj) {
        increment_key(this.primary_connections, obj);
        increment_key(obj.secondary_connections, this);
    }

    clear_connections() {
        this.primary_connections.clear();
        this.secondary_connections.clear();
    }

    connected(obj) {
        return this.primary_connections.has(obj) || this.secondary_connections.has(obj);
    }

    get_count(obj) {
        let out = 0;
        if (this.primary_connections.has(obj)) {
            out += this.primary_connections.get(obj);
        } 
        if (this.secondary_connections.has(obj)) {
            out += this.secondary_connections.get(obj);
        }
        return out;
    }

    orphaned() {
        return this.primary_connections.size == 0 && this.secondary_connections.size == 0;
    }
}

class MarkovWorld {
    constructor(width, height, ctx) {
        this.width = width;
        this.height = height;
        this.ctx = ctx;

        this.nodes = [];
        this.focus = null;
        this.contexts = new Map();
        this.context_size = 3;

        this.sep = "";
        this.text = "";

        this.forward_depth = new Map();
        this.reverse_depth = new Map();

        this.label_mode = 0;

        this.damping = 0.995;
    }

    get_last_element(context) {
        return context.split(this.sep).at(-1);
    }

    get_label(context) {
        switch (this.label_mode) {
            case 1:
                return context;
            default:
                return this.get_last_element(context);
        }
    }

    set_label_mode(mode) {
        if (mode != this.label_mode) {
            this.label_mode = mode;
            // relabel existing nodes
            for (const node of this.nodes) {
                if (!node.static_label) {
                    node.label = this.get_label(node.context);
                }
            }
        }
    }

    /**
     * Gets existing node corresponding to the given context or makes a new node
     * if it doesn't exist.
     * If a new node is created, it will be created near the given position.
     * @param {string} context 
     * @param {number} near_x 
     * @param {number} near_y 
     * @param {string} label_override 
     * @returns {Node} Node corresponding to the given context
     */
    get_node(context, near_x, near_y, label_override=null) {
        if (this.contexts.has(context)) {
            return this.contexts.get(context);
        } else {
            const t = Math.random() * 2 * Math.PI;
            const node = new Node(
                near_x + Math.cos(t) * 50,
                near_y + Math.sin(t) * 50,
                label_override ?? this.get_label(context),
                context,
                label_override !== null
            );
            this.nodes.push(node);
            this.contexts.set(context, node);
            return node;
        }
    }

    /**
     * Sets nodes and connections based on the given text and current
     * separator and context window settings. 
     * @param {string} text 
     */
    set_text(text) {
        this.clear_focus();
        this.text = text;

        // delete all current connections but leave nodes
        for (const node of this.nodes) {
            node.clear_connections();
        }

        let prev_obj = this.get_node("<START>", this.width / 2, this.height / 2, "<START>");
        const elems = text.split(this.sep);
        for (let i = 0; i < elems.length; i++) {
            const context = elems.slice(Math.max(0, i - this.context_size + 1), i + 1).join(this.sep);
            const obj = this.get_node(context, prev_obj.x, prev_obj.y);
            prev_obj.add_connection(obj);
            prev_obj = obj;
        }
        const end_context = elems.slice(Math.max(0, elems.length - this.context_size + 1)).concat("<END>").join(this.sep);
        const end_node = this.get_node(end_context, prev_obj.x, prev_obj.y, "<END>");
        prev_obj.add_connection(end_node);

        // delete any nodes with no connections
        for (let i = 0; i < this.nodes.length;) {
            const node = this.nodes[i];
            if (node.orphaned()) {
                this.contexts.delete(node.context);
                this.nodes.splice(i, 1);
            } else {
                i++;
            }
        }
    }

    /**
     * Returns node whose position is closest to the given position.
     * @param {Number} x 
     * @param {Number} y 
     * @returns closest node
     */
    closest_node(x, y) {
        let out = null;
        let best_d2 = Infinity;
        for (const node of this.nodes) {
            const dx = x - node.x;
            const dy = y - node.y;
            const d2 = dx*dx + dy*dy;
            if (d2 < best_d2) {
                out = node;
                best_d2 = d2;
            }
        }
        return out;
    }

    center_of_mass() {
        let x_sum = 0;
        let y_sum = 0;
        for (const node of this.nodes) {
            x_sum += node.x;
            y_sum += node.y;
        }
        return {
            x: x_sum / this.nodes.length,
            y: y_sum / this.nodes.length
        }
    }

    bounding_coords() {
        let min_x = Infinity;
        let max_x = -Infinity;
        let min_y = Infinity;
        let max_y = -Infinity;
        for (const node of this.nodes) {
            min_x = Math.min(min_x, node.x - 20);
            max_x = Math.max(max_x, node.x + 20);
            min_y = Math.min(min_y, node.y - 20);
            max_y = Math.max(max_y, node.y + 20);
        }
        return {
            min_x: min_x,
            max_x: max_x,
            min_y: min_y,
            max_y: max_y
        }   
    }

    set_focus(node) {
        this.focus = node;

        focus_header.innerHTML = `<strong>${escape_html(node.context)}</strong>`;
        const sorted_lefts = [...node.secondary_connections.entries()].sort((a, b) => b[1] - a[1]);
        const lefts = [];
        sorted_lefts.forEach(kv => {
            const [node2, count] = kv;
            let precontext;
            if (node2.static_label) {
                precontext = node2.label;
            } else if (node2.context.length < this.context_size) {
                precontext = "";
            } else {
                precontext = node2.context.split(this.sep)[0];
            }
            lefts.push(`${escape_html(precontext)}${this.sep}<strong>${escape_html(node.context)}</strong> <b>${count}</b>`);
        });
        focus_left.innerHTML = lefts.join("<br>");
        const sorted_rights = [...node.primary_connections.entries()].sort((a, b) => b[1] - a[1]);
        const rights = [];
        sorted_rights.forEach(kv => {
            const [node2, count] = kv;
            const postcontext = node2.static_label ? node2.label : this.get_last_element(node2.context);
            rights.push(`<b>${count}</b> <strong>${escape_html(node.context)}</strong>${this.sep}${escape_html(postcontext)}`);
        });
        focus_right.innerHTML = rights.join("<br>");

        this.forward_depth.clear();
        let search = [node];
        this.forward_depth.set(node, 0);
        let current_depth = 1;
        while (search.length > 0) {
            const next_search = [];
            for (const search_node of search) {
                for (const next_node of search_node.primary_connections.keys()) {
                    if (!this.forward_depth.has(next_node)) {
                        this.forward_depth.set(next_node, current_depth);
                        next_search.push(next_node);
                    }
                }
            }
            search = next_search;
            current_depth++;
        }

        this.reverse_depth.clear();
        search = [node];
        this.reverse_depth.set(node, 0);
        current_depth = 1;
        while (search.length > 0) {
            const next_search = [];
            for (const search_node of search) {
                for (const next_node of search_node.secondary_connections.keys()) {
                    if (!this.reverse_depth.has(next_node)) {
                        this.reverse_depth.set(next_node, current_depth);
                        next_search.push(next_node);
                    }
                }
            }
            search = next_search;
            current_depth++;
        }

        // const highlight = `<span style="background-color: lightskyblue;">${node.context}</span>`
        // textbox.innerHTML = textbox.innerText.replaceAll(node.context, highlight);
    }

    /**
     * Move focus to a random primary connection of the current focus.
     * The probability of moving to each node is proportional to the
     * corresponding connection's count. Returns the new focus.
     * 
     * If current focus has no primary connections, instead clears
     * focus and returns null. If there is no current focus, does
     * nothing and returns null.
     * @returns The new focus if applicable, otherwise null
     */
    random_step_focus() {
        if (this.focus !== null) {
            if (this.focus.primary_connections.size == 0) {
                this.clear_focus();
                return null;
            }
            let count_sum = 0;
            for (const count of this.focus.primary_connections.values()) {
                count_sum += count;
            }
            let i = Math.floor(Math.random() * count_sum);
            for (const [node, count] of this.focus.primary_connections) {
                i -= count;
                if (i < 0) {
                    this.set_focus(node);
                    return node;
                }
            }
        }
        return null;
    }

    clear_focus() {
        this.focus = null;

        focus_header.innerHTML = "";
        focus_left.innerHTML = "";
        focus_right.innerHTML = "";
        this.forward_depth.clear();
        this.reverse_depth.clear();
    }

    /**
     * Delete all nodes and recreate network from scratch with 
     * current settings.
     */
    reparse() {
        this.nodes = [];
        this.contexts.clear();
        this.set_text(this.text);
    }

    set_context_size(s) {
        if (s != this.context_size) {
            this.context_size = s;
            this.reparse();
        }
    }

    set_sep(sep) {
        if (sep != this.sep) {
            this.sep = sep;
            this.reparse();
        }
    }

    /**
     * Apply physics to nodes, updating their positions and velocities.
     * Connected nodes feel a spring force, unconnected nodes feel an
     * inverse-square repulsive force.
     * 
     * All nodes are then slowed by current damping value. Damping value
     * defaults to 0.995 but is lowered if nodes are moving 
     * quickly.
     * 
     * All nodes are translated so that the system's center of
     * mass is at (0, 0).
     */
    physics() {
        const step = 1;
        for (let i = 0; i < this.nodes.length; i++) {
            const node1 = this.nodes[i];
            for (let j = i + 1; j < this.nodes.length; j++) {
                const node2 = this.nodes[j];

                const dx = node2.x - node1.x;
                const dy = node2.y - node1.y;
                const d2 = dx*dx + dy*dy;
                const d2_clamp = Math.max(d2, 100.0);

                if (node1.connected(node2)) {
                    // spring connected nodes
                    const factor = (Math.sqrt(d2) - 50) * Math.sqrt(node1.get_count(node2));
                    node1.vx += step * factor * dx / d2_clamp;
                    node1.vy += step * factor * dy / d2_clamp;
                    node2.vx -= step * factor * dx / d2_clamp;
                    node2.vy -= step * factor * dy / d2_clamp;
                } else {
                    // push unconnected nodes apart
                    node1.vx -= step * dx / d2_clamp;
                    node1.vy -= step * dy / d2_clamp;
                    node2.vx += step * dx / d2_clamp;
                    node2.vy += step * dy / d2_clamp;
                }
            }
        }

        // move nodes and apply damping
        for (const node of this.nodes) {
            node.x += step * node.vx;
            node.y += step * node.vy;

            node.vx *= this.damping;
            node.vy *= this.damping;
        }
        // move nodes so center of mass stays at (0, 0)
        const com = this.center_of_mass();
        for (const node of this.nodes) {
            node.x -= com.x;
            node.y -= com.y;
        }
        // determine next damping
        let max_speed = 0.0;
        for (const node of this.nodes) {
            max_speed = Math.max(max_speed, node.vx*node.vx + node.vy*node.vy);
        }
        max_speed = Math.sqrt(max_speed);
        if (max_speed == 0) {
            this.damping = 0.995;
        } else {
            this.damping = Math.max(0.5, Math.min(0.995, 1 - max_speed**2 / 10000));
        }
    }

    draw(x0, y0, scale) {
        const ctx = this.ctx;
        const node_radius = Math.min(scale * 20, 15);
        ctx.globalAlpha = 1;
        for (const node1 of this.nodes) {
            for (const [node2, count] of node1.primary_connections) {
                const line_width = Math.sqrt(count);
                const line_color = color_string(add_colors(
                    { r: 0, g: 0, b: 0 },
                    { r: 255, g: 0, b: 0 },
                    this.forward_depth.has(node1) ? (1 / (0.5 * this.forward_depth.get(node1) + 1)) : 0,
                    { r: 0, g: 255, b: 0},
                    this.reverse_depth.has(node2) ? (1 / (0.5 * this.reverse_depth.get(node2) + 1)) : 0
                ));
                ctx.strokeStyle = line_color;
                ctx.lineWidth = line_width;
                if (node1 === node2) {
                    // node connecting to itself
                    // draw circle
                    ctx.beginPath();
                    ctx.arc(
                        scale * (node1.x - x0) + node_radius,
                        scale * (node1.y - y0) + node_radius,
                        node_radius, 0, 2 * Math.PI
                    );
                    ctx.stroke();
                    // draw arrowhead
                    const tip_x = scale * (node1.x - x0);
                    const tip_y = scale * (node1.y - y0) + node_radius;
                    const head_y = tip_y + 5 * line_width;
                    const head_1_x = tip_x + 3 * line_width;
                    const head_2_x = tip_x - 3 * line_width;
                    ctx.beginPath();
                    ctx.moveTo(head_1_x, head_y);
                    ctx.lineTo(tip_x, tip_y);
                    ctx.lineTo(head_2_x, head_y);
                    ctx.stroke();
                } else {
                    // draw connecting line
                    ctx.beginPath();
                    ctx.moveTo(scale * (node1.x - x0), scale * (node1.y - y0));
                    ctx.lineTo(scale * (node2.x - x0), scale * (node2.y - y0));
                    ctx.stroke();

                    // draw arrowhead
                    const dx = node2.x - node1.x;
                    const dy = node2.y - node1.y;
                    const d = Math.sqrt(dx*dx + dy*dy);
                    const tip_x = scale * (node2.x - x0) - dx * node_radius / d;
                    const tip_y = scale * (node2.y - y0) - dy * node_radius / d;
                    const head_center_x = tip_x - 5 * line_width * dx / d;
                    const head_center_y = tip_y - 5 * line_width * dy / d;
                    const head_1_x = head_center_x + 3 * line_width * dy / d;
                    const head_1_y = head_center_y - 3 * line_width * dx / d;
                    const head_2_x = head_center_x - 3 * line_width * dy / d;
                    const head_2_y = head_center_y + 3 * line_width * dx / d;
                    ctx.beginPath();
                    ctx.moveTo(head_1_x, head_1_y);
                    ctx.lineTo(tip_x, tip_y);
                    ctx.lineTo(head_2_x, head_2_y);
                    ctx.stroke();
                }
            }
        }
        for (const node of this.nodes) {
            const canvas_x = scale * (node.x - x0);
            const canvas_y = scale * (node.y - y0); 
            // draw node body
            ctx.globalAlpha = 0.8;
            ctx.beginPath();
            ctx.arc(canvas_x, canvas_y, node_radius, 0, 2 * Math.PI);
            ctx.lineWidth = 1;
            if (this.focus === null) {
                ctx.fillStyle = "#c8c8c8";
            } else {
                if (node === this.focus) {
                    ctx.fillStyle = "lightskyblue";
                } else {
                    // const depth = Math.min(
                    //     get_default(this.forward_depth, node, Infinity),
                    //     get_default(this.reverse_depth, node, Infinity)
                    // );
                    // ctx.globalAlpha = Math.max(0, 1 - depth / 9); 
                    ctx.fillStyle = "#c8c8c8";
                }
            }
            ctx.fill();

            // draw text
            ctx.globalAlpha = 1;
            ctx.fillStyle = "#000000";
            ctx.font = "12px monospace";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(node.label, canvas_x, canvas_y);
        }
    }
}

// set up display collapse control
let display_visible = true;
const display_container = document.getElementById("display_container");
const collapse_display = document.getElementById("collapse_display");
collapse_display.addEventListener("click", function (e) {
    display_visible = !display_visible;
    if (display_visible) {
        display_container.setAttribute("style", "");
        collapse_display.textContent = "(Collapse)";
    } else {
        display_container.setAttribute("style", "display: none;");
        collapse_display.textContent = "(Show)";
    }
});
// set up focus info collapse control
let focus_info_visible = true;
const focus_info = document.getElementById("focus_info");
const collapse_focus = document.getElementById("collapse_focus");
collapse_focus.addEventListener("click", function (e) {
    focus_info_visible = !focus_info_visible;
    if (focus_info_visible) {
        focus_info.setAttribute("style", "");
        collapse_focus.textContent = "(Collapse)";
    } else {
        focus_info.setAttribute("style", "display: none;");
        collapse_focus.textContent = "(Show)";
    }
});

// set up autozoom control
const autozoom_checkbox = document.getElementById("autozoom");
let autozoom = true;
autozoom_checkbox.addEventListener("change", function (e) {
    autozoom = e.target.checked;
});

// set up physics checkbox
const physics_checkbox = document.getElementById("physics");
let physics = true;
physics_checkbox.addEventListener("change", function (e) {
    physics = e.target.checked;
});

// set up node label select
const node_label_select = document.getElementById("node_text_select");
node_label_select.addEventListener("change", function () {
    switch (node_label_select.value) {
        case "last_elem":
            world.set_label_mode(0);
            break;
    
        case "whole_context":
            world.set_label_mode(1);
            break

        default:
            break;
    }
});

// set up zooming with mouse wheel
let scale = 1.0;
let x0 = 0.0;
let y0 = 0.0;
markov_canvas.addEventListener("wheel", function (e) {
    e.preventDefault();

    autozoom_checkbox.checked = false;
    autozoom = false;

    const new_scale = scale * 1.003**-e.deltaY;
    x0 = x0 + mouse_x * (1/scale - 1/new_scale);
    y0 = y0 + mouse_y * (1/scale - 1/new_scale);
    scale = new_scale;
});

// get text for current context window units (either "character",
// "characters", "word", or "words")
function get_unit_text() {
    if (world.sep == "") {
        if (world.context_size == 1) {
            return "character";
        } else {
            return "characters";
        }
    } else {
        if (world.context_size == 1) {
            return "word";
        } else {
            return "words";
        }
    }
}

// set up context size control
const context_size_slider = document.getElementById("context_size_slider");
const context_size_label = document.getElementById("context_size_label");
context_size_slider.oninput = function () {
    const v = parseInt(this.value);
    world.set_context_size(v);
    context_size_label.innerHTML = `Context window: ${v} ${get_unit_text()}`;
};

// set up element type control
const elem_select = document.getElementById("elem_select");
elem_select.addEventListener("change", function () {
    switch (elem_select.value) {
        case "characters":
            world.set_sep("");
            break;
    
        case "words":
            world.set_sep(" ");
            break

        default:
            break;
    }
    context_size_label.innerHTML = `Context window: ${world.context_size} ${get_unit_text()}`;
});

// set up generate button
const generate_button = document.getElementById("start_random");
let generating = false;
const output_box = document.getElementById("output");
let output = "";
generate_button.addEventListener("click", function() {
    if (generating) {
        generating = false;
        generate_button.innerHTML = "Generate random output";
    } else {
        generating = true;
        generate_button.innerHTML = "Stop generating";
        world.focus = world.get_node("<START>");
        output = "";
        generate_cooldown = 0;
    }
});

// set up generate speed control
const generate_slider = document.getElementById("random_speed");
let generate_max_cooldown = 3;
let generate_cooldown = 3;
const generate_slider_label = document.getElementById("random_speed_label");
generate_slider.oninput = function () {
    const v = parseInt(this.value);
    generate_max_cooldown = v;
    generate_cooldown = v;
    generate_slider_label.innerHTML = `Wait frames: ${v}`;
}

// initialize world object
const world = new MarkovWorld(800, 800, ctx);
world.set_text("");

// set up link to editable text box
const textbox = document.getElementById("textbox");
textbox.addEventListener("input", function () {
    world.set_text(textbox.innerText);
});
world.set_text(textbox.innerText);

function animate() {

    if (generating) {
        if (generate_cooldown <= 0) {
            // add next element to generation
            node = world.random_step_focus();
            if (node === null) {
                // reached end node, generation finished
                generate_button.innerHTML = "Generate random output";
                generating = false;
            } else {
                output = output.concat(world.sep.concat(
                    node.static_label ? node.label : world.get_last_element(node.context)
                ));
                output_box.innerText = output;
            }
            generate_cooldown = generate_max_cooldown;
        } else {
            generate_cooldown--;
        }
    }

    if (display_visible) {
        if (autozoom) {
            // zoom to fit all objects on screen
            const bounds = world.bounding_coords();
            const d = Math.max(bounds.max_x - bounds.min_x, bounds.max_y - bounds.min_y, 100);
            scale = 800 / d;
            x0 = (bounds.min_x + bounds.max_x) / 2 - d / 2;
            y0 = (bounds.min_y + bounds.max_y) / 2 - d / 2;
        }

        if (mouse_down) {
            // move dragged node to mouse position
            if (dragging_node !== null) {
                const world_x = mouse_x / scale + x0;
                const world_y = mouse_y / scale + y0;
                dragging_node.x = world_x;
                dragging_node.y = world_y;
                dragging_node.vx = 0.0;
                dragging_node.vy = 0.0;
            }
        }

        ctx.clearRect(0, 0, 800, 800);
        world.draw(x0, y0, scale);
        if (physics) {
            world.physics();
        }
    }

    requestAnimationFrame(animate);
}

animate();