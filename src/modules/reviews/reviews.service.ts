import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { col, fn } from 'sequelize';

import { ControllerResponse } from '../../common/interfaces/controller-response.interface';
import { handleDatabaseException } from '../../common/utils/database-exception.util';
import { HospitalModel } from '../../database/models/hospital.model';
import { HospitalUnitModel } from '../../database/models/hospital-unit.model';
import { ReviewReportModel } from '../../database/models/review-report.model';
import { ReviewModel } from '../../database/models/review.model';
import { RoleModel } from '../../database/models/role.model';
import { UnitModel } from '../../database/models/unit.model';
import { UserModel } from '../../database/models/user.model';
import { VerificationSubmissionModel } from '../../database/models/verification-submission.model';
import { REVIEW_RESPONSE } from './constants/review.response';
import { AdminReviewFeedbackDto } from './dto/admin-review-feedback.dto';
import { CreateReviewDto } from './dto/create-review.dto';
import { ReportReviewDto } from './dto/report-review.dto';
import { ResolveReviewReportDto } from './dto/resolve-review-report.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
import { resolveReviewRoleId } from './utils/resolve-review-role.util';
import {
  buildReviewAttributesFromDto,
  buildReviewResponse,
  buildReviewUpdatesFromDto,
} from './utils/review-form.util';
import { HospitalReviewsResponseDto } from './dto/hospital-reviews-response.dto';
import { ListHospitalReviewsQueryDto } from './dto/list-hospital-reviews-query.dto';
import { ReviewResponseDto } from './dto/review-response.dto';
import { EmailService } from '../../common/services/email.service';
import {
  getReviewSubmittedEmailTemplate,
  getReviewApprovedEmailTemplate,
  getReviewRejectedEmailTemplate,
  getReviewFeedbackEmailTemplate,
} from '../../common/email-templates/review.templates';
import { AuthenticatedUser } from '../users/interfaces/authenticated-user.interface';

@Injectable()
export class ReviewsService {
  constructor(
    @InjectModel(ReviewModel)
    private readonly reviewModel: typeof ReviewModel,
    @InjectModel(HospitalModel)
    private readonly hospitalModel: typeof HospitalModel,
    @InjectModel(HospitalUnitModel)
    private readonly hospitalUnitModel: typeof HospitalUnitModel,
    @InjectModel(RoleModel)
    private readonly roleModel: typeof RoleModel,
    @InjectModel(VerificationSubmissionModel)
    private readonly verificationSubmissionModel: typeof VerificationSubmissionModel,
    @InjectModel(ReviewReportModel)
    private readonly reviewReportModel: typeof ReviewReportModel,
    private readonly emailService: EmailService,
  ) {}

  async create(
    dto: CreateReviewDto,
    user: AuthenticatedUser,
  ): Promise<ControllerResponse<ReviewResponseDto>> {
    try {
      const hospital = await this.hospitalModel.findByPk(dto.hospitalId);

      if (!hospital) {
        throw new NotFoundException(REVIEW_RESPONSE.HOSPITAL_NOT_FOUND);
      }

      const hospitalUnit = await this.hospitalUnitModel.findOne({
        where: { hospitalId: dto.hospitalId, unitId: dto.unitId, deletedAt: null },
        include: [{ model: UnitModel, where: { deletedAt: null } }],
      });

      if (!hospitalUnit?.unit) {
        throw new NotFoundException(REVIEW_RESPONSE.UNIT_NOT_FOUND);
      }

      const duplicate = await this.reviewModel.findOne({
        where: { hospitalId: dto.hospitalId, userId: user.id },
      });

      if (duplicate) {
        throw new BadRequestException(REVIEW_RESPONSE.DUPLICATE_REVIEW);
      }

      // If a previous soft-deleted review exists for this user and hospital, permanently purge it
      // so there are no residual constraint conflicts or orphaned records.
      await this.reviewModel.destroy({
        where: { hospitalId: dto.hospitalId, userId: user.id },
        force: true,
      });

      if (user.verificationStatus !== 'verified') {
        const pendingVerification =
          await this.verificationSubmissionModel.findOne({
            where: { userId: user.id, status: 'pending' },
          });

        if (!pendingVerification) {
          throw new BadRequestException(REVIEW_RESPONSE.VERIFICATION_REQUIRED);
        }
      }

      const roleId = await resolveReviewRoleId(
        this.roleModel,
        dto.roleName,
        user.roleId,
      );

      const createdReview = await this.reviewModel.create({
        userId: user.id,
        roleId,
        status: 'pending',
        ...buildReviewAttributesFromDto(dto),
      });

      const review = await this.reviewModel.findByPk(createdReview.id, {
        include: [UnitModel, UserModel, RoleModel, HospitalModel],
      });

      if (!review) {
        throw new NotFoundException(REVIEW_RESPONSE.NOT_FOUND);
      }

      const submittedTemplate = getReviewSubmittedEmailTemplate(hospital.name);
      this.emailService.sendMail({
        to: user.email,
        ...submittedTemplate,
      });

      return {
        message: REVIEW_RESPONSE.CREATED,
        data: this.toReviewResponse(review),
      };
    } catch (error) {
      handleDatabaseException(error, {
        context: ReviewsService.name,
        operation: 'review creation',
        uniqueConstraintMessage: REVIEW_RESPONSE.DUPLICATE_REVIEW,
        uniqueConstraintType: 'badRequest',
        badRequestMessage: REVIEW_RESPONSE.DUPLICATE_REVIEW,
      });
    }
  }

