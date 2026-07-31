const canvas = document.getElementById("vaneckCanvas");
const ctx = canvas.getContext("2d");

const bar_canvas = document.getElementById("barCanvas");
const bar_ctx = bar_canvas.getContext("2d");
const bar_canvas_height = bar_canvas.height;

function random_color() {
    return { 
        r: Math.floor(Math.random() * 128 + 128),
        g: Math.floor(Math.random() * 128 + 128),
        b: Math.floor(Math.random() * 128 + 128)
    };
}

function color_string(color) {
    return `#${color.r.toString(16).padStart(2, "0")}${color.g.toString(16).padStart(2, "0")}${color.b.toString(16).padStart(2, "0")}`;
}

class VanEckApp {
    constructor(width, height, seed=null) {
        this.width = width;
        this.height = height;
        this.i0 = 0;
        this.scale = 20;
        this.max_scale = 50;

        this.target_i0 = 0;
        this.target_scale = 20;
        
        if (seed === null) {
            this.seq = [0];
            this.seed_length = 1;
        } else {
            this.seq = [...seed];
            this.seed_length = seed.length;
        }
        this.colors = new Map();
        this.selected = null;
        this.selection_held = false;

        this.bar_highlight = [];
        this.highlight_num = null;

        this.update();
    }

    reset_seq(seed=null) {
        this.deselect();
        if (seed === null) {
            this.seq = [0];
            this.seed_length = 1;
        } else {
            this.seq = [...seed];
            this.seed_length = seed.length;
        }
        this.update();
    }

    snap_i0(i) {
        this.i0 = Math.min(this.seq.length - 1, Math.max(0, i));
        this.target_i0 = this.i0;
    }

    slide_i0(i) {
        this.target_i0 = Math.min(this.seq.length - 1, Math.max(0, i));
    }

    snap_scale(s) {
        this.scale = Math.min(this.max_scale, Math.max(1, s));
        this.target_scale = this.scale;
    }

    slide_scale(s) {
        this.target_scale = Math.min(this.max_scale, Math.max(1, s));
    }

    get_screen_x(i) {
        return (i - this.i0) * this.scale;
    }

    get_i(screen_x) {
        return screen_x / this.scale + this.i0;
    }

    add_to_sequence(n) {
        this.seq.push(n);
        if (n == this.highlight_num) {
            this.bar_highlight.push(this.seq.length - 1);
        }
    }

    next() {
        const v = this.seq.at(-1);
        for (let i = this.seq.length - 2; i >= 0; i--) {
            if (this.seq[i] == v) {
                const n = this.seq.length - i - 1;
                this.add_to_sequence(n);
                return n;
            }
        }
        this.add_to_sequence(0);
        return 0;
    }

    select(i) {
        this.selected = i;
        if (i >= this.seed_length) {
            this.bar_highlight = [];
            this.highlight_num = this.seq[i - 1];
            for (let j = 0; j < this.seq.length; j++) {
                if (this.seq[j] == this.highlight_num) {
                    this.bar_highlight.push(j);
                }
            }
        } else {
            this.bar_highlight = [];
            this.highlight_num = null;
        }
    }

    deselect() {
        this.selected = null;
        this.selection_held = false;
        this.bar_highlight = [];
    }

    toggle_hold_selection() {
        if (this.selection_held) {
            this.selection_held = false;
        } else if (this.selected !== null) {
            this.selection_held = true;
        }
    }

    get_color(n) {
        if (this.colors.has(n)) {
            return this.colors.get(n);
        } else {
            const color = color_string(random_color());
            this.colors.set(n, color);
            return color;
        }
    } 

    update() {
        // update view parameters
        this.scale = 1 / (1/this.scale + 0.05 * (1/this.target_scale - 1/this.scale))
        this.i0 += 0.05 * (this.target_i0 - this.i0);

        // lock view to current sequence length
        // this.target_i0 = Math.min(this.seq.length - 1, Math.max(0, this.target_i0));
        // this.i0 = Math.min(this.seq.length - 1, Math.max(0, this.i0));
        // this.target_scale = Math.min(this.height, Math.max(1, this.scale));
        // this.scale = Math.min(this.height, Math.max(1, this.scale));

        // extend sequence
        const new_length = Math.floor(this.get_i(this.width));
        while (this.seq.length <= new_length) {
            this.next();
        }
    }

    epic_zoom() {
        if (this.selected !== null) {
            const n = this.seq[this.selected];
            const target_scale = this.width / (n + 2);
            if (target_scale > this.max_scale) {
                // slide so selected is flush right
                this.slide_i0(this.selected + 1 - this.width / this.max_scale);
            } else {
                // slide so left reference is flush left
                this.slide_i0(this.selected - 1 - n);
            }
            this.slide_scale(this.width / (n + 2));
        }
    }

