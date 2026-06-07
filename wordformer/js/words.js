const canvas = document.getElementById("mainCanvas");
const ctx = canvas.getContext("2d");

// keep track of mouse position on the canvas and whether mouse is up or down
let mouse_down = false;
canvas.addEventListener("mousedown", () => mouse_down = true);
canvas.addEventListener("mouseup", () => mouse_down = false);

let mouse_x = 0;
let mouse_y = 0;
canvas.addEventListener("mousemove", function(e) {
    const rect = canvas.getBoundingClientRect();
    mouse_x = e.clientX - rect.left;
    mouse_y = e.clientY - rect.top;
});

function word_radius(word) {
    return 10 * Math.sqrt(word.length);
}

// assign colors to each letter
letter_colors = new Map();
for (i = 0; i < 26; i++) {
    const letter = "abcdefghijklmnopqrstuvwxyz"[i];
    const segment = Math.floor(i / 9);
    const part = i % 9;
    switch (segment) {
        case 0:
            letter_colors.set(letter, {
                r: 102 + Math.floor(153 * (1 - part / 9)),
                g: 102 + Math.floor(153 * part / 9),
                b: 102
            });
            break;
        case 1:
            letter_colors.set(letter, {
                r: 102,
                g: 102 + Math.floor(153 * (1 - part / 9)),
                b: 102 + Math.floor(153 * part / 9)
            });
            break;
        default:
            letter_colors.set(letter, {
                r: 102 + Math.floor(153 * part / 9),
                g: 102,
                b: 102 + Math.floor(153 * (1 - part / 9))
            });
    }
}

/**
 * Returns the color of the given word, obtained by taking
 * the average of the colors of its letters
 * @param {string} word 
 * @returns An object with integer r, g, and b attributes
 */
function get_color(word) {
    let r = 0;
    let g = 0;
    let b = 0;
    for (i = 0; i < word.length; i++) {
        letter_color = letter_colors.get(word[i]);
        r += letter_color.r;
        g += letter_color.g;
        b += letter_color.b;
    }
    return {
        r: Math.floor(r / word.length),
        g: Math.floor(g / word.length),
        b: Math.floor(b / word.length)
    };
}

/**
 * Takes an object with r, g, and b attributes and returns
 * a css color string like `rgb(0, 0, 0)`
 * @param {object} c 
 * @returns 
 */
function color_string(c) {
    return `rgb(${c.r}, ${c.g}, ${c.b})`;
}

/**
 * Returns a copy of the string s with its characters sorted
 * @param {string} s 
 * @returns 
 */
function sort_string(s) {
    let arr = s.split("");
    arr.sort();
    return arr.join("");
}

function shuffle_string(s) {
    let arr = s.split("");

    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }

    return arr.join("");
}

function squarify(s) {
    const q = Math.floor(Math.sqrt(s.length));
    const rows = [];
    for (i = 0; i < s.length; i += q) {
        rows.push(s.slice(i, Math.min(i + q, s.length)));
    }
    return rows.join("\n");
}

/**
 * Object that takes a list of valid words and allows efficiently
 * determining if a word exists with a given set of letters
 */
class WordSet {
    constructor(words=[]) {
        this.mapping = new Map();
        words.forEach(word => this.add_word(word));
    }

    add_word(word) {
        const k = sort_string(word);
        if (this.mapping.has(k)) {
            this.mapping.get(k).push(word);
        } else {
            this.mapping.set(k, [word]);
        }
    }

    async load_file(filename) {
        const response = await fetch(filename);
        console.log(response);
        if (!response.ok) {
            throw new Error(`Error loading word file: ${response.status}`)
        }
        const data = await response.text();
        const words = data.split(/\r?\n/);
        words.forEach(word => this.add_word(word));
    }

    combination_present(word1, word2) {
        return this.mapping.has(sort_string(word1 + word2));
    }

    random_anagram(word) {
        const k = sort_string(word);
        if (this.mapping.has(k)) {
            const comb = this.mapping.get(k);
            return comb[Math.floor(Math.random() * comb.length)];
        } else {
            return null;
        }
    }

    combine(word1, word2) {
        return this.random_anagram(word1 + word2);
    }
}

/**
 * Object representing a single word on the field
 */
class WordObj {
    constructor(x, y, word, color, vx=0.0, vy=0.0, stable=true) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.word = word;
        this.mass = word.length;
        this.radius = word_radius(word);
        this.color = color;
        this.stable = stable;
    }

    ctx_draw(ctx) {
        // Draw circle
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, 2 * Math.PI);
        ctx.fillStyle = this.color;
        ctx.fill();

        // draw outline
        if (!this.stable) {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, 2 * Math.PI);
            ctx.strokeStyle = "black";
            ctx.lineWidth = 1;
            ctx.stroke();
        }

        // Draw text
        ctx.font = "12px monospace";
        ctx.fillStyle = "black";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        if (this.stable) {
            ctx.fillText(this.word, this.x, this.y);
        } else {
            ctx.fillText(this.word, this.x + Math.random() * 4 - 2, this.y + Math.random() * 4 - 2);
        }
    }
}

