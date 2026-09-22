const canvas = document.getElementById("unix_time_canvas");
const ctx = canvas.getContext("2d");

/**
 * Performs a binary search of the `key_func`-sorted array `arr`, returning
 * the index of the largest element of the array for which `key_func`
 * applied to the element is less than or equal to `value`, or 0 if all 
 * elements are greater. 
 * `key_func` is not applied to `value`.
 * @param {Array} arr 
 * @param {*} value 
 * @param {* => *} key_func 
 * @returns {Number} array index
 */
function binary_search(arr, value, key_func=(a => a)) {
    let low = 0;
    let high = arr.length;
    while (low < high) {
        const mid = Math.floor((low + high) / 2);
        if (key_func(arr[mid]) < value) {
            low = mid + 1;
        } else {
            high = mid;
        }
    }
    return low;
}

function date_from_base_36(base36) {
    return new Date(1000 * parseInt(base36, 36));
}

function date_from_word_hex(word) {
    word = word.toUpperCase()
               .replaceAll("O", "0")
               .replaceAll("I", "1")
               .replaceAll("L", "1")
               .replaceAll("S", "5")
               .replaceAll("T", "7")
               .replaceAll("G", "9");

    // don't allow leading 0
    if (word[0] === "0") {
        return null;
    }

    // if word contains any letters from G to Z, return null
    for (let char = "G".codePointAt(0); char <= "Z".codePointAt(0); char++) {
        if (word.indexOf(String.fromCodePoint(char)) != -1) {
            return null;
        }
    } 

    const d = new Date(1000 * parseInt(word, 16));

    if (isNaN(d.getTime())) {
        // time will be nan if word is too long 
        // (date past end of range)
        return null;
    } else {
        return d;
    }
}

class TimelineApp {
    constructor(width, height) {
        this.width = width;
        this.height = height;
        this.center = 0;
        this.max_scale = 0.02;
        this.scale = 1.5e-5;
        this.min_scale = 5e-9;

        this.target_center = 0;
        this.target_scale = this.scale;

        this.live = true;

        this.marks = [];

        this.utc = false;
        this.large_format = new Intl.DateTimeFormat([], {
            month: "short",
            day: "numeric",
            year: "numeric",
            hour: "numeric",
            minute: "numeric",
            second: "numeric",
            timeZoneName: "short"
        });
        this.large_format_utc = new Intl.DateTimeFormat([], {
            month: "short",
            day: "numeric",
            year: "numeric",
            hour: "numeric",
            minute: "numeric",
            second: "numeric",
            timeZoneName: "short",
            timeZone: "UTC"
        });
        this.day_format = new Intl.DateTimeFormat([], {
            day: "numeric"
        });
        this.month_format = new Intl.DateTimeFormat([], {
            month: "long"
        });
        this.year_format = new Intl.DateTimeFormat([], {
            year: "numeric"
        });
        this.day_format_utc = new Intl.DateTimeFormat([], {
            day: "numeric",
            timeZone: "UTC"
        });
        this.month_format_utc = new Intl.DateTimeFormat([], {
            month: "long",
            timeZone: "UTC"
        });
        this.year_format_utc = new Intl.DateTimeFormat([], {
            year: "numeric",
            timeZone: "UTC"
        });

        this.update();
    }

    snap_center(i) {
        this.center = Math.min(1000 * 2**31 - 1, Math.max(0, i));
        this.target_center = this.center;
    }

    slide_center(i) {
        this.target_center = Math.min(1000 * 2**31 - 1, Math.max(0, i));
    }

    snap_scale(s) {
        this.scale = Math.min(this.max_scale, Math.max(this.min_scale, s));
        this.target_scale = this.scale;
    }

    slide_scale(s) {
        this.target_scale = Math.min(this.max_scale, Math.max(this.min_scale, s));
    }

    get_screen_x(i) {
        return (i - this.center) * this.scale + this.width / 2;
    }

