import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { col, fn, Op } from 'sequelize';

import { ControllerResponse } from '../../common/interfaces/controller-response.interface';
import { handleDatabaseException } from '../../common/utils/database-exception.util';
import { AccountDeletionRequestModel } from '../../database/models/account-deletion-request.model';
import { ContactSubmissionModel } from '../../database/models/contact-submission.model';
import { HospitalModel } from '../../database/models/hospital.model';
import { LoginEventModel } from '../../database/models/login-event.model';
import { ReviewReportModel } from '../../database/models/review-report.model';
import { ReviewModel } from '../../database/models/review.model';
import { RoleModel } from '../../database/models/role.model';
import { UserModel } from '../../database/models/user.model';
import { VerificationSubmissionModel } from '../../database/models/verification-submission.model';
import { UnitModel } from '../../database/models/unit.model';
import { EmailService } from '../../common/services/email.service';
import { ADMIN_RESPONSE } from './constants/admin.response';
import { AdminSecurityQueryDto } from './dto/admin-security-query.dto';
import { AdminSecurityResponseDto } from './dto/admin-security-response.dto';
import { AdminStatsResponseDto } from './dto/admin-stats-response.dto';
import { AdminUserResponseDto } from './dto/admin-user-response.dto';
import { CreateHospitalDto } from './dto/create-hospital.dto';
import { UpdateHospitalDto } from './dto/update-hospital.dto';
import { AdminHospitalQueryDto } from './dto/admin-hospital-query.dto';
import { AuthenticatedUser } from '../users/interfaces/authenticated-user.interface';

type PlatformEvent = {
  id: string;
  tone: 'ok' | 'warn';
  description: string;
  createdAt: Date;
};

@Injectable()
export class AdminService {
  constructor(
    @InjectModel(UserModel)
    private readonly userModel: typeof UserModel,
    @InjectModel(ReviewModel)
    private readonly reviewModel: typeof ReviewModel,
    @InjectModel(VerificationSubmissionModel)
    private readonly verificationModel: typeof VerificationSubmissionModel,
    @InjectModel(ContactSubmissionModel)
    private readonly contactModel: typeof ContactSubmissionModel,
    @InjectModel(ReviewReportModel)
    private readonly reviewReportModel: typeof ReviewReportModel,
    @InjectModel(LoginEventModel)
    private readonly loginEventModel: typeof LoginEventModel,
    @InjectModel(HospitalModel)
    private readonly hospitalModel: typeof HospitalModel,
    @InjectModel(AccountDeletionRequestModel)
    private readonly accountDeletionRequestModel: typeof AccountDeletionRequestModel,
    private readonly emailService: EmailService,
  ) { }

  async getStats(): Promise<ControllerResponse<AdminStatsResponseDto>> {
    try {
      const [
        totalUsers,
        verifiedUsers,
        pendingVerifications,
        pendingReviews,
        unreadMessages,
        flaggedReviews,
        flaggedAccounts,
        pendingAccountDeletions,
      ] = await Promise.all([
        this.userModel.count({
          include: [
            {
              model: RoleModel,
              where: { name: { [Op.ne]: 'admin' } },
              required: true,
            },
          ],
        }),
        this.userModel.count({ where: { verificationStatus: 'verified' } }),
        this.verificationModel.count({ where: { status: 'pending' } }),
        this.reviewModel.count({ where: { status: 'pending' } }),
        this.contactModel.count({ where: { isRead: false } }),
        this.reviewReportModel.count({ where: { status: 'pending' } }),
        this.userModel.count({ where: { verificationStatus: 'rejected' } }),
        this.accountDeletionRequestModel.count({
          where: { status: 'pending' },
        }),
      ]);

      return {
        message: ADMIN_RESPONSE.STATS_FETCHED,
        data: {
          totalUsers,
          verifiedUsers,
          pendingVerifications,
          pendingReviews,
          unreadMessages,
          flaggedReviews,
          flaggedAccounts,
          pendingAccountDeletions,
        },
      };
    } catch (error) {
      handleDatabaseException(error, {
        context: AdminService.name,
        operation: 'admin stats',
      });
    }
  }

