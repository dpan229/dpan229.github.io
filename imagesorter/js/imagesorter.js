/**
 * Returns a list of all integer pairs [x, y] such that
 * the Euclidean distance from (0, 0) to (x, y) is less
 * than or equal to `max_d`
 * @param {number} max_d 
 * @returns {Array<Array<number>>}
 */
function get_possible_swaps(max_d) {
    const out = [];
    for (let y = -max_d; y <= max_d; y++) {
        for (let x = -max_d; x <= max_d; x++) {
            if (x*x + y*y <= max_d*max_d) {
                out.push([x, y]);
            }
        }
    }
    return out;
}

/**
 * Returns a uniform randomly selected element of `arr`
 * @param {Array} arr 
 * @returns An element of `arr`
 */
function pick_random(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function mod(x, m) {
    return x % m + (x < 0 ? m : 0);
}

hsv_memo = new Map();
/**
 * Converts an rgb triplet into an hsv triplet.
 * Input is an object with r, g, and b attributes
 * ranging from 0 to 255, output is an object with
 * h, s, and v attributes ranging from 0 to 360,
 * 0 to 1 and 0 to 1 respectively
 * @param {object} rgb rgb triplet
 * @returns {object} hsv triplet
 */
function rgb_to_hsv(rgb) {
    const i = (rgb.r << 16) + (rgb.g << 8) + rgb.b;
    if (hsv_memo.has(i)) {
        // return shallow copy
        return { ...hsv_memo.get(i) };
    } else {
        const M = Math.max(rgb.r, rgb.g, rgb.b);
        const m = Math.min(rgb.r, rgb.g, rgb.b);
        const C = M - m;

        const out = {
            h: 0, 
            s: M == 0 ? 0 : C / M, 
            v: M / 255
        };
        if (C > 0) {
            if (M == rgb.r) {
                out.h = mod((rgb.g - rgb.b) / C, 6);
            } else if (M == rgb.g) {
                out.h = (rgb.b - rgb.r) / C + 2;
            } else {
                out.h = (rgb.r - rgb.g) / C + 4;
            }
            out.h *= 60;
        }
        hsv_memo.set(i, out);
        return out;
    }
}

class ImageSorter {
    constructor() {
        // set image to a 500 x 500 completely random image
        this.image_data = new ImageData(500, 500);
        this.width = 500;
        this.height = 500;
        const data = this.image_data.data;
        for (let k = 0; k < 500*500; k++) {
            data[4 * k] = Math.floor(Math.random() * 256);
            data[4 * k + 1] = Math.floor(Math.random() * 256);
            data[4 * k + 2] = Math.floor(Math.random() * 256);
            data[4 * k + 3] = 255;
        }

        this.possible_swaps = get_possible_swaps(3);

        this.x_func = this.x_red_func;
        this.y_func = this.y_green_func;

        this.wrap_x = false;
        this.wrap_y = false;
        this.frame = 0;
        this.reset_original_positions();
        this.reset_loss();
    }

    x_red_func(x, y) {
        const rgb = this.get_pixel(x, y);
        return rgb.r * this.width / 256;
    }
    x_green_func(x, y) {
        const rgb = this.get_pixel(x, y);
        return rgb.g * this.width / 256;
    }
    x_blue_func(x, y) {
        const rgb = this.get_pixel(x, y);
        return rgb.b * this.width / 256;
    }
    x_hue_func(x, y) {
        const hsv = rgb_to_hsv(this.get_pixel(x, y));
        return hsv.h * this.width / 360;
    }
    x_sat_func(x, y) {
        const hsv = rgb_to_hsv(this.get_pixel(x, y));
        return hsv.s * this.width;
    }
    x_val_func(x, y) {
        const hsv = rgb_to_hsv(this.get_pixel(x, y));
        return hsv.v * this.width;
    }
    x_original_func(x, y) {
        return this.original_x[y][x];
    }
    y_red_func(x, y) {
        const rgb = this.get_pixel(x, y);
        return this.height - rgb.r * this.height / 256;
    }
    y_green_func(x, y) {
        const rgb = this.get_pixel(x, y);
        return this.height - rgb.g * this.height / 256;
    }
    y_blue_func(x, y) {
        const rgb = this.get_pixel(x, y);
        return this.height - rgb.b * this.height / 256;
    }
    y_hue_func(x, y) {
        const hsv = rgb_to_hsv(this.get_pixel(x, y));
        return this.height - hsv.h * this.height / 360;
    }
    y_sat_func(x, y) {
        const hsv = rgb_to_hsv(this.get_pixel(x, y));
        return this.height - hsv.s * this.height;
    }
    y_val_func(x, y) {
        const hsv = rgb_to_hsv(this.get_pixel(x, y));
        return this.height - hsv.v * this.height;
    }
    y_original_func(x, y) {
        return this.original_y[y][x];
    }

    /**
     * Sets the original position of each pixel to its current
     * position.
     */
    reset_original_positions() {
        this.original_x = [];
        this.original_y = [];
        for (let y = 0; y < this.height; y++) {
            const x_row = [];
            const y_row = [];
            for (let x = 0; x < this.width; x++) {
                x_row.push(x);
                y_row.push(y);
            }
            this.original_x.push(x_row);
            this.original_y.push(y_row);
        }
    }

    /**
     * Change image to the given image data.
     * @param {ImageData} image_data
     */
    set_image_data(image_data) {
        this.image_data = image_data;
        this.width = image_data.width;
        this.height = image_data.height;
        this.frame = 0;
        this.reset_original_positions();
        this.reset_loss();
    }

    set_wrap_x(wrap) {
        if (wrap != this.wrap_x) {
            this.wrap_x = wrap;
            this.frame = 0;
            this.reset_loss();
        }
    }

    set_wrap_y(wrap) {
        if (wrap != this.wrap_y) {
            this.wrap_y = wrap;
            this.frame = 0;
            this.reset_loss();
        }
    }

    set_max_d(max_d) {
        this.possible_swaps = get_possible_swaps(max_d);
    }

    /**
     * Returns a reduced equivalent of the coordinates (`x`, `y`) which is
     * within the bounds of the image. Value depends on whether wrapping is
     * set for the x and y axes.
     * @param {number} x 
     * @param {number} y 
     * @returns {Array<number>} Reduced coordinates [x, y]
     */
    bound_coords(x, y) {
        return [
            this.wrap_x ? mod(x, this.width) : Math.max(0, Math.min(this.width - 1, x)),
            this.wrap_y ? mod(y, this.height) : Math.max(0, Math.min(this.height - 1, y))
        ];
    }

    /**
     * Returns the color of the pixel at (`x`, `y`) as an object
     * with `r`, `g` and `b` attributes.
     * @param {number} x 
     * @param {number} y 
     * @returns {object} The color of the pixel
     */
    get_pixel(x, y) {
        [x, y] = this.bound_coords(x, y);
        const data = this.image_data.data;
        const i = 4 * (y * this.width + x);
        return {
            r: data[i],
            g: data[i + 1],
            b: data[i + 2]
        };
    }

    /**
     * Swaps the pixels at (`x1`, `y1`) and (`x2`, `y2`).
     * @param {number} x1 
     * @param {number} y1 
     * @param {number} x2 
     * @param {number} y2 
     */
    swap_pixels(x1, y1, x2, y2) {
        [x1, y1] = this.bound_coords(x1, y1);
        [x2, y2] = this.bound_coords(x2, y2);

        // swap pixels in image data
        const data = this.image_data.data;
        const i1 = 4 * (y1 * this.width + x1);
        const i2 = 4 * (y2 * this.width + x2);
        [data[i1],     data[i2]    ] = [data[i2],     data[i1]    ];
        [data[i1 + 1], data[i2 + 1]] = [data[i2 + 1], data[i1 + 1]];
        [data[i1 + 2], data[i2 + 2]] = [data[i2 + 2], data[i1 + 2]];

        // update original positions
        [
            this.original_x[y1][x1], 
            this.original_x[y2][x2]
        ] = [
            this.original_x[y2][x2],
            this.original_x[y1][x1]
        ];
        [
            this.original_y[y1][x1], 
            this.original_y[y2][x2]
        ] = [
            this.original_y[y2][x2],
            this.original_y[y1][x1]
        ];
    }

    /**
     * Shuffles all pixels randomly.
     */
    shuffle() {
        for (let i = this.width * this.height - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            const x1 = i % this.width;
            const y1 = Math.floor(i / this.width);
            const x2 = j % this.width;
            const y2 = Math.floor(j / this.width);
            this.swap_pixels(x1, y1, x2, y2);
        }
        this.frame = 0;
        this.reset_loss();
    }

    /**
     * Moves all pixels back to their original positions.
     */
    reset() {
        let y = 0;
        let x = 0;
        while (y < this.height) {
            const orig_x = this.original_x[y][x];
            const orig_y = this.original_y[y][x];
            // if pixel at x, y is already in original position,
            // go to next pixel, otherwise swap it to its original
            // position and don't change x and y
            if (orig_x == x && orig_y == y) {
                if (x < this.width - 1) {
                    x++;
                } else {
                    x = 0;
                    y++;
                }
            } else {
                this.swap_pixels(x, y, orig_x, orig_y);
            }
        }
        this.frame = 0;
        this.reset_loss();
    }

    /**
     * Returns the loss of an individual pixel at (`x`, `y`) if its
     * target position is at (`target_x`, `target_y`).
     * @param {number} x 
     * @param {number} y 
     * @param {number} target_x 
     * @param {number} target_y 
     * @returns {number} The pixel's loss
     */
    get_loss(x, y, target_x, target_y) {
        // each pixel's loss is square of distance to target
        const dx = this.wrap_x ? Math.min(
            Math.abs(target_x - x), 
            Math.abs(target_x - x + this.width), 
            Math.abs(target_x - x - this.width)
        ) : target_x - x;
        const dy = this.wrap_y ? Math.min(
            Math.abs(target_y - y), 
            Math.abs(target_y - y + this.height), 
            Math.abs(target_y - y - this.height)
        ) : target_y - y;
        return dx*dx + dy*dy;
    }

    /**
     * Recalculates the total loss and sets the initial loss to
     * the current value.
     */
    reset_loss() {
        this.loss = 0;
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                const target_x = this.x_func(x, y);
                const target_y = this.y_func(x, y);
                this.loss += this.get_loss(x, y, target_x, target_y);
            }
        }
        this.initial_loss = this.loss;
    }

    /**
     * Returns how much the total loss would change if the pixels at
     * (`x1`, `y1`) and (`x2`, `y2`) swapped.
     * @param {number} x1 
     * @param {number} y1 
     * @param {number} x2 
     * @param {number} y2 
     * @returns {number} Loss difference
     */
    swap_delta(x1, y1, x2, y2) {
        [x1, y1] = this.bound_coords(x1, y1);
        [x2, y2] = this.bound_coords(x2, y2);
        const tx1 = this.x_func(x1, y1);
        const ty1 = this.y_func(x1, y1);
        const tx2 = this.x_func(x2, y2);
        const ty2 = this.y_func(x2, y2);
        const swapped = this.get_loss(x2, y2, tx1, ty1) + this.get_loss(x1, y1, tx2, ty2);
        const current = this.get_loss(x1, y1, tx1, ty1) + this.get_loss(x2, y2, tx2, ty2);
        return swapped - current;
    }

    advance() {
        const x0 = this.frame % 2;
        const y0 = this.frame % 4 > 1 ? 1 : 0;
        for (let y = y0; y < this.height; y += 2) {
            for (let x = x0; x < this.width; x += 2) {
                const [dx, dy] = pick_random(this.possible_swaps);
                const delta = this.swap_delta(x, y, x + dx, y + dy);
                if (delta < 0) {
                    this.swap_pixels(x, y, x + dx, y + dy);
                    this.loss += delta;
                }
            }
        }
        this.frame++;
    }
    
    draw(ctx) {
        ctx.putImageData(this.image_data, 0, 0);
    }
}
 
