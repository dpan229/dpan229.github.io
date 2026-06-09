function mod(x, m) {
    return x % m + (x < 0 ? m : 0);
}

class Ant {
    constructor(x, y, a) {
        this.x = x;
        this.y = y;
        this.a = a;
    }
}

class AntWorld {
    constructor(width, height) {
        this.width = width;
        this.height = height;

        this.trails = Array.from({length: height}, () => Array(width).fill(0.0));
        this.imageData = new ImageData(width, height);
        this.ants = [];
        this.evaporation = 0.995;
        this.rand_weight = 0.6;

        this.sight_distance = 5;
        this.sight_angles = [
            -Math.PI / 8,
            -Math.PI / 16,
            0.0,
            Math.PI / 16,
            Math.PI / 8
        ];
    }

    bound_coords(x, y) {
        return [
            mod(x, this.width),
            mod(y, this.height)
        ];
    }

    get_trail_int(x, y) {
        [x, y] = this.bound_coords(x, y);
        return this.trails[y][x];
    }

    get_trail(x, y) {
        const x0 = Math.floor(x);
        const y0 = Math.floor(y);
        const a = this.get_trail_int(x0, y0);
        const b = this.get_trail_int(x0 + 1, y0);
        const c = this.get_trail_int(x0, y0 + 1);
        const d = this.get_trail_int(x0 + 1, y0 + 1);
        
        const x_interp = a + (x - x0) * (b - a);
        return x_interp + (y - y0) * (c + (x - x0) * (d - c) - x_interp);
    }

    set_trail_int(x, y, v) {
        [x, y] = this.bound_coords(x, y);
        this.trails[y][x] = v;
    }

    add_trail(x, y) {
        const x0 = Math.floor(x);
        const y0 = Math.floor(y);
        const dx = x - x0;
        const dy = y - y0;

        const k1 = this.get_trail_int(x0, y0);
        this.set_trail_int(x0, y0, k1 + (1 - k1) * (1 - 0.75**((1 - dx) * (1 - dy))));
        const k2 = this.get_trail_int(x0 + 1, y0);
        this.set_trail_int(x0 + 1, y0, k2 + (1 - k2) * (1 - 0.75**(dx * (1 - dy))));
        const k3 = this.get_trail_int(x0, y0 + 1);
        this.set_trail_int(x0, y0 + 1, k3 + (1 - k3) * (1 - 0.75**((1 - dx) * dy)));
        const k4 = this.get_trail_int(x0 + 1, y0 + 1);
        this.set_trail_int(x0 + 1, y0 + 1, k4 + (1 - k4) * (1 - 0.75**(dx * dy)));
    }

    clear_all_trails() {
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                this.trails[y][x] = 0.0;
            }
        }
    }

    add_ant(x, y, a) {
        this.ants.push(new Ant(x, y, a));
    }

    remove_all_ants() {
        this.ants = [];
    }

    update() {
        for (let ant of this.ants) {
            let total_weight = this.rand_weight;
            let weighted_sum = total_weight * (Math.random() - 0.5) * Math.PI / 4;
            for (let sight_angle of this.sight_angles) {
                const abs_angle = ant.a + sight_angle;
                const trail = this.get_trail(
                    ant.x + this.sight_distance * Math.cos(abs_angle),
                    ant.y + this.sight_distance * Math.sin(abs_angle)
                );
                total_weight += trail;
                weighted_sum += trail * sight_angle;
            }
            // turn ant
            if (total_weight != 0) {
                ant.a += weighted_sum / total_weight;
            }
        }

        for (let ant of this.ants) {
            // add trail
            this.add_trail(ant.x, ant.y);

            // move ant
            ant.x += Math.cos(ant.a);
            ant.y += Math.sin(ant.a);
            [ant.x, ant.y] = this.bound_coords(ant.x, ant.y);
        }

        // evaporate trails
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                this.trails[y][x] *= this.evaporation;
            }
        }
    }

    draw(ctx) {
        const data = this.imageData.data;
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                const i = 4 * (y * this.width + x);
                const trail = this.trails[y][x];
                // set red
                data[i] = Math.floor(trail * 255);
                // set green
                data[i + 1] = 0;
                // set blue
                data[i + 2] = 0;
                data[i + 3] = 255;
            }
        }
        for (let ant of this.ants) {
            const x = Math.round(ant.x);
            const y = Math.round(ant.y);
            const i = 4 * (y * this.width + x);
            data[i + 1] = 255;
        }
        ctx.putImageData(this.imageData, 0, 0);
    }
}

