const beginBtn = document.getElementById("beginQuest");
const statusHint = document.getElementById("statusHint");

beginBtn?.addEventListener("click", () => {
  beginBtn.classList.add("is-starting");
  beginBtn.disabled = true;

  if (statusHint) {
    statusHint.textContent = "Your quest begins…";
  }

  window.setTimeout(() => {
    beginBtn.classList.remove("is-starting");
    beginBtn.disabled = false;
    if (statusHint) {
      statusHint.textContent = "Party assembled. The road stretches beyond the mountains.";
    }
  }, 1800);
});