const sorter = new ImageSorter();

const canvas = document.getElementById("image_canvas");
const ctx = canvas.getContext("2d");

canvas.width = sorter.width;
canvas.height = sorter.height;

// set up wrap checkboxes
const wrap_x_checkbox = document.getElementById("wrap_x");
const bottom_wrap_text = document.getElementById("bottom_wrap");
wrap_x_checkbox.addEventListener("change", function (e) {
    sorter.set_wrap_x(this.checked);
    bottom_wrap_text.innerHTML = this.checked ? " (Wrapped)" : "";
});
const wrap_y_checkbox = document.getElementById("wrap_y");
const left_wrap_text = document.getElementById("left_wrap");
wrap_y_checkbox.addEventListener("change", function (e) {
    sorter.set_wrap_y(this.checked);
    left_wrap_text.innerHTML = this.checked ? " (Wrapped)" : "";
});

// set up swap distance slider
const swap_distance_slider = document.getElementById("swap_distance");
const swap_distance_text = document.getElementById("swap_distance_text");
swap_distance_slider.oninput = function () {
    const v = parseInt(this.value);
    sorter.set_max_d(v);
    swap_distance_text.innerHTML = `${v} pixel${v > 1 ? "s" : ""}`;
};

// set up play / pause button
let playing = false;
const play_button = document.getElementById("playpause");
play_button.addEventListener("click", function (e) {
    playing = !playing;
    if (playing) {
        play_button.innerHTML = "Pause";
    } else {
        play_button.innerHTML = "Play";
    }
});