const ant_canvas = document.getElementById("antCanvas");
const ant_ctx = ant_canvas.getContext("2d");
const tool_canvas = document.getElementById("toolCanvas");
const tool_ctx = tool_canvas.getContext("2d");

let mouse_down = false;
tool_canvas.addEventListener("mousedown", function (e) {
    mouse_down = true;
});
tool_canvas.addEventListener("mouseup", function (e) {
    mouse_down = false;
});
let last_mouse_x = -100;
let last_mouse_y = -100;
let mouse_x = -100;
let mouse_y = -100;
tool_canvas.addEventListener("mousemove", function (e) {
    last_mouse_x = mouse_x;
    last_mouse_y = mouse_y;
    const canvas_bounds = tool_canvas.getBoundingClientRect();
    mouse_x = Math.round(e.clientX - canvas_bounds.left);
    mouse_y = Math.round(e.clientY - canvas_bounds.top);
    tool_ctx.clearRect(0, 0, 800, 800);
    active_tool.draw_func(tool_ctx, mouse_x, mouse_y, last_mouse_x, last_mouse_y);
});
tool_canvas.addEventListener("mouseleave", function (e) {
    mouse_down = false;
    mouse_x = -100;
    mouse_y = -100;
    last_mouse_x = -100;
    last_mouse_y = -100;
    tool_ctx.clearRect(0, 0, 800, 800);
});

// create world object
const world = new AntWorld(800, 800);
for (i = 0; i < 4000; i++) {
    world.add_ant(400, 400, Math.random() * 2 * Math.PI);
}

// set up rand weight slider
const rand_weight_slider = document.getElementById("rand_weight");
const rand_weight_text = document.getElementById("rand_weight_text");
rand_weight_slider.oninput = function() {
    const v = parseInt(this.value) / 100;
    world.rand_weight = v;
    rand_weight_text.innerHTML = v.toFixed(2);
};

// set up evaporation slider
const evaporation_slider = document.getElementById("evaporation");
const evaporation_text = document.getElementById("evaporation_text");
evaporation_slider.oninput = function() {
    const v = 1 - (0.25641 / (parseInt(this.value) + 1.28205));
    world.evaporation = v;
    evaporation_text.innerHTML = v.toFixed(4);
};

// set up sight distance slider
const distance_slider = document.getElementById("distance");
const distance_text = document.getElementById("distance_text");
distance_slider.oninput = function() {
    const v = parseInt(this.value);
    // exponential curve with value of exactly 5 at v = 14 and 50 at v = 50
    const d = 5 * Math.exp(((v - 14) * (Math.log(50) - Math.log(5))) / 36);
    world.sight_distance = d;
    distance_text.innerHTML = d.toFixed(2);
};

// set up sight angle slider
const angle_slider = document.getElementById("angle");
const angle_text = document.getElementById("angle_text");
angle_slider.oninput = function() {
    const v = parseInt(this.value);
    world.sight_angles = [
        -Math.PI * v / 16,
        -Math.PI * v / 32,
        0,
        Math.PI * v / 32,
        Math.PI * v / 16
    ];
    angle_text.innerHTML = (v * 11.25).toFixed(2);
};

// set up play / pause button
const play_pause = document.getElementById("playpause");
let playing = true;
play_pause.addEventListener("click", function (e) {
    playing = !playing;
    if (playing) {
        play_pause.innerHTML = "Pause";
    } else {
        play_pause.innerHTML = "Play";
    }
});

