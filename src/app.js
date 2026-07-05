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

const userKey = getUserKey();

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

cancelButton.addEventListener("click", resetForm);
reloadButton.addEventListener("click", loadNotes);

loadNotes();