// set up reset button
const reset_button = document.getElementById("reset");
reset_button.addEventListener("click", function (e) {
    sorter.reset();
});

// set up shuffle button
const shuffle_button = document.getElementById("shuffle");
shuffle_button.addEventListener("click", function (e) {
    sorter.shuffle();
});

// set up x target selection
const bottom_text = document.getElementById("bottom_text");
document.querySelectorAll('input[name="x_target"]').forEach((elem) => {
    elem.addEventListener("change", function (e) {
        switch (e.target.value) {
            case "red":
                sorter.x_func = sorter.x_red_func;
                bottom_text.innerHTML = "Red";
                break;
            case "green":
                sorter.x_func = sorter.x_green_func;
                bottom_text.innerHTML = "Green";
                break;
            case "blue":
                sorter.x_func = sorter.x_blue_func;
                bottom_text.innerHTML = "Blue";
                break;
            case "hue":
                sorter.x_func = sorter.x_hue_func;
                bottom_text.innerHTML = "Hue";
                break;
            case "saturation":
                sorter.x_func = sorter.x_sat_func;
                bottom_text.innerHTML = "Saturation"
                break;
            case "value":
                sorter.x_func = sorter.x_val_func;
                bottom_text.innerHTML = "Value";
                break;
            case "original":
                sorter.x_func = sorter.x_original_func;
                bottom_text.innerHTML = "Original X";
                break;
            default:
                break;
        }
        sorter.reset_loss();
    });
});
// set up y target selection
const left_text = document.getElementById("left_text");
document.querySelectorAll('input[name="y_target"]').forEach((elem) => {
    elem.addEventListener("change", function (e) {
        switch (e.target.value) {
            case "red":
                sorter.y_func = sorter.y_red_func;
                left_text.innerHTML = "Red";
                break;
            case "green":
                sorter.y_func = sorter.y_green_func;
                left_text.innerHTML = "Green";
                break;
            case "blue":
                sorter.y_func = sorter.y_blue_func;
                left_text.innerHTML = "Blue";
                break;
            case "hue":
                sorter.y_func = sorter.y_hue_func;
                left_text.innerHTML = "Hue";
                break;
            case "saturation":
                sorter.y_func = sorter.y_sat_func;
                left_text.innerHTML = "Saturation";
                break;
            case "value":
                sorter.y_func = sorter.y_val_func;
                left_text.innerHTML = "Value";
                break;
            case "original":
                sorter.y_func = sorter.y_original_func;
                left_text.innerHTML = "Original Y";
                break;
            default:
                break;
        }
        sorter.reset_loss();
    });
});

