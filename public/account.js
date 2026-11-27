import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const SUPABASE_URL = "https://darvkreybhvlrmcubaum.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_fwWeEjoJCm3vDQt92Isq2A_7dYIt7SX";
const AI_ENDPOINT = "https://bidwazi-ai.joramtutein.workers.dev";
const DOCUMENT_BUCKET = "supplier-documents";
const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
});

const $ = (selector) => document.querySelector(selector);
let currentUser = null;
let profile = {};
let savedTenders = [];
let bidWorkspaces = [];
let notifications = [];
let authMode = "signin";

function showMessage(selector, message, isError = false) {
  const element = $(selector);
  if (!element) return;
  element.textContent = message || "";
  element.classList.toggle("error-message", Boolean(isError));
}

function setAuthMode(mode) {
  authMode = mode;
  $("#auth-title").textContent = mode === "signup" ? "Create your supplier account" : "Sign in to BidWazi";
  $("#auth-intro").textContent = mode === "signup"
    ? "Register to save tenders, manage supplier details and organise bids."
    : "Sign in to continue to your supplier workspace.";
  $("#auth-name-wrap").hidden = mode !== "signup";
  $("#auth-name-wrap input").required = mode === "signup";
  $("#auth-submit").textContent = mode === "signup" ? "Create supplier account" : "Sign in";
  $("#auth-switch").textContent = mode === "signup" ? "Already registered? Sign in" : "New supplier? Create an account";
  showMessage("#auth-message", "");
}
function openAuth(mode = "signin") {
  setAuthMode(mode);
  $("#auth-modal").hidden = false;
  $("#auth-form").elements.email.focus();
}
function closeAuth() { $("#auth-modal").hidden = true; }

async function submitAuth(event) {
  event.preventDefault();
  const values = new FormData(event.currentTarget);
  const email = String(values.get("email") || "").trim().toLowerCase();
  const password = String(values.get("password") || "");
  const fullName = String(values.get("full_name") || "").trim();
  const button = $("#auth-submit");
  button.disabled = true;
  showMessage("#auth-message", "Connecting securely…");
  try {
    if (authMode === "signup") {
      const { data, error } = await supabase.auth.signUp({
        email, password,
        options: { data: { full_name: fullName }, emailRedirectTo: window.location.origin + "/" }
      });
      if (error) throw error;
      if (data.session && data.user) {
        currentUser = data.user;
        await loadWorkspace();
        closeAuth();
      } else {
        showMessage("#auth-message", "Account request received. Check your email, confirm your address, then sign in.");
      }
    } else {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      currentUser = data.user;
      await loadWorkspace();
      closeAuth();
    }
  } catch (error) {
    showMessage("#auth-message", error.message || "Authentication could not be completed.", true);
  } finally {
    button.disabled = false;
  }
}

async function requestPasswordReset() {
  const email = $("#auth-form").elements.email.value.trim().toLowerCase();
  if (!email) {
    showMessage("#auth-message", "Enter your email address first.", true);
    return;
  }
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: window.location.origin + "/"
  });
  showMessage("#auth-message", error ? error.message : "If that email belongs to an account, a password-reset email has been sent.");
}

function dispatchSavedIds() {
  window.dispatchEvent(new CustomEvent("bidwazi:cloud-saved", {
    detail: { ids: savedTenders.map((row) => String(row.source_tender_id)) }
  }));
}

function setAccountUi(user) {
  currentUser = user || null;
  $("#account-open").hidden = Boolean(user);
  $("#dashboard-open").hidden = !user;
  $("#supplier-dashboard").hidden = !user;
  if (!user) {
    $("#saved-list").replaceChildren();
    $("#bid-list").replaceChildren();
    $("#document-list").replaceChildren();
    $("#notification-list").replaceChildren();
    $("#dashboard-welcome").textContent = "Sign in to access your supplier workspace.";
    window.dispatchEvent(new CustomEvent("bidwazi:cloud-saved", { detail: { ids: [] } }));
  }
}