  async listUsers(): Promise<
    ControllerResponse<{ items: AdminUserResponseDto[] }>
  > {
    try {
      const users = await this.userModel.findAll({
        include: [RoleModel],
        order: [['createdAt', 'DESC']],
        paranoid: false,
      });

      const reviewCounts = (await this.reviewModel.findAll({
        attributes: ['userId', [fn('COUNT', col('id')), 'count']],
        group: ['userId'],
        raw: true,
      })) as unknown as Array<{ userId: number; count: string }>;

      const countByUser = new Map(
        reviewCounts.map((row) => [row.userId, Number(row.count)]),
      );

      const items = users
        .filter((user) => user.role?.name !== 'admin')
        .map((user) => ({
          id: user.id,
          fullName: user.fullName,
          email: user.email,
          roleId: user.roleId,
          roleName: user.role?.name ?? '',
          isVerified: user.isVerified,
          verificationStatus: user.verificationStatus,
          reviewCount: countByUser.get(user.id) ?? 0,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
          deletedAt: user.deletedAt,
        }));

      return {
        message: ADMIN_RESPONSE.USERS_FETCHED,
        data: { items },
      };
    } catch (error) {
      handleDatabaseException(error, {
        context: AdminService.name,
        operation: 'admin user listing',
      });
    }
  }

  async listFlaggedAccounts(): Promise<
    ControllerResponse<{ items: AdminUserResponseDto[] }>
  > {
    try {
      const users = await this.userModel.findAll({
        where: { verificationStatus: 'rejected' },
        include: [RoleModel],
        order: [['updatedAt', 'DESC']],
        paranoid: false,
      });

      const items = users
        .filter((user) => user.role?.name !== 'admin')
        .map((user) => ({
          id: user.id,
          fullName: user.fullName,
          email: user.email,
          roleId: user.roleId,
          roleName: user.role?.name ?? '',
          isVerified: user.isVerified,
          verificationStatus: user.verificationStatus,
          reviewCount: 0,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
          deletedAt: user.deletedAt,
        }));

      return {
        message: ADMIN_RESPONSE.FLAGGED_ACCOUNTS_FETCHED,
        data: { items },
      };
    } catch (error) {
      handleDatabaseException(error, {
        context: AdminService.name,
        operation: 'flagged account listing',
      });
    }
  }

