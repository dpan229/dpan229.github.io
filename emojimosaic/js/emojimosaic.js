const canvas_container = document.getElementById("main_canvas_container");

const image_canvas = document.getElementById("image_canvas");
const image_ctx = image_canvas.getContext("2d");

const top_canvas = document.getElementById("top_canvas");
const top_ctx = top_canvas.getContext("2d");

const grid_settings_container = document.getElementById("grid_settings");

const output_container = document.getElementById("output_container");
const output_textbox = document.getElementById("output_text");

function unpack_ranges(range_list) {
    const out = [];
    for (const a of range_list) {
        if (a.length == 1) {
            out.push(a);
        } else {
            for (let i = a[0]; i <= a[1]; i++) {
                out.push(i);
            }
        }
    }
    return out;
}

const EMOJI_CATEGORIES = {
    PEOPLE: unpack_ranges([
        [0x261d], [0x2639], [0x263a], // index, some faces
        [0x270a, 0x270d],             // raised fist - writing hand
        [0x1f440, 0x1f469],           // eyes - woman
        [0x1f46b, 0x1f487],           // man and woman - haircut
        [0x1f4aa], [0x1f590], 
        [0x1f595], [0x1f596],         // some hands
        [0x1f600, 0x1f647],           // grinning face - bowing
        [0x1f64b, 0x1f64f],           // raising hand - folded hands
        [0x1f6b4, 0x1f6b6],           // bicyclist - pedestrian
        [0x1f90c],                    // che voi hand
        [0x1f90f, 0x1f93a],           // pinch - fencer
        [0x1f93c, 0x1f93e],           // wrestlers - handball
        [0x1f970, 0x1f97f],           // face with hearts - flat shoe
        [0x1f9b4, 0x1f9bf],           // bone - mechanical leg
        [0x1f9cc, 0x1f9e0],           // troll - brain
        [0x1f9e2, 0x1f9e6],           // baseball cap - socks
        [0x1fa70, 0x1fa74],           // ballet shoes - sandal
        [0x1fac0, 0x1fac6],           // heart - fingerprint
        [0x1fae0, 0x1fae6],           // melting face - biting lip
        [0x1fae8, 0x1fae9],           // shaking face - face with bags
        [0x1faf0, 0x1faf8]            // hand making heart with fingers - hand pushing right
    ]),
    NATURE: unpack_ranges([
        [0x2600, 0x2604],             // sun - comet
        [0x2614],                     // umbrella with rain
        [0x26c4], [0x26c5], [0x26c8], // snowman, cloudy, thunderstorm
        [0x1f300, 0x1f320],           // cyclone - shooting star
        [0x1f324, 0x1f32c],           // partly cloudy - wind blowing face
        [0x1f400, 0x1f43f],           // rat - chipmunk
        [0x1f648, 0x1f64a],           // monkeys
        [0x1f980, 0x1f9ae],           // crab - guide dog
        [0x1fab0, 0x1fabf],           // fly - goose
        [0x1facd, 0x1facf]            // orca - donkey
    ]),
    FOOD: unpack_ranges([
        [0x2615],                     // coffee
        [0x1f32d, 0x1f330],           // hot dog - chestnut
        [0x1f336],                    // chili pepper
        [0x1f33d],                    // corn
        [0x1f345, 0x1f37f],           // tomato - popcorn
        [0x1f950, 0x1f96f],           // croissant - bagel
        [0x1f9c0, 0x1f9cb],           // cheese - bubble tea
        [0x1fad0, 0x1fadc]            // blueberries - root vegetable
    ]),
    SHAPES: unpack_ranges([
        [0x1f7e0, 0x1f7eb]
    ])
};