function move_to_contact(obj1, obj2) {
    const dx = obj2.x - obj1.x;
    const dy = obj2.y - obj1.y;
    const d2 = dx**2 + dy**2;
    const d = Math.sqrt(d2);

}

/**
 * Main field object
 */
class WordWorld {
    constructor(width, height, word_set) {
        this.width = width;
        this.height = height;
        this.word_set = word_set;

        this.words = [];
        this.decay_chance = 0.1;
        this.show_connections = false;
    }

    add_word(word, stable=true, x=null, y=null, color=null) {
        const radius = word_radius(word);

        if (x === null || y === null) {
            for (let tries = 0; tries < 100; tries++) {
                x = radius + Math.random() * (this.width - 2 * radius);
                y = radius + Math.random() * (this.height - 2 * radius);
                let no_collision = true;
                for (let obj of this.words) {
                    if ((x - obj.x)**2 + (y - obj.y)**2 < (obj.radius + radius)**2) {
                        no_collision = false;
                        break;
                    }
                }
                if (no_collision) {
                    break;
                }
            }
        }
        
        this.words.push(new WordObj(
            x ?? radius + Math.random() * (this.width - 2 * radius),
            y ?? radius + Math.random() * (this.height - 2 * radius),
            word,
            color ?? (stable ? color_string(get_color(word)) : "white"),
            0.0, 0.0,
            stable
        ));

        if (stable && word.length > 1) {
            log_word(word);
        }

        return this.words[this.words.length - 1];
    }

    delete_object(i) {
        this.words = this.words.slice(0, i).concat(this.words.slice(i + 1));
    }

    reset() {
        this.words = [];
    }