    draw(ctx, bar_ctx) {
        const minI = Math.floor(this.i0);
        const rightEdgeI = this.get_i(this.width);
        const maxI = Math.min(this.seq.length - 1, Math.floor(rightEdgeI));
        for (let i = minI; i <= maxI; i++) {
            const n = this.seq[i];
            const x0 = this.get_screen_x(i);
            const y0 = this.height - this.scale;
            const color = this.get_color(n);
            ctx.fillStyle = color;
            // draw bar
            ctx.globalAlpha = 0.5;
            ctx.fillRect(x0, y0 - this.scale * n, this.scale, this.scale * n);
            // draw bottom square
            ctx.globalAlpha = 1;
            ctx.fillRect(x0, y0, this.scale, this.scale);

            // draw text
            ctx.fillStyle = "#000000";
            const s = n.toString();
            const font_size = Math.min(
                18, // max font size 18 px 
                0.8 * this.scale, // fit in box vertically
                1.6 * this.scale / s.length // fit in box horizontally
            );
            ctx.font = `${Math.floor(font_size)}px monospace`;
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(s, x0 + this.scale / 2, y0 + this.scale / 2);
        }

        // draw bottom bar
        const start_frac = this.i0 / (this.seq.length + 1);
        const end_frac = rightEdgeI / (this.seq.length + 1);
        // draw background
        bar_ctx.fillStyle = "#c5c5c5";
        bar_ctx.fillRect(0, 0, this.width, bar_canvas_height);
        // draw blue view highlight
        bar_ctx.fillStyle = "#4d8eff";
        bar_ctx.fillRect(start_frac * this.width, 0, (end_frac - start_frac) * this.width, bar_canvas_height);

        // draw selection shapes
        if (this.selected !== null) {
            const n = this.seq[this.selected];
            if (this.selected >= this.seed_length) {
                // enable red glow if selection is held
                if (this.selection_held) {
                    ctx.shadowBlur = 5;
                    ctx.shadowColor = "red";
                }
                if (n == 0) {
                    // draw selected circle when n = 0
                    const x = this.get_screen_x(this.selected - 0.5);
                    ctx.strokeStyle = "red";
                    ctx.beginPath();
                    ctx.arc(x, this.height - this.scale / 2, this.scale / 2, 0, 2 * Math.PI);
                    ctx.stroke();
                } else {
                    // draw selected arc
                    const i2 = this.selected - 1;
                    const i1 = this.selected - 1 - n;

                    const x1 = this.get_screen_x(i1 + 0.5);
                    const x2 = this.get_screen_x(i2 + 0.5);

                    ctx.strokeStyle = "red";
                    ctx.beginPath();
                    ctx.arc((x1 + x2) / 2, this.height - this.scale, (x2 - x1) / 2, -Math.PI, 0);
                    ctx.stroke();

                    ctx.beginPath();
                    ctx.arc(x1, this.height - this.scale / 2, this.scale / 2, 0, 2 * Math.PI);
                    ctx.stroke()
                    ctx.beginPath();
                    ctx.arc(x2, this.height - this.scale / 2, this.scale / 2, 0, 2 * Math.PI);
                    ctx.stroke()                
                }
                // disable glow
                ctx.shadowColor = "rgba(0, 0, 0, 0)";
            }

            // draw box around selected
            ctx.strokeStyle = "green";
            ctx.strokeRect(this.get_screen_x(this.selected), this.height - this.scale, this.scale, this.scale);

            // highlight matches in bar
            bar_ctx.globalAlpha = 0.5
            bar_ctx.fillStyle = "red";
            for (let i of this.bar_highlight) {
                bar_ctx.fillRect(
                    this.width * i / (this.seq.length + 1), 0, 
                    Math.max(1, this.width / (this.seq.length + 1)), bar_canvas_height
                );
            }
            bar_ctx.globalAlpha = 1;
            // draw connection in bar
            if (this.selected >= this.seed_length) {
                bar_ctx.fillRect(
                    this.width * (this.selected - 1 - n) / (this.seq.length + 1), 0, 
                    this.width / (this.seq.length + 1), bar_canvas_height
                );
                bar_ctx.fillRect(
                    this.width * (this.selected - 1) / (this.seq.length + 1), 0, 
                    this.width / (this.seq.length + 1), bar_canvas_height
                );
                bar_ctx.strokeStyle = "red";
                bar_ctx.beginPath();
                bar_ctx.moveTo(this.width * (this.selected - n) / (this.seq.length + 1), bar_canvas_height / 2);
                bar_ctx.lineTo(this.width * (this.selected - 1) / (this.seq.length + 1), bar_canvas_height / 2);
                bar_ctx.stroke();
            }
            // draw selected position in bar
            bar_ctx.fillStyle = "green";
            bar_ctx.fillRect(this.width * this.selected / (this.seq.length + 1), 0, this.width / (this.seq.length + 1), bar_canvas_height);
        }

        // draw bottom bar text
        bar_ctx.fillStyle = "#000000";
        bar_ctx.font = "10px monospace";
        bar_ctx.textBaseline = "top";
        bar_ctx.textAlign = "right";
        bar_ctx.fillText((this.i0 + 1).toFixed(0), start_frac * this.width, 0);
        bar_ctx.textBaseline = "alphabetic";
        bar_ctx.textAlign = "left";
        bar_ctx.fillText((rightEdgeI + 1).toFixed(0), end_frac * this.width, bar_canvas_height);

        // draw "terms generated" text
        ctx.fillStyle = "#000000";
        ctx.font = "18px monospace";
        ctx.textBaseline = "top";
        ctx.textAlign = "left";
        ctx.fillText(`Terms generated: ${this.seq.length}`, 0, 0);
    }
}