class EmojiMosaicApp {
    constructor(image_ctx, top_ctx, compare_size, box_width, box_height, font_size, horizontal_offset=0, vertical_offset=0) {
        this.image_ctx = image_ctx;
        this.top_ctx = top_ctx;
        this.width = image_ctx.canvas.width;
        this.height = image_ctx.canvas.height;
        this.image_data = image_ctx.getImageData(0, 0, this.width, this.height);
        this.compare_size = compare_size;

        this.state = 0;
        this.emoji_list = [];

        this.emoji_data = new Map();
        this.box_data = new Map();

        this.emoji_canvas = new OffscreenCanvas(box_width, box_height);
        this.emoji_ctx = this.emoji_canvas.getContext("2d", {
            willReadFrequently: true, alpha: false 
        });
        this.small_emoji_canvas = new OffscreenCanvas(compare_size, compare_size);
        this.small_emoji_ctx = this.small_emoji_canvas.getContext("2d", {
            willReadFrequently: true, alpha: false
        });
        this.small_box_canvas = new OffscreenCanvas(compare_size, compare_size);
        this.small_box_ctx = this.small_box_canvas.getContext("2d", {
            willReadFrequently: true, alpha: false
        });
        this.set_box_dimensions(box_width, box_height);

        this.font_size = font_size;
        this.horizontal_offset = horizontal_offset;
        this.vertical_offset = vertical_offset;
        this.emoji_opacity = 0.7;
        this.background_color = "#ffffff";

        this.best_emojis = null;
        this.best_scores = null;
        this.running_x = 0;
        this.running_y = 0;
        this.running_emoji_index = 0;
    }

    /**
     * Returns image data for scaled down emoji with current size 
     * and positioning settings. Memoized for repeated calls with
     * same settings.
     * @param {Number} charcode Integer character code 
     * @returns {ImageData}
     */
    get_emoji_data(charcode) {
        if (this.emoji_data.has(charcode)) {
            return this.emoji_data.get(charcode);
        } else {
            // draw emoji on emoji canvas using size and positioning settings
            this.emoji_ctx.fillStyle = this.background_color;
            this.emoji_ctx.fillRect(0, 0, this.box_width, this.box_height);
            this.emoji_ctx.font = `${this.font_size}px monospace`;
            this.emoji_ctx.textBaseline = "middle";
            this.emoji_ctx.textAlign = "center";
            this.emoji_ctx.fillText(
                String.fromCodePoint(charcode, 0xfe0f),
                0.5 * this.box_width + this.horizontal_offset,
                0.5 * this.box_height + this.vertical_offset
            );
            // downscale rendered emoji onto small canvas
            this.small_emoji_ctx.drawImage(
                this.emoji_canvas, 0, 0, this.compare_size, this.compare_size
            );
            const data = this.small_emoji_ctx.getImageData(
                0, 0, this.compare_size, this.compare_size
            ).data;
            this.emoji_data.set(charcode, data);
            return data;
        }
    }

    /**
     * Returns image data for scaled down image slice in row
     * `y`, column `x`. Memoized for repeated calls with same
     * settings.
     * @param {Number} x Column number
     * @param {Number} y Row number
     * @returns {ImageData}
     */
    get_box_data(x, y) {
        const id = y * this.columns + x;
        if (this.box_data.has(id)) {
            return this.box_data.get(id);
        } else {
            // downscale section of image onto small canvas
            this.small_box_ctx.drawImage(
                this.image_ctx.canvas,
                x * this.box_width, y * this.box_height,
                this.box_width, this.box_height,
                0, 0,
                this.compare_size, this.compare_size
            );
            const data = this.small_box_ctx.getImageData(
                0, 0, this.compare_size, this.compare_size
            ).data;
            this.box_data.set(id, data);
            return data;
        }
    }

    /**
     * Sets main image to the given image data
     * @param {ImageData} image_data 
     */
    set_image_data(image_data) {
        this.image_data = image_data;
        this.width = image_data.width;
        this.height = image_data.height;
        this.rows = Math.floor(this.height / this.box_height);
        this.columns = Math.floor(this.width / this.box_width);
        this.image_ctx.canvas.width = this.width;
        this.image_ctx.canvas.height = this.height;
        this.top_ctx.canvas.width = this.width;
        this.top_ctx.canvas.height = this.height;
        this.image_ctx.putImageData(image_data, 0, 0);
        this.box_data.clear();
        this.draw();
    }

    /**
     * Sets image slice dimensions
     * @param {Number} box_width Slice width in pixels 
     * @param {Number} box_height Slice height in pixels
     */
    set_box_dimensions(box_width, box_height) {
        this.box_width = box_width;
        this.box_height = box_height;
        this.emoji_ctx.canvas.width = box_width;
        this.emoji_ctx.canvas.height = box_height;
        this.rows = Math.floor(this.height / this.box_height);
        this.columns = Math.floor(this.width / this.box_width);
        this.box_data.clear();
        this.emoji_data.clear();
        this.draw();
    }

