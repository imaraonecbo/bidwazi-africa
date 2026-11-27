import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const SUPABASE_URL = "https://darvkreybhvlrmcubaum.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_fwWeEjoJCm3vDQt92Isq2A_7dYIt7SX";
const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
});

const $ = (s) => document.querySelector(s);
let user = null;
let profile = null;
let skills = [];
let selectedSkills = new Map();
let opportunities = [];
let assignments = [];
let earnings = [];
let payouts = [];
let ideas = [];
let authMode = "signin";

const money = (minor, currency = "KES") => new Intl.NumberFormat("en", {
  style: "currency", currency, maximumFractionDigits: 2
}).format((Number(minor) || 0) / 100);
const node = (tag, text, cls) => {
  const el = document.createElement(tag);
  if (text !== undefined && text !== null) el.textContent = String(text);
  if (cls) el.className = cls;
  return el;
};
function message(id, text, error = false) {
  const el = $(id);
  if (!el) return;
  el.textContent = text || "";
  el.classList.toggle("error", Boolean(error));
}
function openModal(id) { $(id).hidden = false; }
function closeModal(id) { $(id).hidden = true; }
function setAuthMode(mode) {
  authMode = mode;
  $("#auth-title").textContent = mode === "signup" ? "Create your free contributor account" : "Sign in";
  $("#auth-intro").textContent = mode === "signup"
    ? "Join the E-S-E network. No registration fee or paid membership."
    : "Access your contributor desk.";
  $("#name-wrap").hidden = mode !== "signup";
  $("#name-wrap input").required = mode === "signup";
  $("#auth-submit").textContent = mode === "signup" ? "Create free account" : "Sign in";
  $("#auth-switch").textContent = mode === "signup" ? "Already registered? Sign in" : "Create a free account";
  message("#auth-message", "");
}
function showAccount(userData) {
  user = userData || null;
  $("#login-open").hidden = Boolean(user);
  $("#join-open").hidden = Boolean(user);
  $("#logout").hidden = !user;
  $("#workspace").hidden = !user;
  if (!user) {
    $("#welcome").textContent = "Your workspace";
    $("#assignment-list").replaceChildren(node("p", "Sign in to view your assignments.", "muted"));
  }
}
async function authSubmit(event) {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const email = String(form.get("email") || "").trim().toLowerCase();
  const password = String(form.get("password") || "");
  const fullName = String(form.get("full_name") || "").trim();
  const button = $("#auth-submit");
  button.disabled = true;
  message("#auth-message", "Connecting securely…");
  try {
    if (authMode === "signup") {
      const { data, error } = await supabase.auth.signUp({
        email, password,
        options: { data: { full_name: fullName }, emailRedirectTo: location.origin + "/" }
      });
      if (error) throw error;
      if (data.session?.user) {
        user = data.user;
        closeModal("#auth-modal");
        await loadDashboard();
      } else {
        message("#auth-message", "Account created. Check your email to confirm your address, then sign in.");
      }
    } else {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      user = data.user;
      closeModal("#auth-modal");
      await loadDashboard();
    }
  } catch (e) {
    message("#auth-message", e.message || "We could not complete sign-in.", true);
  } finally { button.disabled = false; }
}
async function passwordReset() {
  const email = $("#auth-form").elements.email.value.trim().toLowerCase();
  if (!email) return message("#auth-message", "Enter your email address first.", true);
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: location.origin + "/" });
  message("#auth-message", error ? error.message : "If the account exists, a password reset email has been sent.", Boolean(error));
}

