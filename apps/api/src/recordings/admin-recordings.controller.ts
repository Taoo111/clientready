import { Controller, Get, Param, StreamableFile, UseGuards } from '@nestjs/common';
import { AdminAuthGuard } from '../auth/admin-auth.guard';
import { RecordingsService } from './recordings.service';

/** Recruiter panel: streams a recording (local storage; Supabase uses signed URLs). */
@Controller('admin/assessments/:id/recordings')
@UseGuards(AdminAuthGuard)
export class AdminRecordingsController {
  constructor(private readonly recordings: RecordingsService) {}

  @Get(':recordingId')
  async stream(
    @Param('id') id: string,
    @Param('recordingId') recordingId: string,
  ): Promise<StreamableFile> {
    const [recording, data] = await this.recordings.load(id, recordingId);
    return new StreamableFile(data, {
      type: recording.mimeType,
      length: data.length,
      disposition: `inline; filename="recording-${recording.id}"`,
    });
  }
}