const app = new VanEckApp(1000, 500);

// set up pointer controls
const active_pointers = new Map();
function get_secondary_pointer(primary_pointer_id) {
    for (const [pointer_id, pointer_props] of active_pointers.entries()) {
        if (pointer_id != primary_pointer_id && pointer_props.down) {
            return pointer_props;
        }
    }
    return null;
}
function set_selection_from_pointer(x, y) {
    const i = Math.floor(app.get_i(x));
    if (i < app.seq.length && y > app.height - app.scale * (app.seq[i] + 1)) {
        app.select(i);
    } else {
        app.deselect();
    }
}

canvas.addEventListener("pointerdown", function (e) {
    const canvas_bounds = canvas.getBoundingClientRect();
    const x = Math.round(e.clientX - canvas_bounds.left);
    const y = Math.round(e.clientY - canvas_bounds.top);
    if (active_pointers.has(e.pointerId)) {
        // update existing pointer
        const props = active_pointers.get(e.pointerId);
        props.start_x = x;
        props.start_y = y;
        props.x = x;
        props.y = y;
        props.down = true;
    } else {
        // new pointer
        active_pointers.set(e.pointerId, {
            start_x: x,
            start_y: y,
            x: x,
            y: y,
            down: true
        });
    }
    if (!app.selection_held) {
        set_selection_from_pointer(x, y);
    }
    canvas.setPointerCapture(e.pointerId);
});
canvas.addEventListener("pointerup", function (e) {
    if (active_pointers.has(e.pointerId)) {
        const props = active_pointers.get(e.pointerId);
        if (props.down && (props.x - props.start_x)**2 + (props.y - props.start_y)**2 < 25) {
            // trigger tap / click
            set_selection_from_pointer(props.x, props.y);
            app.toggle_hold_selection();
        }
        active_pointers.delete(e.pointerId);
        canvas.releasePointerCapture(e.pointerId);
    }
});
canvas.addEventListener("pointercancel", function (e) {
    active_pointers.delete(e.pointerId);
    canvas.releasePointerCapture(e.pointerId);
});
canvas.addEventListener("pointerleave", function(e) {
    if (active_pointers.has(e.pointerId)) {
        const props = active_pointers.get(e.pointerId);
        if (!props.down) {
            active_pointers.delete(e.pointerId);
        }
        if (!props.down && !app.selection_held) {
            app.deselect();
        }
    }
});

