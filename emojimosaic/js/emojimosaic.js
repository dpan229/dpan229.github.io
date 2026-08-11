const canvas_container = document.getElementById("main_canvas_container");

const image_canvas = document.getElementById("image_canvas");
const image_ctx = image_canvas.getContext("2d");

const top_canvas = document.getElementById("top_canvas");
const top_ctx = top_canvas.getContext("2d");

const grid_settings_container = document.getElementById("grid_settings");

const output_container = document.getElementById("output_container");
const output_textbox = document.getElementById("output_text");

const COMPARISON_SIZE = 15;

function unpack_ranges(range_list) {
    const out = [];
    for (const a of range_list) {
        if (a.length == 1) {
            out.push(a[0]);
        } else {
            for (let i = a[0]; i <= a[1]; i++) {
                out.push(i);
            }
        }
    }
    return out;
}

function remove_nonrenderable(codepoints) {
    const out = [];
    // compare rendered width of each codepoint to a
    // known renderable emoji
    const temp_canvas = new OffscreenCanvas(10, 10);
    const temp_ctx = temp_canvas.getContext("2d");
    temp_ctx.font = "20px monospace";
    const known_width = temp_ctx.measureText(
        String.fromCodePoint(0x1f60e, 0xfe0f)
    ).width;
    const min_allowed = 0.9 * known_width;
    const max_allowed = 1.1 * known_width;
    for (const codepoint of codepoints) {
        const width = temp_ctx.measureText(
            String.fromCodePoint(codepoint, 0xfe0f)
        ).width;
        if (width >= min_allowed && width <= max_allowed) {
            out.push(codepoint);
        } else {
            console.log(`Codepoint 0x${codepoint.toString(16)} is not a renderable emoji, removing from list`);
        }
    }
    return out;
}