/**
 * Draws multiple lines on the given canvas drawing context to simulate
 * a single line from (`x1`, `y1`) to (`x2`, `y2`) wrapping around the edges. 
 * Coordinates may be outside of the canvas bounds 
 * @param {CanvasRenderingContext2D} ctx 
 * @param {Number} x1 
 * @param {Number} y1 
 * @param {Number} x2 
 * @param {Number} y2 
 * @param {Boolean} wrap_x 
 * @param {Boolean} wrap_y 
 * @param {Number} line_limit 
 */
function draw_line_wrapped(ctx, x1, y1, x2, y2, 
                           wrap_x=true, wrap_y=true, 
                           line_limit=100) {
    const width = ctx.canvas.width;
    const height = ctx.canvas.height;
    let offset_x = width * Math.floor(x1 / width);
    let offset_y = height * Math.floor(y1 / height);
    const final_offset_x = width * Math.floor(x2 / width);
    const final_offset_y = height * Math.floor(y2 / height);

    ctx.beginPath();
    ctx.moveTo(
        wrap_x ? x1 - offset_x : x1, 
        wrap_y ? y1 - offset_y : y1
    );
    ctx.lineTo(
        wrap_x ? x2 - offset_x : x2, 
        wrap_y ? y2 - offset_y : y2
    );
    let lines = 1;
    while ((offset_x != final_offset_x || offset_y != final_offset_y) && lines < line_limit) {
        const cross_x = y2 > y1 ?
            // find x position of point on current line where y = height
            (height - y1 + offset_y) * (x2 - x1) / (y2 - y1) + x1 - offset_x
        :
            // find x position of point on current line where y = 0
            (-y1 + offset_y) * (x2 - x1) / (y2 - y1) + x1 - offset_x
        ;
        let draw = true;
        if (cross_x < 0) {
            offset_x -= width;
            draw = wrap_x;
        } else if (cross_x > width) {
            offset_x += width;
            draw = wrap_x;
        } else if (y2 > y1) {
            offset_y += height;
            draw = wrap_y;
        } else {
            offset_y -= height;
            draw = wrap_y;
        }
        if (draw) {
            ctx.moveTo(
                wrap_x ? x1 - offset_x : x1, 
                wrap_y ? y1 - offset_y : y1
            );
            ctx.lineTo(
                wrap_x ? x2 - offset_x : x2, 
                wrap_y ? y2 - offset_y : y2
            );
        }
        lines++;
    }
    ctx.stroke();
}

