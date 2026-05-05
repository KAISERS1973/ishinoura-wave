const INSTAGRAM_ACCESS_TOKEN = process.env.INSTAGRAM_ACCESS_TOKEN ?? "";
const INSTAGRAM_ACCOUNT_ID   = process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID ?? "";

export async function postToInstagram(videoUrl, caption) {
  console.log("  Instagram: メディアコンテナ作成中...");
  const containerRes = await fetch(
    `https://graph.facebook.com/v20.0/${INSTAGRAM_ACCOUNT_ID}/media`,
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
      `https://graph.facebook.com/v20.0/${container.id}?fields=status_code,status&access_token=${INSTAGRAM_ACCESS_TOKEN}`
    );
    const s = await statusRes.json();
    status = s.status_code;
    console.log(`  Status: ${status} (${i + 1}/30)${s.status ? ` | ${s.status}` : ""}`);
    if (status === "FINISHED") break;
    if (status === "ERROR") throw new Error(`動画処理エラー: ${JSON.stringify(s)}`);
  }
  if (status !== "FINISHED") throw new Error("タイムアウト: 動画処理が完了しませんでした");
  console.log("  投稿中...");
  const publishRes = await fetch(
    `https://graph.facebook.com/v20.0/${INSTAGRAM_ACCOUNT_ID}/media_publish`,
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

export async function postToStories(videoUrl) {
  console.log("  Stories: メディアコンテナ作成中...");
  const containerRes = await fetch(
    `https://graph.facebook.com/v20.0/${INSTAGRAM_ACCOUNT_ID}/media`,
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
      `https://graph.facebook.com/v20.0/${container.id}?fields=status_code,status&access_token=${INSTAGRAM_ACCESS_TOKEN}`
    );
    const s = await statusRes.json();
    status = s.status_code;
    console.log(`  Stories Status: ${status} (${i + 1}/30)${s.status ? ` | ${s.status}` : ""}`);
    if (status === "FINISHED") break;
    if (status === "ERROR") throw new Error(`Stories処理エラー: ${JSON.stringify(s)}`);
  }
  if (status !== "FINISHED") throw new Error("タイムアウト: Stories処理が完了しませんでした");
  console.log("  Stories投稿中...");
  const publishRes = await fetch(
    `https://graph.facebook.com/v20.0/${INSTAGRAM_ACCOUNT_ID}/media_publish`,
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
