const fs = require('node:fs/promises');
const { randomUUID } = require('node:crypto');
const db = require('../db');
const { getFileType, getFileCategory } = require('../config/multer');
const { resolveStoredUploadPath } = require('../utils/uploadSecurity');
const FILE_LIMIT = 10 * 1024 * 1024;
const PROJECT_LIMIT = 50 * 1024 * 1024;
const TOTAL_LIMIT = 200 * 1024 * 1024;

async function persistUploads(files, projectId, userId, metadata = {}) {
  try {
    const incoming=files.reduce((sum,file)=>sum+file.size,0);
    if(incoming>PROJECT_LIMIT || files.some(file=>file.size>FILE_LIMIT)) throw Object.assign(new Error('Use files up to 10 MB each and up to 50 MB per project.'),{status:413});
    return await db.withTransaction(async client => {
      // Serialize storage budget checks across application instances before
      // reading buffers. This also bounds upload memory on the free server.
      if(db.dialect!=='sqlite')await client.query('SELECT pg_advisory_xact_lock(727663011)');
      const project = (await client.query('SELECT owner_id FROM projects WHERE project_id=$1 FOR UPDATE', [projectId])).rows[0];
      if (project?.owner_id !== userId) throw Object.assign(new Error('Only the current project owner can upload.'), { status: 403 });
      const used = Number((await client.query('SELECT COALESCE(SUM(file_size),0) AS bytes FROM project_files WHERE project_id=$1', [projectId])).rows[0].bytes);
      if (used + incoming > PROJECT_LIMIT) throw Object.assign(new Error('This project has a 50 MB upload limit. Remove unused files before uploading more.'), { status: 413 });
      const total=Number((await client.query('SELECT COALESCE(SUM(file_size),0) AS bytes FROM project_files')).rows[0].bytes);
      if(total+incoming>TOTAL_LIMIT)throw Object.assign(new Error('Shared file storage is full. Please try again after capacity is available.'),{status:503});
      const contents=[];
      for(const file of files){
        const safePath=resolveStoredUploadPath(file.path);
        if(!safePath)throw Object.assign(new Error('The upload could not be read. Please retry.'),{status:400});
        const content=await fs.readFile(safePath);
        if(content.length!==file.size || content.length>FILE_LIMIT)throw Object.assign(new Error('The uploaded file size could not be verified.'),{status:413});
        contents.push(content);
      }
      const saved = [];
      for (let i=0; i<files.length; i++) {
        const file = files[i];
        const fileId = randomUUID();
        const type = getFileType(file.mimetype, file.originalname);
        const result = await client.query(`INSERT INTO project_files(file_id,project_id,user_id,file_name,original_name,file_type,file_category,file_size,mime_type,storage_path,storage_type,is_public,description)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'database',$11,$12)
          RETURNING file_id,project_id,user_id,file_name,original_name,file_type,file_category,file_size,mime_type,is_public,description,created_at`,
          [fileId,projectId,userId,file.filename,file.originalname,type,getFileCategory(type),contents[i].length,file.mimetype,
            `database:${fileId}`,metadata.is_public === true || metadata.is_public === 'true',require('xss')(String(metadata.description || '')) || null]);
        await client.query('INSERT INTO project_file_blobs(file_id,content) VALUES ($1,$2)', [fileId, contents[i]]);
        saved.push({...result.rows[0],url:`/api/files/download/${fileId}`,download_url:`/api/files/download/${fileId}`});
      }
      return saved;
    });
  } finally {
    for (const file of files) {
      const safePath = resolveStoredUploadPath(file.path);
      if (safePath) await fs.unlink(safePath).catch(() => {});
    }
  }
}

async function readContent(file) {
  if (file.storage_type === 'database') {
    const row = (await db.query('SELECT content FROM project_file_blobs WHERE file_id=$1', [file.file_id])).rows[0];
    return row ? Buffer.from(row.content) : null;
  }
  const safePath = resolveStoredUploadPath(file.storage_path);
  return safePath ? fs.readFile(safePath).catch(() => null) : null;
}

async function isPaidBuyer(projectId, userId) {
  if (!userId) return false;
  const result = await db.query("SELECT transaction_id FROM project_transactions WHERE project_id=$1 AND buyer_id=$2 AND status IN ('payment_completed','completed') LIMIT 1", [projectId,userId]);
  return result.rows.length > 0;
}
async function withFileOwner(fileId,userId,work) {
  const pointer=(await db.query('SELECT project_id FROM project_files WHERE file_id=$1',[fileId])).rows[0];
  if(!pointer) throw Object.assign(new Error('File not found.'),{status:404});
  return db.withTransaction(async client=>{
    const project=(await client.query('SELECT owner_id FROM projects WHERE project_id=$1 FOR UPDATE',[pointer.project_id])).rows[0];
    if(project?.owner_id!==userId) throw Object.assign(new Error('Only the current project owner can change files.'),{status:403});
    return work(client);
  });
}
async function deleteStoredFile(fileId,userId) {
  return withFileOwner(fileId,userId,async client=>{
    await client.query('DELETE FROM project_file_blobs WHERE file_id=$1',[fileId]);
    await client.query('DELETE FROM project_files WHERE file_id=$1',[fileId]);
  });
}
module.exports = { persistUploads, readContent, isPaidBuyer, withFileOwner, deleteStoredFile, FILE_LIMIT, PROJECT_LIMIT };