async function loadOpportunities() {
  const root = $("#opportunity-list");
  root.replaceChildren(node("div", "Loading available opportunities…", "loading"));
  const { data, error } = await supabase.from("work_opportunities")
    .select("id,title,summary,instructions,category,required_skills,quality_criteria,eligible_countries,pay_amount_minor,currency,pay_basis,estimated_minutes,slots_total,slots_claimed,deadline_at")
    .order("created_at", { ascending: false }).limit(100);
  if (error) {
    root.replaceChildren(node("div", "The opportunity board is temporarily unavailable. Please refresh shortly.", "empty"));
    message("#opportunity-status", "Unable to load opportunities.", true);
    return;
  }
  opportunities = data || [];
  renderOpportunities();
}
function renderOpportunities() {
  const root = $("#opportunity-list");
  root.replaceChildren();
  const q = ($("#search").value || "").trim().toLowerCase();
  const category = $("#category").value;
  const list = opportunities.filter(o => {
    const hay = [o.title,o.summary,o.instructions,o.category,JSON.stringify(o.required_skills || [])].join(" ").toLowerCase();
    return (!q || hay.includes(q)) && (!category || o.category === category);
  });
  $("#opportunity-status").textContent = list.length
    ? list.length + " funded opportunity" + (list.length === 1 ? "" : "ies") + " currently open."
    : "No funded opportunities are currently published. New assignments will appear here once work and budgets are secured.";
  if (!list.length) {
    root.append(node("div", "There are no matching funded tasks right now. You can still create your profile, add skills and return when new work is published.", "empty"));
    return;
  }
  for (const o of list) {
    const card = node("article", undefined, "opportunity-card");
    const pills = node("div", undefined, "pills");
    pills.append(node("span", o.category, "pill"));
    pills.append(node("span", (o.slots_total - o.slots_claimed) + " slots left", "pill"));
    const title = node("h3", o.title);
    const summary = node("p", o.summary || "Read the instructions before claiming this assignment.");
    const pay = node("div", money(o.pay_amount_minor, o.currency) + " · " + (o.pay_basis || "per task"), "pay");
    const meta = node("div", undefined, "opportunity-meta");
    if (o.estimated_minutes) meta.append(node("span", "Est. " + o.estimated_minutes + " min"));
    if (o.deadline_at) meta.append(node("span", "Deadline " + new Date(o.deadline_at).toLocaleString()));
    if (Array.isArray(o.required_skills) && o.required_skills.length) meta.append(node("span", "Skills: " + o.required_skills.map(x => typeof x === "string" ? x : x.name || x.slug).join(", ")));
    const actions = node("div", undefined, "opportunity-actions");
    const claim = node("button", user ? "Claim this work" : "Sign in to claim", "button");
    claim.type = "button";
    const existing = assignments.find(a => a.opportunity_id === o.id && a.status !== "cancelled");
    if (existing) { claim.textContent = "Already claimed"; claim.disabled = true; }
    claim.addEventListener("click", async () => {
      if (!user) { setAuthMode("signin"); openModal("#auth-modal"); return; }
      claim.disabled = true;
      try {
        const { error } = await supabase.from("work_assignments").insert({
          opportunity_id: o.id, contributor_id: user.id
        });
        if (error) throw error;
        await loadDashboard();
        renderOpportunities();
        message("#profile-message", "Work claimed. Read the full instructions in your assignments.");
      } catch (e) {
        message("#profile-message", e.message || "Could not claim this opportunity.", true);
        claim.disabled = false;
      }
    });
    actions.append(claim);
    card.append(pills,title,summary,pay,meta,actions);
    root.append(card);
  }
}

