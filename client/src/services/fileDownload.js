import api from './api';
export async function downloadProjectFile(fileId, filename) {
  const response = await api.get(`/files/download/${encodeURIComponent(fileId)}`, {responseType:'blob'});
  const url=URL.createObjectURL(response.data);
  const link=document.createElement('a');link.href=url;link.download=filename || 'project-file';
  document.body.appendChild(link);link.click();link.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}
