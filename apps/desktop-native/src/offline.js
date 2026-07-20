"use strict";

const parameters = new URLSearchParams(window.location.search);
const retryUrl = parameters.get("retry");
const target = parameters.get("target");
const reason = parameters.get("reason");

if (target) document.querySelector("#connection-target").textContent = target;
if (reason) {
  document.querySelector("#reason").textContent = `${reason} Check your connection, then try again. No financial data was changed.`;
}
document.querySelector("#retry").addEventListener("click", () => {
  if (retryUrl) window.location.assign(retryUrl);
});
document.querySelector("#retry").focus();
