// ============================================================
// SOLO LEAGUE RPG — shared script
// Every page loads this file. It does two small jobs:
//   1. Toggles the sidebars open/closed on mobile screens
//   2. Highlights whichever nav link matches the current page
// ============================================================

document.addEventListener("DOMContentLoaded", function () {
  // --- 1. mobile nav toggle ---
  var toggleBtn = document.querySelector(".nav-toggle");
  var sidebars = document.querySelectorAll(".sidebar");

  if (toggleBtn) {
    toggleBtn.addEventListener("click", function () {
      sidebars.forEach(function (bar) {
        bar.classList.toggle("open");
      });
    });
  }

  // --- 2. highlight active nav item based on current filename ---
  var currentPage = window.location.pathname.split("/").pop() || "index.html";

  document.querySelectorAll(".nav-item").forEach(function (link) {
    var href = link.getAttribute("href");
    if (href === currentPage) {
      link.classList.add("active");
    }
  });
});