    get_timestamp(screen_x) {
        return (screen_x - this.width / 2) / this.scale + this.center;
    }

    add_mark(date, label) {
        const index = binary_search(this.marks, date, mark => mark.date);
        this.marks.splice(index, 0, { date: date, label: label });
    }

    get_marks_in_range(low_date, high_date) {
        const low_index = binary_search(this.marks, low_date, mark => mark.date);
        const high_index = binary_search(this.marks, high_date, mark => mark.date);
        return this.marks.slice(low_index, high_index);
    }

    get_next_mark(date) {
        if (this.marks.length == 0) {
            return null;
        } else if (date >= this.marks.at(-1).date) {
            return null;
        } else {
            let i = binary_search(this.marks, date, mark => mark.date);
            while (this.marks[i].date <= date) {
                i++;
            }
            return this.marks[i];
        }
    }

    get_previous_mark(date) {
        if (this.marks.length == 0) {
            return null;
        } else if (date <= this.marks[0].date) {
            return null;
        } else {
            let i = binary_search(this.marks, date, mark => mark.date);
            while (this.marks[i].date >= date) {
                i--;
            }
            return this.marks[i];
        }
    }

    update() {
        if (this.live) {
            // snap to current time
            this.snap_center(Date.now());
        } else {
            // update view parameters
            this.scale = 1 / (1/this.scale + 0.05 * (1/this.target_scale - 1/this.scale));
            if (Math.abs(this.target_center - this.center) < 50) {
                this.center = this.target_center;
            } else {
                this.center += 0.15 * (this.target_center - this.center);
            }
        }
    }

    get_seconds(date) {
        return this.utc ? date.getUTCSeconds() : date.getSeconds();
    }
    get_minutes(date) {
        return this.utc ? date.getUTCMinutes() : date.getMinutes();
    }
    get_hours(date) {
        return this.utc ? date.getUTCHours() : date.getHours();
    }
    get_date(date) {
        return this.utc ? date.getUTCDate() : date.getDate();
    }
    get_month(date) {
        return this.utc ? date.getUTCMonth() : date.getMonth();
    }
    get_year(date) {
        return this.utc ? date.getUTCFullYear() : date.getFullYear();
    }
    set_seconds(date, ...args) {
        return this.utc ? date.setUTCSeconds(...args) : date.setSeconds(...args);
    }
    set_minutes(date, ...args) {
        return this.utc ? date.setUTCMinutes(...args) : date.setMinutes(...args);
    }
    set_hours(date, ...args) {
        return this.utc ? date.setUTCHours(...args) : date.setHours(...args);
    }
    set_date(date, ...args) {
        return this.utc ? date.setUTCDate(...args) : date.setDate(...args);
    }
    set_month(date, ...args) {
        return this.utc ? date.setUTCMonth(...args) : date.setMonth(...args);
    }
    set_year(date, ...args) {
        return this.utc ? date.setUTCFullYear(...args) : date.setFullYear(...args);
    }

    get_time_label(date) {
        const hours = this.get_hours(date);
        const minutes = this.get_minutes(date);
        const seconds = this.get_seconds(date);
        if (seconds == 0) {
            return `${hours}:${minutes.toString().padStart(2, "0")}`;
        } else {
            return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
        }
    }
    get_day_label(date) {
        return this.utc ? this.day_format_utc.format(date) : this.day_format.format(date);
    }
    get_month_label(date) {
        return this.utc ? this.month_format_utc.format(date) : this.month_format.format(date);
    }
    get_year_label(date) {
        return this.utc ? this.year_format_utc.format(date) : this.year_format.format(date);
    }
    get_large_label(date) {
        return this.utc ? this.large_format_utc.format(date) : this.large_format.format(date);
    }

