// The page behind `moth open`. Read-only: it fetches what the CLI prints with
// --json and lays it out. Every value from a ticket reaches the DOM as text
// through h(), never as markup; the one exception is a body, which the server
// renders with raw HTML disabled.

/** Builds an element. Strings among the children become text nodes. */
function h(tag, attributes = {}, ...children) {
  const element = document.createElement(tag);
  for (const [name, value] of Object.entries(attributes)) {
    if (value === undefined || value === null || value === false) continue;
    if (name.startsWith("on")) element.addEventListener(name.slice(2), value);
    else element.setAttribute(name, value === true ? "" : String(value));
  }
  for (const child of children.flat(Infinity)) {
    if (child === undefined || child === null || child === false) continue;
    element.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return element;
}

/** A GET against the server, as parsed JSON. A failure carries moth's own sentence. */
async function api(path) {
  const response = await fetch(path, { headers: { accept: "application/json" } });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error ?? `request failed: ${response.status}`);
  return body;
}

function ticketLink(ticket) {
  return h("a", { href: `/tickets/${ticket.id}` }, ticket.title);
}

function priorityBadge(priority) {
  return h("span", { class: `priority priority-${priority}` }, priority);
}

function labelList(labels) {
  return labels.map((label) => h("span", { class: "label" }, label));
}

/** Categories in which a ticket is finished with, as moth defines them. */
const TERMINAL = ["completed", "canceled", "duplicate"];

/**
 * Everything a view needs about the whole store, fetched together. Which
 * tickets are blocked comes from `moth list --blocked`, not from logic of the
 * page's own, so a card can never disagree with the CLI about it.
 */
async function loadStore() {
  const [schema, tickets, blocked] = await Promise.all([
    api("/api/schema"),
    api("/api/tickets"),
    api("/api/tickets?blocked"),
  ]);
  const byId = new Map(tickets.map((ticket) => [ticket.id, ticket]));
  const categoryOf = (status) => schema.statuses.find((entry) => entry.name === status)?.category;
  const finished = (ticket) => TERMINAL.includes(categoryOf(ticket.status));
  return {
    schema,
    tickets,
    byId,
    categoryOf,
    finished,
    blocked: new Set(blocked.map((ticket) => ticket.id)),
    /** Blockers still open; a blocker naming no ticket is a check problem, not a block. */
    openBlockers: (ticket) =>
      (ticket.blocked_by ?? [])
        .map((id) => byId.get(id))
        .filter((blocker) => blocker !== undefined && !finished(blocker)),
    childrenOf: (ticket) => tickets.filter((candidate) => candidate.parent === ticket.id),
  };
}

/** Statuses in config order, then any a ticket uses that config no longer declares. */
function statusOrder(store) {
  const declared = store.schema.statuses.map((entry) => entry.name);
  const extra = [...new Set(store.tickets.map((ticket) => ticket.status))].filter(
    (status) => !declared.includes(status),
  );
  return [...declared, ...extra];
}

function blockedMarker(store, ticket) {
  if (!store.blocked.has(ticket.id)) return null;
  const blockers = store.openBlockers(ticket);
  const names = blockers.map((blocker) => `${blocker.id} ${blocker.title}`).join("\n");
  return h("span", { class: "blocked", title: `Blocked by:\n${names}` }, "blocked");
}

function progress(store, ticket) {
  const children = store.childrenOf(ticket);
  if (children.length === 0) return null;
  const done = children.filter(store.finished).length;
  const fill = h("span");
  // Through the CSSOM: the content security policy refuses style attributes.
  fill.style.width = `${(100 * done) / children.length}%`;
  return h(
    "span",
    { class: "progress", title: `${done} of ${children.length} sub-tickets finished` },
    h("span", { class: "bar" }, fill),
    `${done}/${children.length}`,
  );
}

function card(store, ticket) {
  return h(
    "article",
    { class: store.blocked.has(ticket.id) ? "card is-blocked" : "card" },
    h("div", { class: "card-title" }, ticketLink(ticket)),
    h(
      "div",
      { class: "card-meta" },
      h("span", { class: "id" }, ticket.id),
      priorityBadge(ticket.priority),
      blockedMarker(store, ticket),
      progress(store, ticket),
    ),
    ticket.labels.length > 0 ? h("div", { class: "card-labels" }, labelList(ticket.labels)) : null,
  );
}

