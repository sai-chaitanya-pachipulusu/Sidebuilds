const { fail } = require('../utils/purchaseAgreement');

const chatLinks = id => [`/purchase-agreement/${id}`, `/purchase-agreement/${id}#purchase-conversation`];
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;

async function getInbox(db, userId, query = {}) {
  const role = query.role || 'all';
  if (!['all', 'selling', 'buying'].includes(role)) fail(400, 'Choose all, buying or selling conversations.');
  if (query.unread !== undefined && !['true', 'false'].includes(query.unread)) fail(400, 'Unread must be true or false.');
  if (query.q !== undefined && (typeof query.q !== 'string' || query.q.length > 100)) fail(400, 'Search must be text of at most 100 characters.');
  const integer = (value, fallback, max) => {
    if (value === undefined) return fallback;
    if (!/^\d+$/.test(String(value)) || !Number.isSafeInteger(Number(value)) || Number(value) > max) fail(400, 'Invalid inbox pagination.');
    return Number(value);
  };
  const limit = integer(query.limit, 20, 50), offset = integer(query.offset, 0, 100000);
  if (!limit) fail(400, 'Page size must be positive.');
  const values = [userId], conditions = [];
  const bind = value => { values.push(value); return `$${values.length}`; };
  if (role !== 'all') conditions.push(`role=${bind(role)}`);
  if (query.unread === 'true') conditions.push('unread_count>0');
  const search = (query.q || '').trim().toLowerCase();
  if (search) {
    const pattern = bind(`%${search.replace(/[!%_]/g, character => `!${character}`)}%`);
    conditions.push(`(LOWER(project_name) LIKE ${pattern} ESCAPE '!' OR LOWER(participant) LIKE ${pattern} ESCAPE '!')`);
  }
  const cte = `WITH conversation_rows AS (
    SELECT pr.id AS request_id,pr.project_id,p.name AS project_name,pr.status,pr.message AS introduction,pr.buyer_id,
      pr.created_at AS request_created_at,pr.updated_at AS request_updated_at,u.username AS participant,
      CASE WHEN pr.seller_id=$1 THEN 'selling' ELSE 'buying' END AS role,
      (SELECT m.content FROM purchase_request_messages m WHERE m.purchase_request_id=pr.id ORDER BY m.created_at DESC,m.message_id DESC LIMIT 1) AS latest_message,
      (SELECT m.sender_id FROM purchase_request_messages m WHERE m.purchase_request_id=pr.id ORDER BY m.created_at DESC,m.message_id DESC LIMIT 1) AS latest_sender,
      (SELECT m.created_at FROM purchase_request_messages m WHERE m.purchase_request_id=pr.id ORDER BY m.created_at DESC,m.message_id DESC LIMIT 1) AS last_message_at,
      (SELECT COUNT(*) FROM purchase_request_messages m WHERE m.purchase_request_id=pr.id AND m.recipient_id=$1 AND m.is_read=false) +
      CASE WHEN EXISTS(SELECT 1 FROM notifications n WHERE n.user_id=$1 AND n.type='new_interest' AND n.is_read=false AND
        n.action_url IN ('/purchase-agreement/' || CAST(pr.id AS TEXT),'/purchase-agreement/' || CAST(pr.id AS TEXT) || '#purchase-conversation')) THEN 1 ELSE 0 END AS unread_count
    FROM purchase_requests pr JOIN projects p ON p.project_id=pr.project_id
    JOIN users u ON u.user_id=CASE WHEN pr.buyer_id=$1 THEN pr.seller_id ELSE pr.buyer_id END
    WHERE pr.buyer_id=$1 OR pr.seller_id=$1
  ), threads AS (SELECT conversation_rows.*,CASE WHEN request_updated_at>COALESCE(last_message_at,request_created_at)
      THEN request_updated_at ELSE COALESCE(last_message_at,request_created_at) END AS last_activity FROM conversation_rows)`;
  const where = conditions.length ? ` WHERE ${conditions.join(' AND ')}` : '';
  const count = (await db.query(`${cte} SELECT COUNT(*) AS total,COALESCE(SUM(CASE WHEN unread_count>0 THEN 1 ELSE 0 END),0) AS unread_threads FROM threads${where}`, values)).rows[0];
  const paging = [...values, limit, offset];
  const rows = (await db.query(`${cte} SELECT * FROM threads${where} ORDER BY last_activity DESC,request_id DESC LIMIT $${values.length + 1} OFFSET $${values.length + 2}`, paging)).rows;
  return { threads: rows.map(row => ({ request_id: row.request_id, project_id: row.project_id, project_name: row.project_name,
    status: row.status, role: row.role, participant: row.participant, unread_count: Number(row.unread_count), last_activity: row.last_activity,
    preview: String(row.latest_message ?? row.introduction ?? '').slice(0, 180), from_you: (row.latest_sender || row.buyer_id) === userId })),
    total: Number(count.total), unread_threads: Number(count.unread_threads), limit, offset, has_more: offset + rows.length < Number(count.total) };
}

async function chatNotificationIds(db, requestId, userId) {
  const links = chatLinks(requestId);
  return (await db.query(`SELECT notification_id FROM notifications WHERE user_id=$1 AND is_read=false
    AND type IN ('new_interest','new_message') AND action_url IN ($2,$3)`, [userId, ...links])).rows.map(row => String(row.notification_id));
}

async function acknowledgeConversationRead(db, requestId, userId, input = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) fail(400, 'Read receipt must be an object.');
  const ids = (value, field) => {
    if (!Array.isArray(value) || value.length > 400 || value.some(id =>
      !['string', 'number'].includes(typeof id) || (db.dialect === 'postgres' ? !uuid.test(String(id)) : !/^[a-z0-9_-]{1,100}$/i.test(String(id))))) fail(400, `Invalid ${field}.`);
    return [...new Set(value.map(String))];
  };
  const messageIds = ids(input.messageIds || [], 'message IDs'), notificationIds = ids(input.notificationIds || [], 'notification IDs');
  return db.withTransaction(async client => {
    const request = (await client.query('SELECT buyer_id,seller_id FROM purchase_requests WHERE id=$1', [requestId])).rows[0];
    if (!request) fail(404, 'Conversation not found.');
    if (![request.buyer_id, request.seller_id].includes(userId)) fail(403, 'You are not a participant in this conversation.');
    const update = async (table, column, values, condition, parameters) => {
      if (!values.length) return 0;
      const placeholders = values.map((_, index) => `$${parameters.length + index + 1}`).join(',');
      const result = await client.query(`UPDATE ${table} SET is_read=true WHERE ${condition} AND is_read=false AND ${column} IN (${placeholders})`, [...parameters, ...values]);
      return Number(result.rowCount ?? result.changes ?? 0);
    };
    const marked_messages = await update('purchase_request_messages', 'message_id', messageIds, 'purchase_request_id=$1 AND recipient_id=$2', [requestId, userId]);
    const marked_notifications = await update('notifications', 'notification_id', notificationIds,
      "user_id=$1 AND type IN ('new_interest','new_message') AND action_url IN ($2,$3)", [userId, ...chatLinks(requestId)]);
    return { marked_messages, marked_notifications };
  });
}
module.exports = { getInbox, chatNotificationIds, acknowledgeConversationRead };