    physics(step) {
        // if mouse down, move closest object towards mouse
        if (mouse_down && this.words.length) {
            let closest = 0;
            let closest_distance = Infinity;
            for (let i = 0; i < this.words.length; i++) {
                const d2 = (mouse_x - this.words[i].x)**2 + (mouse_y - this.words[i].y)**2
                if (d2 < closest_distance) {
                    closest_distance = d2;
                    closest = i;
                }
            }
            const closest_obj = this.words[closest];
            closest_obj.vx = 0.2 * (mouse_x - closest_obj.x);
            closest_obj.vy = 0.2 * (mouse_y - closest_obj.y);
        }

        // decompose unstable objects
        const frame_decay_chance = 1 - (1 - this.decay_chance)**step;
        const to_decay = [];
        for (let i = 0; i < this.words.length; i++) {
            if (!this.words[i].stable) {
                const word = this.words[i].word;
                if (Math.random() < frame_decay_chance) {
                    // either split off 1 letter or split in half
                    // 50% for each
                    if (Math.random() < 0.5) {
                        const ci = Math.floor(Math.random() * word.length);
                        const c = word[ci];
                        const left = word.slice(0, ci) + word.slice(ci + 1);
                        // console.log(`Splitting ${c} ${left}`);
                        const left_word = this.word_set.random_anagram(left);
                        if (left_word !== null) {
                            to_decay.push([i, left_word, c, true, true]);
                        } else {
                            to_decay.push([i, left, c, false, true]);
                        }
                    } else {
                        const chars1 = [];
                        const chars2 = [];
                        for (let c of word) {
                            if (Math.random() < 0.5) {
                                chars1.push(c);
                            } else {
                                chars2.push(c);
                            }
                        }
                        if (chars1.length > 0 && chars2.length > 0) {
                            // console.log(`Attempting split ${chars1} ${chars2}`);
                            const word1 = this.word_set.random_anagram(chars1.join(""));
                            const word2 = this.word_set.random_anagram(chars2.join(""));
                            const stable1 = word1 !== null;
                            const stable2 = word2 !== null;
                            const string1 = stable1 ? word1 : sort_string(chars1.join(""));
                            const string2 = stable2 ? word2 : sort_string(chars2.join(""));
                            to_decay.push([i, string1, string2, stable1, stable2]);
                        }
                    }
                }
            }
        }
        for (let k = to_decay.length - 1; k >= 0; k--) {
            const i = to_decay[k][0];
            const word1 = to_decay[k][1];
            const word2 = to_decay[k][2];
            const stable1 = to_decay[k][3];
            const stable2 = to_decay[k][4];

            const x0 = this.words[i].x;
            const y0 = this.words[i].y;
            const vx0 = this.words[i].vx;
            const vy0 = this.words[i].vy;
            this.delete_object(i);

            const obj1 = this.add_word(word1, stable1);
            const obj2 = this.add_word(word2, stable2);
            const d1 = (obj1.radius + obj2.radius) * obj2.mass / (obj1.mass + obj2.mass) + 1;
            const d2 = (obj1.radius + obj2.radius) * obj1.mass / (obj1.mass + obj2.mass) + 1;
            const angle = Math.random() * 2 * Math.PI;
            obj1.x = x0 + Math.cos(angle) * d1;
            obj1.y = y0 + Math.sin(angle) * d1;
            obj2.x = x0 - Math.cos(angle) * d2;
            obj2.y = y0 - Math.sin(angle) * d2;
            obj1.vx = vx0 + 5 * Math.cos(angle) / obj1.mass;
            obj1.vy = vy0 + 5 * Math.sin(angle) / obj1.mass;
            obj2.vx = vx0 - 5 * Math.cos(angle) / obj2.mass;
            obj2.vy = vy0 - 5 * Math.sin(angle) / obj2.mass;
        }

        // for each pair of objects
        const to_combine = [];
        for (let i = 0; i < this.words.length; i++) {
            const obj1 = this.words[i];
            for (let j = i + 1; j < this.words.length; j++) {
                const obj2 = this.words[j];
                const dx = obj2.x - obj1.x;
                const dy = obj2.y - obj1.y;
                const d2 = dx * dx + dy * dy;
                const d = Math.sqrt(d2);

                if (d < obj1.radius + obj2.radius) {
                    // objects colliding
                    to_combine.push([i, j]);
                } else {
                    // apply force
                    const attract = this.word_set.combination_present(obj1.word, obj2.word);
                    const f = attract ? 400.0 : -15.0;
                    obj1.vx += f * obj2.mass * step * dx / d2 / d;
                    obj1.vy += f * obj2.mass * step * dy / d2 / d;
                    obj2.vx -= f * obj1.mass * step * dx / d2 / d;
                    obj2.vy -= f * obj1.mass * step * dy / d2 / d;
                }
            }
        }
        // handle detected collisions
        for (let k = 0; k < to_combine.length; k++) {
            const i = to_combine[k][0];
            const j = to_combine[k][1];
            const obj1 = this.words[i];
            const obj2 = this.words[j];
            if (this.word_set.combination_present(obj1.word, obj2.word)) {
                // new stable word
                const new_word = this.word_set.combine(obj1.word, obj2.word);
                log_word(new_word);
                this.words.push(new WordObj(
                    (obj1.x * obj1.mass + obj2.x * obj2.mass) / (obj1.mass + obj2.mass),
                    (obj1.y * obj1.mass + obj2.y * obj2.mass) / (obj1.mass + obj2.mass),
                    new_word,
                    color_string(get_color(new_word)),
                    (obj1.vx * obj1.mass + obj2.vx * obj2.mass) / (obj1.mass + obj2.mass),
                    (obj1.vy * obj1.mass + obj2.vy * obj2.mass) / (obj1.mass + obj2.mass)
                ));
            } else {
                // new unstable word
                this.words.push(new WordObj(
                    (obj1.x * obj1.mass + obj2.x * obj2.mass) / (obj1.mass + obj2.mass),
                    (obj1.y * obj1.mass + obj2.y * obj2.mass) / (obj1.mass + obj2.mass),
                    sort_string(obj1.word + obj2.word),
                    "white",
                    (obj1.vx * obj1.mass + obj2.vx * obj2.mass) / (obj1.mass + obj2.mass),
                    (obj1.vy * obj1.mass + obj2.vy * obj2.mass) / (obj1.mass + obj2.mass),
                    false
                ));
            }
            // delete colliding words
            this.words.splice(j, 1);
            this.words.splice(i, 1);
            // fix indices for other to_combines
            for (let k2 = k + 1; k2 < to_combine.length;) {
                const i2 = to_combine[k2][0];
                const j2 = to_combine[k2][1];
                if (i == i2 || i == j2 || j == i2 || j == j2) {
                    to_combine.splice(k2, 1);
                } else {
                    to_combine[k2][0] = i2 - (i2 > i) - (i2 > j);
                    to_combine[k2][1] = j2 - (j2 > i) - (j2 > j);
                    k2++;
                }
            }
        }

        // for each object
        const damping = 0.98**step;
        for (const obj of this.words) {
            // move object
            obj.x += step * obj.vx;
            obj.y += step * obj.vy;
            obj.vx *= damping;
            obj.vy *= damping;

            // bounce off walls
            if (obj.x < obj.radius) {
                obj.x = obj.radius;
                obj.vx *= -1;
            } else if (obj.x > this.width - obj.radius) {
                obj.x = this.width - obj.radius;
                obj.vx *= -1;
            }
            if (obj.y < obj.radius) {
                obj.y = obj.radius;
                obj.vy *= -1;
            } else if (obj.y > this.height - obj.radius) {
                obj.y = this.height - obj.radius;
                obj.vy *= -1;
            }
        }
    }

