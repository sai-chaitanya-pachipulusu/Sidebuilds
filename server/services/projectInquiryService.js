const { fail } = require('../utils/purchaseAgreement');
const { randomUUID } = require('node:crypto');

async function notify(client, db, recipient, type, title, message, actionUrl) {
  const sqlite = db.dialect === 'sqlite';
  const values = [recipient, type, title, message, actionUrl];
  if (!sqlite) values.push(randomUUID());
  await client.query(`INSERT INTO notifications(${sqlite ? '' : 'notification_id,'}user_id,type,title,message,action_url,is_read)
    VALUES(${sqlite ? '' : '$6,'}$1,$2,$3,$4,$5,false)`, values);
}

async function openProjectInquiry(db, { projectId, buyerId, message }) {
  return db.withTransaction(async client => {
    const project = (await client.query('SELECT project_id,owner_id,name,is_public,is_for_sale,is_on_hold FROM projects WHERE project_id=$1 FOR UPDATE', [projectId])).rows[0];
    if (!project || !project.is_public) fail(404, 'This public listing is no longer available.');
    if (!project.is_for_sale) fail(400, 'This project is not currently for sale.');
    if (project.owner_id === buyerId) fail(400, 'You cannot contact yourself about your own project.');
    const existing = (await client.query(`SELECT id,status FROM purchase_requests WHERE project_id=$1 AND buyer_id=$2 AND seller_id=$3
      AND status NOT IN ('seller_rejected','buyer_withdrew_interest','transfer_completed_buyer_confirmed','payment_failed','aborted_project_unavailable','expired','payment_refunded')
      ORDER BY id DESC LIMIT 1 FOR UPDATE`, [projectId, buyerId, project.owner_id])).rows[0];
    // Reopening a thread never changes its price, scope, payment or original message.
    if (existing) return { ...existing, purchase_request_id: existing.id, existing: true };
    const reserved = (await client.query('SELECT project_id FROM checkout_reservations WHERE project_id=$1', [projectId])).rows.length > 0;
    if (project.is_on_hold || reserved) fail(409, 'This project is on hold or reserved. New inquiries are paused.');
    const request = (await client.query(`INSERT INTO purchase_requests(project_id,buyer_id,seller_id,status,message,created_at,updated_at)
      VALUES($1,$2,$3,'interest_expressed',$4,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP) RETURNING id,status`, [projectId, buyerId, project.owner_id, message || null])).rows[0];
    await notify(client, db, project.owner_id, 'new_interest', 'New project inquiry',
      `A buyer sent a private inquiry about “${project.name}”.`, `/purchase-agreement/${request.id}#purchase-conversation`);
    return { ...request, purchase_request_id: request.id, existing: false };
  });
}
async function sendConversationMessage(db, { requestId, senderId, content, messageType, messageId = randomUUID() }) {
  return db.withTransaction(async client => {
    const request = (await client.query('SELECT id,buyer_id,seller_id,project_id FROM purchase_requests WHERE id=$1 FOR UPDATE', [requestId])).rows[0];
    if (!request) fail(404, 'Purchase request not found.');
    if (![request.buyer_id, request.seller_id].includes(senderId)) fail(403, 'You are not a participant in this conversation.');
    request.project_name = (await client.query('SELECT name FROM projects WHERE project_id=$1', [request.project_id])).rows[0]?.name || 'project';
    const recipientId = senderId === request.buyer_id ? request.seller_id : request.buyer_id;
    const inserted = await client.query(`INSERT INTO purchase_request_messages(purchase_request_id,sender_id,recipient_id,content,message,message_type,message_id)
      VALUES($1,$2,$3,$4,$4,$5,$6) ON CONFLICT(message_id) DO NOTHING
      RETURNING message_id,purchase_request_id,sender_id,recipient_id,content,message_type,created_at`,
    [requestId, senderId, recipientId, content, messageType, messageId]);
    let row = inserted.rows[0];
    const created = Boolean(row);
    if (!row) {
      row = (await client.query(`SELECT message_id,purchase_request_id,sender_id,recipient_id,content,message_type,created_at
        FROM purchase_request_messages WHERE message_id=$1 AND purchase_request_id=$2 AND sender_id=$3`, [messageId, requestId, senderId])).rows[0];
      if (!row || row.content !== content || row.message_type !== messageType) fail(409, 'This message attempt does not match the saved message. Refresh the conversation before retrying.');
    }
    if (created) {
      await client.query('UPDATE purchase_requests SET updated_at=CURRENT_TIMESTAMP WHERE id=$1', [requestId]);
      await notify(client, db, recipientId, 'new_message', 'New private message',
        `You have a new message regarding “${request.project_name}”.`, `/purchase-agreement/${requestId}#purchase-conversation`);
    }
    const sender = (await client.query('SELECT username FROM users WHERE user_id=$1', [senderId])).rows[0];
    return { created, recipientId, projectName: request.project_name, message: { ...row, id: row.message_id, sender_username: sender?.username, is_system_message: false } };
  });
}
module.exports = { openProjectInquiry, sendConversationMessage };
