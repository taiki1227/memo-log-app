const memoForm = document.getElementById("memoForm");
const noteIdInput = document.getElementById("noteId");
const titleInput = document.getElementById("title");
const bodyInput = document.getElementById("body");
const charCount = document.getElementById("charCount");
const notesList = document.getElementById("notesList");
const notesCount = document.getElementById("notesCount");
const message = document.getElementById("message");
const formTitle = document.getElementById("formTitle");
const saveButton = document.getElementById("saveButton");
const cancelButton = document.getElementById("cancelButton");
const reloadButton = document.getElementById("reloadButton");

const USER_KEY_STORAGE = "memo_log_user_key";
let currentNotes = [];

function getUserKey() {
  const existing = localStorage.getItem(USER_KEY_STORAGE);

  if (existing && /^[A-Za-z0-9_-]{16,80}$/.test(existing)) {
    return existing;
  }

  const generated = crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random()}`;

  const userKey = generated.replaceAll("-", "");
  localStorage.setItem(USER_KEY_STORAGE, userKey);

  return userKey;
}

let userKey = getUserKey();

function setUserKey(nextUserKey) {
  localStorage.setItem(USER_KEY_STORAGE, nextUserKey);
  userKey = nextUserKey;
}

function maskUserKey(value) {
  if (!value) return "";
  if (value.length <= 12) return value;
  return `${value.slice(0, 6)}••••••${value.slice(-6)}`;
}

function isValidUserKey(value) {
  return /^[A-Za-z0-9_-]{16,80}$/.test(value || "");
}

function apiFetch(url, options = {}) {
  const headers = new Headers(options.headers || {});
  headers.set("X-Memo-User-Key", userKey);

  return fetch(url, {
    ...options,
    headers
  });
}

function countChars(text) {
  return Array.from(text || "").length;
}

function setMessage(text, isError = false) {
  message.textContent = text;
  message.classList.toggle("error", isError);

  if (!text) return;

  window.setTimeout(() => {
    message.textContent = "";
    message.classList.remove("error");
  }, 3000);
}

function escapeHtml(text) {
  return String(text || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatDate(value) {
  if (!value) return "-";
  return String(value).replace("T", " ").slice(0, 19);
}

function getDateForFileName() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const hh = String(now.getHours()).padStart(2, "0");
  const mi = String(now.getMinutes()).padStart(2, "0");

  return `${yyyy}${mm}${dd}_${hh}${mi}`;
}

function safeFileName(text) {
  const name = String(text || "memo")
    .trim()
    .replace(/[\\/:*?"<>|]/g, "_")
    .replace(/\s+/g, "_")
    .slice(0, 50);

  return name || "memo";
}

function buildNoteText(note) {
  return [
    `タイトル：${note.title || "無題"}`,
    "",
    note.body || "",
    "",
    "----",
    `文字数：${note.char_count || 0}`,
    `作成：${formatDate(note.created_at)}`,
    `更新：${formatDate(note.updated_at)}`,
    "Memo Log"
  ].join("\n");
}

function buildAllNotesText(notes) {
  return notes
    .map((note, index) => {
      return [
        `# ${index + 1}. ${note.title || "無題"}`,
        "",
        note.body || "",
        "",
        `文字数：${note.char_count || 0}`,
        `作成：${formatDate(note.created_at)}`,
        `更新：${formatDate(note.updated_at)}`,
        ""
      ].join("\n");
    })
    .join("\n==============================\n\n");
}

