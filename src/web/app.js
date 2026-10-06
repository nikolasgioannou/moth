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

/** The views, by route name. Each returns the nodes to show. */
const VIEWS = {
  async columns() {
    const tickets = await api("/api/tickets");
    if (tickets.length === 0) {
      return h("p", { class: "empty" }, 'No tickets yet. Create one with moth new "a title".');
    }
    return h(
      "ul",
      {},
      tickets.map((ticket) =>
        h("li", {}, h("span", { class: "id" }, ticket.id), " ", ticketLink(ticket)),
      ),
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
