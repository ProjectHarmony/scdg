import { FALLBACK_IMAGE } from './constants';

export function mapPlayer(row) {
  return {
    id: row.id,
    name: row.name,
    role: row.role,
    mmr: row.mmr || 0,
    wins: row.wins || 0,
    losses: row.losses || 0,
    matchesPlayed: row.matches_played || 0,
    isActive: Boolean(row.is_active),
    type: row.type,
    badge: row.badge,
    imageUrl: row.image_url || FALLBACK_IMAGE,
    deckImageUrl: row.deck_image_url || FALLBACK_IMAGE,
    description: row.description,
    combo: row.combo,
    mainText: row.main_text,
    styleText: row.style_text,
  };
}
