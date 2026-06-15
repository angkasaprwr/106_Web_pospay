import { api } from './api';

/** Download a file from an authenticated API endpoint. */
export async function downloadFile(url, fallbackName = 'download') {
  const res = await api.get(url, { responseType: 'blob' });
  const disposition = res.headers['content-disposition'] || '';
  const match = /filename="?([^"]+)"?/.exec(disposition);
  const filename = match ? match[1] : fallbackName;
  const blobUrl = window.URL.createObjectURL(new Blob([res.data]));
  const a = document.createElement('a');
  a.href = blobUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(blobUrl);
}
