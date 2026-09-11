import {
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { getModelToken } from '@nestjs/sequelize';
import { Test, TestingModule } from '@nestjs/testing';

import { HospitalModel } from '../../database/models/hospital.model';
import { HospitalUnitModel } from '../../database/models/hospital-unit.model';
import { ReviewModel } from '../../database/models/review.model';
import { HOSPITAL_RESPONSE } from './constants/hospital.response';
import { HospitalsService } from './hospitals.service';

describe('HospitalsService', () => {
  let service: HospitalsService;
  const hospitalModel = {
    findAndCountAll: jest.fn(),
    findByPk: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    count: jest.fn(),
  };
  const hospitalUnitModel = {
    findAll: jest.fn(),
  };
  const reviewModel = {
    count: jest.fn(),
    findAll: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HospitalsService,
        { provide: getModelToken(HospitalModel), useValue: hospitalModel },
        {
          provide: getModelToken(HospitalUnitModel),
          useValue: hospitalUnitModel,
        },
        { provide: getModelToken(ReviewModel), useValue: reviewModel },
      ],
    }).compile();

    service = module.get<HospitalsService>(HospitalsService);
    hospitalModel.findAndCountAll.mockReset();
    hospitalModel.findByPk.mockReset();
    hospitalModel.findOne.mockReset();
    hospitalModel.create.mockReset();
    hospitalModel.count.mockReset();
    hospitalUnitModel.findAll.mockReset();
    reviewModel.count.mockReset();
    reviewModel.findAll.mockReset();
  });

  it('should return paginated hospitals', async () => {
    hospitalModel.findAndCountAll.mockResolvedValue({
      rows: [
        {
          id: 1,
          cmsId: 'CMS-1001',
          name: 'City Hospital',
          city: 'New York',
          state: 'NY',
          facilityType: 'General Acute Care',
          averageRating: '4.5',
        },
      ],
      count: 1,
    });
    reviewModel.findAll.mockResolvedValue([]);

    const result = await service.findAll({ page: 1, limit: 10 });

    expect(result.message).toBe(HOSPITAL_RESPONSE.FETCH_ALL);
    expect(result.data.items).toHaveLength(1);
    expect(result.data.pagination.total).toBe(1);
  });

  it('should return a hospital by id', async () => {
    hospitalModel.findByPk.mockResolvedValue({
      id: 1,
      cmsId: 'CMS-1001',
      name: 'City Hospital',
      city: 'New York',
      state: 'NY',
      facilityType: 'General Acute Care',
      averageRating: '4.5',
    });
    hospitalUnitModel.findAll.mockResolvedValue([
      { unit: { id: 1, name: 'ICU' } },
    ]);
    reviewModel.count.mockResolvedValue(2);
    reviewModel.findAll.mockResolvedValue([]);

    const result = await service.findById(1);

    expect(result.message).toBe(HOSPITAL_RESPONSE.FETCH_ONE);
    expect(result.data.id).toBe(1);
    expect(result.data.units).toHaveLength(1);
  });

  it('should return a hospital by slug with id suffix', async () => {
    hospitalModel.findByPk.mockResolvedValue({
      id: 1,
      cmsId: 'CMS-1001',
      name: 'City Hospital',
      city: 'New York',
      state: 'NY',
      facilityType: 'General Acute Care',
      averageRating: '4.5',
    });
    hospitalUnitModel.findAll.mockResolvedValue([]);
    reviewModel.count.mockResolvedValue(0);
    reviewModel.findAll.mockResolvedValue([]);

    const result = await service.findBySlug('city-hospital-1');

    expect(result.message).toBe(HOSPITAL_RESPONSE.FETCH_ONE);
    expect(result.data.id).toBe(1);
    expect(hospitalModel.findByPk).toHaveBeenCalledWith(1);
  });

  it('should return a hospital by slug without id suffix via DB lookup', async () => {
    hospitalModel.findByPk.mockResolvedValue(null);
    hospitalModel.findOne.mockResolvedValue({
      id: 922,
      cmsId: '100128',
      name: 'TAMPA GENERAL HOSPITAL',
      city: 'TAMPA',
      state: 'FL',
      facilityType: 'Acute Care Hospitals',
      averageRating: '4.1',
    });
    hospitalUnitModel.findAll.mockResolvedValue([]);
    reviewModel.count.mockResolvedValue(0);
    reviewModel.findAll.mockResolvedValue([]);

    const result = await service.findBySlug('tampa-general-hospital');

    expect(result.message).toBe(HOSPITAL_RESPONSE.FETCH_ONE);
    expect(result.data.id).toBe(922);
  });

  it('should throw when hospital is not found', async () => {
    hospitalModel.findByPk.mockResolvedValue(null);
    hospitalModel.findOne.mockResolvedValue(null);

    await expect(service.findById(999)).rejects.toThrow(NotFoundException);
    await expect(service.findBySlug('unknown-hospital-999999')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('should report existence correctly', async () => {
    hospitalModel.count.mockResolvedValueOnce(1).mockResolvedValueOnce(0);

    await expect(service.exists(1)).resolves.toBe(true);
    await expect(service.exists(999)).resolves.toBe(false);
  });

  it('should wrap unexpected database errors while listing hospitals', async () => {
    hospitalModel.findAndCountAll.mockRejectedValue(new Error('database down'));

    await expect(service.findAll({ page: 1, limit: 10 })).rejects.toThrow(
      InternalServerErrorException,
    );
  });
});