    /**
     * Sets emoji font size
     * @param {Number} font_size Font size in pixels 
     */
    set_font_size(font_size) {
        this.font_size = font_size;
        this.emoji_data.clear();
        this.draw();
    }

    /**
     * Sets emoji horizontal offset
     * @param {Number} horizontal_offset Horizontal offset in pixels 
     */
    set_horizontal_offset(horizontal_offset) {
        this.horizontal_offset = horizontal_offset;
        this.emoji_data.clear();
        this.draw();
    }

    /**
     * Sets emoji vertical offset
     * @param {Number} vertical_offset Vertical offset in pixels
     */
    set_vertical_offset(vertical_offset) {
        this.vertical_offset = vertical_offset;
        this.emoji_data.clear();
        this.draw();
    }

    /**
     * Sets emoji display opacity
     * @param {Number} opacity Opacity between 0.0 and 1.0
     */
    set_emoji_opacity(opacity) {
        this.emoji_opacity = opacity;
        this.draw();
    }

    reset() {
        this.best_emojis = null;
        this.best_scores = null;
        this.state = 0;
        this.running_x = 0;
        this.running_y = 0;
        this.running_emoji_index = 0;
        this.draw();
    }

    draw() {
        const ctx = this.top_ctx;
        ctx.reset();
        // draw grid
        if (this.state < 2) {
            ctx.lineWidth = 1;
            ctx.strokeStyle = "black";
            ctx.beginPath();
            for (let i = 0; i <= this.columns; i++) {
                ctx.moveTo(i * this.box_width - 1, 0);
                ctx.lineTo(i * this.box_width - 1, this.height);
                ctx.moveTo(i * this.box_width, 0);
                ctx.lineTo(i * this.box_width, this.height);
            }
            for (let i = 0; i <= this.rows; i++) {
                ctx.moveTo(0, i * this.box_height - 1);
                ctx.lineTo(this.width, i * this.box_height - 1);
                ctx.moveTo(0, i * this.box_height);
                ctx.lineTo(this.width, i * this.box_height);
            }
            ctx.stroke();
        }
        // draw emojis
        ctx.font = `${this.font_size}px monospace`;
        ctx.textBaseline = "middle";
        ctx.textAlign = "center";
        ctx.globalAlpha = this.emoji_opacity;
        if (this.state == 2) {
            ctx.fillStyle = this.background_color;
            ctx.fillRect(0, 0, this.width, this.height);
        }
        if (this.state == 0) {
            // fill with sunglasses emoji
            for (let y = 0; y < this.rows; y++) {
                for (let x = 0; x < this.columns; x++) {
                    ctx.fillText(
                        //String.fromCodePoint(this.emoji_list[(y * this.columns + x) % this.emoji_list.length], 0xfe0f),
                        String.fromCodePoint(0x1f60e),
                        (x + 0.5) * this.box_width + this.horizontal_offset,
                        (y + 0.5) * this.box_height + this.vertical_offset
                    );
                }
            }
        } else {
            // best emojis
            for (let y = 0; y < this.rows; y++) {
                for (let x = 0; x < this.columns; x++) {
                    ctx.fillText(
                        String.fromCodePoint(this.best_emojis[y][x][0], 0xfe0f),
                        (x + 0.5) * this.box_width + this.horizontal_offset,
                        (y + 0.5) * this.box_height + this.vertical_offset
                    );
                }
            }
        }
        ctx.globalAlpha = 1;
    }

    start_mosaic() {
        this.state = 1;
        // initialize best emoji array to a
        // rows x columns x 10 array filled
        // with 0x20 (char code for space)
        this.best_emojis = Array.from(
            {length: this.rows}, 
            () => Array.from(
                {length: this.columns},
                () => Array(10).fill(0x20)
            )
        );
        // initialize best scores array to a
        // rows x columns x 10 array filled
        // with Infinity
        this.best_scores = Array.from(
            {length: this.rows}, 
            () => Array.from(
                {length: this.columns},
                () => Array(10).fill(Infinity)
            )
        );
    }

