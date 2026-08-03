const canvas = document.getElementById("main_canvas");
const ctx = canvas.getContext("2d");

const emoji_canvas = document.getElementById("emoji_canvas");
const emoji_ctx = emoji_canvas.getContext("2d", { willReadFrequently: true, alpha: false });

const box_canvas = document.getElementById("box_canvas");
const box_ctx = box_canvas.getContext("2d", { willReadFrequently: true });

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

const PEOPLE = unpack_ranges([
    [0x261d], [0x2639], [0x263a],               // index, some faces
    [0x270a, 0x270d],                           // raised fist - writing hand
    [0x1f440, 0x1f469],                         // eyes - woman
    [0x1f46b, 0x1f487],                         // man and woman - haircut
    [0x1f4aa], [0x1f590], [0x1f595], [0x1f596], // some hands
    [0x1f600, 0x1f647],                         // grinning face - folded hands
    [0x1f6b4, 0x1f6b6]
]);

const SHAPES = unpack_ranges([
    [0x1f7e0, 0x1f7eb]
]);

// adjustable subimage width / height, emoji font size and positioning in box

class EmojiPreviewApp {
    constructor(ctx, emoji_ctx, box_ctx, box_width, box_height, font_size, horizontal_offset=0, vertical_offset=0) {
        this.ctx = ctx;
        this.width = ctx.canvas.width;
        this.height = ctx.canvas.height;
        this.image_data = ctx.getImageData(0, 0, this.width, this.height);

        this.state = 0;
        this.emoji_list = PEOPLE;

        this.emoji_ctx = emoji_ctx;
        this.box_ctx = box_ctx;
        this.set_box_dimensions(box_width, box_height);

        this.font_size = font_size;
        this.horizontal_offset = horizontal_offset;
        this.vertical_offset = vertical_offset;
        this.emoji_opacity = 0.7;

        this.best_emojis = Array.from({length: this.height}, () => Array(this.width).fill(0x20));
        this.running_x = 0;
        this.running_y = 0;
        this.running_emoji_index = 0;
        this.running_best_score = Infinity;
    }

    set_image_data(image_data) {
        this.image_data = image_data;
        this.width = image_data.width;
        this.height = image_data.height;
        this.rows = Math.floor(this.height / this.box_height);
        this.columns = Math.floor(this.width / this.box_width);
        this.draw();
    }

    set_box_dimensions(box_width, box_height) {
        this.box_width = box_width;
        this.box_height = box_height;
        this.emoji_ctx.canvas.width = box_width;
        this.emoji_ctx.canvas.height = box_height;
        this.box_ctx.canvas.width = box_width;
        this.box_ctx.canvas.height = box_height;
        this.rows = Math.floor(this.height / this.box_height);
        this.columns = Math.floor(this.width / this.box_width);
        this.draw();
    }

    set_font_size(font_size) {
        this.font_size = font_size;
        this.draw();
    }

    set_horizontal_offset(horizontal_offset) {
        this.horizontal_offset = horizontal_offset;
        this.draw();
    }

    set_vertical_offset(vertical_offset) {
        this.vertical_offset = vertical_offset;
        this.draw();
    }

    set_emoji_opacity(opacity) {
        this.emoji_opacity = opacity;
        this.draw();
    }

    draw() {
        const ctx = this.ctx;
        // draw image
        ctx.putImageData(this.image_data, 0, 0);
        // draw grid
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
        // draw emojis
        ctx.font = `${this.font_size}px monospace`;
        ctx.textBaseline = "middle";
        ctx.textAlign = "center";
        ctx.globalAlpha = this.emoji_opacity;
        if (this.state == 0) {
            for (let y = 0; y < this.rows; y++) {
                for (let x = 0; x < this.columns; x++) {
                    ctx.fillText(
                        String.fromCodePoint(0x1f60e),
                        (x + 0.5) * this.box_width + this.horizontal_offset,
                        (y + 0.5) * this.box_height + this.vertical_offset
                    );
                }
            }
        } else {
            for (let y = 0; y < this.rows; y++) {
                for (let x = 0; x < this.columns; x++) {
                    ctx.fillText(
                        String.fromCodePoint(this.best_emojis[y][x], 0xfe0f),
                        (x + 0.5) * this.box_width + this.horizontal_offset,
                        (y + 0.5) * this.box_height + this.vertical_offset
                    );
                }
            }
        }
        ctx.globalAlpha = 1;

        if (this.state == 0) {
            this.box_ctx.putImageData(this.image_data, 0, 0);
            this.emoji_ctx.fillStyle = "#FFFFFF";
            this.emoji_ctx.fillRect(0, 0, this.box_width, this.box_height);
            this.emoji_ctx.font = `${this.font_size}px monospace`;
            this.emoji_ctx.textBaseline = "middle";
            this.emoji_ctx.textAlign = "center";
            this.emoji_ctx.fillText(
                String.fromCodePoint(this.emoji_list[0], 0xfe0f),
                0.5 * this.box_width + this.horizontal_offset,
                0.5 * this.box_height + this.vertical_offset
            );
        }
    }