async function loadSkills() {
  const { data, error } = await supabase.from("skills").select("id,slug,name,category").eq("is_active", true).order("category").order("name");
  if (error) throw error;
  skills = data || [];
  const { data: own, error: ownError } = await supabase.from("worker_skills").select("skill_id,proficiency").eq("user_id", user.id);
  if (ownError) throw ownError;
  selectedSkills = new Map((own || []).map(x => [String(x.skill_id), x.proficiency]));
  renderSkills();
}
function renderSkills() {
  const root = $("#skill-list");
  root.replaceChildren();
  if (!skills.length) { root.append(node("p","No skills are available yet.","muted")); return; }
  for (const s of skills) {
    const row = node("div",undefined,"skill-row");
    const label = node("label");
    const check = document.createElement("input");
    check.type = "checkbox";
    check.checked = selectedSkills.has(String(s.id));
    check.addEventListener("change", () => {
      if (check.checked) selectedSkills.set(String(s.id), selectedSkills.get(String(s.id)) || "beginner");
      else selectedSkills.delete(String(s.id));
      level.disabled = !check.checked;
    });
    label.append(check,node("span",s.name));
    const level = document.createElement("select");
    for (const v of ["beginner","intermediate","advanced","expert"]) level.add(new Option(v[0].toUpperCase()+v.slice(1),v));
    level.value = selectedSkills.get(String(s.id)) || "beginner";
    level.disabled = !check.checked;
    level.addEventListener("change", () => {
      if (check.checked) selectedSkills.set(String(s.id),level.value);
    });
    row.append(label,level);
    root.append(row);
  }
}
async function saveSkills() {
  const button = $("#save-skills");
  button.disabled = true;
  try {
    const { error: removeError } = await supabase.from("worker_skills").delete().eq("user_id", user.id);
    if (removeError) throw removeError;
    const rows = [...selectedSkills.entries()].map(([skill_id,proficiency]) => ({
      user_id:user.id, skill_id:Number(skill_id), proficiency
    }));
    if (rows.length) {
      const { error } = await supabase.from("worker_skills").insert(rows);
      if (error) throw error;
    }
    message("#skills-message","Skills saved.");
  } catch(e) { message("#skills-message",e.message,true); }
  finally { button.disabled = false; }
}
async function saveProfile(event) {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const row = Object.fromEntries(form.entries());
  row.user_id = user.id;
  row.country_code = row.country_code.trim().toUpperCase();
  row.updated_at = new Date().toISOString();
  const { error } = await supabase.from("worker_profiles").upsert(row,{onConflict:"user_id"});
  if (error) throw error;
  profile = row;
  message("#profile-message","Profile saved.");
}
function fillProfile() {
  const f = $("#profile-form");
  if (!profile) return;
  for (const k of ["display_name","country_code","city","timezone","bio","portfolio_url","availability","profile_visibility"]) {
    if (f.elements[k]) f.elements[k].value = profile[k] ?? "";
  }
  $("#welcome").textContent = "Welcome, " + (profile.display_name || user.email);
  $("#profile-state").textContent = profile.availability === "available" ? "Available for work" : profile.availability;
}
async function loadAssignments() {
  const { data, error } = await supabase.from("work_assignments")
    .select("id,opportunity_id,status,agreed_amount_minor,currency,claimed_at,work_opportunities(title,summary,instructions,deadline_at)")
    .eq("contributor_id",user.id).order("claimed_at",{ascending:false});
  if (error) throw error;
  assignments = data || [];
  const root = $("#assignment-list");
  const select = $("#submission-assignment");
  root.replaceChildren();
  select.replaceChildren(new Option("Choose an active assignment",""));
  const active = assignments.filter(a => ["claimed","in_progress","revision_required"].includes(a.status));
  for (const a of assignments) {
    const item = node("div",undefined,"list-item");
    const info = node("div");
    info.append(node("strong",a.work_opportunities?.title || "Work assignment"));
    info.append(node("p", "Status: " + a.status.replaceAll("_"," ") + " · Agreed pay: " + money(a.agreed_amount_minor,a.currency)));
    if (a.work_opportunities?.deadline_at) info.append(node("p","Deadline: "+new Date(a.work_opportunities.deadline_at).toLocaleString()));
    const details = node("details");
    details.append(node("summary","View instructions"));
    details.append(node("p",a.work_opportunities?.instructions || a.work_opportunities?.summary || "No additional instructions."));
    item.append(info,details);
    root.append(item);
    if (["claimed","in_progress","revision_required"].includes(a.status)) select.add(new Option(a.work_opportunities?.title || "Assignment",a.id));
  }
  if (!assignments.length) root.append(node("p","No assignments claimed yet. Explore the opportunity board above.","muted"));
}
async function submitWork(event) {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const row = {
    assignment_id:String(form.get("assignment_id")),
    contributor_id:user.id,
    submission_text:String(form.get("submission_text") || "").trim(),
    deliverable_url:String(form.get("deliverable_url") || "").trim() || null
  };
  const { error } = await supabase.from("work_submissions").insert(row);
  if (error) throw error;
  event.currentTarget.reset();
  message("#submission-message","Submission received for review.");
  await loadAssignments();
}
async function loadEarnings() {
  const [ledger,payoutData] = await Promise.all([
    supabase.from("worker_earnings_ledger").select("amount_minor,entry_type,currency,reason,created_at").eq("contributor_id",user.id).order("created_at",{ascending:false}),
    supabase.from("payout_requests").select("id,amount_minor,currency,payout_method,status,requested_at").eq("contributor_id",user.id).order("requested_at",{ascending:false})
  ]);
  if (ledger.error) throw ledger.error;
  if (payoutData.error) throw payoutData.error;
  earnings = ledger.data || [];
  payouts = payoutData.data || [];
  const balance = earnings.reduce((sum,x)=>sum+(x.entry_type==="credit"?Number(x.amount_minor):-Number(x.amount_minor)),0);
  const currency = earnings[0]?.currency || "KES";
  $("#earnings-summary").textContent = money(balance,currency);
  const root = $("#payout-list");
  root.replaceChildren();
  for (const p of payouts) root.append(node("div",money(p.amount_minor,p.currency)+" · "+p.payout_method+" · "+p.status,"list-item"));
}
async function requestPayout(event) {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const amount = Math.round(Number(form.get("amount"))*100);
  if (!Number.isSafeInteger(amount) || amount <= 0) throw new Error("Enter a valid payout amount.");
  const { error } = await supabase.from("payout_requests").insert({
    contributor_id:user.id, amount_minor:amount, currency:"KES", payout_method:String(form.get("payout_method"))
  });
  if (error) throw error;
  event.currentTarget.reset();
  message("#payout-message","Payout request submitted. It will be checked by the finance team.");
  await loadEarnings();
}
async function loadIdeas() {
  const { data,error } = await supabase.from("idea_submissions").select("id,title,category,status,submitted_at")
    .eq("contributor_id",user.id).order("submitted_at",{ascending:false});
  if (error) throw error;
  ideas = data || [];
  const root = $("#my-ideas");
  root.replaceChildren();
  if (!ideas.length) root.append(node("p","No ideas submitted yet.","muted"));
  for (const idea of ideas) root.append(node("div",idea.title+" · "+idea.category+" · "+idea.status.replaceAll("_"," "),"list-item"));
}
async function submitIdea(event) {
  event.preventDefault();
  const form = Object.fromEntries(new FormData(event.currentTarget).entries());
  const { error } = await supabase.from("idea_submissions").insert({
    contributor_id:user.id,title:String(form.title).trim(),problem:String(form.problem).trim(),
    proposed_solution:String(form.proposed_solution).trim(),category:String(form.category),status:"received"
  });
  if (error) throw error;
  event.currentTarget.reset();
  message("#idea-message","Idea submitted privately to the E-S-E team.");
  await loadIdeas();
}
async function loadDashboard() {
  if (!user) return;
  showAccount(user);
  try {
    const { data,error } = await supabase.from("worker_profiles").select("*").eq("user_id",user.id).maybeSingle();
    if (error) throw error;
    profile = data || {display_name:user.user_metadata?.full_name || user.email?.split("@")[0] || "",country_code:"KE",timezone:"Africa/Nairobi",availability:"available",profile_visibility:"private"};
    fillProfile();
    await Promise.all([loadSkills(),loadAssignments(),loadEarnings(),loadIdeas()]);
    renderOpportunities();
  } catch(e) {
    message("#profile-message","Could not load your workspace: "+e.message,true);
  }
}
async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
  user = null; profile = null; assignments = []; earnings = [];
  showAccount(null);
  await loadOpportunities();
}

