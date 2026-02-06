const BASE_URL = process.env.POKERPAL_API_URL;
const API_KEY = process.env.POKERPAL_BOT_API_KEY;

async function apiCall(path) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: {
      "X-Bot-API-Key": API_KEY,
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `API returned ${res.status}`);
  }

  return res.json();
}

export async function get_group_games({ group_name, status }) {
  const query = status ? `?status=${status}` : "";
  return apiCall(
    `/api/bot/groups/${encodeURIComponent(group_name)}/games${query}`
  );
}

export async function get_player_buyins({ player_name, group_name }) {
  const query = group_name
    ? `?group=${encodeURIComponent(group_name)}`
    : "";
  return apiCall(
    `/api/bot/players/${encodeURIComponent(player_name)}/buyins${query}`
  );
}

export async function get_game_players({ game_id }) {
  return apiCall(`/api/bot/games/${game_id}/players`);
}

export async function get_group_summary({ group_name }) {
  return apiCall(
    `/api/bot/groups/${encodeURIComponent(group_name)}/summary`
  );
}

export async function list_groups() {
  return apiCall("/api/bot/groups");
}
