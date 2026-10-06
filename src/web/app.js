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
};

function route(pathname) {
  if (pathname === "/list") return { name: "list" };
  const ticket = /^\/tickets\/([^/]+)$/.exec(pathname);
  if (ticket !== null) return { name: "ticket", id: decodeURIComponent(ticket[1]) };
  return { name: "columns" };
}

async function render() {
  const current = route(location.pathname);
  for (const link of document.querySelectorAll("[data-route]")) {
    const here = link.dataset.route === current.name;
    if (here) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  }
  const view = VIEWS[current.name] ?? VIEWS.columns;
  const main = document.getElementById("view");
  try {
    main.replaceChildren(await view(current));
  } catch (error) {
    main.replaceChildren(h("p", { class: "error" }, error.message));
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
  if (url.origin !== location.origin) return;
  event.preventDefault();
  navigate(url.pathname + url.search);
});

window.addEventListener("popstate", () => render());

render();