    compare() {
        let total = 0;
        const box_image_data = this.box_ctx.getImageData(0, 0, this.box_width, this.box_height).data;
        const emoji_image_data = this.emoji_ctx.getImageData(0, 0, this.box_width, this.box_height).data;
        for (let py = 0; py < this.box_height; py++) {
            for (let px = 0; px < this.box_width; px++) {
                const i = 4 * (py * this.box_width + px);
                const b_red = box_image_data[i];
                const b_green = box_image_data[i + 1];
                const b_blue = box_image_data[i + 2];
                const e_red = emoji_image_data[i];
                const e_green = emoji_image_data[i + 1];
                const e_blue = emoji_image_data[i + 2];

                const d2 = (e_red - b_red)**2 + (e_green - b_green)**2 + (e_blue - b_blue)**2;
                total += d2 < 1200 ? 0 : d2 < 10000 ? 1 : d2 < 40000 ? 2 : 3;
            }
        }
        return total;
    }

    step() {
        if (this.state == 1) {
            const score = this.compare();
            if (score < this.running_best_score) {
                this.running_best_score = score;
                this.best_emojis[this.running_y][this.running_x] = this.emoji_list[this.running_emoji_index];
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
                this.box_ctx.putImageData(
                    this.image_data, 
                    -this.running_x * this.box_width,
                    -this.running_y * this.box_height
                );
                this.running_best_score = Infinity;
            }

            this.emoji_ctx.fillStyle = "#FFFFFF";
            this.emoji_ctx.fillRect(0, 0, this.box_width, this.box_height);
            this.emoji_ctx.font = `${this.font_size}px monospace`;
            this.emoji_ctx.textBaseline = "middle";
            this.emoji_ctx.textAlign = "center";
            this.emoji_ctx.fillText(
                String.fromCodePoint(this.emoji_list[this.running_emoji_index], 0xfe0f),
                0.5 * this.box_width + this.horizontal_offset,
                0.5 * this.box_height + this.vertical_offset
            );
        }
    }
}

const preview_app = new EmojiPreviewApp(ctx, emoji_ctx, box_ctx, 25, 25, 20, 0, 0);

const pixel_count_target = 250000;

function resize_and_apply_image(image) {
    const orig_pixels = image.width * image.height;
    const scaling_factor = Math.sqrt(pixel_count_target / orig_pixels);
    const new_width = Math.floor(image.width * scaling_factor);
    const new_height = Math.floor(image.height * scaling_factor);

    canvas.width = new_width;
    canvas.height = new_height;

    const temp_canvas = new OffscreenCanvas(new_width, new_height);
    const temp_ctx = temp_canvas.getContext("2d");
    temp_ctx.drawImage(image, 0, 0, new_width, new_height);
    preview_app.set_image_data(temp_ctx.getImageData(0, 0, new_width, new_height));
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

set_image_from_path("../imagesorter/images/zooper_dooper.jpg");
preview_app.draw();

const box_size_text = document.getElementById("box_size_text");
document.getElementById("box_size").addEventListener("input", function (e) {
    const v = parseInt(e.target.value);
    box_size_text.textContent = v;
    preview_app.set_box_dimensions(v, v);
});
const font_size_text = document.getElementById("font_size_text");
document.getElementById("font_size").addEventListener("input", function (e) {
    const v = parseInt(e.target.value);
    font_size_text.textContent = v;
    preview_app.set_font_size(v);
});
const horizontal_offset_text = document.getElementById("horizontal_offset_text");
document.getElementById("horizontal_offset").addEventListener("input", function (e) {
    const v = parseInt(e.target.value);
    horizontal_offset_text.textContent = v;
    preview_app.set_horizontal_offset(v);
});
const vertical_offset_text = document.getElementById("vertical_offset_text");
document.getElementById("vertical_offset").addEventListener("input", function (e) {
    const v = parseInt(e.target.value);
    vertical_offset_text.textContent = v;
    preview_app.set_vertical_offset(v);
});
const emoji_opacity_text = document.getElementById("emoji_opacity_text");
document.getElementById("emoji_opacity").addEventListener("input", function (e) {
    const v = parseInt(e.target.value);
    emoji_opacity_text.textContent = v;
    preview_app.set_emoji_opacity(v / 100);
});

document.getElementById("go_button").addEventListener("click", function (e) {
    preview_app.state = 1;
});

function animate() {
    if (preview_app.state == 1) {
        for (let i = 0; i < 12; i++) {
            preview_app.step();
        }
        preview_app.draw();
    }

    requestAnimationFrame(animate);
}

animate();