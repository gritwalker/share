export const REWARDS = {
  registerSale: 10,
  registerDonate: 30,
  buy: 5,
  sell: 10,
} as const

export type UserRow = {
  id: number
  username: string
  school_code: string
  school_name: string
  grade: number
  class_num: number
  eco_coins: number
  badges: string
}

export function parseBadges(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter((b) => typeof b === 'string') : []
  } catch {
    return []
  }
}

export async function addCoins(
  db: D1Database,
  userId: number,
  amount: number,
  reason: string,
  relatedItemId?: number,
): Promise<number> {
  await db
    .prepare('UPDATE users SET eco_coins = eco_coins + ? WHERE id = ?')
    .bind(amount, userId)
    .run()

  await db
    .prepare(
      'INSERT INTO coin_history (user_id, amount, reason, related_item_id) VALUES (?, ?, ?, ?)',
    )
    .bind(userId, amount, reason, relatedItemId ?? null)
    .run()

  const row = await db
    .prepare('SELECT eco_coins FROM users WHERE id = ?')
    .bind(userId)
    .first<{ eco_coins: number }>()

  return row?.eco_coins ?? 0
}

export async function grantBadge(db: D1Database, userId: number, badge: string): Promise<string[]> {
  const user = await db
    .prepare('SELECT badges FROM users WHERE id = ?')
    .bind(userId)
    .first<{ badges: string }>()

  const badges = parseBadges(user?.badges || '[]')
  if (!badges.includes(badge)) {
    badges.push(badge)
    await db
      .prepare('UPDATE users SET badges = ? WHERE id = ?')
      .bind(JSON.stringify(badges), userId)
      .run()
  }
  return badges
}

export function publicUser(user: UserRow) {
  return {
    id: user.id,
    username: user.username,
    schoolCode: user.school_code,
    schoolName: user.school_name,
    grade: user.grade,
    classNum: user.class_num,
    ecoCoins: user.eco_coins,
    badges: parseBadges(user.badges),
  }
}
