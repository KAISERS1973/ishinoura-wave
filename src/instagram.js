const INSTAGRAM_ACCESS_TOKEN = process.env.INSTAGRAM_ACCESS_TOKEN ?? "";
const INSTAGRAM_ACCOUNT_ID   = process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID ?? "";

const GRAPH_API_VERSION = "v22.0";
const MAX_RETRIES   = 1;
const RETRY_DELAYS  = [60_000];

async function attemptReelsPost(videoUrl, caption, attemptNum) {
  console.log(`  Instagram: メディアコンテナ作成中... (試行 ${attemptNum})`);
  const containerRes = await fetch(
    `https://graph.facebook.com/${GRAPH_API_VERSION}/${INSTAGRAM_ACCOUNT_ID}/media`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        media_type: "REELS",
        video_url: videoUrl,
        caption,
        share_to_feed: true,
        access_token: INSTAGRAM_ACCESS_TOKEN,
      }),
    }
  );
  const container = await containerRes.json();
  if (!container.id) throw new Error(`コンテナ作成失敗: ${JSON.stringify(container)}`);
  console.log(`  Container ID: ${container.id}`);
  console.log("  動画処理中...");
  let status = "IN_PROGRESS";
  for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 10000));
    const statusRes = await fetch(
      `https://graph.facebook.com/${GRAPH_API_VERSION}/${INSTAGRAM_ACCOUNT_ID}/media/${container.id}?fields=status_code,status&access_token=${INSTAGRAM_ACCESS_TOKEN}`
    );
    const s = await statusRes.json();

    if (s.error) {
      throw new Error(`ステータス取得エラー: ${JSON.stringify(s.error)}`);
    }

    if (!s.status_code && i === 0) {
      console.log(`  ⚠️ 未知レスポンス: ${JSON.stringify(s)}`);
    }

    status = s.status_code;
    console.log(`  Status: ${status} (${i + 1}/30)${s.status ? ` | ${s.status}` : ""}`);
    if (status === "FINISHED") break;
    if (status === "ERROR") throw new Error(`動画処理エラー: ${JSON.stringify(s)}`);
  }
  if (status !== "FINISHED") throw new Error("タイムアウト: 動画処理が完了しませんでした");
  console.log("  投稿中...");
  const publishRes = await fetch(
    `https://graph.facebook.com/${GRAPH_API_VERSION}/${INSTAGRAM_ACCOUNT_ID}/media_publish`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        creation_id: container.id,
        access_token: INSTAGRAM_ACCESS_TOKEN,
      }),
    }
  );
  const published = await publishRes.json();
  if (!published.id) throw new Error(`投稿失敗: ${JSON.stringify(published)}`);
  return published.id;
}

export async function postToInstagram(videoUrl, caption) {
  let lastError;
  for (let attempt = 1; attempt <= MAX_RETRIES + 1; attempt++) {
    try {
      return await attemptReelsPost(videoUrl, caption, attempt);
    } catch (err) {
      lastError = err;
      console.error(`  ❌ Reels試行 ${attempt} 失敗: ${err.message}`);
      if (attempt > MAX_RETRIES) break;
      const wait = RETRY_DELAYS[attempt - 1];
      console.log(`  ⏳ ${wait / 1000}秒待機してリトライします...`);
      await new Promise(r => setTimeout(r, wait));
    }
  }
  throw new Error(`Instagram投稿が${MAX_RETRIES + 1}回試行しても失敗: ${lastError.message}`);
}

async function attemptStoriesPost(videoUrl, attemptNum) {
  console.log(`  Stories: メディアコンテナ作成中... (試行 ${attemptNum})`);
  const containerRes = await fetch(
    `https://graph.facebook.com/${GRAPH_API_VERSION}/${INSTAGRAM_ACCOUNT_ID}/media`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        media_type: "STORIES",
        video_url: videoUrl,
        access_token: INSTAGRAM_ACCESS_TOKEN,
      }),
    }
  );
  const container = await containerRes.json();
  if (!container.id) throw new Error(`Storiesコンテナ作成失敗: ${JSON.stringify(container)}`);
  console.log(`  Stories Container ID: ${container.id}`);
  console.log("  Stories動画処理中...");
  let status = "IN_PROGRESS";
  for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 10000));
    const statusRes = await fetch(
      `https://graph.facebook.com/${GRAPH_API_VERSION}/${INSTAGRAM_ACCOUNT_ID}/media/${container.id}?fields=status_code,status&access_token=${INSTAGRAM_ACCESS_TOKEN}`
    );
    const s = await statusRes.json();

    if (s.error) {
      throw new Error(`Storiesステータス取得エラー: ${JSON.stringify(s.error)}`);
    }

    if (!s.status_code && i === 0) {
      console.log(`  ⚠️ 未知レスポンス: ${JSON.stringify(s)}`);
    }

    status = s.status_code;
    console.log(`  Stories Status: ${status} (${i + 1}/30)${s.status ? ` | ${s.status}` : ""}`);
    if (status === "FINISHED") break;
    if (status === "ERROR") throw new Error(`Stories処理エラー: ${JSON.stringify(s)}`);
  }
  if (status !== "FINISHED") throw new Error("タイムアウト: Stories処理が完了しませんでした");
  console.log("  Stories投稿中...");
  const publishRes = await fetch(
    `https://graph.facebook.com/${GRAPH_API_VERSION}/${INSTAGRAM_ACCOUNT_ID}/media_publish`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        creation_id: container.id,
        access_token: INSTAGRAM_ACCESS_TOKEN,
      }),
    }
  );
  const published = await publishRes.json();
  if (!published.id) throw new Error(`Stories投稿失敗: ${JSON.stringify(published)}`);
  return published.id;
}

export async function postToStories(videoUrl) {
  let lastError;
  for (let attempt = 1; attempt <= MAX_RETRIES + 1; attempt++) {
    try {
      return await attemptStoriesPost(videoUrl, attempt);
    } catch (err) {
      lastError = err;
      console.error(`  ❌ Stories試行 ${attempt} 失敗: ${err.message}`);
      if (attempt > MAX_RETRIES) break;
      const wait = RETRY_DELAYS[attempt - 1];
      console.log(`  ⏳ ${wait / 1000}秒待機してリトライします...`);
      await new Promise(r => setTimeout(r, wait));
    }
  }
  throw new Error(`Stories投稿が${MAX_RETRIES + 1}回試行しても失敗: ${lastError.message}`);
}