const EMOJI_CATEGORIES = {
    PEOPLE: remove_nonrenderable(unpack_ranges([
        [0x261d], [0x2639], [0x263a], // index, some faces
        [0x270a, 0x270d],             // raised fist - writing hand
        [0x1f440, 0x1f469],           // eyes - woman
        [0x1f46b, 0x1f487],           // man and woman - haircut
        [0x1f4aa],                    // bicep
        [0x1f574, 0x1f576],           // levatating businessman - sunglasses
        [0x1f57a],                    // man dancing
        [0x1f590], [0x1f595, 0x1f596],// some hands
        [0x1f5e3],                    // speaking silhouette head
        [0x1f600, 0x1f647],           // grinning face - bowing
        [0x1f64b, 0x1f64f],           // raising hand - folded hands
        [0x1f6b6],                    // pedestrian
        [0x1f90c],                    // che voi hand
        [0x1f90f, 0x1f937],           // pinch - shrug
        [0x1f970, 0x1f97f],           // face with hearts - flat shoe
        [0x1f9b4, 0x1f9bf],           // bone - mechanical leg
        [0x1f9cc, 0x1f9e0],           // troll - brain
        [0x1f9e2, 0x1f9e6],           // baseball cap - socks
        [0x1fa70, 0x1fa74],           // ballet shoes - sandal
        [0x1fac0, 0x1fac6],           // heart - fingerprint
        [0x1fae0, 0x1fae6],           // melting face - biting lip
        [0x1fae8, 0x1faea],           // shaking face - distorted face
        [0x1faf0, 0x1faf8]            // hand making heart with fingers - hand pushing right
    ])),
    NATURE: remove_nonrenderable(unpack_ranges([
        [0x2600, 0x2604],             // sun - comet
        [0x2614], [0x2618],           // umbrella with rain, clover
        [0x26c4], [0x26c5], [0x26c8], // snowman, cloudy, thunderstorm
        [0x1f300, 0x1f320],           // cyclone - shooting star
        [0x1f324, 0x1f32c],           // partly cloudy - wind blowing face
        [0x1f400, 0x1f43f],           // rat - chipmunk
        [0x1f54a],                    // dove
        [0x1f577, 0x1f578],           // spider, spider web
        [0x1f648, 0x1f64a],           // monkeys
        [0x1f980, 0x1f9ae],           // crab - guide dog
        [0x1fab0, 0x1fabf],           // fly - goose
        [0x1facd, 0x1facf]            // orca - donkey
    ])),
    FOOD: remove_nonrenderable(unpack_ranges([
        [0x2615],                     // coffee
        [0x1f32d, 0x1f330],           // hot dog - chestnut
        [0x1f336],                    // chili pepper
        [0x1f33d],                    // corn
        [0x1f345, 0x1f37f],           // tomato - popcorn
        [0x1f950, 0x1f96f],           // croissant - bagel
        [0x1f9c0, 0x1f9cb],           // cheese - bubble tea
        [0x1fad0, 0x1fadc]            // blueberries - root vegetable
    ])),
    OBJECTS: remove_nonrenderable(unpack_ranges([
        [0x231a, 0x231b],             // watch, hourglass
        [0x23f0, 0x23f3],             // alarm clock - hourglass
        [0x260e],                     // telephone
        [0x265f],                     // chess pawn
        [0x2692, 0x2697],             // hammer and pick - alembic
        [0x2699],                     // gear
        [0x26b0, 0x26b1],             // coffin, urn
        [0x26cf], [0x26d1], [0x26d3], // pickaxe, helmet, chains
        [0x2702], [0x2709], [0x270f], // scissors, envelope, pencil
        [0x2712], [0x2744],           // pen, snowflake
        [0x1f004], [0x1f0cf],         // mahjong dragon, joker card
        [0x1f321],                    // thermometer
        [0x1f380, 0x1f384],           // ribbon - christmas tree
        [0x1f386, 0x1f38a],           // fireworks - confetti ball
        [0x1f38e, 0x1f390],           // japanese dolls - wind chime
        [0x1f392, 0x1f393],           // backpack, graduation cap
        [0x1f396, 0x1f397],           // medal, reminder ribbon
        [0x1f399, 0x1f39b],           // microphone - soundboard
        [0x1f39e, 0x1f3a5],           // film frames - movie camera
        [0x1f3a7, 0x1f3bc],           // headphones - music score
        [0x1f3f7], [0x1f3fa],         // label, amphora
        [0x1f488, 0x1f492],           // barber pole - wedding
        [0x1f4a1], [0x1f4a3],         // light bulb, bomb
        [0x1f4b0], [0x1f4b3, 0x1f4f2],// money bag, credit card - phone with arrow
        [0x1f4f7, 0x1f4fd],           // camera - film projector
        [0x1f4ff],                    // prayer beads
        [0x1f50b, 0x1f517],           // battery - link
        [0x1f525, 0x1f52e],           // fire - crystal ball
        [0x1f531],                    // trident
        [0x1f56f, 0x1f570],           // candle, mantlepiece clock
        [0x1f573], [0x1f579],         // hole, joystick
        [0x1f587], [0x1f58a, 0x1f58d],// paperclips, ballpoint pen - crayon
        [0x1f5a5], [0x1f5a8],         // desktop computer, printer
        [0x1f5b1, 0x1f5b2],           // computer mouse, trackball
        [0x1f5bc],                    // painting
        [0x1f5c2, 0x1f5c4],           // card index dividers - filing cabinet
        [0x1f5d1, 0x1f5d3],           // trash can - calendar
        [0x1f5dc, 0x1f5de],           // vice - newspaper
        [0x1f5e1], [0x1f5f3],         // dagger, ballot box
        [0x1f6aa], [0x1f6ac],         // door, cigarette
        [0x1f6bd], [0x1f6bf, 0x1f6c1],// shower - bathtub
        [0x1f6cb, 0x1f6cf],           // sofa - bed
        [0x1f6dd, 0x1f6e2],           // slide - oil drum
        [0x1f93f, 0x1f944],           // diving mask - spoon
        [0x1f9e7, 0x1f9ff],           // red envelope - nazar amulet
        [0x1fa78, 0x1fa7c],           // blood - crutch
        [0x1fa80, 0x1fa8a],           // yoyo - trombone
        [0x1fa8e, 0x1faae],           // treasure chest - hair pick
        [0x1fae7]                     // bubbles
    ])),
    TRAVELSPORTS: remove_nonrenderable(unpack_ranges([
        [0x26bd, 0x26be],             // soccer ball, baseball
        [0x26e9, 0x26ea],             // shinto shrine, church
        [0x26f0, 0x26f5],             // mountain - sailboat
        [0x26f7, 0x26fa],             // skier - tent
        [0x26fd], [0x2708],           // fuel pump, airplane
        [0x1f38b, 0x1f38d],           // tanabata tree - pine decoration
        [0x1f3be, 0x1f3e6],           // tennis racket - bank
        [0x1f3e8, 0x1f3f0],           // hotel - castle
        [0x1f3f8, 0x1f3f9],           // badminton, bow and arrow
        [0x1f54b, 0x1f54d],           // kaaba - synagogue
        [0x1f5fa, 0x1f5ff],           // map - stone head
        [0x1f680, 0x1f689],           // rocket - triangular flag
        [0x1f6b2], [0x1f6b4, 0x1f6b5],// bicycle, cyclist, mountain cyclist
        [0x1f6d1, 0x1f6d2],           // stop sign, shopping cart
        [0x1f6d5, 0x1f6d6],           // hindu temple, hut
        [0x1f6e3, 0x1f6e5],           // highway - motorboat
        [0x1f6e9], [0x1f6eb, 0x1f6ec],// small airplane, takeoff, landing
        [0x1f6f0], [0x1f6f3, 0x1f6fc],// satellite, cruise ship - roller skates
        [0x1f938, 0x1f93e],           // cartwheel - handball
        [0x1f945, 0x1f94f]            // goal net - frisbee
    ])),
    SHAPES: unpack_ranges([
        [0x1f7e0, 0x1f7eb]
    ]),
    SPACE: [
        0x3000
    ]
};