async function loadWorkspace() {
  if (!currentUser) return;
  const results = await Promise.all([
    supabase.from("profiles").select("*").eq("id", currentUser.id).maybeSingle(),
    supabase.from("saved_tenders").select("*").eq("user_id", currentUser.id).order("updated_at", { ascending: false }),
    supabase.from("bid_workspaces").select("*").eq("user_id", currentUser.id).order("updated_at", { ascending: false }),
    supabase.from("user_notifications").select("*").eq("user_id", currentUser.id).order("created_at", { ascending: false }).limit(30)
  ]);
  for (const result of results) if (result.error) throw result.error;
  profile = results[0].data || {};
  savedTenders = results[1].data || [];
  bidWorkspaces = results[2].data || [];
  notifications = results[3].data || [];
  fillProfile();
  renderSavedTenders();
  renderBidWorkspaces();
  renderNotifications();
  dispatchSavedIds();
  $("#dashboard-welcome").textContent = "Signed in as " + currentUser.email + ". Your workspace is private to your account.";
  $("#supplier-dashboard").hidden = false;
  await loadSupplierDocuments();
}

function fillProfile() {
  const form = $("#profile-form");
  for (const field of ["full_name","business_name","county","business_type","phone","registration_number","website","address","description"]) {
    if (form.elements[field]) form.elements[field].value = profile[field] || "";
  }
}
async function saveProfile(event) {
  event.preventDefault();
  if (!currentUser) throw new Error("Sign in to save a supplier profile.");
  const values = Object.fromEntries(new FormData(event.currentTarget).entries());
  values.id = currentUser.id;
  values.updated_at = new Date().toISOString();
  const { error } = await supabase.from("profiles").upsert(values, { onConflict: "id" });
  if (error) throw error;
  profile = { ...profile, ...values };
  showMessage("#profile-status", "Supplier profile saved.");
}
function makeNode(tag, text, className) {
  const element = document.createElement(tag);
  if (text !== undefined && text !== null) element.textContent = String(text);
  if (className) element.className = className;
  return element;
}

function renderSavedTenders() {
  const root = $("#saved-list");
  root.replaceChildren();
  const bidSelect = $("#bid-saved-tender");
  bidSelect.replaceChildren(new Option("No linked tender", ""));
  if (!savedTenders.length) root.append(makeNode("p", "No saved tenders yet. Save opportunities from the tender radar.", "muted"));

  for (const row of savedTenders) {
    const snapshot = row.tender_snapshot || {};
    const item = makeNode("div", undefined, "workspace-item");
    const details = makeNode("div");
    details.append(makeNode("strong", snapshot.title || row.source_tender_id));
    details.append(makeNode("p", (snapshot.entity || "Buyer not listed") + " · " + (snapshot.reference || "Reference unavailable")));
    details.append(makeNode("p", "Status: " + (row.workflow_status || "watching")));
    const remove = makeNode("button", "Remove", "button outline");
    remove.type = "button";
    remove.addEventListener("click", async () => {
      remove.disabled = true;
      const { error } = await supabase.from("saved_tenders").delete().eq("id", row.id).eq("user_id", currentUser.id);
      if (error) showMessage("#profile-status", error.message, true);
      else await loadWorkspace();
    });
    item.append(details, remove);
    root.append(item);
    bidSelect.add(new Option(snapshot.title || row.source_tender_id, row.id));
  }
}

function renderBidWorkspaces() {
  const root = $("#bid-list");
  root.replaceChildren();
  const statuses = {
    planning: "Planning", documents_pending: "Documents pending",
    ready_for_review: "Ready for review", submitted: "Submitted",
    won: "Won", lost: "Lost", withdrawn: "Withdrawn"
  };
  if (!bidWorkspaces.length) {
    root.append(makeNode("p", "Your bid pipeline is empty. Add a saved tender or create a workspace above.", "muted"));
    return;
  }
  for (const row of bidWorkspaces) {
    const item = makeNode("div", undefined, "workspace-item");
    const details = makeNode("div");
    details.append(makeNode("strong", row.title));
    details.append(makeNode("p", row.deadline_at
      ? "Deadline: " + new Date(row.deadline_at).toLocaleString("en-KE", { timeZone: "Africa/Nairobi" })
      : "No deadline entered"));
    if (row.notes) details.append(makeNode("p", row.notes));
    const select = document.createElement("select");
    select.setAttribute("aria-label", "Update bid stage");
    for (const [value,label] of Object.entries(statuses)) {
      const option = new Option(label, value);
      option.selected = row.status === value;
      select.add(option);
    }
    select.addEventListener("change", async () => {
      select.disabled = true;
      const { error } = await supabase.from("bid_workspaces")
        .update({ status: select.value, updated_at: new Date().toISOString() })
        .eq("id", row.id).eq("user_id", currentUser.id);
      if (error) showMessage("#profile-status", error.message, true);
      else await loadWorkspace();
    });
    item.append(details, select);
    root.append(item);
  }
}