function downloadTextFile(fileName, text) {
  const blob = new Blob([text], {
    type: "text/plain;charset=utf-8"
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();

  URL.revokeObjectURL(url);
}

function downloadNote(id) {
  const note = currentNotes.find((item) => String(item.id) === String(id));

  if (!note) {
    setMessage("ダウンロード対象のメモが見つかりません。", true);
    return;
  }

  const fileName = `${safeFileName(note.title)}_${getDateForFileName()}.txt`;
  downloadTextFile(fileName, buildNoteText(note));
  setMessage("TXTファイルをダウンロードしました。");
}

function downloadAllNotes() {
  if (currentNotes.length === 0) {
    setMessage("ダウンロードできるメモがありません。", true);
    return;
  }

  const fileName = `memo-log-all_${getDateForFileName()}.txt`;
  downloadTextFile(fileName, buildAllNotesText(currentNotes));
  setMessage("全メモのTXTファイルをダウンロードしました。");
}

function setupDownloadAllButton() {
  if (!reloadButton || document.getElementById("downloadAllButton")) return;

  const button = document.createElement("button");
  button.type = "button";
  button.id = "downloadAllButton";
  button.className = "secondary";
  button.textContent = "全メモTXT保存";
  button.addEventListener("click", downloadAllNotes);

  reloadButton.insertAdjacentElement("afterend", button);
}

function setupRecoveryKeyPanel() {
  if (document.getElementById("recoveryKeyPanel")) return;

  const app = document.querySelector(".app");
  const header = document.querySelector(".app-header");

  if (!app || !header) return;

  const section = document.createElement("section");
  section.id = "recoveryKeyPanel";
  section.className = "card recovery-card";

  section.innerHTML = `
    <div class="recovery-head">
      <div>
        <h2>メモID・復元キー</h2>
        <p>PC・スマホ・別ブラウザで同じメモを見るためのIDです。人には見せないでください。</p>
      </div>
    </div>

    <div class="recovery-key-box">
      <code id="recoveryKeyText">${escapeHtml(maskUserKey(userKey))}</code>
      <div class="recovery-actions">
        <button type="button" class="secondary" id="copyRecoveryKeyButton">IDコピー</button>
        <button type="button" class="secondary" id="toggleRecoveryKeyButton">表示</button>
      </div>
    </div>

    <details class="restore-area">
      <summary>別端末のメモIDで復元する</summary>
      <div class="restore-form">
        <input
          type="text"
          id="restoreKeyInput"
          placeholder="コピーしたメモIDを貼り付け"
          autocomplete="off"
        />
        <button type="button" id="restoreKeyButton">復元</button>
      </div>
      <p class="restore-note">復元すると、このブラウザで表示するメモが入力したIDのメモに切り替わります。</p>
    </details>
  `;

  header.insertAdjacentElement("afterend", section);

  const keyText = document.getElementById("recoveryKeyText");
  const copyButton = document.getElementById("copyRecoveryKeyButton");
  const toggleButton = document.getElementById("toggleRecoveryKeyButton");
  const restoreInput = document.getElementById("restoreKeyInput");
  const restoreButton = document.getElementById("restoreKeyButton");

  let visible = false;

  copyButton?.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(userKey);
      setMessage("メモIDをコピーしました。");
    } catch (error) {
      setMessage("コピーに失敗しました。手動で表示してコピーしてください。", true);
    }
  });

  toggleButton?.addEventListener("click", () => {
    visible = !visible;
    keyText.textContent = visible ? userKey : maskUserKey(userKey);
    toggleButton.textContent = visible ? "隠す" : "表示";
  });

  restoreButton?.addEventListener("click", async () => {
    const nextUserKey = restoreInput.value.trim();

    if (!isValidUserKey(nextUserKey)) {
      setMessage("メモIDの形式が正しくありません。コピーしたIDをそのまま貼り付けてください。", true);
      restoreInput.focus();
      return;
    }

    if (nextUserKey === userKey) {
      setMessage("すでにこのメモIDを使用しています。");
      return;
    }

    const ok = window.confirm("このブラウザのメモIDを切り替えますか？現在のメモは消えませんが、表示対象が変わります。");
    if (!ok) return;

    setUserKey(nextUserKey);
    visible = false;
    keyText.textContent = maskUserKey(userKey);
    toggleButton.textContent = "表示";
    restoreInput.value = "";
    resetForm();
    await loadNotes();

    setMessage("メモIDを復元しました。");
  });
}