    compare() {
        let total = 0;
        const box_image_data = this.get_box_data(this.running_x, this.running_y);
        const emoji_image_data = this.get_emoji_data(this.emoji_list[this.running_emoji_index]);
        let blank_pixels = 0;
        for (let py = 0; py < this.compare_size; py++) {
            for (let px = 0; px < this.compare_size; px++) {
                const i = 4 * (py * this.compare_size + px);
                // color of pixel from scaled down image slice
                const b_red = box_image_data[i];
                const b_green = box_image_data[i + 1];
                const b_blue = box_image_data[i + 2];
                // color of pixel from scaled down emoji
                const e_red = emoji_image_data[i];
                const e_green = emoji_image_data[i + 1];
                const e_blue = emoji_image_data[i + 2];

                // other possible scoring strategies commented out
                // const d2 = (e_red - b_red)**2 + (e_green - b_green)**2 + (e_blue - b_blue)**2;
                // total += d2 < 1200 ? 0 : d2 < 10000 ? 1 : d2 < 40000 ? 2 : 3;

                if (e_red == 255 && e_green == 255 && e_blue == 255) {
                    // total += 15;
                    blank_pixels++;
                    if (blank_pixels > 95) {
                        // emoji probably can't be displayed in this environment
                        // if this many pixels are blank
                        return Infinity;
                    }
                } else {
                    // manhattan distance between colors
                    const dm = Math.abs(e_red - b_red) + Math.abs(e_green - b_green) + Math.abs(e_blue - b_blue);
                    total += Math.sqrt(dm);
                }
            }
        }
        return total * 100 / (100 - blank_pixels);
    }

    step() {
        if (this.state == 1) {
            const score = this.compare();
            const current_best_scores = this.best_scores[this.running_y][this.running_x];
            if (score < current_best_scores[9]) {
                const current_best_emojis = this.best_emojis[this.running_y][this.running_x];
                const current_emoji = this.emoji_list[this.running_emoji_index];
                // replace lowest
                current_best_scores[9] = score;
                current_best_emojis[9] = current_emoji;
                let i = 9;
                while (i > 0 && score < current_best_scores[i - 1]) {
                    // swap upwards
                    [current_best_scores[i - 1], current_best_scores[i]] = [current_best_scores[i], current_best_scores[i - 1]];
                    [current_best_emojis[i - 1], current_best_emojis[i]] = [current_best_emojis[i], current_best_emojis[i - 1]];
                    i--;
                }
            }

            this.running_emoji_index++;
            if (this.running_emoji_index >= this.emoji_list.length) {
                this.running_emoji_index = 0;
                this.running_x++;
                if (this.running_x >= this.columns) {
                    this.running_x = 0;
                    this.running_y++;
                    if (this.running_y >= this.rows) {
                        this.running_y = 0;
                        this.state = 2;
                    }
                }
            }
        }
    }
}

const app = new EmojiMosaicApp(image_ctx, top_ctx, 10, 25, 25, 20, 0, 0);

const pixel_count_target = 250000;

function resize_and_apply_image(image) {
    const orig_pixels = image.width * image.height;
    const scaling_factor = Math.sqrt(pixel_count_target / orig_pixels);
    const new_width = Math.floor(image.width * scaling_factor);
    const new_height = Math.floor(image.height * scaling_factor);

    canvas_container.style.width = `${new_width}px`;
    canvas_container.style.height = `${new_height}px`;

    const temp_canvas = new OffscreenCanvas(new_width, new_height);
    const temp_ctx = temp_canvas.getContext("2d");
    temp_ctx.drawImage(image, 0, 0, new_width, new_height);
    app.set_image_data(temp_ctx.getImageData(0, 0, new_width, new_height));
}

/**
 * Loads an image for a file and puts it into the mosaic app
 * @param {string} path Path to file 
 */
function set_image_from_path(path) {
    const image = new Image();
    image.src = path;
    image.onload = () => resize_and_apply_image(image);
}

set_image_from_path("../imagesorter/images/zooper_dooper.jpg");
app.draw();

// set up image input
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