/**
 * Finished columns the reader has opened. Held for the life of the page, so a
 * live update redraws them as they were left rather than collapsing them.
 */
const expanded = new Set();

function column(store, status) {
  const category = store.categoryOf(status);
  const tickets = store.tickets.filter((ticket) => ticket.status === status);
  const collapsible = TERMINAL.includes(category);
  const open = !collapsible || expanded.has(status);
  const toggle = () => {
    if (expanded.has(status)) expanded.delete(status);
    else expanded.add(status);
    render();
  };
  return h(
    "section",
    { class: open ? "column" : "column is-collapsed", "data-category": category ?? "unknown" },
    h(
      "header",
      { class: "column-head" },
      h("span", { class: "column-name" }, status),
      h("span", { class: "column-count" }, tickets.length),
      h("span", { class: "column-category" }, category ?? "not in config"),
      collapsible
        ? h(
            "button",
            { class: "column-toggle", type: "button", onclick: toggle, "aria-expanded": open },
            open ? "hide" : "show",
          )
        : null,
    ),
    open
      ? h(
          "div",
          { class: "column-cards" },
          tickets.length === 0 ? h("p", { class: "empty" }, "None") : null,
          tickets.map((ticket) => card(store, ticket)),
        )
      : null,
  );
}

/** A ticket as a small inline reference: status, id and title, linked. */
function ticketRef(store, id) {
  const ticket = store.byId.get(id);
  if (ticket === undefined) {
    return h(
      "span",
      { class: "ref is-missing" },
      h("span", { class: "id" }, id),
      " not in this store",
    );
  }
  return h(
    "span",
    { class: store.finished(ticket) ? "ref is-finished" : "ref" },
    h("span", { class: "status-pill" }, ticket.status),
    h("span", { class: "id" }, ticket.id),
    ticketLink(ticket),
  );
}

/** Sub-tickets to any depth. `seen` stops a hand-made cycle from recursing forever. */
function subTree(store, ticket, seen = new Set([ticket.id])) {
  const children = store.childrenOf(ticket).filter((child) => !seen.has(child.id));
  if (children.length === 0) return null;
  return h(
    "ul",
    { class: "tree" },
    children.map((child) => {
      seen.add(child.id);
      return h("li", {}, ticketRef(store, child.id), subTree(store, child, seen));
    }),
  );
}

/** Outermost ancestor first. A parent that is missing still shows, as its id. */
function ancestry(store, ticket) {
  const chain = [];
  const seen = new Set([ticket.id]);
  let parent = ticket.parent;
  while (parent !== undefined && !seen.has(parent)) {
    seen.add(parent);
    chain.unshift(parent);
    parent = store.byId.get(parent)?.parent;
  }
  return chain;
}

/** A command the reader can copy, since the page itself changes nothing. */
function command(text) {
  const code = h("code", {}, text);
  const button = h("button", { type: "button", class: "copy" }, "copy");
  button.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(code.textContent);
      button.textContent = "copied";
    } catch {
      button.textContent = "select it instead";
    }
    setTimeout(() => {
      button.textContent = "copy";
    }, 1500);
  });
  return h("div", { class: "command" }, code, button);
}

function moveCommand(store, ticket) {
  const others = store.schema.statuses.filter((entry) => entry.name !== ticket.status);
  if (others.length === 0) return null;
  const line = command(`moth move ${ticket.id} ${others[0].name}`);
  const select = h(
    "select",
    { "aria-label": "Status to move to" },
    others.map((entry) => h("option", { value: entry.name }, entry.name)),
  );
  select.addEventListener("change", () => {
    line.querySelector("code").textContent = `moth move ${ticket.id} ${select.value}`;
  });
  return h("div", { class: "move" }, line, select);
}

/** Fields the header and sections already show, so the table lists the rest. */
const SHOWN_ELSEWHERE = [
  "id",
  "title",
  "status",
  "priority",
  "labels",
  "parent",
  "blocked_by",
  "body",
];

function fieldTable(shown) {
  const rows = Object.entries(shown)
    .filter(([name]) => !SHOWN_ELSEWHERE.includes(name))
    .map(([name, value]) =>
      h(
        "tr",
        {},
        h("th", {}, name),
        h("td", {}, Array.isArray(value) ? value.join(", ") : String(value)),
      ),
    );
  return h("table", { class: "fields" }, h("tbody", {}, rows));
}