function resetForm() {
  noteIdInput.value = "";
  titleInput.value = "";
  bodyInput.value = "";
  charCount.textContent = "0";
  formTitle.textContent = "新規メモ";
  saveButton.textContent = "保存";
  cancelButton.classList.add("hidden");
}

async function loadNotes() {
  notesList.innerHTML = '<p class="empty">読み込み中...</p>';

  try {
    const res = await apiFetch(`/api/notes?ts=${Date.now()}`, {
      method: "GET",
      cache: "no-store"
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || "メモの取得に失敗しました。");
    }

    renderNotes(data.notes || []);
  } catch (error) {
    notesCount.textContent = "取得エラー";
    notesList.innerHTML = `<p class="empty">${escapeHtml(error.message)}</p>`;
  }
}

function renderNotes(notes) {
  currentNotes = notes;
  notesCount.textContent = `${notes.length}件`;

  if (notes.length === 0) {
    notesList.innerHTML = '<p class="empty">まだメモがありません。</p>';
    return;
  }

  notesList.innerHTML = notes
    .map((note) => {
      return `
        <article class="note">
          <h3 class="note-title">${escapeHtml(note.title)}</h3>
          <div class="note-body">${escapeHtml(note.body)}</div>

          <div class="note-meta">
            <span>${note.char_count}文字</span>
            <span>作成：${escapeHtml(formatDate(note.created_at))}</span>
            <span>更新：${escapeHtml(formatDate(note.updated_at))}</span>
          </div>

          <div class="note-actions">
            <button type="button" class="secondary" data-action="download" data-id="${note.id}">TXT保存</button>
            <button type="button" class="secondary" data-action="edit" data-id="${note.id}">編集</button>
            <button type="button" class="danger" data-action="delete" data-id="${note.id}">削除</button>
          </div>
        </article>
      `;
    })
    .join("");
}

bodyInput.addEventListener("input", () => {
  charCount.textContent = String(countChars(bodyInput.value));
});

memoForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const id = noteIdInput.value;
  const title = titleInput.value.trim() || "無題";
  const body = bodyInput.value;
  const payload = { title, body };

  try {
    const res = await apiFetch(id ? `/api/notes/${id}` : "/api/notes", {
      method: id ? "PUT" : "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload),
      cache: "no-store"
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || "保存に失敗しました。");
    }

    resetForm();
    await loadNotes();
    setMessage(id ? "メモを更新しました。" : "メモを保存しました。");
  } catch (error) {
    setMessage(error.message, true);
  }
});

notesList.addEventListener("click", async (event) => {
  const button = event.target.closest("button");
  if (!button) return;

  const id = button.dataset.id;
  const action = button.dataset.action;

  if (action === "download") {
    downloadNote(id);
  }

  if (action === "edit") {
    await startEdit(id);
  }

  if (action === "delete") {
    await deleteNote(id);
  }
});

async function startEdit(id) {
  try {
    const res = await apiFetch(`/api/notes/${id}?ts=${Date.now()}`, {
      method: "GET",
      cache: "no-store"
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || "メモの取得に失敗しました。");
    }

    const note = data.note;
    noteIdInput.value = note.id;
    titleInput.value = note.title;
    bodyInput.value = note.body;
    charCount.textContent = String(countChars(note.body));

    formTitle.textContent = "メモ編集";
    saveButton.textContent = "更新";
    cancelButton.classList.remove("hidden");

    window.scrollTo({ top: 0, behavior: "smooth" });
  } catch (error) {
    setMessage(error.message, true);
  }
}

async function deleteNote(id) {
  const ok = window.confirm("このメモを削除しますか？");
  if (!ok) return;

  try {
    const res = await apiFetch(`/api/notes/${id}`, {
      method: "DELETE",
      cache: "no-store"
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || "削除に失敗しました。");
    }

    await loadNotes();
    setMessage("メモを削除しました。");
  } catch (error) {
    setMessage(error.message, true);
  }
}

setupRecoveryKeyPanel();
setupDownloadAllButton();

cancelButton.addEventListener("click", resetForm);
reloadButton.addEventListener("click", loadNotes);

loadNotes();
