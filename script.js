/* =========================================================
   SHARE FOOD, SHARE HOPE — Shared Application Logic
   Backend simulated entirely with localStorage (persistent
   data) and sessionStorage (login session + selected role).
   ========================================================= */

/* ---------------------------------------------------------
   1. STORAGE HELPERS
   --------------------------------------------------------- */

/** Read the users array from localStorage (creates it if missing). */
function getUsers() {
  return JSON.parse(localStorage.getItem("users") || "[]");
}

/** Persist the users array back to localStorage. */
function saveUsers(users) {
  localStorage.setItem("users", JSON.stringify(users));
}

/** Read the donations array from localStorage (creates it if missing). */
function getDonations() {
  return JSON.parse(localStorage.getItem("donations") || "[]");
}

/** Persist the donations array back to localStorage. */
function saveDonations(donations) {
  localStorage.setItem("donations", JSON.stringify(donations));
}

/** Generate a short, unique, human-friendly ID, e.g. "DN7421". */
function generateId(prefix) {
  return prefix + Math.floor(10000 + Math.random() * 89999);
}

/** Format an ISO / datetime-local string into a readable string. */
function formatDateTime(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (isNaN(d.getTime())) return value;
  return d.toLocaleString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Escape user-provided text before injecting into innerHTML. */
function escapeHtml(str) {
  if (str === undefined || str === null) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/* ---------------------------------------------------------
   2. TOAST NOTIFICATIONS
   --------------------------------------------------------- */

/**
 * Show a Bootstrap toast in the bottom-right corner.
 * @param {string} message
 * @param {"success"|"danger"|"warning"|"info"} type
 */
function showToast(message, type = "success") {
  let container = document.getElementById("toastContainer");
  if (!container) {
    container = document.createElement("div");
    container.id = "toastContainer";
    container.className = "toast-container position-fixed bottom-0 end-0 p-3";
    document.body.appendChild(container);
  }

  const icons = {
    success: "bi-check-circle-fill",
    danger: "bi-x-circle-fill",
    warning: "bi-exclamation-triangle-fill",
    info: "bi-info-circle-fill",
  };

  const toastEl = document.createElement("div");
  toastEl.className = `toast align-items-center text-bg-${type} border-0`;
  toastEl.setAttribute("role", "alert");
  toastEl.innerHTML = `
    <div class="d-flex">
      <div class="toast-body d-flex align-items-center gap-2">
        <i class="bi ${icons[type] || icons.info}"></i> ${escapeHtml(message)}
      </div>
      <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
    </div>`;
  container.appendChild(toastEl);

  const toast = new bootstrap.Toast(toastEl, { delay: 3200 });
  toast.show();
  toastEl.addEventListener("hidden.bs.toast", () => toastEl.remove());
}

/* ---------------------------------------------------------
   3. PAGE LOADER
   --------------------------------------------------------- */

/** Fade out the loading overlay shortly after the page is ready. */
function hideLoader() {
  const overlay = document.getElementById("loadingOverlay");
  if (!overlay) return;
  setTimeout(() => overlay.classList.add("hide"), 350);
}

window.addEventListener("DOMContentLoaded", hideLoader);

/* ---------------------------------------------------------
   4. ROLE SELECTION (index.html)
   --------------------------------------------------------- */

/**
 * Save the visitor's chosen role and move on to the auth page.
 * @param {"ngo"|"user"} role
 */
function selectRole(role) {
  sessionStorage.setItem("role", role);
  const overlay = document.getElementById("loadingOverlay");
  if (overlay) overlay.classList.remove("hide");
  setTimeout(() => {
    window.location.href = "auth.html";
  }, 250);
}

/* ---------------------------------------------------------
   5. AUTHENTICATION (auth.html)
   --------------------------------------------------------- */

/** Toggle which panel is visible on the auth page. */
function showAuthPanel(panelId) {
  document.querySelectorAll(".auth-panel").forEach((p) => p.classList.remove("active"));
  const panel = document.getElementById(panelId);
  if (panel) panel.classList.add("active");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

/** Show/hide a password field's value and swap the eye icon. */
function togglePasswordVisibility(inputId, iconEl) {
  const input = document.getElementById(inputId);
  if (!input) return;
  const isHidden = input.type === "password";
  input.type = isHidden ? "text" : "password";
  iconEl.classList.toggle("bi-eye", !isHidden);
  iconEl.classList.toggle("bi-eye-slash", isHidden);
}

/** Paint the "you're signing in as…" badge based on the stored role. */
function renderRoleBadge() {
  const role = sessionStorage.getItem("role");
  const badges = document.querySelectorAll(".role-badge-target");
  if (!role) return;
  badges.forEach((badge) => {
    const isNgo = role === "ngo";
    badge.classList.add(isNgo ? "is-ngo" : "is-user");
    badge.innerHTML = `<i class="bi ${isNgo ? "bi-people-fill" : "bi-person-fill"}"></i>
      Continuing as ${isNgo ? "NGO Admin" : "Donor / User"}`;
  });
}

/** Basic email format check. */
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Handle the Sign Up form submission: validates input, prevents
 * duplicate emails, stores the new user, then routes them to the
 * correct dashboard for their selected role.
 */
function signupUser(event) {
  event.preventDefault();

  const name = document.getElementById("signupName").value.trim();
  const phone = document.getElementById("signupPhone").value.trim();
  const email = document.getElementById("signupEmail").value.trim().toLowerCase();
  const password = document.getElementById("signupPassword").value;
  const confirmPassword = document.getElementById("signupConfirmPassword").value;
  const role = sessionStorage.getItem("role") || "user";
  const errorBox = document.getElementById("signupError");

  errorBox.classList.add("d-none");

  // ---- Validation ----
  if (!name || !phone || !email || !password || !confirmPassword) {
    return showFormError(errorBox, "Please fill in every field.");
  }
  if (!isValidEmail(email)) {
    return showFormError(errorBox, "Please enter a valid email address.");
  }
  if (password.length < 8) {
    return showFormError(errorBox, "Password must be at least 8 characters long.");
  }
  if (password !== confirmPassword) {
    return showFormError(errorBox, "Passwords do not match.");
  }

  const users = getUsers();
  if (users.some((u) => u.email === email)) {
    return showFormError(errorBox, "An account with this email already exists. Please sign in instead.");
  }

  // ---- Persist new user ----
  users.push({ name, phone, email, password, role });
  saveUsers(users);

  // ---- Create session & redirect ----
  sessionStorage.setItem("loggedInUser", email);
  showToast(`Welcome aboard, ${name.split(" ")[0]}!`, "success");

  setTimeout(() => {
    window.location.href = role === "ngo" ? "ngo-dashboard.html" : "user-dashboard.html";
  }, 900);
}

/**
 * Handle the Sign In form submission: verifies credentials against
 * localStorage, opens a session, then routes to the right dashboard.
 */
function loginUser(event) {
  event.preventDefault();

  const identifier = document.getElementById("loginIdentifier").value.trim().toLowerCase();
  const password = document.getElementById("loginPassword").value;
  const errorBox = document.getElementById("loginError");

  errorBox.classList.add("d-none");

  if (!identifier || !password) {
    return showFormError(errorBox, "Please enter your name/email and password.");
  }

  const users = getUsers();
  const match = users.find(
    (u) =>
      (u.email === identifier || u.name.toLowerCase() === identifier) &&
      u.password === password
  );

  if (!match) {
    return showFormError(errorBox, "Incorrect name/email or password. Please try again.");
  }

  sessionStorage.setItem("loggedInUser", match.email);
  showToast(`Welcome back, ${match.name.split(" ")[0]}!`, "success");

  setTimeout(() => {
    window.location.href = match.role === "ngo" ? "ngo-dashboard.html" : "user-dashboard.html";
  }, 700);
}

/** Reveal an inline error message inside a form. */
function showFormError(errorBox, message) {
  if (!errorBox) return;
  errorBox.textContent = message;
  errorBox.classList.remove("d-none");
}

/* ---------------------------------------------------------
   6. SESSION GUARD (dashboard pages)
   --------------------------------------------------------- */

/**
 * Confirm the visitor is logged in and holds the right role for the
 * current page; otherwise bounce them back to the welcome page.
 * @param {"user"|"ngo"} requiredRole
 * @returns {object|null} the logged-in user record
 */
function checkLogin(requiredRole) {
  const email = sessionStorage.getItem("loggedInUser");
  if (!email) {
    window.location.href = "index.html";
    return null;
  }
  const users = getUsers();
  const user = users.find((u) => u.email === email);
  if (!user || user.role !== requiredRole) {
    window.location.href = "index.html";
    return null;
  }
  return user;
}

/** Clear the session and return to the welcome page. */
function logoutUser() {
  sessionStorage.removeItem("loggedInUser");
  sessionStorage.removeItem("role");
  window.location.href = "index.html";
}

/* ---------------------------------------------------------
   7. FOOD MANAGEMENT (user-dashboard.html)
   --------------------------------------------------------- */

let currentDonor = null; // set by initUserDashboard()
let editingDonationId = null; // tracks an in-progress edit

/** Bootstraps the user dashboard: guard, greet, render history. */
function initUserDashboard() {
  currentDonor = checkLogin("user");
  if (!currentDonor) return;

  document.getElementById("userNameDisplay").textContent = currentDonor.name;
  document.getElementById("userInitial").textContent = currentDonor.name.charAt(0).toUpperCase();

  document.getElementById("donationForm").addEventListener("submit", addFoodDonation);
  document.getElementById("photoInput").addEventListener("change", handleImagePreview);

  displayHistory();
  updateNotificationCount();
}

/** Reads the uploaded image (if any) and stores it as a base64 preview. */
function handleImagePreview(event) {
  const file = event.target.files[0];
  const zone = document.getElementById("uploadZone");
  if (!file) return;

  if (file.size > 5 * 1024 * 1024) {
    showToast("Image is too large. Please choose a file under 5MB.", "warning");
    event.target.value = "";
    return;
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    document.getElementById("photoData").value = e.target.result;
    zone.innerHTML = `
      <img src="${e.target.result}" class="preview-thumb mb-2" alt="Preview">
      <div class="small text-muted">${escapeHtml(file.name)} — click to change</div>`;
  };
  reader.readAsDataURL(file);
}

/** Reads the "Add an Item" form and stores a new donation (or saves an edit). */
function addFoodDonation(event) {
  event.preventDefault();

  const foodName = document.getElementById("foodName").value.trim();
  const foodType = document.getElementById("foodType").value;
  const quantity = document.getElementById("quantity").value.trim();
  const address = document.getElementById("pickupAddress").value.trim();
  const contact = document.getElementById("contactNumber").value.trim();
  const preparedTime = document.getElementById("preparedTime").value;
  const expiryTime = document.getElementById("expiryTime").value;
  const instructions = document.getElementById("instructions").value.trim();
  const image = document.getElementById("photoData").value;

  if (!foodName || !foodType || !quantity || !address || !contact || !preparedTime || !expiryTime) {
    showToast("Please fill in all required fields.", "warning");
    return;
  }

  const donations = getDonations();

  if (editingDonationId) {
    // ---- Save an edit to an existing donation ----
    const idx = donations.findIndex((d) => d.id === editingDonationId);
    if (idx !== -1) {
      donations[idx] = {
        ...donations[idx],
        foodName,
        foodType,
        quantity,
        address,
        contact,
        preparedTime,
        expiryTime,
        instructions,
        image: image || donations[idx].image,
      };
      saveDonations(donations);
      showToast("Donation updated successfully.", "success");
    }
    cancelEdit();
  } else {
    // ---- Create a brand-new donation ----
    const newDonation = {
      id: generateId("DN"),
      foodName,
      foodType,
      quantity,
      address,
      contact,
      preparedTime,
      expiryTime,
      instructions,
      image,
      status: "Pending",
      donorEmail: currentDonor.email,
      createdAt: new Date().toISOString(),
    };
    donations.push(newDonation);
    saveDonations(donations);
    showToast("Thank you! Your donation has been submitted.", "success");
  }

  event.target.reset();
  document.getElementById("photoData").value = "";
  resetUploadZone();
  displayHistory();
}

/** Restore the dropzone to its empty placeholder state. */
function resetUploadZone() {
  const zone = document.getElementById("uploadZone");
  if (!zone) return;
  zone.innerHTML = `
    <i class="bi bi-cloud-arrow-up fs-3 text-warning"></i>
    <div class="fw-semibold mt-1">Click to upload or drag and drop</div>
    <div class="small text-muted">JPG, PNG up to 5MB</div>`;
}

/** Populate the form with an existing donation so the donor can edit it. */
function editFoodDonation(id) {
  const donation = getDonations().find((d) => d.id === id);
  if (!donation) return;

  editingDonationId = id;
  document.getElementById("foodName").value = donation.foodName;
  document.getElementById("foodType").value = donation.foodType;
  document.getElementById("quantity").value = donation.quantity;
  document.getElementById("pickupAddress").value = donation.address;
  document.getElementById("contactNumber").value = donation.contact;
  document.getElementById("preparedTime").value = donation.preparedTime;
  document.getElementById("expiryTime").value = donation.expiryTime;
  document.getElementById("instructions").value = donation.instructions || "";
  document.getElementById("photoData").value = donation.image || "";

  if (donation.image) {
    document.getElementById("uploadZone").innerHTML = `
      <img src="${donation.image}" class="preview-thumb mb-2" alt="Preview">
      <div class="small text-muted">Click to change photo</div>`;
  }

  document.getElementById("formModeTitle").innerHTML = '<i class="bi bi-pencil-square"></i> Edit Donation';
  document.getElementById("submitBtnLabel").textContent = "Save Changes";
  document.getElementById("cancelEditBtn").classList.remove("d-none");

  document.getElementById("addItemSection").scrollIntoView({ behavior: "smooth", block: "start" });
}

/** Abandon an in-progress edit and return the form to "add" mode. */
function cancelEdit() {
  editingDonationId = null;
  document.getElementById("donationForm").reset();
  document.getElementById("photoData").value = "";
  resetUploadZone();
  document.getElementById("formModeTitle").innerHTML = '<i class="bi bi-plus-circle"></i> Add an Item';
  document.getElementById("submitBtnLabel").textContent = "Submit Donation";
  document.getElementById("cancelEditBtn").classList.add("d-none");
}

/** Remove a donation after the donor confirms the action. */
function deleteFoodDonation(id) {
  if (!confirm("Delete this donation record? This cannot be undone.")) return;
  let donations = getDonations();
  donations = donations.filter((d) => d.id !== id);
  saveDonations(donations);
  showToast("Donation deleted.", "info");
  displayHistory();
}

/** Render the signed-in donor's donation history as table rows + summary cards. */
function displayHistory() {
  const donations = getDonations()
    .filter((d) => d.donorEmail === currentDonor.email)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const tbody = document.getElementById("historyTableBody");
  const emptyState = document.getElementById("historyEmptyState");

  if (donations.length === 0) {
    tbody.innerHTML = "";
    emptyState.classList.remove("d-none");
    return;
  }
  emptyState.classList.add("d-none");

  tbody.innerHTML = donations
    .map(
      (d) => `
    <tr>
      <td class="fw-semibold text-muted">#${escapeHtml(d.id)}</td>
      <td>
        <div class="d-flex align-items-center gap-2">
          <span class="donation-thumb">${
            d.image
              ? `<img src="${d.image}" style="width:100%;height:100%;border-radius:12px;object-fit:cover;">`
              : '<i class="bi bi-egg-fried"></i>'
          }</span>
          <div>
            <div class="fw-semibold">${escapeHtml(d.foodName)}</div>
            <div class="small text-muted">${escapeHtml(d.foodType)}</div>
          </div>
        </div>
      </td>
      <td>${escapeHtml(d.quantity)}</td>
      <td class="text-muted small">${escapeHtml(d.address)}</td>
      <td>${statusPillHtml(d.status)}</td>
      <td class="text-muted small">${formatDateTime(d.createdAt)}</td>
      <td>
        <div class="d-flex gap-2">
          <button class="btn-icon-action" title="Edit" onclick="editFoodDonation('${d.id}')" ${
        d.status !== "Pending" ? "disabled" : ""
      }>
            <i class="bi bi-pencil"></i>
          </button>
          <button class="btn-icon-action danger" title="Delete" onclick="deleteFoodDonation('${d.id}')">
            <i class="bi bi-trash"></i>
          </button>
        </div>
      </td>
    </tr>`
    )
    .join("");
}

/** Build the colored status pill markup used across both dashboards. */
function statusPillHtml(status) {
  const map = {
    Pending: { cls: "pending", icon: "bi-clock-history" },
    Accepted: { cls: "accepted", icon: "bi-check-circle" },
    Completed: { cls: "completed", icon: "bi-check2-circle" },
    Rejected: { cls: "rejected", icon: "bi-x-circle" },
  };
  const cfg = map[status] || map.Pending;
  return `<span class="status-pill ${cfg.cls}"><i class="bi ${cfg.icon}"></i> ${status}</span>`;
}

/** Simple notification badge: count of donations whose status moved on. */
function updateNotificationCount() {
  const badge = document.getElementById("notifCount");
  if (!badge) return;
  const count = getDonations().filter(
    (d) => d.donorEmail === currentDonor.email && d.status !== "Pending"
  ).length;
  badge.textContent = count;
  badge.parentElement.style.display = count > 0 ? "inline-flex" : "none";
}

/* ---------------------------------------------------------
   8. NGO MANAGEMENT (ngo-dashboard.html)
   --------------------------------------------------------- */

let currentNgo = null;
let activeRequestFilter = "All";

/** Bootstraps the NGO dashboard: guard, greet, render requests + stats. */
function initNgoDashboard() {
  currentNgo = checkLogin("ngo");
  if (!currentNgo) return;

  document.getElementById("ngoNameDisplay").textContent = currentNgo.name;
  document.getElementById("ngoInitial").textContent = currentNgo.name.charAt(0).toUpperCase();

  updateStats();
  displayDonationRequests();
}

/** Recalculate and paint the four summary stat cards. */
function updateStats() {
  const donations = getDonations();
  const count = (status) => donations.filter((d) => d.status === status).length;

  document.getElementById("statTotal").textContent = donations.length;
  document.getElementById("statPending").textContent = count("Pending");
  document.getElementById("statAccepted").textContent = count("Accepted");
  document.getElementById("statCompleted").textContent = count("Completed");
}

/** Switch the requests list filter and re-render. */
function filterRequests(status) {
  activeRequestFilter = status;
  document.querySelectorAll(".filter-chip").forEach((chip) => {
    chip.classList.toggle("active", chip.dataset.filter === status);
  });
  displayDonationRequests();
}

/** Render the donation request cards for the NGO to act on. */
function displayDonationRequests() {
  let donations = getDonations().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  if (activeRequestFilter !== "All") {
    donations = donations.filter((d) => d.status === activeRequestFilter);
  }

  const container = document.getElementById("requestsContainer");
  const emptyState = document.getElementById("requestsEmptyState");

  if (donations.length === 0) {
    container.innerHTML = "";
    emptyState.classList.remove("d-none");
    return;
  }
  emptyState.classList.add("d-none");

  container.innerHTML = donations.map((d) => requestCardHtml(d)).join("");
}

/** Build the markup for a single donation request card. */
function requestCardHtml(d) {
  let actions = "";
  if (d.status === "Pending") {
    actions = `
      <button class="btn btn-sm btn-success rounded-pill px-3" onclick="acceptDonation('${d.id}')">
        <i class="bi bi-check-lg"></i> Accept
      </button>
      <button class="btn btn-sm btn-outline-danger rounded-pill px-3" onclick="rejectDonation('${d.id}')">
        <i class="bi bi-x-lg"></i> Reject
      </button>`;
  } else if (d.status === "Accepted") {
    actions = `
      <button class="btn btn-sm btn-primary rounded-pill px-3" onclick="completeDonation('${d.id}')">
        <i class="bi bi-flag-fill"></i> Mark Completed
      </button>`;
  }

  return `
    <div class="col-12 col-md-6 col-xl-4">
      <div class="donation-card d-flex flex-column h-100">
        <div class="d-flex justify-content-between align-items-start mb-2">
          <div class="d-flex align-items-center gap-2">
            <span class="donation-thumb">${
              d.image
                ? `<img src="${d.image}" style="width:100%;height:100%;border-radius:12px;object-fit:cover;">`
                : '<i class="bi bi-egg-fried"></i>'
            }</span>
            <div>
              <div class="fw-semibold">${escapeHtml(d.foodName)}</div>
              <div class="small text-muted">${escapeHtml(d.foodType)} · ${escapeHtml(d.quantity)}</div>
            </div>
          </div>
          ${statusPillHtml(d.status)}
        </div>
        <div class="donation-meta-row"><i class="bi bi-geo-alt"></i> <span>${escapeHtml(d.address)}</span></div>
        <div class="donation-meta-row"><i class="bi bi-telephone"></i> <span>${escapeHtml(d.contact)}</span></div>
        <div class="donation-meta-row"><i class="bi bi-clock"></i> <span>Prepared: ${formatDateTime(d.preparedTime)}</span></div>
        <div class="donation-meta-row"><i class="bi bi-hourglass-split"></i> <span>Expires: ${formatDateTime(d.expiryTime)}</span></div>
        ${
          d.instructions
            ? `<div class="donation-meta-row"><i class="bi bi-info-circle"></i> <span>${escapeHtml(d.instructions)}</span></div>`
            : ""
        }
        <div class="mt-auto pt-3 d-flex gap-2 flex-wrap">${actions || '<span class="text-muted small">No further action needed.</span>'}</div>
      </div>
    </div>`;
}

/** NGO accepts a pending donation. */
function acceptDonation(id) {
  updateDonationStatus(id, "Accepted", "Donation accepted. The donor has been notified.");
}

/** NGO rejects a pending donation. */
function rejectDonation(id) {
  if (!confirm("Reject this donation request?")) return;
  updateDonationStatus(id, "Rejected", "Donation rejected.", "info");
}

/** NGO marks an accepted donation as completed (delivered). */
function completeDonation(id) {
  updateDonationStatus(id, "Completed", "Marked as completed. Thank you for closing the loop!");
}

/** Shared helper to update a donation's status in localStorage and re-render. */
function updateDonationStatus(id, status, message, toastType = "success") {
  const donations = getDonations();
  const idx = donations.findIndex((d) => d.id === id);
  if (idx === -1) return;
  donations[idx].status = status;
  saveDonations(donations);
  showToast(message, toastType);
  updateStats();
  displayDonationRequests();
}

function resetData() {
    if (confirm("Delete all test data?")) {
        localStorage.clear();
        sessionStorage.clear();
        location.reload();
    }
}