    ctx_draw(ctx) {
        if (this.show_connections) {
            for (let i1 = 0; i1 < this.words.length; i1++) {
                const obj1 = this.words[i1];
                for (let i2 = i1 + 1; i2 < this.words.length; i2++) {
                    const obj2 = this.words[i2];
                    if (this.word_set.combination_present(obj1.word, obj2.word)) {
                        ctx.beginPath();
                        ctx.moveTo(obj1.x, obj1.y);
                        ctx.lineTo(obj2.x, obj2.y);
                        ctx.stroke();
                    }
                }
            }
        }
        for (const obj of this.words) {
            obj.ctx_draw(ctx);
        }
    }
}

// load the word set
const word_set = new WordSet();
word_set.load_file("files/words_alpha.txt");

// initialize the world object
const world = new WordWorld(600, 600, word_set);

// set up simulation speed slider
const speed_slider = document.getElementById("speed_slider");
const speed_label = document.getElementById("speed_label");
let step = 1.0;
speed_slider.oninput = function() {
    step = 2**(this.value / 10);
    speed_label.innerHTML = `${step.toFixed(2)}x`;
};

// set up decay chance slider
const decay_slider = document.getElementById("decay_slider");
const decay_label = document.getElementById("decay_prob");
decay_slider.oninput = function() {
    const chance = 10**(this.value / 10);
    world.decay_chance = chance;
    decay_label.innerHTML = `${(100 * chance).toFixed(2)}%`;
};

// set up valid pairs checkbox
const connections_checkbox = document.getElementById("show_connections");
connections_checkbox.addEventListener("change", function() {
    world.show_connections = this.checked;
});

// set up pause button
const pause_button = document.getElementById("playPause");
let playing = true;
pause_button.addEventListener("click", function (e) {
    playing = !playing;
    if (playing) {
        pause_button.innerHTML = "Pause";
    } else {
        pause_button.innerHTML = "Play";
    }
});

// set up reset button
const reset_button = document.getElementById("reset");
reset_button.addEventListener("click", function (e) {
    world.reset();
    word_list.clear();
    word_list_div.innerHTML = "";
    word_count_span.innerHTML = "0";
});

// set up keyboard functionality
document.addEventListener("keydown", function (e) {
    const k = e.key;
    if ("a" <= k && k <= "z") {
        world.add_word(k);
    }
});

// set up letter buttons
function make_letter_button(letter) {
    const new_button = document.createElement("button");
    new_button.appendChild(document.createTextNode(letter));
    new_button.classList.add("letter_button");
    new_button.addEventListener("click", function (e) {
        world.add_word(letter);
    });
    new_button.style.color = color_string(get_color(letter));
    return new_button;
}
const button_div_1 = document.getElementById("button_column_1");
for (const letter of "abcdefghijklm") {
    button_div_1.appendChild(make_letter_button(letter));
}
const button_div_2 = document.getElementById("button_column_2");
for (const letter of "nopqrstuvwxyz") {
    button_div_2.appendChild(make_letter_button(letter));
}

// set up list of formed words
const word_list_div = document.getElementById("wordList");
const word_count_span = document.getElementById("wordCount");
const word_list = new Map();
function log_word(word) {
    const word_len = word.length;
    if (!word_list.has(word_len)) {
        word_list.set(word_len, new Set());
    }
    if (!word_list.get(word_len).has(word)) {
        word_list.get(word_len).add(word);
        let total = 0;
        let h = "";
        const sorted_entries = [...word_list.entries()].sort((a, b) => b[0] - a[0]);
        for (const [len, words] of sorted_entries) {
            const sorted_words = [...words].sort();
            total += sorted_words.length;
            h += `<h2>${len} letters (${sorted_words.length})</h2><ul class="wordListUl">`;
            for (const w of sorted_words) {
                h += `<li><span style="color: ${color_string(get_color(w))}">${w}</span></li>`;
            }
            h += "</ul>";
        }
        word_list_div.innerHTML = h;
        word_count_span.innerHTML = total;
    }
}

function animate() {
    if (playing) {
        world.physics(step);
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    world.ctx_draw(ctx);

    requestAnimationFrame(animate);
}

animate();