// set up grid settings
const box_size_text = document.getElementById("box_size_text");
document.getElementById("box_size").addEventListener("input", function (e) {
    const v = parseInt(e.target.value);
    box_size_text.textContent = v;
    app.set_box_dimensions(v, v);
});
const font_size_text = document.getElementById("font_size_text");
document.getElementById("font_size").addEventListener("input", function (e) {
    const v = parseInt(e.target.value);
    font_size_text.textContent = v;
    app.set_font_size(v);
});
const horizontal_offset_text = document.getElementById("horizontal_offset_text");
document.getElementById("horizontal_offset").addEventListener("input", function (e) {
    const v = parseInt(e.target.value);
    horizontal_offset_text.textContent = v;
    app.set_horizontal_offset(v);
});
const vertical_offset_text = document.getElementById("vertical_offset_text");
document.getElementById("vertical_offset").addEventListener("input", function (e) {
    const v = parseInt(e.target.value);
    vertical_offset_text.textContent = v;
    app.set_vertical_offset(v);
});
const emoji_opacity_text = document.getElementById("emoji_opacity_text");
document.getElementById("emoji_opacity").addEventListener("input", function (e) {
    const v = parseInt(e.target.value);
    emoji_opacity_text.textContent = v;
    app.set_emoji_opacity(v / 100);
});

// set up category checkboxes
const category_checkboxes = document.getElementsByClassName("category_checkbox");
const palette_count_text = document.getElementById("palette_count");
function set_categories() {
    app.emoji_list.length = 0;
    for (const checkbox of category_checkboxes) {
        if (checkbox.checked) {
            const category = checkbox.getAttribute("data-category");
            app.emoji_list = app.emoji_list.concat(EMOJI_CATEGORIES[category]);
        }
    }
    palette_count_text.textContent = `Total emojis: ${app.emoji_list.length}`;
}
for (const checkbox of category_checkboxes) {
    checkbox.addEventListener("change", set_categories);
}
set_categories();

// set up go button
document.getElementById("go_button").addEventListener("click", function (e) {
    if (app.state == 0) {
        // go
        app.start_mosaic();
        grid_settings_container.style.display = "none";
        go_button.textContent = "Stop";
        animate();
    } else {
        // stop / reset
        app.reset();
        table_container.innerHTML = "";
        grid_settings_container.style.display = "";
        top_canvas.removeEventListener("pointerdown", show_best);
        output_textbox.innerText = "";
        go_button.textContent = "Go";
    }
});

const table_container = document.getElementById("table_container");
function show_best(e) {
    // get row and column of clicked cell
    const canvas_bounds = top_canvas.getBoundingClientRect();
    const x = Math.round(e.clientX - canvas_bounds.left);
    const y = Math.round(e.clientY - canvas_bounds.top);
    const row = Math.floor(y / app.box_height);
    const column = Math.floor(x / app.box_width);
    
    // get top emojis and scores
    const emojis = app.best_emojis[row][column];
    const scores = app.best_scores[row][column];

    // make table
    table_container.innerHTML = "";

    const heading = document.createElement("span");
    heading.classList.add("container_heading");
    heading.innerHTML = "Best emojis for selected position";
    table_container.appendChild(heading);

    const table = document.createElement("table");
    
    const emoji_row = document.createElement("tr");
    table.appendChild(emoji_row);
    const emoji_row_header = document.createElement("th");
    emoji_row_header.setAttribute("scope", "row");
    emoji_row_header.innerHTML = "Emoji";
    emoji_row.appendChild(emoji_row_header);
    for (const charcode of emojis) {
        const cell = document.createElement("td");
        cell.classList.add("emoji_table_cell");
        cell.innerHTML = String.fromCodePoint(charcode, 0xfe0f);
        emoji_row.appendChild(cell);
    }

    const score_row = document.createElement("tr");
    table.appendChild(score_row);
    const score_row_header = document.createElement("th");
    score_row_header.setAttribute("scope", "row");
    score_row_header.innerHTML = "Cost";
    score_row.appendChild(score_row_header);
    for (const score of scores) {
        const cell = document.createElement("td");
        cell.classList.add("score_table_cell");
        cell.innerHTML = score.toFixed(2);
        score_row.appendChild(cell);
    }
    table_container.appendChild(table);
}

// animation loop
// only runs while mosaic is generating
function animate() {
    for (let i = 0; i < 100; i++) {
        app.step();
    }
    app.draw();
    if (app.state == 1) {
        requestAnimationFrame(animate);
    } else if (app.state == 2) {
        // mosaic finished
        const emoji_text = app.best_emojis.map(
            row => row.map(
                charcodes => String.fromCodePoint(charcodes[0], 0xfe0f)
            ).join("")
        ).join("\n");
        output_textbox.innerText = emoji_text;
        console.log(emoji_text);
        go_button.textContent = "Reset";
        top_canvas.addEventListener("pointerdown", show_best);
    }
}