import { Hono } from 'hono'
import { cors } from 'hono/cors'
import type { MiddlewareHandler } from 'hono'
import { createToken, hashPassword, sessionExpiry, verifyPassword } from './auth'
import { addCoins, grantBadge, publicUser, REWARDS, type UserRow } from './coins'
import { searchSchools } from './neis'

type Bindings = {
  DB: D1Database
  NEIS_API_KEY?: string
}

type Variables = {
  user: UserRow
}

type AppEnv = { Bindings: Bindings; Variables: Variables }

const app = new Hono<AppEnv>()

app.use('/api/*', cors())

app.get('/api/health', (c) => c.json({ ok: true, name: '학교 안 아바다' }))

async function getUserByToken(db: D1Database, token: string | undefined): Promise<UserRow | null> {
  if (!token) return null
  const row = await db
    .prepare(
      `SELECT u.* FROM sessions s
       JOIN users u ON u.id = s.user_id
       WHERE s.token = ? AND s.expires_at > datetime('now')`,
    )
    .bind(token)
    .first<UserRow>()
  return row ?? null
}

function bearer(c: { req: { header: (name: string) => string | undefined } }) {
  const auth = c.req.header('Authorization') || ''
  return auth.startsWith('Bearer ') ? auth.slice(7) : undefined
}

const authMiddleware: MiddlewareHandler<AppEnv> = async (c, next) => {
  const user = await getUserByToken(c.env.DB, bearer(c))
  if (!user) return c.json({ error: '로그인이 필요해요!' }, 401)
  c.set('user', user)
  await next()
}

app.get('/api/schools', async (c) => {
  const query = c.req.query('query') || ''
  const result = await searchSchools(query, c.env.NEIS_API_KEY)
  return c.json(result)
})

app.post('/api/auth/register', async (c) => {
  const body = await c.req.json<{
    username?: string
    password?: string
    schoolCode?: string
    schoolName?: string
    grade?: number
    classNum?: number
  }>()

  const username = body.username?.trim() || ''
  const password = body.password || ''
  const schoolCode = body.schoolCode?.trim() || ''
  const schoolName = body.schoolName?.trim() || ''
  const grade = Number(body.grade)
  const classNum = Number(body.classNum)

  if (username.length < 2 || username.length > 20) {
    return c.json({ error: '아이디는 2~20글자로 적어주세요!' }, 400)
  }
  if (password.length < 4) {
    return c.json({ error: '비밀번호는 4글자 이상으로 해주세요!' }, 400)
  }
  if (!schoolCode || !schoolName) {
    return c.json({ error: '학교를 검색해서 골라주세요!' }, 400)
  }
  if (!Number.isInteger(grade) || grade < 1 || grade > 6) {
    return c.json({ error: '학년은 1~6학년 중에서 골라주세요!' }, 400)
  }
  if (!Number.isInteger(classNum) || classNum < 1 || classNum > 20) {
    return c.json({ error: '반은 1~20반 중에서 골라주세요!' }, 400)
  }

  const existing = await c.env.DB.prepare('SELECT id FROM users WHERE username = ?')
    .bind(username)
    .first()
  if (existing) {
    return c.json({ error: '이미 쓰고 있는 아이디예요. 다른 걸로 해볼까요?' }, 409)
  }

  const passwordHash = await hashPassword(password)
  const inserted = await c.env.DB.prepare(
    `INSERT INTO users (username, password_hash, school_code, school_name, grade, class_num, eco_coins)
     VALUES (?, ?, ?, ?, ?, ?, 50)`,
  )
    .bind(username, passwordHash, schoolCode, schoolName, grade, classNum)
    .run()

  const userId = Number(inserted.meta.last_row_id)
  await c.env.DB.prepare(
    'INSERT INTO coin_history (user_id, amount, reason) VALUES (?, 50, ?)',
  )
    .bind(userId, '가입 축하 코인 🎁')
    .run()

  const token = createToken()
  await c.env.DB.prepare(
    'INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)',
  )
    .bind(token, userId, sessionExpiry())
    .run()

  const user = await c.env.DB.prepare('SELECT * FROM users WHERE id = ?')
    .bind(userId)
    .first<UserRow>()

  return c.json({
    token,
    user: publicUser(user!),
    reward: { amount: 50, message: '가입 축하! 에코코인 +50 획득! 🪙' },
  })
})

app.post('/api/auth/login', async (c) => {
  const body = await c.req.json<{ username?: string; password?: string }>()
  const username = body.username?.trim() || ''
  const password = body.password || ''

  const user = await c.env.DB.prepare('SELECT * FROM users WHERE username = ?')
    .bind(username)
    .first<UserRow & { password_hash: string }>()

  if (!user || !(await verifyPassword(password, user.password_hash))) {
    return c.json({ error: '아이디나 비밀번호가 맞지 않아요!' }, 401)
  }

  const token = createToken()
  await c.env.DB.prepare(
    'INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)',
  )
    .bind(token, user.id, sessionExpiry())
    .run()

  return c.json({ token, user: publicUser(user) })
})

