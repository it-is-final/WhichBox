const MASK = 0x0003FFFF;
const MAX_ASLR = 124;
const ASLR_MASK = ~3;

const SLOT_SIZE = 80;
const BOX_SIZE = SLOT_SIZE * 30;

const START_DATA = {
    "Emerald": {start: "0x02029808", has_aslr: true},
    "FRLG": {start: "0x02029314", has_aslr: true},
    "RS": {start: "0x020300A0", has_aslr: false}
};

let current_info_containers_bg = new Map();


function validTheme(theme) {
    return theme == "light" || theme == "dark";
}


function manualThemeUpdates(dark_mode) {
    let element = document.getElementById("theme-switch");
    if(element)
        element.checked = dark_mode;
    element = document.getElementById("msg-container");
    if(current_info_containers_bg.has("") && element) {
        let bg = current_info_containers_bg.get("");
        element.classList.remove(bg);
        if(dark_mode)
            bg = bg.replaceAll("-subtle", "");
        else
            bg += "-subtle";
        current_info_containers_bg.set("", bg);
        element.classList.add(bg);
    }
    element = document.getElementById("inverse-msg-container");
    if(current_info_containers_bg.has("inverse-") && element) {
        let bg = current_info_containers_bg.get("inverse-");
        element.classList.remove(bg);
        if(dark_mode)
            bg = bg.replaceAll("-subtle", "");
        else
            bg += "-subtle";
        current_info_containers_bg.set("inverse-", bg);
        element.classList.add(bg);
    }
}


function loadTheme(theme) {
    if(!validTheme(theme))
        return;
    setStoredTheme(theme);
    document.documentElement.setAttribute("data-bs-theme", theme);
    manualThemeUpdates(theme == "dark");
}


function getStoredTheme() {
    return localStorage.getItem("theme");
}


function setStoredTheme(theme) {
    localStorage.setItem("theme", theme);
}


function loadDefaultTheme() {
    let theme = getStoredTheme();
    if(theme == null)
        theme = window.matchMedia("(prefers-color-scheme: dark)").matches? "dark": "light";
    loadTheme(theme);
}


loadDefaultTheme();


function formatToHex(num, digits, prefix) {
    prefix = prefix?? "";
    digits = digits?? 0;
    return prefix + num.toString(16).toUpperCase().padStart(digits, "0");
}


function selectStart(type, selector_prefix) {
    if(type in START_DATA) {
        selector_prefix = selector_prefix?? "";
        const data = START_DATA[type];
        document.getElementById(selector_prefix + "start-input").value = data.start;
        document.getElementById(selector_prefix + "off-block").hidden = !data.has_aslr;
        if(data.has_aslr) {
            let value = parseInt(data.start);
            if(isNaN(value))
                return;
            let o = parseInt(document.getElementById(selector_prefix + "aslr-offset").value);
            if(!isNaN(o))
                value += o;
            document.getElementById(selector_prefix + "gpksptr-input").value = formatToHex(value, 8, "0x");
        }
    }
}


function displayMsg(msg, bg, selector_prefix) {
    selector_prefix = selector_prefix?? "";
    document.getElementById(selector_prefix + "msg-text").innerHTML = msg;
    bg = "bg-" + (bg?? "secondary");
    let element = document.getElementById(selector_prefix + "msg-container");
    if(current_info_containers_bg.has(selector_prefix))
        element.classList.remove(current_info_containers_bg.get(selector_prefix));
    current_info_containers_bg.set(selector_prefix, bg);
    element.classList.add(bg);
    element.hidden = false;
}


function changeFullRange(value, selector_prefix) {
    selector_prefix = selector_prefix?? "";
    document.getElementById(selector_prefix + "full-range-check").checked = value;
    document.getElementById(selector_prefix + "aslr-offset").disabled = value;
    document.getElementById(selector_prefix + "gpksptr-input").disabled = value;
    document.getElementById(selector_prefix + "update-aslr-btn").disabled = value;
}

function updateASLROffset(selector_prefix) {
    selector_prefix = selector_prefix?? "";
    let s = parseInt(document.getElementById(selector_prefix + "start-input").value);
    if(isNaN(s))
        return;
    let p = parseInt(document.getElementById(selector_prefix + "gpksptr-input").value);
    if(isNaN(p))
        return;
    document.getElementById(selector_prefix + "aslr-offset").value = ((p - s) & ASLR_MASK) % 128;
}


function whichbox(offset) {
    box = Math.floor(offset / 2400) + 1;
    offset %= 2400;
    slot = Math.floor(offset / 80) + 1;
    offset %= 80;
    return "Box " + box + " - Slot " + slot + " (+" + formatToHex(offset, 2, "0x") + ")";
}


function whichaddr(start, box, slot) {
    return formatToHex(start + 4 + (box - 1) * BOX_SIZE + (slot - 1) * SLOT_SIZE, 8, "0x");
}


function submitCalculate(event) {
    event.preventDefault();
    const error_bg = getStoredTheme() == "dark"? "danger": "danger-subtle";
    let data = new FormData(event.target);
    let s = parseInt(data.get("start"));
    if(isNaN(s)) {
        displayMsg("Invalid start value", error_bg);
        return;
    }
    let o = parseInt(data.get("offset"));
    if(isNaN(o)) {
        displayMsg("Invalid address value", error_bg);
        return;
    }
    o &= MASK;
    s &= MASK;
    let result;
    if(data.get("game") == "RS") {
        result = whichbox(o - s - 4);
    } else {
        if(data.get("full-range")) {
            result = "From " + whichbox(o - s - MAX_ASLR - 4) + " to " + whichbox(o - s - 4);
        } else {
            let d = parseInt(data.get("aslr-offset"));
            if(isNaN(d)) {
                displayMsg("Invalid ASLR Offset value", error_bg);
                return;
            }
            result = whichbox(o - s - d - 4);
        }
    }
    document.getElementById("msg-container").hidden = true;
    document.getElementById("result-container").innerHTML = result;
}


function submitInverseCalculate(event) {
    event.preventDefault();
    const error_bg = getStoredTheme() == "dark"? "danger": "danger-subtle";
    let data = new FormData(event.target);
    let s = parseInt(data.get("inverse-start"));
    if(isNaN(s)) {
        displayMsg("Invalid start value", error_bg, "inverse-");
        return;
    }
    let b = parseInt(data.get("inverse-box"));
    if(isNaN(b)) {
        displayMsg("Invalid start value", error_bg, "inverse-");
        return;
    }
    let o = parseInt(data.get("inverse-slot"));
    if(isNaN(o)) {
        displayMsg("Invalid aslr offset value", error_bg, "inverse-");
        return;
    }
    let result;
    if(data.get("inverse-game") == "RS") {
        result = whichaddr(s, b, o);
    } else {
        if(data.get("inverse-full-range")) {
            result = whichaddr(s, b, o) + " - " + whichaddr(s + MAX_ASLR, b, o);
        } else {
            let d = parseInt(data.get("inverse-aslr-offset"));
            if(isNaN(d)) {
                displayMsg("Invalid ASLR Offset value", error_bg, "inverse-");
                return;
            }
            result = whichaddr(s + d, b, o);
        }
    }
    document.getElementById("inverse-msg-container").hidden = true;
    document.getElementById("inverse-result-container").innerHTML = result;
}



document.addEventListener("DOMContentLoaded", () => {
    loadDefaultTheme();
    document.getElementById("msg-container").hidden = true;
    document.getElementById("inverse-msg-container").hidden = true;
});