async function addBidWorkspace(event) {
  event.preventDefault();
  if (!currentUser) throw new Error("Sign in to create a bid workspace.");
  const values = Object.fromEntries(new FormData(event.currentTarget).entries());
  const linkedTender = savedTenders.find((row) => row.id === values.saved_tender_id);
  const title = String(values.title || "").trim();
  if (!title) throw new Error("Enter a bid workspace title.");
  const { error } = await supabase.from("bid_workspaces").insert({
    user_id: currentUser.id,
    saved_tender_id: linkedTender ? linkedTender.id : null,
    title,
    status: values.status || "planning",
    deadline_at: values.deadline_at ? new Date(values.deadline_at).toISOString() : null
  });
  if (error) throw error;
  event.currentTarget.reset();
  await loadWorkspace();
}

function renderNotifications() {
  const root = $("#notification-list");
  root.replaceChildren();
  if (!notifications.length) {
    root.append(makeNode("p", "No notifications yet. Automated tender alerts will appear here when monitoring is activated.", "muted"));
    return;
  }
  for (const row of notifications) {
    const item = makeNode("div", undefined, "workspace-item");
    const details = makeNode("div");
    details.append(makeNode("strong", row.title));
    details.append(makeNode("p", row.body || ""));
    details.append(makeNode("p", new Date(row.created_at).toLocaleString("en-KE", { timeZone: "Africa/Nairobi" })));
    item.append(details);
    if (!row.read_at) {
      const read = makeNode("button", "Mark read", "button outline");
      read.type = "button";
      read.addEventListener("click", async () => {
        const { error } = await supabase.from("user_notifications")
          .update({ read_at: new Date().toISOString() }).eq("id", row.id).eq("user_id", currentUser.id);
        if (error) showMessage("#profile-status", error.message, true);
        else await loadWorkspace();
      });
      item.append(read);
    } else item.append(makeNode("span", "Read", "micro"));
    root.append(item);
  }
}

async function loadSupplierDocuments() {
  const root = $("#document-list");
  root.replaceChildren();
  const { data, error } = await supabase.storage.from(DOCUMENT_BUCKET).list(currentUser.id, {
    limit: 100, sortBy: { column: "created_at", order: "desc" }
  });
  if (error) {
    showMessage("#document-status", "Private document storage is unavailable: " + error.message, true);
    return;
  }
  const files = (data || []).filter((item) => item.name && item.name !== ".emptyFolderPlaceholder");
  if (!files.length) {
    root.append(makeNode("p", "No supplier documents uploaded.", "muted"));
    return;
  }
  for (const file of files) {
    const path = currentUser.id + "/" + file.name;
    const { data: signed, error: signedError } = await supabase.storage.from(DOCUMENT_BUCKET).createSignedUrl(path, 300);
    const item = makeNode("div", undefined, "workspace-item");
    item.append(makeNode("span", file.name));
    if (!signedError && signed?.signedUrl) {
      const link = makeNode("a", "Open securely", "official-link");
      link.href = signed.signedUrl;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      item.append(link);
    } else item.append(makeNode("span", "Link unavailable", "micro"));
    root.append(item);
  }
}

async function uploadSupplierDocument(event) {
  event.preventDefault();
  const file = event.currentTarget.elements.document.files?.[0];
  if (!file) throw new Error("Choose a document first.");
  if (file.size > 10 * 1024 * 1024) throw new Error("The document exceeds the 10 MB limit.");
  if (!["application/pdf","image/jpeg","image/png"].includes(file.type)) {
    throw new Error("Only PDF, JPEG and PNG files are accepted.");
  }
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-120);
  const objectPath = currentUser.id + "/" + Date.now() + "-" + safeName;
  const button = event.currentTarget.querySelector("button[type=submit]");
  button.disabled = true;
  showMessage("#document-status", "Uploading to your private supplier folder…");
  try {
    const { error } = await supabase.storage.from(DOCUMENT_BUCKET).upload(objectPath, file, {
      contentType: file.type, cacheControl: "3600", upsert: false
    });
    if (error) throw error;
    event.currentTarget.reset();
    showMessage("#document-status", "Document uploaded to your private supplier folder.");
    await loadSupplierDocuments();
  } finally {
    button.disabled = false;
  }
}