    draw(ctx) {
        // draw vertical center line
        ctx.strokeStyle = "#888888";
        ctx.beginPath();
        ctx.moveTo(this.width / 2, this.height - 80);
        ctx.lineTo(this.width / 2, 135);
        ctx.stroke();

        // draw arrowhead
        // ctx.beginPath();
        // ctx.moveTo(this.width / 2 - 6, this.height - 88);
        // ctx.lineTo(this.width / 2, this.height - 80);
        // ctx.lineTo(this.width / 2 + 6, this.height - 88);
        // ctx.stroke();

        // draw horizontal baseline
        ctx.strokeStyle = "#000000";
        ctx.beginPath();
        ctx.moveTo(0, this.height - 80);
        ctx.lineTo(this.width, this.height - 80);
        ctx.stroke();

        // draw top text
        ctx.fillStyle = "#000000";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.font = "24px monospace";
        const time_int = Math.floor(this.center / 1000);
        const center_date = new Date(this.center);
        ctx.fillText(
            this.get_large_label(center_date),
            this.width / 2, 20
        );
        ctx.fillText(time_int, this.width / 2, 60);
        ctx.fillText(time_int.toString(16).toUpperCase(), this.width / 2, 90);
        ctx.fillText(time_int.toString(36).toUpperCase(), this.width / 2, 120);
        ctx.font = "12px monospace";
        ctx.fillText("Unix time in:", this.width / 2, 36);
        ctx.fillText("DECIMAL", this.width / 2, 46);
        ctx.fillText("HEX", this.width / 2, 76);
        ctx.fillText("BASE 36", this.width / 2, 106);
        if (this.live) {
            ctx.fillStyle = "red";
            ctx.fillText("LIVE", this.width / 2, 6);
        }

        // draw previous and next words
        // const [last_mark, next_mark] = this.get_surrounding_marks(center_date);
        // if (last_mark !== null) {
        //     ctx.font = "24px monospace";
        //     ctx.textAlign = "left";
        //     ctx.fillText(last_mark.label, 0, 20);
        // }
        // if (next_mark !== null) {
        //     ctx.font = "24px monospace";
        //     ctx.textAlign = "right";
        //     ctx.fillText(next_mark.label, this.width, 20);
        // }

        // draw marks
        const base_time = new Date(this.get_timestamp(0));
        const right_time = this.get_timestamp(this.width);
        ctx.strokeStyle = "#000000";
        ctx.fillStyle = "#000000";
        ctx.textBaseline = "bottom";
        ctx.font = "18px monospace";
        const max_height = Math.floor((2 * this.height / 3 - 135) / 14) - 1;
        const heights = Array(max_height).fill(0); // minimum allowed next x position for each height
        for (const mark of this.get_marks_in_range(base_time, right_time)) {
            const x = this.get_screen_x(mark.date);

            // draw vertical line
            ctx.beginPath();
            ctx.moveTo(x, this.height - 80);
            ctx.lineTo(x, 2 * this.height / 3);
            ctx.stroke();

            // draw text
            for (let i = 0; i < max_height; i++) {
                if (heights[i] <= x) {
                    ctx.fillText(mark.label, x, 2 * this.height / 3 - 14 * i);
                    heights[i] = x + 10 * mark.label.length + 5;
                    break;
                }
            }
        }
        
        // draw NOW marker
        ctx.strokeStyle = "red";
        ctx.fillStyle = "red"
        const x = this.get_screen_x(Date.now());
        ctx.beginPath();
        ctx.moveTo(x, this.height - 80);
        ctx.lineTo(x, this.height - 150);
        ctx.stroke();

        ctx.fillRect(x - 20, this.height - 170, 40, 20);

        ctx.fillStyle = "white";
        ctx.fillText("NOW", x, this.height - 150);

        // draw bottom rows of ticks for times and dates
        const opacities = [1, 1, 1, 1];
        const rows = [];
        
        // possible labelled time tick intervals in milliseconds:
        // 10 sec, 30 sec, 1 min, 5 min, 10 min, 30 min, 1 hr
        const second_intervals = [
            10_000, 30_000, 60_000, 300_000, 
            600_000, 1_800_000, 3_600_000
        ];
        const ticks = [];
        // labelled time ticks
        for (const interval of second_intervals) {
            if (this.scale >= 50 / interval) {
                for (
                    let tick_time = base_time - (base_time % interval); 
                    tick_time <= right_time; 
                    tick_time += interval
                ) {
                    const x = this.get_screen_x(tick_time);
                    ticks.push([x, this.get_time_label(new Date(tick_time))]);
                }
                break;
            }
        }
        // unlabelled hour ticks
        if (this.scale < 50 / 3_600_000 && this.scale >= 5 / 3_600_000) {
            for (
                let tick_time = base_time - (base_time % 3_600_000); 
                tick_time <= right_time; 
                tick_time += 3_600_000
            ) {
                const x = this.get_screen_x(tick_time);
                ticks.push([x, ""]);
            }
            const a = Math.log(50 / 3_600_000);
            const b = Math.log(5 / 3_600_000);
            opacities[0] = (Math.log(this.scale) - b) / (a - b);
        }
        rows.push(ticks.slice());

        // add day ticks
        this.set_hours(base_time, 0, 0, 0, 0);
        ticks.length = 0;
        if (this.scale >= 5 / 86_400_000) {
            const use_labels = this.scale >= 20 / 86_400_000;
            const day = this.get_date(base_time);
            for (let i = 0;; i++) {
                const day_time = new Date(base_time);
                this.set_date(day_time, day + i);
                if (day_time > right_time) {
                    break;
                }

                const x = this.get_screen_x(day_time);
                ticks.push([
                    x, use_labels ? this.get_day_label(day_time) : ""
                ]);
            }
            if (!use_labels) {
                const a = Math.log(20 / 86_400_000);
                const b = Math.log(5 / 86_400_000);
                opacities[1] = (Math.log(this.scale) - b) / (a - b);
            }
        }
        rows.push(ticks.slice());

        // add month ticks
        this.set_date(base_time, 1);
        ticks.length = 0;
        if (this.scale >= 5 / 86_400_000 / 25) {
            const use_labels = this.scale >= 50 / 86_400_000 / 25;
            const month = this.get_month(base_time);
            for (let i = 0;; i++) {
                const month_time = new Date(base_time);
                this.set_month(month_time, month + i);
                if (month_time > right_time) {
                    break;
                }

                const x = this.get_screen_x(month_time);
                ticks.push([
                    x, use_labels ? this.get_month_label(month_time) : ""
                ]);
            }
            if (!use_labels) {
                const a = Math.log(50 / 86_400_000 / 25);
                const b = Math.log(5 / 86_400_000 / 25);
                opacities[2] = (Math.log(this.scale) - b) / (a - b);
            }
        }
        rows.push(ticks.slice());

        // add year ticks
        this.set_month(base_time, 0);
        ticks.length = 0;
        if (this.scale >= 50 / 86_400_000 / 360) {
            const year = this.get_year(base_time);
            for (let i = 0;; i++) {
                const year_time = new Date(base_time);
                this.set_year(year_time, year + i);
                if (year_time > right_time) {
                    break;
                }

                const x = this.get_screen_x(year_time);
                ticks.push([
                    x, this.get_year_label(year_time)
                ]);
            }
        }
        rows.push(ticks.slice());

        // draw bottom rows of ticks
        ctx.textBaseline = "middle";
        let i = 0;
        const tick_colors = ["red", "brown", "green", "blue"];
        const label_funcs = [
            "get_time_label", 
            "get_day_label",
            "get_month_label",
            "get_year_label"
        ];
        for (const row of rows) {
            if (row.length > 0) {
                ctx.globalAlpha = opacities[i];
                ctx.textAlign = "left";
                ctx.font = "12px monospace";
                ctx.strokeStyle = tick_colors[i];
                ctx.fillStyle = tick_colors[i];
                let center_clearance = Infinity;
                for (const [x, label] of row) {
                    center_clearance = Math.min(Math.abs(x - this.width / 2), center_clearance);
                    ctx.beginPath();
                    ctx.moveTo(x, this.height - 80);
                    ctx.lineTo(x, this.height - 60 + 20 * i);
                    ctx.stroke();
                    ctx.fillText(label, x + 2, this.height - 65 + 20 * i);
                }

                const center_opacity = Math.min(1, center_clearance / 100 - 1);
                if (center_opacity > 0) {
                    ctx.globalAlpha = center_opacity;
                    ctx.textAlign = "center";
                    ctx.font = "14px monospace";
                    ctx.fillText(this[label_funcs[i]](center_date), this.width / 2, this.height - 67 + 20 * i);
                }
            }
            i++;
        }
        ctx.globalAlpha = 1;
    }
}