// set up reset buttons
const center_button = document.getElementById("reset_center");
center_button.addEventListener("click", function (e) {
    world.clear_all_trails();
    world.remove_all_ants();
    for (i = 0; i < 4000; i++) {
        world.add_ant(400, 400, Math.random() * 2 * Math.PI);
    }
    if (!playing) {
        world.draw(ant_ctx);
    }
});
const scatter_button = document.getElementById("reset_scatter");
scatter_button.addEventListener("click", function (e) {
    world.clear_all_trails();
    world.remove_all_ants();
    for (i = 0; i < 4000; i++) {
        world.add_ant(
            Math.random() * world.width,
            Math.random() * world.height,
            Math.random() * 2 * Math.PI
        );
    }
    if (!playing) {
        world.draw(ant_ctx);
    }
});

// set up tools
class Tool {
    constructor(apply_func, draw_func) {
        this.apply_func = apply_func;
        this.draw_func = draw_func;
    }
}

const add_trail_tool = new Tool(
    // apply function
    function (world, mouse_x, mouse_y, last_mouse_x, last_mouse_y) {
        // place trails 100 times in a line from last mouse position to current
        // mouse position, offsetting each trail randomly by a small amount
        for (let i = 0; i < 100; i++) {
            const r = Math.random() * 1.5;
            const t = Math.random() * 2 * Math.PI;
            world.add_trail(
                last_mouse_x + i / 99 * (mouse_x - last_mouse_x) + r * Math.cos(t), 
                last_mouse_y + i / 99 * (mouse_y - last_mouse_y) + r * Math.sin(t)
            );
        }
    },
    // draw function
    function (ctx, mouse_x, mouse_y, last_mouse_x, last_mouse_y) {
        ctx.strokeStyle = "red";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(mouse_x, mouse_y, 1.5, 0, 2 * Math.PI);
        ctx.stroke();
    }
);

const remove_trail_tool = new Tool(
    function (world, mouse_x, mouse_y, last_mouse_x, last_mouse_y) {
        for (let dy = -5; dy <= 5; dy++) {
            for (let dx = -5; dx <= 5; dx++) {
                world.set_trail_int(mouse_x + dx, mouse_y + dy, 0.0);
            }
        }
    },
    function (ctx, mouse_x, mouse_y, last_mouse_x, last_mouse_y) {
        ctx.strokeStyle = "blue";
        ctx.lineWidth = 1;
        ctx.strokeRect(mouse_x - 5, mouse_y - 5, 10, 10);
    }
);

let active_tool = add_trail_tool;
document.querySelectorAll('input[name="tool"]').forEach((elem) => {
    elem.addEventListener("change", function (e) {
        switch (e.target.value) {
            case "add_trail":
                active_tool = add_trail_tool;
                break;
            case "remove_trail":
                active_tool = remove_trail_tool;
                break;
            default:
                break;
        }
    });
})

const fps_div = document.getElementById("fps");
const last_frame_times = [];
function animate() {
    // update FPS
    if (last_frame_times.length < 10) {
        last_frame_times.push(performance.now());
    } else {
        for (i = 0; i < 9; i++) {
            last_frame_times[i] = last_frame_times[i + 1];
        }
        last_frame_times[9] = performance.now();
        const fps = 10000 / (last_frame_times[9] - last_frame_times[0]);
        fps_div.innerHTML = `FPS: ${fps.toFixed(1)}`;
    }

    // apply tool if mouse is down on canvas
    if (mouse_down) {
        active_tool.apply_func(world, mouse_x, mouse_y, last_mouse_x, last_mouse_y);
        if (!playing) {
            world.draw(ant_ctx);
        }
    }

    if (playing) {
        world.draw(ant_ctx);
        world.update();
    }

    requestAnimationFrame(animate);
}

animate();