"use strict";
// 記念チケット用の画面デモです。予約やデータベースは未接続です。
// このタブに保存するデータのキーです。
const KEY = "space-line-simple-v2";
// 最初はアバターAを選びます。
const AVATARS = [
  { id: 1, name: "宇宙飛行士 A" },
  { id: 2, name: "宇宙飛行士 B" },
  { id: 3, name: "宇宙飛行士 C" },
  { id: 4, name: "宇宙飛行士 D" },
];
const $ = (id) => document.getElementById(id);
// 入力文字をHTMLとして実行させないようにします。
const esc = (s) =>
  String(s).replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c],
  );
const avatarUrl = (id) => `assets/avatar-${id}.svg`;
// 保存済みのデータを読み込み、形式を確認します。
function load() {
  try {
    const d = JSON.parse(sessionStorage.getItem(KEY));
    return d &&
      d.version === 2 &&
      typeof d.nickname === "string" &&
      d.nickname.trim() &&
      [...d.nickname].length <= 20 &&
      AVATARS.some((a) => a.id === d.avatarId) &&
      /^SL-[A-F0-9]{10}$/.test(d.ticketId) &&
      Number.isFinite(Date.parse(d.createdAt))
      ? d
      : null;
  } catch {
    return null;
  }
}
// 確認した情報を、このタブ内に保存します。
function save(d) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(d));
    return true;
  } catch {
    return false;
  }
}
// 記念チケットの番号を作ります。本人確認には使いません。
function uid() {
  return "SL-" + crypto.randomUUID().replaceAll("-", "").slice(0, 10).toUpperCase();
}
let data = load(),
  draft = null;
const page = document.body.dataset.page;
// 画面と共通のリセットボタンを表示します。
function shell(html) {
  $("app").innerHTML = /* HTML */ `
    <main>
      ${html}
      <p class="note">
        フロントエンドのデモです。情報はこのタブ内にのみ保存されます。実際の予約・登船には使えません。
      </p>
      <button class="reset" id="reset" type="button">デモデータを削除して最初から</button>
    </main>
  `;
  $("reset").onclick = () => {
    if (confirm("このデモの記念チケットを削除しますか？")) {
      try {
        sessionStorage.removeItem(KEY);
      } catch {}
      location.href = "index.html";
    }
  };
}
// ニックネームとアバターの入力画面です。
function registration(values = data) {
  shell(/* HTML */ `
    <h1>SPACE LINE 記念チケット申込フォーム</h1>
    <p>ニックネームとアバターを選ぶと、記念チケットを受け取れます。</p>
    <p class="help">体験を希望しない方も参加できます。宇宙旅行の体験申し込みは別です。</p>
    <p class="help">1 入力 → 2 確認 → 3 チケット発行</p>
    <form id="register-form">
      <div class="field">
        <label for="nickname">ニックネーム：</label>
        <input
          type="text"
          id="nickname"
          name="nickname"
          maxlength="40"
          required
          autocomplete="nickname"
          aria-describedby="nickname-help"
        />
        <p id="nickname-help" class="help">
          1〜20文字。本名・メールアドレス・電話番号は不要です。
        </p>
      </div>
      <fieldset>
        <legend>アバター（初期設定は A）：</legend>
        <div class="avatars">
          ${AVATARS.map(
            (a) => /* HTML */ `
              <label class="avatar-option">
                <input
                  type="radio"
                  name="avatar"
                  value="${a.id}"
                  ${a.id === (values?.avatarId || 1) ? "checked" : ""}
                />
                <img src="${avatarUrl(a.id)}" alt="" />
                <span>${a.name}</span>
              </label>
            `,
          ).join("")}
        </div>
      </fieldset>
      <p id="form-error" role="alert" class="error"></p>
      <button type="submit">入力内容を確認する</button>
    </form>
    ${data ? '<p><a href="ticket.html">発行済みの記念チケットを見る</a></p>' : ""}
  `);
  $("nickname").value = values?.nickname || "";
  $("nickname").placeholder = "例：そら";
  $("register-form").onsubmit = (e) => {
    // フォーム送信によるページの再読み込みを止めます。
    e.preventDefault();

    // 前後の空白を取り除きます。
    const nickname = $("nickname").value.trim();
    if (!nickname || [...nickname].length > 20) {
      $("form-error").textContent = "ニックネームを1〜20文字で入力してください。";
      $("nickname").focus();
      return;
    }
    const id = Number(new FormData(e.currentTarget).get("avatar"));
    if (!AVATARS.some((a) => a.id === id)) return;

    // 発行前の情報を一時的に保持します。
    draft = {
      version: 2,
      nickname,
      avatarId: id,
      ticketId: data?.ticketId || uid(),
      createdAt: data?.createdAt || new Date().toISOString(),
    };
    confirmation();
  };
}
// 入力内容を確認します。修正することもできます。
function confirmation() {
  shell(/* HTML */ `
    <h1>入力内容の確認</h1>
    <p class="help">1 入力 → 2 確認 → 3 チケット発行</p>
    <table class="summary">
      <tr>
        <th>ニックネーム</th>
        <td>${esc(draft.nickname)}</td>
      </tr>
      <tr>
        <th>アバター</th>
        <td>
          <img src="${avatarUrl(draft.avatarId)}" alt="" />
          ${AVATARS.find((a) => a.id === draft.avatarId).name}
        </td>
      </tr>
    </table>
    <p>この内容で記念チケットを発行します。体験の予約は行われません。</p>
    <p id="confirm-error" role="alert" class="error"></p>
    <div class="actions">
      <button id="issue" type="button">記念チケットを発行する</button>
      <button id="edit" type="button">修正する</button>
    </div>
  `);
  $("edit").onclick = () => registration(draft);
  $("issue").onclick = () => {
    // 保存に成功した場合だけ、チケット画面へ移動します。
    if (save(draft)) location.href = "ticket.html";
    else
      $("confirm-error").textContent =
        "保存できません。ブラウザでサイトデータの保存を許可してください。";
  };
}
// 発行日を日本語の日付に変換します。
function date() {
  return new Date(data.createdAt).toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}