async function toggleTender(notice) {
  if (!currentUser) {
    openAuth("signin");
    throw new Error("Sign in to save tenders to your account.");
  }
  const sourceId = String(notice.id || "");
  if (!sourceId) throw new Error("This tender has no source identifier and cannot be saved.");
  const { data: existing, error: lookupError } = await supabase.from("saved_tenders").select("id")
    .eq("user_id", currentUser.id).eq("source", "Kenya PPIP").eq("source_tender_id", sourceId).maybeSingle();
  if (lookupError) throw lookupError;
  if (existing) {
    const { error } = await supabase.from("saved_tenders").delete().eq("id", existing.id).eq("user_id", currentUser.id);
    if (error) throw error;
  } else {
    const snapshot = {
      id: sourceId, title: notice.title, reference: notice.reference, entity: notice.entity,
      category: notice.category, method: notice.method, closing: notice.closing,
      published: notice.published, agpo: notice.agpo, sourceUrl: notice.sourceUrl
    };
    const { error } = await supabase.from("saved_tenders").insert({
      user_id: currentUser.id, source: "Kenya PPIP", source_tender_id: sourceId,
      tender_snapshot: snapshot, workflow_status: "watching"
    });
    if (error) throw error;
  }
  await loadWorkspace();
}

async function analyzeTender(notice) {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  const token = data.session?.access_token;
  if (!token) throw new Error("Your session has expired. Sign in again.");
  const input = [
    "Title: " + (notice.title || ""),
    "Buyer: " + (notice.entity || ""),
    "Reference: " + (notice.reference || ""),
    "Category: " + (notice.category || ""),
    "Procurement method: " + (notice.method || ""),
    "Closing: " + (notice.closing || ""),
    "Official source URL: " + (notice.sourceUrl || "")
  ].join("\n");
  const response = await fetch(AI_ENDPOINT + "/generate", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: "Bearer " + token },
    body: JSON.stringify({ task: "tender_summary", input })
  });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error || "AI tender analysis failed.");
  return body.answer;
}

async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
  currentUser = null;
  profile = {};
  savedTenders = [];
  bidWorkspaces = [];
  notifications = [];
  setAccountUi(null);
  closeAuth();
}

function wireUi() {
  $("#account-open").addEventListener("click", () => openAuth("signin"));
  $("#dashboard-open").addEventListener("click", () => {
    $("#supplier-dashboard").hidden = false;
    $("#supplier-dashboard").scrollIntoView({ behavior: "smooth" });
    loadWorkspace().catch((error) => showMessage("#profile-status", error.message, true));
  });
  $("#auth-modal .auth-close").addEventListener("click", closeAuth);
  $("#auth-modal").addEventListener("click", (event) => {
    if (event.target === $("#auth-modal")) closeAuth();
  });
  $("#auth-switch").addEventListener("click", () => setAuthMode(authMode === "signup" ? "signin" : "signup"));
  $("#auth-form").addEventListener("submit", submitAuth);
  $("#auth-reset").addEventListener("click", () => requestPasswordReset().catch((error) => showMessage("#auth-message", error.message, true)));
  $("#profile-form").addEventListener("submit", (event) => saveProfile(event).catch((error) => showMessage("#profile-status", error.message, true)));
  $("#bid-form").addEventListener("submit", (event) => addBidWorkspace(event).catch((error) => showMessage("#profile-status", error.message, true)));
  $("#document-form").addEventListener("submit", (event) => uploadSupplierDocument(event).catch((error) => showMessage("#document-status", error.message, true)));
  $("#account-signout").addEventListener("click", () => signOut().catch((error) => showMessage("#profile-status", error.message, true)));
}

window.BidWaziAccount = {
  isSignedIn: () => Boolean(currentUser),
  openAuth,
  toggleTender,
  analyzeTender,
  refreshWorkspace: loadWorkspace
};

wireUi();
supabase.auth.onAuthStateChange((_event, session) => {
  const user = session?.user || null;
  setAccountUi(user);
  if (user) {
    currentUser = user;
    window.setTimeout(() => loadWorkspace().catch((error) => showMessage("#profile-status", error.message, true)), 0);
  }
});
const sessionResult = await supabase.auth.getSession();
if (sessionResult.error) {
  showMessage("#auth-message", sessionResult.error.message, true);
} else {
  setAccountUi(sessionResult.data.session?.user || null);
  if (sessionResult.data.session?.user) {
    currentUser = sessionResult.data.session.user;
    await loadWorkspace();
  }
}