  async findApprovedByHospital(
    hospitalId: number,
    query: ListHospitalReviewsQueryDto,
  ): Promise<ControllerResponse<HospitalReviewsResponseDto>> {
    try {
      const hospital = await this.hospitalModel.findByPk(hospitalId);

      if (!hospital) {
        throw new NotFoundException(REVIEW_RESPONSE.HOSPITAL_NOT_FOUND);
      }

      const page = query.page ?? 1;
      const limit = query.limit ?? 10;
      const offset = (page - 1) * limit;

      const where: Record<string, unknown> = {
        hospitalId,
        status: 'approved',
      };

      if (query.roleId) {
        where.roleId = query.roleId;
      }

      if (query.unitId) {
        where.unitId = query.unitId;
      }

      const { rows, count } = await this.reviewModel.findAndCountAll({
        where,
        include: [UnitModel, UserModel, RoleModel],
        order: [['createdAt', 'DESC']],
        limit,
        offset,
        distinct: true,
      });

      return {
        message: REVIEW_RESPONSE.FETCH_BY_HOSPITAL,
        data: {
          items: rows.map((review) => this.toReviewResponse(review)),
          pagination: {
            page,
            limit,
            total: count,
            totalPages: count === 0 ? 0 : Math.ceil(count / limit),
          },
        },
      };
    } catch (error) {
      handleDatabaseException(error, {
        context: ReviewsService.name,
        operation: 'hospital review listing',
      });
    }
  }

  async findByCurrentUser(
    user: AuthenticatedUser,
  ): Promise<ControllerResponse<{ items: ReviewResponseDto[] }>> {
    try {
      const reviews = await this.reviewModel.findAll({
        where: { userId: user.id },
        include: [UnitModel, UserModel, RoleModel, HospitalModel],
        order: [['createdAt', 'DESC']],
      });

      return {
        message: REVIEW_RESPONSE.FETCH_MY_REVIEWS,
        data: {
          items: reviews.map((review) => this.toReviewResponse(review)),
        },
      };
    } catch (error) {
      handleDatabaseException(error, {
        context: ReviewsService.name,
        operation: 'current user review listing',
      });
    }
  }

  async findForAdmin(
    status?: ReviewModel['status'],
  ): Promise<ControllerResponse<{ items: ReviewResponseDto[] }>> {
    try {
      const where: Record<string, unknown> = {};

      if (status) {
        where.status = status;
      }

      const reviews = await this.reviewModel.findAll({
        where,
        include: [UnitModel, UserModel, RoleModel, HospitalModel],
        order: [['createdAt', 'DESC']],
      });

      return {
        message: REVIEW_RESPONSE.FETCH_ADMIN_REVIEWS,
        data: {
          items: reviews.map((review) => this.toReviewResponse(review)),
        },
      };
    } catch (error) {
      handleDatabaseException(error, {
        context: ReviewsService.name,
        operation: 'admin review listing',
      });
    }
  }