  async getSecurityActivity(
    admin: AuthenticatedUser,
    query: AdminSecurityQueryDto,
  ): Promise<ControllerResponse<AdminSecurityResponseDto>> {
    try {
      const loginPage = query.loginPage ?? 1;
      const loginLimit = query.loginLimit ?? 10;
      const eventsPage = query.eventsPage ?? 1;
      const eventsLimit = query.eventsLimit ?? 10;
      const loginOffset = (loginPage - 1) * loginLimit;
      const eventsOffset = (eventsPage - 1) * eventsLimit;

      const [
        adminUser,
        loginTotal,
        recentLogins,
        recentUsers,
        recentReviews,
        recentVerifications,
        recentReports,
        recentDeletionRequests,
      ] = await Promise.all([
        this.userModel.findByPk(admin.id),
        this.loginEventModel.count(),
        this.loginEventModel.findAll({
          order: [['createdAt', 'DESC']],
          limit: loginLimit,
          offset: loginOffset,
        }),
        this.userModel.findAll({
          include: [RoleModel],
          order: [['createdAt', 'DESC']],
          limit: 100,
        }),
        this.reviewModel.findAll({
          include: [HospitalModel, UserModel],
          order: [['createdAt', 'DESC']],
          limit: 100,
        }),
        this.verificationModel.findAll({
          include: [UserModel],
          order: [['createdAt', 'DESC']],
          limit: 100,
        }),
        this.reviewReportModel.findAll({
          include: [
            {
              model: ReviewModel,
              include: [HospitalModel],
            },
          ],
          order: [['createdAt', 'DESC']],
          limit: 100,
        }),
        this.accountDeletionRequestModel.findAll({
          where: { status: 'pending' },
          include: [UserModel],
          order: [['createdAt', 'DESC']],
          limit: 100,
        }),
      ]);

      const allPlatformEvents: PlatformEvent[] = [
        ...recentUsers
          .filter((user) => user.role?.name !== 'admin')
          .map((user) => ({
            id: `signup-${user.id}`,
            tone: 'ok' as const,
            description: `New signup — ${user.fullName}`,
            createdAt: user.createdAt,
          })),
        ...recentReviews.map((review) => ({
          id: `review-${review.id}`,
          tone: 'ok' as const,
          description: `Review submitted — ${review.hospital?.name ?? `Hospital #${review.hospitalId}`}`,
          createdAt: review.createdAt,
        })),
        ...recentVerifications.map((submission) => ({
          id: `verification-${submission.id}`,
          tone: 'ok' as const,
          description: `Verification submitted — ${submission.user?.fullName ?? `User #${submission.userId}`}`,
          createdAt: submission.createdAt,
        })),
        ...recentReports.map((report) => ({
          id: `report-${report.id}`,
          tone: 'warn' as const,
          description: `Review flagged — ${report.review?.hospital?.name ?? `Review #${report.reviewId}`}`,
          createdAt: report.createdAt,
        })),
        ...recentDeletionRequests.map((request) => ({
          id: `deletion-${request.id}`,
          tone: 'warn' as const,
          description: `Account deletion requested — ${request.user?.fullName ?? `User #${request.userId}`}`,
          createdAt: request.createdAt,
        })),
      ].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

      const platformEvents = allPlatformEvents.slice(
        eventsOffset,
        eventsOffset + eventsLimit,
      );

      return {
        message: ADMIN_RESPONSE.SECURITY_FETCHED,
        data: {
          adminProfile: {
            email: adminUser?.email ?? admin.email,
            fullName: adminUser?.fullName ?? admin.fullName,
            updatedAt: adminUser?.updatedAt ?? admin.updatedAt,
          },
          recentLogins: {
            items: recentLogins.map((event) => ({
              id: event.id,
              email: event.email,
              success: event.success,
              ipAddress: event.ipAddress,
              userAgent: event.userAgent,
              createdAt: event.createdAt,
            })),
            total: loginTotal,
            page: loginPage,
            limit: loginLimit,
          },
          platformEvents: {
            items: platformEvents,
            total: allPlatformEvents.length,
            page: eventsPage,
            limit: eventsLimit,
          },
        },
      };
    } catch (error) {
      handleDatabaseException(error, {
        context: AdminService.name,
        operation: 'security activity',
      });
    }
  }

  async exportReviewsCsv(): Promise<string> {
    try {
      const reviews = await this.reviewModel.findAll({
        include: [HospitalModel, UnitModel, RoleModel],
        order: [['createdAt', 'DESC']],
      });

      const headers = [
        'id',
        'hospital',
        'unit',
        'role',
        'status',
        'rating',
        'comment',
        'employment_type',
        'shift_type',
        'hourly_rate',
        'patient_ratio',
        'created_at',
      ];

      const toCsvCell = (value: unknown): string => {
        if (value === null || value === undefined) {
          return '';
        }

        if (typeof value === 'string') {
          return value;
        }

        if (typeof value === 'number' || typeof value === 'boolean') {
          return String(value);
        }

        if (value instanceof Date) {
          return value.toISOString();
        }

        return '';
      };

      const escape = (value: unknown) =>
        `"${toCsvCell(value).replace(/"/g, '""')}"`;

      const rows = reviews.map((review) =>
        [
          review.id,
          review.hospital?.name ?? review.hospitalId,
          review.unit?.name ?? review.unitId,
          review.role?.name ?? review.roleId,
          review.status,
          review.rating,
          review.comment,
          review.employmentType,
          review.shiftType,
          review.hourlyRate,
          review.patientRatio,
          review.createdAt.toISOString(),
        ]
          .map(escape)
          .join(','),
      );

      return [headers.join(','), ...rows].join('\n');
    } catch (error) {
      handleDatabaseException(error, {
        context: AdminService.name,
        operation: 'review export',
      });
    }
  }