canvas.addEventListener("pointermove", function (e) {
    const canvas_bounds = canvas.getBoundingClientRect();
    const x = Math.round(e.clientX - canvas_bounds.left);
    const y = Math.round(e.clientY - canvas_bounds.top);
    if (active_pointers.has(e.pointerId)) {
        const props = active_pointers.get(e.pointerId);
        const last_x = props.x;
        const last_y = props.y;
        props.x = x;
        props.y = y;
        if (props.down) {
            const secondary_props = get_secondary_pointer(e.pointerId);
            if (secondary_props === null) {
                // one finger / mouse dragging
                app.snap_i0(app.i0 - (x - last_x) / app.scale);
            } else if (x != last_x || y != last_y) {
                // multiple pointers down: pinch zoom
                const old_p_to_p_x = last_x - secondary_props.x;
                const old_p_to_p_y = last_y - secondary_props.y;
                const new_p_to_p_x = x - secondary_props.x;
                const new_p_to_p_y = y - secondary_props.y;
                const midpoint_x = ((last_x + x) / 2 + secondary_props.x) / 2;

                const old_distance = Math.sqrt(
                    old_p_to_p_x**2 + old_p_to_p_y**2
                );
                const new_distance = Math.sqrt(
                    new_p_to_p_x**2 + new_p_to_p_y**2
                );
                const new_scale = app.scale * new_distance / old_distance;
                app.snap_i0(app.i0 + secondary_props.x * (1/app.scale - 1/new_scale));
                app.snap_scale(new_scale);
            }
        }
    } else {
        // new hovering pointer
        active_pointers.set(e.pointerId, {
            start_x: null,
            start_y: null,
            x: x,
            y: y,
            down: false
        });
    }
    if (!app.selection_held) {
        set_selection_from_pointer(x, y);
    }
});

// pointer events for bar canvas
// not supporting multitouch on this
let bar_canvas_pointer_x = null;
let bar_canvas_dragging = false;
bar_canvas.addEventListener("pointerdown", function (e) {
    const canvas_bounds = bar_canvas.getBoundingClientRect();
    bar_canvas_pointer_x = Math.round(e.clientX - canvas_bounds.left);
    bar_canvas_dragging = true;
    bar_canvas.setPointerCapture(e.pointerId);
});
bar_canvas.addEventListener("pointerup", function (e) {
    bar_canvas_dragging = false;
    bar_canvas.releasePointerCapture(e.pointerId);
});
bar_canvas.addEventListener("pointercancel", function (e) {
    bar_canvas_dragging = false;
    bar_canvas.releasePointerCapture(e.pointerId);
});
bar_canvas.addEventListener("pointermove", function (e) {
    const canvas_bounds = bar_canvas.getBoundingClientRect();
    const last_x = bar_canvas_pointer_x;
    bar_canvas_pointer_x = Math.round(e.clientX - canvas_bounds.left);
    if (bar_canvas_dragging) {
        app.snap_i0(app.i0 + (bar_canvas_pointer_x - last_x) * (app.seq.length + 1) / app.width);
    }
});

// set up mouse wheel zooming
function get_wheel_pointer_props() {
    // return an arbitrary active pointer
    for (const [pointer_id, pointer_props] of active_pointers) {
        return pointer_props;
    }
    return null;
}
canvas.addEventListener("wheel", function (e) {
    e.preventDefault();

    const old_scale = app.target_scale;
    app.snap_scale(app.scale * 1.001**-e.deltaY);

    // allow horizontal scrolling to pan the view
    app.snap_i0(app.i0 + e.deltaX / app.scale);

    const props = get_wheel_pointer_props();
    if (props !== null) {
        // move to keep mouse x at same position after zoom
        app.snap_i0(app.i0 + props.x * (1 / old_scale - 1 / app.target_scale));

        if (!app.selection_held) {
            set_selection_from_pointer(props.x, props.y);
        }
    } else {
        // if no pointers active, center zoom on center of canvas
        app.snap_i0(app.i0 + app.width / 2 * (1 / old_scale - 1 / app.target_scale));
    }
});

// set up responsive canvas sizing
let canvas_width = 0;
let canvas_height = 0;
function set_canvas_size() {
    canvas_width = 0.8 * window.innerWidth;
    canvas_height = 0.8 * window.innerHeight;
    canvas.width = canvas_width;
    bar_canvas.width = canvas_width;
    canvas.height = canvas_height;
    app.width = canvas_width;
    app.height = canvas_height;
}

window.addEventListener("resize", set_canvas_size, false);
set_canvas_size();

// set up seed controls
const seed_input = document.getElementById("seed_input");
const seed_button = document.getElementById("seed_button");
const seed_text = document.getElementById("current_seed");
seed_button.addEventListener("click", function (e) {
    const seed_string = seed_input.value;
    const seed = [];
    for (piece of seed_string.split(",")) {
        const n = parseInt(piece);
        if (!isNaN(n) && n >= 0) {
            seed.push(n);
        }
    }
    if (seed.length == 0) {
        seed.push(0);
    }

    seed_text.innerHTML = seed.join(", ");
    app.reset_seq(seed);
});

function animate() {
    ctx.clearRect(0, 0, canvas_width, canvas_height);
    bar_ctx.clearRect(0, 0, canvas_width, bar_canvas_height);
    app.update();
    app.draw(ctx, bar_ctx);

    requestAnimationFrame(animate);
}

animate();