async function ticketView(current) {
  const [store, shown] = await Promise.all([
    loadStore(),
    api(`/api/tickets/${encodeURIComponent(current.id)}`),
  ]);
  const ticket = store.byId.get(shown.id) ?? shown;
  const response = await fetch(`/api/tickets/${encodeURIComponent(shown.id)}/body`);
  const body = h("div", { class: "body" });
  // The one place markup is trusted: the server renders it with raw HTML
  // disabled, and the content security policy forbids any script within it.
  body.innerHTML = await response.text();

  const blockedBy = shown.blocked_by ?? [];
  const blocking = store.tickets.filter((other) => (other.blocked_by ?? []).includes(shown.id));
  const category = store.categoryOf(shown.status);
  const crumbs = ancestry(store, shown);
  const tree = subTree(store, ticket);

  document.title = `${shown.title} · moth`;
  return h(
    "article",
    { class: "ticket" },
    crumbs.length > 0
      ? h(
          "nav",
          { class: "crumbs", "aria-label": "Parents" },
          crumbs.map((id) => {
            const parent = store.byId.get(id);
            return h(
              "span",
              {},
              parent === undefined ? h("span", { class: "id" }, id) : ticketLink(parent),
              h("span", { class: "sep" }, "›"),
            );
          }),
        )
      : null,
    h("h1", {}, shown.title),
    h(
      "div",
      { class: "ticket-meta" },
      h("span", { class: "id" }, shown.id),
      h("span", { class: "status-pill" }, shown.status),
      h("span", { class: "muted" }, category ?? "not in config"),
      priorityBadge(shown.priority),
      store.blocked.has(shown.id) ? h("span", { class: "blocked" }, "blocked") : null,
      labelList(shown.labels),
    ),
    h(
      "div",
      { class: "ticket-grid" },
      h(
        "div",
        { class: "ticket-main" },
        shown.body.trim() === "" ? h("p", { class: "empty" }, "No description.") : body,
        tree === null
          ? null
          : h("section", {}, h("h2", {}, "Sub-tickets ", progress(store, ticket)), tree),
      ),
      h(
        "aside",
        { class: "ticket-side" },
        h(
          "section",
          {},
          h("h2", {}, "Blocked by"),
          blockedBy.length === 0
            ? h("p", { class: "empty" }, "Nothing")
            : h(
                "ul",
                { class: "refs" },
                blockedBy.map((id) => h("li", {}, ticketRef(store, id))),
              ),
        ),
        h(
          "section",
          {},
          h("h2", {}, "Blocks"),
          blocking.length === 0
            ? h("p", { class: "empty" }, "Nothing")
            : h(
                "ul",
                { class: "refs" },
                blocking.map((other) => h("li", {}, ticketRef(store, other.id))),
              ),
        ),
        h("section", {}, h("h2", {}, "Fields"), fieldTable(shown)),
        h(
          "section",
          {},
          h("h2", {}, "Commands"),
          moveCommand(store, shown),
          command(`moth show ${shown.id}`),
          command(`moth edit ${shown.id} --body-file -`),
        ),
      ),
    ),
  );
}

/** Filters that take several values, each shown as a group of checkboxes. */
function choiceGroup(legend, name, options, chosen, hint) {
  return h(
    "fieldset",
    { class: "choices" },
    h("legend", {}, legend, hint ? h("span", { class: "hint" }, hint) : null),
    options.length === 0 ? h("span", { class: "empty" }, "none yet") : null,
    options.map((option) =>
      h(
        "label",
        {},
        h("input", {
          type: "checkbox",
          name,
          value: option,
          checked: chosen.includes(option),
        }),
        option,
      ),
    ),
  );
}

/**
 * The query string as the form writes it. Each checked box is its own
 * parameter, as a repeated flag would be, so `?status=todo&status=done` is
 * `moth list --status todo --status done`.
 */
function formQuery(form) {
  const params = new URLSearchParams();
  for (const [name, value] of new FormData(form)) {
    if (name === "blocking") {
      if (value !== "") params.append(value, "");
      continue;
    }
    if (typeof value === "string" && value.trim() !== "") params.append(name, value.trim());
  }
  return params.toString().replace(/=(?=&|$)/g, "");
}