/**
 * Returns the redmean color distance between two rgb colors
 * (`r1`, `g1`, `b1`) and (`r2`, `g2`, `b2`). Output value
 * ranges from 0.0 to 764.833966357
 * @param {Number} r1 
 * @param {Number} g1 
 * @param {Number} b1 
 * @param {Number} r2 
 * @param {Number} g2 
 * @param {Number} b2 
 * @returns 
 */
function redmean_distance(r1, g1, b1, r2, g2, b2) {
    const rmean = (r1 + r2) >> 1;
    const dr = r1 - r2;
    const dg = g1 - g2;
    const db = b1 - b2;
    return Math.sqrt(
        (((512 + rmean) * dr * dr) >> 8) +
        (4 * dg * dg) +
        (((767 - rmean) * db * db) >> 8)
    );
}

class EmojiMosaicApp {
    constructor(image_ctx, top_ctx, compare_size, box_width, box_height, font_size, 
                background_color="#ffffff", horizontal_offset=0, vertical_offset=0) {
        this.image_ctx = image_ctx;
        this.top_ctx = top_ctx;
        this.width = image_ctx.canvas.width;
        this.height = image_ctx.canvas.height;
        this.compare_size = compare_size;
        this.compare_area = compare_size * compare_size;
        this.compare_func = this.compare_with_background;

        // app has 3 states:
        // state 0 = starting state, waiting to start generating
        // state 1 = activiely generating
        // state 2 = finished generating
        this.state = 0;
        this.emoji_list = [];

        this.emoji_data = new Map();
        this.box_data = new Map();

        this.emoji_canvas = new OffscreenCanvas(box_width, box_height);
        this.emoji_ctx = this.emoji_canvas.getContext("2d", {
            willReadFrequently: true
        });
        this.small_emoji_canvas = new OffscreenCanvas(compare_size, compare_size);
        this.small_emoji_ctx = this.small_emoji_canvas.getContext("2d", {
            willReadFrequently: true
        });
        this.small_box_canvas = new OffscreenCanvas(compare_size, compare_size);
        this.small_box_ctx = this.small_box_canvas.getContext("2d", {
            willReadFrequently: true, alpha: false
        });

        this.set_box_dimensions(box_width, box_height);

        // emoji rendering parameters
        this.font_size = font_size;
        this.horizontal_offset = horizontal_offset;
        this.vertical_offset = vertical_offset;
        this.emoji_data_transparency = false;
        this.background_color = background_color;

        // display parameters
        this.emoji_opacity = 0.7;
        this.highlight_x = -2;
        this.highlight_y = -2;

        // variables to keep state during mosaic generation
        // and store results
        this.best_emojis = null;
        this.best_scores = null;
        this.running_x = 0;
        this.running_y = 0;
        this.running_emoji_index = 0;
    }

