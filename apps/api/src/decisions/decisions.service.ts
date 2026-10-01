import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ReportSchema, type RecruiterDecisionInput } from '@clientready/shared';
import { PrismaService } from '../infra/prisma/prisma.service';
import { decide, DecisionNotAllowedError } from './decision-rules';

/** Stores the recruiter's verdict on the current report. Every change is a new row (audit). */
@Injectable()
export class DecisionsService {
  private readonly logger = new Logger(DecisionsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** Throws `DecisionNotAllowedError` / `DecisionCommentRequiredError` (see decision-rules). */
  async record(
    assessmentId: string,
    input: RecruiterDecisionInput,
    decidedBy: string,
  ): Promise<void> {
    const assessment = await this.prisma.assessment.findUnique({
      where: { id: assessmentId },
      include: { reports: { orderBy: { createdAt: 'desc' }, take: 1 } },
    });
    if (!assessment) throw new NotFoundException();
    const [report] = assessment.reports;
    if (!report || assessment.dataDeletedAt) {
      throw new DecisionNotAllowedError('There is no report to decide on');
    }

    const values = decide(ReportSchema.parse(report.json).recommendation, input);
    await this.prisma.recruiterDecision.create({
      data: { assessmentId, reportId: report.id, decidedBy, ...values },
    });
    this.logger.log(
      `Assessment ${assessmentId}: recruiter decision ${values.verdict} ` +
        `(${values.agreesWithAi ? 'agrees with' : 'differs from'} AI) by ${decidedBy}`,
    );
  }
}