function listTable(store, tickets) {
  if (tickets.length === 0) return h("p", { class: "empty" }, "No tickets match those filters.");
  return h(
    "table",
    { class: "list" },
    h(
      "thead",
      {},
      h(
        "tr",
        {},
        ["Id", "Title", "Status", "Priority", "Labels", "Parent", ""].map((name) =>
          h("th", {}, name),
        ),
      ),
    ),
    h(
      "tbody",
      {},
      tickets.map((ticket) => {
        const parent = ticket.parent === undefined ? undefined : store.byId.get(ticket.parent);
        return h(
          "tr",
          {},
          h("td", { class: "id" }, ticket.id),
          h("td", {}, ticketLink(ticket)),
          h("td", {}, h("span", { class: "status-pill" }, ticket.status)),
          h("td", {}, priorityBadge(ticket.priority)),
          h("td", { class: "labels" }, labelList(ticket.labels)),
          h(
            "td",
            { class: "parent" },
            ticket.parent === undefined
              ? null
              : parent === undefined
                ? ticket.parent
                : ticketLink(parent),
          ),
          h("td", {}, blockedMarker(store, ticket)),
        );
      }),
    ),
  );
}

async function listView() {
  const params = new URLSearchParams(location.search);
  const store = await loadStore();
  const results = h("div", { class: "results" });

  const fill = async (query) => {
    try {
      const tickets = await api(`/api/tickets${query === "" ? "" : `?${query}`}`);
      results.replaceChildren(
        h("p", { class: "count" }, `${tickets.length} of ${store.tickets.length} tickets`),
        listTable(store, tickets),
      );
    } catch (error) {
      results.replaceChildren(h("p", { class: "error" }, error.message));
    }
  };

  const labels = [...new Set(store.tickets.flatMap((ticket) => ticket.labels))].sort();
  const parents = store.tickets.filter((ticket) => store.childrenOf(ticket).length > 0);
  const chosenParent = params.get("parent") ?? "";
  const blocking = params.has("blocked") ? "blocked" : params.has("unblocked") ? "unblocked" : "";

  const form = h(
    "form",
    { class: "filters", role: "search" },
    h(
      "label",
      { class: "search" },
      h("span", {}, "Search"),
      h("input", {
        id: "filter-search",
        type: "search",
        name: "search",
        value: params.get("search") ?? "",
        placeholder: "Title or body",
      }),
    ),
    choiceGroup(
      "Status",
      "status",
      store.schema.statuses.map((entry) => entry.name),
      params.getAll("status"),
    ),
    choiceGroup("Category", "category", store.schema.categories, params.getAll("category")),
    choiceGroup(
      "Priority",
      "priority",
      [...store.schema.priorities].reverse(),
      params.getAll("priority"),
    ),
    choiceGroup("Labels", "label", labels, params.getAll("label"), "has all of"),
    h(
      "label",
      { class: "select" },
      h("span", {}, "Parent"),
      h(
        "select",
        { name: "parent" },
        h("option", { value: "", selected: chosenParent === "" }, "any"),
        h("option", { value: "none", selected: chosenParent === "none" }, "none (top level)"),
        parents.map((parent) =>
          h(
            "option",
            { value: parent.id, selected: chosenParent === parent.id },
            `${parent.id} ${parent.title}`,
          ),
        ),
      ),
    ),
    h(
      "fieldset",
      { class: "choices" },
      h("legend", {}, "Blocked"),
      [
        ["", "any"],
        ["blocked", "blocked"],
        ["unblocked", "unblocked"],
      ].map(([value, text]) =>
        h(
          "label",
          {},
          h("input", { type: "radio", name: "blocking", value, checked: blocking === value }),
          text,
        ),
      ),
    ),
    h("a", { class: "clear", href: "/list" }, "Clear filters"),
  );

  let typing;
  const update = () => {
    const query = formQuery(form);
    history.replaceState(null, "", query === "" ? "/list" : `/list?${query}`);
    fill(query);
  };
  form.addEventListener("change", update);
  form.addEventListener("submit", (event) => event.preventDefault());
  form.addEventListener("input", (event) => {
    if (event.target.name !== "search") return;
    clearTimeout(typing);
    typing = setTimeout(update, 200);
  });

  await fill(location.search.slice(1));
  return h("div", { class: "list-view" }, form, results);
}

