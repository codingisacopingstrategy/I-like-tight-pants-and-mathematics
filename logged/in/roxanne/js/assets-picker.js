(function () {
    const toolbar = document.getElementById("squire-toolbar");
    if (!toolbar || typeof ActiveEditor === "undefined") return;
    let open = false;
    let path = "called";
    let filterTimer = 0;
    const entriesByPath = {};

    const picker = document.createElement("div");
    picker.id = "asset-picker";
    picker.className = "asset-picker";
    picker.hidden = true;
    picker.innerHTML =
        '<div class="asset-picker-head">' +
        '<button type="button" data-up title="Up">↑</button>' +
        '<span class="asset-picker-path"></span>' +
        '<input type="search" class="asset-picker-filter" placeholder="Filter" autocomplete="off">' +
        '<button type="button" data-close title="Close">×</button>' +
        "</div>" +
        '<div class="asset-picker-grid"></div>';
    document.body.appendChild(picker);

    function place() {
        const rect = toolbar.getBoundingClientRect();
        picker.style.left = Math.max(8, rect.left) + "px";
        picker.style.width = Math.max(280, rect.width) + "px";
        picker.style.top = rect.bottom + 4 + "px";
    }

    const pathLabel = picker.querySelector(".asset-picker-path");
    const filterInput = picker.querySelector(".asset-picker-filter");
    const grid = picker.querySelector(".asset-picker-grid");
    const upButton = picker.querySelector("[data-up]");

    window.assetPickerOpen = function () {
        return open;
    };

    function close() {
        open = false;
        picker.hidden = true;
        if (ActiveEditor.root) ActiveEditor.root.focus();
    }

    function showStatus(text) {
        grid.innerHTML = '<div class="asset-picker-status"></div>';
        grid.firstChild.textContent = text;
    }

    function itemButton(item) {
        entriesByPath[item.path] = item;
        const button = document.createElement("div");
        button.className = "asset-picker-item";
        button.dataset.type = item.type;
        button.dataset.path = item.path || "";
        const thumb = document.createElement("div");
        thumb.className = "asset-picker-thumb";
        if (item.type === "dir") {
            thumb.textContent = "📁";
        } else {
            const img = document.createElement("img");
            img.alt = "";
            img.loading = "lazy";
            img.src = item.thumb;
            thumb.appendChild(img);
        }
        const name = document.createElement("span");
        name.className = "asset-picker-name";
        name.textContent = item.name;
        name.title = item.name;
        button.appendChild(thumb);
        button.appendChild(name);
        return button;
    }

    function render(payload) {
        path = payload.path || "";
        pathLabel.textContent = path ? "assets/" + path : "assets";
        upButton.disabled = payload.parent === null;
        upButton.dataset.parent = payload.parent === null ? "" : payload.parent;
        Object.keys(entriesByPath).forEach(function (key) {
            delete entriesByPath[key];
        });
        grid.innerHTML = "";
        const visible = payload.entries.filter(function (item) {
            return item.type === "dir" || item.kind === "image";
        });
        if (!visible.length) {
            showStatus("Nothing here");
            return;
        }
        visible.forEach(function (item) {
            grid.appendChild(itemButton(item));
        });
    }

    function load(nextPath) {
        const query = filterInput.value.trim();
        const params = new URLSearchParams();
        params.set("path", nextPath);
        if (query) params.set("q", query);
        showStatus("Loading…");
        fetch("/or/assets/?" + params.toString(), { credentials: "same-origin" })
            .then(function (response) {
                if (!response.ok) throw new Error(response.statusText);
                return response.json();
            })
            .then(render)
            .catch(function () {
                showStatus("Could not list this folder");
            });
    }

    function insert(item) {
        if (!item || item.kind !== "image" || !item.url) return;
        if (!ActiveEditor.squire) return;
        const attrs = { alt: item.name };
        if (item.width) attrs.width = String(item.width);
        if (item.height) attrs.height = String(item.height);
        ActiveEditor.squire.insertImage(item.url, attrs);
        ActiveEditor.save();
        close();
    }

    picker.addEventListener("mousedown", function (event) {
        event.stopPropagation();
    });

    upButton.addEventListener("click", function () {
        if (upButton.disabled) return;
        filterInput.value = "";
        load(upButton.dataset.parent);
    });

    picker.querySelector("[data-close]").addEventListener("click", close);

    filterInput.addEventListener("input", function () {
        clearTimeout(filterTimer);
        filterTimer = setTimeout(function () {
            load(path);
        }, 150);
    });

    grid.addEventListener("click", function (event) {
        const button = event.target.closest(".asset-picker-item");
        if (!button) return;
        const item = entriesByPath[button.dataset.path];
        if (!item) return;
        if (item.type === "dir") {
            filterInput.value = "";
            load(item.path);
            return;
        }
        insert(item);
    });

    window.addEventListener("resize", function () {
        if (open) place();
    });

    window.openAssetPicker = function () {
        open = true;
        picker.hidden = false;
        place();
        filterInput.value = "";
        load("called");
        filterInput.focus();
    };
})();