app.post('/api/auth/logout', authMiddleware, async (c) => {
  const token = bearer(c)
  if (token) {
    await c.env.DB.prepare('DELETE FROM sessions WHERE token = ?').bind(token).run()
  }
  return c.json({ ok: true })
})

app.get('/api/me', authMiddleware, async (c) => {
  const user = c.get('user')
  const fresh = await c.env.DB.prepare('SELECT * FROM users WHERE id = ?')
    .bind(user.id)
    .first<UserRow>()
  return c.json({ user: publicUser(fresh!) })
})

app.get('/api/me/history', authMiddleware, async (c) => {
  const user = c.get('user')
  const { results } = await c.env.DB.prepare(
    `SELECT id, amount, reason, related_item_id as relatedItemId, created_at as createdAt
     FROM coin_history WHERE user_id = ? ORDER BY id DESC LIMIT 50`,
  )
    .bind(user.id)
    .all()
  return c.json({ history: results })
})

app.get('/api/me/items', authMiddleware, async (c) => {
  const user = c.get('user')
  const { results } = await c.env.DB.prepare(
    `SELECT id, title, description, price, trade_type as tradeType, emoji, image_data as imageData,
            status, created_at as createdAt
     FROM items WHERE user_id = ? ORDER BY id DESC`,
  )
    .bind(user.id)
    .all()

  const donatedCount = await c.env.DB.prepare(
    `SELECT COUNT(*) as count FROM items WHERE user_id = ? AND trade_type = 'donate'`,
  )
    .bind(user.id)
    .first<{ count: number }>()

  return c.json({ items: results, donatedCount: donatedCount?.count ?? 0 })
})

app.get('/api/items', authMiddleware, async (c) => {
  const user = c.get('user')
  const tab = c.req.query('tab') || 'all'

  let sql = `
    SELECT i.id, i.title, i.description, i.price, i.trade_type as tradeType, i.emoji,
           i.image_data as imageData, i.status, i.created_at as createdAt,
           u.username as sellerName, u.grade as sellerGrade, u.class_num as sellerClass,
           i.user_id as sellerId
    FROM items i
    JOIN users u ON u.id = i.user_id
    WHERE i.school_code = ? AND i.status = 'available'
  `
  if (tab === 'donate') {
    sql += ` AND i.trade_type = 'donate'`
  }
  sql += ` ORDER BY i.id DESC LIMIT 100`

  const { results } = await c.env.DB.prepare(sql).bind(user.school_code).all()
  return c.json({ items: results })
})