// load word file and add marks to the timeline
async function load_file(filename) {
    const response = await fetch(filename);
    console.log(response);
    if (!response.ok) {
        throw new Error(`Error loading word file: ${response.status}`)
    }
    const data = await response.text();
    const words = data.split(/\r?\n/);
    words.forEach(function (word) {
        if (word.length < 1) {
            return;
        }
        // base 36
        if (word.length <= 6) {
            app.add_mark(date_from_base_36(word), word.toUpperCase());
        }
        // hex
        // const d = date_from_word_hex(word);
        // if (d !== null) {
        //     app.add_mark(d, word.toUpperCase());
        // }
    });
}

const app = new TimelineApp(1000, 500);
load_file("../wordformer/files/words_alpha.txt");

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
    return;
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
                app.snap_center(app.center - (x - last_x) / app.scale);
                app.live = false;
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
                app.snap_center(app.center + (secondary_props.x - app.width / 2) * (1/app.scale - 1/new_scale));
                app.snap_scale(new_scale);
                app.live = false;
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
    app.snap_center(app.center + e.deltaX / app.scale);

    const props = get_wheel_pointer_props();
    if (props !== null) {
        // move to keep mouse x at same position after zoom
        app.snap_center(app.center + (props.x - app.width / 2) * (1 / old_scale - 1 / app.target_scale));

        if (!app.selection_held) {
            set_selection_from_pointer(props.x, props.y);
        }
    }
});