  async updateByOwner(
    reviewId: number,
    dto: UpdateReviewDto,
    user: AuthenticatedUser,
  ): Promise<ControllerResponse<ReviewResponseDto>> {
    try {
      const review = await this.reviewModel.findByPk(reviewId, {
        include: [UnitModel, UserModel, RoleModel, HospitalModel],
      });

      if (!review || review.userId !== user.id) {
        throw new NotFoundException(REVIEW_RESPONSE.NOT_FOUND);
      }

      if (!['pending', 'needs_revision', 'rejected'].includes(review.status)) {
        throw new BadRequestException(REVIEW_RESPONSE.CANNOT_EDIT);
      }

      const updates: Partial<ReviewModel> = {
        status: 'pending',
        adminFeedback: null,
        ...buildReviewUpdatesFromDto(dto),
      };

      if (dto.roleName?.trim()) {
        updates.roleId = await resolveReviewRoleId(
          this.roleModel,
          dto.roleName,
          user.roleId,
        );
      }

      await review.update(updates);
      await review.reload({
        include: [UnitModel, UserModel, RoleModel, HospitalModel],
      });

      return {
        message: REVIEW_RESPONSE.UPDATED,
        data: this.toReviewResponse(review),
      };
    } catch (error) {
      handleDatabaseException(error, {
        context: ReviewsService.name,
        operation: 'review update by owner',
      });
    }
  }

  async deleteByOwner(
    reviewId: number,
    user: AuthenticatedUser,
  ): Promise<ControllerResponse<null>> {
    try {
      const review = await this.reviewModel.findByPk(reviewId);

      if (!review || review.userId !== user.id) {
        throw new NotFoundException(REVIEW_RESPONSE.NOT_FOUND);
      }

      const hospitalId = review.hospitalId;
      const wasApproved = review.status === 'approved';

      await this.reviewReportModel.destroy({ where: { reviewId }, force: true });
      await review.destroy({ force: true });

      if (wasApproved) {
        await this.syncHospitalAverageRating(hospitalId);
      }

      return {
        message: REVIEW_RESPONSE.DELETED,
        data: null,
      };
    } catch (error) {
      handleDatabaseException(error, {
        context: ReviewsService.name,
        operation: 'review delete by owner',
      });
    }
  }

  async reportReview(
    reviewId: number,
    dto: ReportReviewDto,
    user: AuthenticatedUser,
  ): Promise<ControllerResponse<null>> {
    try {
      const review = await this.reviewModel.findByPk(reviewId);

      if (!review || review.status !== 'approved') {
        throw new NotFoundException(REVIEW_RESPONSE.NOT_FOUND);
      }

      if (review.userId === user.id) {
        throw new BadRequestException(REVIEW_RESPONSE.CANNOT_REPORT_OWN);
      }

      const existing = await this.reviewReportModel.findOne({
        where: { reviewId, reporterUserId: user.id },
      });

      if (existing) {
        throw new BadRequestException(REVIEW_RESPONSE.REPORT_ALREADY_SUBMITTED);
      }

      await this.reviewReportModel.create({
        reviewId,
        reporterUserId: user.id,
        reason: dto.reason,
        status: 'pending',
      });

      return {
        message: REVIEW_RESPONSE.REPORTED,
        data: null,
      };
    } catch (error) {
      handleDatabaseException(error, {
        context: ReviewsService.name,
        operation: 'review report',
        uniqueConstraintMessage: REVIEW_RESPONSE.REPORT_ALREADY_SUBMITTED,
        uniqueConstraintType: 'badRequest',
      });
    }
  }

  async findFlaggedReports(): Promise<
    ControllerResponse<{ items: Array<Record<string, unknown>> }>
  > {
    try {
      const reports = await this.reviewReportModel.findAll({
        where: { status: 'pending' },
        include: [
          {
            model: ReviewModel,
            include: [HospitalModel, UserModel, RoleModel, UnitModel],
          },
          { model: UserModel, as: 'reporter' },
        ],
        order: [['createdAt', 'DESC']],
      });

      return {
        message: REVIEW_RESPONSE.FLAGGED_FETCHED,
        data: {
          items: reports.map((report) => ({
            id: report.id,
            reason: report.reason,
            status: report.status,
            adminNotes: report.adminNotes,
            createdAt: report.createdAt,
            reporter: report.reporter
              ? {
                  id: report.reporter.id,
                  fullName: report.reporter.fullName,
                  email: report.reporter.email,
                }
              : null,
            review: report.review ? this.toReviewResponse(report.review) : null,
          })),
        },
      };
    } catch (error) {
      handleDatabaseException(error, {
        context: ReviewsService.name,
        operation: 'flagged review listing',
      });
    }
  }

