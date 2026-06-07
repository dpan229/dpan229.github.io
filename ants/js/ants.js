const ant_canvas = document.getElementById("antCanvas");
const ctx = ant_canvas.getContext("2d");

let mouse_down = false;
ant_canvas.addEventListener("mousedown", function (e) {
    mouse_down = true;
});
ant_canvas.addEventListener("mouseup", function (e) {
    mouse_down = false;
});
let last_mouse_x = 0;
let last_mouse_y = 0;
let mouse_x = 0;
let mouse_y = 0;
ant_canvas.addEventListener("mousemove", function (e) {
    last_mouse_x = mouse_x;
    last_mouse_y = mouse_y;
    const canvas_bounds = ant_canvas.getBoundingClientRect();
    mouse_x = Math.round(e.clientX - canvas_bounds.left);
    mouse_y = Math.round(e.clientY - canvas_bounds.top);
});

function mod(x, m) {
    return x % m + (x < 0 ? m : 0);
}

function normal_random(mean=0, stdev=1) {
    // Get normally distributed random value using Box-Muller transform
    const u = 1 - Math.random();
    const v = Math.random();
    const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
    return z * stdev + mean;
}

class Ant {
    constructor(x, y, a) {
        this.x = x;
        this.y = y;
        this.a = a;
    }
}

class AntWorld {
    constructor(width, height, ctx) {
        this.width = width;
        this.height = height;
        this.ctx = ctx;

        this.trails = Array.from({length: height}, () => Array(width).fill(0.0));
        this.imageData = ctx.createImageData(width, height);
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
        // return [
        //     0 <= x && x < this.width ? x : this.width >> 1,
        //     0 <= y && y < this.height ? y : this.height >> 1
        // ];
        return [
            mod(x, this.width),
            mod(y, this.height)
        ];
        return [
            mod(x, 2 * this.width) < this.width ? mod(x, this.width) : this.width - mod(x, this.width) - 1,
            mod(y, 2 * this.height) < this.height ? mod(y, this.height) : this.height - mod(y, this.height) - 1
        ]
        return [
            this.width - Math.abs(mod(x, 2 * this.width) - this.width),
            this.height - Math.abs(mod(y, 2 * this.height) - this.height)
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
            // const r = normal_random(0, 2);
            // const t = Math.random() * Math.PI;
            // this.add_trail(ant.x + r * Math.cos(t), ant.y + r * Math.sin(t));

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

    draw() {
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
                data[i + 2] = 0;//trail == 0 ? 0 : Math.max(0, Math.floor(5 * Math.log(trail) + 255));
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

// create world object
const world = new AntWorld(800, 800, ctx);
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
center_button.addEventListener("click", function(e) {
    world.clear_all_trails();
    world.remove_all_ants();
    for (i = 0; i < 4000; i++) {
        world.add_ant(400, 400, Math.random() * 2 * Math.PI);
    }
    if (!playing) {
        world.draw();
    }
});
const scatter_button = document.getElementById("reset_scatter");
scatter_button.addEventListener("click", function(e) {
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
        world.draw();
    }
});

const fps_div = document.getElementById("fps");
const last_frame_times = [];
function animate() {
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
    if (mouse_down) {
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
        if (!playing) {
            world.draw();
        }
    }
    if (playing) {
        world.draw();
        world.update();
    }

    requestAnimationFrame(animate);
}

animate();