function wire() {
  $("#year").textContent = String(new Date().getFullYear());
  $("#login-open").addEventListener("click",()=>{setAuthMode("signin");openModal("#auth-modal");});
  $("#join-open").addEventListener("click",()=>{setAuthMode("signup");openModal("#auth-modal");});
  $("#hero-join").addEventListener("click",()=>{setAuthMode("signup");openModal("#auth-modal");});
  $("#logout").addEventListener("click",()=>signOut().catch(e=>message("#profile-message",e.message,true)));
  $("#auth-form").addEventListener("submit",authSubmit);
  $("#auth-switch").addEventListener("click",()=>setAuthMode(authMode==="signup"?"signin":"signup"));
  $("#auth-reset").addEventListener("click",()=>passwordReset().catch(e=>message("#auth-message",e.message,true)));
  document.querySelectorAll("[data-close]").forEach(b=>b.addEventListener("click",()=>closeModal(b.dataset.close==="idea"?"#idea-modal":"#auth-modal")));
  document.querySelectorAll(".modal").forEach(m=>m.addEventListener("click",e=>{if(e.target===m)closeModal("#"+m.id);}));
  $("#profile-form").addEventListener("submit",e=>saveProfile(e).catch(err=>message("#profile-message",err.message,true)));
  $("#save-skills").addEventListener("click",saveSkills);
  $("#submission-form").addEventListener("submit",e=>submitWork(e).catch(err=>message("#submission-message",err.message,true)));
  $("#payout-form").addEventListener("submit",e=>requestPayout(e).catch(err=>message("#payout-message",err.message,true)));
  $("#idea-open").addEventListener("click",()=>{if(!user){setAuthMode("signin");openModal("#auth-modal");message("#auth-message","Sign in to submit an idea.");}else openModal("#idea-modal");});
  $("#idea-form").addEventListener("submit",e=>submitIdea(e).catch(err=>message("#idea-message",err.message,true)));
  $("#refresh").addEventListener("click",loadOpportunities);
  $("#search").addEventListener("input",renderOpportunities);
  $("#category").addEventListener("change",renderOpportunities);
}

wire();
await loadOpportunities();
const {data:sessionData,error:sessionError}=await supabase.auth.getSession();
if(sessionError) message("#auth-message",sessionError.message,true);
showAccount(sessionData?.session?.user || null);
if(sessionData?.session?.user){user=sessionData.session.user;await loadDashboard();}
supabase.auth.onAuthStateChange((_event,session)=>{
  const next=session?.user || null;
  showAccount(next);
  if(next){user=next;setTimeout(()=>loadDashboard(),0);}
  else {user=null;profile=null;assignments=[];renderOpportunities();}
});