    /**
     * Returns pixel data for scaled down emoji with current size 
     * and positioning settings. Memoized for repeated calls with
     * same settings.
     * @param {Number} charcode Integer character code 
     * @returns {Uint8ClampedArray}
     */
    get_emoji_data(charcode) {
        if (this.emoji_data.has(charcode)) {
            return this.emoji_data.get(charcode);
        } else {
            // draw emoji on emoji canvas using size and positioning settings
            if (this.emoji_data_transparency) {
                this.emoji_ctx.reset();
                this.small_emoji_ctx.reset();
            } else {
                this.emoji_ctx.fillStyle = this.background_color;
                this.emoji_ctx.fillRect(0, 0, this.box_width, this.box_height);
            }
            this.emoji_ctx.font = `${this.font_size}px monospace`;
            this.emoji_ctx.textBaseline = "middle";
            this.emoji_ctx.textAlign = "center";
            this.emoji_ctx.fillStyle = "#000000";
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
     * Returns pixel data for scaled down image slice in row
     * `y`, column `x`. Memoized for repeated calls with same
     * settings.
     * @param {Number} x Column number
     * @param {Number} y Row number
     * @returns {Uint8ClampedArray}
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
     * Sets main image
     * @param {CanvasImageSource} image
     */
    set_image(image) {
        this.width = image.width;
        this.height = image.height;
        this.rows = Math.floor(this.height / this.box_height);
        this.columns = Math.floor(this.width / this.box_width);
        this.image_ctx.canvas.width = this.width;
        this.image_ctx.canvas.height = this.height;
        this.top_ctx.canvas.width = this.width;
        this.top_ctx.canvas.height = this.height;

        // remove transparency by drawing image on top of white background
        this.image_ctx.fillStyle = "white";
        this.image_ctx.fillRect(0, 0, this.width, this.height);
        this.image_ctx.drawImage(image, 0, 0);
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
     * Sets emoji background color
     * @param {String} background_color A color string like "white" or "#FFFFFF"
     */
    set_background_color(background_color) {
        this.background_color = background_color;
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

    set_highlight(x, y) {
        this.highlight_x = x;
        this.highlight_y = y;
        this.draw();
    }

    disable_highlight() {
        this.set_highlight(-2, -2);
    }

    reset() {
        this.best_emojis = null;
        this.best_scores = null;
        this.state = 0;
        this.running_x = 0;
        this.running_y = 0;
        this.running_emoji_index = 0;
        this.highlight_x = -2;
        this.highlight_y = -2;
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

        ctx.globalAlpha = this.emoji_opacity;
        // draw background if in finished state
        if (this.state == 2) {
            ctx.fillStyle = this.background_color;
            ctx.fillRect(0, 0, this.width, this.height);
        }

        // draw emojis
        ctx.font = `${this.font_size}px monospace`;
        ctx.textBaseline = "middle";
        ctx.textAlign = "center";
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

        // draw single box highlight
        ctx.globalAlpha = 1;
        ctx.strokeStyle = "#9999FF";
        ctx.lineWidth = 2;
        ctx.strokeRect(
            this.highlight_x * this.box_width,
            this.highlight_y * this.box_height,
            this.box_width, this.box_height
        );
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

    compare_with_background(cutoff=Infinity) {
        let total = 0;
        const box_image_data = this.get_box_data(this.running_x, this.running_y);
        const emoji_image_data = this.get_emoji_data(this.emoji_list[this.running_emoji_index]);
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

                // redmean color distance
                const distance = redmean_distance(
                    b_red, b_green, b_blue, e_red, e_green, e_blue
                );
                total += distance;
                if (total > cutoff) {
                    return Infinity;
                }
            }
        }
        return total;
    }

    compare_no_background(cutoff=Infinity) {
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
                const e_alpha = emoji_image_data[i + 3];

                const opacity = e_alpha / 255;
                blank_pixels += 1 - opacity;
                if (e_alpha > 0) {
                    // redmean color distance
                    const distance = redmean_distance(
                        b_red, b_green, b_blue, e_red, e_green, e_blue
                    );
                    total += distance * opacity;
                    if (total > cutoff) {
                        return Infinity;
                    }
                }
            }
        }
        return total * this.compare_area / (this.compare_area - blank_pixels);
    }

    step() {
        if (this.state == 1) {
            const current_best_scores = this.best_scores[this.running_y][this.running_x];
            const score = this.compare_func(current_best_scores[9]);
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

const app = new EmojiMosaicApp(image_ctx, top_ctx, COMPARISON_SIZE, 25, 25, 20, "#ffffff", 0, 0);

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
    app.set_image(temp_canvas);
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

// set up compare function selection
const background_color_container = document.getElementById("background_color_container");
const background_color_pick = document.getElementById("background_color_pick");
for (const radio of document.querySelectorAll('input[name="transparency"]')) {
    radio.addEventListener("change", function (e) {
        switch (e.target.value) {
            case "use_background":
                background_color_container.style.display = "";
                app.emoji_data_transparency = false;
                app.set_background_color(background_color_pick.value);
                app.compare_func = app.compare_with_background;
                break;
            case "average_transparent":
                background_color_container.style.display = "none";
                app.emoji_data_transparency = true;
                app.set_background_color("#FFFFFF");
                app.compare_func = app.compare_no_background;
                break;
            default:
                break;
        }
    });
}
// set up background color selection
background_color_pick.addEventListener("input", function (e) {
    const hex_color = e.target.value;
    app.set_background_color(hex_color);
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
        if (app.emoji_list.length > 0) {
            // go
            app.start_mosaic();
            grid_settings_container.style.display = "none";
            go_button.textContent = "Stop";
            animate();
        }
    } else {
        // stop / reset
        app.reset();
        table_container.innerHTML = "";
        grid_settings_container.style.display = "block";
        click_info_container.style.display = "none";
        output_container.style.display = "none";
        output_textbox.innerText = "";
        go_button.textContent = "Go";
    }
});

const click_info_container = document.getElementById("click_info");
const click_info_transfer_canvas = new OffscreenCanvas(COMPARISON_SIZE, COMPARISON_SIZE);
const click_info_transfer_ctx = click_info_transfer_canvas.getContext("2d");
const click_info_canvas = document.getElementById("click_info_canvas");
const click_info_ctx = click_info_canvas.getContext("2d");
click_info_ctx.imageSmoothingEnabled = false;
const table_container = document.getElementById("table_container");
top_canvas.addEventListener("pointerdown", function (e) {
    // do nothing if generation hasn't started
    if (app.state == 0) {
        return;
    }

    // get row and column of clicked cell
    const canvas_bounds = top_canvas.getBoundingClientRect();
    const x = Math.round(e.clientX - canvas_bounds.left);
    const y = Math.round(e.clientY - canvas_bounds.top);
    const row = Math.floor(y / app.box_height);
    const column = Math.floor(x / app.box_width);
    if (row < 0 || column < 0 || row >= app.rows || column >= app.columns ||
       (app.state == 1 && (row > app.running_y || (row == app.running_y && column >= app.running_x)))
    ) {
        return;
    }

    if (row == app.highlight_y && column == app.highlight_x) {
        // clicked cell is already highlighted, unhighlight it and exit
        app.disable_highlight();
        click_info_container.style.display = "none";
    } else {
        click_info_container.style.display = "block";

        app.set_highlight(column, row);
        
        // show image box
        const box_data = app.get_box_data(column, row);
        const box_image_data = new ImageData(box_data, COMPARISON_SIZE, COMPARISON_SIZE);
        click_info_transfer_ctx.putImageData(box_image_data, 0, 0);
        click_info_ctx.drawImage(click_info_transfer_canvas, 0, 0, 3*COMPARISON_SIZE, 3*COMPARISON_SIZE);

        // get top emojis and scores
        const emojis = app.best_emojis[row][column];
        const scores = app.best_scores[row][column];

        // make table
        table_container.innerHTML = "";

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

        const canvas_row = document.createElement("tr");
        table.appendChild(canvas_row);
        const canvas_row_header = document.createElement("th");
        canvas_row_header.setAttribute("scope", "row");
        canvas_row_header.innerHTML = "Comparison<br>image";
        canvas_row.appendChild(canvas_row_header);
        for (const charcode of emojis) {
            const emoji_compare_canvas = document.createElement("canvas");
            emoji_compare_canvas.classList.add("emoji_table_canvas");
            emoji_compare_canvas.width = 3*COMPARISON_SIZE;
            emoji_compare_canvas.height = 3*COMPARISON_SIZE;
            const emoji_compare_ctx = emoji_compare_canvas.getContext("2d");
            emoji_compare_ctx.imageSmoothingEnabled = false;
            const emoji_data = app.get_emoji_data(charcode);
            const emoji_image_data = new ImageData(emoji_data, COMPARISON_SIZE, COMPARISON_SIZE);
            click_info_transfer_ctx.putImageData(emoji_image_data, 0, 0);
            emoji_compare_ctx.drawImage(click_info_transfer_canvas, 0, 0, 3*COMPARISON_SIZE, 3*COMPARISON_SIZE);
            const cell = document.createElement("td");
            cell.appendChild(emoji_compare_canvas);
            canvas_row.appendChild(cell);
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
            cell.innerHTML = score.toFixed(1);
            score_row.appendChild(cell);
        }
        table_container.appendChild(table);
    }
});

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
        output_textbox.style.backgroundColor = app.background_color;
        output_textbox.innerText = emoji_text;
        output_container.style.display = "block";
        console.log(emoji_text);
        go_button.textContent = "Reset";
    }
}