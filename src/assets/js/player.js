// Плейър за песните: списъкът идва от <li data-song='{...}'>; долна лента с управление, разбъркване, повторение.
(() => {
  const player = document.querySelector("[data-player]");
  const items = [...document.querySelectorAll("[data-song]")];
  if (!player || !items.length) return;
  const audio = player.querySelector("audio");
  const songs = items.map((li) => ({ ...JSON.parse(li.dataset.song), el: li }));
  const $ = (s) => player.querySelector(s);
  const cover = $(".player-cover"), title = $(".player-title"), artist = $(".player-artist");
  const seek = $("[data-player-seek]"), cur = $("[data-player-current]"), dur = $("[data-player-duration]"), vol = $("[data-player-volume]");
  const shuffleBtn = $("[data-player-shuffle]"), repeatBtn = $("[data-player-repeat]");
  let order = songs.map((_, i) => i), pos = 0, shuffle = false, repeat = false;
  const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
  const store = { get: (k) => { try { return localStorage.getItem(k); } catch { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch { /* ignore */ } } };
  audio.volume = Number(store.get("volume") ?? .9); vol.value = audio.volume;

  const current = () => songs[order[pos]];
  const mark = () => {
    songs.forEach((s) => s.el.classList.toggle("is-playing", s === current() && !audio.paused));
    player.classList.toggle("is-playing", !audio.paused);
  };
  const load = (song) => {
    audio.src = song.src;
    cover.src = song.cover || ""; cover.hidden = !song.cover;
    title.textContent = song.title; artist.textContent = song.artist || "";
    dur.textContent = song.duration ? fmt(song.duration) : "0:00";
    player.hidden = false; document.body.classList.add("player-open");
    history.replaceState(null, "", `#${song.slug}`);
    if ("mediaSession" in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({ title: song.title, artist: song.artist, artwork: song.cover ? [{ src: new URL(song.cover, location.href).href, sizes: "512x512" }] : [] });
      navigator.mediaSession.setActionHandler("previoustrack", prev);
      navigator.mediaSession.setActionHandler("nexttrack", next);
    }
  };
  const play = (i) => { if (i != null) { pos = order.indexOf(i); load(current()); } audio.play().catch(() => {}); mark(); };
  const next = () => { if (pos + 1 < order.length) { pos++; load(current()); play(); } else if (repeat) { pos = 0; load(current()); play(); } else { audio.pause(); mark(); } };
  const prev = () => { if (audio.currentTime > 3 || pos === 0) { audio.currentTime = 0; return; } pos--; load(current()); play(); };
  const reshuffle = () => { const cur = order[pos]; order = songs.map((_, i) => i); if (shuffle) { for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; } order.splice(order.indexOf(cur), 1); order.unshift(cur); pos = 0; } else pos = order.indexOf(cur); };

  document.querySelectorAll("[data-play]").forEach((b) => b.addEventListener("click", () => {
    const i = songs.findIndex((s) => s.slug === b.dataset.play);
    if (i === order[pos] && !player.hidden && audio.src) { if (audio.paused) play(); else { audio.pause(); mark(); } } else play(i);
  }));
  document.querySelector("[data-play-all]")?.addEventListener("click", () => { shuffle = false; shuffleBtn.setAttribute("aria-pressed", "false"); reshuffle(); play(order[0]); });
  document.querySelector("[data-shuffle-all]")?.addEventListener("click", () => { shuffle = true; shuffleBtn.setAttribute("aria-pressed", "true"); pos = Math.floor(Math.random() * songs.length); reshuffle(); play(order[0]); });
  $("[data-player-toggle]").addEventListener("click", () => { if (!audio.src) return play(order[0]); if (audio.paused) play(); else { audio.pause(); mark(); } });
  $("[data-player-next]").addEventListener("click", next);
  $("[data-player-prev]").addEventListener("click", prev);
  shuffleBtn.addEventListener("click", () => { shuffle = !shuffle; shuffleBtn.setAttribute("aria-pressed", String(shuffle)); reshuffle(); });
  repeatBtn.addEventListener("click", () => { repeat = !repeat; repeatBtn.setAttribute("aria-pressed", String(repeat)); });
  $("[data-player-close]").addEventListener("click", () => { audio.pause(); player.hidden = true; document.body.classList.remove("player-open"); mark(); });
  audio.addEventListener("timeupdate", () => { if (audio.duration) { seek.value = Math.round((audio.currentTime / audio.duration) * 1000); cur.textContent = fmt(audio.currentTime); } });
  audio.addEventListener("loadedmetadata", () => { if (audio.duration) dur.textContent = fmt(audio.duration); });
  audio.addEventListener("ended", next);
  audio.addEventListener("play", mark); audio.addEventListener("pause", mark);
  seek.addEventListener("input", () => { if (audio.duration) audio.currentTime = (seek.value / 1000) * audio.duration; });
  vol.addEventListener("input", () => { audio.volume = Number(vol.value); store.set("volume", vol.value); });
  document.addEventListener("keydown", (e) => { if (e.target.matches("input, textarea") || player.hidden) return; if (e.code === "Space") { e.preventDefault(); $("[data-player-toggle]").click(); } });
  // Ако адресът е #slug – скрол до песента (без автоматично пускане).
  if (location.hash) document.getElementById(location.hash.slice(1))?.scrollIntoView({ block: "center" });
})();
