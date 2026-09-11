import {
  BadRequestException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { getModelToken } from '@nestjs/sequelize';
import { Test, TestingModule } from '@nestjs/testing';

import { HospitalModel } from '../../database/models/hospital.model';
import { HospitalUnitModel } from '../../database/models/hospital-unit.model';
import { ReviewReportModel } from '../../database/models/review-report.model';
import { ReviewModel } from '../../database/models/review.model';
import { RoleModel } from '../../database/models/role.model';
import { VerificationSubmissionModel } from '../../database/models/verification-submission.model';
import { EmailService } from '../../common/services/email.service';
import { REVIEW_RESPONSE } from './constants/review.response';
import { ReviewsService } from './reviews.service';

describe('ReviewsService', () => {
  let service: ReviewsService;
  const reviewModel = {
    findOne: jest.fn(),
    create: jest.fn(),
    findByPk: jest.fn(),
    findAll: jest.fn(),
    findAndCountAll: jest.fn(),
    destroy: jest.fn().mockResolvedValue(1),
  };
  const hospitalModel = {
    findByPk: jest.fn(),
    update: jest.fn(),
  };
  const hospitalUnitModel = {
    findOne: jest.fn(),
  };
  const roleModel = {
    findOne: jest.fn(),
  };
  const verificationSubmissionModel = {
    findOne: jest.fn(),
  };
  const reviewReportModel = {
    findOne: jest.fn(),
    create: jest.fn(),
    findAll: jest.fn(),
    findByPk: jest.fn(),
    destroy: jest.fn().mockResolvedValue(1),
  };
  const emailService = {
    sendMail: jest.fn(),
  };
  const authenticatedUser = {
    id: 1,
    fullName: 'Taylor Brooks',
    email: 'taylor@example.com',
    roleId: 1,
    roleName: 'nurse',
    isVerified: true,
    verificationStatus: 'verified' as const,
    createdAt: new Date(),
    updatedAt: new Date(), warningMessage: null,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReviewsService,
        { provide: getModelToken(ReviewModel), useValue: reviewModel },
        { provide: getModelToken(HospitalModel), useValue: hospitalModel },
        {
          provide: getModelToken(HospitalUnitModel),
          useValue: hospitalUnitModel,
        },
        { provide: getModelToken(RoleModel), useValue: roleModel },
        {
          provide: getModelToken(VerificationSubmissionModel),
          useValue: verificationSubmissionModel,
        },
        {
          provide: getModelToken(ReviewReportModel),
          useValue: reviewReportModel,
        },
        { provide: EmailService, useValue: emailService },
      ],
    }).compile();

    service = module.get<ReviewsService>(ReviewsService);
    reviewModel.findOne.mockReset();
    reviewModel.create.mockReset();
    reviewModel.findByPk.mockReset();
    reviewModel.findAndCountAll.mockReset();
    hospitalModel.findByPk.mockReset();
    hospitalModel.update.mockReset();
    hospitalUnitModel.findOne.mockReset();
    roleModel.findOne.mockReset();
    verificationSubmissionModel.findOne.mockReset();
  });

  it('should create a review for a valid hospital', async () => {
    hospitalModel.findByPk.mockResolvedValue({ id: 2, name: 'Test Hospital' });
    hospitalUnitModel.findOne.mockResolvedValue({
      hospitalId: 2,
      unitId: 3,
      unit: {
        id: 3,
        name: 'Telemetry',
      },
    });
    reviewModel.findOne
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ avgRating: '4' });
    reviewModel.create.mockResolvedValue({ id: 10 });
    reviewModel.findByPk.mockResolvedValue({
      id: 10,
      hospitalId: 2,
      unitId: 3,
      userId: 1,
      roleId: 1,
      rating: 4,
      comment: 'Good experience',
      employmentType: 'full_time',
      shiftType: 'day',
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(), warningMessage: null,
      unit: { name: 'Telemetry' },
      user: { fullName: 'Taylor Brooks' },
      role: { name: 'nurse' },
    });
    hospitalModel.update.mockResolvedValue([1]);

    const result = await service.create(
      {
        hospitalId: 2,
        unitId: 3,
        rating: 4,
        comment: 'Good experience',
        employmentType: 'full_time',
        shiftType: 'day',
        hourlyRate: 45,
        patientRatio: '5–6',
        mealBreaks: 'Usually',
        bathroomBreaks: 'Sometimes',
        parkingCost: 'Free',
        managementRating: 4,
        wouldReturn: true,
      },
      authenticatedUser,
    );

    expect(reviewModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'pending',
        hourlyRate: 45,
        patientRatio: '5–6',
        mealBreaks: 'Usually',
        bathroomBreaks: 'Sometimes',
        parkingCost: 'Free',
        managementRating: 4,
        wouldReturn: true,
      }),
    );
    expect(result.message).toBe(REVIEW_RESPONSE.CREATED);
    expect(result.data.hospitalId).toBe(2);
    expect(result.data.rating).toBe(4);
  });

  it('should require credential verification before creating a review', async () => {
    hospitalModel.findByPk.mockResolvedValue({ id: 2, name: 'Test Hospital' });
    hospitalUnitModel.findOne.mockResolvedValue({
      hospitalId: 2,
      unitId: 3,
      unit: { id: 3, name: 'Telemetry' },
    });
    reviewModel.findOne.mockResolvedValue(null);
    verificationSubmissionModel.findOne.mockResolvedValue(null);

    await expect(
      service.create(
        {
          hospitalId: 2,
          unitId: 3,
          rating: 4,
          comment: 'Good experience',
          employmentType: 'full_time',
          shiftType: 'day',
        },
        {
          ...authenticatedUser,
          verificationStatus: 'pending',
        },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('should throw when hospital does not exist', async () => {
    hospitalModel.findByPk.mockResolvedValue(null);

    await expect(
      service.create(
        {
          hospitalId: 999,
          unitId: 3,
          rating: 5,
          comment: 'Test',
          employmentType: 'full_time',
          shiftType: 'day',
        },
        authenticatedUser,
      ),
    ).rejects.toThrow(NotFoundException);
  });

  it('should reject duplicate review for the same user and hospital', async () => {
    hospitalModel.findByPk.mockResolvedValue({ id: 1 });
    hospitalUnitModel.findOne.mockResolvedValue({
      hospitalId: 1,
      unitId: 1,
      unit: { id: 1, name: 'ICU' },
    });
    reviewModel.findOne.mockResolvedValue({ id: 1 });

    await expect(
      service.create(
        {
          hospitalId: 1,
          unitId: 1,
          rating: 5,
          comment: 'Duplicate attempt',
          employmentType: 'contract',
          shiftType: 'night',
        },
        authenticatedUser,
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('should return approved reviews for a hospital', async () => {
    hospitalModel.findByPk.mockResolvedValue({ id: 1 });
    reviewModel.findAndCountAll.mockResolvedValue({
      rows: [
        {
          id: 1,
          hospitalId: 1,
          unitId: 1,
          userId: 1,
          roleId: 1,
          rating: 5,
          comment: 'Excellent team support',
          employmentType: 'full_time',
          shiftType: 'day',
          status: 'pending',
          createdAt: new Date(),
          updatedAt: new Date(), warningMessage: null,
          unit: { name: 'ICU' },
          user: { fullName: 'Taylor Brooks' },
          role: { name: 'nurse' },
        },
      ],
      count: 1,
    });

    const result = await service.findApprovedByHospital(1, {
      page: 1,
      limit: 10,
    });

    expect(result.message).toBe(REVIEW_RESPONSE.FETCH_BY_HOSPITAL);
    expect(result.data.items).toHaveLength(1);
    expect(result.data.pagination.total).toBe(1);
  });

  it('should wrap unexpected database errors while creating a review', async () => {
    hospitalModel.findByPk.mockResolvedValue({ id: 2 });
    hospitalUnitModel.findOne.mockResolvedValue({
      hospitalId: 2,
      unitId: 3,
      unit: {
        id: 3,
        name: 'Telemetry',
      },
    });
    reviewModel.findOne.mockResolvedValue(null);
    reviewModel.create.mockRejectedValue(new Error('database down'));

    await expect(
      service.create(
        {
          hospitalId: 2,
          unitId: 3,
          rating: 4,
          comment: 'Good experience',
          employmentType: 'full_time',
          shiftType: 'day',
        },
        authenticatedUser,
      ),
    ).rejects.toThrow(InternalServerErrorException);
  });

  it('should reject units that are not mapped to the selected hospital', async () => {
    hospitalModel.findByPk.mockResolvedValue({ id: 2 });
    hospitalUnitModel.findOne.mockResolvedValue(null);

    await expect(
      service.create(
        {
          hospitalId: 2,
          unitId: 1,
          rating: 4,
          comment: 'Wrong unit mapping',
          employmentType: 'full_time',
          shiftType: 'day',
        },
        authenticatedUser,
      ),
    ).rejects.toThrow(NotFoundException);
  });

  it('should permanently delete review and attached reports on deleteByOwner', async () => {
    const mockReview = {
      id: 10,
      userId: authenticatedUser.id,
      hospitalId: 1,
      status: 'approved',
      destroy: jest.fn().mockResolvedValue(true),
    };
    reviewModel.findByPk.mockResolvedValue(mockReview);
    reviewModel.findAll.mockResolvedValue([]);
    hospitalModel.update.mockResolvedValue([1]);

    const result = await service.deleteByOwner(10, authenticatedUser);

    expect(result.message).toBe(REVIEW_RESPONSE.DELETED);
    expect(reviewReportModel.destroy).toHaveBeenCalledWith({
      where: { reviewId: 10 },
      force: true,
    });
    expect(mockReview.destroy).toHaveBeenCalledWith({ force: true });
    expect(hospitalModel.update).toHaveBeenCalledWith(
      { averageRating: 0 },
      { where: { id: 1 } },
    );
  });

  it('should allow creating a new review after a previous review was deleted', async () => {
    hospitalModel.findByPk.mockResolvedValue({ id: 1, name: 'Jackson Memorial' });
    hospitalUnitModel.findOne.mockResolvedValue({
      hospitalId: 1,
      unitId: 1,
      unit: { id: 1, name: 'ICU' },
    });
    reviewModel.findOne.mockResolvedValue(null);
    reviewModel.destroy.mockResolvedValue(1);
    reviewModel.create.mockResolvedValue({ id: 99 });
    reviewModel.findByPk.mockResolvedValue({
      id: 99,
      hospitalId: 1,
      unitId: 1,
      userId: 1,
      roleId: 1,
      rating: 5,
      comment: 'Fresh review after deletion',
      employmentType: 'full_time',
      shiftType: 'day',
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
      unit: { name: 'ICU' },
      user: { fullName: 'Taylor Brooks' },
      role: { name: 'nurse' },
    });

    const result = await service.create(
      {
        hospitalId: 1,
        unitId: 1,
        rating: 5,
        comment: 'Fresh review after deletion',
        employmentType: 'full_time',
        shiftType: 'day',
      },
      authenticatedUser,
    );

    expect(result.message).toBe(REVIEW_RESPONSE.CREATED);
    expect(reviewModel.destroy).toHaveBeenCalledWith({
      where: { hospitalId: 1, userId: authenticatedUser.id },
      force: true,
    });
  });
});