// set up mouseover effect on overlayed canvas
const interact_canvas = document.getElementById("interact_canvas");
interact_canvas.width = sorter.width;
interact_canvas.height = sorter.height;
const interact_ctx = interact_canvas.getContext("2d");
interact_canvas.addEventListener("pointermove", function (e) {
    const canvas_bounds = interact_canvas.getBoundingClientRect();
    mouse_x = Math.round(e.clientX - canvas_bounds.left);
    mouse_y = Math.round(e.clientY - canvas_bounds.top);

    const target_x = sorter.x_func(mouse_x, mouse_y);
    const target_y = sorter.y_func(mouse_x, mouse_y);

    let target_x_wrapped = target_x;
    let target_y_wrapped = target_y;
    const dx = target_x - mouse_x;
    const dy = target_y - mouse_y;
    let abs_dx = Math.abs(dx);
    if (sorter.wrap_x) {
        const abs_dx2 = Math.abs(dx - sorter.width);
        if (abs_dx2 < abs_dx) {
            abs_dx = abs_dx2;
            target_x_wrapped -= interact_canvas.width;
        }
        const abs_dx3 = Math.abs(dx + sorter.width);
        if (abs_dx3 < abs_dx) {
            abs_dx = abs_dx3;
            target_x_wrapped += interact_canvas.width;
        }
    }
    let abs_dy = Math.abs(dy);
    if (sorter.wrap_y) {
        const abs_dy2 = Math.abs(dy - sorter.height);
        if (abs_dy2 < abs_dy) {
            abs_dy = abs_dy2;
            target_y_wrapped -= interact_canvas.height;
        }
        const abs_dy3 = Math.abs(dy + sorter.height);
        if (abs_dy3 < abs_dy) {
            abs_dy = abs_dy3;
            target_y_wrapped += interact_canvas.height;
        }
    }

    interact_ctx.clearRect(0, 0, interact_canvas.width, interact_canvas.height);
    // draw white lines
    interact_ctx.strokeStyle = "white";
    interact_ctx.lineWidth = 4;
    draw_line_wrapped(
        interact_ctx, mouse_x, mouse_y, target_x_wrapped, target_y_wrapped,
        sorter.wrap_x, sorter.wrap_y
    );

    // draw arrowhead
    const dx_wrapped = target_x_wrapped - mouse_x;
    const dy_wrapped = target_y_wrapped - mouse_y;
    const distance_wrapped = Math.sqrt(dx_wrapped*dx_wrapped + dy_wrapped*dy_wrapped);
    const head_center_x = target_x_wrapped - 5 * dx_wrapped / distance_wrapped;
    const head_center_y = target_y_wrapped - 5 * dy_wrapped / distance_wrapped;
    const head_1_x = head_center_x + 3 * dy_wrapped / distance_wrapped;
    const head_1_y = head_center_y - 3 * dx_wrapped / distance_wrapped;
    const head_2_x = head_center_x - 3 * dy_wrapped / distance_wrapped;
    const head_2_y = head_center_y + 3 * dx_wrapped / distance_wrapped;
    draw_line_wrapped(
        interact_ctx, target_x_wrapped, target_y_wrapped, head_1_x, head_1_y,
        sorter.wrap_x, sorter.wrap_y
    );
    draw_line_wrapped(
        interact_ctx, target_x_wrapped, target_y_wrapped, head_2_x, head_2_y,
        sorter.wrap_x, sorter.wrap_y
    );

    // draw black lines
    interact_ctx.strokeStyle = "black";
    interact_ctx.lineWidth = 2;
    draw_line_wrapped(
        interact_ctx, mouse_x, mouse_y, target_x_wrapped, target_y_wrapped,
        sorter.wrap_x, sorter.wrap_y
    );
    // draw arrowhead
    draw_line_wrapped(
        interact_ctx, target_x_wrapped, target_y_wrapped, head_1_x, head_1_y,
        sorter.wrap_x, sorter.wrap_y
    );
    draw_line_wrapped(
        interact_ctx, target_x_wrapped, target_y_wrapped, head_2_x, head_2_y,
        sorter.wrap_x, sorter.wrap_y
    );
});
interact_canvas.addEventListener("pointerleave", function (e) {
    interact_ctx.clearRect(0, 0, interact_canvas.width, interact_canvas.height);
});

