const canvas = document.getElementById("vaneckCanvas");
const ctx = canvas.getContext("2d");

const bar_canvas = document.getElementById("barCanvas");
const bar_ctx = bar_canvas.getContext("2d");

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

        this.bar_highlight = [];

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

    next() {
        const v = this.seq.at(-1);
        for (let i = this.seq.length - 2; i >= 0; i--) {
            if (this.seq[i] == v) {
                const n = this.seq.length - i - 1;
                this.seq.push(n);
                return n;
            }
        }
        this.seq.push(0);
        return 0;
    }

    select(i) {
        this.selected = i;
        if (i >= this.seed_length) {
            const n = this.seq[i - 1];
            this.bar_highlight = [];
            for (let j = 0; j < this.seq.length; j++) {
                if (this.seq[j] == n) {
                    this.bar_highlight.push(j);
                }
            }
        } else {
            this.bar_highlight = [];
        }
    }

    deselect() {
        this.selected = null;
        this.bar_highlight = [];
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
        this.scale = 1 / (1/this.scale + 0.05 * (1/this.target_scale - 1/this.scale))
        this.i0 += 0.05 * (this.target_i0 - this.i0);
        // this.target_i0 = Math.min(this.seq.length - 1, Math.max(0, this.target_i0));
        // this.i0 = Math.min(this.seq.length - 1, Math.max(0, this.i0));
        // this.target_scale = Math.min(this.height, Math.max(1, this.scale));
        // this.scale = Math.min(this.height, Math.max(1, this.scale));
        const maxI = Math.floor(this.get_i(this.width));
        while (this.seq.length <= maxI) {
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
            // draw square
            const n = this.seq[i];
            const x0 = this.get_screen_x(i);
            const y0 = this.height - this.scale;
            const color = this.get_color(n);
            ctx.fillStyle = color;
            ctx.globalAlpha = 0.5;
            ctx.fillRect(x0, y0 - this.scale * n, this.scale, this.scale * n);
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
        bar_ctx.fillStyle = "#c5c5c5";
        bar_ctx.fillRect(0, 0, this.width, 10);
        bar_ctx.fillStyle = "#4d8eff";
        bar_ctx.fillRect(start_frac * this.width, 0, (end_frac - start_frac) * this.width, 10);

        // draw bottom bar text
        bar_ctx.fillStyle = "#000000";
        bar_ctx.font = "10px monospace";
        bar_ctx.textBaseline = "middle";
        bar_ctx.textAlign = "right";
        bar_ctx.fillText((this.i0 + 1).toFixed(0), start_frac * this.width, 5);
        bar_ctx.textAlign = "left";
        bar_ctx.fillText((rightEdgeI + 1).toFixed(0), end_frac * this.width, 5);

        if (this.selected !== null) {
            const n = this.seq[this.selected];
            if (this.selected >= this.seed_length) {
                // enable red glow
                ctx.shadowBlur = 5;
                ctx.shadowColor = "red";
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
                bar_ctx.fillRect(this.width * i / (this.seq.length + 1), 0, this.width / (this.seq.length + 1), 10);
            }
            bar_ctx.globalAlpha = 1;
            // draw connection in bar
            if (this.selected >= this.seed_length) {
                bar_ctx.fillRect(this.width * (this.selected - 1 - n) / (this.seq.length + 1), 0, this.width / (this.seq.length + 1), 10);
                bar_ctx.fillRect(this.width * (this.selected - 1) / (this.seq.length + 1), 0, this.width / (this.seq.length + 1), 10);
                bar_ctx.strokeStyle = "red";
                bar_ctx.beginPath();
                bar_ctx.moveTo(this.width * (this.selected - n) / (this.seq.length + 1), 5);
                bar_ctx.lineTo(this.width * (this.selected - 1) / (this.seq.length + 1), 5);
                bar_ctx.stroke();
            }
            // draw selected position in bar
            bar_ctx.fillStyle = "green";
            bar_ctx.fillRect(this.width * this.selected / (this.seq.length + 1), 0, this.width / (this.seq.length + 1), 10);
        }

        ctx.fillStyle = "#000000";
        ctx.font = "18px monospace";
        ctx.textBaseline = "top";
        ctx.textAlign = "left";
        ctx.fillText(`Terms generated: ${this.seq.length}`, 0, 0);
    }
}

const app = new VanEckApp(1000, 500);

// set up mouse controls
let mouse_down = false;
let dragging = false;
canvas.addEventListener("mousedown", function (e) {
    mouse_down = true;
});
canvas.addEventListener("mouseup", function(e) {
    mouse_down = false;
    if (!dragging) {
        app.epic_zoom();
    }
    dragging = false;
});
canvas.addEventListener("mouseleave", function(e) {
    mouse_down = false;
    app.deselect();
});

let last_mouse_x = 0;
let last_mouse_y = 0;
let mouse_x = 0;
let mouse_y = 0;
canvas.addEventListener("mousemove", function (e) {
    const canvas_bounds = canvas.getBoundingClientRect();
    last_mouse_x = mouse_x;
    last_mouse_y = mouse_y;
    mouse_x = Math.round(e.clientX - canvas_bounds.left);
    mouse_y = Math.round(e.clientY - canvas_bounds.top);
    if (mouse_down) {
        if (dragging) {
            app.snap_i0(app.i0 - (mouse_x - last_mouse_x) / app.scale);
        }
        dragging = true;
    }
    const i = Math.floor(app.get_i(mouse_x));
    if (i < app.seq.length && mouse_y > app.height - app.scale * (app.seq[i] + 1)) {
        app.select(i);
    } else {
        app.deselect();
    }
});

// set up mouse wheel zooming
canvas.addEventListener("wheel", function (e) {
    e.preventDefault();
    const old_scale = app.target_scale;
    app.snap_scale(app.scale * 1.001**-e.deltaY);
    app.snap_i0(app.i0 + mouse_x * (1 / old_scale - 1 / app.target_scale));

    app.slide_i0(app.i0 + 3 * e.deltaX / app.scale);
});

// set up responsive canvas sizing
let canvas_width = 0;
let canvas_height = 0
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
    bar_ctx.clearRect(0, 0, canvas_width, 10);
    app.update();
    app.draw(ctx, bar_ctx);

    requestAnimationFrame(animate);
}

animate();