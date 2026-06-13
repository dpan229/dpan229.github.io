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

hi.innerHTML = "Hi";

const rule = document.getElementById("center_rule");
hi_div.addEventListener("click", function (e) {
    rule.scrollIntoView({
        behavior: "smooth"
    })
});