// set up pixel count slider
const pixel_count_slider = document.getElementById("pixel_count");
const pixel_count_text = document.getElementById("pixel_count_text");
let pixel_count_target = 250000;
pixel_count_slider.oninput = function () {
    const v = parseInt(this.value) * 1000;
    pixel_count_target = v;
    pixel_count_text.innerHTML = v;
}

function resize_and_apply_image(image) {
    const orig_pixels = image.width * image.height;
    const scaling_factor = Math.sqrt(pixel_count_target / orig_pixels);
    const new_width = Math.floor(image.width * scaling_factor);
    const new_height = Math.floor(image.height * scaling_factor);

    canvas_container.style.width = new_width;
    canvas_container.style.height = new_height;
    bottom_text_div.style.width = new_width;
    bottom_text_div.style.top = new_height;
    left_text_div.style.height = new_height;
    canvas.width = new_width;
    canvas.height = new_height;
    interact_canvas.width = new_width;
    interact_canvas.height = new_height;

    const temp_canvas = new OffscreenCanvas(new_width, new_height);
    const temp_ctx = temp_canvas.getContext("2d");
    temp_ctx.drawImage(image, 0, 0, new_width, new_height);
    sorter.set_image_data(temp_ctx.getImageData(0, 0, new_width, new_height));
}

/**
 * Loads an image for a file and puts it into the sorter object
 * @param {string} path Path to file 
 */
function set_image_from_path(path) {
    const image = new Image();
    image.src = path;
    image.onload = () => resize_and_apply_image(image);
}

// set up example image buttons
for (const example_button of document.getElementsByClassName("example_image_button")) {
    example_button.addEventListener("click", function (e) {
        set_image_from_path(example_button.getAttribute("data-path"));
    });
}

// set up image input
const canvas_container = document.getElementById("main_canvas_container");
const bottom_text_div = document.getElementById("arrow_bottom");
const left_text_div = document.getElementById("arrow_left");
const image_input = document.getElementById("image_input");
image_input.addEventListener("change", function (e) {
    const file = e.target.files[0];
    if (!file) {
        return;
    }
    if (!file.type.startsWith("image/")) {
        return;
    }
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = function (r) {
        const image = new Image();
        image.src = r.target.result;
        image.onload = () => resize_and_apply_image(image);
    } 
});

const frame_text = document.getElementById("frame_count");
const loss_text = document.getElementById("loss");

function animate() {
    sorter.draw(ctx);
    frame_text.innerHTML = `Frame: ${sorter.frame}`;
    loss_text.innerHTML = `Loss: ${sorter.loss.toFixed(1)} px² (${(100 * sorter.loss / sorter.initial_loss).toFixed(3)}% of initial)`;
    if (playing) {
        sorter.advance();
    }

    requestAnimationFrame(animate);
}

animate();