// 長い名前が枠からはみ出ないように文字を小さくします。
function fitted(ctx, text, x, y, width, size, min = 18) {
  while (size > min) {
    ctx.font = `bold ${size}px sans-serif`;
    if (ctx.measureText(text).width <= width) break;
    size--;
  }
  ctx.font = `bold ${size}px sans-serif`;
  ctx.fillText(text, x, y, width);
}
// 横向きのチケットをCanvasに描きます。表示と保存には同じ画像を使います。
async function makeTicket() {
  const c = document.createElement("canvas");
  c.width = 1800;
  c.height = 680;
  // 背景、見出し、切り取り線を順番に描きます。
  const x = c.getContext("2d");
  x.fillStyle = "#f8f5ec";
  x.fillRect(0, 0, 1800, 680);
  x.fillStyle = "#243344";
  x.fillRect(0, 0, 1800, 112);
  x.fillStyle = "white";
  x.font = "bold 43px sans-serif";
  x.fillText("SPACE LINE", 55, 72);
  x.font = "24px sans-serif";
  x.fillText("SOUVENIR TICKET / 記念乗船券", 765, 72);
  x.fillText("PASSENGER COPY", 1405, 72);
  x.strokeStyle = "#b7b1a5";
  x.lineWidth = 2;
  x.strokeRect(18, 18, 1764, 644);
  x.setLineDash([10, 10]);
  x.beginPath();
  x.moveTo(1350, 112);
  x.lineTo(1350, 660);
  x.stroke();
  x.setLineDash([]);
  // 選んだアバター画像の読み込みを待ちます。
  const a = new Image();
  await new Promise((ok, no) => {
    a.onload = ok;
    a.onerror = no;
    a.src = avatarUrl(data.avatarId);
  });
  // drawImageの数値は、左位置・上位置・幅・高さです。
  x.drawImage(a, 55, 155, 135, 135);
  x.fillStyle = "#666";
  x.font = "20px sans-serif";
  x.fillText("PASSENGER / お名前", 230, 170);
  x.fillStyle = "#151515";
  fitted(x, data.nickname, 230, 232, 1050, 52);
  x.fillStyle = "#666";
  x.font = "20px sans-serif";
  // 出発地と行き先を描きます。
  x.fillText("FROM / 出発地", 55, 337);
  x.fillText("TO / 行き先", 710, 337);
  x.fillStyle = "#151515";
  x.font = "bold 64px sans-serif";
  x.fillText("EARTH", 55, 410);
  x.fillText("SPACE", 710, 410);
  x.font = "38px sans-serif";
  x.fillText("→", 550, 402);
  x.font = "23px sans-serif";
  x.fillText("地球", 55, 454);
  x.fillText("宇宙の旅へ", 710, 454);
  x.strokeStyle = "#c5bfb2";
  x.beginPath();
  x.moveTo(55, 490);
  x.lineTo(1295, 490);
  x.stroke();
  x.fillStyle = "#666";
  x.font = "18px sans-serif";
  // 発行日と記念番号を描きます。
  x.fillText("ISSUED / 発行日", 55, 535);
  x.fillText("TICKET NO. / 記念番号", 470, 535);
  x.fillStyle = "#222";
  x.font = "27px monospace";
  x.fillText(date(), 55, 578);
  x.fillText(data.ticketId, 470, 578);
  x.font = "21px sans-serif";
  x.fillStyle = "#555";
  x.fillText("記念用です。実際の搭乗券ではありません。", 55, 635);
  x.fillStyle = "#666";
  x.font = "19px sans-serif";
  x.fillText("PASSENGER", 1400, 170);
  x.fillStyle = "#222";
  fitted(x, data.nickname, 1400, 217, 330, 31, 15);
  x.font = "bold 31px sans-serif";
  x.fillText("EARTH → SPACE", 1400, 320);
  x.font = "19px sans-serif";
  x.fillText("記念乗船券", 1400, 367);
  x.fillText("搭乗日時・座席指定なし", 1400, 404);
  x.font = "19px monospace";
  x.fillText(data.ticketId, 1400, 507);
  x.font = "16px sans-serif";
  x.fillStyle = "#777";
  x.fillText("QRコードは未発行です", 1400, 570);
  x.fillText("体験申し込みは別途ご案内", 1400, 599); // 描いたチケットをPNG画像に変換します。
  return c.toDataURL("image/png");
}
// チケット画像を表示し、保存・印刷ボタンを設定します。
function ticket() {
  if (!data) {
    location.replace("index.html");
    return;
  }
  shell(/* HTML */ `
    <h1>記念チケットを発行しました</h1>
    <p>${esc(data.nickname)} さん、ご参加ありがとうございます。</p>
    <p>画像を保存してお持ち帰りください。チケットを受け取るだけでも参加完了です。</p>
    <p id="image-status" role="status">チケット画像を作成しています…</p>
    <img
      class="ticket-image"
      id="ticket-image"
      alt="${esc(data.nickname)}さんの横向き記念乗船券"
      hidden
    />
    <p class="help">
      お名前：${esc(data.nickname)} ／
      アバター：${AVATARS.find((a) => a.id === data.avatarId).name}
      <br />
      出発地：地球 ／ 行き先：宇宙 ／ 体験の予約：未実施
    </p>
    <div class="actions">
      <button id="download" type="button" disabled>チケット画像を保存</button>
      <button id="print" type="button" disabled>チケットを印刷</button>
    </div>
    <p class="help">
      スマートフォンで保存が始まらない場合は、上の画像を長押ししてください。
    </p>
    <p><a href="index.html">入力内容を変更する</a></p>
  `);
  makeTicket()
    .then((url) => {
      $("ticket-image").src = url;
      $("ticket-image").hidden = false;
      $("download").disabled = false;
      $("print").disabled = false;
      $("image-status").textContent = "チケット画像を作成しました。";
      $("download").onclick = () => {
        const a = document.createElement("a");
        a.href = url; // 保存する画像のファイル名です。
        a.download = `SPACE_LINE_${data.ticketId}.png`;
        document.body.append(a);
        a.click();
        a.remove();
        $("image-status").textContent =
          "保存が始まらない場合は、チケット画像を長押ししてください。";
      };
      $("print").onclick = () => window.print();
    })
    .catch(() => {
      $("image-status").textContent =
        "画像を作成できませんでした。ページを再読み込みしてください。";
    });
}
// 体験申し込みは別機能です。この画面では予約しません。
function reservation() {
  if (!data) {
    location.replace("index.html");
    return;
  }
  shell(/* HTML */ `
    <h1>体験申し込みについて</h1>
    <p>${esc(data.nickname)} さんの記念チケットは発行済みです。</p>
    <p>宇宙旅行の体験申し込みは、記念チケットの発行とは別です。</p>
    <p>
      予約時間などの申し込み方法は検討中です。このデモでは体験の予約を受け付けていません。
    </p>
    <p><a href="ticket.html">記念チケットに戻る</a></p>
  `);
}
// HTMLのdata-pageに合わせて画面を切り替えます。
if (page === "register") registration();
else if (page === "ticket") ticket();
else if (page === "reservation") reservation();