/** The views, by route name. Each returns the nodes to show. */
const VIEWS = {
  async columns() {
    const store = await loadStore();
    if (store.tickets.length === 0) {
      return h("p", { class: "empty" }, 'No tickets yet. Create one with moth new "a title".');
    }
    return h(
      "div",
      { class: "columns" },
      statusOrder(store).map((status) => column(store, status)),
    );
  },
  ticket: ticketView,
  list: listView,
};

/** The routes this page draws; the server answers each with the same document. */
const PAGES = [/^\/$/, /^\/list$/, /^\/tickets\/[^/]+$/];

function route(pathname) {
  if (pathname === "/list") return { name: "list" };
  const ticket = /^\/tickets\/([^/]+)$/.exec(pathname);
  if (ticket !== null) return { name: "ticket", id: decodeURIComponent(ticket[1]) };
  return { name: "columns" };
}

/**
 * What `moth check` would report, above every view. Each finding is check's own
 * sentence, which names the command that repairs it.
 */
async function renderProblems() {
  const banner = document.getElementById("problems");
  let problems;
  try {
    ({ problems } = await api("/api/check"));
  } catch {
    return;
  }
  if (problems.length === 0) {
    banner.replaceChildren();
    return;
  }
  const wasOpen = banner.querySelector("details")?.open ?? false;
  const count = `${problems.length} problem${problems.length === 1 ? "" : "s"}`;
  banner.replaceChildren(
    h(
      "details",
      { class: "problems", open: wasOpen },
      h("summary", {}, `moth check found ${count} with the tickets on disk`),
      h(
        "ul",
        {},
        problems.map((problem) => h("li", {}, problem)),
      ),
    ),
  );
}

/** Counts redraws, so a slow one cannot land on top of a newer one. */
let drawn = 0;

async function render() {
  const generation = ++drawn;
  renderProblems();
  const current = route(location.pathname);
  for (const link of document.querySelectorAll("[data-route]")) {
    const here = link.dataset.route === current.name;
    if (here) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  }
  document.title = "moth";
  const view = VIEWS[current.name] ?? VIEWS.columns;
  const main = document.getElementById("view");
  // A redraw replaces every element, so whatever had focus, such as the search
  // box mid-word, is found again by id and given its caret back.
  const focused = document.activeElement?.id || null;
  const caret = document.activeElement?.selectionStart ?? null;
  let nodes;
  try {
    nodes = await view(current);
  } catch (error) {
    nodes = h("p", { class: "error" }, error.message);
  }
  if (generation !== drawn) return;
  // Where the reader was, page and columns both, so a redraw does not move them.
  const scrollY = window.scrollY;
  const scrollX = main.querySelector(".columns")?.scrollLeft ?? 0;
  main.replaceChildren(nodes);
  const columns = main.querySelector(".columns");
  if (columns !== null) columns.scrollLeft = scrollX;
  window.scrollTo(0, scrollY);
  const refocus = focused === null ? null : document.getElementById(focused);
  if (refocus !== null) {
    refocus.focus();
    if (caret !== null) refocus.setSelectionRange?.(caret, caret);
  }
}

/** Follows links within the page without reloading it. */
function navigate(href) {
  history.pushState(null, "", href);
  render();
  window.scrollTo(0, 0);
}

document.addEventListener("click", (event) => {
  const link = event.target.closest("a[href]");
  if (link === null || event.defaultPrevented || event.button !== 0) return;
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  const url = new URL(link.href);
  // Only the page's own routes; a body's relative link to a repo file is left
  // to the server, which says it has no such page.
  if (url.origin !== location.origin || !PAGES.some((page) => page.test(url.pathname))) return;
  event.preventDefault();
  navigate(url.pathname + url.search);
});

window.addEventListener("popstate", () => render());

/**
 * Redraws whenever the server says the store changed on disk, whoever changed
 * it. The browser reconnects by itself when the server goes away; the first
 * connection after that redraws too, to catch up on anything missed.
 */
function listen() {
  const status = document.getElementById("live");
  const events = new EventSource("/api/events");
  let lost = false;
  events.addEventListener("open", () => {
    status.textContent = "live";
    status.className = "live";
    if (lost) render();
    lost = false;
  });
  events.addEventListener("change", () => render());
  events.addEventListener("error", () => {
    lost = true;
    status.textContent = "disconnected, reconnecting…";
    status.className = "live is-lost";
  });
}

listen();

render();
