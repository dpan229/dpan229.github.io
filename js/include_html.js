// Pull html from a file named `html_path` and put it
// inside an element with the id `element_id`
async function include_html(element_id, html_path) {
    const response = await fetch(html_path);
    if (!response.ok) {
        throw new Error(`include_html: error fetching ${html_path}`);
    }
    const elem = document.getElementById(element_id);
    if (elem === null) {
        throw new Error(`include_html: no element with id "${element_id}"`);
    }
    elem.innerHTML = await response.text();
}

// put common header in element with id `header_placeholder`
document.addEventListener("DOMContentLoaded", () => {
    include_html("header_placeholder", "/common_html/header.html");
});