app.post('/api/items', authMiddleware, async (c) => {
  const user = c.get('user')
  const body = await c.req.json<{
    title?: string
    description?: string
    price?: number
    tradeType?: 'sale' | 'donate'
    emoji?: string
    imageData?: string | null
  }>()

  const title = body.title?.trim() || ''
  const description = body.description?.trim() || ''
  const tradeType = body.tradeType === 'donate' ? 'donate' : 'sale'
  const emoji = (body.emoji || '📦').slice(0, 8)
  const imageData =
    body.imageData && body.imageData.startsWith('data:image/') && body.imageData.length < 400_000
      ? body.imageData
      : null
  const price = tradeType === 'donate' ? 0 : Math.max(0, Math.min(9999, Number(body.price) || 0))

  if (title.length < 1 || title.length > 40) {
    return c.json({ error: '제목은 1~40글자로 적어주세요!' }, 400)
  }
  if (description.length > 300) {
    return c.json({ error: '설명은 300글자 이내로 적어주세요!' }, 400)
  }
  if (tradeType === 'sale' && price < 1) {
    return c.json({ error: '판매할 때는 가격(에코코인)을 적어주세요!' }, 400)
  }

  const inserted = await c.env.DB.prepare(
    `INSERT INTO items (user_id, school_code, title, description, price, trade_type, emoji, image_data)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(user.id, user.school_code, title, description, price, tradeType, emoji, imageData)
    .run()

  const itemId = Number(inserted.meta.last_row_id)
  let rewardAmount: number = REWARDS.registerSale
  let message = `물품 등록 완료! 에코코인 +${REWARDS.registerSale} 획득! 🪙`
  let badges = parseBadgesSafe(user.badges)

  if (tradeType === 'donate') {
    rewardAmount = REWARDS.registerDonate
    message = `나눔 기증 완료! 에코코인 +${REWARDS.registerDonate} 획득! 🎁`
    badges = await grantBadge(c.env.DB, user.id, '나눔 왕')
    message += ' 그리고 「나눔 왕」 뱃지도 받았어요!'
  }

  const ecoCoins = await addCoins(c.env.DB, user.id, rewardAmount, message, itemId)

  return c.json({
    item: {
      id: itemId,
      title,
      description,
      price,
      tradeType,
      emoji,
      imageData,
      status: 'available',
    },
    ecoCoins,
    badges,
    reward: { amount: rewardAmount, message },
  })
})

app.post('/api/items/:id/buy', authMiddleware, async (c) => {
  const user = c.get('user')
  const itemId = Number(c.req.param('id'))

  const item = await c.env.DB.prepare(
    `SELECT * FROM items WHERE id = ? AND school_code = ?`,
  )
    .bind(itemId, user.school_code)
    .first<{
      id: number
      user_id: number
      title: string
      price: number
      trade_type: string
      status: string
    }>()

  if (!item || item.status !== 'available') {
    return c.json({ error: '이미 팔렸거나 없는 물건이에요!' }, 404)
  }
  if (item.trade_type !== 'sale') {
    return c.json({ error: '이 물건은 나눔 기증품이에요. 나눔받기를 눌러주세요!' }, 400)
  }
  if (item.user_id === user.id) {
    return c.json({ error: '내 물건은 살 수 없어요!' }, 400)
  }
  if (user.eco_coins < item.price) {
    return c.json({ error: '에코코인이 부족해요! 물건을 올리거나 나눔을 해봐요!' }, 400)
  }

  await c.env.DB.batch([
    c.env.DB.prepare(`UPDATE items SET status = 'sold' WHERE id = ? AND status = 'available'`).bind(
      itemId,
    ),
    c.env.DB.prepare(
      `INSERT INTO trades (item_id, seller_id, buyer_id, trade_type, price) VALUES (?, ?, ?, 'sale', ?)`,
    ).bind(itemId, item.user_id, user.id, item.price),
    c.env.DB.prepare(`UPDATE users SET eco_coins = eco_coins - ? WHERE id = ?`).bind(
      item.price,
      user.id,
    ),
    c.env.DB.prepare(
      `INSERT INTO coin_history (user_id, amount, reason, related_item_id) VALUES (?, ?, ?, ?)`,
    ).bind(user.id, -item.price, `「${item.title}」 구매 🤝`, itemId),
  ])

  const buyerReward = await addCoins(
    c.env.DB,
    user.id,
    REWARDS.buy,
    `거래 완료! 구매 보상 +${REWARDS.buy} 🪙`,
    itemId,
  )
  await addCoins(
    c.env.DB,
    item.user_id,
    item.price + REWARDS.sell,
    `「${item.title}」 판매 +${item.price} / 보상 +${REWARDS.sell} 🪙`,
    itemId,
  )

  return c.json({
    ok: true,
    ecoCoins: buyerReward,
    reward: {
      amount: REWARDS.buy,
      message: `거래 완료! 구매 보상 에코코인 +${REWARDS.buy} 획득! 🤝`,
    },
  })
})

app.post('/api/items/:id/claim', authMiddleware, async (c) => {
  const user = c.get('user')
  const itemId = Number(c.req.param('id'))

  const item = await c.env.DB.prepare(
    `SELECT * FROM items WHERE id = ? AND school_code = ?`,
  )
    .bind(itemId, user.school_code)
    .first<{
      id: number
      user_id: number
      title: string
      trade_type: string
      status: string
    }>()

  if (!item || item.status !== 'available') {
    return c.json({ error: '이미 나눔 끝났거나 없는 물건이에요!' }, 404)
  }
  if (item.trade_type !== 'donate') {
    return c.json({ error: '이 물건은 판매 물건이에요!' }, 400)
  }
  if (item.user_id === user.id) {
    return c.json({ error: '내가 기증한 물건은 받을 수 없어요!' }, 400)
  }

  await c.env.DB.batch([
    c.env.DB.prepare(
      `UPDATE items SET status = 'donated' WHERE id = ? AND status = 'available'`,
    ).bind(itemId),
    c.env.DB.prepare(
      `INSERT INTO trades (item_id, seller_id, buyer_id, trade_type, price) VALUES (?, ?, ?, 'donate', 0)`,
    ).bind(itemId, item.user_id, user.id),
  ])

  const ecoCoins = await addCoins(
    c.env.DB,
    user.id,
    REWARDS.buy,
    `나눔 받기 완료! +${REWARDS.buy} 🪙`,
    itemId,
  )

  return c.json({
    ok: true,
    ecoCoins,
    reward: {
      amount: REWARDS.buy,
      message: `나눔 받기 완료! 에코코인 +${REWARDS.buy} 획득! 🎁`,
    },
  })
})

app.delete('/api/items/:id', authMiddleware, async (c) => {
  const user = c.get('user')
  const itemId = Number(c.req.param('id'))
  const item = await c.env.DB.prepare('SELECT * FROM items WHERE id = ? AND user_id = ?')
    .bind(itemId, user.id)
    .first()
  if (!item) return c.json({ error: '내 물건만 지울 수 있어요!' }, 404)

  await c.env.DB.prepare('DELETE FROM items WHERE id = ?').bind(itemId).run()
  return c.json({ ok: true })
})

function parseBadgesSafe(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export default app
