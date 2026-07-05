import { connect } from "@tidbcloud/serverless";

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
}

function getConnection(env) {
  const url = env.TIDB_URL;

  if (!url) {
    throw new Error("TiDB connection URL is not set.");
  }

  return connect({ url });
}

function countChars(text) {
  return Array.from(text || "").length;
}

function getRows(result) {
  if (Array.isArray(result?.rows)) return result.rows;
  if (Array.isArray(result?.results)) return result.results;
  if (Array.isArray(result?.data)) return result.data;
  if (Array.isArray(result?.[0])) return result[0];
  if (Array.isArray(result)) return result;
  return [];
}

function getUserKey(request) {
  const userKey = request.headers.get("X-Memo-User-Key");

  if (!userKey || !/^[A-Za-z0-9_-]{16,80}$/.test(userKey)) {
    throw new Error("Invalid user key.");
  }

  return userKey;
}

function getId(context) {
  const id = Number(context.params.id);

  if (!Number.isInteger(id) || id <= 0) {
    throw new Error("Invalid note id.");
  }

  return id;
}

export async function onRequest(context) {
  const { request, env } = context;

  try {
    if (request.method === "GET") {
      return await getNote(context, request, env);
    }

    if (request.method === "PUT") {
      return await updateNote(context, request, env);
    }

    if (request.method === "DELETE") {
      return await deleteNote(context, request, env);
    }

    return json({ error: "Method Not Allowed" }, 405);
  } catch (error) {
    return json({ error: error.message || "Internal Server Error" }, 500);
  }
}

async function getNote(context, request, env) {
  const id = getId(context);
  const userKey = getUserKey(request);
  const conn = getConnection(env);

  const result = await conn.execute(
    `
      SELECT
        id,
        title,
        body,
        char_count,
        created_at,
        updated_at
      FROM memo_log.notes
      WHERE id = ?
        AND user_key = ?
      LIMIT 1
    `,
    [id, userKey]
  );

  const note = getRows(result)[0];

  if (!note) {
    return json({ error: "Note not found." }, 404);
  }

  return json({ note });
}

async function updateNote(context, request, env) {
  const id = getId(context);
  const userKey = getUserKey(request);
  const conn = getConnection(env);
  const input = await request.json();

  const title = String(input.title || "").trim() || "無題";
  const body = String(input.body || "");
  const charCount = countChars(body);

  await conn.execute(
    `
      UPDATE memo_log.notes
      SET
        title = ?,
        body = ?,
        char_count = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
        AND user_key = ?
    `,
    [title, body, charCount, id, userKey]
  );

  return json({
    ok: true
  });
}

async function deleteNote(context, request, env) {
  const id = getId(context);
  const userKey = getUserKey(request);
  const conn = getConnection(env);

  await conn.execute(
    `
      DELETE FROM memo_log.notes
      WHERE id = ?
        AND user_key = ?
    `,
    [id, userKey]
  );

  return json({
    ok: true
  });
}
