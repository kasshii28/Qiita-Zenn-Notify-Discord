// 環境変数をenvで取得できるように
const env = (() =>  new Proxy({e : PropertiesService.getScriptProperties()}, {
    get: (t, p) => t.e ? t.e.getProperty(p) : void 0,
    set: (t, k, v) => t.e ? t.e.setProperty(k, v) : void 0
}))();

const Q_V = env.DiscordBot_Qiita
const Z_V = env.DiscordBot_Zenn
const P_V = env.Discord_Bot

// Qiita,Zenn定数定義
const CONSTANTS = {
  QIITA: {
    API_URL: "https://qiita.com/api/v2/items?page=3&per_page=100",
    ICON_URL: "https://cdn.qiita.com/assets/favicons/public/apple-touch-icon-ec5ba42a24ae923f16825592efdc356f.png",
    BOT_NAME: "Qiitaくん"
  },
  ZENN: {
    API_URL: "https://zenn.dev/api/articles?order=latest&page=2",
    ICON_URL: "https://drive.google.com/uc?export=view&id=1Xefdr8iqm8mxnqFTTXQXxBhRSFuTUPuF",
    BOT_NAME: "Zennくん"
  },
  DISCORD: {
    COLOR: 0x3ea8ff
  }
};

// ユーティリティ関数
function formatDate(date) {
  return Utilities.formatDate(date, Session.getScriptTimeZone(), "yyyy-MM-dd");
}

function createDiscordMessage(username, content, embeds) {
  return {
    username,
    content,
    tts: false,
    embeds
  };
}

function postToDiscord(webhookUrl, message) {
  const options = {
    method: "POST",
    headers: {
      "Content-type": "application/json"
    },
    payload: JSON.stringify(message),
    muteHttpExceptions: true
  };

  try {
    const response = UrlFetchApp.fetch(webhookUrl, options);
    Logger.log(response.getContentText());
    return true;
  } catch (error) {
    Logger.log(`Error posting to Discord: ${error.message}`);
    return false;
  }
}

// 今日の日付と合致しているか
function CheckDate(today, created_at, updated_at) {
  const today_Str = formatDate(today);
  const created_at_Str = formatDate(new Date(created_at));
  const updated_at_Str = formatDate(new Date(updated_at));

  return today_Str === created_at_Str || today_Str === updated_at_Str;
}

// 記事データの共通インターフェース
function createArticleData(title, url, likes, userImage, userName, createdAt, emoji = '') {
  return {
    title,
    url,
    likes,
    userImage,
    userName,
    createdAt,
    emoji
  };
}

// 記事取得の共通処理
function fetchArticles(url, options = {}) {
  try {
    const response = UrlFetchApp.fetch(url, options);
    return JSON.parse(response.getContentText());
  } catch (error) {
    Logger.log(`Error fetching articles: ${error.message}`);
    return null;
  }
}

// Qiitaのいいねが多い順に3つの記事を取得
function QiitaGetLikedItems(items) {
  if (!items) return [];
  
  const today = new Date();
  const filteredItems = items.filter(item => 
    CheckDate(today, item.created_at, item.updated_at)
  );

  return filteredItems
    .sort((a, b) => b.likes_count - a.likes_count)
    .slice(0, 3)
    .map(item => createArticleData(
      item.title,
      item.url,
      item.likes_count,
      item.user.profile_image_url,
      item.user.name,
      item.created_at
    ));
}

// Qiitaの記事の埋め込み設定
function QiitaEmbedMessage(data) {
  const embeds = data.map(item => ({
    title: item.title,
    description: `いいね数 : ${item.likes}`,
    url: item.url,
    thumbnail: { url: item.userImage },
    image: { url: CONSTANTS.QIITA.ICON_URL },
    name: item.userName,
    color: CONSTANTS.DISCORD.COLOR
  }));

  const message = createDiscordMessage(
    CONSTANTS.QIITA.BOT_NAME,
    "Qiita 今日の人気記事",
    embeds
  );
  
  postToDiscord(P_V, message);
}

// Qiitaの記事一覧を取得
function FetchQiitaItems() {
  const items = fetchArticles(CONSTANTS.QIITA.API_URL, {
    headers: {
      'Authorization': 'Bearer ' + env.MyToken_Qiita
    }
  });
  
  if (items) {
    const data = QiitaGetLikedItems(items);
    if (data.length > 0) {
      QiitaEmbedMessage(data);
    }
  }
}

// Zennのいいねが多い順に3つの記事を取得
function ZennGetLikedItems(items) {
  if (!items || !items.articles) return [];
  
  const today = new Date();
  const filteredItems = items.articles.filter(item => 
    CheckDate(today, item.published_at, item.body_updated_at)
  );

  return filteredItems
    .sort((a, b) => b.liked_count - a.liked_count)
    .slice(0, 3)
    .map(item => createArticleData(
      item.title,
      item.path,
      item.liked_count,
      item.user.avatar_small_url,
      item.user.name,
      item.published_at,
      item.emoji
    ));
}

// Zennの記事の埋め込み設定
function ZennEmbedMessage(data) {
  const embeds = data.map(item => ({
    title: `${item.title} ${item.emoji}`,
    description: `いいね数 : ${item.likes}`,
    url: `https://zenn.dev${item.url}`,
    thumbnail: { url: item.userImage },
    image: { url: CONSTANTS.ZENN.ICON_URL },
    name: item.userName,
    color: CONSTANTS.DISCORD.COLOR
  }));

  const message = createDiscordMessage(
    CONSTANTS.ZENN.BOT_NAME,
    "Zenn 今日の人気記事",
    embeds
  );
  
  postToDiscord(P_V, message);
}

// Zennの記事一覧を取得
function FetchZennItems() {
  const items = fetchArticles(CONSTANTS.ZENN.API_URL);
  
  if (items) {
    const data = ZennGetLikedItems(items);
    if (data.length > 0) {
      ZennEmbedMessage(data);
    }
  }
}

function main() {
    FetchQiitaItems();
    FetchZennItems();
}