// set up live button
document.getElementById("live_button").addEventListener("click", e => {
    app.live = true;
});

document.getElementById("prev_button").addEventListener("click", e => {
    app.live = false;
    prev_mark = app.get_previous_mark(app.target_center);
    if (prev_mark !== null) {
        app.slide_center(prev_mark.date);
    }
});

document.getElementById("next_button").addEventListener("click", e => {
    app.live = false;
    next_mark = app.get_next_mark(app.target_center);
    if (next_mark !== null) {
        app.slide_center(next_mark.date);
    }
});

for (radio of document.querySelectorAll('input[name="timezone"]')) {
    radio.addEventListener("change", e => {
        switch (e.target.value) {
            case "local":
                app.utc = false;
                break;
            case "utc":
                app.utc = true;
                break;
            default:
                break;
        }
    });
}

// set up responsive canvas sizing
let canvas_width = 0;
let canvas_height = 0;
function set_canvas_size() {
    canvas_width = 0.8 * window.innerWidth;
    canvas_height = 0.8 * window.innerHeight;
    canvas.width = canvas_width;
    canvas.height = canvas_height;
    app.width = canvas_width;
    app.height = canvas_height;
}

window.addEventListener("resize", set_canvas_size, false);
set_canvas_size();

function animate() {
    ctx.clearRect(0, 0, canvas_width, canvas_height);
    app.update();
    app.draw(ctx);

    requestAnimationFrame(animate);
}

animate();