  async listHospitals(query: AdminHospitalQueryDto): Promise<ControllerResponse<any>> {
    try {
      const { page = 1, limit = 10, search } = query;
      const offset = (page - 1) * limit;

      const whereClause: any = {};
      if (search) {
        whereClause[Op.or] = [
          { name: { [Op.iLike]: `%${search}%` } },
          { city: { [Op.iLike]: `%${search}%` } },
          { state: { [Op.iLike]: `%${search}%` } },
          { cmsId: { [Op.iLike]: `%${search}%` } },
        ];
      }

      const { rows, count } = await this.hospitalModel.findAndCountAll({
        where: whereClause,
        order: [['createdAt', 'DESC']],
        limit,
        offset,
      });

      return {
        message: ADMIN_RESPONSE.HOSPITALS_FETCHED,
        data: {
          items: rows,
          total: count,
          page,
          limit,
        },
      };
    } catch (error) {
      handleDatabaseException(error, {
        context: AdminService.name,
        operation: 'list hospitals',
      });
    }
  }

  async getHospital(id: number): Promise<ControllerResponse<any>> {
    try {
      const hospital = await this.hospitalModel.findByPk(id, {
        include: [
          {
            model: UnitModel,
            through: { attributes: [] }
          }
        ]
      });

      if (!hospital) {
        throw new NotFoundException(ADMIN_RESPONSE.HOSPITAL_NOT_FOUND);
      }

      return {
        message: ADMIN_RESPONSE.HOSPITAL_FETCHED,
        data: hospital,
      };
    } catch (error) {
      handleDatabaseException(error, {
        context: AdminService.name,
        operation: 'get hospital',
      });
    }
  }

  async createHospital(dto: CreateHospitalDto): Promise<ControllerResponse<any>> {
    try {
      const hospital = await this.hospitalModel.create({
        cmsId: dto.cmsId,
        name: dto.name,
        city: dto.city,
        state: dto.state,
        facilityType: dto.facilityType,
        source: dto.source || 'MANUAL',
        isActive: dto.isActive !== undefined ? dto.isActive : true,
      } as any);

      return {
        message: ADMIN_RESPONSE.HOSPITAL_CREATED,
        data: hospital,
      };

    } catch (error) {
      handleDatabaseException(error, {
        context: AdminService.name,
        operation: 'create hospital',
      });
    }
  }

  async updateHospital(id: number, dto: UpdateHospitalDto): Promise<ControllerResponse<any>> {
    try {
      const hospital = await this.hospitalModel.findByPk(id);

      if (!hospital) {
        throw new NotFoundException(ADMIN_RESPONSE.HOSPITAL_NOT_FOUND);
      }

      await hospital.update({
        ...dto
      });

      return {
        message: ADMIN_RESPONSE.HOSPITAL_UPDATED,
        data: hospital,
      };
    } catch (error) {
      handleDatabaseException(error, {
        context: AdminService.name,
        operation: 'update hospital',
      });
    }
  }

  async deleteHospital(id: number): Promise<ControllerResponse<any>> {
    try {
      const hospital = await this.hospitalModel.findByPk(id);

      if (!hospital) {
        throw new NotFoundException(ADMIN_RESPONSE.HOSPITAL_NOT_FOUND);
      }

      await hospital.destroy();

      return {
        message: ADMIN_RESPONSE.HOSPITAL_DELETED,
        data: null,
      };
    } catch (error) {
      handleDatabaseException(error, {
        context: AdminService.name,
        operation: 'delete hospital',
      });
    }
  }

  async warnUser(userId: number, reason: string): Promise<ControllerResponse<any>> {
    try {
      const user = await this.userModel.findByPk(userId);

      if (!user) {
        throw new NotFoundException('User not found');
      }

      await user.update({ warningMessage: reason });

      this.emailService.sendMail({
        to: user.email,
        subject: 'OpenCurtain Account Warning',
        text: `Hello ${user.fullName},\n\nWe are writing to issue a formal warning regarding your OpenCurtain account. Reason: ${reason}\n\nPlease ensure your future activities comply with our terms of service.\n\nThank you,\nOpenCurtain Admin`,
        html: `<p>Hello ${user.fullName},</p><p>We are writing to issue a formal warning regarding your OpenCurtain account. Reason: ${reason}</p><p>Please ensure your future activities comply with our terms of service.</p><p>Thank you,<br>OpenCurtain Admin</p>`,
      });

      return {
        message: 'User warned successfully',
        data: null,
      };
    } catch (error) {
      handleDatabaseException(error, {
        context: AdminService.name,
        operation: 'warn user',
      });
    }
  }

