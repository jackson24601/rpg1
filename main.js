const beginBtn = document.getElementById("beginQuest");
const statusHint = document.getElementById("statusHint");

beginBtn?.addEventListener("click", () => {
  beginBtn.classList.add("is-starting");
  beginBtn.disabled = true;

  if (statusHint) {
    statusHint.textContent = "Gathering heroes…";
  }

  window.setTimeout(() => {
    window.location.href = "party.html";
  }, 700);
});