  async resolveReport(
    reportId: number,
    dto: ResolveReviewReportDto,
  ): Promise<ControllerResponse<null>> {
    try {
      const report = await this.reviewReportModel.findByPk(reportId, {
        include: [ReviewModel],
      });

      if (!report) {
        throw new NotFoundException(REVIEW_RESPONSE.NOT_FOUND);
      }

      await report.update({
        status: dto.status,
        adminNotes: dto.adminNotes?.trim() || report.adminNotes,
      });

      return {
        message: REVIEW_RESPONSE.REPORT_UPDATED,
        data: null,
      };
    } catch (error) {
      handleDatabaseException(error, {
        context: ReviewsService.name,
        operation: 'resolve review report',
      });
    }
  }

  async sendAdminFeedback(
    reviewId: number,
    dto: AdminReviewFeedbackDto,
  ): Promise<ControllerResponse<ReviewResponseDto>> {
    try {
      const review = await this.reviewModel.findByPk(reviewId, {
        include: [UnitModel, UserModel, RoleModel, HospitalModel],
      });

      if (!review) {
        throw new NotFoundException(REVIEW_RESPONSE.NOT_FOUND);
      }

      const feedback = dto.feedback.trim();
      await review.update({
        status: 'needs_revision',
        adminFeedback: feedback,
      });

      if (review.user?.email) {
        const feedbackTemplate = getReviewFeedbackEmailTemplate(
          review.hospital?.name ?? '',
          feedback,
        );
        this.emailService.sendMail({
          to: review.user.email,
          ...feedbackTemplate,
        });
      }

      return {
        message: REVIEW_RESPONSE.FEEDBACK_SENT,
        data: this.toReviewResponse(review),
      };
    } catch (error) {
      handleDatabaseException(error, {
        context: ReviewsService.name,
        operation: 'admin review feedback',
      });
    }
  }

  async adminUpdateStatus(
    reviewId: number,
    status: ReviewModel['status'],
  ): Promise<ControllerResponse<ReviewResponseDto>> {
    try {
      const review: ReviewModel | null = await this.reviewModel.findByPk(
        reviewId,
        {
          include: [UnitModel, UserModel, RoleModel, HospitalModel],
        },
      );

      if (!review) {
        throw new NotFoundException(REVIEW_RESPONSE.NOT_FOUND);
      }

      const previousStatus = review.status;
      await review.update({ status });

      await this.syncHospitalAverageRating(review.hospitalId);

      if (review.user?.email && previousStatus !== status) {
        const hospitalName = review.hospital?.name ?? '';

        if (status === 'approved') {
          const approvedTemplate = getReviewApprovedEmailTemplate(hospitalName);
          this.emailService.sendMail({
            to: review.user.email,
            ...approvedTemplate,
          });
        } else if (status === 'rejected') {
          const rejectedTemplate = getReviewRejectedEmailTemplate(hospitalName);
          this.emailService.sendMail({
            to: review.user.email,
            ...rejectedTemplate,
          });
        }
      }

      const message =
        status === 'approved'
          ? REVIEW_RESPONSE.APPROVED
          : status === 'rejected'
            ? REVIEW_RESPONSE.REJECTED
            : REVIEW_RESPONSE.UPDATED;

      return {
        message,
        data: this.toReviewResponse(review),
      };
    } catch (error: unknown) {
      handleDatabaseException(error, {
        context: ReviewsService.name,
        operation: 'admin review status update',
      });
    }
  }

  private async syncHospitalAverageRating(hospitalId: number): Promise<void> {
    const row = (await this.reviewModel.findOne({
      attributes: [[fn('AVG', col('rating')), 'avgRating']],
      where: { hospitalId, status: 'approved' },
      raw: true,
    })) as unknown as { avgRating: string | number | null } | null;

    const averageRating = row?.avgRating ? Number(row.avgRating) : 0;

    await this.hospitalModel.update(
      { averageRating },
      { where: { id: hospitalId } },
    );
  }

  private toReviewResponse(review: ReviewModel): ReviewResponseDto {
    return buildReviewResponse(review);
  }
}