  async suspendUser(userId: number, reason: string): Promise<ControllerResponse<any>> {
    try {
      const user = await this.userModel.findByPk(userId);

      if (!user) {
        throw new NotFoundException('User not found');
      }

      await user.destroy();

      this.emailService.sendMail({
        to: user.email,
        subject: 'OpenCurtain Account Suspended',
        text: `Hello ${user.fullName},\n\nYour OpenCurtain account has been suspended by an administrator. Reason: ${reason}\n\nIf you believe this was in error, please contact support.\n\nThank you,\nOpenCurtain Admin`,
        html: `<p>Hello ${user.fullName},</p><p>Your OpenCurtain account has been suspended by an administrator. Reason: ${reason}</p><p>If you believe this was in error, please contact support.</p><p>Thank you,<br>OpenCurtain Admin</p>`,
      });

      return {
        message: 'User suspended successfully',
        data: null,
      };
    } catch (error) {
      handleDatabaseException(error, {
        context: AdminService.name,
        operation: 'suspend user',
      });
    }
  }

  async reactivateUser(userId: number): Promise<ControllerResponse<any>> {
    try {
      const user = await this.userModel.findByPk(userId, { paranoid: false });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      await user.restore();
      await user.update({ warningMessage: null });

      this.emailService.sendMail({
        to: user.email,
        subject: 'OpenCurtain Account Reactivated',
        text: `Hello ${user.fullName},\n\nYour OpenCurtain account has been successfully reactivated. You can now log in and continue using the platform.\n\nThank you,\nOpenCurtain Admin`,
        html: `<p>Hello ${user.fullName},</p><p>Your OpenCurtain account has been successfully reactivated. You can now log in and continue using the platform.</p><p>Thank you,<br>OpenCurtain Admin</p>`,
      });

      return {
        message: 'User reactivated successfully',
        data: null,
      };
    } catch (error) {
      handleDatabaseException(error, {
        context: AdminService.name,
        operation: 'reactivate user',
      });
    }
  }

  async clearFlag(userId: number): Promise<ControllerResponse<any>> {
    try {
      const user = await this.userModel.findByPk(userId, { paranoid: false });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      await user.update({ verificationStatus: 'pending', warningMessage: null });

      return {
        message: 'Account flag cleared successfully',
        data: null,
      };
    } catch (error) {
      handleDatabaseException(error, {
        context: AdminService.name,
        operation: 'clear flag',
      });
    }
  }

  async deleteUser(userId: number): Promise<ControllerResponse<any>> {
    try {
      const user = await this.userModel.findByPk(userId, { paranoid: false });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      await this.reviewModel.destroy({ where: { userId }, force: true });
      await user.destroy({ force: true });

      return {
        message: 'User deleted successfully',
        data: null,
      };
    } catch (error) {
      handleDatabaseException(error, {
        context: AdminService.name,
        operation: 'delete user',
      });
    }
  }

  async deleteReview(reviewId: number): Promise<ControllerResponse<any>> {
    try {
      const review = await this.reviewModel.findByPk(reviewId, { paranoid: false });

      if (!review) {
        throw new NotFoundException('Review not found');
      }

      const hospitalId = review.hospitalId;
      const wasApproved = review.status === 'approved';

      await this.reviewReportModel.destroy({ where: { reviewId }, force: true });
      await review.destroy({ force: true });

      if (wasApproved) {
        await this.syncHospitalAverageRating(hospitalId);
      }

      return {
        message: 'Review deleted successfully',
        data: null,
      };
    } catch (error) {
      handleDatabaseException(error, {
        context: AdminService.name,
        operation: 'delete review',
      });
    }
  }

  private async syncHospitalAverageRating(hospitalId: number): Promise<void> {
    const reviews = await this.reviewModel.findAll({
      where: {
        hospitalId,
        status: 'approved',
      },
    });

    if (reviews.length === 0) {
      await this.hospitalModel.update(
        { averageRating: 0 },
        { where: { id: hospitalId } },
      );
      return;
    }

    const total = reviews.reduce((sum, review) => sum + review.rating, 0);
    const averageRating = Math.round((total / reviews.length) * 10) / 10;

    await this.hospitalModel.update(
      { averageRating },
      { where: { id: hospitalId } },
    );
  }
}
