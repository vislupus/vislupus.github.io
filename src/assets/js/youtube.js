// Леко вграждане на YouTube: iframe-ът се зарежда чак при клик (без бисквитки преди това).
document.querySelectorAll(".yt[data-yt]").forEach((box) => {
  box.addEventListener("click", () => {
    const f = document.createElement("iframe");
    f.src = `https://www.youtube-nocookie.com/embed/${box.dataset.yt}?autoplay=1&rel=0${box.dataset.start || ""}`;
    f.title = box.querySelector("img")?.alt || "YouTube";
    f.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
    f.allowFullscreen = true;
    box.replaceChildren(f);
  }, { once: true });
});
