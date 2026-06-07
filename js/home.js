const hi_div = document.getElementById("hi_container");
const hi = document.getElementById("hi");

let hi_font_size = 0;
let hi_height = 0;
function set_size() {
    const hi_width = hi_div.offsetWidth;
    hi_height = hi_div.offsetHeight;
    hi_font_size = Math.min(hi_height, hi_width * 0.8);
    hi.style.fontSize = `${hi_font_size}px`;
    hi.style.lineHeight = `${hi_height}px`
}

window.addEventListener("resize", set_size, false);
set_size();
let hi_offset_y = -1 * hi_height;
hi.style.transform = `translateY(${hi_offset_y}px)`;

hi.innerHTML = "Hi";

const rule = document.getElementById("center_rule");
hi_div.addEventListener("click", function (e) {
    rule.scrollIntoView({
        behavior: "smooth"
    })
});

// let prev_scroll_y = window.scrollY;
// window.addEventListener('scroll', function (e) {
//     const scroll_y = window.scrollY;
//     const delta_y = scroll_y - prev_scroll_y;
//     prev_scroll_y = scroll_y;
//     if (delta_y > 20) {
//         hi_offset_y -= delta_y - 20;
//     }
// });

// let prev_scroll_y_1 = window.scrollY;
// let prev_scroll_y_2 = window.scrollY;
// window.addEventListener('scroll', function (e) {
//     const scroll_y = window.scrollY;
//     prev_scroll_y_2 = prev_scroll_y_1;
//     prev_scroll_y_1 = scroll_y;
//     const delta_y = prev_scroll_y_1 - prev_scroll_y_2;
//     if (scroll_y == 0 && delta_y < 0) {
//         hi_offset_y = Math.min(-1, hi_offset_y);
//         hi_vy = delta_y / 2;
//     }
// });

let shake = 0;
let hi_vy = 0;
function animate() {
    if (hi_offset_y < 0) {
        shake = 0;
        hi_vy += 0.5;
        hi_offset_y += hi_vy;
        if (hi_offset_y < 0) {
            hi.style.transform = `translateY(${hi_offset_y}px)`;
        } else {
            hi.style.transform = "";
            hi_offset_y = 0;
            shake = Math.sqrt(hi_vy / 2);
            hi_vy = 0;
        }
    } else {
        if (shake > 0.01) {
            hi.style.transform = `translateX(${(Math.random() - 0.5) * shake * 2}px)`;
            shake *= 0.9;
        } else {
            hi.style.transform = "";
        }
    }

    requestAnimationFrame(animate);
}

animate();