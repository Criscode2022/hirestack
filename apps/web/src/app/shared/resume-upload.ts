import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';

export interface UploadedResume {
  url: string;
  pathname: string;
}

export async function uploadCandidateResume(http: HttpClient, file: File): Promise<UploadedResume> {
  const body = new FormData();
  body.append('file', file);
  const uploaded = await firstValueFrom(
    http.post<UploadedResume>(`${environment.apiUrl}/files/resume`, body),
  );
  await firstValueFrom(
    http.post(`${environment.apiUrl}/me/resumes`, {
      url: uploaded.url,
      fileName: file.name,
      mimeType: file.type,
      sizeBytes: file.size,
    }),
  );
  return uploaded;
}

export function uploadsArePaused(hasBlob?: boolean) {
  return hasBlob === false;
}

export function resumeUploadErrorMessage(hasBlob?: boolean) {
  if (uploadsArePaused(hasBlob)) {
    return 'New uploads are paused. Use a resume already on file.';
  }
  return 'Upload failed. Use a PDF under 5MB and try again.';
}
